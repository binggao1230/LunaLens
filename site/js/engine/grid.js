// South Pole prototype: a small regular grid in the documented south-polar projection.
// Pure functions only (no DOM). Regional screening, not landing safety.
//
// Projection: polar stereographic about the south pole, r = 2 R tan(colat / 2), x east,
// y toward lon 0 (map "up"). Same constants as the Explore polar map and the 240 m LOLA raster.

import { siteBasis, azEl } from './geometry.js';

export const DEG = Math.PI / 180;
export const R_KM = 1737.4;
export const STUDY_LAT = -85;          // prototype study boundary
export const DEM_FOOTPRINT_LAT = -75;  // LDEM_75S_240M product edge
export const DEM_RES_M = 240;

/** Pilot region: one square around Shackleton rim, all values in kilometres from the pole. */
export const REGION = Object.freeze({
  centerLat: -89.6,
  centerLon: 200,
  halfKm: 8,
  fineCells: 8,
  coarseCells: 4,
});

/** Map-projected position in kilometres (x east, y toward lon 0). */
export function project(latDeg, lonDeg) {
  const rho = 2 * R_KM * Math.tan((90 + latDeg) * DEG / 2);
  return { xKm: rho * Math.sin(lonDeg * DEG), yKm: -rho * Math.cos(lonDeg * DEG) };
}

/** Inverse of `project`: latitude and east longitude in degrees. */
export function unproject(xKm, yKm) {
  const rho = Math.hypot(xKm, yKm);
  const lat = -90 + 2 * Math.atan(rho / (2 * R_KM)) / DEG;
  const lon = ((Math.atan2(xKm, -yKm) / DEG) + 360) % 360;
  return { lat, lon };
}

export const inStudy = (lat) => lat <= STUDY_LAT;

/**
 * Cell centres for a square grid centred on REGION. `cells` 4 gives the coarse overview,
 * 8 the fine pass; both span the same bounds, so cell size is `2 * halfKm / cells`.
 */
export function cellCenters(cells = REGION.fineCells, center = REGION) {
  const c = project(center.centerLat, center.centerLon);
  const step = (2 * REGION.halfKm) / cells;
  const out = [];
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const xKm = c.xKm - REGION.halfKm + (col + 0.5) * step;
      const yKm = c.yKm + REGION.halfKm - (row + 0.5) * step;
      const { lat, lon } = unproject(xKm, yKm);
      out.push({ row, col, xKm, yKm, lat, lon, cellKm: step });
    }
  }
  return out;
}

/** Grid geometry is static; only the scenario changes. */
export function gridGeometry(cells = REGION.fineCells, center = REGION) {
  const centres = cellCenters(cells, center);
  const step = 2 * REGION.halfKm / cells;
  const xs = centres.map((c) => c.xKm), ys = centres.map((c) => c.yKm);
  const corners = [
    unproject(Math.min(...xs) - step / 2, Math.max(...ys) + step / 2),
    unproject(Math.max(...xs) + step / 2, Math.max(...ys) + step / 2),
    unproject(Math.min(...xs) - step / 2, Math.min(...ys) - step / 2),
    unproject(Math.max(...xs) + step / 2, Math.min(...ys) - step / 2),
  ];
  return {
    boundsKm: { xMin: Math.min(...xs) - step / 2, xMax: Math.max(...xs) + step / 2, yMin: Math.min(...ys) - step / 2, yMax: Math.max(...ys) + step / 2 },
    cells, cellKm: step, demResM: DEM_RES_M, corners,
  };
}

/** Interpolate a skyline profile (any uniform azimuth step) at an azimuth. */
export function horizonAt(horizonDeg, azDeg) {
  const n = horizonDeg.length;
  const x = (((azDeg % 360) + 360) % 360) / (360 / n);
  const i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, f = x - Math.floor(x);
  return horizonDeg[i0] * (1 - f) + horizonDeg[i1] * f;
}

export const POLE_CELL_KM = 24;

/**
 * Whole study area in square blocks. Cells whose centre is north of 85°S are dropped, so the
 * boundary is a ragged circle; the block size is rounded so the square closes exactly.
 */
