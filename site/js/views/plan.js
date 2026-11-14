// Plan: the mission page with the Atlas map as its main window. The map is one of ours — the layer
// rasters are the Atlas page's files (PGDA illumination, LOLA height and slope) drawn on a canvas —
// and the panels around it are built from this site's engine, so the page shares the scenario with
// Mission, Explore and Compare. Panel structure follows the skysolver pattern: a map, then a stack
// of collapsible panels (Site, Sky, Windows, Assumptions).

import { escapeHtml } from '../format.js';

const SIZE = 2048;
const TINT = 1024;
const R_KM = 1737.4;
const HALF_KM = 304;
const BASE = 'atlas/data';

const LAYERS = [
  { id: 'sun_now', label: 'Sun now', sub: 'Light and shadow at the selected time' },
  { id: 'sun_avg', label: 'Avg sunlight', sub: 'Share of time the Sun is visible', file: 'layers/sun_avg.png', scale: 'sun' },
  { id: 'earth_avg', label: 'Avg Earth view', sub: 'Share of time Earth is visible', file: 'layers/earth_avg.png', scale: 'sun' },
  { id: 'psr', label: 'Shadow', sub: 'Ground that never sees the Sun', file: 'layers/psr.png', scale: 'psr' },
  { id: 'height', label: 'Height', sub: 'Relief of the polar cap', file: 'terrain/sp_dem_L0.png', scale: 'height' },
  { id: 'slope', label: 'Slope', sub: 'How steep the ground is', file: 'terrain/sp_slope_L0.png', scale: 'slope' },
];

const RAMPS = {
  sun: [[0, [12, 10, 16]], [0.35, [124, 74, 16]], [0.7, [226, 158, 44]], [1, [255, 236, 180]]],
  earth: [[0, [6, 12, 22]], [0.35, [22, 74, 128]], [0.7, [64, 156, 232]], [1, [190, 232, 255]]],
  slope: [[0, [24, 60, 40]], [0.4, [72, 132, 70]], [0.7, [214, 168, 62]], [1, [176, 58, 46]]],
  mask: [[0, [5, 7, 10]], [1, [110, 182, 255]]],
};

const kmOf = (lat, lon) => {
  const r = 2 * R_KM * Math.tan(((90 + lat) * Math.PI) / 360);
  const a = (lon * Math.PI) / 180;
  return [r * Math.sin(a), r * Math.cos(a)];
};
const latLonOf = (x, y) => {
  const r = Math.hypot(x, y);
  const lat = (2 * Math.atan(r / (2 * R_KM)) * 180) / Math.PI - 90;
  let lon = (Math.atan2(x, y) * 180) / Math.PI;
  if (lon < 0) lon += 360;
  return [lat, lon];
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function ramp(stops, v) {
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i], [t0, c0] = stops[i - 1];
    if (v <= t1) {
      const f = t1 === t0 ? 0 : (v - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * f, c0[1] + (c1[1] - c0[1]) * f, c0[2] + (c1[2] - c0[2]) * f];
    }
  }
  return stops[stops.length - 1][1];
}

