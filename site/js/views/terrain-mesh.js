import { siteBasis } from '../engine/geometry.js';

const DEG = Math.PI / 180;
const RADIUS = 1737.4;

export function terrainPatch(dem, site, { segments = 168, widthKm = 80, heightScale = 3 } = {}) {
  const basis = siteBasis(site.lat, site.lon);
  const groundKm = dem.height(site.lat * DEG, site.lon * DEG) / 1000;
  if (!Number.isFinite(groundKm)) return null;
  const positions = new Float32Array((segments + 1) ** 2 * 3);
  let lowest = 0;
  for (let row = 0; row <= segments; row++) {
    const north = widthKm * (0.5 - row / segments);
    for (let col = 0; col <= segments; col++) {
      const east = widthKm * (col / segments - 0.5);
      const range = Math.hypot(east, north);
      const angle = range / RADIUS;
      const tangent = range ? [0, 1, 2].map((axis) => (east * basis.east[axis] + north * basis.north[axis]) / range) : basis.north;
      const unit = basis.up.map((up, axis) => up * Math.cos(angle) + tangent[axis] * Math.sin(angle));
      const lat = Math.asin(unit[2]), lon = Math.atan2(unit[1], unit[0]);
      const heightKm = dem.height(lat, lon) / 1000;
      if (!Number.isFinite(heightKm)) return null;
      const vertical = ((RADIUS + heightKm) * Math.cos(angle) - (RADIUS + groundKm)) * heightScale;
      const offset = (row * (segments + 1) + col) * 3;
      positions.set([east, vertical, -north], offset);
      lowest = Math.min(lowest, vertical);
    }
  }
  return { positions, lowest, segments, widthKm };
}
