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
    longestSunH: longestRun(series.sunVis, a, b, 1),
    longestDarkH: longestRun(series.sunVis, a, b, 0),
    longestNoCommH: longestRun(series.earthVis, a, b, 0),
    meanSunElLit: sun ? sunElLit / sun : null,
    maxSunEl,
    maxEarthEl,
  };
}

export const MCDA_PRESETS = {
  balanced: { both: 0.40, run: 0.25, dark: 0.20, terrain: 0.15 },
  power: { both: 0.25, run: 0.40, dark: 0.25, terrain: 0.10 },
  comms: { both: 0.55, run: 0.15, dark: 0.15, terrain: 0.15 },
};

/**
 * Multi-Criteria Decision Analysis (MCDA) evaluation over [i0, i1) for a Site.
 * Combines simultaneous power+link share, longest continuous sunlit run,
 * eclipse survival (1 - longest dark share), and terrain horizon clearance.
 */
export function evaluateSiteMcda(site, i0, i1, { marginDeg = 2, preset = 'balanced', minSunDays = 6.5, needLinkAtTouchdown = true } = {}) {
  const series = site.series;
  const a = Math.max(0, Math.floor(i0)), b = Math.min(series.n, Math.ceil(i1));
  const count = Math.max(1, b - a);
  let lit = 0, link = 0, both = 0;
  let sunRun = 0, longestSunH = 0, darkRun = 0, longestDarkH = 0, noCommRun = 0, longestNoCommH = 0;
  let touchdownSunH = 0, stillTouchdownSun = true;
  for (let i = a; i < b; i++) {
    const s = series.sunVis[i] === 1;
    const e = series.earthClr[i] > marginDeg;
    if (s) {
      lit++; sunRun++; if (sunRun > longestSunH) longestSunH = sunRun;
      darkRun = 0;
      if (stillTouchdownSun) touchdownSunH++;
    } else {
      sunRun = 0; darkRun++; if (darkRun > longestDarkH) longestDarkH = darkRun;
      stillTouchdownSun = false;
    }
    if (e) { link++; noCommRun = 0; } else { noCommRun++; if (noCommRun > longestNoCommH) longestNoCommH = noCommRun; }
    if (s && e) both++;
  }
  const touchdownLink = series.earthClr[a] > marginDeg;
  const viable = touchdownSunH >= minSunDays * 24 && (!needLinkAtTouchdown || touchdownLink);
  const cBoth = both / count;
  const cRun = longestSunH / count;
  const cDark = 1 - longestDarkH / count;
  const maxHz = site.hasTerrain ? Math.max(0, site.maxHorizon()) : 0;
  const cTerr = site.hasTerrain ? Math.max(0, Math.min(1, 1 - maxHz / 25)) : 0.5;
  const w = MCDA_PRESETS[preset] ?? MCDA_PRESETS.balanced;
  const wSum = w.both + w.run + w.dark + w.terrain;
  const score = Math.round(100 * (w.both * cBoth + w.run * cRun + w.dark * cDark + w.terrain * cTerr) / wSum);
  return {
    hours: count,
    lit, link, both,
    litPct: (100 * lit) / count,
    linkPct: (100 * link) / count,
    bothPct: (100 * both) / count,
    longestSunH,
    longestDarkH,
    longestNoCommH,
    touchdownSunH,
    touchdownLink,
    viable,
    hasTerrain: site.hasTerrain,
    maxHorizonDeg: maxHz,
    score,
    components: { cBoth, cRun, cDark, cTerr },
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

/**
 * Next change of Earth clearance relative to an explicit link margin. This is a different event
 * from the geometric Earthset: a 5° requirement can close the link while Earth is still above the terrain.
 */
export function nextMarginTransition(site, marginDeg, from) {
  const eph = site.eph;
  const start = eph.clampIndex(from);
  const open = (i) => site.skyAt(i).earth.el - site.skyAt(i).earth.horizon > marginDeg;
  const now = open(start);
  let j = Math.floor(start) + 1;
  while (j < eph.n - 0.0001 && open(j) === now) j++;
  if (j >= eph.n - 0.0001) return { kind: 'none', state: now };
  let lo = Math.max(start, j - 1), hi = j;
  if (open(lo) !== now) { hi = lo; lo = start; }
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (open(mid) === now) lo = mid; else hi = mid;
  }
  return { kind: now ? 'margin-set' : 'margin-rise', timeMs: eph.timeOf(hi), state: now };
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
