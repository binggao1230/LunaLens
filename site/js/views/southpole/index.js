// South Pole prototype: one full-screen stage with three ordered views.
// Globe -> 2D map (South Pole blocks / Whole Moon) -> Atlas for the chosen cell.
// The search window is chosen in a dialog, then kept in a persistent bottom bar.
import { t } from '../../i18n.js';
import { escapeHtml, fmtLatLon, fmtDateTime, fmtTime, isoDate } from '../../format.js';
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
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  crosshair: '<circle cx="12" cy="12" r="6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;
const globeLocal = { mode: '3d', picked: null };

export function createSouthPole(ctx) {
  const root = document.getElementById('v-pole');
  const ui = {
    built: false, stage: 'globe', tab: 'southpole', selected: null,
    window: { startDay: 0, endDay: 0, chosen: false, collapsed: false },
    map: { scale: 8, cxKm: 0, cyKm: 0, dragging: null, opened: false, detail: null, detailKey: '' },
    grid: { scope: 'pole', cells: [], token: 0, done: false, startedMs: 0, ms: 0, scenarioMs: 0 },
    pilotCenter: { centerLat: REGION.centerLat, centerLon: REGION.centerLon },
    rangeHandle: null,
    cell: null, popupCell: null,
    slots: { A: null, B: null, C: null }, target: null,
    limits: { ...DEFAULT_LIMITS }, targets: { ...DEFAULT_TARGETS }, weights: { ...DEFAULT_WEIGHTS },
    globe: null, globeFailed: false, atlasSrc: '', atlasKey: '', atlasRev: 0, atlasReady: false, moonReady: false, syncingSliders: false,
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
  const metricsKey = () => `${scenarioKey()}|${JSON.stringify(ui.limits)}|${JSON.stringify(ui.targets)}`;
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

  function yearMarks(latest) {
    const y0 = new Date(eph().t0).getUTCFullYear(), y1 = new Date(dayMs(latest)).getUTCFullYear();
    const values = [];
    for (let y = y0; y <= y1; y++) {
      const day = (Date.UTC(y, 0, 1) - eph().t0) / DAY;
      if (day >= 0 && day <= latest) values.push(day / Math.max(1, latest) * 100);
    }
    return values.length ? values : [0];
  }

  function pipsFor(latest) {
    return { mode: 'positions', values: yearMarks(latest), density: 1, format: { to: (v) => String(new Date(dayMs(v)).getUTCFullYear()), from: (v) => Number(v) } };
  }

  function initWindowSlider(host) {
    if (!host || !window.noUiSlider) return null;
    if (host.noUiSlider) return host.noUiSlider;
    const latest = Math.max(1, latestDay());
    window.noUiSlider.create(host, {
      start: [clamp(ui.window.startDay, 0, latest), clamp(ui.window.endDay, 0, latest)],
      connect: true, step: 1, limit: MAX_WINDOW_DAYS - 1,
      range: { min: 0, max: latest },
      pips: pipsFor(latest),
    });
    host.dataset.max = String(latest);
    host.noUiSlider.on('update', (vals) => {
      if (ui.syncingSliders) return;
      setWindow(Number(vals[0]), Number(vals[1]), 'both', host);
    });
    return host.noUiSlider;
  }

  function syncSliders(source) {
    const latest = Math.max(1, latestDay());
    for (const host of [els['sp-range2'], els['sp-mslider']]) {
      const slider = initWindowSlider(host);
      if (!slider) continue;
      if (host.dataset.max !== String(latest)) {
        host.dataset.max = String(latest);
        slider.updateOptions({ range: { min: 0, max: latest }, limit: MAX_WINDOW_DAYS - 1, pips: pipsFor(latest) }, false);
      }
      if (host !== source) {
        ui.syncingSliders = true;
        slider.set([ui.window.startDay, ui.window.endDay], false);
        ui.syncingSliders = false;
      }
    }
  }

  function syncWindowInputs(source = null) {
    const latest = Math.max(0, latestDay());
    const start = dayMs(ui.window.startDay), end = dayMs(ui.window.endDay);
    const days = ui.window.endDay - ui.window.startDay + 1;
    const text = t('{days} days selected · stay {stay} h · latest complete touchdown {cutoff}.', {
      days, stay: ctx.stayH(), cutoff: fmtDateTime(eph().tEnd - ctx.stayH() * HOUR),
    });
    for (const id of ['sp-windowinfo', 'sp-mwindowinfo']) if (els[id]) els[id].textContent = text;
    if (els['sp-window-count']) els['sp-window-count'].textContent = t('{days} / {max} days', { days, max: MAX_WINDOW_DAYS });
    if (els['sp-windowhud']) els['sp-windowhud'].textContent = t('{days} days in the search window', { days }) + ` · ${ctx.stayH()} h`;
    if (els['sp-win-start']) els['sp-win-start'].textContent = isoDate(start);
    if (els['sp-win-end']) els['sp-win-end'].textContent = isoDate(end);
    if (els['sp-mstart']) els['sp-mstart'].value = isoDate(start);
    if (els['sp-mend']) els['sp-mend'].value = isoDate(end);
    if (els['sp-window-now']) {
      const now = ctx.landing();
      els['sp-window-now'].hidden = !ui.window.chosen;
      els['sp-window-now'].style.left = `${latest ? clamp(dayOf(now) / latest * 100, 0, 100) : 0}%`;
      els['sp-window-now'].title = fmtDateTime(now);
    }
    syncSliders(source);
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
    const ms = dayMs(ui.window.startDay);
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
    const from = els['sp-mstart']?.value;
    const through = els['sp-mend']?.value;
    let startDay = ui.window.startDay, endDay = ui.window.endDay;
    if (from && through) {
      const s = dayOf(Date.parse(`${from}T00:00:00Z`));
      const e = dayOf(Date.parse(`${through}T00:00:00Z`));
      if (Number.isFinite(s) && Number.isFinite(e)) { startDay = s; endDay = e; }
    }
    setWindow(startDay, endDay);
    ui.window.chosen = true;
    els['sp-modal'].hidden = true;
    ui.window.collapsed = false;
    els['sp-windowbar'].hidden = false;
    els['sp-window-show'].hidden = true;
    refreshScenario(true);
    ensureGlobe().then(() => setStage('globe'));
    renderAll();
  }

  function openWindowEditor() {
    syncWindowInputs();
    els['sp-modal'].hidden = false;
    if (els['sp-mcancel']) els['sp-mcancel'].hidden = !ui.window.chosen;
  }

  /* ---------- DOM ---------- */

  function build() {
    if (ui.built) return;
    ui.selected = ctx.selectedId() ?? null;
    root.innerHTML = `<div class="pole" data-stage="globe">
      <div class="pole-stage" id="sp-stage">
        <div class="pole-globe" data-p3d="m-stage" id="sp-globe">
          <canvas data-p3d="m-3d" id="sp-3d" tabindex="0" role="img" aria-label="${escapeHtml(t('3D Moon; the south polar cap is selectable'))}"></canvas>
          <div class="site-label" data-p3d="m-label" id="sp-label"></div>
          <div class="m-readout" data-p3d="m-readout" id="sp-readout"></div>
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
        </div>
        <div class="pole-map-wrap" id="sp-map-wrap" hidden>
          <div class="pole-tabs seg" role="tablist">
            <button type="button" data-tab="southpole" class="on" role="tab">${escapeHtml(t('South Pole · blocks'))}</button>
            <button type="button" data-tab="moon" role="tab">${escapeHtml(t('Whole Moon'))}</button>
          </div>
          <div class="pole-map-native" id="sp-native">
            <canvas id="sp-map" width="762" height="762" tabindex="0" role="img" aria-label="${escapeHtml(t('South-pole blocks with screening colours'))}"></canvas>
            <div class="pole-map-rail">
              <div class="pole-abc" id="sp-abc" role="group" aria-label="${escapeHtml(t('Selected points A/B/C'))}">
                <button type="button" data-slot="A" style="--slot:#58c8ff" aria-label="${escapeHtml(t('Save or focus point {name}', { name: 'A' }))}">A</button>
                <button type="button" data-slot="B" style="--slot:#f5c542" aria-label="${escapeHtml(t('Save or focus point {name}', { name: 'B' }))}">B</button>
                <button type="button" data-slot="C" style="--slot:#ff9ad5" aria-label="${escapeHtml(t('Save or focus point {name}', { name: 'C' }))}">C</button>
              </div>
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

      <div class="pole-hud">
        <nav class="pole-stages" aria-label="${escapeHtml(t('Stages'))}">
          <button type="button" data-stage="globe">1 · ${escapeHtml(t('Globe'))}</button>
          <button type="button" data-stage="map">2 · ${escapeHtml(t('Map'))}</button>
          <button type="button" data-stage="atlas">3 · ${escapeHtml(t('Atlas'))}</button>
        </nav>
        <div class="pole-hud-row"><p id="sp-hud"></p></div>
        <p id="sp-windowhud" class="sub"></p>
      </div>

      <aside class="pole-side" id="sp-panel">
        <div class="pole-side-head">
          <h3>${escapeHtml(t('Study area'))}</h3>
          <button type="button" class="pole-min" id="sp-panel-toggle" aria-label="${escapeHtml(t('Minimize panel'))}" title="${escapeHtml(t('Minimize panel'))}">${icon('close')}</button>
        </div>
        <div id="sp-sites"></div>
        <label class="pole-label">${escapeHtml(t('Map point'))}<span class="pole-point" id="sp-point">${escapeHtml(t('None selected'))}</span></label>
        <h3>${escapeHtml(t('Selected points A/B/C'))}</h3>
        <div id="sp-slots"></div>
        <div id="sp-compare"></div>
        <h3>${escapeHtml(t('Earth link at the selected hour'))}</h3>
        <input type="range" id="sp-preview" min="0" max="1" step="1" value="0" aria-label="${escapeHtml(t('Preview hour in the stay'))}">
        <p class="pole-link" id="sp-link"></p>
        <h3>${escapeHtml(t('Screening grid'))}</h3>
        <p class="sub" id="sp-geom"></p>
        <label class="pole-label">${escapeHtml(t('Grid scope'))}<select id="sp-scope"><option value="pole">${escapeHtml(t('South pole · 24 km blocks'))}</option><option value="pilot">${escapeHtml(t('Pilot · 2 km cells'))}</option></select></label>
        <div class="pole-thresholds" id="sp-thresholds"></div>
        <div class="pole-grid-actions"><button type="button" class="btn-ghost btn-xs" id="sp-refine">${escapeHtml(t('Refine to 2 km cells'))}</button><button type="button" class="btn-ghost btn-xs" id="sp-restart">${escapeHtml(t('Restart grid'))}</button><button type="button" class="btn-ghost btn-xs" id="sp-probe">${escapeHtml(t('Test an unknown cell'))}</button></div>
        <p class="pole-progress" id="sp-progress" role="status" aria-live="polite"></p>
        <div class="pole-legend" id="sp-legend"></div>
        <h3>${escapeHtml(t('Top qualifying cells'))}</h3>
        <ol class="pole-list" id="sp-list"></ol>
        <div class="pole-detail" id="sp-cell"></div>
      </aside>

      <div class="pole-windowbar" id="sp-windowbar" hidden>
        <div class="pole-window-head">
          <span class="pole-window-title">${escapeHtml(t('Search window'))}</span>
          <span class="pole-window-count" id="sp-window-count"></span>
          <span class="pole-window-dates"><b id="sp-win-start"></b><span class="arrow">→</span><b id="sp-win-end"></b></span>
          <label class="pole-window-stay">${escapeHtml(t('Stay'))}<select id="sp-stay"></select></label>
          <button type="button" class="pole-window-edit" id="sp-window-edit">${escapeHtml(t('Edit search window'))}</button>
          <button type="button" class="pole-window-close" id="sp-window-hide" aria-label="${escapeHtml(t('Minimize the window bar'))}" title="${escapeHtml(t('Minimize the window bar'))}">–</button>
        </div>
        <div class="pole-window-track">
          <div class="pole-window-slider" id="sp-range2"></div>
          <span class="pole-window-now" id="sp-window-now" hidden></span>
        </div>
        <p id="sp-windowinfo"></p>
      </div>
      <button type="button" class="pole-restore" id="sp-window-show" hidden>${escapeHtml(t('Search window'))} <span>▲</span></button>
      <button type="button" class="pole-panel-open" id="sp-panel-open" hidden aria-label="${escapeHtml(t('Show the study panel'))}" title="${escapeHtml(t('Show the study panel'))}">${icon('panel')}</button>

      <div class="pole-modal" id="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-mtitle" hidden>
        <div class="pole-modal-card">
          <h2 id="sp-mtitle">${escapeHtml(t('Choose the search window'))}</h2>
          <p class="sub">${escapeHtml(t('Pick the period to screen: the first and last UTC days are the first and last touchdown samples. Every block is screened at its best touchdown inside this period, one sample per UTC day.'))}</p>
          <p class="sub">${escapeHtml(t('Windows are limited to {max} days (about half a year).', { max: MAX_WINDOW_DAYS }))}</p>
          <div class="pole-window-slider pole-modal-slider" id="sp-mslider"></div>
          <label>${escapeHtml(t('Stay'))}<select id="sp-mstay"></select></label>
          <div class="pole-modal-dates">
            <label>${escapeHtml(t('Search from (UTC)'))}<input id="sp-mstart" type="date"></label>
            <label>${escapeHtml(t('Search through (UTC)'))}<input id="sp-mend" type="date"></label>
          </div>
          <p id="sp-mwindowinfo" class="sub"></p>
          <div class="pole-modal-actions"><button type="button" class="btn-ghost" id="sp-mcancel" hidden>${escapeHtml(t('Cancel'))}</button><button type="button" class="btn-primary" id="sp-confirm">${escapeHtml(t('Use this window'))}</button></div>
        </div>
      </div>

      <div class="pole-atlas-pick" id="sp-atlas-pick" hidden>
        <p class="sr-only" id="sp-target" aria-live="polite"></p>
        <button type="button" class="pole-atlas-nav" id="sp-atlas-back" aria-label="${escapeHtml(t('Back to the map'))}" title="${escapeHtml(t('Back to the map'))}">${icon('back')}</button>
        <div class="pole-atlas-actions">
          <button type="button" data-slot="A">A</button>
          <button type="button" data-slot="B">B</button>
          <button type="button" data-slot="C">C</button>
        </div>
      </div>

      <div class="pole-popup" id="sp-popup" hidden>
        <div class="pole-popup-card" id="sp-popup-card"></div>
      </div>
    </div>`;
    for (const id of ['sp-stage', 'sp-globe', 'sp-map-wrap', 'sp-native', 'sp-map', 'sp-moon', 'sp-atlas', 'sp-hud', 'sp-windowhud', 'sp-panel', 'sp-panel-toggle', 'sp-sites', 'sp-point', 'sp-preview', 'sp-link', 'sp-geom', 'sp-scope', 'sp-thresholds', 'sp-refine', 'sp-restart', 'sp-probe', 'sp-progress', 'sp-legend', 'sp-list', 'sp-cell', 'sp-start', 'sp-end', 'sp-stay', 'sp-windowinfo', 'sp-windowbar', 'sp-range2', 'sp-window-now', 'sp-abc', 'sp-modal', 'sp-mstay', 'sp-mslider', 'sp-mwindowinfo', 'sp-confirm', 'sp-mcancel', 'sp-mstart', 'sp-mend', 'sp-popup', 'sp-popup-card', 'sp-panel-open', 'sp-window-hide', 'sp-window-show', 'sp-win-start', 'sp-win-end', 'sp-window-count', 'sp-window-edit', 'sp-atlas-back', 'sp-gzin', 'sp-gzout', 'sp-pause', 'sp-zin', 'sp-zout', 'sp-center', 'sp-slots', 'sp-compare', 'sp-atlas-pick', 'sp-target', 'sp-back-map']) els[id] = document.getElementById(id);
    bind();
    initWindow();
    restoreSlots();
    const site = selectedSite();
    if (site && !ui.target) ui.target = { lat: site.lat, lon: site.lon, label: site.name ?? site.label ?? t('Selected point') };
    renderStaySelects();
    els['sp-modal'].hidden = false;
    els['sp-windowbar'].hidden = true;
    ui.built = true;
  }

  function renderStaySelects() {
    const options = STAY_CHOICES.map((s) => `<option value="${s.key}"${ctx.stayKey() === s.key ? ' selected' : ''}>${escapeHtml(t(s.label))}</option>`).join('');
    for (const id of ['sp-stay', 'sp-mstay']) if (els[id]) els[id].innerHTML = options;
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
        if (now - lastClockRender > 250) { lastClockRender = now; renderLink(); renderHud(); }
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

  function shadeCanvas(heights, N, kmPerPx) {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const cx = cv.getContext('2d'), img = cx.createImageData(N, N);
    const L = [-0.5, 0.55, 0.67];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x, h = heights[i], o = i * 4;
        if (!Number.isFinite(h)) { img.data[o + 3] = 0; continue; }
        const hx = heights[y * N + Math.min(N - 1, x + 1)] - heights[y * N + Math.max(0, x - 1)];
        const hy = heights[Math.min(N - 1, y + 1) * N + x] - heights[Math.max(0, y - 1) * N + x];
        const nx = -(Number.isFinite(hx) ? hx : 0) / (2 * kmPerPx * 1000), ny = (Number.isFinite(hy) ? hy : 0) / (2 * kmPerPx * 1000);
        const nz = Math.hypot(nx, ny, 1), light = clamp((nx * L[0] + ny * L[1] + L[2]) / nz, 0, 1), tone = 42 + 150 * light;
        img.data[o] = tone * 0.95; img.data[o + 1] = tone * 0.93; img.data[o + 2] = tone * 0.9; img.data[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  async function ensureBase() {
    if (base.canvas) return base;
    const dem = await ctx.dem();
    const N = 512, halfKm = 2 * R_KM * Math.tan((90 + DEM_FOOTPRINT_LAT) * D2R / 2), kmPerPx = (2 * halfKm) / N;
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
    const N = 384, k = pxPerKm(), halfKm = 381 / k, kmPerPx = (2 * halfKm) / N, heights = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const xKm = ui.map.cxKm - halfKm + (x + 0.5) * kmPerPx, yKm = ui.map.cyKm + halfKm - (y + 0.5) * kmPerPx, q = unproject(xKm, yKm);
      heights[y * N + x] = q.lat <= DEM_FOOTPRINT_LAT ? base.dem.height(q.lat * D2R, q.lon * D2R) : NaN;
    }
    return shadeCanvas(heights, N, kmPerPx);
  }

  async function drawMap() {
    const cv = els['sp-map']; if (!cv) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, 762, 762); g.fillStyle = '#0f1113'; g.fillRect(0, 0, 762, 762);
    try {
      const b = await ensureBase(), k = pxPerKm(), size = b.halfKm * 2 * k, [left, top] = screenOf(-b.halfKm, b.halfKm);
      g.drawImage(b.canvas, left, top, size, size);
      if (ui.map.scale >= 12 && !ui.map.dragging) {
        const key = `${ui.map.cxKm.toFixed(3)}|${ui.map.cyKm.toFixed(3)}|${ui.map.scale.toFixed(2)}`;
        if (key !== ui.map.detailKey) { ui.map.detailKey = key; ui.map.detail = makeDetail(); }
        if (ui.map.detail) g.drawImage(ui.map.detail, 0, 0, 762, 762);
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
      g.globalAlpha = 0.45; g.fillStyle = STATUS[cell.class?.status ?? 'pending']; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = 1;
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
    const slotColors = { A: '#58c8ff', B: '#f5c542', C: '#ff9ad5' };
    for (const [name, slot] of Object.entries(ui.slots)) {
      if (!slot) continue;
      const p = project(slot.lat, slot.lon), [x, y] = screenOf(p.xKm, p.yKm);
      g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fillStyle = slotColors[name]; g.fill();
      g.strokeStyle = '#0f1113'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText(name, x + 9, y + 4);
    }
  }

  function bindMap() {
    const cv = els['sp-map'];
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); ui.map.dragging = { x: e.clientX, y: e.clientY, moved: 0 }; });
    cv.addEventListener('pointermove', (e) => {
      if (!ui.map.dragging) return;
      const dx = e.clientX - ui.map.dragging.x, dy = e.clientY - ui.map.dragging.y;
      ui.map.dragging.x = e.clientX; ui.map.dragging.y = e.clientY; ui.map.dragging.moved += Math.hypot(dx, dy);
      const k = pxPerKm(); ui.map.cxKm -= dx / k; ui.map.cyKm += dy / k; drawMap();
    });
    cv.addEventListener('pointerup', (e) => {
      const drag = ui.map.dragging; ui.map.dragging = null;
      if (!drag || drag.moved > 6) { drawMap(); return; }
      const box = cv.getBoundingClientRect();
      const sx = (e.clientX - box.left) / box.width * 762, sy = (e.clientY - box.top) / box.height * 762;
      const [xKm, yKm] = kmOf(sx, sy);
      const hit = ui.grid.cells.find((c) => Math.abs(xKm - c.xKm) <= c.cellKm / 2 && Math.abs(yKm - c.yKm) <= c.cellKm / 2);
      if (hit) { ui.cell = hit; openCell(hit); return; }
      const q = unproject(xKm, yKm);
      if (q.lat > STUDY_LAT) { setNotice(t('Outside the 85°S study area: no screening. The map stays on the pole.')); centrePole(); return; }
      openAtlasAt(q.lat, q.lon);
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const box = cv.getBoundingClientRect(), sx = (e.clientX - box.left) / box.width * 762, sy = (e.clientY - box.top) / box.height * 762;
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
    const best = screenCellWindow(eph(), { lat: cell.lat, lon: cell.lon, groundM: cell.static.groundM, slopeDeg: cell.static.slopeDeg, horizonDeg: cell.static.horizon }, windowScenario(), ui.limits, ui.targets, ui.weights);
    if (!best) return { ...cell, stats: null, class: { status: 'unknown', failed: ['no-data'], missed: [], score: null } };
    return { ...cell, stats: best.stats, class: best.class, touchdownMs: eph().timeOf(best.startIndex) };
  }

  function refreshScenario(force = false) {
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
    renderProgress();
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
      const c = ui.grid.cells[idx], key = `${scope}:${c.cellKm}:${c.row}:${c.col}`;
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
            if (token === ui.grid.token) { ui.grid.cells[idx] = applyScenario({ ...c, static: st }); renderProgress(); drawMap(); step(idx + 1); }
          }, 0);
          return;
        }
        staticCache.set(key, st);
      }
      ui.grid.cells[idx] = applyScenario({ ...c, static: { ...st } });
      renderProgress(); drawMap();
      setTimeout(() => step(idx + 1), 0);
    };
    step(0);
  }

  /* ---------- cell popup and Atlas ---------- */

  function openCell(cell) {
    ui.popupCell = cell;
    const cl = cell.class ?? { status: 'pending' };
    const reason = (cl.failed ?? []).concat(cl.missed ?? []).map((r) => REASON_TEXT[r] ?? r);
    els['sp-popup-card'].innerHTML = `<h3>${escapeHtml(t('Block {row}:{col}', { row: cell.row + 1, col: cell.col + 1 }))} · ${escapeHtml(t(cl.status ?? 'pending'))}</h3>
      <p class="sub">${escapeHtml(fmtLatLon(cell.lat, cell.lon, 3))}</p>
      <div class="pole-metrics">
        <div><b>${cell.static && Number.isFinite(cell.static.slopeDeg) ? cell.static.slopeDeg.toFixed(1) + '°' : '—'}</b><span>${escapeHtml(t('regional slope'))}</span></div>
        <div><b>${cell.stats ? Math.round(cell.stats.sunPct) + '%' : '—'}</b><span>${escapeHtml(t('sunlight over the stay'))}</span></div>
        <div><b>${cell.stats ? Math.round(cell.stats.earthPct) + '%' : '—'}</b><span>${escapeHtml(t('Earth visibility over the stay'))}</span></div>
        <div><b>${cell.stats ? cell.stats.longestH + ' h' : '—'}</b><span>${escapeHtml(t('longest continuous Earth link'))}</span></div>
        <div><b>${cl.score ?? '—'}</b><span>${escapeHtml(t('screening score'))}</span></div>
      </div>
      <p class="sub">${cell.touchdownMs ? escapeHtml(t('Best touchdown in the window: {time}.', { time: fmtDateTime(cell.touchdownMs) })) : ''}</p>
      <p class="sub">${escapeHtml(reason.length ? t('Rules: {rules}.', { rules: reason.join('; ') }) : t('All hard limits and preference targets met.'))}</p>
      <div class="pole-popup-actions"><button type="button" class="btn-primary" id="sp-enter-atlas">${escapeHtml(t('Enter Atlas'))}</button><button type="button" class="btn-ghost" id="sp-close-popup">${escapeHtml(t('Close'))}</button></div>`;
    els['sp-popup'].hidden = false;
    document.getElementById('sp-enter-atlas').onclick = () => { els['sp-popup'].hidden = true; enterAtlas(cell); };
    document.getElementById('sp-close-popup').onclick = () => { els['sp-popup'].hidden = true; };
  }

  function atlasTarget() {
    const q = new URLSearchParams();
    const slots = Object.entries(ui.slots).filter(([, s]) => s).map(([name, s]) => ({ ...s, name }));
    const tgt = ui.target;
    const sites = slots.slice(0, 3);
    if (sites.length < 3 && tgt && !slots.some((s) => sameSpot(s, tgt))) sites.push({ ...tgt, name: t('Selected point') });
    for (const s of sites) q.append('s', `${s.lat.toFixed(4)},${(((s.lon + 180) % 360 + 360) % 360 - 180).toFixed(4)},${s.name}`);
    q.set('t', `${new Date(ctx.landing()).toISOString().slice(0, 16)}Z`);
    const key = q.toString();
    return { key, url: `atlas/index.html?sp=${++ui.atlasRev}#${key}` };
  }

  function syncAtlas() {
    const { key, url } = atlasTarget();
    if (key !== ui.atlasKey) { ui.atlasKey = key; ui.atlasReady = false; els['sp-atlas'].src = url; }
  }

  function enterAtlas(cell) {
    ui.popupCell = cell;
    if (cell) ui.target = { lat: cell.lat, lon: cell.lon, label: t('Screened block') };
    setStage('atlas');
  }

  function openAtlasAt(lat, lon, label = t('Map point')) {
    ui.target = { lat, lon, label };
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
    try {
      const st = await ensureSlotStatic(slot);
      if (!st) { slot.metrics = null; slot.metricsKey = metricsKey(); renderSlots(); return; }
      const best = screenCellWindow(eph(), { lat: slot.lat, lon: slot.lon, groundM: st.groundM, slopeDeg: st.slopeDeg, horizonDeg: st.horizon }, windowScenario(), ui.limits, ui.targets, ui.weights);
      slot.metrics = best?.stats ? { earthPct: best.stats.earthPct, longestH: best.stats.longestH, sunPct: best.stats.sunPct, slopeDeg: st.slopeDeg } : null;
      slot.metricsKey = metricsKey();
    } catch { slot.metrics = null; }
    renderSlots(); drawMap();
  }

  function refreshSlots() {
    const key = metricsKey();
    for (const name of ['A', 'B', 'C']) {
      const slot = ui.slots[name];
      if (!slot) continue;
      if (slot.metricsKey === key && slot.metrics) continue;
      measureSlot(slot);
    }
  }

  function mapSlotPoint() {
    if (ui.cell) return { lat: ui.cell.lat, lon: ui.cell.lon, label: t('Screened block') };
    if (ui.target) return { ...ui.target };
    const site = selectedSite();
    return site ? { lat: site.lat, lon: site.lon, label: site.name ?? site.label ?? t('Selected point') } : null;
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
    for (const b of els['sp-abc'].querySelectorAll('[data-slot]')) {
      const name = b.dataset.slot, slot = ui.slots[name];
      b.classList.toggle('filled', Boolean(slot));
      b.title = slot ? `${name} · ${fmtLatLon(slot.lat, slot.lon, 3)}` : t('Save or focus point {name}', { name });
      b.setAttribute('aria-pressed', slot ? 'true' : 'false');
    }
  }

  function focusSlot(name) {
    const slot = ui.slots[name]; if (!slot) return;
    const p = project(slot.lat, slot.lon);
    ui.target = { lat: slot.lat, lon: slot.lon, label: t('Point {name}', { name }) };
    ui.map.cxKm = p.xKm; ui.map.cyKm = p.yKm; drawMap();
    pushAtlasCommand();
    setNotice(t('Point {name}: {pos}.', { name, pos: fmtLatLon(slot.lat, slot.lon, 3) }));
  }

  function assignMapSlot(name) {
    if (ui.slots[name]) { focusSlot(name); return; }
    const point = mapSlotPoint();
    if (!point) { setNotice(t('Select a block or site first.')); return; }
    ui.target = point;
    saveSlot(name);
  }

  function syncAtlasState(state) {
    const sites = (Array.isArray(state?.sites) ? state.sites : [])
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)).slice(0, 3);
    const names = ['A', 'B', 'C'];
    const next = { A: null, B: null, C: null };
    const free = [...names];
    const ignored = new Set([t('Selected point'), t('Atlas point'), t('Screened block'), 'Selected point', '已选点']);
    for (const site of sites) {
      const label = String(site.label ?? '').trim();
      if (!names.includes(label) && ignored.has(label)) continue;
      let name = names.includes(label) ? label : free[0];
      if (!name) break;
      const prev = Object.values(ui.slots).find((slot) => slot && sameSpot(slot, site));
      next[name] = prev ?? { lat: site.lat, lon: site.lon, label: label || t('Atlas point'), metrics: null };
      if (!next[name].metrics) measureSlot(next[name]);
      free.splice(free.indexOf(name), 1);
    }
    ui.slots = next;
    if (state?.active && Number.isFinite(state.active.lat) && Number.isFinite(state.active.lon)) {
      ui.target = { lat: state.active.lat, lon: state.active.lon, label: state.active.label || t('Atlas point') };
      if (els['sp-target']) els['sp-target'].textContent = `${ui.target.label} · ${fmtLatLon(ui.target.lat, ui.target.lon, 3)}`;
    }
    if (Number.isFinite(state?.tMs)) {
      const ms = clamp(state.tMs, eph().t0, eph().tEnd - ctx.stayH() * HOUR);
      if (Math.abs(ms - ctx.landing()) > 60e3) ctx.setTouchdown(ms);
    }
    renderSlots();
    drawMap();
    if (!ui.atlasReady) {
      ui.atlasReady = true;
      setTimeout(pushAtlasCommand, 120);
    }
  }

  function renderAtlasSlots() {
    for (const b of document.querySelectorAll('.pole-atlas-actions [data-slot]')) {
      const used = Boolean(ui.slots[b.dataset.slot]);
      b.disabled = used; b.textContent = used ? `${b.dataset.slot} ✓` : b.dataset.slot;
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
    const sites = Object.entries(ui.slots).filter(([, slot]) => slot).map(([name, slot]) => ({ lat: slot.lat, lon: slot.lon, label: name }));
    const active = ui.target ? { lat: ui.target.lat, lon: ui.target.lon } : null;
    win.postMessage({ type: 'lunalens:atlas-command', sites, active, tMs: clockMs() }, location.origin);
  }

  function saveSlot(name) {
    if (!ui.target) return;
    const existing = Object.values(ui.slots).find((s) => sameSpot(s, ui.target));
    if (existing) { setNotice(t('That point is already saved.')); return; }
    ui.slots[name] = { ...ui.target, metrics: null };
    measureSlot(ui.slots[name]);
    renderSlots();
    renderAbc();
    renderAtlasSlots();
    persistSlots();
    pushAtlasCommand();
    setNotice(t('Saved point {name}: {pos}.', { name, pos: fmtLatLon(ui.target.lat, ui.target.lon, 3) }));
  }

  function renderSlots() {
    const names = ['A', 'B', 'C'];
    const colors = { A: '#58c8ff', B: '#f5c542', C: '#ff9ad5' };
    els['sp-slots'].innerHTML = names.map((n) => {
      const s = ui.slots[n];
      if (!s) return `<p class="sub" style="margin:2px 0">${n} · ${escapeHtml(t('empty'))}</p>`;
      const m = s.metrics;
      return `<div class="pole-slot"><b style="color:${colors[n]}">${n}</b><span>${escapeHtml(fmtLatLon(s.lat, s.lon, 2))}</span><span>${m ? `${Math.round(m.earthPct)}% · ${m.longestH} h` : escapeHtml(t('measuring…'))}</span><button type="button" class="btn-ghost btn-xs" data-remove="${n}" aria-label="${escapeHtml(t('Remove {name}', { name: n }))}">×</button></div>`;
    }).join('');
    const filled = names.map((n) => [n, ui.slots[n]]).filter(([, s]) => s && s.metrics);
    if (filled.length >= 2) {
      els['sp-compare'].innerHTML = `<p class="sub">${escapeHtml(t('Screening values use the selected stay; Atlas shows 60-day windows.'))}</p><table class="pole-cmp"><thead><tr><th></th>${filled.map(([n]) => `<th style="color:${colors[n]}">${n}</th>`).join('')}</tr></thead><tbody>
        <tr><th>${escapeHtml(t('Earth visibility'))}</th>${filled.map(([, s]) => `<td>${Math.round(s.metrics.earthPct)}%</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Longest link'))}</th>${filled.map(([, s]) => `<td>${s.metrics.longestH} h</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Sunlight'))}</th>${filled.map(([, s]) => `<td>${Math.round(s.metrics.sunPct)}%</td>`).join('')}</tr>
        <tr><th>${escapeHtml(t('Slope'))}</th>${filled.map(([, s]) => `<td>${s.metrics.slopeDeg.toFixed(1)}°</td>`).join('')}</tr></tbody></table>`;
    } else {
      els['sp-compare'].innerHTML = `<p class="sub">${escapeHtml(t('Save at least two points to compare them.'))}</p>`;
    }
    renderAbc();
    renderAtlasSlots();
  }

  /* ---------- render ---------- */

  function setStage(stage) {
    ui.stage = stage;
    if (root.firstElementChild) root.firstElementChild.dataset.stage = stage;
    els['sp-globe'].hidden = stage !== 'globe';
    els['sp-map-wrap'].hidden = stage !== 'map';
    els['sp-atlas'].hidden = stage !== 'atlas';
    els['sp-panel'].hidden = stage === 'atlas';
    els['sp-atlas-pick'].hidden = stage !== 'atlas';
    const atlas = stage === 'atlas';
    els['sp-hud'].hidden = atlas;
    els['sp-windowhud'].hidden = atlas;
    if (atlas) {
      els['sp-windowbar'].hidden = true;
      els['sp-window-show'].hidden = true;
    } else if (ui.window.chosen) {
      els['sp-windowbar'].hidden = ui.window.collapsed;
      els['sp-window-show'].hidden = !ui.window.collapsed;
    }
    if (atlas) {
      const tgt = ui.target;
      els['sp-target'].textContent = tgt ? `${t(tgt.label)} · ${fmtLatLon(tgt.lat, tgt.lon, 3)} · ${fmtDateTime(clockMs())}` : '';
      for (const b of document.querySelectorAll('.pole-atlas-actions [data-slot]')) {
        const used = Boolean(ui.slots[b.dataset.slot]);
        b.disabled = used;
        b.textContent = used ? `${b.dataset.slot} ✓` : b.dataset.slot;
      }
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
    else if (stage === 'atlas') syncAtlas(ui.popupCell ?? ui.cell);
    for (const b of document.querySelectorAll('.pole-stages [data-stage]')) b.classList.toggle('on', b.dataset.stage === stage);
    renderHud();
  }

  function setTab(tab) {
    ui.tab = tab;
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
  }

  function renderAll() {
    if (!ui.built) return;
    renderStaySelects(); syncWindowInputs(); renderSites(); renderLink(); renderGrid(); renderDetail(); renderPreviewRange(); renderHud(); renderSlots();
    if (ui.stage === 'map') { if (ui.tab === 'moon') drawMoon(); else drawMap(); }
    if (ui.stage === 'atlas') syncAtlas(ui.popupCell ?? ui.cell);
  }

  function renderSites() {
    els['sp-sites'].innerHTML = studySites().map((s) => `<button type="button" class="pole-site${s.id === ui.selected ? ' sel' : ''}" data-site="${escapeHtml(s.id)}"><b>${escapeHtml(t(s.name))}</b><span>${escapeHtml(fmtLatLon(s.lat, s.lon, 2))} · ${escapeHtml(s.terrain)}</span></button>`).join('');
    const site = selectedSite();
    els['sp-point'].textContent = site ? fmtLatLon(site.lat, site.lon, 3) : t('None selected');
    els['sp-preview'].max = String(ctx.stayH());
    els['sp-preview'].value = String(clamp(ctx.previewHour(), 0, ctx.stayH()));
  }

  function renderPreviewRange() {
    els['sp-preview'].max = String(ctx.stayH());
    els['sp-preview'].value = String(clamp(ctx.previewHour(), 0, ctx.stayH()));
  }

  function renderLink() {
    const site = selectedSite(), st = site ? pulseState().state : 'unknown';
    const text = st === 'visible' ? t('Visible from the site across the local skyline.') : st === 'blocked' ? t('Blocked at this sample: Earth is below the terrain horizon.') : t('Unknown: no usable skyline for this point.');
    const duration = site?.hasTerrain ? longestLink(site) : null;
    els['sp-link'].innerHTML = `<b class="pole-${st}">${escapeHtml(t(st === 'visible' ? 'Visible' : st === 'blocked' ? 'Blocked' : 'Unknown'))}</b> · ${escapeHtml(fmtDateTime(clockMs()))}<br><span class="sub">${escapeHtml(text)}${duration ? ' ' + escapeHtml(t('Longest continuous link in this stay: {h} h.', { h: duration })) : ''} ${escapeHtml(t('Geometric line of sight; the {margin}° margin is separate.', { margin: ctx.margin() }))}</span>`;
  }

  function longestLink(site) {
    const i0 = Math.round(eph().indexOf(ctx.landing())), stay = ctx.stayH();
    let run = 0, best = 0;
    for (let h = 0; h < stay; h++) { const i = i0 + h; if (i < 0 || i >= eph().n) break; if (site.series.earthVis[i] === 1) { run++; best = Math.max(best, run); } else run = 0; }
    return best || null;
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
    els['sp-legend'].innerHTML = ['green', 'yellow', 'red', 'unknown'].map((s) => `<span><i class="pole-sw" style="background:${STATUS[s]}"></i>${escapeHtml(t(s === 'green' ? 'all limits and targets met' : s === 'yellow' ? 'limits met, target missed' : s === 'red' ? 'hard limit failed' : 'unknown or not computed'))}</span>`).join('');
    renderProgress(); renderThresholds(); renderList();
  }

  function renderProgress() {
    const cells = ui.grid.cells;
    const done = cells.filter((c) => c.class?.status && c.class.status !== 'pending').length;
    const count = (s) => cells.filter((c) => c.class?.status === s).length;
    els['sp-progress'].textContent = cells.length ? t('{level}: {done}/{total} blocks ({green} green, {yellow} yellow, {red} red, {unknown} unknown). Built in {ms} ms; scenario {s} ms.', {
      level: t(ui.grid.scope === 'pole' ? 'South pole blocks' : 'Pilot cells'), done, total: cells.length,
      green: count('green'), yellow: count('yellow'), red: count('red'), unknown: count('unknown'),
      ms: Math.round(ui.grid.ms || (performance.now() - ui.grid.startedMs)), s: Math.round(ui.grid.scenarioMs ?? 0),
    }) : t('Grid not started.');
  }

  function renderThresholds() {
    const field = (name, label, value) => `<label>${escapeHtml(label)}<input type="number" min="0" step="1" value="${value}" data-limit="${name}"></label>`;
    els['sp-thresholds'].innerHTML = `<p class="sub">${escapeHtml(t('Hard limits (red) and targets (yellow). A failed limit never scores.'))}</p>`
      + field('maxSlopeDeg', t('Slope limit (°)'), ui.limits.maxSlopeDeg)
      + field('minEarthPct', t('Earth visibility limit (%)'), ui.limits.minEarthPct)
      + field('minWindowH', t('Link window limit (h)'), ui.limits.minWindowH)
      + field('targetSlopeDeg', t('Slope target (°)'), ui.targets.slopeDeg)
      + field('targetEarthPct', t('Visibility target (%)'), ui.targets.earthPct)
      + field('targetWindowH', t('Link window target (h)'), ui.targets.windowH)
      + field('targetSunPct', t('Sunlight target (%)'), ui.targets.sunPct);
  }

  function renderList() {
    const rank = ui.grid.cells.filter((c) => c.class?.score != null).sort((a, b) => b.class.score - a.class.score).slice(0, 6);
    els['sp-list'].innerHTML = rank.length ? rank.map((c) => `<li><button type="button" class="pole-cell-btn" data-cell="${c.row}-${c.col}"><span>${fmtLatLon(c.lat, c.lon, 2)}</span><b>${c.class.score}</b><span>${Math.round(c.stats.sunPct)}% sun · ${Math.round(c.stats.earthPct)}% Earth · ${c.static.slopeDeg.toFixed(1)}°</span></button></li>`).join('') : `<li class="sub">${escapeHtml(t('No qualifying cell yet.'))}</li>`;
  }

  function renderDetail() {
    const c = ui.cell;
    if (!c) { els['sp-cell'].innerHTML = `<p class="sub">${escapeHtml(t('Select a block on the map for details.'))}</p>`; return; }
    const cl = c.class ?? { status: 'pending' };
    els['sp-cell'].innerHTML = `<h3>${escapeHtml(t('Block {row}:{col}', { row: c.row + 1, col: c.col + 1 }))} · ${escapeHtml(t(cl.status ?? 'pending'))}</h3>
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
      const site = selectedSite(); if (site) ui.target = { lat: site.lat, lon: site.lon, label: site.name ?? site.label ?? t('Selected point') };
      renderAll();
    };
    els['sp-preview'].oninput = (e) => { const h = Number(e.target.value); ctx.setPreviewHour(h); ui.clockMs = ctx.landing() + h * HOUR; renderLink(); renderHud(); ui.globe?.request(); };
    for (const id of ['sp-stay', 'sp-mstay']) els[id].onchange = (e) => { ctx.setStay(e.target.value); renderStaySelects(); setWindow(ui.window.startDay, ui.window.endDay); };
    els['sp-confirm'].onclick = confirmWindow;
    els['sp-window-edit'].onclick = openWindowEditor;
    els['sp-mcancel'].onclick = () => { if (ui.window.chosen) els['sp-modal'].hidden = true; };
    const applyModalDates = () => {
      const from = els['sp-mstart']?.value, through = els['sp-mend']?.value;
      if (!from || !through) return;
      const startDay = dayOf(Date.parse(`${from}T00:00:00Z`)), endDay = dayOf(Date.parse(`${through}T00:00:00Z`));
      if (Number.isFinite(startDay) && Number.isFinite(endDay)) setWindow(startDay, endDay);
    };
    els['sp-mstart'].onchange = applyModalDates;
    els['sp-mend'].onchange = applyModalDates;
    const syncPanel = () => { const collapsed = els['sp-panel'].classList.contains('collapsed'); if (els['sp-panel-open']) els['sp-panel-open'].hidden = !collapsed; };
    els['sp-panel-toggle'].onclick = () => { els['sp-panel'].classList.add('collapsed'); syncPanel(); };
    els['sp-panel-open'].onclick = () => { els['sp-panel'].classList.remove('collapsed'); syncPanel(); };
    syncPanel();
    if (window.matchMedia('(max-width:900px)').matches) { els['sp-panel'].classList.add('collapsed'); syncPanel(); }
    els['sp-window-hide'].onclick = () => { ui.window.collapsed = true; els['sp-windowbar'].hidden = true; els['sp-window-show'].hidden = false; };
    els['sp-window-show'].onclick = () => { ui.window.collapsed = false; els['sp-windowbar'].hidden = false; els['sp-window-show'].hidden = true; };
    els['sp-atlas-back'].onclick = () => setStage('map');
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
    els['sp-list'].onclick = (e) => { const b = e.target.closest('[data-cell]'); if (!b) return; const [row, col] = b.dataset.cell.split('-').map(Number); const c = ui.grid.cells.find((x) => x.row === row && x.col === col); if (c) { ui.cell = c; openCell(c); ui.map.cxKm = c.xKm; ui.map.cyKm = c.yKm; drawMap(); } };
    els['sp-map-wrap'].addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    document.querySelector('.pole-stages').addEventListener('click', (e) => { const b = e.target.closest('[data-stage]'); if (b) setStage(b.dataset.stage); });
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
    els['sp-slots'].addEventListener('click', (e) => {
      const b = e.target.closest('[data-remove]'); if (!b) return;
      ui.slots[b.dataset.remove] = null;
      persistSlots(); renderSlots(); drawMap(); pushAtlasCommand();
    });
    bindMap();
  }

  function centrePole() { ui.map.cxKm = 0; ui.map.cyKm = 0; ui.map.scale = 2.8; drawMap(); }
  function centrePilot() { const p = project(ui.pilotCenter.centerLat, ui.pilotCenter.centerLon); ui.map.cxKm = p.xKm; ui.map.cyKm = p.yKm; ui.map.scale = 36; drawMap(); }
  function setNotice(text) { els['sp-hud'].textContent = text; }
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
    if (!ui.window.chosen) { els['sp-modal'].hidden = false; return; }
    await ensureGlobe();
    setStage(ui.stage);
    if (ui.stage === 'map' && !ui.grid.cells.length) buildGrid(ui.grid.scope);
  }

  return {
    mount() { build(); },
    activate,
    onView(view) { if (view === 'pole') activate(); },
    render() { if (ui.built && ctx.view() === 'pole') { renderAll(); refreshScenario(); } },
    state: ui,
  };
}
