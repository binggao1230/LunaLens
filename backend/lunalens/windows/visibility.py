"""Visibility of the Sun and Earth over a terrain horizon.

The Sun is a disk, not a point. Its centre is at elevation ``h`` above the
local terrain horizon and its angular radius is ``r``. The visible fraction
of the disk is the standard area of a circular segment cut by a horizontal
line:

    fraction(h, r) = 1 - (acos(x) - x*sqrt(1 - x**2)) / pi,   x = h / r

with x clamped to [-1, 1]: 0 when the whole disk is below, 1 when it is
fully above. The Sun counts as "up" when any part of the disk clears the
horizon (fraction > 0), which matches the "upper limb" rule used by the
standalone snapshot.

Earth is treated by its centre: the link is open when the centre clears the
terrain horizon at Earth's azimuth by at least the requested margin.
"""

from __future__ import annotations

import numpy as np


def disk_fraction(h: np.ndarray, r: np.ndarray | float) -> np.ndarray:
    """Visible fraction of a disk at elevations ``h`` with radius ``r`` (degrees)."""
    h = np.asarray(h, dtype=float)
    r = np.asarray(r, dtype=float)
    x = np.divide(h, r, out=np.full_like(h, np.nan), where=np.abs(r) > 1e-12)
    x = np.clip(x, -1.0, 1.0)
    fraction = 1.0 - (np.arccos(x) - x * np.sqrt(1.0 - x * x)) / np.pi
    return np.nan_to_num(fraction, nan=0.0, posinf=1.0, neginf=0.0)


def sun_visible(disk: np.ndarray) -> np.ndarray:
    """Sun counts as up when any part of the disk is above the horizon."""
    return disk > 0.0


def link_open(earth_el: np.ndarray, horizon: np.ndarray, margin_deg: float) -> np.ndarray:
    """Earth link is open when the centre clears the terrain by ``margin_deg``."""
    return earth_el > horizon + margin_deg
