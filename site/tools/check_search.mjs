// Reproducible oracle for the native touchdown search.
// Run: node site/tools/check_search.mjs
//
// Two kinds of evidence:
// 1. synthetic arrays that pin the boundary rules (range ends, gaps, ties, margins),
// 2. the local snapshot fixtures: H1 2030 and the 2028-12-30 → 2029-01-02 cross-year range,
//    checked against a plain hourly sweep written independently of engine/search.js.

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';
import { dataBounds, makeRequest, DEFAULT_CONDITIONS, normalizeConditions } from '../js/engine/scenario.js';
import { searchTouchdowns, displayGroups } from '../js/engine/search.js';

const HOUR = 3600e3;
const dir = new URL('../data/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir));
const eph = new Ephemeris(
  read('ephemeris.f64').buffer.slice(read('ephemeris.f64').byteOffset, read('ephemeris.f64').byteOffset + read('ephemeris.f64').byteLength),
  JSON.parse(read('ephemeris.json')),
);
const rawSites = JSON.parse(read('sites.json')).sites;
const sites = rawSites.map((raw) => new Site(raw, eph));
const terrain = sites.filter((s) => s.hasTerrain);
const bounds = dataBounds(eph);
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); console.log(`PASS ${name}`); };

/* ---------- 1. synthetic boundary rules ---------- */

function fakeSite(id, sunVis, earthClr, stayN = null) {
  const n = sunVis.length;
  const ephBase = Date.UTC(2026, 0, 1);
  return {
    id, name: id, terrain: 'synthetic', hasTerrain: true,
    series: { n, sunVis: Uint8Array.from(sunVis), earthClr: Float32Array.from(earthClr) },
    eph: { n, timeOf: (i) => ephBase + i * HOUR },
    _base: ephBase,
  };
}
const synthBounds = (site) => ({ firstMs: site._base, lastMs: site._base + (site.series.n - 1) * HOUR, stepMs: HOUR, startIndex: 0, endIndex: site.series.n });
const milli = (site, i) => site._base + i * HOUR;

check('range is start-inclusive and end-exclusive', () => {
  const site = fakeSite('a', Array(10).fill(1), Array(10).fill(10));
  const conditions = { stayH: 2, marginDeg: 2, requiredSunH: 2, requireEarthAtTouchdown: true };
  const r = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 4) }), bounds: synthBounds(site), conditions });
  assert.equal(r.searchedStarts, 4, 'four samples in [0, 4)');
  assert.equal(r.candidates[0].eligibleCount, 4, 'all four starts can hold a two-hour stay');
  const r3 = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 3) }), bounds: synthBounds(site), conditions });
  assert.equal(r3.searchedStarts, 3);
  assert.equal(r3.candidates[0].eligibleCount, 3);
});

check('a single passing sample is one group of width one', () => {
  const sun = Array(10).fill(1);
  const earth = Array(10).fill(0);
  earth[2] = 10; // the only Earth-visible hour is sample 2
  const site = fakeSite('a', sun, earth);
  const conditions = { stayH: 2, marginDeg: 2, requiredSunH: 2, requireEarthAtTouchdown: true };
  const r = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 10) }), bounds: synthBounds(site), conditions });
  const c = r.candidates[0];
  assert.equal(c.eligibleCount, 1);
  assert.equal(c.groups.length, 1);
  assert.equal(c.widestGroup, 1);
  assert.equal(c.representative.ms, milli(site, 2));
});
check('margin equality fails; a larger margin changes the result', () => {
  const site = fakeSite('a', Array(8).fill(1), Array(8).fill(3));
  const at2 = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 8) }), bounds: synthBounds(site), conditions: { stayH: 2, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true } });
  assert.ok(at2.candidates.length === 1, '3° clearance passes a 2° margin');
  const at5 = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 8) }), bounds: synthBounds(site), conditions: { stayH: 2, marginDeg: 5, requiredSunH: 1, requireEarthAtTouchdown: true } });
  assert.equal(at5.state, 'no-match');
  assert.equal(at5.unranked[0].failures.earth, 6, 'the complete-stay bound leaves six starts in an eight-sample series');
  const equal = fakeSite('eq', Array(8).fill(1), Array(8).fill(2));
  const eq = searchTouchdowns({ sites: [equal], request: makeRequest({ kind: 'range', startMs: milli(equal, 0), endMs: milli(equal, 8) }), bounds: synthBounds(equal), conditions: { stayH: 2, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true } });
  assert.equal(eq.state, 'no-match', 'clearance equal to the margin is not a pass');
});

check('a stay that cannot fit is reported as omitted, not silently shortened', () => {
  const site = fakeSite('a', Array(6).fill(1), Array(6).fill(10));
  const conditions = { stayH: 4, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true };
  const r = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 5) }), bounds: synthBounds(site), conditions });
  assert.equal(r.coverage.state, 'partial');
  assert.equal(r.coverage.requestedHours, 5);
  // i + stayH <= n - 1 keeps i = 0 and 1 only.
  assert.equal(r.coverage.evaluatedHours, 2);
  assert.equal(r.coverage.omittedHours, 3);
  assert.equal(r.searchedStarts, 2);
});

