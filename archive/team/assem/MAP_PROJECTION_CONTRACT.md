# South-Pole Map Projection Contract

This contract defines the coordinate behavior for the south-pole map and its
pointer-to-coordinate conversion.

## Coordinate conventions

- Longitude is east-positive in the range `0` to `360` degrees.
- South latitude is negative.
- The map is centered on latitude `-90` degrees.
- Longitude `0` degrees is at the top of the map.
- Increasing longitude moves clockwise, to the right.

## Forward projection

For a map centered at pixel `(cx, cy)`, lunar reference radius `R`, and a map
scale `S` in pixels per metre:

```text
rho = 2 * R * tan((90 + latitude) / 2)
x = cx + S * rho * sin(longitude)
y = cy - S * rho * cos(longitude)
```

Angles are converted to radians before evaluating trigonometric functions.
The implementation must use the project's lunar reference radius and the map
asset scale supplied by the asset metadata. It must not hard-code a scale from
the prototype.

## Inverse projection

For a pixel `(x, y)`:

```text
dx = (x - cx) / S
dy = (cy - y) / S
rho = sqrt(dx² + dy²)
latitude = -90 + 2 * atan(rho / (2 * R))
longitude = atan2(dx, dy) converted to degrees and normalized to [0, 360)
```

At the exact pole (`rho = 0`), longitude is undefined. Pointer handling should
return the pole latitude and either preserve the previous longitude or omit the
longitude until the user moves away from the pole.

## Known-point checks

These checks use the same dimensions, reference radius, and scale as the map
asset under test:

1. `(-90, 0)` projects to `(cx, cy)`.
2. Any longitude at `(-90, 0)` has the same pixel position.
3. At a fixed latitude, longitude `90` is to the right of longitude `0`.
4. At a fixed latitude, longitude `180` is below longitude `0`.
5. At a fixed latitude, longitude `270` is to the left of longitude `0`.
6. Forward projection followed by inverse projection returns the original
   latitude and normalized longitude within the chosen floating-point tolerance.
7. A point outside the supported map radius is rejected rather than silently
   converted to a different site.

## Interaction checks

- Tapping a valid map point creates or selects a custom site.
- The resulting values use south-negative latitude and east-positive longitude.
- The selected marker is visible after the state update.
- Tapping the map does not change the landing instant or scenario settings.
- Pointer and touch input produce the same coordinates.

## Source alignment

The orientation and formula are derived from the project layout prototype and
the projection requirement in `team/assem/README.md`. The implementation must
use the final map asset metadata and shared geo helper once those are available.