export function studyCellCenters(cellKm = POLE_CELL_KM) {
  const halfKm = 2 * R_KM * Math.tan((90 + STUDY_LAT) * DEG / 2);
  const n = Math.max(1, Math.ceil((2 * halfKm) / cellKm));
  const step = (2 * halfKm) / n;
  const out = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const xKm = -halfKm + (col + 0.5) * step;
      const yKm = halfKm - (row + 0.5) * step;
      const x0 = xKm - step / 2, x1 = xKm + step / 2, y0 = yKm - step / 2, y1 = yKm + step / 2;
      const nx = Math.max(x0, Math.min(0, x1)), ny = Math.max(y0, Math.min(0, y1));
      if (Math.hypot(nx, ny) > halfKm) continue;
      const centreInside = Math.hypot(xKm, yKm) <= halfKm;
      const rep = centreInside ? { x: xKm, y: yKm } : { x: nx, y: ny };
      const centre = unproject(xKm, yKm), at = unproject(rep.x, rep.y);
      const clipped = Math.hypot(x0, y0) > halfKm || Math.hypot(x1, y0) > halfKm || Math.hypot(x0, y1) > halfKm || Math.hypot(x1, y1) > halfKm;
      out.push({ row, col, xKm, yKm, lat: at.lat, lon: at.lon, centreLat: centre.lat, centreLon: centre.lon, cellKm: step, clipped, representative: !centreInside });
    }
  }
  return out;
}

export function poleGeometry(cellKm = POLE_CELL_KM) {
  const cells = studyCellCenters(cellKm);
  const halfKm = 2 * R_KM * Math.tan((90 + STUDY_LAT) * DEG / 2);
  return {
    boundsKm: { xMin: -halfKm, xMax: halfKm, yMin: -halfKm, yMax: halfKm },
    cells: cells.length, cellKm: cells[0]?.cellKm ?? cellKm, demResM: DEM_RES_M,
    corners: [unproject(-halfKm, halfKm), unproject(halfKm, halfKm), unproject(-halfKm, -halfKm), unproject(halfKm, -halfKm)],
  };
}

/**
 * Earth visibility over one stay at a cell, using the native sampled rules.
 * Geometric visibility uses the terrain horizon; the link margin adds the selected clearance.
 */
export function earthStats(ephemeris, lat, lon, groundM, horizonDeg, { startIndex, stayH, marginDeg }) {
  const basis = siteBasis(lat, lon, groundM / 1000 + 0.002);
  const state = new Float64Array(6);
  let open = 0, run = 0, longest = 0, geometric = 0, firstBlockedH = null;
  let sun = 0, sunRun = 0, longestSun = 0, both = 0;
  for (let h = 0; h < stayH; h++) {
    const i = startIndex + h;
    if (i < 0 || i >= ephemeris.n) return null;
    ephemeris.stateAt(i, state);
    const got = azEl(basis, state[4], state[3], state[5]);
    const hz = horizonAt(horizonDeg, got.az);
    if (!Number.isFinite(got.el) || !Number.isFinite(hz)) return null;
    const isOpen = got.el - hz > marginDeg;
    if (got.el > hz) geometric++;
    if (isOpen) { open++; run++; if (run > longest) longest = run; } else { run = 0; if (firstBlockedH === null) firstBlockedH = h; }
    const sunGot = azEl(basis, state[1], state[0], state[2]);
    const sunHz = horizonAt(horizonDeg, sunGot.az);
    const sunUp = Number.isFinite(sunGot.el) && Number.isFinite(sunHz) && sunGot.el > sunHz;
    if (sunUp) { sun++; sunRun++; if (sunRun > longestSun) longestSun = sunRun; } else sunRun = 0;
    if (isOpen && sunUp) both++;
  }
  return {
    earthPct: (100 * open) / stayH,
    geometricPct: (100 * geometric) / stayH,
    longestH: longest,
    firstBlockedH,
    sunPct: (100 * sun) / stayH,
    longestSunH: longestSun,
    bothPct: (100 * both) / stayH,
  };
}

/**
 * Per-hour sky booleans over a window span. One trig pass per hour; the window scan
 * (`screenCellWindow`) then reuses these arrays with prefix sums so narrowing the search
 * window is cheap and both ends of the window actually participate.
 */
export function skySeries(ephemeris, lat, lon, groundM, horizonDeg, { fromIndex, toIndex, stayH, marginDeg }) {
  if (!Number.isFinite(groundM) || !horizonDeg) return null;
  const basis = siteBasis(lat, lon, groundM / 1000 + 0.002);
  const from = Math.max(0, Math.round(fromIndex));
  const spanEnd = Math.min(Math.round(toIndex) + stayH, ephemeris.n);
  const span = spanEnd - from;
  if (span <= 0) return null;
  const earthOpen = new Uint8Array(span), sunOpen = new Uint8Array(span);
  const state = new Float64Array(6);
  for (let j = 0; j < span; j++) {
    const i = from + j;
    ephemeris.stateAt(i, state);
    const e = azEl(basis, state[4], state[3], state[5]);
    const he = horizonAt(horizonDeg, e.az);
    earthOpen[j] = Number.isFinite(e.el) && Number.isFinite(he) && e.el - he > marginDeg ? 1 : 0;
    const s = azEl(basis, state[1], state[0], state[2]);
    const hs = horizonAt(horizonDeg, s.az);
    sunOpen[j] = Number.isFinite(s.el) && Number.isFinite(hs) && s.el > hs ? 1 : 0;
  }
  return { from, span, earthOpen, sunOpen };
}

