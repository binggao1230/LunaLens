// Real terrain under the lander for the last shot of the probe flight, drawn the way the Atlas page draws
// it: measured heights, lit by one Sun with cast shadows, tinted by the whole-Moon colour map.
// Near the site the heights come from the rasters the Atlas already ships: the 80 m and 160 m site patches
// (SLDEM2015) and the south-pole LOLA levels (LDEM_80S_80MPP). Beyond that disc, out past the horizon, they
// come from the Atlas whole-Moon elevation map (LOLA, 16 px/deg). Extents, pixel sizes and height encodings
// are read from atlas/data/patches/patches.json, atlas/data/terrain/sp_meta.json and atlas/data/globe/globe.json.
// The heights are measured; the Sun direction is art-directed, like the rest of the flight.
import { siteBasis } from '../engine/geometry.js';

const ATLAS = 'atlas/data/';
export const WIDTH_KM = 114;
export const FAR_WIDTH_KM = 1040;
export const SUN_ELEVATION_DEG = 9;
// The Atlas exposure rule for a low camera: 1.32 over the sine of the Sun's elevation, held to 1.32..8.25.
export const EXPOSURE = Math.min(8.25, Math.max(1.32, 1.32 / Math.sin(SUN_ELEVATION_DEG * Math.PI / 180)));
const SUN_HALF_WIDTH_DEG = 0.6;
// A patch is used when its centre is this close to the site, so the disc stays inside the 160 m ring.
const PATCH_REACH_M = 3000;
const DEG = Math.PI / 180;
const pause = () => new Promise((resolve) => setTimeout(resolve));
const smooth = (low, high, value) => {
  const k = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return k * k * (3 - 2 * k);
};
const encode = (value) => Math.round(255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055));

/** Height in metres above the reference sphere at a unit vector in the Moon-fixed ME frame, or NaN. */
export function heightAt(source, px, py, pz) {
  if (source.constantM !== undefined) return source.constantM;
  if (source.equirect) {
    const { width, rows, top, full, h } = source.equirect;
    const col = (Math.atan2(py, px) / (2 * Math.PI) + 0.5) * width - 0.5;
    const row = Math.min(rows - 1, Math.max(0, (0.5 - Math.asin(Math.min(1, Math.max(-1, pz))) / Math.PI) * full - 0.5 - top));
    const c0 = Math.floor(col), r0 = Math.min(Math.floor(row), rows - 2), fc = col - c0, fr = row - r0;
    const left = ((c0 % width) + width) % width, right = (left + 1) % width, i = r0 * width;
    return (h[i + left] * (1 - fc) + h[i + right] * fc) * (1 - fr) + (h[i + width + left] * (1 - fc) + h[i + width + right] * fc) * fr;
  }
  const { ax, ay, up } = source.frame;
  const along = px * up[0] + py * up[1] + pz * up[2];
  if (along < 0.2) return NaN;
  const k = (2 * source.radiusM) / (1 + along);
  const x = k * (px * ax[0] + py * ax[1] + pz * ax[2]), y = k * (px * ay[0] + py * ay[1] + pz * ay[2]);
  for (const level of source.levels) {
    const col = (x - level.xMin) / level.pixel - 0.5, row = (level.yMax - y) / level.pixel - 0.5;
    if (!(col >= 0 && row >= 0 && col <= level.width - 1 && row <= level.height - 1)) continue;
    const c0 = Math.min(Math.floor(col), level.width - 2), r0 = Math.min(Math.floor(row), level.height - 2);
    const fc = col - c0, fr = row - r0, i = r0 * level.width + c0, h = level.h;
    const value = (h[i] * (1 - fc) + h[i + 1] * fc) * (1 - fr) + (h[i + level.width] * (1 - fc) + h[i + level.width + 1] * fc) * fr;
    if (!Number.isNaN(value)) return value;
  }
  return NaN;
}

