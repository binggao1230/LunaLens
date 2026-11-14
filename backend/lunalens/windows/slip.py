"""Date-slip series: how metrics change as the landing date moves."""

from __future__ import annotations

import numpy as np

from .metrics import longest_run


def slip_series(
    sun_flags: np.ndarray,
    link_flags: np.ndarray,
    slip_days: int,
    stay_hours: int,
) -> list[dict[str, float]]:
    """One row per slip day with touchdown and continuous-sunlight metrics."""
    sun = np.asarray(sun_flags, dtype=bool)
    link = np.asarray(link_flags, dtype=bool)
    out = []
    for day in range(slip_days + 1):
        start = day * 24
        end = min(start + stay_hours, sun.size)
        sun_win = sun[start:end]
        link_win = link[start:end]
        if sun_win.size == 0:
            out.append(
                {
                    "slip_day": day,
                    "sunlit_at_touchdown": False,
                    "continuous_sun_h": 0,
                    "link_share": 0.0,
                }
            )
            continue
        out.append(
            {
                "slip_day": day,
                "sunlit_at_touchdown": bool(sun[start]),
                "continuous_sun_h": longest_run(sun_win, True),
                "link_share": float(link_win.mean()),
            }
        )
    return out