export function createPlan(env) {
  const { root, eph, sites, site: activeSite, landing, setLanding, hour, setHour, margin, setMargin, t = (s) => s } = env;
  const state = { layer: 'sun_now', cx: 0, cy: 0, scale: 1, pins: [], sun: null, drag: null };
  const view = { w: 1, h: 1, dpr: 1 };
  const images = new Map(), tinted = new Map();
  let canvas, g, frame = 0, sunCanvas = null, sunKey = '', drawing = false;

  root.innerHTML = `
    <div class="plan">
      <section class="plan-map">
        <div class="plan-maphead">
          <div class="plan-tabs" role="group" aria-label="Map layer">
            ${LAYERS.map((l) => `<button type="button" data-layer="${l.id}" aria-pressed="${l.id === state.layer}" title="${escapeHtml(l.sub)}">${escapeHtml(l.label)}</button>`).join('')}
          </div>
          <select id="plan-site" aria-label="Landing site"></select>
        </div>
        <div class="plan-canvas"><canvas aria-label="South polar map"></canvas></div>
        <div class="plan-mapfoot"><span id="plan-note">Click the ground to pin a point.</span><span id="plan-scale"></span></div>
      </section>
      <aside class="plan-side">
        <details open><summary>${escapeHtml(t('Site'))}</summary><div id="plan-site-card"></div></details>
        <details open><summary>${escapeHtml(t('Sky'))}</summary><div id="plan-sky"></div></details>
        <details open><summary>${escapeHtml(t('Windows'))}</summary><div><canvas id="plan-strip" height="54"></canvas></div><div id="plan-windows"></div></details>
        <details><summary>${escapeHtml(t('Assumptions'))}</summary><div id="plan-assumptions"></div></details>
        <div class="plan-time">
          <label>${escapeHtml(t('Landing date (UTC)'))}<input id="plan-date" type="date"></label>
          <input id="plan-hour" type="range" min="0" max="709" step="1" value="0" aria-label="Hour of the stay">
          <span id="plan-when"></span>
        </div>
      </aside>
    </div>`;

  canvas = root.querySelector('canvas');
  g = canvas.getContext('2d');
  const els = {
    siteSelect: root.querySelector('#plan-site'),
    siteCard: root.querySelector('#plan-site-card'),
    sky: root.querySelector('#plan-sky'),
    strip: root.querySelector('#plan-strip'),
    windows: root.querySelector('#plan-windows'),
    assumptions: root.querySelector('#plan-assumptions'),
    date: root.querySelector('#plan-date'),
    hour: root.querySelector('#plan-hour'),
    when: root.querySelector('#plan-when'),
    note: root.querySelector('#plan-note'),
    scale: root.querySelector('#plan-scale'),
  };

  /* ---------------- data ---------------- */

  function imageFor(layer) {
    if (!layer.file) return null;
    if (!images.has(layer.id)) {
      const img = new Image();
      img.src = `${BASE}/${layer.file}`;
      img.decoding = 'async';
      images.set(layer.id, img);
    }
    return images.get(layer.id);
  }

  async function ensure(layer) {
    if (layer.id === 'sun_now') { await ensureHeightGrid(); buildSun(); return; }
    const img = imageFor(layer);
    if (!img) return;
    if (!(img.complete && img.naturalWidth)) await new Promise((res) => { img.onload = res; img.onerror = res; });
    if (!tinted.has(layer.id)) tinted.set(layer.id, await tint(layer, img));
  }

  async function tint(layer, img) {
    const c = document.createElement('canvas');
    c.width = c.height = TINT;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, TINT, TINT);
    const data = cx.getImageData(0, 0, TINT, TINT);
    const px = data.data;
    if (layer.id === 'height') {
      // Their height encoding: h = (R*256 + G) * 0.5 - 10000 m. Turn it into a hillshade so the
      // layer reads as relief rather than as a flat grey field.
      const h = new Float32Array(TINT * TINT);
      for (let i = 0, p = 0; i < px.length; i += 4, p++) h[p] = (px[i] * 256 + px[i + 1]) * 0.5 - 10000;
      const scale = 0.4;
      for (let y = 0; y < TINT; y++) {
        for (let x = 0; x < TINT; x++) {
          const p = y * TINT + x;
          const dx = (h[y * TINT + Math.min(TINT - 1, x + 1)] - h[y * TINT + Math.max(0, x - 1)]) / (2 * 300) / scale;
          const dy = (h[Math.min(TINT - 1, y + 1) * TINT + x] - h[Math.max(0, y - 1) * TINT + x]) / (2 * 300) / scale;
          const shade = clamp(0.55 + 0.45 * (-dx * 0.6 - dy * 0.6), 0, 1);
          const o = p * 4;
          px[o] = px[o + 1] = px[o + 2] = shade * 255;
          px[o + 3] = 255;
        }
      }
      cx.putImageData(data, 0, 0);
      return c;
    }
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i];
      if (layer.id === 'psr') {
        if (v === 0) { px[i + 3] = 0; continue; }
        px[i] = 110; px[i + 1] = 182; px[i + 2] = 255; px[i + 3] = 220;
        continue;
      }
      if (layer.id === 'slope') {
        const deg = v * 0.25;
        const [r, gg, b] = ramp(RAMPS.slope, clamp(deg / 30, 0, 1));
        px[i] = r; px[i + 1] = gg; px[i + 2] = b; px[i + 3] = 235;
        continue;
      }
      if (v >= 255) { px[i + 3] = 0; continue; }
      const [r, gg, b] = ramp(layer.id === 'earth_avg' ? RAMPS.earth : RAMPS.sun, clamp(v / 250, 0, 1));
      px[i] = r; px[i + 1] = gg; px[i + 2] = b; px[i + 3] = 235;
    }
    cx.putImageData(data, 0, 0);
    return c;
  }

  // The surface height in metres, decoded once from the same 16-bit RGBA raster the Height layer uses.
  let heightGrid = null;
  async function ensureHeightGrid() {
    if (heightGrid) return heightGrid;
    const img = imageFor(LAYERS.find((l) => l.id === 'height'));
    if (img && !(img.complete && img.naturalWidth)) await new Promise((res) => { img.onload = res; img.onerror = res; });
    if (!img) return null;
    const c = document.createElement('canvas');
    c.width = c.height = TINT;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, TINT, TINT);
    const data = cx.getImageData(0, 0, TINT, TINT).data;
    heightGrid = new Float32Array(TINT * TINT);
    for (let i = 0, n = 0; i < data.length; i += 4, n++) {
      heightGrid[n] = data[i + 3] === 0 ? NaN : (data[i] * 256 + data[i + 1]) * 0.5 - 10000;
    }
    return heightGrid;
  }

  // Sun now: Lambertian shading of the real relief against the Sun, so the terminator is a gradient
  // rather than a mask, and slopes facing away go dark while slopes facing the Sun catch the light.
  // A small ambient (about 9 %) keeps the night side readable instead of pure black.
  function buildSun() {
    if (!state.sun || !heightGrid) return;
    const key = state.sun.join(',');
    if (key === sunKey && sunCanvas) return;
    sunKey = key;
    const [slat, slon] = state.sun;
    const sla = (slat * Math.PI) / 180, slo = (slon * Math.PI) / 180;
    const sx = Math.cos(sla) * Math.cos(slo), sy = Math.cos(sla) * Math.sin(slo), sz = Math.sin(sla);
    const pixelM = (2 * HALF_KM * 1000) / TINT;
    const c = document.createElement('canvas');
    c.width = c.height = TINT;
    const cx = c.getContext('2d');
    const data = cx.createImageData(TINT, TINT);
    const px = data.data;
    const H = (x, y) => {
      const xc = Math.min(TINT - 1, Math.max(0, x)), yc = Math.min(TINT - 1, Math.max(0, y));
      const v = heightGrid[yc * TINT + xc];
      return Number.isFinite(v) ? v : 0;
    };
    for (let y = 0; y < TINT; y++) {
      for (let x = 0; x < TINT; x++) {
        const o = (y * TINT + x) * 4;
        const xKm = -HALF_KM + ((x + 0.5) / TINT) * 2 * HALF_KM;
        const yKm = HALF_KM - ((y + 0.5) / TINT) * 2 * HALF_KM;
        if (Math.hypot(xKm, yKm) > HALF_KM) continue;
        const lat = (2 * Math.atan(Math.hypot(xKm, yKm) / (2 * R_KM)) * 180) / Math.PI - 90;
        const lon = (Math.atan2(xKm, yKm) * 180) / Math.PI;
        const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
        // Local east / north / up at this cell, and the Sun in that frame.
        const ex = -Math.sin(lo), ey = Math.cos(lo), ez = 0;
        const nx = -Math.sin(la) * Math.cos(lo), ny = -Math.sin(la) * Math.sin(lo), nz = Math.cos(la);
        const ux = Math.cos(la) * Math.cos(lo), uy = Math.cos(la) * Math.sin(lo), uz = Math.sin(la);
        const sE = sx * ex + sy * ey + sz * ez;
        const sN = sx * nx + sy * ny + sz * nz;
        const sU = sx * ux + sy * uy + sz * uz;
        // Terrain normal: the raster's row 0 is maximum y, so the y gradient flips sign.
        const dzdx = (H(x + 1, y) - H(x - 1, y)) / (2 * pixelM);
        const dzdy = -(H(x, y + 1) - H(x, y - 1)) / (2 * pixelM);
        const len = Math.hypot(dzdx, dzdy, 1);
        const dot = (-dzdx * sE - dzdy * sN + sU) / len;
        const lit = Math.max(0, dot);
        // The pole never gets more than about 2° of Sun, so N·L sits near 0.03 and a linear ramp would
        // be black. An exposure curve (1 - e^-14·N·L) lifts the grazing light without inventing any:
        // it is a tone map, not extra illumination. 8 % ambient keeps the night side readable.
        const shade = 255 * (0.08 + 0.92 * (1 - Math.exp(-14 * lit)));
        px[o] = shade;
        px[o + 1] = shade * 0.985;
        px[o + 2] = shade * 0.95;
        px[o + 3] = 255;
      }
    }
    cx.putImageData(data, 0, 0);
    sunCanvas = c;
  }

  /* ---------------- projection ---------------- */

  function fit() {
    const box = canvas.parentElement.getBoundingClientRect();
    view.dpr = Math.min(devicePixelRatio || 1, 2);
    view.w = Math.max(1, Math.round(box.width));
    view.h = Math.max(1, Math.round(box.height));
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    state.scale = (Math.min(view.w, view.h) / (2 * HALF_KM)) * 1.02;
  }
  const toScreen = (x, y) => [view.w / 2 + (x - state.cx) * state.scale, view.h / 2 - (y - state.cy) * state.scale];
  const toWorld = (sx, sy) => [state.cx + (sx - view.w / 2) / state.scale, state.cy - (sy - view.h / 2) / state.scale];

  /* ---------------- drawing ---------------- */

  function draw() {
    if (!g) return;
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, view.w, view.h);
    const layer = LAYERS.find((l) => l.id === state.layer) || LAYERS[0];
    if (layer.id === 'sun_now') { buildSun(); if (sunCanvas) drawRaster(sunCanvas, 1); }
    else {
      if (tinted.get('height')) drawRaster(tinted.get('height'), 1);
      if (layer.id !== 'height' && tinted.get(layer.id)) drawRaster(tinted.get(layer.id), 0.94);
    }
    if (layer.id !== 'sun_now') graticule();
    markers();
    pins();
    els.scale.textContent = `${Math.round(100 * state.scale)} px = 100 km`;
  }

  function drawRaster(img, alpha) {
    if (!img) return;
    const size = img.naturalWidth || img.width;
    const [x0, y0] = toWorld(0, 0);
    const [x1, y1] = toWorld(view.w, view.h);
    const sx = ((x0 + HALF_KM) / (2 * HALF_KM)) * size;
    const sy = ((HALF_KM - y1) / (2 * HALF_KM)) * size;
    const sw = ((x1 - x0) / (2 * HALF_KM)) * size;
    const sh = ((y1 - y0) / (2 * HALF_KM)) * size;
    g.globalAlpha = alpha;
    g.drawImage(img, sx, sy, sw, sh, 0, 0, view.w, view.h);
    g.globalAlpha = 1;
  }

  function graticule() {
    g.save();
    g.strokeStyle = 'rgba(147,167,189,.26)';
    g.lineWidth = 1;
    for (const lat of [-80, -85]) {
      g.beginPath();
      for (let lon = 0; lon <= 360; lon += 3) {
        const [sx, sy] = toScreen(...kmOf(lat, lon));
        if (lon === 0) g.moveTo(sx, sy); else g.lineTo(sx, sy);
      }
      g.stroke();
    }
    g.strokeStyle = 'rgba(88,200,255,.45)';
    g.beginPath();
    for (let lon = 0; lon <= 360; lon += 3) {
      const [sx, sy] = toScreen(...kmOf(-75, lon));
      if (lon === 0) g.moveTo(sx, sy); else g.lineTo(sx, sy);
    }
    g.stroke();
    g.restore();
  }

  function markers() {
    const list = sites?.() ?? [];
    const chosen = activeSite?.();
    const placed = [];
    for (const s of list) {
      const [sx, sy] = toScreen(...kmOf(s.lat, s.lon));
      if (sx < -20 || sy < -20 || sx > view.w + 20 || sy > view.h + 20) continue;
      g.beginPath();
      g.arc(sx, sy, s === chosen ? 5 : 3.2, 0, Math.PI * 2);
      g.fillStyle = s === chosen ? '#f5c542' : '#e8eef6';
      g.fill();
      g.strokeStyle = 'rgba(5,7,10,.85)';
      g.lineWidth = 1.5;
      g.stroke();
      if (view.w > 520 && !placed.some(([x, y]) => Math.hypot(x - sx, y - sy) < 34)) {
        placed.push([sx, sy]);
        g.font = '11px ui-monospace, monospace';
        g.fillStyle = 'rgba(232,238,246,.7)';
        g.fillText(s.short ?? s.id, sx + 7, sy + 3);
      }
    }
  }

  function pins() {
    state.pins.forEach((p, i) => {
      const [sx, sy] = toScreen(...kmOf(p.lat, p.lon));
      g.beginPath(); g.arc(sx, sy, 7, 0, Math.PI * 2);
      g.strokeStyle = '#f5c542'; g.lineWidth = 2; g.stroke();
      g.font = '11px ui-monospace, monospace';
      g.fillStyle = '#f5c542';
      g.fillText(`P${i + 1}`, sx + 10, sy - 6);
    });
  }

  /* ---------------- interaction ---------------- */

  canvas.addEventListener('pointerdown', (e) => {
    state.drag = { x: e.clientX, y: e.clientY, cx: state.cx, cy: state.cy, moved: 0 };
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointers have no capture */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    const dx = e.clientX - state.drag.x, dy = e.clientY - state.drag.y;
    state.drag.moved = Math.max(state.drag.moved, Math.hypot(dx, dy));
    state.cx = clamp(state.drag.cx - dx / state.scale, -HALF_KM, HALF_KM);
    state.cy = clamp(state.drag.cy + dy / state.scale, -HALF_KM, HALF_KM);
    schedule();
  });
  canvas.addEventListener('pointerup', (e) => {
    const drag = state.drag; state.drag = null;
    if (!drag || drag.moved > 4) return;
    const box = canvas.getBoundingClientRect();
    const [x, y] = toWorld(e.clientX - box.left, e.clientY - box.top);
    const [lat, lon] = latLonOf(x, y);
    state.pins.push({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });
    if (state.pins.length > 3) state.pins.shift();
    schedule();
    renderPanels();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const box = canvas.getBoundingClientRect();
    const [bx, by] = toWorld(e.clientX - box.left, e.clientY - box.top);
    state.scale = clamp(state.scale * Math.exp(-e.deltaY * 0.0015), (Math.min(view.w, view.h) / (2 * HALF_KM)) * 0.9, 12);
    const [ax, ay] = toWorld(e.clientX - box.left, e.clientY - box.top);
    state.cx = clamp(state.cx + (bx - ax), -HALF_KM, HALF_KM);
    state.cy = clamp(state.cy + (by - ay), -HALF_KM, HALF_KM);
    schedule();
  }, { passive: false });

  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); }

  root.querySelectorAll('[data-layer]').forEach((b) => {
    b.onclick = () => {
      state.layer = b.dataset.layer;
      root.querySelectorAll('[data-layer]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      const layer = LAYERS.find((l) => l.id === state.layer);
      updateNote();
      ensure(layer).then(() => { draw(); renderPanels(); });
    };
  });

  /* ---------------- panels ---------------- */

  function currentSite() { return activeSite?.() ?? sites?.()[0]; }

  function renderPanels() {
    const site = currentSite();
    if (!site) return;
    els.siteSelect.innerHTML = (sites?.() ?? []).map((s) => `<option value="${escapeHtml(s.id)}"${s === site ? ' selected' : ''}>${escapeHtml(s.short ?? s.id)}</option>`).join('');
    if (!els.siteSelect.dataset.bound) {
      els.siteSelect.dataset.bound = '1';
      els.siteSelect.onchange = () => { env.pickSite?.(els.siteSelect.value); renderPanels(); };
    }
    const f = frameData(site);
    els.siteCard.innerHTML = f ? `
      <div class="plan-kv"><span>${escapeHtml(site.short ?? site.id)}</span><b>${site.lat.toFixed(2)}° ${(((site.lon % 360) + 360) % 360).toFixed(2)}°E</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Sun elevation'))}</span><b>${f.sunEl.toFixed(1)}°</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Earth elevation'))}</span><b>${f.earthEl.toFixed(1)}°</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Direct-to-Earth link'))}</span><b>${f.link ? escapeHtml(t('Available')) : escapeHtml(t('Blocked'))}</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Sun'))}</span><b>${f.sunUp ? escapeHtml(t('In sunlight')) : escapeHtml(t('In shadow'))}</b></div>
      <p class="plan-plain">${escapeHtml(plainSite(f))}</p>
      <p class="plan-small">${escapeHtml(site.terrain ?? t('no terrain'))}${site.mastM ? ` · ${escapeHtml(t('mast'))} ${site.mastM * 1000} m` : ''}</p>` : '';

    els.sky.innerHTML = f ? `
      <div class="plan-kv"><span>${escapeHtml(t('At this hour'))}</span><b>${escapeHtml(f.when)}</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Sub-solar point'))}</span><b>${f.sunLat.toFixed(1)}° ${f.sunLon.toFixed(1)}°E</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Sunset in'))}</span><b>${f.sunsetIn ?? t('—')}</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Earthset in'))}</span><b>${f.earthsetIn ?? t('—')}</b></div>` : '';

    els.windows.innerHTML = f ? `
      <div class="plan-kv"><span>${escapeHtml(t('Sunlit'))}</span><b>${Math.round(f.sunShare * 100)}%</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Earth link'))}</span><b>${Math.round(f.linkShare * 100)}%</b></div>
      <div class="plan-kv"><span>${escapeHtml(t('Both'))}</span><b>${Math.round(f.bothShare * 100)}%</b></div>` : '';

    els.assumptions.innerHTML = `
      <label class="plan-field">${escapeHtml(t('Link margin'))}
        <select id="plan-margin">${[2, 5].map((v) => `<option value="${v}"${v === margin?.() ? ' selected' : ''}>${v}°</option>`).join('')}</select></label>
      <p class="plan-small">${escapeHtml(t('Sunlight counts any part of the disc clearing the skyline. The Atlas page counts at least half; this page and Explore use this rule.'))}</p>`;
    root.querySelector('#plan-margin').onchange = (e) => { setMargin?.(Number(e.target.value)); renderPanels(); };

    els.date.value = new Date(landing?.() ?? Date.now()).toISOString().slice(0, 10);
    els.date.onchange = () => { setLanding?.(Date.parse(`${els.date.value}T00:00:00Z`)); updateSun(); renderPanels(); draw(); };
    els.hour.value = String(hour?.() ?? 0);
    els.hour.oninput = () => { setHour?.(Number(els.hour.value)); renderPanels(); };
    els.when.textContent = f ? f.when : '';

    drawStrip();
    updateSun();
  }

/** One sentence, no units a reader has to decode: what the two numbers above mean for a lander. */
  function plainSite(f) {
    const widths = Math.abs(f.sunEl / 0.53);
    const sunPart = f.sunEl >= 0
      ? `The Sun stands ${f.sunEl.toFixed(1)}° above the horizon, about ${widths.toFixed(0)} solar discs.`
      : `The Sun is ${Math.abs(f.sunEl).toFixed(1)}° below the skyline.`;
    const earthPart = f.link
      ? 'Earth is clear of the terrain, so a direct link is possible.'
      : `Earth sits ${Math.abs(f.earthEl).toFixed(1)}° ${f.earthEl >= 0 ? 'above' : 'below'} the skyline, short of the link margin.`;
    return `${sunPart} ${earthPart}`;
  }

  function frameData(site) {
    const e = eph?.();
    if (!e || !site?.series) return null;
    const base = e.indexOf(landing?.() ?? Date.now());
    if (!Number.isFinite(base)) return null;
    const j = Math.round(base) + (hour?.() ?? 0);
    const series = site.series;
    if (j < 0 || j >= series.sunEl.length) return null;
    const marginDeg = margin?.() ?? 2;
    const sunUp = series.sunVis[j] === 1;
    const link = series.earthClr[j] > marginDeg;
    const n = Math.min(series.sunVis.length - 1, Math.round(base) + 709);
    let sunLit = 0, linkOn = 0, both = 0;
    for (let i = Math.round(base); i <= n; i++) {
      const s = series.sunVis[i] === 1, l = series.earthClr[i] > marginDeg;
      if (s) sunLit++;
      if (l) linkOn++;
      if (s && l) both++;
    }
    const total = Math.max(1, n - Math.round(base) + 1);
    const idx = (k) => new Date(e.timeOf(j + k)).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    let sunsetIn = null, earthsetIn = null;
    for (let k = 1; k <= 709; k++) {
      if (j + k >= series.sunVis.length) break;
      if (sunsetIn === null && series.sunVis[j + k] === 0 && sunUp) sunsetIn = `${k} h`;
      if (earthsetIn === null && link && !(series.earthClr[j + k] > marginDeg)) earthsetIn = `${k} h`;
      if (sunsetIn && earthsetIn) break;
    }
    const st = e.stateAt(base);
    return {
      when: idx(0), sunLat: st[1], sunLon: ((st[0] % 360) + 360) % 360, sunEl: series.sunEl[j], earthEl: series.earthEl[j],
      sunUp, link, sunsetIn, earthsetIn, sunShare: sunLit / total, linkShare: linkOn / total, bothShare: both / total,
    };
  }

  function drawStrip() {
    const site = currentSite();
    const e = eph?.();
    const c = els.strip;
    if (!site?.series || !e) return;
    const w = c.clientWidth || 320;
    c.width = Math.round(w * (devicePixelRatio || 1));
    c.height = Math.round(54 * (devicePixelRatio || 1));
    const cx = c.getContext('2d');
    cx.setTransform(devicePixelRatio || 1, 0, 0, devicePixelRatio || 1, 0, 0);
    cx.clearRect(0, 0, w, 54);
    const base = Math.round(e.indexOf(landing?.() ?? Date.now()));
    const span = 709;
    for (let i = 0; i < span; i++) {
      const j = base + i;
      if (j >= site.series.sunVis.length) break;
      const x = (i / span) * w;
      const sun = site.series.sunVis[j] === 1;
      const link = site.series.earthClr[j] > (margin?.() ?? 2);
      cx.fillStyle = sun ? (link ? '#9be7ff' : '#f5c542') : '#2b2f38';
      cx.fillRect(x, 6, Math.max(1, w / span), 18);
      if (link) { cx.fillStyle = '#43d98a'; cx.fillRect(x, 28, Math.max(1, w / span), 8); }
    }
    cx.fillStyle = 'rgba(232,238,246,.55)';
    cx.font = '10px ui-monospace, monospace';
    cx.fillText(new Date(e.timeOf(base)).toISOString().slice(0, 10), 0, 50);
    cx.fillText(new Date(e.timeOf(base + span)).toISOString().slice(0, 10), w - 60, 50);
  }

  // One line under the map that says what the colours mean, including the night half of Sun now.
  const NOTES = {
    sun_now: 'Bright ground faces the Sun; dark ground does not. At the pole the Sun sits only about two degrees above the horizon, so a slight slope decides. Cast shadows are not drawn yet.',
    sun_avg: 'Share of the time the Sun is visible, averaged over 18.6 years (NASA GSFC). Brighter is more often lit.',
    earth_avg: 'Share of the time Earth is visible, averaged over 18.6 years (NASA GSFC). Bright blue is a clear view.',
    psr: 'Blue ground never sees the Sun: cold enough for water ice to survive.',
    height: 'Relief of the south polar cap from LOLA, lit from the north-west.',
    slope: 'Steepness of the ground. Green is gentle, red is over 20 degrees.',
  };
  function updateNote() {
    if (els.note) els.note.textContent = NOTES[state.layer] ?? 'Click the ground to pin a point.';
  }

  function updateSun() {
    const e = eph?.();
    if (!e) return;
    const idx = e.indexOf(landing?.() ?? Date.now());
    if (!Number.isFinite(idx)) return;
    const s = e.stateAt(idx);
    state.sun = [s[1], s[0]];
    sunKey = '';
  }

  new ResizeObserver(() => { if (drawing) return; drawing = true; requestAnimationFrame(() => { drawing = false; fit(); draw(); drawStrip(); }); }).observe(canvas.parentElement);

  (async () => {
    fit();
    updateSun();
    for (const layer of LAYERS) { if (layer.id === 'height') await ensure(layer); }
    await ensure(LAYERS.find((l) => l.id === state.layer));
    draw();
    renderPanels();
    updateNote();
  })();

  return {
    render: () => { fit(); updateSun(); ensure(LAYERS.find((l) => l.id === state.layer)).then(() => { draw(); renderPanels(); }); draw(); },
    setDate: (ms) => { updateSun(); renderPanels(); draw(); },
    setLayer: (id) => {
      if (!LAYERS.some((l) => l.id === id)) return;
      state.layer = id;
      root.querySelectorAll('[data-layer]').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.layer === id)));
      const layer = LAYERS.find((l) => l.id === id);
      ensure(layer).then(() => { draw(); renderPanels(); });
    },
  };
}