/** Pick the rasters that cover the disc around a site. `read(url, crop, scaleM, offsetM)` returns { width, height, h }. */
export async function openSource(site, read, readJson) {
  const here = siteBasis(site.lat, site.lon).up;
  const patches = await readJson(`${ATLAS}patches/patches.json`);
  let best = null, bestDot = Math.cos(PATCH_REACH_M / patches.radius_m);
  for (const patch of patches.patches) {
    if (!patch.outer || patch.render === false) continue;
    const up = siteBasis(patch.lat, patch.lon).up, dot = up[0] * here[0] + up[1] * here[1] + up[2] * here[2];
    if (dot >= bestDot) { best = patch; bestDot = dot; }
  }
  if (best) {
    // Site patches carry no encoding of their own; the Atlas loader reads them with the south-pole one.
    const scale = best.height_scale_m ?? 0.5, offset = best.height_offset_m ?? -10000;
    const [inner, outer] = await Promise.all([
      read(`${ATLAS}patches/${best.file}`, null, scale, offset),
      read(`${ATLAS}patches/${best.outer.file}`, null, scale, offset),
    ]);
    const centred = (raster, pixel) => ({ ...raster, pixel, xMin: (-raster.width * pixel) / 2, yMax: (raster.height * pixel) / 2 });
    const basis = siteBasis(best.lat, best.lon);
    return {
      radiusM: patches.radius_m, name: best.id, grainy: /SLDEM/.test(best.source ?? ''),
      frame: { ax: basis.east, ay: basis.north, up: basis.up },
      levels: [centred(inner, best.pixel_m ?? patches.pixel_m), centred(outer, best.outer.pixel_m)],
    };
  }
  if (site.lat > -75) return null;
  const meta = await readJson(`${ATLAS}terrain/sp_meta.json`);
  // South polar stereographic, lon 0 along +y: the same frame the Atlas terrain uses.
  const k = (2 * meta.radius_m) / (1 - here[2]), x = k * here[1], y = k * here[0];
  const half = (WIDTH_KM / 2 + 3) * 1000 * (k / meta.radius_m);
  const wanted = [];
  for (const entry of [...meta.levels].sort((a, b) => a.pixel_m - b.pixel_m)) {
    const edge = (value) => Math.min(entry.size, Math.max(0, value));
    const x0 = edge(Math.floor((x - half - entry.x_min_m) / entry.pixel_m)), x1 = edge(Math.ceil((x + half - entry.x_min_m) / entry.pixel_m));
    const y0 = edge(Math.floor((entry.y_max_m - y - half) / entry.pixel_m)), y1 = edge(Math.ceil((entry.y_max_m - y + half) / entry.pixel_m));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    wanted.push({ entry, crop: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    if ((x1 - x0) * entry.pixel_m >= 2 * half && (y1 - y0) * entry.pixel_m >= 2 * half) break;
  }
  if (!wanted.length) return null;
  const { scale_m: scale, offset_m: offset } = meta.height_encoding;
  const levels = await Promise.all(wanted.map(async ({ entry, crop }) => ({
    ...(await read(`${ATLAS}terrain/${entry.file}`, crop, scale, offset)),
    pixel: entry.pixel_m, xMin: entry.x_min_m + crop.x * entry.pixel_m, yMax: entry.y_max_m - crop.y * entry.pixel_m,
  })));
  return { radiusM: meta.radius_m, name: 'south pole', frame: { ax: [0, 1, 0], ay: [1, 0, 0], up: [0, 0, -1] }, levels };
}

/** The band of the whole-Moon elevation map that the far field around a site can reach. */
export async function openGlobe(site, read, readJson, { full = false } = {}) {
  const { dem } = await readJson(`${ATLAS}globe/globe.json`);
  const [, scale, offset] = dem.encoding.match(/\* ([\d.]+) - (\d+)/).map(Number);
  const span = (FAR_WIDTH_KM * 0.72 * 1000) / dem.radius_m / DEG + 1;
  const edge = (lat) => Math.min(dem.height, Math.max(0, ((90 - lat) / 180) * dem.height));
  const top = full ? 0 : Math.floor(edge(site.lat + span)), bottom = full ? dem.height : Math.ceil(edge(site.lat - span));
  const band = await read(`${ATLAS}globe/${dem.file}`, { x: 0, y: top, width: dem.width, height: bottom - top }, scale, -offset);
  for (let i = 0; i < band.h.length; i++) if (Number.isNaN(band.h[i])) band.h[i] = 0;
  return { radiusM: dem.radius_m, name: 'whole Moon', equirect: { width: dem.width, rows: bottom - top, top, full: dem.height, h: band.h } };
}

/**
 * The flight's ground axes at a site: `right` points at the Sun's azimuth, `forward` is 90 degrees to its
 * left, and Earth's azimuth lies `earthTurn` radians to the right of `forward`. `earth` is the direction
 * to Earth (mean, no libration) as [right, up, back]. With no `earthTurn` the axes are east and north.
 */
export function flightAxes(site, earthTurn) {
  const { up, east, north } = siteBasis(site.lat, site.lon);
  if (earthTurn === undefined) return { up, right: east, forward: north, earth: [east[0], up[0], -north[0]] };
  const flat = [1 - up[0] * up[0], -up[0] * up[1], -up[0] * up[2]], length = Math.hypot(...flat);
  const toEarth = length > 1e-6 ? flat.map((value) => value / length) : north;
  const beside = [toEarth[1] * up[2] - toEarth[2] * up[1], toEarth[2] * up[0] - toEarth[0] * up[2], toEarth[0] * up[1] - toEarth[1] * up[0]];
  const c = Math.cos(earthTurn), s = Math.sin(earthTurn);
  const forward = toEarth.map((value, axis) => c * value - s * beside[axis]), right = toEarth.map((value, axis) => s * value + c * beside[axis]);
  return { up, right, forward, earth: [right[0], up[0], -forward[0]] };
}

/**
 * Heights on a square grid centred on the site: column 0 is the edge away from `right`, row 0 the `forward`
 * edge (west and north by default). Each value is the height in km above the site's own ground on its
 * tangent plane, so the Moon's curvature is in it.
 */
export async function sampleGrid(source, site, samples, { widthKm = WIDTH_KM, axes = flightAxes(site), groundKm = null, cancelled = () => false, yieldEvery = 0 } = {}) {
  const { up, right, forward } = axes;
  const groundM = groundKm === null ? heightAt(source, up[0], up[1], up[2]) : groundKm * 1000;
  if (Number.isNaN(groundM)) return null;
  const radiusKm = source.radiusM / 1000, reach = widthKm / 2;
  groundKm = groundM / 1000;
  const vertical = new Float32Array(samples * samples), heightKm = new Float32Array(samples * samples);
  let inside = 0, missing = 0, mark = performance.now();
  for (let row = 0; row < samples; row++) {
    const forwardKm = widthKm * (0.5 - row / (samples - 1));
    for (let col = 0; col < samples; col++) {
      const rightKm = widthKm * (col / (samples - 1) - 0.5);
      const range = Math.hypot(rightKm, forwardKm), angle = range / radiusKm;
      const c = Math.cos(angle), s = range ? Math.sin(angle) / range : 0;
      const h = heightAt(source,
        up[0] * c + (right[0] * rightKm + forward[0] * forwardKm) * s,
        up[1] * c + (right[1] * rightKm + forward[1] * forwardKm) * s,
        up[2] * c + (right[2] * rightKm + forward[2] * forwardKm) * s) / 1000;
      const index = row * samples + col;
      if (range <= reach) { inside++; if (Number.isNaN(h)) missing++; }
      heightKm[index] = h;
      vertical[index] = (radiusKm + h) * c - (radiusKm + groundKm);
    }
    if (yieldEvery && performance.now() - mark > yieldEvery) {
      await pause();
      if (cancelled()) return null;
      mark = performance.now();
    }
  }
  if (missing > inside * 0.002) return null;
  return { samples, widthKm, vertical, heightKm, groundKm, radiusKm };
}

/** Mean height in km of the ring just inside the edge of a grid's disc. */
export function ringHeight({ samples, widthKm, heightKm }) {
  const step = widthKm / (samples - 1), reach = widthKm / 2;
  let sum = 0, count = 0;
  for (let row = 0; row < samples; row += 4) {
    for (let col = 0; col < samples; col += 4) {
      const range = Math.hypot(col * step - reach, row * step - reach) / reach, h = heightKm[row * samples + col];
      if (range > 0.8 && range < 0.9 && !Number.isNaN(h)) { sum += h; count++; }
    }
  }
  return count ? sum / count : 0;
}

/** A copy of a height grid after `passes` rounds of a 1-2-1 blur each way; cells next to a gap are left alone. */
function blurred(heights, samples, passes) {
  let from = Float32Array.from(heights), to = new Float32Array(heights.length);
  for (let pass = 0; pass < passes * 2; pass++) {
    const stride = pass % 2 ? samples : 1;
    for (let row = 0; row < samples; row++) {
      for (let col = 0; col < samples; col++) {
        const index = row * samples + col, along = pass % 2 ? row : col;
        const value = along > 0 && along < samples - 1 ? (from[index - stride] + 2 * from[index] + from[index + stride]) / 4 : from[index];
        to[index] = Number.isNaN(value) ? from[index] : value;
      }
    }
    [from, to] = [to, from];
  }
  return from;
}

/**
 * Light a grid as the Atlas does: direct sunlight is the cosine between the ground's normal and the Sun,
 * times how much of the Sun's disc the terrain along the row leaves visible. The Sun sits over the grid's
 * `right` edge at SUN_ELEVATION_DEG. `light` holds that value sRGB-encoded in RGB and the coverage in alpha.
 * With `base` (a coarser grid around this one) the rim is eased onto it and fades out, so it can sit inside.
 * `soften` blurs the heights used for lighting only: SLDEM2015 carries a few metres of stereo noise, which a
 * low Sun turns into grain.
 */
export async function shadeGrid(grid, { base = null, soften = 0, cancelled = () => false, yieldEvery = 0 } = {}) {
  const { samples, widthKm } = grid, vertical = soften ? blurred(grid.vertical, samples, soften) : grid.vertical;
  const step = widthKm / (samples - 1), reach = widthKm / 2;
  const below = (rightKm, backKm) => {
    const scale = (base.samples - 1) / base.widthKm, limit = base.samples - 2;
    const col = (rightKm + base.widthKm / 2) * scale, row = (backKm + base.widthKm / 2) * scale;
    const c0 = Math.min(limit, Math.max(0, Math.floor(col))), r0 = Math.min(limit, Math.max(0, Math.floor(row)));
    const fc = col - c0, fr = row - r0, i = r0 * base.samples + c0, v = base.vertical;
    return (v[i] * (1 - fc) + v[i + 1] * fc) * (1 - fr) + (v[i + base.samples] * (1 - fc) + v[i + base.samples + 1] * fc) * fr;
  };
  const elevation = SUN_ELEVATION_DEG * DEG, sinSun = Math.sin(elevation), cosSun = Math.cos(elevation);
  const dropHigh = step * Math.tan((SUN_ELEVATION_DEG - SUN_HALF_WIDTH_DEG) * DEG);
  const dropLow = step * Math.tan((SUN_ELEVATION_DEG + SUN_HALF_WIDTH_DEG) * DEG);
  const light = new Uint8Array(samples * samples * 4), settled = new Float32Array(samples * samples);
  let padKm = -Infinity, peakKm = -Infinity, mark = performance.now();
  for (let row = 0; row < samples; row++) {
    const above = Math.max(0, row - 1) * samples, under = Math.min(samples - 1, row + 1) * samples;
    const spanRows = (Math.min(samples - 1, row + 1) - Math.max(0, row - 1)) * step;
    let high = -Infinity, low = -Infinity;
    for (let col = samples - 1; col >= 0; col--) {
      const index = row * samples + col, raw = vertical[index];
      const rightKm = col * step - reach, backKm = row * step - reach, fraction = Math.hypot(rightKm, backKm) / reach;
      const floor = base ? below(rightKm, backKm) : 0;
      const value = Number.isNaN(raw) ? floor : raw;
      high -= dropHigh; low -= dropLow;
      const lit = value >= high ? 1 : value <= low ? 0 : (value - low) / (high - low);
      if (value > high) high = value;
      if (value > low) low = value;
      const before = vertical[row * samples + Math.max(0, col - 1)], after = vertical[row * samples + Math.min(samples - 1, col + 1)];
      const spanCols = (Math.min(samples - 1, col + 1) - Math.max(0, col - 1)) * step;
      const slopeRight = (after - before) / spanCols, slopeBack = (vertical[under + col] - vertical[above + col]) / spanRows;
      const facing = Number.isNaN(slopeRight) || Number.isNaN(slopeBack) ? sinSun
        : Math.max(0, (sinSun - slopeRight * cosSun) / Math.hypot(slopeRight, slopeBack, 1));
      light[index * 4] = light[index * 4 + 1] = light[index * 4 + 2] = encode(lit * facing);
      light[index * 4 + 3] = base ? Math.round(255 * (1 - smooth(0.9, 0.985, fraction))) : 255;
      // The outer ring is eased onto the coarser ground around it, just above it, before it fades out.
      const height = Number.isNaN(raw) ? floor : grid.vertical[index];
      settled[index] = base ? height + (floor + 0.02 - height) * smooth(0.76, 0.9, fraction) : height;
      if (fraction * reach < 1.6 && value > padKm) padKm = value;
      if (fraction < 0.9 && value > peakKm) peakKm = value;
    }
    if (yieldEvery && performance.now() - mark > yieldEvery) {
      await pause();
      if (cancelled()) return null;
      mark = performance.now();
    }
  }
  return { samples, widthKm, vertical: settled, light, padKm, peakKm };
}

async function readHeights(url, crop, scaleM, offsetM) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  const blob = await response.blob(), raw = { colorSpaceConversion: 'none', premultiplyAlpha: 'none' };
  const bitmap = crop ? await createImageBitmap(blob, crop.x, crop.y, crop.width, crop.height, raw) : await createImageBitmap(blob, raw);
  const { width, height } = bitmap;
  const context = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data } = context.getImageData(0, 0, width, height), h = new Float32Array(width * height);
  for (let i = 0; i < h.length; i++) {
    const dn = data[i * 4] * 256 + data[i * 4 + 1];
    h[i] = dn === 0 ? NaN : dn * scaleM + offsetM;
  }
  return { width, height, h };
}