check('one gap splits two groups and no sample is counted twice', () => {
  const sun = Array(10).fill(1), earth = Array(10).fill(10);
  earth[3] = 0;
  const site = fakeSite('a', sun, earth);
  const conditions = { stayH: 2, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true };
  const r = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 10) }), bounds: synthBounds(site), conditions });
  const c = r.candidates[0];
  assert.deepEqual(c.groups.map((g) => g.width), [3, 4]);
  assert.equal(c.groups.reduce((n, g) => n + g.starts, 0), c.eligibleCount);
  assert.equal(r.searchedStarts, 8, 'the two-hour stay leaves eight of the ten starts evaluable');
});
check('no sunlight, no match; continuous sun longer than the stay is invalid', () => {
  const site = fakeSite('a', Array(8).fill(0), Array(8).fill(10));
  const r = searchTouchdowns({ sites: [site], request: makeRequest({ kind: 'range', startMs: milli(site, 0), endMs: milli(site, 8) }), bounds: synthBounds(site), conditions: { stayH: 2, marginDeg: 2, requiredSunH: 2, requireEarthAtTouchdown: true } });
  assert.equal(r.state, 'no-match');
  assert.equal(r.unranked[0].failures.sun, 6);
  const bad = normalizeConditions({ stayH: 4, requiredSunH: 5 });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors[0].code, 'sunLongerThanStay');
});

check('reference sites stay out of the ranking', () => {
  const terrainSite = fakeSite('terrain', Array(8).fill(1), Array(8).fill(10));
  const smooth = { id: 'apollo11', name: 'Apollo 11', terrain: 'none', hasTerrain: false, series: null };
  const r = searchTouchdowns({ sites: [terrainSite, smooth], request: makeRequest({ kind: 'range', startMs: milli(terrainSite, 0), endMs: milli(terrainSite, 8) }), bounds: synthBounds(terrainSite), conditions: { stayH: 2, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true } });
  assert.deepEqual(r.reference.map((s) => s.id), ['apollo11']);
  assert.deepEqual(r.candidates.map((s) => s.id), ['terrain']);
});

check('ties break on stable site id', () => {
  const a = fakeSite('aaa', Array(8).fill(1), Array(8).fill(10));
  const b = fakeSite('bbb', Array(8).fill(1), Array(8).fill(10));
  a._base = b._base;
  const r = searchTouchdowns({ sites: [b, a], request: makeRequest({ kind: 'range', startMs: milli(a, 0), endMs: milli(a, 8) }), bounds: synthBounds(a), conditions: { stayH: 2, marginDeg: 2, requiredSunH: 1, requireEarthAtTouchdown: true } });
  assert.deepEqual(r.candidates.map((s) => s.id), ['aaa', 'bbb']);
});

/* ---------- 2. local snapshot fixtures vs an independent sweep ---------- */

const COND = { ...DEFAULT_CONDITIONS };
const h1 = { startMs: Date.parse('2030-01-01T00:00:00Z'), endMs: Date.parse('2030-07-01T00:00:00Z') };
const expected = { 'nobile-rim': [1055, 241], im1: [679, 132], im2: [419, 161], 'degerlache-rim': [354, 311], 'shackleton-rim': [77, 62], 'shackleton-floor': [0, 0] };

check('exact hour is preserved as one sample', () => {
  const ms = Date.parse('2026-11-23T12:00:00Z');
  const r = searchTouchdowns({ sites, request: makeRequest({ kind: 'hour', touchdownMs: ms }), bounds, conditions: COND });
  assert.equal(r.request.touchdownMs, ms);
  assert.equal(r.request.evaluated.startMs, ms);
  assert.equal(r.searchedStarts, 1);
  assert.ok(r.candidates[0] ?? r.unranked[0], 'one site is evaluated');
});
function naive(site, range, conditions) {
  const { sunVis, earthClr } = site.series;
  const n = sunVis.length;
  const t0 = site.eph.t0, step = site.eph.stepMs;
  const a = Math.round((range.startMs - t0) / step);
  const b = Math.round((range.endMs - t0) / step);
  let count = 0, widest = 0, run = 0, best = null;
  for (let i = a; i < b; i++) {
    if (i + conditions.stayH > n - 1) { run = 0; continue; }
    if (conditions.requireEarthAtTouchdown && !(earthClr[i] > conditions.marginDeg)) { run = 0; continue; }
    let sun = true;
    for (let k = 0; k < conditions.requiredSunH; k++) if (sunVis[i + k] !== 1) { sun = false; break; }
    if (!sun) { run = 0; continue; }
    count++; run++; widest = Math.max(widest, run);
    let overlap = 0;
    for (let k = 0; k < conditions.stayH; k++) if (sunVis[i + k] === 1 && earthClr[i + k] > conditions.marginDeg) overlap++;
    if (!best || overlap > best.overlap) best = { index: i, overlap };
  }
  return { count, widest, best };
}

