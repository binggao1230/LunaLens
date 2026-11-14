"""Temporary stand-ins for the walking skeleton, replaced when Science A and B merge.

These are intentionally simple and clearly labelled as synthetic:

- ``flat_horizon`` returns a zero-elevation horizon, i.e. a smooth sphere.
- ``synthetic_sun_earth_azel`` returns a deterministic sinusoid with no
  physical meaning. It exists only so the FastAPI routes and frontend mocks
  can be exercised before the real packages exist.

Nothing here is used for real results; ``api/main.py`` only enables these
stand-ins when ``LUNALENS_STANDIN=1`` is set.
"""

from __future__ import annotations

import datetime as dt

import numpy as np


def flat_horizon(lat: float, lon: float, mast_m: float = 2.0) -> dict:
    return {
        "az_deg": [float(i) for i in range(360)],
        "elev_deg": [0.0] * 360,
        "site_alt_m": 0.0,
        "dem_name": None,
        "radius_km": None,
        "has_terrain": False,
    }


def synthetic_sun_earth_azel(
    lat: float, lon: float, alt_m: float, times_utc: list[dt.datetime]
) -> dict:
    hours = np.arange(len(times_utc), dtype=float)
    return {
        "sun_az": (hours * 12.2) % 360.0,
        "sun_el": 8.0 * np.sin(2 * np.pi * hours / 24.0),
        "earth_az": (hours * 1.02 + 40.0) % 360.0,
        "earth_el": 5.0 * np.cos(2 * np.pi * hours / 120.0),
    }
