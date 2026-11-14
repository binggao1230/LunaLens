import { R_MOON_KM, SUN_RADIUS_KM, EARTH_RADIUS_KM } from './ephemeris.js';

const DEG = Math.PI / 180;

export function siteBasis(latDeg, lonDeg, heightKm = 0) {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  const sinLa = Math.sin(la), cosLa = Math.cos(la), sinLo = Math.sin(lo), cosLo = Math.cos(lo);
  return {
    up: [cosLa * cosLo, cosLa * sinLo, sinLa],
    east: [-sinLo, cosLo, 0],
    north: [-sinLa * cosLo, -sinLa * sinLo, cosLa],
    radiusKm: R_MOON_KM + heightKm,
  };
}

/** Azimuth (deg clockwise from north) and elevation (deg) of a body whose sub-point is (bodyLat, bodyLon) at distance distKm. */
export function azEl(basis, bodyLatDeg, bodyLonDeg, distKm, out = { az: 0, el: 0 }) {
  const bla = bodyLatDeg * DEG, blo = bodyLonDeg * DEG;
  const ux = Math.cos(bla) * Math.cos(blo), uy = Math.cos(bla) * Math.sin(blo), uz = Math.sin(bla);
  const { up, east, north, radiusKm } = basis;
  const vx = distKm * ux - radiusKm * up[0];
  const vy = distKm * uy - radiusKm * up[1];
  const vz = distKm * uz - radiusKm * up[2];
  const norm = Math.hypot(vx, vy, vz);
  const vUp = vx * up[0] + vy * up[1] + vz * up[2];
  const vE = vx * east[0] + vy * east[1] + vz * east[2];
  const vN = vx * north[0] + vy * north[1] + vz * north[2];
  out.el = Math.asin(Math.max(-1, Math.min(1, vUp / norm))) / DEG;
  let az = Math.atan2(vE, vN) / DEG;
  if (az < 0) az += 360;
  out.az = az;
  return out;
}

export function sunAngularRadiusDeg(distKm) {
  return Math.asin(SUN_RADIUS_KM / distKm) / DEG;
}

export function earthAngularRadiusDeg(distKm) {
  return Math.asin(EARTH_RADIUS_KM / distKm) / DEG;
}

/** Angle (deg) between Sun and Earth as seen from the Moon: 180 deg means a full Earth. */
export function sunEarthSeparationDeg(state) {
  const sla = state[1] * DEG, slo = state[0] * DEG, ela = state[4] * DEG, elo = state[3] * DEG;
  const dot = Math.cos(sla) * Math.cos(ela) * Math.cos(slo - elo) + Math.sin(sla) * Math.sin(ela);
  return Math.acos(Math.max(-1, Math.min(1, dot))) / DEG;
}
