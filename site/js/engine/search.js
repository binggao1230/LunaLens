// Pure UTC touchdown search: validate a range, evaluate one hourly sample per candidate start,
// group adjacent passing hours and rank sites. No DOM, no network, no Atlas.
//
// Rules (TODO.md "Decisions to implement"):
// - touching down at sample i needs the whole stay: i + stayH <= n - 1 (conservative bound),
// - Earth visible at touchdown means earthClr[i] > marginDeg,
// - sunlight means the sampled apparent solar limb clears the skyline for every one of
//   requiredSunH hours from touchdown, using Site.series.sunVis,
// - a gap splits groups; every sample is counted at most once.

import { HOUR_MS, normalizeRequest, normalizeConditions } from './scenario.js';

const isTerrain = (site) => Boolean(site.hasTerrain && site.series);

/** Statistics for one stay starting at sample `i`. */
export function stayStats(site, i, conditions) {
  const { sunVis, earthClr } = site.series;
  const stayH = conditions.stayH;
  const margin = conditions.marginDeg;
  const n = sunVis.length;
  const end = Math.min(i + stayH, n);
  let sunH = 0, earthH = 0, bothH = 0, sunFromTouchdownH = 0, lead = true;
  let darkRun = 0, longestDarkH = 0, noEarthRun = 0, longestNoEarthH = 0;
  let firstSunGapMs = null, firstEarthGapMs = null;
  for (let j = i; j < end; j++) {
    const sun = sunVis[j] === 1;
    const earth = earthClr[j] > margin;
    if (sun) {
      sunH++;
      if (lead) sunFromTouchdownH++;
      darkRun = 0;
    } else {
      lead = false;
      darkRun++;
      if (darkRun > longestDarkH) longestDarkH = darkRun;
      if (firstSunGapMs === null) firstSunGapMs = site.eph.timeOf(j);
    }
    if (earth) { earthH++; noEarthRun = 0; } else {
      noEarthRun++;
      if (noEarthRun > longestNoEarthH) longestNoEarthH = noEarthRun;
      if (firstEarthGapMs === null) firstEarthGapMs = site.eph.timeOf(j);
    }
    if (sun && earth) bothH++;
  }
  return {
    index: i,
    ms: site.eph.timeOf(i),
    endsAtMs: site.eph.timeOf(i + stayH),
    hours: end - i,
    sunH, earthH, bothH,
    sunFromTouchdownH,
    longestDarkH,
    longestNoEarthH,
    firstSunGapMs,
    firstEarthGapMs,
    touchdownSun: sunVis[i] === 1,
    touchdownEarth: earthClr[i] > margin,
  };
}
function prefix(series, predicate) {
  const { n } = series;
  const out = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) out[i + 1] = out[i] + (predicate(i) ? 1 : 0);
  return out;
}


/** Eligibility mask over [from, to) plus aggregate failure counts. One sample, one decision. */
export function eligibleMask(site, from, to, conditions) {
  const series = site.series;
  const { n } = series;
  const stayH = conditions.stayH;
  const need = conditions.requiredSunH;
  const margin = conditions.marginDeg;
  const sunPrefix = prefix(series, (i) => series.sunVis[i] === 1);
  const mask = new Uint8Array(Math.max(0, to - from));
  const failures = { coverage: 0, sun: 0, earth: 0 };
  let count = 0;
  for (let i = from; i < to; i++) {
    let ok = true;
    if (i + stayH > n - 1) { failures.coverage++; ok = false; }
    const sunOk = need === 0 || (i + need <= n && sunPrefix[i + need] - sunPrefix[i] === need);
    if (!sunOk) { failures.sun++; ok = false; }
    const earthOk = !conditions.requireEarthAtTouchdown || series.earthClr[i] > margin;
    if (!earthOk) { failures.earth++; ok = false; }
    if (ok) { mask[i - from] = 1; count++; }
  }
  return { mask, failures, count };
}