/**
 * Screen one cell over a touchdown search window: sample one candidate start every
 * `sampleStepH` hours (24 h by default), keep the candidate with the best score, and
 * return that candidate's stay statistics and classification. Hard-limit failures never
 * win: a failed candidate carries no score and is skipped when a scoring one exists.
 */
export function screenCellWindow(ephemeris, { lat, lon, groundM, slopeDeg, horizonDeg }, { startIndex, endIndex, stayH, marginDeg, sampleStepH = 24, scoreFailed = false }, limits = DEFAULT_LIMITS, targets = DEFAULT_TARGETS, weights = DEFAULT_WEIGHTS) {
  const sky = skySeries(ephemeris, lat, lon, groundM, horizonDeg, { fromIndex: startIndex, toIndex: endIndex, stayH, marginDeg });
  if (!sky) return null;
  const { from, span, earthOpen, sunOpen } = sky;
  const ePre = new Int32Array(span + 1), sPre = new Int32Array(span + 1);
  for (let j = 0; j < span; j++) { ePre[j + 1] = ePre[j] + earthOpen[j]; sPre[j + 1] = sPre[j] + sunOpen[j]; }
  let best = null;
  for (let s = Math.round(startIndex); s <= Math.round(endIndex); s += sampleStepH) {
    const off = s - from;
    if (off < 0 || off + stayH > span) continue;
    const earthOpenH = ePre[off + stayH] - ePre[off];
    const sunOpenH = sPre[off + stayH] - sPre[off];
    let runE = 0, longestE = 0, runS = 0, longestS = 0, both = 0;
    for (let h = 0; h < stayH; h++) {
      const e = earthOpen[off + h], su = sunOpen[off + h];
      if (e) { runE++; if (runE > longestE) longestE = runE; } else runE = 0;
      if (su) { runS++; if (runS > longestS) longestS = runS; } else runS = 0;
      if (e && su) both++;
    }
    const stats = { earthPct: (100 * earthOpenH) / stayH, geometricPct: 0, longestH: longestE, firstBlockedH: null, sunPct: (100 * sunOpenH) / stayH, longestSunH: longestS, bothPct: (100 * both) / stayH };
    const cls = classify({ groundM, slopeDeg, horizonDeg, stats }, limits, targets, weights);
    const score = cls.score ?? (scoreFailed ? cls.rawScore : null) ?? -1;
    const qualifies = cls.score != null;
    if (!best || (qualifies && !best.qualifies) || (qualifies === best.qualifies && (score > best.score || (score === best.score && stats.earthPct > best.stats.earthPct)))) {
      best = { startIndex: s, stats, class: cls, score, qualifies };
    }
  }
  return best ? { startIndex: best.startIndex, stats: best.stats, class: best.class } : null;
}

export const DEFAULT_LIMITS = Object.freeze({ maxSlopeDeg: 15, minEarthPct: 25, minWindowH: 48 });
export const DEFAULT_TARGETS = Object.freeze({ slopeDeg: 10, earthPct: 40, windowH: 100, sunPct: 40 });
export const DEFAULT_WEIGHTS = Object.freeze({ earth: 0.35, sun: 0.2, slope: 0.25, window: 0.2 });

/** Validate editable thresholds; targets are clamped to their hard limit so colour cannot lie. */
export function normalizeThresholds(limits = DEFAULT_LIMITS, targets = DEFAULT_TARGETS, weights = DEFAULT_WEIGHTS) {
  const errors = [];
  const num = (v, name) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) errors.push(`${name} must be a non-negative number`);
    return n;
  };
  const L = { maxSlopeDeg: num(limits.maxSlopeDeg, 'slope limit'), minEarthPct: num(limits.minEarthPct, 'visibility limit'), minWindowH: num(limits.minWindowH, 'window limit') };
  const T = {
    slopeDeg: Math.min(num(targets.slopeDeg, 'slope target'), L.maxSlopeDeg),
    earthPct: Math.max(num(targets.earthPct, 'visibility target'), L.minEarthPct),
    windowH: Math.max(num(targets.windowH, 'window target'), L.minWindowH),
    sunPct: Math.max(0, Math.min(100, num(targets.sunPct, 'sunlight target'))),
  };
  const W = { earth: num(weights.earth, 'earth weight'), sun: num(weights.sun, 'sun weight'), slope: num(weights.slope, 'slope weight'), window: num(weights.window, 'window weight') };
  const sum = W.earth + W.sun + W.slope + W.window;
  if (sum <= 0) errors.push('at least one weight must be positive');
  return { ok: errors.length === 0, errors, limits: L, targets: T, weights: sum > 0 ? { earth: W.earth / sum, sun: W.sun / sum, slope: W.slope / sum, window: W.window / sum } : DEFAULT_WEIGHTS };
}

