"""Compare site/data/ephemeris.* with NASA SVS Moon Phase and Libration 2026.

The table under site/data/ was built from JPL Horizons; the SVS file is an independent publication of
hourly sub-solar and sub-Earth points from JPL DE440. They should agree to the rounding of the SVS file
(0.001 deg, 1 km). Anything above 0.01 deg or 2 km means one of the two is wrong.

    python3 site/tools/check_ephemeris_svs.py [--svs mooninfo_2026.json] [--data site/data]

The SVS file is 2.1 MB and is not in the repository; it is downloaded once and cached under site/data/
(gitignored) when missing.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import sys
import urllib.request
from pathlib import Path

SVS_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json"
MAX_ANGLE_DEG = 0.01
MAX_DISTANCE_KM = 2.0
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}


def parse_svs_time(text: str) -> int:
    """'01 Jan 2026 00:00 UT' -> epoch milliseconds (UTC)."""
    day, mon, year, hhmm = text.split()[:4]
    hour, minute = hhmm.split(":")
    stamp = dt.datetime(int(year), MONTHS[mon], int(day), int(hour), int(minute), tzinfo=dt.timezone.utc)
    return int(stamp.timestamp() * 1000)


def lon_difference(a: float, b: float) -> float:
    """Smallest angular difference between two longitudes, in degrees.

    The table stores longitudes unwrapped, running below -180 as the year goes on; the SVS file wraps them
    into -180..180. Comparing on the circle handles both.
    """
    return abs((a - b + 180.0) % 360.0 - 180.0)


def main() -> int:
    here = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--data", type=Path, default=here / "data", help="folder holding ephemeris.f64/.json")
    parser.add_argument("--svs", type=Path, default=None, help="mooninfo_2026.json; downloaded when absent")
    args = parser.parse_args()

    meta = json.loads((args.data / "ephemeris.json").read_text())
    raw = (args.data / "ephemeris.f64").read_bytes()
    table = memoryview(raw).cast("d")
    n, step = meta["count"], meta["stepSeconds"] * 1000
    t0 = int(dt.datetime.fromisoformat(meta["start"].replace("Z", "+00:00")).timestamp() * 1000)
    if len(table) != n * 6:
        print(f"ephemeris.f64 holds {len(table)} values, expected {n * 6}", file=sys.stderr)
        return 1

    svs_path = args.svs or (args.data / "mooninfo_2026.json")
    if not svs_path.is_file():
        print(f"downloading {SVS_URL} -> {svs_path}")
        svs_path.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(SVS_URL, svs_path)
    svs = json.loads(svs_path.read_text())
    by_time = {parse_svs_time(row["time"]): row for row in svs}

    worst = {"sun_lon": 0.0, "sun_lat": 0.0, "earth_lon": 0.0, "earth_lat": 0.0, "distance_km": 0.0}
    compared = 0

    for i in range(n):
        row = by_time.get(t0 + i * step)
        if row is None:
            continue
        sun_lon, sun_lat, _sun_dist, earth_lon, earth_lat, earth_dist = table[i * 6:i * 6 + 6]
        worst["sun_lon"] = max(worst["sun_lon"], lon_difference(sun_lon, row["subsolar"]["lon"]))
        worst["sun_lat"] = max(worst["sun_lat"], abs(sun_lat - row["subsolar"]["lat"]))
        worst["earth_lon"] = max(worst["earth_lon"], lon_difference(earth_lon, row["subearth"]["lon"]))
        worst["earth_lat"] = max(worst["earth_lat"], abs(earth_lat - row["subearth"]["lat"]))
        worst["distance_km"] = max(worst["distance_km"], abs(earth_dist - row["distance"]))
        compared += 1

    if not compared:
        print("no overlapping hours between ephemeris.f64 and the SVS file", file=sys.stderr)
        return 1

    print(f"compared {compared} hours")
    for key, value in worst.items():
        print(f"  max {key:12} {value:.4f}")

    failures = []
    for key in ("sun_lon", "sun_lat", "earth_lon", "earth_lat"):
        if worst[key] > MAX_ANGLE_DEG:
            failures.append(f"{key} {worst[key]:.4f} deg > {MAX_ANGLE_DEG} deg")
    if worst["distance_km"] > MAX_DISTANCE_KM:
        failures.append(f"distance {worst['distance_km']:.2f} km > {MAX_DISTANCE_KM} km")
    if failures:
        print("FAIL: " + "; ".join(failures), file=sys.stderr)
        return 1
    print(f"PASS: within {MAX_ANGLE_DEG} deg and {MAX_DISTANCE_KM} km")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
