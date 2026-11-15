// South Pole prototype: one full-screen stage with three ordered views.
// Globe -> 2D map (South Pole blocks / Whole Moon) -> Atlas for the chosen cell.
// The search window is edited in a dialog opened by the bottom button.
import { t, locale, initTranslations } from '../../i18n.js';
import { escapeHtml, fmtLatLon, fmtDateTime, fmtTime, fmtDayMonth, isoDate } from '../../format.js';
import { createPolar3d } from '../polar3d/index.js';
import { computeHorizon } from '../../engine/dem.js';
import {
  project, unproject, STUDY_LAT, DEM_FOOTPRINT_LAT, REGION, cellCenters, gridGeometry,
  studyCellCenters, poleGeometry, POLE_CELL_KM, classify, normalizeThresholds,
  DEFAULT_LIMITS, DEFAULT_TARGETS, DEFAULT_WEIGHTS, REASON_TEXT, R_KM, screenCellWindow,
} from '../../engine/grid.js';
import { STAY_CHOICES } from '../../engine/scenario.js';

const DAY = 864e5, HOUR = 36e5, D2R = Math.PI / 180;
const MAX_WINDOW_DAYS = 183;
const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R)];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const COLORS = { link: '#43d98a', sun: '#f5c542', dark: '#7d7993', both: '#9be7ff' };
const STATUS = { green: '#7bdc8e', yellow: '#f5c542', red: '#e4635a', unknown: '#7d7993', pending: '#3a3f46' };
const SCORE_GREEN = 85, SCORE_YELLOW = 70;
const scoreBand = (cell) => {
  const cl = cell.class, status = cl?.status ?? 'pending';
  if (status === 'unknown' || status === 'pending') return status;
  const score = cl.rawScore ?? cl.score;
  if (!Number.isFinite(score)) return 'unknown';
  return score >= SCORE_GREEN ? 'green' : score >= SCORE_YELLOW ? 'yellow' : 'red';
};
const SLOT_COLOURS = { A: '#58c8ff', B: '#f5c542', C: '#ff9ad5' };
const SLOT_LABELS = { A: '#1', B: '#2', C: '#3' };
const slotLabel = (name) => SLOT_LABELS[name] ?? name;
const scoreColour = (score) => Number.isFinite(score) ? `hsl(${clamp(score, 0, 100) * 1.2} 65% 65%)` : STATUS.unknown;
const scoreBadge = (score) => `<b class="pole-score" style="--score:${scoreColour(score)}" aria-label="${escapeHtml(t('Screening score: {score} out of 100', { score: Number.isFinite(score) ? score : '—' }))}">${Number.isFinite(score) ? score : '—'}<small>/100</small></b>`;
const barRow = (label, pct, colour) => `<div class="pole-bar"><span>${escapeHtml(label)}</span><i><u style="width:${clamp(pct, 0, 100)}%;background:${colour}"></u></i><b>${Math.round(pct)}%</b></div>`;
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  crosshair: '<circle cx="12" cy="12" r="6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;
const globeLocal = { mode: '3d', picked: null };
const english = (key, values = {}) => key.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));

