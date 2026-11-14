"""Stay totals over an hourly boolean series (sunlight and Earth link)."""

from __future__ import annotations

import numpy as np

from .windows import intervals


def longest_run(flags: np.ndarray, value: bool) -> int:
    flags = np.asarray(flags, dtype=bool)
    if flags.size == 0:
        return 0
    runs = [end - start for start, end in intervals(flags if value else ~flags)]
    return max(runs, default=0)


def metrics(sun_flags: np.ndarray, link_flags: np.ndarray) -> dict[str, float]:
    sun = np.asarray(sun_flags, dtype=bool)
    link = np.asarray(link_flags, dtype=bool)
    count = max(1, int(sun.size))
    return {
        "sunlit_hours": int(sun.sum()),
        "sunlit_share": float(sun.mean()),
        "longest_sunlit_h": longest_run(sun, True),
        "longest_dark_h": longest_run(sun, False),
        "link_hours": int(link.sum()),
        "link_share": float(link.mean()),
        "longest_link_h": longest_run(link, True),
        "longest_link_gap_h": longest_run(link, False),
        "hours": count,
    }
