"""Assemble a full scenario from azimuth/elevation and a terrain horizon.

This module owns the integration: given Science A's ``sun_earth_azel`` and
Science B's ``horizon_profile``, it produces the hourly samples, visibility
windows and stay metrics that the API and frontend consume.

The two science functions are injected as keyword arguments so the whole
pipeline is testable by hand without SPICE kernels or DEM files. When they are
omitted, the real ``lunalens.ephem`` and ``lunalens.terrain`` packages are
imported lazily, matching ``WORKPLAN.md`` section 4.1.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from ..config import DEFAULT_MARGIN_DEG, DEFAULT_MAST_M
from .metrics import metrics
from .slip import slip_series
from .visibility import disk_fraction, link_open, sun_visible
from .windows import intervals


def _resolve_sun_earth_azel():
    from ..ephem.bodies import sun_earth_azel

    return sun_earth_azel


def _resolve_horizon_profile():
    from ..terrain.horizon import horizon_profile

    return horizon_profile


def hourly_times(start_utc: dt.datetime, days: float) -> list[dt.datetime]:
    hours = max(0, int(round(days * 24)))
    return [start_utc + dt.timedelta(hours=h) for h in range(hours + 1)]


def horizon_at(profile: dict, az_deg: np.ndarray) -> np.ndarray:
    """Interpolate a 360-degree horizon profile at arbitrary azimuths."""
    elevations = np.asarray(profile["elev_deg"], dtype=float)
    if elevations.size == 0:
        return np.zeros_like(az_deg, dtype=float)
    step = 360.0 / elevations.size
    x = (np.asarray(az_deg, dtype=float) % 360.0) / step
    i0 = np.floor(x).astype(int) % elevations.size
    i1 = (i0 + 1) % elevations.size
    f = x - np.floor(x)
    return elevations[i0] * (1 - f) + elevations[i1] * f


def scenario(
    lat: float,
    lon: float,
    start_utc: dt.datetime,
    days: float,
    mast_m: float = DEFAULT_MAST_M,
    margin_deg: float = DEFAULT_MARGIN_DEG,
    *,
    sun_earth_azel=None,
    horizon_profile=None,
    sun_radius_deg: float | np.ndarray = 0.265,
) -> dict:
    """Compute one scenario. See ``WORKPLAN.md`` section 4.1 and 4.2."""
    sun_earth_azel = sun_earth_azel or _resolve_sun_earth_azel()
    horizon_profile = horizon_profile or _resolve_horizon_profile()

    times = hourly_times(start_utc, days)
    horizon = horizon_profile(lat, lon, mast_m)
    angles = sun_earth_azel(lat, lon, mast_m, times)

    sun_az = np.asarray(angles["sun_az"], dtype=float)
    sun_el = np.asarray(angles["sun_el"], dtype=float)
    earth_az = np.asarray(angles["earth_az"], dtype=float)
    earth_el = np.asarray(angles["earth_el"], dtype=float)

    sun_horizon = horizon_at(horizon, sun_az)
    earth_horizon = horizon_at(horizon, earth_az)
    disk = disk_fraction(sun_el - sun_horizon, sun_radius_deg)
    sun_flags = sun_visible(disk)
    link_flags = link_open(earth_el, earth_horizon, margin_deg)

    samples = [
        {
            "time_utc": times[i].isoformat().replace("+00:00", "Z"),
            "sun_az": round(float(sun_az[i]), 4),
            "sun_el": round(float(sun_el[i]), 4),
            "sun_disk_fraction": round(float(disk[i]), 4),
            "earth_az": round(float(earth_az[i]), 4),
            "earth_el": round(float(earth_el[i]), 4),
            "link": bool(link_flags[i]),
        }
        for i in range(len(times))
    ]

    def window_pairs(flags: np.ndarray) -> list[dict]:
        return [
            {
                "start_utc": times[a].isoformat().replace("+00:00", "Z"),
                "end_utc": times[b - 1].isoformat().replace("+00:00", "Z"),
            }
            for a, b in intervals(flags)
        ]

    return {
        "site": {"lat": lat, "lon": lon},
        "start_utc": start_utc.isoformat().replace("+00:00", "Z"),
        "days": days,
        "mast_m": mast_m,
        "margin_deg": margin_deg,
        "horizon": {
            "az_deg": horizon.get("az_deg", [round(i * 360.0 / len(horizon["elev_deg"]), 4) for i in range(len(horizon["elev_deg"]))]),
            "elev_deg": [round(float(v), 4) for v in horizon["elev_deg"]],
            "site_alt_m": horizon.get("site_alt_m"),
            "dem_name": horizon.get("dem_name"),
            "radius_km": horizon.get("radius_km"),
            "has_terrain": bool(horizon.get("has_terrain", False)),
        },
        "samples": samples,
        "sun_windows": window_pairs(sun_flags),
        "comm_windows": window_pairs(link_flags),
        "metrics": metrics(sun_flags, link_flags),
    }


def slip(
    lat: float,
    lon: float,
    start_utc: dt.datetime,
    slip_days: int,
    mast_m: float = DEFAULT_MAST_M,
    margin_deg: float = DEFAULT_MARGIN_DEG,
    *,
    sun_earth_azel=None,
    horizon_profile=None,
    sun_radius_deg: float | np.ndarray = 0.265,
) -> dict:
    """Per-day metrics when the landing date slips (``/api/slip``)."""
    sun_earth_azel = sun_earth_azel or _resolve_sun_earth_azel()
    horizon_profile = horizon_profile or _resolve_horizon_profile()

    stay_hours = 24 * 30  # one lunar day of context, same as the default stay
    total_hours = (slip_days + 1) * 24 + stay_hours
    times = [start_utc + dt.timedelta(hours=h) for h in range(total_hours)]
    horizon = horizon_profile(lat, lon, mast_m)
    angles = sun_earth_azel(lat, lon, mast_m, times)

    sun_horizon = horizon_at(horizon, np.asarray(angles["sun_az"]))
    earth_horizon = horizon_at(horizon, np.asarray(angles["earth_az"]))
    disk = disk_fraction(np.asarray(angles["sun_el"]) - sun_horizon, sun_radius_deg)
    sun_flags = sun_visible(disk)
    link_flags = link_open(np.asarray(angles["earth_el"]), earth_horizon, margin_deg)

    return {
        "site": {"lat": lat, "lon": lon},
        "start_utc": start_utc.isoformat().replace("+00:00", "Z"),
        "slip_days": slip_days,
        "mast_m": mast_m,
        "margin_deg": margin_deg,
        "rows": slip_series(sun_flags, link_flags, slip_days, stay_hours),
    }