export function createSouthPole(ctx) {
  const root = document.getElementById('v-pole');
  const ui = {
    built: false, stage: 'globe', tab: 'southpole', selected: null,
    window: { startDay: 0, endDay: 0, chosen: false },
    map: { scale: 8, cxKm: 0, cyKm: 0, dragging: null, opened: false, detail: null, detailKey: '' },
    grid: { scope: 'pole', cells: [], token: 0, done: false, startedMs: 0, ms: 0, scenarioMs: 0 },
    pilotCenter: { centerLat: REGION.centerLat, centerLon: REGION.centerLon },
    rangeHandle: null,
    cell: null, popupCell: null, draft: null,
    slots: { A: null, B: null, C: null }, target: null,
    limits: { ...DEFAULT_LIMITS }, targets: { ...DEFAULT_TARGETS }, weights: { ...DEFAULT_WEIGHTS },
    globe: null, globeFailed: false, atlasSrc: '', atlasKey: '', atlasRev: 0, atlasReady: false, atlasFocusPending: false, moonReady: false, syncingSliders: false,
    animRunning: true, animSpeed: 5,
    clockMs: null,
  };
  const staticCache = new Map();
  const els = {};
  const base = { canvas: null, dem: null };
  let lastClockRender = 0;

  const eph = () => ctx.eph();
  const selectedSite = () => ctx.sites().find((s) => s.id === ui.selected) ?? null;
  const studySites = () => ctx.sites().filter((s) => s.hasTerrain && s.lat <= STUDY_LAT);
  const clockMs = () => ui.clockMs ?? ctx.landing();
  const scenarioKey = () => `${ctx.landing()}|${ctx.stayH()}|${ctx.margin()}|${ui.window.startDay}|${ui.window.endDay}`;
  const metricsKey = () => `${scenarioKey()}|${JSON.stringify(ui.limits)}|${JSON.stringify(ui.targets)}|${JSON.stringify(ui.weights)}`;
  const dayIndex = (d) => Math.round(eph().indexOf(dayMs(d)));
  const windowScenario = () => ({ startIndex: dayIndex(ui.window.startDay), endIndex: dayIndex(ui.window.endDay), stayH: ctx.stayH(), marginDeg: ctx.margin() });

  /* ---------- window ---------- */

  const latestDay = () => Math.floor((eph().tEnd - ctx.stayH() * HOUR - eph().t0) / DAY);
  const dayMs = (d) => eph().t0 + d * DAY;
  const dayOf = (ms) => Math.floor((ms - eph().t0) / DAY);

  function initWindow() {
    const latest = Math.max(0, latestDay());
    ui.window.startDay = clamp(dayOf(ctx.landing()), 0, latest);
    ui.window.endDay = Math.min(latest, ui.window.startDay + MAX_WINDOW_DAYS - 1);
    ui.clockMs = ctx.landing();
    syncWindowInputs();
  }

  function syncWindowInputs(source = null) {
    const start = dayMs(ui.window.startDay);
    const days = ui.window.endDay - ui.window.startDay + 1;
    const text = t(days === 1 ? '1 day selected · stay {stay} h · latest complete touchdown {cutoff}.' : '{days} days selected · stay {stay} h · latest complete touchdown {cutoff}.', {
      days, stay: ctx.stayH(), cutoff: fmtDateTime(eph().tEnd - ctx.stayH() * HOUR),
    });
    if (els['sp-mwindowinfo']) els['sp-mwindowinfo'].textContent = text;
    const selection = ui.window.source;
    if (els['sp-plan']) {
      els['sp-plan'].hidden = !selection;
      if (selection) {
        const site = ctx.sites().find((entry) => entry.id === selection.siteId);
        els['sp-plan'].textContent = t('Selected in Windows: {site} · {time}.', {
          site: t(site?.name ?? 'Selected point'), time: fmtDateTime(selection.touchdownMs),
        }) + ' ' + t('Carried conditions: {stay} h stay · {margin}° Earth margin · {sun} h continuous sun · Earth at touchdown {state}.', {
          stay: selection.conditions.stayH, margin: selection.conditions.marginDeg,
          sun: selection.conditions.requiredSunH, state: t(selection.conditions.requireEarthAtTouchdown ? 'required' : 'not required'),
        });
      }
    }
    if (els['sp-windowhud']) els['sp-windowhud'].textContent = t('{days} days in the search window', { days }) + ` · ${ctx.stayH()} h`;
    if (els['sp-mstart']) els['sp-mstart'].value = isoDate(start);
    renderModalPicker(source);
  }

  const MONTH_LEN = [7, 30, 90, MAX_WINDOW_DAYS];

  function renderModalPicker(source = null) {
    if (!els['sp-len']) return;
    const length = ui.window.endDay - ui.window.startDay + 1;
    els['sp-len'].innerHTML = MONTH_LEN.map((n) => `<button type="button" data-len="${n}" aria-pressed="${n === length}" class="${n === length ? 'on' : ''}">${escapeHtml(t('{n} days', { n }))}</button>`).join('');
    if (els['sp-mdays'] && document.activeElement !== els['sp-mdays']) els['sp-mdays'].value = String(length);
    if (els['sp-mrange']) els['sp-mrange'].textContent = t('{from} → {to} (UTC)', { from: isoDate(dayMs(ui.window.startDay)), to: isoDate(dayMs(ui.window.endDay)) });
    syncModalSlider(source);
  }

  function syncModalSlider(source) {
    const host = els['sp-mslider'];
    if (!host || !window.noUiSlider) return;
    const latest = Math.max(1, latestDay() + 1);
    const length = ui.window.endDay - ui.window.startDay + 1;
    const span = source === host && ui.window.viewSpan
      ? ui.window.viewSpan : Math.min(latest, Math.max(30, Math.ceil(length * 1.4)));
    let viewStart = ui.window.viewStart ?? 0;
    const outside = ui.window.startDay < viewStart || ui.window.endDay + 1 > viewStart + span;
    if (!host.noUiSlider || (source !== host && (outside || span !== ui.window.viewSpan))) {
      viewStart = clamp(ui.window.startDay - Math.floor((span - length) / 2), 0, Math.max(0, latest - span));
    }
    const viewEnd = Math.max(viewStart + 1, Math.min(latest, viewStart + span));
    const maxLabels = Math.max(2, Math.floor((host.clientWidth || Math.min(window.innerWidth - 96, 1000)) / 74));
    const key = `${viewStart}|${viewEnd}|${locale()}|${maxLabels}`;
    ui.window.viewStart = viewStart;
    ui.window.viewSpan = span;
    if (host.dataset.view !== key) {
      host.noUiSlider?.destroy();
      const marks = [];
      if (span <= 62) {
        const interval = Math.max(1, Math.ceil(span / (maxLabels - 1)));
        for (let day = viewStart; day <= viewEnd; day += interval) {
          marks.push({ day, label: new Date(dayMs(day)).toLocaleDateString(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }) });
        }
      } else {
        for (let y = new Date(dayMs(viewStart)).getUTCFullYear(); y <= new Date(dayMs(viewEnd)).getUTCFullYear(); y++) {
          for (let m = 0; m < 12; m++) {
            const day = Math.round((Date.UTC(y, m, 1) - eph().t0) / DAY);
            if (day >= viewStart && day <= viewEnd) marks.push({ day, label: m === 0 ? String(y) : new Date(Date.UTC(y, m, 1)).toLocaleDateString(locale(), { month: 'short', timeZone: 'UTC' }) });
          }
        }
      }
      const labelEvery = Math.max(1, Math.ceil(marks.length / maxLabels));
      const visibleMarks = marks.filter((mark, index) => index % labelEvery === 0);
      const labels = new Map(visibleMarks.map((mark) => [mark.day, mark.label]));
      window.noUiSlider.create(host, {
        start: [clamp(ui.window.startDay, viewStart, viewEnd - 1), clamp(ui.window.endDay + 1, viewStart + 1, viewEnd)],
        connect: true, step: 1, margin: 1, limit: Math.min(MAX_WINDOW_DAYS, span),
        range: { min: viewStart, max: viewEnd },
        pips: { mode: 'values', values: visibleMarks.map((mark) => mark.day), density: 100, format: { to: (v) => labels.get(Math.round(v)) ?? '', from: (v) => Number(v) } },
      });
      host.dataset.view = key;
      const handles = host.querySelectorAll('[role="slider"]');
      handles[0].setAttribute('aria-label', t('Search from (UTC)'));
      handles[1].setAttribute('aria-label', t('Search through (UTC)'));
      host.noUiSlider.on('update', (vals) => {
        handles[0].setAttribute('aria-valuetext', isoDate(dayMs(Number(vals[0]))));
        handles[1].setAttribute('aria-valuetext', isoDate(dayMs(Number(vals[1]) - 1)));
        if (ui.syncingSliders) return;
        setWindow(Number(vals[0]), Number(vals[1]) - 1, 'both', host);
      });
    } else if (source !== host) {
      ui.syncingSliders = true;
      host.noUiSlider.set([ui.window.startDay, ui.window.endDay + 1], false);
      ui.syncingSliders = false;
    }
  }

  function setWindow(startDay, endDay, anchor = 'both', source = null) {
    const latest = Math.max(0, latestDay());
    let s = clamp(Math.round(startDay), 0, latest), e = clamp(Math.round(endDay), 0, latest);
    if (anchor === 'start') {
      e = Math.max(e, s);
      if (e - s + 1 > MAX_WINDOW_DAYS) e = Math.min(latest, s + MAX_WINDOW_DAYS - 1);
    } else if (anchor === 'end') {
      s = Math.min(s, e);
      if (e - s + 1 > MAX_WINDOW_DAYS) s = Math.max(0, e - MAX_WINDOW_DAYS + 1);
    } else if (e - s + 1 > MAX_WINDOW_DAYS) e = Math.min(latest, s + MAX_WINDOW_DAYS - 1);
    ui.window.startDay = Math.min(s, e);
    ui.window.endDay = Math.max(s, e);
    syncWindowInputs(source);
    const landing = ctx.landing();
    const ms = landing >= dayMs(ui.window.startDay) && landing < dayMs(ui.window.endDay + 1) && landing <= eph().tEnd - ctx.stayH() * HOUR
      ? landing : dayMs(ui.window.startDay);
    ui.clockMs = ms;
    if (Math.abs(ms - ctx.landing()) > 60e3) ctx.setTouchdown(ms);
    ui.globe?.request();
    if (ui.stage === 'map' && ui.tab === 'moon') drawMoon();
    renderHud();
    if (ui.stage === 'atlas') pushAtlasCommand();
    scheduleGridRefresh();
  }

  let windowDebounce = null;
  function scheduleGridRefresh() {
    clearTimeout(windowDebounce);
    windowDebounce = setTimeout(() => refreshScenario(true), 300);
  }

  function confirmWindow() {
    applyModalInputs();
    const { startDay, endDay } = ui.window;
    setWindow(startDay, endDay);
    ui.window.chosen = true;
    ui.window.backup = null;
    ui.window.fromSearch = false;
    clearTimeout(windowDebounce);
    els['sp-modal'].hidden = true;
    syncWindowButton();
    refreshScenario(true);
    ensureGlobe().then(() => setStage(ui.stage));
    renderAll();
  }

  function applyModalInputs() {
    const from = els['sp-mstart']?.value;
    const days = Math.round(Number(els['sp-mdays']?.value));
    if (!from || !Number.isFinite(days) || days < 1) { renderModalPicker(); return; }
    const startDay = dayOf(Date.parse(`${from}T00:00:00Z`));
    if (!Number.isFinite(startDay)) { renderModalPicker(); return; }
    setWindow(startDay, startDay + clamp(days, 1, MAX_WINDOW_DAYS) - 1, 'start');
  }

  function openWindowEditor() {
    ui.window.backup = snapshotWindow();
    syncWindowInputs();
    els['sp-modal'].hidden = false;
    els['sp-mstay'].focus();
  }

  function snapshotWindow() {
    return {
      startDay: ui.window.startDay, endDay: ui.window.endDay, chosen: ui.window.chosen, source: ui.window.source,
      touchdownMs: ctx.landing(), conditions: { ...ctx.conditions() }, siteId: ctx.selectedId(),
      selected: ui.selected, target: ui.target, clockMs: ui.clockMs, previewHour: ctx.previewHour(),
    };
  }

  function cancelWindow(navigate = true) {
    const fromSearch = ui.window.fromSearch;
    const back = ui.window.backup;
    if (back) {
      Object.assign(ui.window, { startDay: back.startDay, endDay: back.endDay, chosen: back.chosen, source: back.source });
      ui.selected = back.selected;
      ui.target = back.target;
      ctx.setScenario(back);
      ctx.setPreviewHour(back.previewHour);
      ui.clockMs = back.clockMs;
      syncWindowInputs();
      refreshScenario(true);
      ui.globe?.request();
    }
    ui.window.backup = null;
    ui.window.fromSearch = false;
    els['sp-modal'].hidden = true;
    syncWindowButton();
    if (navigate && (fromSearch || !ui.window.chosen)) ctx.backToWindows();
  }

  function beginWindow(selection) {
    build();
    ui.window.backup = snapshotWindow();
    ui.window.source = selection;
    ui.window.fromSearch = true;
    ui.window.chosen = false;
    ui.window.startDay = dayOf(selection.touchdownMs);
    ui.window.endDay = ui.window.startDay;
    ui.selected = selection.siteId;
    ui.cell = null;
    ui.popupCell = null;
    ui.draft = null;
    const site = selectedSite();
    ui.target = site ? { lat: site.lat, lon: site.lon, label: site.name } : null;
    ctx.setScenario(selection);
    ui.clockMs = selection.touchdownMs;
    setStage('globe');
    syncWindowInputs();
    els['sp-modal'].hidden = false;
  }

  /* ---------- DOM ---------- */

  function build() {
    if (ui.built) return;
    ui.selected = ctx.selectedId() ?? null;
    const t = english;
    root.innerHTML = `<div class="pole" data-stage="globe" data-map-tab="southpole">
      <div class="pole-stage" id="sp-stage">
        <div class="pole-globe" data-p3d="m-stage" id="sp-globe">
          <canvas data-p3d="m-3d" id="sp-3d" tabindex="0" role="img" aria-label="${escapeHtml(t('3D Moon; the south polar cap is selectable'))}"></canvas>
          <div class="site-label" data-p3d="m-label" id="sp-label"></div>
          <div class="pole-globe-zoom" role="group" aria-label="${escapeHtml(t('Globe zoom'))}">
            <button type="button" id="sp-gzin" aria-label="${escapeHtml(t('Zoom in'))}">+</button>
            <button type="button" id="sp-gzout" aria-label="${escapeHtml(t('Zoom out'))}">−</button>
          </div>
          <div class="pole-time" role="group" aria-label="${escapeHtml(t('Time speed'))}">
            ${[1, 5, 10].map((s) => `<button type="button" data-speed="${s}"${s === 5 ? ' class="on"' : ''}>${s}×</button>`).join('')}
            <button type="button" id="sp-pause" aria-label="${escapeHtml(t('Pause'))}">⏸</button>
            <span>${escapeHtml(t('1× = 1 h/s'))}</span>
          </div>
          <p class="pole-globe-hint">${escapeHtml(t('Drag to rotate, scroll or pinch to zoom. Move over the south cap: it is selectable; click opens the 2D map.'))}</p>
          <div class="pole-corner">
            <button type="button" class="btn-primary pole-enter" id="sp-enter">${escapeHtml(t('Enter the South Pole'))}<span aria-hidden="true"> →</span></button>
            <div class="m-readout" data-p3d="m-readout" id="sp-readout"></div>
          </div>
        </div>
        <div class="pole-map-wrap" id="sp-map-wrap" hidden>
          <div class="pole-map-header">
            <div class="pole-map-context"><p id="sp-map-context"></p><p class="sub">${escapeHtml(t('Click the map to choose a point, then save it as #1, #2 or #3.'))}</p></div>
            <div class="pole-tabs seg" role="tablist">
              <button type="button" data-tab="southpole" class="on" role="tab">${escapeHtml(t('South Pole · blocks'))}</button>
              <button type="button" data-tab="moon" role="tab">${escapeHtml(t('Whole Moon'))}</button>
            </div>
          </div>
          <div class="pole-map-native" id="sp-native">
            <canvas id="sp-map" width="762" height="762" tabindex="0" role="img" aria-label="${escapeHtml(t('South-pole blocks with screening colours'))}"></canvas>
            <div class="pole-map-rail">
              <div class="pole-map-tools" role="group" aria-label="${escapeHtml(t('Map controls'))}">
                <button type="button" id="sp-zin" aria-label="${escapeHtml(t('Zoom in'))}" title="${escapeHtml(t('Zoom in'))}">${icon('plus')}</button>
                <button type="button" id="sp-zout" aria-label="${escapeHtml(t('Zoom out'))}" title="${escapeHtml(t('Zoom out'))}">${icon('minus')}</button>
                <button type="button" id="sp-center" aria-label="${escapeHtml(t('Centre on the pole'))}" title="${escapeHtml(t('Centre on the pole'))}">${icon('crosshair')}</button>
              </div>
            </div>
          </div>
          <canvas id="sp-moon" width="2048" height="1024" hidden aria-label="${escapeHtml(t('Whole Moon with the night side and landing sites'))}"></canvas>
        </div>
        <iframe id="sp-atlas" title="${escapeHtml(t('Atlas regional map'))}" hidden></iframe>
      </div>

      <aside class="pole-cards" id="sp-cards" hidden>
        <div class="pole-compare-head">
          <div class="pole-selected" id="sp-picked"></div>
          <div class="pole-save-actions" id="sp-abc" role="group" aria-label="${escapeHtml(t('Selected points #1/#2/#3'))}">
            ${['A', 'B', 'C'].map((name) => `<button type="button" data-slot="${name}" disabled>${escapeHtml(t('Save as {name}', { name: slotLabel(name) }))}</button>`).join('')}
          </div>
          <button type="button" class="btn-primary pole-pick-atlas" id="sp-pick-atlas" disabled><span>${escapeHtml(t('Enter Atlas'))}</span>${icon('forward')}</button>
        </div>
        <div class="pole-cards-tabs" role="tablist" aria-label="${escapeHtml(t('Compare views'))}">
          <button type="button" data-cards-tab="compare" class="on" role="tab" aria-selected="true">${escapeHtml(t('Compare'))}</button>
          <button type="button" data-cards-tab="recommended" role="tab" aria-selected="false">${escapeHtml(t('Recommended'))}</button>
        </div>
        <section class="pole-cards-pane" id="sp-compare-pane">
          <div class="pole-timeline" id="sp-timeline"></div>
          <div id="sp-compare"></div>
        </section>
        <section class="pole-cards-pane" id="sp-recommended-pane" hidden>
          <p class="sub" id="sp-list-note"></p>
          <ol class="pole-cardlist" id="sp-cardlist"></ol>
        </section>
      </aside>

      <div class="pole-hud">
        <div class="pole-hud-row"><p id="sp-hud"></p></div>
        <p id="sp-windowhud" class="sub"></p>
      </div>

      <aside class="pole-side" id="sp-panel">
        <div class="pole-side-head">
          <h3>${escapeHtml(t('Search'))}</h3>
          <button type="button" class="pole-min" id="sp-panel-toggle" aria-label="${escapeHtml(t('Minimize panel'))}" title="${escapeHtml(t('Minimize panel'))}">${icon('close')}</button>
        </div>
        <div id="sp-sites"></div>
        <label class="pole-label">${escapeHtml(t('Map point'))}<span class="pole-point" id="sp-point">${escapeHtml(t('None selected'))}</span></label>
        <details class="pole-advanced">
          <summary>${escapeHtml(t('Screening grid'))}</summary>
          <p class="sub" id="sp-geom"></p>
          <label class="pole-label">${escapeHtml(t('Grid scope'))}<select id="sp-scope"><option value="pole">${escapeHtml(t('South pole · 24 km blocks'))}</option><option value="pilot">${escapeHtml(t('Pilot · 2 km cells'))}</option></select></label>
          <div class="pole-thresholds" id="sp-thresholds"></div>
          <div class="pole-grid-actions"><button type="button" class="btn-ghost btn-xs" id="sp-refine">${escapeHtml(t('Refine to 2 km cells'))}</button><button type="button" class="btn-ghost btn-xs" id="sp-restart">${escapeHtml(t('Restart grid'))}</button><button type="button" class="btn-ghost btn-xs" id="sp-probe">${escapeHtml(t('Test an unknown cell'))}</button></div>
          <p class="pole-progress" id="sp-progress" role="status" aria-live="polite"></p>
          <div class="pole-legend" id="sp-legend"></div>
          <div class="pole-detail" id="sp-cell"></div>
        </details>
      </aside>

      <button type="button" class="pole-restore" id="sp-window-show" aria-label="${escapeHtml(t('Search window'))}" title="${escapeHtml(t('Search window'))}" aria-haspopup="dialog" aria-controls="sp-modal" hidden>${icon('calendar')}${escapeHtml(t('Search window'))}</button>
      <button type="button" class="pole-panel-open" id="sp-panel-open" hidden aria-label="${escapeHtml(t('Show the study panel'))}" title="${escapeHtml(t('Show the study panel'))}">${icon('panel')}</button>

      <div class="pole-modal" id="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-mtitle" hidden>
        <div class="pole-modal-card">
          <h2 id="sp-mtitle">${escapeHtml(t('Choose the search window'))}</h2>
          <p class="sub" id="sp-plan" hidden></p>
          <p class="sub">${escapeHtml(t('Pick the period to screen: the first and last UTC days are the first and last touchdown samples. Every block is screened at its best touchdown inside this period, one sample per UTC day.'))}</p>
          <p class="sub" id="sp-mlimit"></p>
          <label class="pole-modal-field">${escapeHtml(t('Stay'))}<select id="sp-mstay"></select></label>
          <div class="pole-modal-dates">
            <label>${escapeHtml(t('Search from (UTC)'))}<input id="sp-mstart" type="date"></label>
          </div>
          <div class="pole-window-slider pole-modal-slider" id="sp-mslider"></div>
          <div class="pole-modal-row pole-length-row">
            <span>${escapeHtml(t('Length'))}</span>
            <span class="pole-days"><input id="sp-mdays" type="number" min="1" max="${MAX_WINDOW_DAYS}" step="1"><em>${escapeHtml(t('days'))}</em></span>
            <div class="seg" id="sp-len" role="group" aria-label="${escapeHtml(t('Quick length'))}"></div>
          </div>
          <p class="sub" id="sp-mrange"></p>
          <p id="sp-mwindowinfo" class="sub"></p>
          <div class="pole-modal-actions"><button type="button" class="btn-ghost" id="sp-mcancel">${escapeHtml(t('Cancel'))}</button><button type="button" class="btn-primary" id="sp-confirm">${escapeHtml(t('Use this window'))}</button></div>
        </div>
      </div>

      <div class="pole-atlas-pick" id="sp-atlas-pick" hidden>
        <p class="sr-only" id="sp-target" aria-live="polite"></p>
        <button type="button" class="pole-atlas-nav" id="sp-atlas-back" aria-label="${escapeHtml(t('Back to the map'))}" title="${escapeHtml(t('Back to the map'))}">${icon('back')}</button>
        <div class="pole-atlas-actions">
          <button type="button" data-slot="A">#1</button>
          <button type="button" data-slot="B">#2</button>
          <button type="button" data-slot="C">#3</button>
        </div>
      </div>

      <div class="pole-popup" id="sp-popup" hidden>
        <div class="pole-popup-card" id="sp-popup-card"></div>
      </div>
    </div>`;
    initTranslations();
    for (const id of ['sp-cards', 'sp-picked', 'sp-pick-atlas', 'sp-map-context', 'sp-mlimit', 'sp-stage', 'sp-globe', 'sp-map-wrap', 'sp-native', 'sp-map', 'sp-moon', 'sp-atlas', 'sp-hud', 'sp-windowhud', 'sp-panel', 'sp-panel-toggle', 'sp-sites', 'sp-point', 'sp-geom', 'sp-scope', 'sp-thresholds', 'sp-refine', 'sp-restart', 'sp-probe', 'sp-progress', 'sp-legend', 'sp-list-note', 'sp-cell', 'sp-abc', 'sp-modal', 'sp-plan', 'sp-mstay', 'sp-len', 'sp-mslider', 'sp-mrange', 'sp-mwindowinfo', 'sp-confirm', 'sp-mcancel', 'sp-mstart', 'sp-mdays', 'sp-popup', 'sp-popup-card', 'sp-panel-open', 'sp-window-show', 'sp-atlas-back', 'sp-gzin', 'sp-gzout', 'sp-pause', 'sp-zin', 'sp-zout', 'sp-center', 'sp-slots', 'sp-compare', 'sp-timeline', 'sp-compare-pane', 'sp-recommended-pane', 'sp-atlas-pick', 'sp-target']) els[id] = document.getElementById(id);
    bind();
    initWindow();
    restoreSlots();
    const site = selectedSite();
    if (site && !ui.target) ui.target = { lat: site.lat, lon: site.lon, label: site.name ?? site.label ?? t('Selected point') };
    renderStaySelects();
    localizeStatic();
    panelDefault(ui.stage);
    els['sp-modal'].hidden = false;
    syncWindowButton();
    const resize = new ResizeObserver(() => {
      measureDock();
      if (ui.built && ui.stage === 'map' && ctx.view() === 'pole') requestDraw();
    });
    resize.observe(els['sp-window-show']);
    resize.observe(root.firstElementChild);
    resize.observe(els['sp-map']);
    ui.built = true;
  }

  function localizeStatic() {
    renderAbc();
    els['sp-mlimit'].textContent = t('Windows are limited to {max} days (about half a year).', { max: MAX_WINDOW_DAYS });
    els['sp-scope'].innerHTML = `<option value="pole">${escapeHtml(t('South pole · 24 km blocks'))}</option><option value="pilot">${escapeHtml(t('Pilot · 2 km cells'))}</option>`;
    els['sp-scope'].value = ui.grid.scope;
    els['sp-atlas'].title = t('Atlas regional map');
    for (const id of ['sp-zin', 'sp-zout', 'sp-center', 'sp-panel-toggle', 'sp-panel-open', 'sp-atlas-back', 'sp-window-show']) els[id].title = els[id].getAttribute('aria-label');
  }

  function panelDefault(stage) {
    const collapsed = stage === 'globe' || window.matchMedia('(max-width:900px)').matches;
    els['sp-panel'].classList.toggle('collapsed', collapsed);
    els['sp-panel-open'].hidden = !collapsed;
    root.firstElementChild.classList.toggle('panel-collapsed', collapsed);
  }

  function syncWindowButton() {
    els['sp-window-show'].hidden = !ui.window.chosen || ui.stage === 'atlas';
    measureDock();
  }

  function measureDock() {
    const box = root.firstElementChild, edge = !els['sp-window-show'].hidden ? els['sp-window-show'] : null;
    const top = edge?.getBoundingClientRect().top ?? 0;
    box.style.setProperty('--dock', `${top ? Math.max(0, Math.round(box.getBoundingClientRect().bottom - top)) : 0}px`);
  }

  function renderStaySelects() {
    const options = STAY_CHOICES.map((s) => `<option value="${s.key}"${ctx.stayKey() === s.key ? ' selected' : ''}>${escapeHtml(t(s.label))}</option>`).join('');
    if (els['sp-mstay']) els['sp-mstay'].innerHTML = options;
  }

  /* ---------- globe ---------- */

  function frameNow(atMs = null) {
    const e = eph(), ms = atMs ?? clockMs(), index = clamp(e.indexOf(ms), 0, e.n - 1), state = e.stateAt(index);
    const status = new Map(ctx.sites().map((site) => [site.id, { sun: site.series.sunVis[Math.round(index)] === 1, link: site.series.earthClr[Math.round(index)] > ctx.margin() }]));
    return { ms, index, j: Math.round(index), sun: unit(state[1], state[0]), earth: unit(state[4], state[3]), earthLat: state[4], earthLon: state[3], sunLat: state[1], sunLon: state[0], sunDistKm: state[2], earthDistKm: state[5], status };
  }

  function pulseState() {
    const site = selectedSite();
    if (!site || !site.hasTerrain) return { state: 'unknown' };
    const index = Math.round(eph().indexOf(clockMs()));
    if (index < 0 || index >= eph().n) return { state: 'unknown' };
    return { state: site.series.earthVis[index] === 1 ? 'visible' : 'blocked' };
  }

  async function ensureGlobe() {
    if (ui.globe || ui.globeFailed) return ui.globe;
    ui.globe = await createPolar3d({
      $: (id) => document.querySelector(`#v-pole [data-p3d="${id}"]`),
      view: () => 'mission',
      active: () => ui.built && ui.stage === 'globe' && ctx.view() === 'pole',
      local: globeLocal,
      sites: () => (selectedSite() ? [selectedSite()] : []),
      pickedSite: selectedSite,
      labelText: (site) => `${site.label ?? site.name} · ${fmtLatLon(site.lat, site.lon)}`,
      colorOf: (st) => (st?.sun && st?.link ? COLORS.both : st?.sun ? COLORS.sun : st?.link ? COLORS.link : COLORS.dark),
      refresh: () => { if (globeLocal.picked && globeLocal.picked !== ui.selected) { ui.selected = globeLocal.picked; ctx.selectSite(ui.selected); } renderAll(); },
      ctx: { toast: ctx.toast },
      t, escapeHtml, fmtLatLon, unit, dot3, clamp, COLORS,
      getFrame: frameNow,
      setFailed: (failed) => { ui.globeFailed = failed; if (failed) setStage('map'); },
      controlsMode: 'grab', maxPixelRatio: 1.5,
      baseMs: () => ctx.landing() + ctx.previewHour() * HOUR,
      frameAt: (ms) => frameNow(ms),
      epochMs: eph().t0,
      animation: () => ({ running: ui.animRunning && ui.stage === 'globe', speed: ui.animSpeed }),
      onTime: (ms) => {
        ui.clockMs = ms;
        const now = performance.now();
        if (now - lastClockRender > 250) { lastClockRender = now; renderHud(); }
      },
      studyLat: STUDY_LAT,
      onMoonTap: (point) => { if (point.lat > STUDY_LAT) { setStage('map'); setNotice(t('That point is north of 85°S; the map stays on the pole.')); centrePole(); } else { setStage('map'); ui.map.cxKm = project(point.lat, point.lon).xKm; ui.map.cyKm = project(point.lat, point.lon).yKm; ui.map.scale = 24; drawMap(); } },
      pulse: pulseState,
      target: () => ui.target,
      skyline: () => {
        const site = selectedSite();
        if (!site?.hasTerrain) return null;
        const index = Math.round(eph().indexOf(clockMs()));
        if (index < 0 || index >= eph().n) return null;
        const sky = site.skyAt(index);
        const horizon = sky.earth.horizon ?? site.horizonAt(sky.earth.az);
        return { lat: site.lat, lon: site.lon, az: sky.earth.az, el: sky.earth.el, horizon, blocked: sky.earth.el <= horizon };
      },
    });
    ui.globe?.request();
    return ui.globe;
  }

  /* ---------- map ---------- */

  const pxPerKm = () => (1000 / 1200) * ui.map.scale;
  const screenOf = (xKm, yKm) => [381 + (xKm - ui.map.cxKm) * pxPerKm(), 381 - (yKm - ui.map.cyKm) * pxPerKm()];
  const kmOf = (sx, sy) => [ui.map.cxKm + (sx - 381) / pxPerKm(), ui.map.cyKm - (sy - 381) / pxPerKm()];
  const mapResolution = () => {
    const rect = els['sp-map'].getBoundingClientRect();
    return Math.round(clamp(Math.min(rect.width, rect.height) * Math.min(window.devicePixelRatio || 1, 2), 762, 2048));
  };

  function shadeCanvas(heights, N, kmPerPx) {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const cx = cv.getContext('2d'), img = cx.createImageData(N, N);
    const altitude = 10 * D2R, horizontal = Math.cos(altitude) / Math.sqrt(2), vertical = Math.sin(altitude);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x, h = heights[i], o = i * 4;
        if (!Number.isFinite(h)) { img.data[o + 3] = 0; continue; }
        const hx = heights[y * N + Math.min(N - 1, x + 1)] - heights[y * N + Math.max(0, x - 1)];
        const hy = heights[Math.min(N - 1, y + 1) * N + x] - heights[Math.max(0, y - 1) * N + x];
        const nx = -(Number.isFinite(hx) ? hx : 0) / (2 * kmPerPx * 1000), ny = (Number.isFinite(hy) ? hy : 0) / (2 * kmPerPx * 1000);
        const tone = 255 * clamp((-nx * horizontal - ny * horizontal + vertical) / (Math.hypot(nx, ny, 1) * 2 * vertical), 0, 1);
        img.data[o] = tone; img.data[o + 1] = tone; img.data[o + 2] = tone; img.data[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  async function ensureBase() {
    if (base.canvas) return base;
    const dem = await ctx.dem();
    if (base.canvas) return base;
    const N = 1024, halfKm = 2 * R_KM * Math.tan((90 + DEM_FOOTPRINT_LAT) * D2R / 2), kmPerPx = (2 * halfKm) / N;
    const heights = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const xKm = (x + 0.5 - N / 2) * kmPerPx, yKm = (N / 2 - y - 0.5) * kmPerPx, q = unproject(xKm, yKm);
      heights[y * N + x] = q.lat <= DEM_FOOTPRINT_LAT ? dem.height(q.lat * D2R, q.lon * D2R) : NaN;
    }
    base.canvas = shadeCanvas(heights, N, kmPerPx); base.dem = dem; base.halfKm = halfKm;
    return base;
  }

  function makeDetail() {
    if (!base.dem) return null;
    const N = mapResolution(), k = pxPerKm(), halfKm = 381 / k, kmPerPx = (2 * halfKm) / N, heights = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const xKm = ui.map.cxKm - halfKm + (x + 0.5) * kmPerPx, yKm = ui.map.cyKm + halfKm - (y + 0.5) * kmPerPx, q = unproject(xKm, yKm);
      heights[y * N + x] = q.lat <= DEM_FOOTPRINT_LAT ? base.dem.height(q.lat * D2R, q.lon * D2R) : NaN;
    }
    return shadeCanvas(heights, N, kmPerPx);
  }

  const detailKey = () => `${ui.map.cxKm.toFixed(3)}|${ui.map.cyKm.toFixed(3)}|${ui.map.scale.toFixed(2)}|${mapResolution()}`;
  let detailTimer = null, detailPending = '';
  function scheduleDetail() {
    const key = detailKey();
    if (key === detailPending) return;
    detailPending = key;
    clearTimeout(detailTimer);
    detailTimer = setTimeout(() => {
      detailPending = '';
      if (ui.map.dragging || ui.stage !== 'map') return;
      ui.map.detail = makeDetail(); ui.map.detailKey = detailKey();
      drawMap();
    }, 120);
  }

  let drawSeq = 0, drawQueued = false;
  function requestDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; drawMap(); });
  }

  async function drawMap() {
    const cv = els['sp-map']; if (!cv) return;
    const seq = ++drawSeq;
    const resolution = mapResolution();
    if (cv.width !== resolution || cv.height !== resolution) cv.width = cv.height = resolution;
    const g = cv.getContext('2d');
    g.setTransform(resolution / 762, 0, 0, resolution / 762, 0, 0);
    g.clearRect(0, 0, 762, 762); g.fillStyle = '#0f1113'; g.fillRect(0, 0, 762, 762);
    try {
      const b = await ensureBase();
      if (seq !== drawSeq) return;
      const k = pxPerKm(), size = b.halfKm * 2 * k, [left, top] = screenOf(-b.halfKm, b.halfKm);
      g.drawImage(b.canvas, left, top, size, size);
      if (!ui.map.dragging) {
        if (detailKey() === ui.map.detailKey && ui.map.detail) g.drawImage(ui.map.detail, 0, 0, 762, 762);
        else scheduleDetail();
      }
      for (const [lat, color, dash] of [[STUDY_LAT, '#ff9ad5', [6, 5]], [DEM_FOOTPRINT_LAT, '#58c8ff', []]]) {
        const r = 2 * R_KM * Math.tan((90 + lat) * D2R / 2) * k, [cx, cy] = screenOf(0, 0);
        g.beginPath(); g.setLineDash(dash); g.strokeStyle = color; g.lineWidth = 1.4; g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
    } catch { /* texture missing: blocks still draw */ }
    const clipR = 2 * R_KM * Math.tan((90 + STUDY_LAT) * D2R / 2) * pxPerKm(), [pcx, pcy] = screenOf(0, 0);
    g.save(); g.beginPath(); g.arc(pcx, pcy, clipR, 0, Math.PI * 2); g.clip();
    for (const cell of ui.grid.cells) {
      const [x0, y0] = screenOf(cell.xKm - cell.cellKm / 2, cell.yKm + cell.cellKm / 2);
      const [x1, y1] = screenOf(cell.xKm + cell.cellKm / 2, cell.yKm - cell.cellKm / 2);
      g.globalAlpha = 0.45; g.fillStyle = STATUS[scoreBand(cell)]; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = 1;
      g.strokeStyle = ui.cell === cell ? '#fff' : 'rgba(255,255,255,.16)'; g.lineWidth = ui.cell === cell ? 2 : 0.6;
      g.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(0, x1 - x0 - 1), Math.max(0, y1 - y0 - 1));
      if (cell.class?.status === 'unknown') {
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 0.7;
        for (let d = -Math.max(x1 - x0, y1 - y0); d < Math.max(x1 - x0, y1 - y0); d += 5) { g.beginPath(); g.moveTo(x0 + d, y0); g.lineTo(x0 + d + (y1 - y0), y1); g.stroke(); }
      }
    }
    g.restore();
    for (const site of studySites()) {
      const p = project(site.lat, site.lon), [x, y] = screenOf(p.xKm, p.yKm);
      g.beginPath(); g.arc(x, y, site.id === ui.selected ? 5.5 : 4, 0, Math.PI * 2);
      g.fillStyle = site.id === ui.selected ? '#fff' : '#9be7ff'; g.fill(); g.strokeStyle = '#0f1113'; g.lineWidth = 1.5; g.stroke();
    }
    topCells().forEach((cell, i) => {
      const [cx, cy] = screenOf(cell.xKm, cell.yKm), half = Math.max(8, cell.cellKm * pxPerKm() / 2);
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.strokeRect(cx - half, cy - half, half * 2, half * 2);
      g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fillStyle = '#0f1113'; g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(i + 1), cx, cy + 0.5); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    });
    const slotColors = { A: '#58c8ff', B: '#f5c542', C: '#ff9ad5' };
    for (const [name, slot] of Object.entries(ui.slots)) {
      if (!slot) continue;
      const p = project(slot.lat, slot.lon), [x, y] = screenOf(p.xKm, p.yKm);
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fillStyle = Number.isFinite(slot.metrics?.score) ? scoreColour(slot.metrics.score) : slotColors[name]; g.fill();
      g.strokeStyle = '#0f1113'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText(name, x + 9, y + 4);
    }
    if (ui.draft) {
      const point = project(ui.draft.lat, ui.draft.lon), [x, y] = screenOf(point.xKm, point.yKm);
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    }
  }

  function canvasPoint(e) {
    const box = els['sp-map'].getBoundingClientRect(), side = Math.min(box.width, box.height);
    return [(e.clientX - box.left - (box.width - side) / 2) / side * 762, (e.clientY - box.top - (box.height - side) / 2) / side * 762];
  }

  function bindMap() {
    const cv = els['sp-map'];
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); ui.map.dragging = { x: e.clientX, y: e.clientY, moved: 0 }; });
    cv.addEventListener('pointermove', (e) => {
      if (!ui.map.dragging) return;
      const dx = e.clientX - ui.map.dragging.x, dy = e.clientY - ui.map.dragging.y;
      ui.map.dragging.x = e.clientX; ui.map.dragging.y = e.clientY; ui.map.dragging.moved += Math.hypot(dx, dy);
      const box = cv.getBoundingClientRect(), ratio = 762 / Math.min(box.width, box.height);
      const k = pxPerKm(); ui.map.cxKm -= dx * ratio / k; ui.map.cyKm += dy * ratio / k; requestDraw();
    });
    cv.addEventListener('pointerup', (e) => {
      const drag = ui.map.dragging; ui.map.dragging = null;
      if (!drag || drag.moved > 6) { drawMap(); return; }
      const [sx, sy] = canvasPoint(e);
      const [xKm, yKm] = kmOf(sx, sy);
      const hit = ui.grid.cells.find((c) => Math.abs(xKm - c.xKm) <= c.cellKm / 2 && Math.abs(yKm - c.yKm) <= c.cellKm / 2);
      const q = unproject(xKm, yKm);
      if (sx < 0 || sx > 762 || sy < 0 || sy > 762 || q.lat > STUDY_LAT) { setNotice(t('Choose a point inside the 85°S study area.')); return; }
      selectMapPoint({ lat: q.lat, lon: q.lon, label: 'Map point' }, hit);
    });
    cv.addEventListener('pointercancel', () => { ui.map.dragging = null; drawMap(); });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [sx, sy] = canvasPoint(e);
      const [bx, by] = kmOf(sx, sy); ui.map.scale = clamp(ui.map.scale * Math.exp(-e.deltaY * 0.0015), 1.5, 60);
      const [ax, ay] = kmOf(sx, sy); ui.map.cxKm += bx - ax; ui.map.cyKm += by - ay; drawMap();
    }, { passive: false });
  }

  /* ---------- whole Moon ---------- */

  function drawMoon() {
    const cv = els['sp-moon']; if (!cv) return;
    if (!ui.moonReady) {
      const img = new Image();
      img.onload = () => { ui.moonImg = img; ui.moonReady = true; drawMoon(); };
      img.src = 'assets/moon_color_4k.webp';
      return;
    }
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H); g.drawImage(ui.moonImg, 0, 0, W, H);
    const e = eph(), state = e.stateAt(clamp(e.indexOf(clockMs()), 0, e.n - 1));
    const sl = Math.sin(state[1] * D2R), cl = Math.cos(state[1] * D2R);
    const shade = g.getImageData(0, 0, W, H), d = shade.data;
    for (let y = 0; y < H; y++) {
      const lat = (90 - (y + 0.5) / H * 180) * D2R, a = Math.sin(lat) * sl;
      for (let x = 0; x < W; x++) {
        const lon = ((x + 0.5) / W * 360 - 180 - state[0]) * D2R;
        const q = a + Math.cos(lat) * cl * Math.cos(lon), f = q > 0.06 ? 1 : q < -0.06 ? 0.18 : 0.18 + 0.82 * (q + 0.06) / 0.12;
        const i = (y * W + x) * 4; d[i] *= f; d[i + 1] *= f; d[i + 2] *= f;
      }
    }
    g.putImageData(shade, 0, 0);
    for (const site of ctx.sites()) {
      const x = ((site.lon + 180) % 360 + 360) % 360 / 360 * W, y = (90 - site.lat) / 180 * H;
      g.beginPath(); g.arc(x, y, site.id === ui.selected ? 6 : 4, 0, Math.PI * 2);
      g.fillStyle = site.id === ui.selected ? '#ffd24a' : '#9be7ff'; g.fill(); g.strokeStyle = '#0f1113'; g.lineWidth = 1.2; g.stroke();
    }
  }

  /* ---------- grid ---------- */

  function applyScenario(cell) {
    if (!cell.static) return { ...cell, class: { status: 'unknown', failed: ['no-data'], missed: [], score: null } };
    const best = screenCellWindow(eph(), { lat: cell.lat, lon: cell.lon, groundM: cell.static.groundM, slopeDeg: cell.static.slopeDeg, horizonDeg: cell.static.horizon }, { ...windowScenario(), scoreFailed: true }, ui.limits, ui.targets, ui.weights);
    if (!best) return { ...cell, stats: null, class: { status: 'unknown', failed: ['no-data'], missed: [], score: null } };
    return { ...cell, stats: best.stats, class: best.class, touchdownMs: eph().timeOf(best.startIndex) };
  }

  function refreshScenario(force = false) {
    refreshSlots();
    if (!ui.grid.cells.length) return;
    if (!force && ui.grid.scenarioKey === scenarioKey()) return;
    ui.grid.scenarioKey = scenarioKey();
    ui.grid.scenarioMs = 0;
    const t0 = performance.now();
    recomputeCells(0, t0);
  }

  function recomputeCells(idx, t0) {
    const cells = ui.grid.cells;
    if (idx >= cells.length) {
      ui.grid.scenarioMs = performance.now() - t0;
      renderGrid(); drawMap(); refreshSlots();
      return;
    }
    const end = Math.min(idx + 8, cells.length);
    for (let i = idx; i < end; i++) cells[i] = applyScenario(cells[i]);
    renderProgress(); renderList();
    setTimeout(() => recomputeCells(end, t0), 0);
  }

  async function buildGrid(scope = ui.grid.scope) {
    const token = ++ui.grid.token;
    const cells = scope === 'pole' ? studyCellCenters(POLE_CELL_KM) : cellCenters(REGION.fineCells, ui.pilotCenter);
    const azStep = scope === 'pole' ? 1 : 0.5;
    ui.grid = { scope, cells: cells.map((c) => ({ ...c, class: { status: 'pending' } })), token, done: false, startedMs: performance.now(), ms: 0, scenarioKey: scenarioKey() };
    ui.cell = null;
    renderGrid();
    const dem = await ctx.dem();
    const step = (idx) => {
      if (token !== ui.grid.token) return;
      if (idx >= ui.grid.cells.length) { ui.grid.done = true; ui.grid.ms = performance.now() - ui.grid.startedMs; renderGrid(); drawMap(); return; }
      const c = ui.grid.cells[idx], key = `${scope}:${c.cellKm}:${c.lat.toFixed(3)}:${c.lon.toFixed(3)}`;
      let st = staticCache.get(key);
      if (!st) {
        const ground = dem.height(c.lat * D2R, c.lon * D2R);
        if (!Number.isFinite(ground)) st = { groundM: NaN, slopeDeg: NaN, horizon: null };
        else {
          const r = dem.slopeDeg(c.lat * D2R, c.lon * D2R);
          st = { groundM: ground, slopeDeg: r, horizon: null };
          staticCache.set(key, st);
          setTimeout(() => {
            if (token !== ui.grid.token) return;
            const h = computeHorizon(dem, c.lat, c.lon, { minRangeM: 480, azStepDeg: azStep });
            st.horizon = h?.horizon ?? null; st.groundM = h?.groundM ?? ground; st.slopeDeg = h?.slopeDeg ?? r;
            if (token === ui.grid.token) { ui.grid.cells[idx] = applyScenario({ ...c, static: st }); renderProgress(); requestDraw(); step(idx + 1); }
          }, 0);
          return;
        }
        staticCache.set(key, st);
      }
      ui.grid.cells[idx] = applyScenario({ ...c, static: { ...st } });
      renderProgress(); requestDraw();
      setTimeout(() => step(idx + 1), 0);
    };
    step(0);
  }

  /* ---------- cell popup and Atlas ---------- */

  function openCell(cell) {
    ui.popupCell = cell;
    const cl = cell.class ?? { status: 'pending' };
    const reason = (cl.failed ?? []).concat(cl.missed ?? []).map((r) => t(REASON_TEXT[r] ?? r));
    els['sp-popup-card'].innerHTML = `<h3>${escapeHtml(t('Block {row}:{col}', { row: cell.row + 1, col: cell.col + 1 }))} · ${escapeHtml(t(scoreBand(cell)))}</h3>
      <p class="sub">${escapeHtml(fmtLatLon(cell.lat, cell.lon, 3))}</p>
      <div class="pole-metrics">
        <div><b>${cell.static && Number.isFinite(cell.static.slopeDeg) ? cell.static.slopeDeg.toFixed(1) + '°' : '—'}</b><span>${escapeHtml(t('regional slope'))}</span></div>
        <div><b>${cell.stats ? Math.round(cell.stats.sunPct) + '%' : '—'}</b><span>${escapeHtml(t('sunlight over the stay'))}</span></div>
        <div><b>${cell.stats ? Math.round(cell.stats.earthPct) + '%' : '—'}</b><span>${escapeHtml(t('Earth visibility over the stay'))}</span></div>
        <div><b>${cell.stats ? cell.stats.longestH + ' h' : '—'}</b><span>${escapeHtml(t('longest continuous Earth link'))}</span></div>
        <div>${scoreBadge(cl.rawScore ?? cl.score)}<span>${escapeHtml(t('screening score'))}</span></div>
      </div>
      <p class="sub">${cell.touchdownMs ? escapeHtml(t('Best touchdown in the window: {time}.', { time: fmtDateTime(cell.touchdownMs) })) : ''}</p>
      <p class="sub">${escapeHtml(reason.length ? t('Rules: {rules}.', { rules: reason.join('; ') }) : t('All hard limits and preference targets met.'))}</p>
      <div class="pole-popup-actions"><button type="button" class="btn-primary" id="sp-enter-atlas">${escapeHtml(t('Enter Atlas'))}</button><button type="button" class="btn-ghost" id="sp-close-popup">${escapeHtml(t('Close'))}</button></div>`;
    els['sp-popup'].hidden = false;
    document.getElementById('sp-enter-atlas').onclick = () => { els['sp-popup'].hidden = true; enterAtlas(cell); };
    document.getElementById('sp-close-popup').onclick = () => { els['sp-popup'].hidden = true; };
  }

  function atlasPoint() {
    return ui.target ?? selectedSite();
  }

  function atlasTarget() {
    const q = new URLSearchParams();
    const point = atlasPoint();
    if (point) q.append('s', `${point.lat.toFixed(4)},${(((point.lon + 180) % 360 + 360) % 360 - 180).toFixed(4)},${point.label ?? point.name ?? t('Selected point')}`);
    q.set('t', `${new Date(ctx.landing()).toISOString().slice(0, 16)}Z`);
    const key = point ? `p:${point.lat.toFixed(4)}:${point.lon.toFixed(4)}` : 'p:none';
    return { key, url: `atlas/index.html?embed=1&sp=${++ui.atlasRev}#${q.toString()}` };
  }

  function syncAtlas() {
    const { key, url } = atlasTarget();
    if (key !== ui.atlasKey) { ui.atlasKey = key; ui.atlasReady = false; if (ui.stage === 'atlas') ui.atlasFocusPending = true; els['sp-atlas'].src = url; }
  }

  function enterAtlas(cell) {
    ui.popupCell = cell;
    if (cell) ui.target = { lat: cell.lat, lon: cell.lon, label: t('Screened block') };
    setStage('atlas');
  }

  function sameSpot(a, b) { return a && b && Math.abs(a.lat - b.lat) < 1e-3 && Math.abs(a.lon - b.lon) < 1e-3; }

  async function ensureSlotStatic(slot) {
    if (slot.static) return slot.static;
    const dem = await ctx.dem();
    const h = computeHorizon(dem, slot.lat, slot.lon, { minRangeM: 480 });
    slot.static = h ? { groundM: h.groundM, slopeDeg: h.slopeDeg, horizon: h.horizon } : null;
    return slot.static;
  }

  async function measureSlot(slot) {
    if (!slot) return;
    const key = metricsKey();
    if (slot.measuringKey === key) return;
    slot.measuringKey = key;
    slot.metrics = null;
    renderSlots();
    try {
      const st = await ensureSlotStatic(slot);
      if (slot.measuringKey !== key) return;
      if (metricsKey() !== key) { slot.measuringKey = null; measureSlot(slot); return; }
      const best = st ? screenCellWindow(eph(), { lat: slot.lat, lon: slot.lon, groundM: st.groundM, slopeDeg: st.slopeDeg, horizonDeg: st.horizon }, { ...windowScenario(), scoreFailed: true }, ui.limits, ui.targets, ui.weights) : null;
      slot.metrics = best?.stats ? { earthPct: best.stats.earthPct, longestH: best.stats.longestH, sunPct: best.stats.sunPct, slopeDeg: st.slopeDeg, score: best.class.rawScore ?? best.class.score, failed: best.class.failed, touchdownMs: eph().timeOf(best.startIndex), timeline: best.sky ? { t0Ms: eph().timeOf(best.sky.from), span: best.sky.span, stepMs: HOUR, sun: best.sky.sunOpen, earth: best.sky.earthOpen } : null } : null;
      slot.metricsKey = key;
    } catch {
      if (slot.measuringKey !== key) return;
      slot.metrics = null;
      slot.metricsKey = key;
    }
    slot.measuringKey = null;
    renderSlots(); drawMap();
  }

  function refreshSlots() {
    const key = metricsKey();
    for (const slot of new Set([ui.draft, ...Object.values(ui.slots)])) {
      if (!slot) continue;
      if (slot.metricsKey === key) continue;
      measureSlot(slot);
    }
  }

  function mapSlotPoint() {
    return ui.draft;
  }

  function selectMapPoint(point, cell = null) {
    ui.cell = cell;
    ui.popupCell = null;
    ui.draft = point;
    if (cell?.static && sameSpot(cell, point)) point.static = cell.static;
    ui.target = point;
    els['sp-popup'].hidden = true;
    renderSelection(); renderAbc(); renderDetail(); renderSites(); renderHud(); drawMap();
    if (ui.stage === 'map' && !els['sp-panel'].classList.contains('collapsed')) els['sp-abc'].scrollIntoView({ block: 'nearest' });
    if (point.metricsKey !== metricsKey()) measureSlot(point);
  }

  function persistSlots() {
    try {
      const data = Object.fromEntries(Object.entries(ui.slots).filter(([, slot]) => slot).map(([name, slot]) => [name, { lat: slot.lat, lon: slot.lon, label: slot.label }]));
      localStorage.setItem('lunalens:slots', JSON.stringify(data));
    } catch { /* storage can be unavailable */ }
  }

  function restoreSlots() {
    try {
      const data = JSON.parse(localStorage.getItem('lunalens:slots') ?? 'null');
      if (!data) return;
      for (const name of ['A', 'B', 'C']) {
        const slot = data[name];
        if (slot && Number.isFinite(slot.lat) && Number.isFinite(slot.lon)) {
          ui.slots[name] = { lat: slot.lat, lon: slot.lon, label: slot.label || t('Atlas point'), metrics: null };
          measureSlot(ui.slots[name]);
        }
      }
    } catch { /* ignore a damaged stored value */ }
  }

  function renderAbc() {
    if (!els['sp-abc']) return;
    const saved = Object.entries(ui.slots).find(([, slot]) => sameSpot(slot, ui.draft));
    for (const b of els['sp-abc'].querySelectorAll('[data-slot]')) {
      const name = b.dataset.slot, slot = ui.slots[name];
      b.textContent = t(saved?.[0] === name ? 'Saved as {name}' : slot ? 'Replace {name}' : 'Save as {name}', { name: slotLabel(name) });
      b.disabled = !ui.draft || Boolean(saved);
      b.title = slot ? `${slotLabel(name)} · ${fmtLatLon(slot.lat, slot.lon, 3)}` : b.textContent;
      b.setAttribute('aria-label', b.textContent);
    }
  }


  function assignMapSlot(name) {
    const point = mapSlotPoint();
    if (!point) { setNotice(t('Select a block or site first.')); return; }
    ui.target = point;
    saveSlot(name, true);
  }

  function syncAtlasState(state) {
    if (state?.active && Number.isFinite(state.active.lat) && Number.isFinite(state.active.lon)) {
      ui.target = { lat: state.active.lat, lon: state.active.lon, label: state.active.label || t('Atlas point') };
      if (els['sp-target']) els['sp-target'].textContent = `${ui.target.label} · ${fmtLatLon(ui.target.lat, ui.target.lon, 3)}`;
    }
    if (Number.isFinite(state?.tMs)) {
      const ms = clamp(state.tMs, eph().t0, eph().tEnd - ctx.stayH() * HOUR);
      ui.clockMs = ms;
      if (Math.abs(ms - ctx.landing()) > 60e3) ctx.setTouchdown(ms);
    }
    renderHud();
    drawMap();
    if (!ui.atlasReady) {
      ui.atlasReady = true;
      setTimeout(() => {
        pushAtlasCommand();
        if (ui.atlasFocusPending) { ui.atlasFocusPending = false; focusAtlas(); }
      }, 120);
    }
  }

  function renderAtlasSlots() {
    for (const b of document.querySelectorAll('.pole-atlas-actions [data-slot]')) {
      const used = Boolean(ui.slots[b.dataset.slot]);
      b.disabled = used; b.textContent = used ? `${slotLabel(b.dataset.slot)} ✓` : slotLabel(b.dataset.slot);
      b.classList.toggle('filled', used);
    }
  }

  function assignAtlasSlot(name) {
    const point = ui.target;
    if (!point) { setNotice(t('Select a point in Atlas first.')); return; }
    ui.target = point;
    saveSlot(name);
    ui.atlasKey = '';
    syncAtlas();
  }

  function pushAtlasCommand() {
    const win = els['sp-atlas']?.contentWindow;
    if (!win || ui.stage !== 'atlas') return;
    const point = atlasPoint();
    const sites = point ? [{ lat: point.lat, lon: point.lon, label: point.label ?? point.name ?? t('Selected point') }] : [];
    const active = point ? { lat: point.lat, lon: point.lon } : null;
    win.postMessage({ type: 'lunalens:atlas-command', sites, active, layer: 'natural', tMs: clockMs() }, location.origin);
  }

  function focusAtlas() {
    if (ui.stage !== 'atlas') return;
    const point = atlasPoint();
    const win = els['sp-atlas']?.contentWindow;
    if (!point || !win) return;
    win.postMessage({ type: 'lunalens:atlas-command', focus: { lat: point.lat, lon: point.lon } }, location.origin);
  }

  function saveSlot(name, replace = false) {
    if (!ui.target) return;
    const existing = Object.values(ui.slots).find((s) => sameSpot(s, ui.target));
    if (existing) { setNotice(t('That point is already saved.')); return; }
    if (ui.slots[name] && !replace) return;
    ui.slots[name] = ui.target;
    if (ui.slots[name].metricsKey !== metricsKey()) measureSlot(ui.slots[name]);
    renderSlots();
    renderAbc();
    renderAtlasSlots();
    persistSlots();
    pushAtlasCommand();
    setNotice(t('Saved point {name}: {pos}.', { name: slotLabel(name), pos: fmtLatLon(ui.target.lat, ui.target.lon, 3) }));
  }

  function renderSlots() {
    const names = ['A', 'B', 'C'];
    const colors = { A: '#58c8ff', B: '#f5c542', C: '#ff9ad5' };
    const filled = names.map((n) => [n, ui.slots[n]]).filter(([, s]) => s && s.metrics);
    if (filled.length >= 2) {
      els['sp-compare'].innerHTML = `<table class="pole-cmp"><thead><tr><th></th>${filled.map(([n]) => `<th><span style="color:${colors[n]}">${slotLabel(n)}</span><button type="button" class="pole-cmp-remove" data-remove="${n}" aria-label="${escapeHtml(t('Remove {name}', { name: slotLabel(n) }))}">×</button></th>`).join('')}</tr></thead><tbody>
        <tr><th>${escapeHtml(t('Earth visibility'))}</th>${filled.map(([, s]) => `<td>${Math.round(s.metrics.earthPct)}%</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Longest link'))}</th>${filled.map(([, s]) => `<td>${s.metrics.longestH} h</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Sunlight'))}</th>${filled.map(([, s]) => `<td>${Math.round(s.metrics.sunPct)}%</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('screening score'))}</th>${filled.map(([, s]) => `<td>${scoreBadge(s.metrics.score)}</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Slope'))}</th>${filled.map(([, s]) => `<td>${s.metrics.slopeDeg.toFixed(1)}°</td>`).join('')}</tr></tbody></table>`;
    } else {
      els['sp-compare'].innerHTML = `<p class="sub">${escapeHtml(t('Save at least two points to compare them.'))}</p>`;
    }
    renderTimeline();
    renderSelection();
    renderAbc();
    renderAtlasSlots();
  }

  function timelineSpans(open) {
    const spans = [];
    let start = -1;
    for (let i = 0; i < open.length; i++) {
      if (open[i]) { if (start < 0) start = i; }
      else if (start >= 0) { spans.push([start, i]); start = -1; }
    }
    if (start >= 0) spans.push([start, open.length]);
    return spans;
  }

  function longestSpan(spans) {
    let best = null;
    for (const span of spans) if (!best || span[1] - span[0] > best[1] - best[0]) best = span;
    return best;
  }

  const timelinePct = (i, n) => `${(i / n) * 100}%`;

  function timelineRuns(spans, n) {
    return spans.map(([a, b]) => `<i style="left:${timelinePct(a, n)};width:${timelinePct(b - a, n)}"></i>`).join('');
  }

  function updateTimelineCursor() {
    const host = els['sp-timeline'];
    const hit = host?.querySelector('.tl-hit');
    const cursor = host?.querySelector('.tl-cursor');
    const t0 = Number(hit?.dataset.t0), spanMs = Number(hit?.dataset.span);
    if (!cursor || !Number.isFinite(t0) || !Number.isFinite(spanMs) || spanMs <= 0) return;
    cursor.style.left = `${clamp((clockMs() - t0) / spanMs, 0, 1) * 100}%`;
  }

  function renderTimeline() {
    const host = els['sp-timeline'];
    if (!host) return;
    const filled = ['A', 'B', 'C'].map((name) => [name, ui.slots[name]]).filter(([, slot]) => slot?.metrics?.timeline);
    if (!filled.length) {
      host.innerHTML = `<p class="sub">${escapeHtml(t('Save a point to see its sunlight and Earth windows.'))}</p>`;
      return;
    }
    const base = filled[0][1].metrics.timeline;
    const n = base.span, spanMs = n * base.stepMs;
    const rows = filled.map(([name, slot]) => {
      const tl = slot.metrics.timeline;
      const night = longestSpan(timelineSpans(Array.from(tl.sun, (open) => (open ? 0 : 1))));
      return `<div class="tl-row"><b class="tl-badge" style="color:${SLOT_COLOURS[name]}">${slotLabel(name)}</b><div class="tl-lanes">
        <div class="lane sun">${timelineRuns(timelineSpans(tl.sun), n)}</div>
        <div class="lane earth">${timelineRuns(timelineSpans(tl.earth), n)}</div>
        ${night ? `<b class="tl-night" style="left:${timelinePct(night[0], n)};width:${timelinePct(night[1] - night[0], n)}"></b>` : ''}
      </div></div>`;
    }).join('');
    const allLit = filled.length > 1
      ? timelineSpans(Array.from({ length: n }, (_, i) => filled.every(([, slot]) => slot.metrics.timeline.sun[i])))
      : [];
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => `<span style="left:${f * 100}%">${escapeHtml(fmtDayMonth(base.t0Ms + f * spanMs))}</span>`).join('');
    const f = clamp((clockMs() - base.t0Ms) / spanMs, 0, 1);
    host.innerHTML = `<div class="tl tl-compare">
      <div class="tl-body">
        ${rows}
        ${filled.length > 1 ? `<div class="tl-row"><b class="tl-badge tl-all">all</b><div class="tl-lanes"><div class="lane all">${timelineRuns(allLit, n)}</div></div></div>` : ''}
        <div class="tl-hit" role="slider" tabindex="0" aria-label="${escapeHtml(t('Selected time, shared by every point'))}" aria-valuemin="0" aria-valuemax="${Math.round(spanMs / DAY)}" aria-valuenow="${(f * spanMs / DAY).toFixed(1)}" aria-valuetext="${escapeHtml(fmtDateTime(clockMs()))}" data-t0="${base.t0Ms}" data-span="${spanMs}"><i class="tl-cursor" style="left:${f * 100}%"></i></div>
      </div>
      <div class="tl-ticks" aria-hidden="true">${ticks}</div>
      <p class="tl-key"><i class="sw sun"></i>${escapeHtml(t('Sun'))} <i class="sw earth"></i>${escapeHtml(t('Earth'))} <i class="sw night"></i>${escapeHtml(t('longest night'))} <i class="sw all"></i>${escapeHtml(t('all sunlit'))}</p>
    </div>`;
    const hit = host.querySelector('.tl-hit');
    if (!hit) return;
    const seek = (event) => {
      const box = hit.getBoundingClientRect();
      const ms = base.t0Ms + clamp((event.clientX - box.left) / box.width, 0, 1) * spanMs;
      ui.clockMs = ms;
      ctx.setTouchdown(ms);
      renderHud();
      updateTimelineCursor();
      drawMap();
    };
    hit.onpointerdown = (event) => { hit.setPointerCapture(event.pointerId); seek(event); };
    hit.onpointermove = (event) => { if (event.buttons === 1) seek(event); };
    hit.onkeydown = (event) => {
      const step = (event.shiftKey ? 24 : 6) * HOUR;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const ms = clamp(clockMs() + (event.key === 'ArrowLeft' ? -step : step), base.t0Ms, base.t0Ms + spanMs);
      ui.clockMs = ms;
      ctx.setTouchdown(ms);
      renderHud();
      updateTimelineCursor();
      drawMap();
    };
  }

  function setCardsTab(tab) {
    for (const button of document.querySelectorAll('#sp-cards [data-cards-tab]')) {
      const on = button.dataset.cardsTab === tab;
      button.classList.toggle('on', on);
      button.setAttribute('aria-selected', String(on));
    }
    els['sp-compare-pane'].hidden = tab !== 'compare';
    els['sp-recommended-pane'].hidden = tab !== 'recommended';
  }

  /* ---------- render ---------- */

  function setStage(stage) {
    const previous = ui.stage;
    ui.stage = stage;
    els['sp-popup'].hidden = true;
    if (root.firstElementChild) root.firstElementChild.dataset.stage = stage;
    els['sp-globe'].hidden = stage !== 'globe';
    els['sp-map-wrap'].hidden = stage !== 'map';
    els['sp-atlas'].hidden = stage !== 'atlas';
    els['sp-cards'].hidden = stage !== 'map' || ui.tab !== 'southpole';
    els['sp-panel'].hidden = stage === 'atlas';
    els['sp-atlas-pick'].hidden = stage !== 'atlas';
    if (stage !== 'atlas') panelDefault(stage);
    const atlas = stage === 'atlas';
    els['sp-hud'].hidden = atlas;
    els['sp-windowhud'].hidden = atlas;
    syncWindowButton();
    if (atlas) {
      if (previous !== 'atlas') ui.atlasFocusPending = true;
      const tgt = ui.target;
      els['sp-target'].textContent = tgt ? `${t(tgt.label)} · ${fmtLatLon(tgt.lat, tgt.lon, 3)} · ${fmtDateTime(clockMs())}` : '';
    }
    if (stage === 'globe') {
      ui.animRunning = true;
      els['sp-pause'].textContent = '⏸';
      for (const b of document.querySelectorAll('.pole-time [data-speed]')) b.classList.toggle('on', Number(b.dataset.speed) === ui.animSpeed);
      ensureGlobe();
    } else if (stage === 'map') {
      if (!ui.map.opened) { centrePole(); ui.map.opened = true; }
      if (!ui.grid.cells.length) buildGrid(ui.grid.scope); else if (ui.tab === 'moon') drawMoon(); else drawMap();
    }
    else if (stage === 'atlas') {
      syncAtlas(ui.popupCell ?? ui.cell);
      setTimeout(() => {
        pushAtlasCommand();
        if (previous !== 'atlas' && ui.atlasReady) { ui.atlasFocusPending = false; focusAtlas(); }
      }, 120);
    }
    ctx.syncNav?.();
    renderHud();
  }

  function setTab(tab) {
    ui.tab = tab;
    root.firstElementChild.dataset.mapTab = tab;
    els['sp-cards'].hidden = ui.stage !== 'map' || tab !== 'southpole';
    els['sp-native'].hidden = tab !== 'southpole';
    els['sp-moon'].hidden = tab !== 'moon';
    for (const b of document.querySelectorAll('.pole-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    if (tab === 'moon') drawMoon(); else drawMap();
  }

  function renderHud() {
    if (ui.stage === 'atlas' && ui.popupCell) {
      els['sp-hud'].textContent = `${t('Screened block')} · ${fmtLatLon(ui.popupCell.lat, ui.popupCell.lon, 3)} · ${fmtDateTime(clockMs())}`;
    } else {
      const site = selectedSite();
      els['sp-hud'].textContent = `${site ? site.label ?? site.name : t('No site selected')} · ${fmtDateTime(clockMs())}`;
    }
    els['sp-windowhud'].textContent = t('{days} days in the search window', { days: ui.window.endDay - ui.window.startDay + 1 }) + ` · ${ctx.stayH()} h`;
    els['sp-map-context'].textContent = ui.draft ? `${t('Selected point')} · ${fmtLatLon(ui.draft.lat, ui.draft.lon, 3)} · ${fmtDateTime(clockMs())}` : els['sp-hud'].textContent;
    updateTimelineCursor();
  }

  function renderAll() {
    if (!ui.built) return;
    renderStaySelects(); syncWindowInputs(); renderSites(); renderGrid(); renderDetail(); renderHud(); renderSlots();
    if (ui.stage === 'map') { if (ui.tab === 'moon') drawMoon(); else drawMap(); }
    if (ui.stage === 'atlas') syncAtlas(ui.popupCell ?? ui.cell);
  }

  function renderSites() {
    els['sp-sites'].innerHTML = studySites().map((s) => `<button type="button" class="pole-site${s.id === ui.selected ? ' sel' : ''}" data-site="${escapeHtml(s.id)}" title="${escapeHtml(s.terrain)}"><b>${escapeHtml(t(s.name))}</b><span>${escapeHtml(fmtLatLon(s.lat, s.lon, 2))}</span></button>`).join('');
    const site = selectedSite();
    const point = ui.draft ?? site;
    els['sp-point'].textContent = point ? fmtLatLon(point.lat, point.lon, 3) : t('None selected');

  }



  function renderGrid() {
    const scope = ui.grid.scope ?? 'pole';
    if (scope === 'pole') {
      const g = poleGeometry();
      els['sp-geom'].textContent = t('Whole study area: {n} blocks of {km} km south of 85°S. Centre samples on the {res} m raster.', { n: g.cells, km: Number(g.cellKm.toFixed(1)), res: g.demResM });
    } else {
      const g = gridGeometry(8);
      els['sp-geom'].textContent = t('{cells} × {cells} cells, {km} km each around {centre}. Centre samples on the {res} m raster.', { cells: 8, km: g.cellKm, centre: fmtLatLon(ui.pilotCenter.centerLat, ui.pilotCenter.centerLon, 1), res: g.demResM });
    }
    els['sp-scope'].value = scope;
    els['sp-legend'].innerHTML = ['green', 'yellow', 'red', 'unknown'].map((s) => `<span><i class="pole-sw" style="background:${STATUS[s]}"></i>${escapeHtml(s === 'green' ? t('Score ≥ {n}', { n: SCORE_GREEN }) : s === 'yellow' ? t('Score {a}–{b}', { a: SCORE_YELLOW, b: SCORE_GREEN - 1 }) : s === 'red' ? t('Score < {n}', { n: SCORE_YELLOW }) : t('unknown or not computed'))}</span>`).join('');
    renderProgress(); renderThresholds(); renderList();
  }

  function renderProgress() {
    const cells = ui.grid.cells;
    const tally = { green: 0, yellow: 0, red: 0, unknown: 0 };
    let done = 0;
    for (const c of cells) {
      const band = scoreBand(c);
      if (band !== 'pending') done++;
      if (band in tally) tally[band]++;
    }
    const count = (s) => tally[s];
    els['sp-progress'].textContent = cells.length ? t('{level}: {done}/{total} blocks ({green} green, {yellow} yellow, {red} red, {unknown} unknown). Built in {ms} ms; scenario {s} ms.', {
      level: t(ui.grid.scope === 'pole' ? 'South pole blocks' : 'Pilot cells'), done, total: cells.length,
      green: count('green'), yellow: count('yellow'), red: count('red'), unknown: count('unknown'),
      ms: Math.round(ui.grid.ms || (performance.now() - ui.grid.startedMs)), s: Math.round(ui.grid.scenarioMs ?? 0),
    }) : t('Grid not started.');
  }

  function renderThresholds() {
    const field = (name, label, value) => `<label>${escapeHtml(label)}<input type="number" min="0" step="1" value="${value}" data-limit="${name}"></label>`;
    els['sp-thresholds'].innerHTML = `<p class="sub">${escapeHtml(t('Colours follow the screening score: green 85 and above, yellow 70–84, red below 70.'))}</p>`
      + `<p class="sub">${escapeHtml(t('Scores describe preferences; recommended blocks must also meet every screening limit.'))}</p>`
      + field('maxSlopeDeg', t('Slope limit (°)'), ui.limits.maxSlopeDeg)
      + field('minEarthPct', t('Earth visibility limit (%)'), ui.limits.minEarthPct)
      + field('minWindowH', t('Link window limit (h)'), ui.limits.minWindowH)
      + field('targetSlopeDeg', t('Slope target (°)'), ui.targets.slopeDeg)
      + field('targetEarthPct', t('Visibility target (%)'), ui.targets.earthPct)
      + field('targetWindowH', t('Link window target (h)'), ui.targets.windowH)
      + field('targetSunPct', t('Sunlight target (%)'), ui.targets.sunPct);
  }

  function topCells() {
    return ui.grid.cells.filter((c) => c.class?.score != null && c.stats)
      .sort((x, y) => y.class.score - x.class.score || y.stats.earthPct - x.stats.earthPct).slice(0, 3);
  }

  function renderCards(rank) {
    const list = document.getElementById('sp-cardlist');
    if (!list) return;
    list.innerHTML = rank.length ? rank.map((c, i) => `<li><button type="button" class="pole-card" data-cell="${c.row}-${c.col}">
      <span class="pole-card-head"><b class="pole-badge" style="--badge:${STATUS[scoreBand(c)]}">#${i + 1}</b><span>${escapeHtml(fmtLatLon(c.lat, c.lon, 2))}</span>${scoreBadge(c.class.score)}</span>
      ${barRow(t('Sunlight'), c.stats.sunPct, '#f5c542')}${barRow(t('Earth'), c.stats.earthPct, '#58a6ff')}
      <span class="pole-card-foot">${escapeHtml(t('Longest link'))} ${c.stats.longestH} h · ${escapeHtml(t('Slope'))} ${c.static.slopeDeg.toFixed(1)}°${c.touchdownMs ? ` · ${escapeHtml(fmtDateTime(c.touchdownMs))}` : ''}</span>
    </button></li>`).join('') : `<li class="sub">${escapeHtml(t('No qualifying cell yet.'))}</li>`;
  }



  function limitNote(metrics) {
    const rules = (metrics.failed ?? []).map((reason) => t(REASON_TEXT[reason] ?? reason));
    return rules.length ? `<span class="pole-limit-note">${escapeHtml(t('Outside screening limits: {rules}.', { rules: rules.join('; ') }))}</span>` : '';
  }

  function renderSelection() {
    const point = ui.draft;
    els['sp-pick-atlas'].disabled = !point;
    els['sp-pick-atlas'].title = point ? `${t('Enter Atlas')} · ${fmtLatLon(point.lat, point.lon, 3)}` : t('Choose a point on the map and save it as #1, #2 or #3.');
    if (!point) {
      els['sp-picked'].innerHTML = `<p class="sub">${escapeHtml(t('Choose a point on the map and save it as #1, #2 or #3.'))}</p>`;
      return;
    }
    const metrics = point.metrics;
    els['sp-picked'].innerHTML = `<div class="pole-selected-head"><span>${escapeHtml(fmtLatLon(point.lat, point.lon, 3))}</span>${scoreBadge(metrics?.score)}</div>
      ${metrics ? `${barRow(t('Sunlight'), metrics.sunPct, '#f5c542')}${barRow(t('Earth'), metrics.earthPct, '#58a6ff')}
      <p class="pole-selected-meta">${escapeHtml(t('Longest link'))} ${metrics.longestH} h · ${escapeHtml(t('Slope'))} ${metrics.slopeDeg.toFixed(1)}°</p>${limitNote(metrics)}` : `<p class="sub" role="status">${escapeHtml(t(point.measuringKey ? 'measuring…' : 'No terrain skyline for this point.'))}</p>`}`;
  }

  function renderList() {
    const cells = ui.grid.cells;
    const pending = cells.filter((c) => !c.class?.status || c.class.status === 'pending').length;
    const rank = topCells();
    renderCards(rank);
    if (els['sp-list-note']) els['sp-list-note'].textContent = pending ? t('Computing… {n} blocks left.', { n: pending }) : t('Best touchdown per block in the search window, ranked by screening score.');

  }

  function renderDetail() {
    const c = ui.cell;
    if (!c) { els['sp-cell'].innerHTML = `<p class="sub">${escapeHtml(t('Select a block on the map for details.'))}</p>`; return; }
    const cl = c.class ?? { status: 'pending' };
    els['sp-cell'].innerHTML = `<h3>${escapeHtml(t('Block {row}:{col}', { row: c.row + 1, col: c.col + 1 }))} · ${escapeHtml(t(scoreBand(c)))}</h3>
      <p class="sub">${escapeHtml(fmtLatLon(c.lat, c.lon, 3))}</p>
      <div class="pole-metrics"><div><b>${c.static && Number.isFinite(c.static.slopeDeg) ? c.static.slopeDeg.toFixed(1) + '°' : '—'}</b><span>${escapeHtml(t('regional slope'))}</span></div>
      <div><b>${c.stats ? Math.round(c.stats.sunPct) + '%' : '—'}</b><span>${escapeHtml(t('sunlight over the stay'))}</span></div>
      <div><b>${c.stats ? Math.round(c.stats.earthPct) + '%' : '—'}</b><span>${escapeHtml(t('Earth visibility'))}</span></div>
      <div><b>${c.stats ? c.stats.longestH + ' h' : '—'}</b><span>${escapeHtml(t('longest continuous link'))}</span></div></div>
      <p class="sub">${c.touchdownMs ? escapeHtml(t('Best touchdown in the window: {time}.', { time: fmtDateTime(c.touchdownMs) })) : ''}</p>
      <button type="button" class="btn-ghost btn-xs" id="sp-detail-open">${escapeHtml(t('Open details'))}</button>`;
    const open = document.getElementById('sp-detail-open');
    if (open) open.onclick = () => openCell(c);
  }

  function renderSitesAndWindow() { renderSites(); syncWindowInputs(); }

  /* ---------- events ---------- */

  function bind() {
    els['sp-gzin'].onclick = () => ui.globe?.zoom?.(0.8);
    els['sp-gzout'].onclick = () => ui.globe?.zoom?.(1.25);
    for (const b of document.querySelectorAll('.pole-time [data-speed]')) b.onclick = () => {
      ui.animSpeed = Number(b.dataset.speed); ui.animRunning = true;
      for (const x of document.querySelectorAll('.pole-time [data-speed]')) x.classList.toggle('on', x === b);
      els['sp-pause'].textContent = '⏸';
    };
    els['sp-pause'].onclick = () => { ui.animRunning = !ui.animRunning; els['sp-pause'].textContent = ui.animRunning ? '⏸' : '▶'; };
    els['sp-zin'].onclick = () => { ui.map.scale = clamp(ui.map.scale * 1.5, 1.5, 60); drawMap(); };
    els['sp-zout'].onclick = () => { ui.map.scale = clamp(ui.map.scale / 1.5, 1.5, 60); drawMap(); };
    els['sp-center'].onclick = centrePole;
    els['sp-sites'].onclick = (e) => {
      const b = e.target.closest('[data-site]'); if (!b) return;
      ui.selected = b.dataset.site; ui.cell = null; ctx.selectSite(ui.selected);
      const site = selectedSite(); if (site) selectMapPoint({ lat: site.lat, lon: site.lon, label: site.name ?? site.label ?? 'Selected point' });
      renderAll();
    };

    els['sp-mstay'].onchange = (e) => { ctx.setStay(e.target.value); renderStaySelects(); setWindow(ui.window.startDay, ui.window.endDay); };
    els['sp-confirm'].onclick = confirmWindow;
    els['sp-window-show'].onclick = openWindowEditor;
    els['sp-mcancel'].onclick = () => cancelWindow();
    els['sp-modal'].addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); cancelWindow(); } });
    els['sp-mstart'].onchange = applyModalInputs;
    els['sp-mdays'].onchange = applyModalInputs;
    els['sp-modal'].addEventListener('click', (e) => {
      const length = e.target.closest('[data-len]');
      if (length) setWindow(ui.window.startDay, ui.window.startDay + Number(length.dataset.len) - 1, 'start');
    });
    const syncPanel = () => { const collapsed = els['sp-panel'].classList.contains('collapsed'); if (els['sp-panel-open']) els['sp-panel-open'].hidden = !collapsed; root.firstElementChild?.classList.toggle('panel-collapsed', collapsed); if (ui.stage === 'map') requestDraw(); };
    els['sp-panel-toggle'].onclick = () => { els['sp-panel'].classList.add('collapsed'); syncPanel(); };
    els['sp-panel-open'].onclick = () => { els['sp-panel'].classList.remove('collapsed'); syncPanel(); };
    syncPanel();
    if (window.matchMedia('(max-width:900px)').matches) { els['sp-panel'].classList.add('collapsed'); syncPanel(); }
    els['sp-atlas-back'].onclick = () => setStage('map');
    document.getElementById('sp-enter').onclick = () => setStage('map');
    els['sp-thresholds'].onchange = (e) => {
      const f = e.target.closest('[data-limit]'); if (!f) return;
      const v = Number(f.value); if (!Number.isFinite(v) || v < 0) { renderThresholds(); return; }
      if (f.dataset.limit.startsWith('target')) ui.targets[{ targetSlopeDeg: 'slopeDeg', targetEarthPct: 'earthPct', targetWindowH: 'windowH', targetSunPct: 'sunPct' }[f.dataset.limit]] = v;
      else ui.limits[f.dataset.limit] = v;
      const ok = normalizeThresholds(ui.limits, ui.targets, ui.weights); ui.limits = ok.limits; ui.targets = ok.targets;
      refreshScenario(true); renderThresholds();
    };
    els['sp-refine'].onclick = () => {
      if (ui.cell && Number.isFinite(ui.cell.lat) && Number.isFinite(ui.cell.lon)) ui.pilotCenter = { centerLat: ui.cell.lat, centerLon: ui.cell.lon };
      ui.grid.scope = 'pilot';
      setWindow(ui.window.startDay, ui.window.endDay);
      buildGrid('pilot');
      centrePilot();
    };
    els['sp-restart'].onclick = () => buildGrid(ui.grid.scope);
    els['sp-scope'].onchange = (e) => {
      ui.grid.scope = e.target.value;
      if (e.target.value === 'pilot') { if (ui.cell && Number.isFinite(ui.cell.lat)) ui.pilotCenter = { centerLat: ui.cell.lat, centerLon: ui.cell.lon }; centrePilot(); }
      else centrePole();
      buildGrid(e.target.value);
    };
    els['sp-probe'].onclick = () => {
      const data = { groundM: NaN, slopeDeg: NaN, horizonDeg: null, stats: null };
      ui.cell = { row: -1, col: -1, lat: -74.9, lon: 0, xKm: 0, yKm: 0, cellKm: 2, static: data, class: classify(data, ui.limits, ui.targets, ui.weights) };
      openCell(ui.cell);
    };
    const pickCell = (e) => { const b = e.target.closest('[data-cell]'); if (!b) return; const [row, col] = b.dataset.cell.split('-').map(Number); const c = ui.grid.cells.find((x) => x.row === row && x.col === col); if (c) { ui.map.cxKm = c.xKm; ui.map.cyKm = c.yKm; selectMapPoint({ lat: c.lat, lon: c.lon, label: 'Screened block' }, c); } };
    els['sp-cards'].addEventListener('click', (e) => { const b = e.target.closest('[data-cards-tab]'); if (b) setCardsTab(b.dataset.cardsTab); });
    document.getElementById('sp-cardlist').onclick = pickCell;
    els['sp-compare'].addEventListener('click', (e) => { const b = e.target.closest('[data-remove]'); if (b) removeSlot(b.dataset.remove); });
    els['sp-pick-atlas'].onclick = () => { if (!ui.draft) return; ui.target = ui.draft; ui.popupCell = null; setStage('atlas'); };
    els['sp-map-wrap'].addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    els['sp-moon'].onclick = (e) => {
      const box = els['sp-moon'].getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width * els['sp-moon'].width, y = (e.clientY - box.top) / box.height * els['sp-moon'].height;
      let best = null, bd = 16;
      for (const site of ctx.sites()) {
        const sx = (((site.lon + 180) % 360 + 360) % 360) / 360 * els['sp-moon'].width, sy = (90 - site.lat) / 180 * els['sp-moon'].height;
        const d = Math.hypot(sx - x, sy - y);
        if (d < bd) { bd = d; best = site; }
      }
      if (best) { ui.selected = best.id; ctx.selectSite(best.id); renderAll(); }
      else if (y > els['sp-moon'].height * 0.68) { setTab('southpole'); }
    };
    els['sp-abc'].addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) assignMapSlot(b.dataset.slot); });
    document.querySelector('.pole-atlas-actions').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (b) assignAtlasSlot(b.dataset.slot); });
    window.addEventListener('message', (event) => {
      if (event.source !== els['sp-atlas'].contentWindow || event.data?.type !== 'lunalens:atlas-state') return;
      syncAtlasState(event.data);
    });
    bindMap();
  }

  function centrePole() { ui.map.cxKm = 0; ui.map.cyKm = 0; ui.map.scale = 2.8; drawMap(); }
  function centrePilot() { const p = project(ui.pilotCenter.centerLat, ui.pilotCenter.centerLon); ui.map.cxKm = p.xKm; ui.map.cyKm = p.yKm; ui.map.scale = 36; drawMap(); }
  function removeSlot(name) {
    ui.slots[name] = null;
    persistSlots(); renderSlots(); drawMap(); pushAtlasCommand();
  }

  function setNotice(text) { els['sp-hud'].textContent = text; if (ui.stage === 'map') els['sp-map-context'].textContent = text; }
  async function addPoint(lat, lon) {
    try {
      const id = await ctx.addPoint(lat, lon);
      ui.selected = id; ctx.selectSite(id);
      setNotice(t('Point at {pos} selected. Terrain: {state}.', { pos: fmtLatLon(lat, lon, 3), state: t(ctx.sites().find((s) => s.id === id)?.hasTerrain ? 'skyline available' : 'unknown') }));
      renderAll();
    } catch { setNotice(t('That point could not be added.')); }
  }

  async function activate() {
    build();
    ui.clockMs = ctx.landing() + ctx.previewHour() * HOUR;
    if (!ui.window.chosen) {
      els['sp-modal'].hidden = false;
      els['sp-mstay'].focus();
      return;
    }
    await ensureGlobe();
    setStage(ui.stage);
    if (ui.stage === 'map' && !ui.grid.cells.length) buildGrid(ui.grid.scope);
  }

  return {
    mount() { build(); },
    beginWindow,
    activate,
    onView(view) {
      if (view === 'pole') activate();
      else if (!els['sp-modal'].hidden && ui.window.backup) cancelWindow(false);
    },
    showStage(stage) {
      if (!['globe', 'map', 'atlas'].includes(stage)) return;
      ui.stage = stage;
      if (ui.built && ui.window.chosen && ctx.view() === 'pole') setStage(stage); else ctx.syncNav?.();
    },
    render() { if (ui.built && ctx.view() === 'pole') { renderAll(); refreshScenario(); } },
    relocalize() {
      if (!ui.built) return;
      localizeStatic();
      renderAll(); renderModalPicker(); renderGrid(); renderHud();
      if (!els['sp-popup'].hidden && ui.popupCell) openCell(ui.popupCell);
      measureDock();
      if (ui.stage === 'atlas') pushAtlasCommand();
      ui.globe?.request();
    },
    state: ui,
  };
}