/**
 * Classify one cell. A failed hard limit is always red and its score is not used for ranking.
 * `unknown` means the raster or skyline is unavailable — never red.
 */
export function classify(cell, limits = DEFAULT_LIMITS, targets = DEFAULT_TARGETS, weights = DEFAULT_WEIGHTS) {
  const scored = normalizeThresholds(limits, targets, weights);
  if (!scored.ok) return { status: 'unknown', failed: ['invalid-thresholds'], missed: [], score: null, errors: scored.errors };
  const { limits: L, targets: T, weights: W } = scored;
  if (!cell || !Number.isFinite(cell.groundM) || !Number.isFinite(cell.slopeDeg) || !cell.horizonDeg || !cell.stats) {
    return { status: 'unknown', failed: ['no-data'], missed: [], score: null };
  }
  const failed = [], missed = [];
  if (cell.slopeDeg > L.maxSlopeDeg) failed.push('slope');
  if (cell.stats.earthPct < L.minEarthPct) failed.push('earth');
  if (cell.stats.longestH < L.minWindowH) failed.push('window');
  if (cell.slopeDeg > T.slopeDeg) missed.push('slope');
  if (cell.stats.earthPct < T.earthPct) missed.push('earth');
  if (cell.stats.longestH < T.windowH) missed.push('window');
  const sunPct = Number.isFinite(cell.stats.sunPct) ? cell.stats.sunPct : 0;
  if (sunPct < T.sunPct) missed.push('sun');
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  // Each component reaches 1.0 at its target and earns a small bonus beyond it, so two
  // cells that both meet a target still rank apart (41 % vs 95 % are not the same score).
  const cSlope = L.maxSlopeDeg > 0 ? clamp01((L.maxSlopeDeg - cell.slopeDeg) / Math.max(1e-6, L.maxSlopeDeg - T.slopeDeg)) : 1;
  const slopeBonus = T.slopeDeg > 0 ? 0.25 * clamp01((T.slopeDeg - cell.slopeDeg) / T.slopeDeg) : 0;
  const cEarth = T.earthPct > 0 ? clamp01(cell.stats.earthPct / T.earthPct) : 1;
  const earthBonus = T.earthPct < 100 ? 0.25 * clamp01((cell.stats.earthPct - T.earthPct) / Math.max(1e-6, 100 - T.earthPct)) : 0;
  const cWindow = T.windowH > 0 ? clamp01(cell.stats.longestH / T.windowH) : 1;
  const windowCeil = Math.max(T.windowH * 2, 100);
  const windowBonus = 0.25 * clamp01((cell.stats.longestH - T.windowH) / Math.max(1e-6, windowCeil - T.windowH));
  const cSun = T.sunPct > 0 ? clamp01(sunPct / T.sunPct) : 1;
  const sunBonus = T.sunPct < 100 ? 0.25 * clamp01((sunPct - T.sunPct) / Math.max(1e-6, 100 - T.sunPct)) : 0;
  const weighted = W.earth * (cEarth + earthBonus) + W.sun * (cSun + sunBonus) + W.slope * (cSlope + slopeBonus) + W.window * (cWindow + windowBonus);
  const rawScore = Math.round(100 * weighted / 1.25);
  const score = failed.length ? null : rawScore;
  return { status: failed.length ? 'red' : missed.length ? 'yellow' : 'green', failed, missed, score, rawScore };
}

/** Plain-language failure/miss labels used by the panel and the cell list. */
export const REASON_TEXT = Object.freeze({
  slope: 'slope above the hard limit',
  earth: 'Earth visibility below the hard limit',
  window: 'longest Earth window below the hard limit',
  sun: 'sunlight below the preference target',
  'no-data': 'no terrain skyline at this cell',
  'invalid-thresholds': 'thresholds are invalid',
});