/**
 * What the flight needs to draw the ground around a site: the measured disc (`near`), the whole-Moon ground
 * around it (`far`), and the frame, Sun, exposure and Earth direction they share. Null when no measured
 * terrain covers the site.
 */
export async function prepareLanding(site, { compact = false, cancelled = () => false } = {}) {
  const readJson = async (url) => (await fetch(url)).json(), pace = { cancelled, yieldEvery: 7 };
  const [measured, globe] = await Promise.all([
    openSource(site, readHeights, readJson).catch(error => { console.warn(error); return null; }),
    openGlobe(site, readHeights, readJson, { full: true }),
  ]);
  if (cancelled()) return null;
  const source = measured ?? globe;
  const axes = flightAxes(site, compact ? 0.09 : 0.24);
  const near = await sampleGrid(source, site, compact ? 1025 : 1537, { axes, ...pace });
  if (!near || cancelled()) return null;
  const far = await sampleGrid(globe, site, compact ? 769 : 1025, { widthKm: FAR_WIDTH_KM, axes, groundKm: near.groundKm, ...pace });
  const farLit = far && await shadeGrid(far, pace), nearLit = farLit && await shadeGrid(near, { base: far, soften: source.grainy ? 5 : 0, ...pace });
  if (!nearLit) return null;
  const elevation = SUN_ELEVATION_DEG * DEG;
  return {
    near: nearLit, far: farLit, padKm: nearLit.padKm, peakKm: nearLit.peakKm, holeKm: (WIDTH_KM / 2) * 0.895,
    radiusKm: near.radiusKm, groundKm: near.groundKm, globe, regional: !!measured,
    axes, sun: [Math.cos(elevation), Math.sin(elevation), 0], exposure: EXPOSURE,
  };
}
