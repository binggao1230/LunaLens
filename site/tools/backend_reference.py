"""Run the team backend (backend/lunalens/windows) on this build's real data.

Sun/Earth angles come from the JPL Horizons table in data/ephemeris.* and the
terrain horizons from data/sites.json, injected into scenario() in place of the
ephem and terrain packages. Prints JSON for tools/check_team.mjs.

Usage: python backend_reference.py <path-to-backend> <start ISO> <hours> <margin_deg>
"""
import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(Path(sys.argv[1]).resolve()))

from geometry import az_el, load_ephemeris  # noqa: E402
from lunalens.windows.scenario import scenario  # noqa: E402

start = dt.datetime.fromisoformat(sys.argv[2].replace("Z", "+00:00"))
hours, margin = int(sys.argv[3]), float(sys.argv[4])
meta, eph = load_ephemeris(str(HERE.parent / "data" / "ephemeris"))
t0 = dt.datetime.fromisoformat(meta["start"].replace("Z", "+00:00"))
sites = json.load(open(HERE.parent / "data" / "sites.json"))["sites"]

out = {}


def flags(windows, samples):
    """Hourly 0/1 flags rebuilt from the backend's own window list."""
    index = {s["time_utc"]: i for i, s in enumerate(samples)}
    result = [0] * len(samples)
    for w in windows:
        for i in range(index[w["start_utc"]], index[w["end_utc"]] + 1):
            result[i] = 1
    return result


for site in sites:
    height_km = (site.get("groundM") or 0) / 1000 + 0.002

    def angles(lat, lon, mast_m, times):
        rows = eph[[int((t - t0).total_seconds() // 3600) for t in times]]
        sun_az, sun_el = az_el(lat, lon, rows[:, 1], rows[:, 0], rows[:, 2], height_km=height_km)
        earth_az, earth_el = az_el(lat, lon, rows[:, 4], rows[:, 3], rows[:, 5], height_km=height_km)
        return {"sun_az": sun_az, "sun_el": sun_el, "earth_az": earth_az, "earth_el": earth_el}

    def horizon(lat, lon, mast_m):
        profile = site.get("horizon")
        return {"elev_deg": profile if profile is not None else [], "has_terrain": profile is not None}

    result = scenario(site["lat"], site["lon"], start, (hours - 1) / 24, 2.0, margin,
                      sun_earth_azel=angles, horizon_profile=horizon)
    samples = result["samples"]
    assert len(samples) == hours
    out[site["id"]] = {
        "sun": flags(result["sun_windows"], samples),
        "disk": [s["sun_disk_fraction"] for s in samples],
        "link": [1 if s["link"] else 0 for s in samples],
        "metrics": result["metrics"],
    }
print(json.dumps(out))
