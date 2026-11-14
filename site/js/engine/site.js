import { azEl, siteBasis, sunAngularRadiusDeg } from './geometry.js';

/**
 * A lunar site plus lazily computed Sun/Earth series over the whole ephemeris.
 * Sun counts as visible when its upper limb clears the terrain skyline; Earth when its centre does.
 */
export class Site {
  constructor(raw, ephemeris) {
    Object.assign(this, raw);
    this.eph = ephemeris;
    this.horizonDeg = raw.horizon ? Float32Array.from(raw.horizon) : null;
    this.azStep = raw.horizon ? 360 / raw.horizon.length : 0.5;
    this.basis = siteBasis(raw.lat, raw.lon, (raw.groundM ?? 0) / 1000 + (raw.mastM ?? 0.002));
    this._series = null;
  }

  get hasTerrain() {
    return this.horizonDeg !== null;
  }

  setHorizon(horizonDeg, groundM, terrainLabel, minRangeM) {
    this.horizonDeg = Float32Array.from(horizonDeg);
    this.azStep = 360 / this.horizonDeg.length;
    this.groundM = groundM;
    this.terrain = terrainLabel;
    this.minRangeM = minRangeM;
    this.basis = siteBasis(this.lat, this.lon, groundM / 1000 + 0.002);
    this._series = null;
  }

  horizonAt(azDeg) {
    const h = this.horizonDeg;
    if (!h) return 0;
    const x = (((azDeg % 360) + 360) % 360) / this.azStep;
    const i0 = Math.floor(x) % h.length;
    const i1 = (i0 + 1) % h.length;
    const f = x - Math.floor(x);
    return h[i0] * (1 - f) + h[i1] * f;
  }

  maxHorizon() {
    if (!this.horizonDeg) return 0;
    let m = -90;
    for (const v of this.horizonDeg) if (v > m) m = v;
    return m;
  }

  /** Sun and Earth az/el at a fractional ephemeris index. */
  skyAt(index) {
    const s = this.eph.stateAt(index);
    const sun = azEl(this.basis, s[1], s[0], s[2]);
    const earth = azEl(this.basis, s[4], s[3], s[5]);
    const limb = sunAngularRadiusDeg(s[2]);
    return {
      sun: { ...sun, limb, visible: sun.el + limb > this.horizonAt(sun.az), horizon: this.horizonAt(sun.az) },
      earth: { ...earth, visible: earth.el > this.horizonAt(earth.az), horizon: this.horizonAt(earth.az) },
      state: s,
    };
  }

  get series() {
    if (this._series) return this._series;
    const n = this.eph.n;
    const sunAz = new Float32Array(n), sunEl = new Float32Array(n), earthAz = new Float32Array(n), earthEl = new Float32Array(n);
    const sunHor = new Float32Array(n), earthHor = new Float32Array(n);
    const sunClr = new Float32Array(n), earthClr = new Float32Array(n);
    const sunVis = new Uint8Array(n), earthVis = new Uint8Array(n);
    const tmp = { az: 0, el: 0 };
    const d = this.eph.data;
    for (let i = 0; i < n; i++) {
      const o = i * 6;
      azEl(this.basis, d[o + 1], d[o], d[o + 2], tmp);
      sunAz[i] = tmp.az; sunEl[i] = tmp.el;
      const limb = sunAngularRadiusDeg(d[o + 2]);
      sunHor[i] = this.horizonAt(tmp.az);
      sunVis[i] = tmp.el + limb > sunHor[i] ? 1 : 0;
      sunClr[i] = tmp.el + limb - sunHor[i];
      azEl(this.basis, d[o + 4], d[o + 3], d[o + 5], tmp);
      earthAz[i] = tmp.az; earthEl[i] = tmp.el;
      earthHor[i] = this.horizonAt(tmp.az);
      earthVis[i] = tmp.el > earthHor[i] ? 1 : 0;
      earthClr[i] = tmp.el - earthHor[i];
    }
    this._series = { n, sunAz, sunEl, earthAz, earthEl, sunHor, earthHor, sunClr, earthClr, sunVis, earthVis };
    return this._series;
  }

  visibleAt(which, index) {
    const sky = this.skyAt(index);
    return which === 'sun' ? sky.sun.visible : sky.earth.visible;
  }
}
