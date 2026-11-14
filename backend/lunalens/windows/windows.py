"""Intervals and countdowns for sunlight and Earth-link visibility.

Inputs are hourly boolean series; the surrounding team ships these from the
ephemeris (``ephem/``) and terrain (``terrain/``) packages. This module is
deliberately series-only and knows nothing about geometry, so it can be
tested by hand without either dependency.
"""

from __future__ import annotations

import bisect

import numpy as np


def intervals(flags: np.ndarray) -> list[tuple[int, int]]:
    """Contiguous true runs in ``flags`` as ``(start, end_exclusive)`` index pairs."""
    flags = np.asarray(flags, dtype=bool)
    if flags.size == 0:
        return []
    edges = np.flatnonzero(np.diff(flags.astype(np.int8)) != 0) + 1
    bounds = np.concatenate(([0], edges, [flags.size]))
    out: list[tuple[int, int]] = []
    for start, end in zip(bounds[:-1], bounds[1:]):
        if flags[start]:
            out.append((int(start), int(end)))
    return out


def next_transition(flags: np.ndarray, index: int) -> tuple[str, int] | tuple[None, None]:
    """First visibility change at or after ``index``: ``('set'|'rise', edge)`` or ``(None, None)``."""
    flags = np.asarray(flags, dtype=bool)
    if flags.size == 0:
        return (None, None)
    index = int(min(max(index, 0), flags.size))
    if index == flags.size:
        return (None, None)
    state = flags[index]
    change = np.flatnonzero(np.diff(flags[index:].astype(np.int8)) != 0)
    if change.size == 0:
        return (None, None)
    edge = index + int(change[0]) + 1
    return ("set" if state else "rise", edge)


def countdown_hours(times_h: np.ndarray, edge: int | None, reference_h: float) -> float | None:
    """Hours from ``reference_h`` to the transition at ``edge``, or ``None``."""
    if edge is None:
        return None
    return float(times_h[edge] - reference_h)
