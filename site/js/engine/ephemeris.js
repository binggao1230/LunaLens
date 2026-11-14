export const R_MOON_KM = 1737.4;
export const SUN_RADIUS_KM = 695700;
export const EARTH_RADIUS_KM = 6371;
export const HOUR_MS = 3600 * 1000;

export class Ephemeris {
  constructor(buffer, meta) {
    this.data = new Float64Array(buffer);
    this.meta = meta;
    this.n = meta.count;
    this.t0 = Date.parse(meta.start);
    this.stepMs = meta.stepSeconds * 1000;
    if (this.data.length !== this.n * 6) {
      throw new Error(`Ephemeris size mismatch: ${this.data.length} values for ${this.n} rows`);
    }
  }

  get tEnd() {
    return this.t0 + (this.n - 1) * this.stepMs;
  }

  indexOf(ms) {
    return (ms - this.t0) / this.stepMs;
  }

  timeOf(index) {
    return this.t0 + index * this.stepMs;
  }

  clampIndex(index) {
    return Math.min(Math.max(index, 0), this.n - 1.0001);
  }

  stateAt(index, out = new Float64Array(6)) {
    const clamped = this.clampIndex(index);
    const i0 = Math.floor(clamped);
    const f = clamped - i0;
    const a = i0 * 6;
    const b = a + 6;
    const d = this.data;
    for (let k = 0; k < 6; k++) out[k] = d[a + k] + f * (d[b + k] - d[a + k]);
    return out;
  }
}

export async function loadEphemeris(baseUrl = 'data/ephemeris') {
  const [metaRes, binRes] = await Promise.all([fetch(`${baseUrl}.json`), fetch(`${baseUrl}.f64`)]);
  if (!metaRes.ok || !binRes.ok) throw new Error('Could not load ephemeris data');
  return new Ephemeris(await binRes.arrayBuffer(), await metaRes.json());
}
