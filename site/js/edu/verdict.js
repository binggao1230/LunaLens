// Education mode: a deliberately simple "will this landing work?" model, for teaching only.
//
// It reads the same hourly series as Expert mode (Site.series) with the same definitions the Mission view uses:
// "sunlit" = sunVis is 1, "Earth link" = Earth clears the terrain by more than the link margin (earthClr > margin).
// On top it adds two teaching rules that Expert mode does not model:
//   power: the battery must outlast the longest night of the stay;
//   talk:  the lander must see Earth often enough, unless a relay satellite passes messages on.
// Battery sizes are illustrative values for the story, not real mission specifications.

export const STAY_H = 14 * 24; // a two-week surface stay
export const BATTERY_H = { artemis: 96, apollo: 48, novac: 36, vikram: 24, polar: 60 }; // illustrative
export const BATTERY_BONUS_H = 48;
const EARTH_GO_PCT = 50, EARTH_RISKY_PCT = 25; // share of the stay with a direct link
const RANK = { go: 0, risky: 1, nogo: 2 };
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b);

function longestRun(test, i0, n) {
  let best = 0, cur = 0, at = 0, bestAt = 0;
  for (let h = 0; h < n; h++) {
    if (test(i0 + h)) { if (cur === 0) at = h; cur++; if (cur > best) { best = cur; bestAt = at; } } else cur = 0;
  }
  return { hours: best, from: bestAt };
}

/**
 * Assess one site for a landing at ephemeris index i0.
 * opts: { batteryH, relay, margin }. Returns the verdict and the numbers behind it (hours from i0).
 */
export function assess(site, i0, { batteryH, relay = false, margin = 2 }) {
  const s = site.series, n = Math.max(0, Math.min(STAY_H, s.n - i0));
  const sunAt = (i) => s.sunVis[i] === 1, earthAt = (i) => s.earthClr[i] > margin;
  let sun = 0, earth = 0;
  for (let h = 0; h < n; h++) { if (sunAt(i0 + h)) sun++; if (earthAt(i0 + h)) earth++; }
  const night = longestRun((i) => !sunAt(i), i0, n);
  const quiet = longestRun((i) => !earthAt(i), i0, n);
  const sunPct = n ? (100 * sun) / n : 0, earthPct = n ? (100 * earth) / n : 0;

  let power = 'go';
  if (sun === 0) power = 'nogo';
  else if (night.hours > batteryH * 1.5) power = 'nogo';
  else if (night.hours > batteryH) power = 'risky';
  let talk = 'go';
  if (!relay) talk = earthPct >= EARTH_GO_PCT ? 'go' : earthPct >= EARTH_RISKY_PCT ? 'risky' : 'nogo';

  const reason = sun === 0 ? 'shadow' : power !== 'go' ? 'night' : talk !== 'go' ? 'earth' : 'ok';
  return {
    verdict: worst(power, talk), power, talk, reason, hours: n,
    sunPct, earthPct, nightH: night.hours, nightFrom: night.from, quietH: quiet.hours, quietFrom: quiet.from,
    neverLit: sun === 0,
  };
}

export const isOk = (v) => v === 'go' || v === 'risky';

/**
 * Anomaly: the smallest launch delay (1..14 days) that makes a "go" site not "go".
 * Prefers a delay whose problem is the night outlasting the battery. Returns { days, result } or null.
 */
export function findBreakingDelay(site, i0, opts) {
  let firstAny = null;
  for (let d = 1; d <= 14; d++) {
    const result = assess(site, i0 + d * 24, opts);
    if (result.verdict === 'go') continue;
    if (result.reason === 'night') return { days: d, result };
    firstAny ??= { days: d, result };
  }
  return firstAny;
}

/** "Wait a few days": the "go" delay (0..14 days from i0) closest to the current delay. */
export function findGoDelay(site, i0, currentDays, opts) {
  let best = null;
  for (let d = 0; d <= 14; d++) {
    if (d === currentDays) continue;
    if (assess(site, i0 + d * 24, opts).verdict !== 'go') continue;
    if (!best || Math.abs(d - currentDays) < Math.abs(best - currentDays) || (Math.abs(d - currentDays) === Math.abs(best - currentDays) && d > best)) best = d;
  }
  return best;
}

const D2R = Math.PI / 180;
function distanceKm(a, b) {
  const x = Math.sin(a.lat * D2R) * Math.sin(b.lat * D2R) + Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.cos((a.lon - b.lon) * D2R);
  return 1737.4 * Math.acos(Math.max(-1, Math.min(1, x)));
}

/** "Move to higher ground": the best other site by verdict, then by sunlight, then by distance. */
export function bestNearby(sites, chosen, i0, opts) {
  const ranked = sites.filter((s) => s.id !== chosen.id).map((site) => ({ site, result: assess(site, i0, opts), km: distanceKm(site, chosen) }));
  ranked.sort((a, b) => RANK[a.result.verdict] - RANK[b.result.verdict] || (b.result.sunPct - a.result.sunPct) || a.km - b.km);
  return ranked[0] ?? null;
}
