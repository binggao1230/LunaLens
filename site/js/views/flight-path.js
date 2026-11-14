export const FLIGHT_SECONDS = 28;
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
    size: 8 + 27 * (range / 2200) ** .75,
    upright: during(.35, .65, progress),
    throttle: progress >= 1 ? 0 : (1 - during(.94, 1, progress)) * (.4 + .6 * (1 - during(.08, .27, progress) + during(.37, .58, progress))),
    phase: progress >= 1 ? 'Touchdown' : progress > .68 ? 'Final descent' : progress > .35 ? 'Braking for landing' : progress > .14 ? 'Lunar transfer' : 'Leave Earth',
  };
}
