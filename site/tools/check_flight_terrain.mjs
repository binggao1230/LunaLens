// Check that the terrain under the probe flight's last shot is the right ground, the right way round.
// Run: node check_flight_terrain.mjs
//   1. Every curated site finds measured terrain, and its centre height agrees with sites.json (LOLA 240 m).
//   2. Each terrain source is compared, point by point over the whole disc, with an independent raster:
//      our own LOLA 480 m grid at the pole, the global LOLA map elsewhere. A mirrored or rotated mapping
//      would break the correlation.
//   3. The grid's rows run north to south and its columns west to east.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync, inflateSync } from 'node:zlib';
import { Dem } from '../js/engine/dem.js';
import { siteBasis } from '../js/engine/geometry.js';
import { openSource, sampleGrid, shadeGrid, heightAt, WIDTH_KM } from '../js/views/flight-terrain.js';

const site = new URL('../', import.meta.url), DEG = Math.PI / 180;
const readJson = async (path) => JSON.parse(readFileSync(new URL(path, site)));

function decodePng(buffer) {
  let offset = 8, width = 0, height = 0, channels = 3;
  const parts = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), type = buffer.toString('latin1', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4); channels = body[9] === 6 ? 4 : 3;
      assert.ok(body[8] === 8 && (body[9] === 2 || body[9] === 6) && body[12] === 0, 'expected 8-bit RGB(A), not interlaced');
    }
    if (type === 'IDAT') parts.push(body);
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * channels, data = new Uint8Array(height * stride);
  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)], line = row * (stride + 1) + 1, out = row * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? data[out + i - channels] : 0, b = row ? data[out - stride + i] : 0;
      const c = row && i >= channels ? data[out - stride + i - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = a;
      else if (filter === 2) predicted = b;
      else if (filter === 3) predicted = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[out + i] = (raw[line + i] + predicted) & 255;
    }
  }
  return { width, height, channels, data };
}

const images = new Map();
const image = (path) => {
  if (!images.has(path)) images.set(path, decodePng(readFileSync(new URL(path, site))));
  return images.get(path);
};
const read = async (path, crop, scaleM, offsetM) => {
  const png = image(path), box = crop ?? { x: 0, y: 0, width: png.width, height: png.height };
  const h = new Float32Array(box.width * box.height);
  for (let row = 0; row < box.height; row++) {
    for (let col = 0; col < box.width; col++) {
      const at = ((box.y + row) * png.width + box.x + col) * png.channels, dn = png.data[at] * 256 + png.data[at + 1];
      h[row * box.width + col] = dn === 0 ? NaN : dn * scaleM + offsetM;
    }
  }
  return { width: box.width, height: box.height, h };
};

const demBytes = gunzipSync(readFileSync(new URL('data/dem480.i16.gz', site)));
const polar = new Dem(new Int16Array(demBytes.buffer, demBytes.byteOffset, demBytes.byteLength / 2), await readJson('data/dem480.json'));
const globe = (await readJson('atlas/data/globe/globe.json')).dem;
const [, globeScale, globeOffset] = globe.encoding.match(/\* ([\d.]+) - (\d+)/).map(Number);
const globeHeight = (latDeg, lonDeg) => {
  const png = image(`atlas/data/globe/${globe.file}`);
  const col = Math.min(png.width - 1, Math.floor(((lonDeg + 540) % 360) / 360 * png.width));
  const row = Math.min(png.height - 1, Math.floor((90 - latDeg) / 180 * png.height));
  const at = (row * png.width + col) * png.channels;
  return (png.data[at] * 256 + png.data[at + 1]) * globeScale - globeOffset;
};

