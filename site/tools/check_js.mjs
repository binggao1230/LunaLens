// Cross-check the browser engine against the Python reference. Run: node check_js.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';
import { windowMetrics, nextTransition, nextMarginTransition } from '../js/engine/metrics.js';
import { Dem, computeHorizon } from '../js/engine/dem.js';
import { siteBasis, azEl } from '../js/engine/geometry.js';

const dir = new URL('../data/', import.meta.url);
const buf = readFileSync(new URL('ephemeris.f64', dir));
const eph = new Ephemeris(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), JSON.parse(readFileSync(new URL('ephemeris.json', dir))));
const raw = JSON.parse(readFileSync(new URL('sites.json', dir)));
const sites = raw.sites.map((s) => new Site({ ...s, mastM: 0.002 }, eph));
const py = JSON.parse(execFileSync('python3', ['reference_metrics.py', '--json'], { cwd: fileURLToPath(new URL('.', import.meta.url)) }).toString());

let worst = 0;
const windows = { w30: [eph.indexOf(Date.parse('2026-11-14T00:00:00Z')), 30 * 24], y2027: [eph.indexOf(Date.parse('2027-01-01T00:00:00Z')), 365 * 24] };
for (const [label, [i0, n]] of Object.entries(windows)) {
  console.log(`\n${label}   site                 sun% JS/PY      earth% JS/PY     both% JS/PY   maxDark JS/PY`);
  for (const s of sites) {
    const m = windowMetrics(s.series, i0, i0 + n), p = py[label][s.id];
    const d = Math.max(Math.abs(m.sunPct - p.sun_pct), Math.abs(m.earthPct - p.earth_pct), Math.abs(m.bothPct - p.both_pct), Math.abs(m.longestDarkH - p.longest_dark_h) / 10);
    worst = Math.max(worst, d);
    assert.ok(d < 1e-9, `${label}/${s.id}: browser/Python metrics differ by ${d}`);
    assert.equal(m.longestNoCommH, p.longest_nocomm_h, `${label}/${s.id}: Earth gap differs`);
    console.log(`        ${s.id.padEnd(18)} ${m.sunPct.toFixed(1).padStart(6)}/${p.sun_pct.toFixed(1).padEnd(6)}  ${m.earthPct.toFixed(1).padStart(6)}/${p.earth_pct.toFixed(1).padEnd(6)}  ${m.bothPct.toFixed(1).padStart(6)}/${p.both_pct.toFixed(1).padEnd(6)}  ${String(m.longestDarkH).padStart(4)}/${p.longest_dark_h}`);
  }
}
console.log(`\nworst metric difference JS vs Python: ${worst.toFixed(3)} (pct points; hours/10)`);

const demBuf = gunzipSync(readFileSync(new URL('dem240.i16.gz', dir)));
const dem = new Dem(new Int16Array(demBuf.buffer, demBuf.byteOffset, demBuf.byteLength / 2), JSON.parse(readFileSync(new URL('dem240.json', dir))));
console.log('\nBrowser-side skyline (240 m DEM only) vs precomputed skyline');
for (const s of sites.filter((x) => x.hasTerrain)) {
  const t0 = performance.now();
  const r = computeHorizon(dem, s.lat, s.lon, { minRangeM: s.minRangeM });
  const ms = performance.now() - t0;
  let maxDiff = 0, sumSq = 0;
  r.horizon.forEach((v, i) => { const d = Math.abs(v - s.horizonDeg[i]); maxDiff = Math.max(maxDiff, d); sumSq += d * d; });
  const same = s.terrain === 'LOLA 240 m';
  if (same) assert.ok(maxDiff < 0.02, `${s.id}: 240 m skyline differs by ${maxDiff}°`);
  console.log(`  ${s.id.padEnd(17)} ${s.terrain.padEnd(18)} ground ${r.groundM.toFixed(1).padStart(7)} vs ${String(s.groundM).padEnd(7)}  max|diff| ${maxDiff.toFixed(3).padStart(6)}°  rms ${Math.sqrt(sumSq / r.horizon.length).toFixed(3)}°  ${same ? (maxDiff < 0.02 ? 'PASS (same data)' : 'FAIL') : 'info: 40 m near-field vs 240 m only'}  ${ms.toFixed(0)} ms`);
}

const s = sites.find((x) => x.id === 'shackleton-rim');
const from = eph.indexOf(Date.parse('2026-11-14T12:00:00Z'));
console.log('\nShackleton rim, 2026-11-14 12:00Z:');
for (const w of ['sun', 'earth']) {
  const nt = nextTransition(s, w, from);
  console.log(' ', w, nt.kind, nt.timeMs ? new Date(nt.timeMs).toISOString() : '', 'currently visible:', nt.state);
  assert.notEqual(nt.kind, 'none', `${w}: expected a transition in the data`);
  const edge = eph.indexOf(nt.timeMs);
  assert.equal(s.visibleAt(w, edge - 0.001), nt.state, `${w}: wrong state before transition`);
  assert.notEqual(s.visibleAt(w, edge + 0.001), nt.state, `${w}: no state change at transition`);
}

// archive/doc/PLAN.md §2.2: JPL Horizons, lunar surface observer at 222.69°E, 89.45°S, 0 km, target Earth.
// 2027-01-01 00:00 UT -> Az 144.4607°, El -6.6957°. The table is hourly and this instant is on the hour,
// so no interpolation difference is expected; measured on 2026-11-14: 0.0015° in azimuth, 0.0005° in
// elevation, which is what rounding the published fixture to four decimals explains. Tolerance 0.01°,
// the target in archive/doc/PLAN.md §2.2.
{
  const fixture = { az: 144.4607, el: -6.6957 };
  const i = eph.indexOf(Date.parse('2027-01-01T00:00:00Z'));
  const state = eph.stateAt(i);
  const got = azEl(siteBasis(-89.45, 222.69, 0), state[4], state[3], state[5]);
  const dAz = Math.abs(((got.az - fixture.az + 540) % 360) - 180), dEl = Math.abs(got.el - fixture.el);
  console.log(`\nHorizons fixture (archive/doc/PLAN.md §2.2): Az ${got.az.toFixed(4)} vs ${fixture.az} (${dAz.toFixed(4)}°), El ${got.el.toFixed(4)} vs ${fixture.el} (${dEl.toFixed(4)}°)`);
  assert.ok(dAz < 0.01 && dEl < 0.01, `Horizons fixture: azimuth differs by ${dAz.toFixed(4)}°, elevation by ${dEl.toFixed(4)}°`);
}

// Expert event meanings (TODO W1.3, C3.4): a link margin closes the window earlier than the
// geometric Earthset, and the geometric event is independent of the margin.
{
  const s = sites.find((x) => x.id === 'im1');
  const i = s.series.earthClr.findIndex((v, k) => v > 3 && v < 4.5 && s.series.earthVis[k] === 1);
  assert.ok(i >= 0, 'im1 must have a sample between 3° and 4.5° clearance');
  const geo = nextTransition(s, 'earth', i);
  const m2 = nextMarginTransition(s, 2, i), m5 = nextMarginTransition(s, 5, i);
  assert.equal(m2.state, true, '2° margin is open');
  assert.equal(m5.state, false, '5° margin is closed at the same instant');
  assert.notEqual(m2.kind, m5.kind, 'the margin crossing differs from the geometric event');
  console.log(`\nMargin vs geometry (im1, ${new Date(eph.timeOf(i)).toISOString()}, clearance ${s.series.earthClr[i].toFixed(2)}°): geometric ${geo.kind}; 2° ${m2.kind}; 5° ${m5.kind}`);
}
