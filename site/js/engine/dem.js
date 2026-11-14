const DEG = Math.PI / 180;
const R = 1737400;

/** 240 m LOLA polar-stereographic DEM (75°S–pole), used to compute skylines for custom coordinates. */
export class Dem {
  constructor(int16, meta) {
    this.dn = int16;
    this.n = meta.n;
    this.res = meta.resM;
    this.scale = meta.scaleM;
    this.c = (meta.n - 1) / 2;
  }

  /** Height in metres relative to the 1737.4 km sphere, or NaN outside the raster. */
  height(latRad, lonRad) {
    const rho = 2 * R * Math.tan(Math.PI / 4 + latRad / 2);
    const col = this.c + (rho * Math.sin(lonRad)) / this.res;
    const row = this.c - (rho * Math.cos(lonRad)) / this.res;
    if (!(row >= 0 && col >= 0 && row <= this.n - 1.001 && col <= this.n - 1.001)) return NaN;
    const r0 = Math.floor(row), c0 = Math.floor(col);
    const fr = row - r0, fc = col - c0;
    const n = this.n, d = this.dn, s = this.scale;
    const i = r0 * n + c0;
    return s * (d[i] * (1 - fr) * (1 - fc) + d[i + 1] * (1 - fr) * fc + d[i + n] * fr * (1 - fc) + d[i + n + 1] * fr * fc);
  }
}

export async function loadDem(baseUrl = 'data/dem240', onProgress = () => {}) {
  const meta = await (await fetch(`${baseUrl}.json`)).json();
  const res = await fetch(`data/${meta.file}`);
  if (!res.ok) throw new Error('Could not load terrain data');
  const total = Number(res.headers.get('content-length')) || 0;
  let received = 0;
  const counter = new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (total) onProgress(received / total);
      controller.enqueue(chunk);
    },
  });
  const stream = res.body.pipeThrough(counter).pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  onProgress(1);
  return new Dem(new Int16Array(buffer), meta);
}

function rangesFor(minRangeM) {
  const out = [];
  for (let s = Math.max(minRangeM, 40); s < 10000; s += 40) out.push(s);
  for (let s = 10000; s < 60000; s += 120) out.push(s);
  for (let s = 60000; s < 460000; s += 240) out.push(s);
  return out;
}

/** Skyline elevation (deg) per azimuth for a site, sphere-aware. Mirrors tools/horizon.py with a single 240 m grid. */
export function computeHorizon(dem, latDeg, lonDeg, { mastM = 2, azStepDeg = 0.5, minRangeM = 480 } = {}) {
  const lat = latDeg * DEG, lon = lonDeg * DEG;
  const ground = dem.height(lat, lon);
  if (!Number.isFinite(ground)) return null;
  const rp = R + ground + mastM;
  const up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const px = rp * up[0], py = rp * up[1], pz = rp * up[2];
  const ranges = rangesFor(minRangeM);
  const count = Math.round(360 / azStepDeg);
  const out = new Float32Array(count);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
  for (let a = 0; a < count; a++) {
    const az = a * azStepDeg * DEG;
    const sinAz = Math.sin(az), cosAz = Math.cos(az);
    let best = -2;
    for (let k = 0; k < ranges.length; k++) {
      const d = ranges[k] / R;
      const sinD = Math.sin(d), cosD = Math.cos(d);
      const lat2 = Math.asin(sinLat * cosD + cosLat * sinD * cosAz);
      const lon2 = lon + Math.atan2(sinAz * sinD * cosLat, cosD - sinLat * Math.sin(lat2));
      const h = dem.height(lat2, lon2);
      if (!Number.isFinite(h)) continue;
      const r = R + h;
      const qx = r * Math.cos(lat2) * Math.cos(lon2) - px;
      const qy = r * Math.cos(lat2) * Math.sin(lon2) - py;
      const qz = r * Math.sin(lat2) - pz;
      const s = (qx * up[0] + qy * up[1] + qz * up[2]) / Math.hypot(qx, qy, qz);
      if (s > best) best = s;
    }
    out[a] = Math.asin(Math.max(-1, Math.min(1, best))) / DEG;
  }
  return { horizon: out, groundM: ground };
}
