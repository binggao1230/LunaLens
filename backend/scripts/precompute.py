"""Write static scenario JSON for every curated site (offline fallback).

Usage: python backend/scripts/precompute.py --start 2026-11-14T00:00:00Z --days 30 --out web/public/precomputed

Needs the real ``lunalens.ephem`` and ``lunalens.terrain`` packages; it never
uses the synthetic stand-ins.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2026-11-14T00:00:00Z")
    parser.add_argument("--days", type=float, default=30.0)
    parser.add_argument("--mast-m", type=float, default=2.0)
    parser.add_argument("--margin-deg", type=float, default=2.0)
    parser.add_argument("--out", type=Path, default=ROOT / "web" / "public" / "precomputed")
    args = parser.parse_args()

    from lunalens.api.main import _parse_utc
    from lunalens.windows.scenario import scenario

    sites_path = ROOT / "data" / "sites.json"
    if not sites_path.is_file():
        print(f"missing {sites_path}", file=sys.stderr)
        return 1
    try:
        import lunalens.ephem.bodies  # noqa: F401
        import lunalens.terrain.horizon  # noqa: F401
    except ImportError as exc:
        print(f"ephem/terrain packages not available yet: {exc}", file=sys.stderr)
        return 1

    raw = json.loads(sites_path.read_text())
    sites = raw.get("sites", raw if isinstance(raw, list) else [])
    args.out.mkdir(parents=True, exist_ok=True)
    start = _parse_utc(args.start)
    for site in sites:
        result = scenario(site["lat"], site["lon"], start, args.days, args.mast_m, args.margin_deg)
        (args.out / f"{site['id']}.json").write_text(json.dumps(result))
        print(f"wrote {site['id']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
