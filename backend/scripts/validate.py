"""Compare our angles with JPL Horizons and our sunlit share with the PGDA map.

Writes ``data/validation.json`` for ``/api/validation``. Not implemented yet:
it needs the real ephemeris and terrain packages plus Horizons reference
tables (Science A) and the PGDA illumination map. Until then it writes the
honest ``not_computed`` status instead of invented numbers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    out = ROOT / "data" / "validation.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({"status": "not_computed", "generated_utc": None, "horizons": {}, "pgda": {}}, indent=2) + "\n")
    print("validation not implemented yet; wrote status=not_computed", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
