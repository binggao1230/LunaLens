// Check our own sunlight numbers against NASA's long-term illumination map.
//
// The reference for "how much of the time is this ground lit" is PGDA product 69 (Mazarico et al. 2011),
// 18.6 years over the 120 m LOLA grid. The Atlas page ships it as a 2048² WebP on the south polar
// stereographic grid; this script reads that same file, samples our 240 m elevation grid at matching
// points, computes each point's skyline with the engine's own ray march, then compares the share of
// hours the Sun is above that skyline across the whole ephemeris with NASA's value.
//
// Output: Spearman rank correlation, Pearson correlation, mean and RMS difference in percentage points,
// and the worst point, printed as a table the Data page can quote.
//
//   node site/tools/check_pgda.mjs [samples]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Dem, computeHorizon } from '../js/engine/dem.js';
import { Ephemeris } from '../js/engine/ephemeris.js';
import { siteBasis, azEl, sunAngularRadiusDeg } from '../js/engine/geometry.js';

const here = dirname(fileURLToPath(import.meta.url));
const SITE = join(here, '..');
const ATLAS = join(SITE, 'atlas', 'data');
const SIZE = 2048, HALF_KM = 304, R_KM = 1737.4;
const samples = Number(process.argv[2] ?? 60);

// --- NASA layer, as 8-bit grey ---------------------------------------------------------
const rawPath = '/tmp/pgda_sun_avg.gray';
mkdirSync('/tmp', { recursive: true });
execFileSync('magick', [join(ATLAS, 'layers', 'sun_avg.png'), '-depth', '8', `gray:${rawPath}`]);
const nasa = new Uint8Array(readFileSync(rawPath));
if (nasa.length !== SIZE * SIZE) throw new Error(`expected ${SIZE * SIZE} bytes, got ${nasa.length}`);

/** NASA's share at a point, or null where the raster has no value. */
function nasaAt(lat, lon) {
  const r = 2 * R_KM * Math.tan(((90 + lat) * Math.PI) / 360);
  const a = (lon * Math.PI) / 180;
  const x = r * Math.sin(a), y = r * Math.cos(a);
  const col = Math.floor(((x + HALF_KM) / (2 * HALF_KM)) * SIZE);
  const row = Math.floor(((HALF_KM - y) / (2 * HALF_KM)) * SIZE);
  if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) return null;
  const v = nasa[row * SIZE + col];
  return v >= 255 ? null : v / 250;
}

// --- our grid and ephemeris -------------------------------------------------------------
const dem = (() => {
  const meta = JSON.parse(readFileSync(join(SITE, 'data', 'dem240.json'), 'utf8'));
  const buf = gunzipSync(readFileSync(join(SITE, 'data', meta.file)));
  return { dem: new Dem(new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2), meta), meta };
})();

const ephMeta = JSON.parse(readFileSync(join(SITE, 'data', 'ephemeris.json'), 'utf8'));
const ephBuf = readFileSync(join(SITE, 'data', 'ephemeris.f64'));
const eph = new Ephemeris(ephBuf.buffer.slice(ephBuf.byteOffset, ephBuf.byteOffset + ephBuf.byteLength), ephMeta);

function ourShare(lat, lon) {
  const horizon = computeHorizon(dem.dem, lat, lon, { minRangeM: 480 });
  const basis = siteBasis(lat, lon, (horizon.groundM ?? 0) / 1000 + 0.002);
  const azStep = 360 / horizon.horizon.length;
  const step = Math.max(1, Math.floor(eph.n / 4000));   // every 4th hour keeps the run short
  let lit = 0, total = 0;
  const tmp = { az: 0, el: 0 };
  for (let i = 0; i < eph.n; i += step) {
    const s = eph.stateAt(i);
    azEl(basis, s[1], s[0], s[2], tmp);
    const x = tmp.az / azStep;
    const i0 = Math.floor(x) % horizon.horizon.length;
    const i1 = (i0 + 1) % horizon.horizon.length;
    const f = x - Math.floor(x);
    const h = horizon.horizon[i0] * (1 - f) + horizon.horizon[i1] * f;
    if (tmp.el + sunAngularRadiusDeg(s[2]) > h) lit++;
    total++;
  }
  return lit / total;
}

// --- points -------------------------------------------------------------------------------
let seed = 20261114;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const points = [];
while (points.length < samples) {
  const r = Math.sqrt(rand()) * HALF_KM;
  const a = rand() * Math.PI * 2;
  const lat = (2 * Math.atan(r / (2 * R_KM)) * 180) / Math.PI - 90;
  let lon = (Math.atan2(r * Math.sin(a), r * Math.cos(a)) * 180) / Math.PI;
  if (lon < 0) lon += 360;
  const expected = nasaAt(lat, lon);
  if (expected === null) continue;
  if (!Number.isFinite(dem.dem.height(lat * Math.PI / 180, lon * Math.PI / 180))) continue;
  points.push({ lat, lon, expected, got: ourShare(lat, lon) });
}

const rank = (values) => {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(values.length);
  order.forEach(([, i], position) => { ranks[i] = position + 1; });
  return ranks;
};
const pearson = (xs, ys) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
};

const expected = points.map((p) => p.expected * 100), got = points.map((p) => p.got * 100);
const diffs = got.map((v, i) => v - expected[i]);
const rms = Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length);
const mean = diffs.reduce((a, d) => a + d, 0) / diffs.length;
const worst = points.map((p, i) => ({ ...p, diff: diffs[i] })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];

console.log(`points: ${points.length}  (whole ephemeris, every ${Math.max(1, Math.floor(eph.n / 4000))}. hour)`);
console.log(`Spearman r: ${pearson(rank(expected), rank(got)).toFixed(3)}`);
console.log(`Pearson  r: ${pearson(expected, got).toFixed(3)}`);
console.log(`mean diff: ${mean.toFixed(2)} points, RMS: ${rms.toFixed(2)} points`);
console.log(`worst: ${worst.lat.toFixed(2)}° ${worst.lon.toFixed(1)}°E  NASA ${(worst.expected * 100).toFixed(1)}%  ours ${(worst.got * 100).toFixed(1)}%  (${worst.diff.toFixed(1)})`);

writeFileSync('/tmp/pgda_check.json', JSON.stringify({
  samples: points.length, spearman: pearson(rank(expected), rank(got)), pearson: pearson(expected, got),
  meanDiff: mean, rms, worst,
}, null, 2));
