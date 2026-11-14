// Compare the browser engine, using the same rules as js/app.js, with the team
// backend (backend/lunalens/windows) run on the same real inputs.
// Run: node tools/check_team.mjs [path-to-backend] [python]
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const backend = process.argv[2] ?? `${here}../../backend`;
const python = process.argv[3] ?? `${backend}/.venv/bin/python`;
const dir = new URL('../data/', import.meta.url);
const buf = readFileSync(new URL('ephemeris.f64', dir));
const eph = new Ephemeris(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), JSON.parse(readFileSync(new URL('ephemeris.json', dir))));
const sites = JSON.parse(readFileSync(new URL('sites.json', dir))).sites.map((raw) => new Site(raw, eph));

const SUN_R = 0.265, START = '2026-11-14T00:00:00Z', HOURS = 709;
const diskFrac = (h) => { const x = h / SUN_R; return x >= 1 ? 1 : x <= -1 ? 0 : 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI; };
const base = Math.round(eph.indexOf(Date.parse(START)));

let worstDisk = 0;
for (const margin of [2, 5]) {
  const py = JSON.parse(execFileSync(python, [`${here}backend_reference.py`, backend, START, String(HOURS), String(margin)], { maxBuffer: 1 << 28 }).toString());
  console.log(`\nmargin ${margin} deg, ${HOURS} h from ${START}   sunlit h JS/PY   link h JS/PY   longest sun JS/PY`);
  for (const s of sites) {
    const q = s.series, p = py[s.id];
    let lit = 0, link = 0, run = 0, best = 0, sunDiff = 0, linkDiff = 0;
    for (let i = 0; i < HOURS; i++) {
      const j = base + i, frac = diskFrac(q.sunEl[j] - q.sunHor[j]);
      const up = frac > 0 ? 1 : 0, open = q.earthEl[j] > q.earthHor[j] + margin ? 1 : 0;
      if (up) { lit++; run++; best = Math.max(best, run); } else run = 0;
      link += open;
      sunDiff += up !== p.sun[i]; linkDiff += open !== p.link[i];
      worstDisk = Math.max(worstDisk, Math.abs(frac - p.disk[i]));
    }
    console.log(`  ${s.id.padEnd(18)} ${String(lit).padStart(4)}/${String(p.metrics.sunlit_hours).padEnd(4)}  ${String(link).padStart(4)}/${String(p.metrics.link_hours).padEnd(4)}  ${String(best).padStart(4)}/${p.metrics.longest_sunlit_h}   hourly mismatches sun ${sunDiff}, link ${linkDiff}`);
    assert.equal(sunDiff, 0, `${s.id}: sunlight flags differ in ${sunDiff} hours`);
    assert.equal(linkDiff, 0, `${s.id}: link flags differ in ${linkDiff} hours`);
    assert.equal(lit, p.metrics.sunlit_hours, `${s.id}: sunlit hours`);
    assert.equal(link, p.metrics.link_hours, `${s.id}: link hours`);
    assert.equal(best, p.metrics.longest_sunlit_h, `${s.id}: longest sunlit run`);
  }
}
console.log(`\nlargest sun-disk-fraction difference: ${worstDisk.toExponential(2)}`);
assert.ok(worstDisk < 1e-3, 'disk fractions differ');
console.log('PASS');
