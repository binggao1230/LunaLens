// South Pole prototype: one tab with the existing 3D globe and a detailed 2D map, a pilot
// screening grid, and an Earth-link pulse. The native Expert views stay untouched.
import { t } from '../../i18n.js';
import { escapeHtml, fmtLatLon, fmtDateTime, fmtTime, isoDate } from '../../format.js';
import { createPolar3d } from '../polar3d/index.js';
import { computeHorizon } from '../../engine/dem.js';
import { project, unproject, STUDY_LAT, DEM_FOOTPRINT_LAT, REGION, cellCenters, gridGeometry, earthStats, classify, normalizeThresholds, DEFAULT_LIMITS, DEFAULT_TARGETS, DEFAULT_WEIGHTS, REASON_TEXT, R_KM } from '../../engine/grid.js';
import { STAY_CHOICES } from '../../engine/scenario.js';

const HOUR = 36e5;
const D2R = Math.PI / 180;
const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R)];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const COLORS = { link: '#43d98a', sun: '#f5c542', dark: '#7d7993', both: '#9be7ff' };
const STATUS = { green: '#7bdc8e', yellow: '#f5c542', red: '#e4635a', unknown: '#7d7993', pending: '#3a3f46' };
const globeLocal = { mode: '3d', picked: null };
export function createSouthPole(ctx) {
  const root = document.getElementById('v-pole');
  const ui = {
    built: false, mode: 'globe', selected: null, outside: null, notice: '',
    map: { scale: 8, cxKm: project(REGION.centerLat, REGION.centerLon).xKm, cyKm: project(REGION.centerLat, REGION.centerLon).yKm, dragging: null },
    grid: { level: null, cells: [], token: 0, done: false, startedMs: 0, ms: 0 },
    cell: null, limits: { ...DEFAULT_LIMITS }, targets: { ...DEFAULT_TARGETS }, weights: { ...DEFAULT_WEIGHTS },
    base: null, baseDem: null, detail: null, detailKey: '', globe: null, globeFailed: false, loadNotice: '',
  };
  const staticCache = new Map();
  const els = {};

  /* ---------- DOM ---------- */

  function build() {
    if (ui.built) return;
    ui.selected = ctx.selectedId() ?? null;
    root.innerHTML = `<div class="pole">
      <section class="card pole-head">
        <div class="cardhead"><div><h2>${escapeHtml(t('South Pole prototype'))}</h2>
          <p class="sub" style="margin:0">${escapeHtml(t('Globe overview and a detailed south-pole map. Study area: south of 85°S. The pilot grid screens terrain slope and Earth visibility for one selected touchdown and stay; it is not landing safety.'))}</p></div>
          <div class="pole-actions">
            <button type="button" class="btn-primary" id="sp-open">${escapeHtml(t('Open south-pole map'))}</button>
            <button type="button" class="btn-ghost" id="sp-back">${escapeHtml(t('Back to globe'))}</button>
            <button type="button" class="btn-ghost" id="sp-reset">${escapeHtml(t('Reset view'))}</button>
          </div></div>
        <p class="pole-notice" id="sp-notice" role="status" aria-live="polite"></p>
      </section>
      <div class="pole-body">
        <section class="pole-stage-wrap" id="sp-stage-wrap">
          <div class="pole-globe" data-p3d="m-stage" id="sp-globe">
            <canvas data-p3d="m-3d" id="sp-3d" tabindex="0" role="img" aria-label="${escapeHtml(t('Interactive 3D Moon with the south-pole study area'))}"></canvas>
            <div class="site-label" data-p3d="m-label" id="sp-label"></div>
            <div class="m-readout" data-p3d="m-readout" id="sp-readout"></div>
            <p class="pole-globe-hint">${escapeHtml(t('Drag the globe: the point follows the pointer. Scroll or pinch to zoom. Tap the Moon to open the map.'))}<br>${escapeHtml(t('Cyan line: 75°S terrain edge. Pink line: 85°S study boundary. Cyan dashed ring: Moon around Earth. Amber dashed ring: Earth around the Sun. Rings and distances are schematic.'))}</p>
          </div>
          <div class="pole-map-wrap" id="sp-map-wrap" hidden>
            <canvas id="sp-map" width="762" height="762" tabindex="0" role="img" aria-label="${escapeHtml(t('Detailed south-pole map with the screening grid'))}"></canvas>
            <div class="pole-map-tools"><button type="button" class="btn-ghost" id="sp-zin" aria-label="${escapeHtml(t('Zoom in'))}">+</button><button type="button" class="btn-ghost" id="sp-zout" aria-label="${escapeHtml(t('Zoom out'))}">−</button><button type="button" class="btn-ghost" id="sp-center">${escapeHtml(t('Centre on the pole'))}</button></div>
          </div>
        </section>
        <aside class="card pole-side">
          <h3>${escapeHtml(t('Study area'))}</h3>
          <p class="sub">${escapeHtml(t('Terrain-backed presets south of 85°S. Points outside the study area are absent here but stay in Mission and Explore.'))}</p>
          <div id="sp-sites"></div>
          <label class="pole-label">${escapeHtml(t('Map point'))}
            <span class="pole-point"><span id="sp-point">${escapeHtml(t('None selected'))}</span></span></label>
          <h3>${escapeHtml(t('Scenario'))}</h3>
          <label class="pole-label">${escapeHtml(t('Touchdown (UTC)'))}<input type="datetime-local" id="sp-touchdown" step="3600"></label>
          <div class="pole-thresholds">
            <label>${escapeHtml(t('Stay'))}<select id="sp-stay"></select></label>
            <label>${escapeHtml(t('Earth margin'))}<select id="sp-margin"><option value="2">2°</option><option value="5">5°</option></select></label>
          </div>
          <h3>${escapeHtml(t('Earth link at the preview time'))}</h3>
          <input type="range" id="sp-preview" min="0" max="1" step="1" value="0" aria-label="${escapeHtml(t('Preview hour in the stay'))}">
          <p class="pole-link" id="sp-link"></p>
          <h3>${escapeHtml(t('Pilot grid'))}</h3>
          <p class="sub" id="sp-geom"></p>
          <div class="pole-thresholds" id="sp-thresholds"></div>
          <div class="pole-grid-actions"><button type="button" class="btn-ghost btn-xs" id="sp-refine">${escapeHtml(t('Refine to 2 km cells'))}</button><button type="button" class="btn-ghost btn-xs" id="sp-restart">${escapeHtml(t('Restart grid'))}</button></div>
          <p class="pole-grid-actions"><button type="button" class="btn-ghost btn-xs" id="sp-probe">${escapeHtml(t('Test an unknown cell'))}</button></p>
          <p class="pole-progress" id="sp-progress" role="status" aria-live="polite"></p>
          <div class="pole-legend" id="sp-legend"></div>
          <h3>${escapeHtml(t('Top qualifying cells'))}</h3>
          <ol class="pole-list" id="sp-list"></ol>
          <div class="pole-detail" id="sp-cell"></div>
        </aside>
      </div>
      <p class="ex-note">${escapeHtml(t('Regional screening only. Cells are sampled at their centres on the 240 m LOLA raster; sub-cell terrain, landing hazards and radio performance are not modelled. Atlas long-term layers are not used in this native grid.'))}</p>
    </div>`;
    for (const id of ['sp-open', 'sp-back', 'sp-reset', 'sp-notice', 'sp-globe', 'sp-map-wrap', 'sp-map', 'sp-zin', 'sp-zout', 'sp-center', 'sp-sites', 'sp-point', 'sp-preview', 'sp-link', 'sp-geom', 'sp-thresholds', 'sp-refine', 'sp-restart', 'sp-progress', 'sp-legend', 'sp-list', 'sp-cell', 'sp-stage-wrap', 'sp-touchdown', 'sp-stay', 'sp-margin', 'sp-probe']) els[id] = document.getElementById(id);
    bind();
    ui.built = true;
  }

  /* ---------- selection ---------- */

  const selectedSite = () => ctx.sites().find((s) => s.id === ui.selected) ?? null;
  const studySites = () => ctx.sites().filter((s) => s.hasTerrain && s.lat <= STUDY_LAT);

  function select(id, fromGlobe = false) {
    ui.selected = id;
    ui.cell = null;
    if (fromGlobe && id) els['sp-open'].focus?.();
    renderAll();
  }

  function setNotice(text) { ui.notice = text; els['sp-notice'].textContent = text; }

  /* ---------- globe ---------- */

  async function ensureGlobe() {
    if (ui.globe || ui.globeFailed) return ui.globe;
    ui.globe = await createPolar3d({
      $: (id) => document.querySelector(`#v-pole [data-p3d="${id}"]`),
      view: () => 'mission', // the scene's own gate is replaced by `active`
      active: () => ui.built && ui.mode === 'globe' && ctx.view() === 'pole',
      local: globeLocal,
      sites: () => (selectedSite() ? [selectedSite()] : []),
      pickedSite: selectedSite,
      labelText: (site) => `${site.label ?? site.name} · ${fmtLatLon(site.lat, site.lon)}`,
      colorOf: (st) => (st?.sun && st?.link ? COLORS.both : st?.sun ? COLORS.sun : st?.link ? COLORS.link : COLORS.dark),
      refresh: () => {
        const picked = globeLocal.picked;
        if (picked && picked !== ui.selected) { ui.selected = picked; ctx.selectSite(picked); }
        renderAll();
      },
      ctx: { toast: ctx.toast },
      t, escapeHtml, fmtLatLon, unit, dot3, clamp, COLORS,
      getFrame: () => frameNow(),
      setFailed: (failed) => { ui.globeFailed = failed; if (failed) showMap(null, t('3D is not available on this device. The 2D map below stays usable.')); },
      controlsMode: 'grab',
      studyLat: STUDY_LAT,
      onMoonTap: (point) => openFromGlobe(point),
      pulse: () => pulseState(),
    });
    if (ui.globe) {
      ui.globe.request();
      ui.globe.reset();
    }
    return ui.globe;
  }

  function frameNow() {
    const eph = ctx.eph();
    const ms = ctx.landing() + ctx.previewHour() * HOUR;
    const index = clamp(eph.indexOf(ms), 0, eph.n - 1);
    const state = eph.stateAt(index);
    const status = new Map(ctx.sites().map((site) => {
      const series = site.series;
      return [site.id, { sun: series.sunVis[Math.round(index)] === 1, link: series.earthClr[Math.round(index)] > ctx.margin() }];
    }));
    return { ms, index, j: Math.round(index), sun: unit(state[1], state[0]), earth: unit(state[4], state[3]), earthLat: state[4], earthLon: state[3], sunLat: state[1], sunLon: state[0], sunDistKm: state[2], earthDistKm: state[5], status };
  }

  function pulseState() {
    const site = selectedSite();
    if (!site || !site.hasTerrain) return { state: 'unknown' };
    const eph = ctx.eph();
    const index = Math.round(eph.indexOf(ctx.landing() + ctx.previewHour() * HOUR));
    if (index < 0 || index >= eph.n) return { state: 'unknown' };
    return { state: site.series.earthVis[index] === 1 ? 'visible' : 'blocked' };
  }

  /* ---------- map ---------- */

  function shadeCanvas(heights, N, kmPerPx) {
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const cx = cv.getContext('2d'), img = cx.createImageData(N, N);
    const L = [-0.5, 0.55, 0.67];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x, h = heights[i];
        const o = i * 4;
        if (!Number.isFinite(h)) { img.data[o + 3] = 0; continue; }
        const hx = heights[y * N + Math.min(N - 1, x + 1)] - heights[y * N + Math.max(0, x - 1)];
        const hy = heights[Math.min(N - 1, y + 1) * N + x] - heights[Math.max(0, y - 1) * N + x];
        const nx = -(Number.isFinite(hx) ? hx : 0) / (2 * kmPerPx * 1000), ny = (Number.isFinite(hy) ? hy : 0) / (2 * kmPerPx * 1000);
        const nz = Math.hypot(nx, ny, 1);
        const light = clamp((nx * L[0] + ny * L[1] + L[2]) / nz, 0, 1);
        const tone = 42 + 150 * light;
        img.data[o] = tone * 0.95; img.data[o + 1] = tone * 0.93; img.data[o + 2] = tone * 0.9; img.data[o + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  async function ensureBase() {
    if (ui.base) return ui.base;
    const dem = await ctx.dem();
    const N = 512, halfKm = 2 * R_KM * Math.tan((90 + DEM_FOOTPRINT_LAT) * D2R / 2);
    const kmPerPx = (2 * halfKm) / N;
    const heights = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const xKm = (x + 0.5 - N / 2) * kmPerPx, yKm = (N / 2 - y - 0.5) * kmPerPx;
        const q = unproject(xKm, yKm);
        heights[y * N + x] = q.lat <= DEM_FOOTPRINT_LAT ? dem.height(q.lat * D2R, q.lon * D2R) : NaN;
      }
    }
    ui.base = { canvas: shadeCanvas(heights, N, kmPerPx), halfKm };
    ui.baseDem = dem;
    return ui.base;
  }

  /** Fine relief for the visible bounds and zoom. Cached by centre and scale; skipped while dragging. */
  function makeDetail() {
    const dem = ui.baseDem;
    if (!dem) return null;
    const N = 384, k = pxPerKm(), halfKm = 381 / k;
    const kmPerPx = (2 * halfKm) / N;
    const heights = new Float32Array(N * N);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const xKm = ui.map.cxKm - halfKm + (x + 0.5) * kmPerPx;
        const yKm = ui.map.cyKm + halfKm - (y + 0.5) * kmPerPx;
        const q = unproject(xKm, yKm);
        heights[y * N + x] = q.lat <= DEM_FOOTPRINT_LAT ? dem.height(q.lat * D2R, q.lon * D2R) : NaN;
      }
    }
    return shadeCanvas(heights, N, kmPerPx);
  }

  const pxPerKm = () => (1000 / 1200) * ui.map.scale;

  function screenOf(xKm, yKm) {
    const k = pxPerKm(), W = 762, H = 762;
    return [W / 2 + (xKm - ui.map.cxKm) * k, H / 2 - (yKm - ui.map.cyKm) * k];
  }
  function kmOf(sx, sy) {
    const k = pxPerKm();
    return [ui.map.cxKm + (sx - 381) / k, ui.map.cyKm - (sy - 381) / k];
  }

  async function drawMap() {
    if (!els['sp-map']) return;
    const cv = els['sp-map'], g = cv.getContext('2d'), W = 762, H = 762;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0f1113'; g.fillRect(0, 0, W, H);
    try {
      const base = await ensureBase();
      const k = pxPerKm();
      const size = base.halfKm * 2 * k;
      const [left, top] = screenOf(-base.halfKm, base.halfKm);
      g.imageSmoothingEnabled = true;
      g.drawImage(base.canvas, left, top, size, size);
      if (ui.map.scale >= 12 && !ui.map.dragging) {
        const key = `${ui.map.cxKm.toFixed(3)}|${ui.map.cyKm.toFixed(3)}|${ui.map.scale.toFixed(2)}`;
        if (key !== ui.detailKey) { ui.detailKey = key; ui.detail = makeDetail(); }
        if (ui.detail) { g.imageSmoothingEnabled = true; g.drawImage(ui.detail, 0, 0, W, H); }
      }
      // Study boundary 85°S and the raster edge 75°S.
      for (const [lat, color, dash] of [[STUDY_LAT, '#ff9ad5', [6, 5]], [DEM_FOOTPRINT_LAT, '#58c8ff', []]]) {
        const r = 2 * R_KM * Math.tan((90 + lat) * D2R / 2) * k;
        const [cx, cy] = screenOf(0, 0);
        g.beginPath(); g.setLineDash(dash); g.strokeStyle = color; g.lineWidth = 1.4; g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
    } catch (error) { ui.loadNotice = t('Terrain data could not be loaded; the map cannot draw relief.'); }
    // Grid cells
    for (const cell of ui.grid.cells) {
      const [x0, y0] = screenOf(cell.xKm - cell.cellKm / 2, cell.yKm + cell.cellKm / 2);
      const [x1, y1] = screenOf(cell.xKm + cell.cellKm / 2, cell.yKm - cell.cellKm / 2);
      const color = STATUS[cell.class?.status ?? 'pending'];
      g.globalAlpha = 0.42; g.fillStyle = color; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = 1;
      g.strokeStyle = ui.cell === cell ? '#ffffff' : 'rgba(255,255,255,.18)';
      g.lineWidth = ui.cell === cell ? 2 : 0.6;
      g.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(0, x1 - x0 - 1), Math.max(0, y1 - y0 - 1));
      if (cell.class?.status === 'unknown') {
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 0.7;
        for (let d = -Math.max(x1 - x0, y1 - y0); d < Math.max(x1 - x0, y1 - y0); d += 5) {
          g.beginPath(); g.moveTo(x0 + d, y0); g.lineTo(x0 + d + (y1 - y0), y1); g.stroke();
        }
      }
    }
    // Markers
    for (const site of studySites()) {
      const p = project(site.lat, site.lon), [x, y] = screenOf(p.xKm, p.yKm);
      g.beginPath(); g.arc(x, y, site.id === ui.selected ? 5.5 : 4, 0, Math.PI * 2);
      g.fillStyle = site.id === ui.selected ? '#ffffff' : '#9be7ff'; g.fill();
      g.strokeStyle = '#0f1113'; g.lineWidth = 1.5; g.stroke();
      if (site.id === ui.selected) { g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.stroke(); }
    }
    // Selection point outside the presets
    const site = selectedSite();
    if (site && !studySites().includes(site) && site.lat <= STUDY_LAT) {
      const p = project(site.lat, site.lon), [x, y] = screenOf(p.xKm, p.yKm);
      g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.stroke();
    }
  }

  function bindMap() {
    const cv = els['sp-map'];
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture?.(e.pointerId); ui.map.dragging = { x: e.clientX, y: e.clientY, moved: 0 }; });
    cv.addEventListener('pointermove', (e) => {
      if (!ui.map.dragging) return;
      const dx = e.clientX - ui.map.dragging.x, dy = e.clientY - ui.map.dragging.y;
      ui.map.dragging.x = e.clientX; ui.map.dragging.y = e.clientY;
      ui.map.dragging.moved += Math.hypot(dx, dy);
      const k = pxPerKm();
      ui.map.cxKm -= dx / k; ui.map.cyKm += dy / k;
      drawMap();
    });
    cv.addEventListener('pointerup', (e) => {
      const drag = ui.map.dragging; ui.map.dragging = null;
      if (!drag || drag.moved > 6) { drawMap(); return; }
      const box = cv.getBoundingClientRect();
      const sx = (e.clientX - box.left) / box.width * 762, sy = (e.clientY - box.top) / box.height * 762;
      const [xKm, yKm] = kmOf(sx, sy);
      const hit = ui.grid.cells.find((c) => Math.abs(xKm - c.xKm) <= c.cellKm / 2 && Math.abs(yKm - c.yKm) <= c.cellKm / 2);
      if (hit) { ui.cell = hit; renderDetail(); drawMap(); return; }
      const q = unproject(xKm, yKm);
      if (q.lat > STUDY_LAT) { setNotice(t('Outside the 85°S study area: no terrain screening. The map stays centred on the pole.')); centrePole(); return; }
      pickPoint(q.lat, q.lon);
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const box = cv.getBoundingClientRect();
      const sx = (e.clientX - box.left) / box.width * 762, sy = (e.clientY - box.top) / box.height * 762;
      const [bx, by] = kmOf(sx, sy);
      ui.map.scale = clamp(ui.map.scale * Math.exp(-e.deltaY * 0.0015), 1.5, 60);
      const [ax, ay] = kmOf(sx, sy);
      ui.map.cxKm += bx - ax; ui.map.cyKm += by - ay;
      drawMap();
      maybeRefine();
    }, { passive: false });
  }

  async function pickPoint(lat, lon) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setNotice(t('Adding a point at {pos}…', { pos: fmtLatLon(lat, lon, 3) }));
    try {
      const id = await ctx.addPoint(lat, lon);
      ui.selected = id;
      setNotice(t('Point at {pos} selected. Terrain status: {state}.', { pos: fmtLatLon(lat, lon, 3), state: t(ctx.sites().find((s) => s.id === id)?.hasTerrain ? 'terrain skyline available' : 'unknown, no usable skyline') }));
    } catch (error) { console.error(error); setNotice(t('That point could not be added.')); }
    renderAll();
  }

  function centrePole() {
    const p = project(-90, 0);
    ui.map.cxKm = p.xKm; ui.map.cyKm = p.yKm;
    drawMap();
  }

  /* ---------- grid ---------- */

  const scenarioKey = () => `${ctx.landing()}|${ctx.stayH()}|${ctx.margin()}`;

  function applyScenario(cell) {
    if (!cell.static) return { ...cell, class: { status: 'unknown', failed: ['no-data'], missed: [], score: null } };
    const stats = earthStats(ctx.eph(), cell.lat, cell.lon, cell.static.groundM, cell.static.horizon, {
      startIndex: Math.round(ctx.eph().indexOf(ctx.landing())), stayH: ctx.stayH(), marginDeg: ctx.margin(),
    });
    return { ...cell, stats, class: classify({ groundM: cell.static.groundM, slopeDeg: cell.static.slopeDeg, horizonDeg: cell.static.horizon, stats }, ui.limits, ui.targets, ui.weights) };
  }

  function refreshScenario(force = false) {
    if (!ui.grid.cells.length) return;
    const key = scenarioKey();
    if (!force && ui.grid.scenarioKey === key) return;
    ui.grid.scenarioKey = key;
    const t0 = performance.now();
    ui.grid.cells = ui.grid.cells.map(applyScenario);
    ui.grid.scenarioMs = performance.now() - t0;
    renderGrid();
    drawMap();
  }

  async function buildGrid(level = 'coarse') {
    const token = ++ui.grid.token;
    const n = level === 'fine' ? REGION.fineCells : REGION.coarseCells;
    ui.grid = { level, cells: cellCenters(n).map((c) => ({ ...c, class: { status: 'pending' } })), token, done: false, startedMs: performance.now(), ms: 0, scenarioKey: scenarioKey() };
    ui.cell = null;
    renderGrid();
    const dem = await ctx.dem();
    const step = (idx) => {
      if (token !== ui.grid.token) return;
      if (idx >= ui.grid.cells.length) {
        ui.grid.done = true; ui.grid.ms = performance.now() - ui.grid.startedMs;
        renderGrid(); drawMap();
        if (ui.grid.level === 'coarse' && ui.map.scale >= 18) setTimeout(() => { if (token === ui.grid.token) buildGrid('fine'); }, 50);
        return;
      }
      const c = ui.grid.cells[idx];
      const key = `${n}:${c.row}:${c.col}`;
      let st = staticCache.get(key);
      if (!st) {
        const ground = dem.height(c.lat * D2R, c.lon * D2R);
        if (!Number.isFinite(ground)) st = { groundM: NaN, slopeDeg: NaN, horizon: null };
        else {
          const r = dem.slopeDeg(c.lat * D2R, c.lon * D2R);
          st = { groundM: ground, slopeDeg: r, horizon: null, pending: true };
          staticCache.set(key, st);
          // Horizon is the expensive part; compute it on the next tick so a click can land first.
          ui.grid.cells[idx] = { ...c, class: { status: 'pending' } };
          renderProgress();
          setTimeout(() => {
            if (token !== ui.grid.token) return;
            const h = computeHorizonLocal(dem, c.lat, c.lon);
            st.horizon = h?.horizon ?? null; st.groundM = h?.groundM ?? ground; st.slopeDeg = h?.slopeDeg ?? r; st.pending = false;
            if (token === ui.grid.token) {
              ui.grid.cells[idx] = applyScenario({ ...c, static: st });
              renderProgress(); drawMap();
              step(idx + 1);
            }
          }, 0);
          return;
        }
        staticCache.set(key, st);
      }
      ui.grid.cells[idx] = applyScenario({ ...c, static: { ...st, horizon: st.horizon } });
      renderProgress(); drawMap();
      setTimeout(() => step(idx + 1), 0);
    };
    step(0);
  }

  // Import is static in the module; this keeps the call site short.
  function computeHorizonLocal(dem, lat, lon) {
    return computeHorizon(dem, lat, lon, { minRangeM: 480 });
  }

  function maybeRefine() {
    if (ui.map.scale >= 18 && ui.grid.level !== 'fine' && !ui.grid.done) return;
    if (ui.map.scale >= 18 && ui.grid.level !== 'fine') buildGrid('fine');
  }

  /* ---------- rendering ---------- */

  function renderAll() {
    if (!ui.built) return;
    els['sp-globe'].hidden = ui.mode !== 'globe';
    els['sp-map-wrap'].hidden = ui.mode !== 'map';
    els['sp-open'].hidden = ui.mode === 'map';
    els['sp-back'].hidden = ui.mode !== 'map';
    if (ui.mode === 'map') drawMap();
    else ui.globe?.request();
    renderSites(); renderLink(); renderGrid(); renderDetail(); renderPreviewRange(); renderScenarioInputs();
  }

  function renderScenarioInputs() {
    if (!els['sp-touchdown']) return;
    els['sp-touchdown'].value = new Date(ctx.landing()).toISOString().slice(0, 16);
    els['sp-stay'].innerHTML = STAY_CHOICES.map((s) => `<option value="${s.key}"${ctx.stayKey() === s.key ? ' selected' : ''}>${escapeHtml(t(s.label))}</option>`).join('');
    els['sp-margin'].value = String(ctx.margin());
  }

  function renderSites() {
    const list = studySites();
    els['sp-sites'].innerHTML = list.map((s) => `<button type="button" class="pole-site${s.id === ui.selected ? ' sel' : ''}" data-site="${escapeHtml(s.id)}"><b>${escapeHtml(t(s.name))}</b><span>${escapeHtml(fmtLatLon(s.lat, s.lon, 2))} · ${escapeHtml(s.terrain)}</span></button>`).join('')
      + (list.length ? '' : `<p class="sub">${escapeHtml(t('No terrain-backed preset is south of 85°S.'))}</p>`);
    const site = selectedSite();
    els['sp-point'].textContent = site ? `${fmtLatLon(site.lat, site.lon, 3)} · ${t(site.hasTerrain ? 'terrain skyline' : 'unknown terrain')}` : t('None selected');
  }

  function renderPreviewRange() {
    const range = els['sp-preview'];
    range.max = String(ctx.stayH());
    range.value = String(clamp(ctx.previewHour(), 0, ctx.stayH()));
  }

  function renderLink() {
    const site = selectedSite();
    const st = site ? pulseState().state : 'unknown';
    const when = fmtDateTime(ctx.landing() + ctx.previewHour() * HOUR);
    const text = st === 'visible' ? t('Visible from the site across the local skyline.') : st === 'blocked' ? t('Blocked at this sample: Earth is below the terrain horizon.') : t('Unknown: no usable skyline for this point.');
    els['sp-link'].innerHTML = `<b class="pole-${st}">${escapeHtml(t(st === 'visible' ? 'Visible' : st === 'blocked' ? 'Blocked' : 'Unknown'))}</b> · ${escapeHtml(when)}<br><span class="sub">${escapeHtml(text)} ${escapeHtml(t('Geometric line of sight; the selected {margin}° link margin is a separate condition.', { margin: ctx.margin() }))}</span>`;
  }

  function renderGrid() {
    const n = ui.grid.level === 'fine' ? 8 : 4;
    const g = gridGeometry(n);
    els['sp-geom'].textContent = t('{cells} × {cells} cells, {km} km each, {w} × {h} km around {centre}. Native raster {res} m; values are cell-centre samples.', {
      cells: n, km: g.cellKm, w: g.boundsKm.xMax - g.boundsKm.xMin, h: g.boundsKm.yMax - g.boundsKm.yMin,
      centre: fmtLatLon(REGION.centerLat, REGION.centerLon, 1), res: g.demResM,
    });
    els['sp-legend'].innerHTML = ['green', 'yellow', 'red', 'unknown'].map((s) =>
      `<span><i class="pole-sw" style="background:${STATUS[s]}"></i>${escapeHtml(t(s === 'green' ? 'all limits and targets met' : s === 'yellow' ? 'limits met, target missed' : s === 'red' ? 'hard limit failed' : 'unknown or not computed'))}</span>`).join('')
      + `<span class="sub">${escapeHtml(t('Grey hatching: no evaluated terrain, never red.'))}</span>`;
    renderProgress();
    renderThresholds();
    renderList();
  }

  function renderProgress() {
    const cells = ui.grid.cells;
    const done = cells.filter((c) => c.class?.status && c.class.status !== 'pending').length;
    const count = (s) => cells.filter((c) => c.class?.status === s).length;
    const status = cells.length ? t('{level} grid: {done}/{total} cells evaluated ({green} green, {yellow} yellow, {red} red, {unknown} unknown). Geometry built in {ms} ms; scenario recompute {s} ms.', {
      level: t(ui.grid.level === 'fine' ? 'fine' : 'coarse'), done, total: cells.length,
      green: count('green'), yellow: count('yellow'), red: count('red'), unknown: count('unknown'),
      ms: Math.round(ui.grid.ms || (performance.now() - ui.grid.startedMs)), s: Math.round(ui.grid.scenarioMs ?? 0),
    }) : t('Grid not started.');
    els['sp-progress'].textContent = status;
    els['sp-progress'].dataset.done = String(ui.grid.done);
  }

  function renderThresholds() {
    const field = (name, label, value, step = 1) => `<label>${escapeHtml(label)}<input type="number" min="0" step="${step}" value="${value}" data-limit="${name}"></label>`;
    els['sp-thresholds'].innerHTML = `<p class="sub">${escapeHtml(t('Hard limits (red) and preference targets (yellow). A failed limit never scores.'))}</p>`
      + field('maxSlopeDeg', t('Slope limit (°)'), ui.limits.maxSlopeDeg)
      + field('minEarthPct', t('Earth visibility limit (%)'), ui.limits.minEarthPct)
      + field('minWindowH', t('Window limit (h)'), ui.limits.minWindowH)
      + field('targetSlopeDeg', t('Slope target (°)'), ui.targets.slopeDeg)
      + field('targetEarthPct', t('Visibility target (%)'), ui.targets.earthPct)
      + field('targetWindowH', t('Window target (h)'), ui.targets.windowH);
  }

  function renderList() {
    const rank = ui.grid.cells.filter((c) => c.class?.score != null).sort((a, b) => b.class.score - a.class.score).slice(0, 6);
    els['sp-list'].innerHTML = rank.length ? rank.map((c) => `<li><button type="button" class="pole-cell-btn" data-cell="${c.row}-${c.col}">
      <span>${fmtLatLon(c.lat, c.lon, 2)}</span>
      <b>${c.class.score}</b>
      <span>${Math.round(c.stats.earthPct)}% · ${c.stats.longestH} h · ${c.static.slopeDeg.toFixed(1)}°</span></button></li>`).join('')
      : `<li class="sub">${escapeHtml(t('No qualifying cell yet.'))}</li>`;
  }

  function renderDetail() {
    const c = ui.cell;
    if (!c) { els['sp-cell'].innerHTML = `<p class="sub">${escapeHtml(t('Select a cell to see its metrics.'))}</p>`; return; }
    const cl = c.class ?? { status: 'pending' };
    const reason = (cl.failed ?? []).concat(cl.missed ?? []).map((r) => REASON_TEXT[r] ?? r);
    els['sp-cell'].innerHTML = `<h3>${escapeHtml(c.row < 0 ? t('Probe cell') : t('Cell {row}:{col}', { row: c.row + 1, col: c.col + 1 }))} · ${escapeHtml(t(cl.status ?? 'pending'))}</h3>
      <p class="sub">${escapeHtml(fmtLatLon(c.lat, c.lon, 3))} · ${escapeHtml(t('estimated from the {res} m raster', { res: 240 }))}</p>
      <div class="pole-metrics">
        <div><b>${c.static && Number.isFinite(c.static.slopeDeg) ? c.static.slopeDeg.toFixed(1) + '°' : '—'}</b><span>${escapeHtml(t('regional slope'))}</span></div>
        <div><b>${c.stats ? Math.round(c.stats.earthPct) + '%' : '—'}</b><span>${escapeHtml(t('Earth visibility'))}</span></div>
        <div><b>${c.stats ? c.stats.longestH + ' h' : '—'}</b><span>${escapeHtml(t('longest continuous window'))}</span></div>
        <div><b>${c.static && Number.isFinite(c.static.groundM) ? Math.round(c.static.groundM) + ' m' : '—'}</b><span>${escapeHtml(t('ground height'))}</span></div>
      </div>
      <p class="sub">${escapeHtml(reason.length ? t('Rules: {rules}.', { rules: reason.join('; ') }) : t('All hard limits and preference targets met.'))}</p>
      ${cl.status === 'unknown' ? '' : `<button type="button" class="btn-primary btn-xs" id="sp-usecell">${escapeHtml(t('Use this cell as a candidate'))}</button>`}`;
  }

  /* ---------- events ---------- */

  function bind() {
    els['sp-open'].onclick = () => showMap(null);
    els['sp-back'].onclick = () => { ui.mode = 'globe'; renderAll(); ui.globe?.request(); };
    els['sp-reset'].onclick = () => { ui.globe?.reset(); };
    els['sp-zin'].onclick = () => { ui.map.scale = clamp(ui.map.scale * 1.5, 1.5, 60); drawMap(); maybeRefine(); };
    els['sp-zout'].onclick = () => { ui.map.scale = clamp(ui.map.scale / 1.5, 1.5, 60); drawMap(); };
    els['sp-center'].onclick = centrePole;
    els['sp-sites'].onclick = (e) => {
      const b = e.target.closest('[data-site]'); if (!b) return;
      ctx.selectSite(b.dataset.site);
      select(b.dataset.site);
      setNotice(t('Selected {name}.', { name: t(ctx.sites().find((s) => s.id === b.dataset.site)?.name ?? '') }));
    };
    els['sp-preview'].oninput = (e) => { ctx.setPreviewHour(Number(e.target.value)); renderLink(); ui.globe?.request(); };
    els['sp-touchdown'].onchange = (e) => {
      const ms = Date.parse(`${e.target.value}Z`);
      if (Number.isFinite(ms)) ctx.setTouchdown(ms);
    };
    els['sp-stay'].onchange = (e) => ctx.setStay(e.target.value);
    els['sp-margin'].onchange = (e) => ctx.setMargin(Number(e.target.value));
    els['sp-probe'].onclick = () => {
      const data = { groundM: NaN, slopeDeg: NaN, horizonDeg: null, stats: null };
      ui.cell = { row: -1, col: -1, lat: -74.9, lon: 0, xKm: 0, yKm: 0, cellKm: 2, static: data, class: classify(data, ui.limits, ui.targets, ui.weights) };
      renderDetail();
      setNotice(t('Probe at 74.9°S, 0°E: outside the LOLA raster. Shown as unknown, never red and never recommended.'));
    };
    els['sp-thresholds'].onchange = (e) => {
      const f = e.target.closest('[data-limit]'); if (!f) return;
      const v = Number(f.value);
      if (!Number.isFinite(v) || v < 0) { renderThresholds(); return; }
      if (f.dataset.limit.startsWith('target')) ui.targets[{ targetSlopeDeg: 'slopeDeg', targetEarthPct: 'earthPct', targetWindowH: 'windowH' }[f.dataset.limit]] = v;
      else ui.limits[f.dataset.limit] = v;
      const ok = normalizeThresholds(ui.limits, ui.targets, ui.weights);
      ui.limits = ok.limits; ui.targets = ok.targets;
      refreshScenario(true);
      renderThresholds();
    };
    els['sp-refine'].onclick = () => buildGrid('fine');
    els['sp-restart'].onclick = () => buildGrid(ui.grid.level ?? 'coarse');
    els['sp-list'].onclick = (e) => {
      const b = e.target.closest('[data-cell]'); if (!b) return;
      const [row, col] = b.dataset.cell.split('-').map(Number);
      const cell = ui.grid.cells.find((c) => c.row === row && c.col === col); if (!cell) return;
      ui.cell = cell; renderDetail(); drawMap();
      ui.map.cxKm = cell.xKm; ui.map.cyKm = cell.yKm; drawMap();
    };
    els['sp-cell'].onclick = (e) => {
      if (!e.target.closest('#sp-usecell') || !ui.cell) return;
      pickPoint(ui.cell.lat, ui.cell.lon);
    };
    bindMap();
  }

  function showMap(point, notice = '') {
    ui.mode = 'map';
    if (notice) setNotice(notice);
    if (point) {
      const p = project(point.lat, point.lon);
      ui.map.cxKm = p.xKm; ui.map.cyKm = p.yKm;
      ui.map.scale = Math.max(ui.map.scale, 10);
    } else if (ui.map.scale < 18) ui.map.scale = 36;
    renderAll();
    if (!ui.grid.cells.length) buildGrid('coarse');
    els['sp-map'].focus?.();
  }

  function openFromGlobe(point) {
    if (!Number.isFinite(point?.lat)) return;
    if (point.lat > STUDY_LAT) {
      showMap({ lat: -90, lon: 0 }, t('The tapped point {pos} is north of the 85°S study area. The map is centred on the south pole and that point is not a candidate.', { pos: fmtLatLon(point.lat, point.lon, 1) }));
    } else {
      showMap(point, t('Opened the map at {pos}. Tap a site or a grid cell, or tap the map to add a candidate point.', { pos: fmtLatLon(point.lat, point.lon, 2) }));
    }
  }

  /* ---------- lifecycle ---------- */

  async function activate() {
    build();
    if (ui.mode === 'globe') { await ensureGlobe(); ui.globe?.request(); }
    else { renderAll(); if (!ui.grid.cells.length) buildGrid('coarse'); }
    renderAll();
  }

  function onView(view) {
    if (view !== 'pole') return;
    activate();
  }

  return {
    mount() { build(); },
    activate,
    onView,
    render() { if (ui.built && ctx.view() === 'pole') { renderAll(); refreshScenario(); } },
    refreshScenario: () => refreshScenario(true),
    state: ui,
  };
}