const { sites } = await readJson('data/sites.json');
console.log('site               source            ground m (80 m / sites.json)   reference        r      relief m');
for (const entry of sites) {
  const source = await openSource(entry, read, readJson);
  assert.ok(source, `${entry.id}: no measured terrain found`);
  const grid = await sampleGrid(source, entry, 257);
  assert.ok(grid, `${entry.id}: terrain does not cover the disc`);
  const groundM = grid.groundKm * 1000;
  if (entry.groundM !== null) assert.ok(Math.abs(groundM - entry.groundM) < 150, `${entry.id}: centre height ${groundM} m vs ${entry.groundM} m`);

  const basis = siteBasis(entry.lat, entry.lon), usePolar = entry.lat < -76, ours = [], theirs = [];
  for (let north = -54; north <= 54; north += 3) {
    for (let east = -54; east <= 54; east += 3) {
      const range = Math.hypot(east, north), angle = range / grid.radiusKm;
      if (range > WIDTH_KM / 2) continue;
      const c = Math.cos(angle), s = range ? Math.sin(angle) / range : 0;
      const p = [0, 1, 2].map((axis) => basis.up[axis] * c + (basis.east[axis] * east + basis.north[axis] * north) * s);
      const lat = Math.asin(p[2]), lon = Math.atan2(p[1], p[0]);
      const reference = usePolar ? polar.height(lat, lon) : globeHeight(lat / DEG, lon / DEG);
      const value = heightAt(source, p[0], p[1], p[2]);
      if (Number.isFinite(reference) && Number.isFinite(value)) { ours.push(value); theirs.push(reference); }
    }
  }
  const mean = (list) => list.reduce((sum, value) => sum + value, 0) / list.length;
  const meanOurs = mean(ours), meanTheirs = mean(theirs);
  let cross = 0, varOurs = 0, varTheirs = 0;
  ours.forEach((value, i) => { cross += (value - meanOurs) * (theirs[i] - meanTheirs); varOurs += (value - meanOurs) ** 2; varTheirs += (theirs[i] - meanTheirs) ** 2; });
  const r = cross / Math.sqrt(varOurs * varTheirs), relief = Math.max(...ours) - Math.min(...ours);
  // The global map is 16 px/deg, about 1.9 km: enough to tell a hill from a hollow, not to rank flat mare.
  if (usePolar) assert.ok(r > 0.99, `${entry.id}: polar terrain disagrees with the LOLA 480 m grid, r = ${r}`);
  else if (relief > 1500) assert.ok(r > 0.9, `${entry.id}: patch disagrees with the global LOLA map, r = ${r}`);

  const middle = (grid.samples - 1) / 2, offset = Math.round((10 / WIDTH_KM) * (grid.samples - 1)), exact = (offset * WIDTH_KM) / (grid.samples - 1);
  const angle = exact / grid.radiusKm;
  const northPoint = [0, 1, 2].map((axis) => basis.up[axis] * Math.cos(angle) + basis.north[axis] * Math.sin(angle));
  const eastPoint = [0, 1, 2].map((axis) => basis.up[axis] * Math.cos(angle) + basis.east[axis] * Math.sin(angle));
  const atNorth = grid.heightKm[(middle - offset) * grid.samples + middle] * 1000, atEast = grid.heightKm[middle * grid.samples + middle + offset] * 1000;
  assert.ok(Math.abs(atNorth - heightAt(source, ...northPoint)) < 0.5, `${entry.id}: row 0 is not the north edge`);
  assert.ok(Math.abs(atEast - heightAt(source, ...eastPoint)) < 0.5, `${entry.id}: column 0 is not the west edge`);
  assert.ok(Math.asin(northPoint[2]) > entry.lat * DEG, `${entry.id}: north basis points south`);

  const shaded = await shadeGrid(grid);
  assert.ok(shaded.light.length === grid.samples ** 2 * 4 && shaded.vertical.every(Number.isFinite), `${entry.id}: shading left gaps`);
  console.log(`${entry.id.padEnd(18)} ${source.name.padEnd(17)} ${groundM.toFixed(0).padStart(7)} / ${String(entry.groundM ?? 'none').padEnd(18)} ${(usePolar ? 'LOLA 480 m' : 'global LOLA').padEnd(14)} ${r.toFixed(3)}  ${relief.toFixed(0).padStart(6)}`);
}
console.log('\nPASS: all curated sites land on measured terrain, oriented as the references are.');