check('H1 2030 fixture: counts, widest groups and both rankings', () => {
  const t0 = performance.now();
  const r = searchTouchdowns({ sites, request: makeRequest({ kind: 'range', ...h1 }), bounds, conditions: COND, ranking: 'flexibility' });
  const ms = performance.now() - t0;
  assert.equal(r.searchedStarts, 4344);
  assert.equal(r.state, 'ok');
  for (const [id, [count, widest]] of Object.entries(expected)) {
    const got = [...r.candidates, ...r.unranked].find((s) => s.id === id);
    assert.equal(got.eligibleCount, count, `${id}: eligible starts`);
    assert.equal(got.widestGroup, widest, `${id}: widest group`);
    const ref = naive(sites.find((s) => s.id === id), h1, COND);
    assert.equal(got.eligibleCount, ref.count, `${id}: naive count`);
    assert.equal(got.widestGroup, ref.widest, `${id}: naive widest`);
  }
  assert.equal(r.candidates[0].id, 'nobile-rim', 'flexibility order');
  assert.equal(r.unranked[0].id, 'shackleton-floor');
  const overlap = searchTouchdowns({ sites, request: makeRequest({ kind: 'range', ...h1 }), bounds, conditions: COND, ranking: 'overlap' });
  assert.equal(overlap.candidates[0].id, 'degerlache-rim', 'overlap order');
  const rep = overlap.candidates[0].representative;
  assert.equal(new Date(rep.ms).toISOString(), '2030-05-26T18:00:00.000Z');
  assert.equal(rep.bothH, 366);
  assert.equal(new Date(r.candidates[0].firstMs).toISOString(), '2030-01-07T16:00:00.000Z');
  console.log(`     H1 scan ${ms.toFixed(0)} ms on this machine, ${r.searchedStarts} starts × ${terrain.length} terrain sites`);
});

check('display keeps the representative group first, then fills by width', () => {
  const r = searchTouchdowns({ sites, request: makeRequest({ kind: 'range', ...h1 }), bounds, conditions: COND, ranking: 'overlap' });
  const deger = r.candidates.find((s) => s.id === 'degerlache-rim');
  const shown = displayGroups(deger);
  assert.equal(shown.length, 2, 'de Gerlache has two groups, so at most two are shown');
  assert.equal(shown[0].overlapH, deger.representative.bothH);
  assert.equal(shown.some((g) => g.width === 311), true);
  const nobile = displayGroups(r.candidates.find((s) => s.id === 'nobile-rim'));
  assert.equal(nobile.length, 3);
  assert.equal(nobile.some((g) => g.width === 241), true);
});

check('cross-year custom range matches the same hourly sweep', () => {
  const range = { startMs: Date.parse('2028-12-30T00:00:00Z'), endMs: Date.parse('2029-01-02T00:00:00Z') };
  const r = searchTouchdowns({ sites, request: makeRequest({ kind: 'range', ...range }), bounds, conditions: COND });
  assert.equal(r.coverage.state, 'full');
  assert.equal(r.searchedStarts, 72);
  for (const site of r.candidates) {
    const ref = naive(sites.find((s) => s.id === site.id), range, COND);
    assert.equal(site.eligibleCount, ref.count, `${site.id}: cross-year count`);
    assert.equal(site.widestGroup, ref.widest, `${site.id}: cross-year widest`);
  }
});

check('2030 whole year is partial at the data end, 2031 has no coverage', () => {
  const latest = new Date(bounds.lastMs - COND.stayH * HOUR).toISOString();
  assert.equal(latest, '2030-12-02T10:00:00.000Z');
  const year = searchTouchdowns({ sites, request: makeRequest({ kind: 'year', year: 2030 }), bounds, conditions: COND });
  assert.equal(year.coverage.state, 'partial');
  const evaluatedEnd = year.request.evaluated.endMs;
  assert.equal(evaluatedEnd - HOUR, Date.parse('2030-12-02T10:00:00Z'), 'last included start');
  assert.ok(evaluatedEnd <= Date.parse('2030-12-02T11:00:00Z'), 'next hour excluded');
  const next = searchTouchdowns({ sites, request: makeRequest({ kind: 'year', year: 2031 }), bounds, conditions: COND });
  assert.equal(next.state, 'no-coverage');
  assert.equal(next.coverage.reason, 'no-complete-stay');
  const floor = searchTouchdowns({ sites, request: makeRequest({ kind: 'range', ...h1 }), bounds, conditions: COND });
  assert.ok(floor.unranked.some((s) => s.id === 'shackleton-floor' && s.eligibleCount === 0), 'no-match is distinct from no coverage');
});

console.log(`\n${checks.length} checks passed.`);
