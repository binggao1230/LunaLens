// Oracle for the South Pole prototype grid.
// Run: node site/tools/check_grid.mjs
//
// Checks the documented projection, the static/scenario split, the threshold classes and one
// cell against a native Site built at the same coordinates and skyline.

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';
import { Dem, computeHorizon } from '../js/engine/dem.js';
import {
  REGION, STUDY_LAT, DEM_FOOTPRINT_LAT, project, unproject, cellCenters, gridGeometry,
  earthStats, classify, normalizeThresholds, DEFAULT_LIMITS, DEFAULT_TARGETS,
} from '../js/engine/grid.js';

const checks = [];
let pilot = null;
const check = (name, fn) => { fn(); checks.push(name); console.log(`PASS ${name}`); };

const dir = new URL('../data/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dir));
const demBuf = gunzipSync(read('dem240.i16.gz'));
const dem = new Dem(new Int16Array(demBuf.buffer, demBuf.byteOffset, demBuf.byteLength / 2), JSON.parse(read('dem240.json')));
const ephBuf = read('ephemeris.f64');
const eph = new Ephemeris(ephBuf.buffer.slice(ephBuf.byteOffset, ephBuf.byteOffset + ephBuf.byteLength), JSON.parse(read('ephemeris.json')));
const startIndex = eph.indexOf(Date.parse('2030-01-01T00:00:00Z'));
const scenario = { startIndex, stayH: 709, marginDeg: 2 };
const deg = Math.PI / 180;

check('projection round-trips and the study boundary is south of the raster edge', () => {
  for (const [lat, lon] of [[-90, 0], [-89.6, 200], [-85, 123.4], [-80, 359.9]]) {
    const p = project(lat, lon);
    const back = unproject(p.xKm, p.yKm);
    assert.ok(Math.abs(back.lat - lat) < 1e-9 && Math.abs(((back.lon - lon + 540) % 360) - 180) < 1e-9, `${lat},${lon}`);
  }
  assert.equal(STUDY_LAT, -85);
  assert.equal(DEM_FOOTPRINT_LAT, -75);
  assert.ok(Number.isNaN(dem.height(-74.9 * deg, 0)), 'the raster stops just north of 75°S');
});

check('grid geometry is fixed while the scenario changes', () => {
  const fine = gridGeometry(8), coarse = gridGeometry(4);
  assert.equal(fine.cells, 8);
  assert.equal(fine.cellKm, 2);
  assert.equal(coarse.cellKm, 4);
  assert.equal(fine.boundsKm.xMax - fine.boundsKm.xMin, 16);
  assert.deepEqual(fine.boundsKm, coarse.boundsKm, 'both resolutions cover the same bounds');
  assert.equal(fine.demResM, 240);
  for (const c of cellCenters(8)) assert.ok(c.lat <= STUDY_LAT, `cell inside the study area (${c.lat})`);
  const again = gridGeometry(8);
  assert.deepEqual(fine, again);
});

check('one cell matches a native Site with the same skyline', () => {
  const centre = cellCenters(4).find((c) => c.row === 2 && c.col === 2);
  const hor = computeHorizon(dem, centre.lat, centre.lon, { minRangeM: 480 });
  assert.ok(hor, 'skyline computed');
  const stats = earthStats(eph, centre.lat, centre.lon, hor.groundM, hor.horizon, scenario);
  assert.ok(stats);
  const site = new Site({
    id: 'grid-cell', lat: centre.lat, lon: centre.lon, groundM: hor.groundM,
    horizon: Array.from(hor.horizon), mastM: 0.002, terrain: 'LOLA 240 m',
  }, eph);
  let open = 0, run = 0, longest = 0;
  for (let h = 0; h < scenario.stayH; h++) {
    if (site.series.earthClr[scenario.startIndex + h] > scenario.marginDeg) { open++; run++; longest = Math.max(longest, run); } else run = 0;
  }
  assert.equal(Math.round(stats.earthPct * 10), Math.round((100 * open / scenario.stayH) * 10), 'Earth share matches the native series');
  assert.equal(stats.longestH, longest, 'longest Earth window matches the native series');
  console.log(`     cell ${centre.lat.toFixed(3)}°, ${centre.lon.toFixed(1)}°E: ${stats.earthPct.toFixed(1)}% Earth, ${longest} h window`);
});

check('hard-limit failure is red and never scores; targets only make yellow', () => {
  const base = { groundM: 1000, slopeDeg: 8, horizonDeg: new Float32Array(720), stats: { earthPct: 45, longestH: 200, geometricPct: 60 } };
  assert.equal(classify(base).status, 'green');
  assert.equal(classify({ ...base, slopeDeg: 12 }).status, 'yellow');
  assert.equal(classify({ ...base, stats: { ...base.stats, earthPct: 30 } }).status, 'yellow');
  const red = classify({ ...base, slopeDeg: 20 });
  assert.equal(red.status, 'red');
  assert.equal(red.score, null, 'a failed hard limit cannot carry a ranking score');
  assert.deepEqual(red.failed, ['slope']);
  const unknown = classify({ ...base, groundM: NaN });
  assert.equal(unknown.status, 'unknown');
  assert.deepEqual(unknown.failed, ['no-data']);
  const bad = normalizeThresholds({ maxSlopeDeg: -1, minEarthPct: 10, minWindowH: 10 }, DEFAULT_TARGETS);
  assert.equal(bad.ok, false);
  const clamped = normalizeThresholds(DEFAULT_LIMITS, { slopeDeg: 99, earthPct: 1, windowH: 1 });
  assert.equal(clamped.targets.slopeDeg, DEFAULT_LIMITS.maxSlopeDeg, 'a target cannot exceed its hard limit');
  assert.equal(clamped.targets.earthPct, DEFAULT_LIMITS.minEarthPct);
});

check('pilot grid demonstrates green, yellow, red and an unknown edge cell', () => {
  const counts = { green: 0, yellow: 0, red: 0, unknown: 0 };
  let green = null;
  const t0 = performance.now();
  for (const c of cellCenters(8)) {
    const hor = computeHorizon(dem, c.lat, c.lon, { minRangeM: 480 });
    const stats = hor ? earthStats(eph, c.lat, c.lon, hor.groundM, hor.horizon, scenario) : null;
    const result = classify({ groundM: hor?.groundM, slopeDeg: hor?.slopeDeg, horizonDeg: hor?.horizon, stats }, DEFAULT_LIMITS, DEFAULT_TARGETS);
    counts[result.status]++;
    if (result.status === 'green' && !green) green = { cell: c, hor, stats, result };
    if (!pilot && stats && stats.earthPct > 20) pilot = { cell: c, hor, stats };
  }
  const ms = performance.now() - t0;
  assert.ok(counts.green >= 1 && counts.yellow >= 1 && counts.red >= 1, `status mix: ${JSON.stringify(counts)}`);
  const edge = { lat: -74.9, lon: 0 };
  const edgeGround = dem.height(edge.lat * deg, edge.lon * deg);
  const edgeResult = classify({ groundM: edgeGround, slopeDeg: NaN, horizonDeg: null, stats: null }, DEFAULT_LIMITS, DEFAULT_TARGETS);
  assert.equal(edgeResult.status, 'unknown', 'outside the raster is unknown, never red');
  console.log(`     ${JSON.stringify(counts)} in ${ms.toFixed(0)} ms; green at ${green.cell.lat.toFixed(3)}°, ${green.cell.lon.toFixed(1)}°E (${green.stats.earthPct.toFixed(1)}%, ${green.stats.longestH} h)`);
});

check('date and margin change the scenario fields, not the terrain fields', () => {
  assert.ok(pilot, 'a pilot cell with usable visibility');
  const centre = pilot.cell, hor = pilot.hor;
  const a = earthStats(eph, centre.lat, centre.lon, hor.groundM, hor.horizon, scenario);
  const dateLater = earthStats(eph, centre.lat, centre.lon, hor.groundM, hor.horizon, { ...scenario, startIndex: startIndex + 24 * 90 });
  const margin5 = earthStats(eph, centre.lat, centre.lon, hor.groundM, hor.horizon, { ...scenario, marginDeg: 5 });
  assert.ok(margin5.earthPct <= a.earthPct, 'a larger margin cannot increase visibility');
  assert.notEqual(dateLater.earthPct, a.earthPct, 'a later date changes visibility');
  const again = computeHorizon(dem, centre.lat, centre.lon, { minRangeM: 480 });
  assert.equal(again.groundM, hor.groundM, 'terrain fields stay fixed');
  assert.deepEqual(Array.from(again.horizon), Array.from(hor.horizon));
});

console.log(`\n${checks.length} checks passed. Region ${REGION.centerLat}°, ${REGION.centerLon}°E ±${REGION.halfKm} km.`);
