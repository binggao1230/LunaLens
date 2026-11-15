export const FLIGHT_SECONDS = 14; // shortened from 28 s: the flight phases are fractions of this
export const clampProgress = value => Math.min(1, Math.max(0, value));
export const smoothProgress = value => {
  const progress = clampProgress(value);
  return progress * progress * (3 - 2 * progress);
};
export const during = (start, end, progress) => smoothProgress((progress - start) / (end - start));

export function flightPose(progress) {
  const travel = smoothProgress(progress);
  const range = 2200 * Math.expm1(8 * (1 - travel)) / Math.expm1(8);
  const lateral = 1 - during(.35, .68, progress);
  return {
    position: [range * .4 * lateral, range * .8, range * .8 * lateral],
    // Kilometres in this illustrative scene: a deliberately oversized lander lets the camera show
    // regional craters without losing the spacecraft. This does not change the measured terrain.
    size: 18 + 17 * (range / 2200) ** .75,
    upright: during(.35, .65, progress),
    throttle: progress >= 1 ? 0 : (1 - during(.94, 1, progress)) * (.4 + .6 * (1 - during(.08, .27, progress) + during(.37, .58, progress))),
    phase: progress >= 1 ? 'Touchdown' : progress > .68 ? 'Final descent' : progress > .35 ? 'Braking for landing' : progress > .14 ? 'Lunar transfer' : 'Leave Earth',
  };
}

/** Fit both planets around the departing craft using sphere silhouettes in perspective. */
export function departureShot(T, aspect, shipStart, moonCenter, moonRadius, fov = 48) {
  const tanHalf = Math.tan(T.MathUtils.degToRad(fov / 2));
  const mix = T.MathUtils.lerp;
  const blend = T.MathUtils.clamp((aspect - 390 / 844) / (1440 / 900 - 390 / 844), 0, 1);
  const moonX = Math.min(mix(.25, .52, blend), .832 / aspect);
  const moonQ = mix(.32, .46, blend);
  const moonY = -Math.max(-mix(-.55, 0, blend), Math.sqrt(Math.max(0, (moonQ + .17) ** 2 - (moonX * aspect) ** 2)));
  const earthX = mix(-.27, -.65, blend), earthQ = mix(.30, .42, blend);
  const earthY = Math.max(mix(.50, .06, blend), Math.sqrt(Math.max(0, (earthQ + .18) ** 2 - (earthX * aspect) ** 2)));
  const depthRatio = (q, ky) => {
    const a = (q * tanHalf) ** 2, b = 2 * a + 1 + ky * ky;
    return (b + Math.sqrt(b * b - 4 * a * (a + 1))) / (2 * a);
  };
  const kx = moonX * aspect * tanHalf, ky = moonY * tanHalf;
  const theta = Math.atan(Math.hypot(kx, ky));
  const moonDistance = moonRadius * Math.sqrt(depthRatio(moonQ, ky) * (1 + kx * kx + ky * ky));
  const radial = shipStart.clone().sub(moonCenter), length = radial.length();
  radial.divideScalar(length);
  const side = new T.Vector3(0, 1, 0).cross(radial);
  if (side.lengthSq() < 1e-8) side.set(0, 0, 1).cross(radial);
  side.normalize();
  const vertical = radial.clone().cross(side).normalize();
  const sinTurn = moonDistance * Math.sin(theta) / length;
  if (!(sinTurn < 1)) throw new Error('The departure camera cannot fit this viewport');
  const cosTurn = Math.sqrt(1 - sinTurn * sinTurn);
  const distance = moonDistance * Math.cos(theta) - length * cosTurn;
  const direction = radial.clone().multiplyScalar(cosTurn).addScaledVector(side, sinTurn);
  const flatRight = radial.clone().multiplyScalar(-sinTurn).addScaledVector(side, cosTurn);
  const roll = Math.atan2(moonY, moonX * aspect);
  const right = flatRight.clone().multiplyScalar(Math.cos(roll)).addScaledVector(vertical, -Math.sin(roll));
  const up = flatRight.clone().multiplyScalar(Math.sin(roll)).addScaledVector(vertical, Math.cos(roll));
  const offset = direction.clone().multiplyScalar(distance);
  const cameraPosition = shipStart.clone().add(offset);
  const ex = earthX * aspect * tanHalf, ey = earthY * tanHalf, earthDistance = 1900;
  const earthRay = direction.clone().negate().addScaledVector(right, ex).addScaledVector(up, ey).normalize();
  const earthPosition = cameraPosition.clone().addScaledVector(earthRay, earthDistance);
  const earthDepth = earthDistance / Math.sqrt(1 + ex * ex + ey * ey);
  return { direction, up, distance, earthPosition, earthRadius: earthDepth / Math.sqrt(depthRatio(earthQ, ey)) };
}
