import { HOUR_MS } from './ephemeris.js';

function longestRun(flags, i0, i1, value) {
  let best = 0, cur = 0;
  for (let i = i0; i < i1; i++) {
    if (flags[i] === value) { cur++; if (cur > best) best = cur; } else cur = 0;
  }
  return best;
}

/** Metrics over samples [i0, i1) of a site series (hourly samples). */
export function windowMetrics(series, i0, i1) {
  const a = Math.max(0, Math.floor(i0)), b = Math.min(series.n, Math.ceil(i1));
  const count = Math.max(1, b - a);
  let sun = 0, earth = 0, both = 0, sunElLit = 0, maxSunEl = -90, maxEarthEl = -90;
  for (let i = a; i < b; i++) {
    const s = series.sunVis[i], e = series.earthVis[i];
    sun += s; earth += e; both += s & e;
    if (s) sunElLit += series.sunEl[i];
    if (series.sunEl[i] > maxSunEl) maxSunEl = series.sunEl[i];
    if (series.earthEl[i] > maxEarthEl) maxEarthEl = series.earthEl[i];
  }
  return {
    hours: count,
    sunPct: (100 * sun) / count,
    earthPct: (100 * earth) / count,
    bothPct: (100 * both) / count,
    longestDarkH: longestRun(series.sunVis, a, b, 0),
    longestNoCommH: longestRun(series.earthVis, a, b, 0),
    meanSunElLit: sun ? sunElLit / sun : null,
    maxSunEl,
    maxEarthEl,
  };
}

/** Per-day summaries for the calendar heatmap, starting at ephemeris index `i0` (a UTC midnight). */
export function dailyFractions(series, i0, days) {
  const out = [];
  for (let d = 0; d < days; d++) {
    const a = i0 + d * 24, b = a + 24;
    if (b > series.n) break;
    let s = 0, e = 0, both = 0;
    for (let i = a; i < b; i++) { s += series.sunVis[i]; e += series.earthVis[i]; both += series.sunVis[i] & series.earthVis[i]; }
    out.push({ sun: s / 24, earth: e / 24, both: both / 24 });
  }
  return out;
}

/**
 * Next change of Sun/Earth visibility after fractional index `from`.
 * Returns {kind:'set'|'rise', timeMs} or {kind:'none', state:boolean} if nothing changes within the data.
 */
export function nextTransition(site, which, from) {
  const eph = site.eph;
  const start = eph.clampIndex(from);
  const now = site.visibleAt(which, start);
  const flags = which === 'sun' ? site.series.sunVis : site.series.earthVis;
  let j = Math.floor(start) + 1;
  while (j < eph.n && (flags[j] === 1) === now) j++;
  if (j >= eph.n) return { kind: 'none', state: now };
  let lo = Math.max(start, j - 1), hi = j;
  if (site.visibleAt(which, lo) !== now) hi = lo, lo = start;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (site.visibleAt(which, mid) === now) lo = mid; else hi = mid;
  }
  return { kind: now ? 'set' : 'rise', timeMs: eph.timeOf(hi), state: now };
}

/** Previous change (for "since sunrise" style context). */
export function previousTransition(site, which, from) {
  const eph = site.eph;
  const start = eph.clampIndex(from);
  const now = site.visibleAt(which, start);
  const flags = which === 'sun' ? site.series.sunVis : site.series.earthVis;
  let j = Math.floor(start);
  while (j >= 0 && (flags[j] === 1) === now) j--;
  if (j < 0) return { kind: 'none', state: now };
  let lo = j, hi = Math.min(start, j + 1);
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (site.visibleAt(which, mid) === now) hi = mid; else lo = mid;
  }
  return { kind: now ? 'rise' : 'set', timeMs: eph.timeOf(lo), state: now };
}

export function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m} min`;
}

export const HOURS = (h) => h * HOUR_MS;