/** Per-site scan of a normalized request. Returns eligible groups and aggregate failures. */
export function scanSite(site, request, conditions) {
  const series = site.series;
  const stayH = conditions.stayH;
  const margin = conditions.marginDeg;
  const a = request.evaluated.startIndex;
  const b = request.evaluated.endIndex;
  const bothPrefix = prefix(series, (i) => series.sunVis[i] === 1 && series.earthClr[i] > margin);
  const { mask, failures, count } = eligibleMask(site, a, b, conditions);
  const groups = [];
  let group = null;
  for (let i = a; i < b; i++) {
    if (!mask[i - a]) { group = null; continue; }
    if (!group) { group = { start: i, end: i + 1, starts: 0, overlapMax: -1, best: [] }; groups.push(group); }
    group.end = i + 1;
    group.starts++;
    const overlap = bothPrefix[i + stayH] - bothPrefix[i];
    if (overlap > group.overlapMax) { group.overlapMax = overlap; group.best = [i]; }
    else if (overlap === group.overlapMax) group.best.push(i);
  }
  const eph = site.eph;
  const pickRepresentative = (group) => {
    let best = null;
    for (const i of group.best) {
      const st = stayStats(site, i, conditions);
      if (!best || st.longestDarkH < best.longestDarkH || (st.longestDarkH === best.longestDarkH && st.ms < best.ms)) best = st;
    }
    return best;
  };
  for (const g of groups) {
    g.startMs = eph.timeOf(g.start);
    g.endMs = eph.timeOf(g.end - 1);
    g.width = g.end - g.start;
    g.representative = pickRepresentative(g);
    g.overlapH = g.representative?.bothH ?? 0;
    delete g.best;
  }
  const siteBest = groups.reduce((acc, g) => (g.overlapH > (acc?.overlapH ?? -1) ? g : acc), null);
  return {
    id: site.id,
    name: site.name,
    terrain: site.terrain ?? 'none',
    eligibleCount: count,
    groups,
    representative: siteBest?.representative ?? null,
    widestGroup: groups.reduce((m, g) => Math.max(m, g.width), 0),
    firstMs: count ? eph.timeOf(groups[0].start) : null,
    lastMs: count ? eph.timeOf(groups[groups.length - 1].end - 1) : null,
    failures,
  };
}

/** At most three groups: the representative's group first, then width, overlap, earliest. */
export function displayGroups(siteResult, limit = 3) {
  const repGroup = siteResult.groups.find((g) => g.representative && g.representative.index === siteResult.representative?.index);
  const rest = siteResult.groups.filter((g) => g !== repGroup).sort((x, y) =>
    (y.width - x.width) || (y.overlapH - x.overlapH) || (x.start - y.start));
  return [repGroup, ...rest].filter(Boolean).slice(0, limit);
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function rankSites(results, ranking = 'flexibility') {
  const cmp = ranking === 'overlap'
    ? (a, b) => ((b.representative?.bothH ?? 0) - (a.representative?.bothH ?? 0)) || (b.eligibleCount - a.eligibleCount) || (b.widestGroup - a.widestGroup) || byId(a, b)
    : (a, b) => (b.eligibleCount - a.eligibleCount) || (b.widestGroup - a.widestGroup) || ((b.representative?.bothH ?? 0) - (a.representative?.bothH ?? 0)) || byId(a, b);
  return [...results].sort(cmp);
}

/**
 * Run one search.
 * `sites`: Site instances (with `.series`); reference sites without a terrain skyline are
 * reported separately and never ranked.
 * `bounds`: dataBounds(ephemeris).
 */
export function searchTouchdowns({ sites, request, bounds, conditions, ranking = 'flexibility' }) {
  const started = Date.now();
  const normalized = normalizeRequest(request, bounds, conditions);
  if (!normalized.ok || normalized.state === 'invalid') {
    return { state: 'invalid', errors: normalized.errors, request: normalized, conditions: normalized.conditions, coverage: normalized.coverage, candidates: [], unranked: [], reference: [], searchedStarts: 0 };
  }
  const cond = normalizeConditions(normalized.conditions).conditions;
  const reference = sites.filter((s) => !isTerrain(s)).map((s) => ({ id: s.id, name: s.name, terrain: s.terrain ?? 'none', reason: 'smooth-sphere' }));
  const candidates = [];
  const unranked = [];
  const n = sites.length ? sites[0].eph.n : 0;
  const step = bounds.stepMs || HOUR_MS;
  const evaluated = normalized.evaluated;
  if (evaluated && normalized.kind === 'hour' && evaluated.startIndex === undefined) {
    evaluated.startIndex = Math.round((evaluated.startMs - bounds.firstMs) / step);
    evaluated.endIndex = evaluated.startIndex + 1;
  }
  let searched = 0;
  if (evaluated) {
    searched = evaluated.endIndex - evaluated.startIndex;
    for (const site of sites.filter(isTerrain)) {
      const r = scanSite(site, { ...normalized, evaluated }, cond);
      r.display = displayGroups(r);
      if (r.eligibleCount > 0) candidates.push(r); else unranked.push(r);
    }
  }
  const ranked = rankSites(candidates, ranking);
  const state = !normalized.evaluated || searched <= 0 ? 'no-coverage' : (ranked.length ? 'ok' : 'no-match');
  return {
    state,
    request: normalized,
    conditions: cond,
    ranking,
    coverage: normalized.coverage,
    candidates: ranked,
    unranked: rankSites(unranked, ranking),
    reference,
    searchedStarts: searched,
    elapsedMs: Date.now() - started,
    lastSampleMs: bounds.lastMs,
  };
}
