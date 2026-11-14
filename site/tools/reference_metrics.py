"""Reference metrics in Python; the JS app must reproduce these (see tools/check_js.mjs)."""
import json, sys, datetime as dt
import numpy as np
from geometry import az_el, load_ephemeris

SUN_RADIUS_KM = 695700.0
meta, eph = load_ephemeris("../data/ephemeris")
sites = {s["id"]: s for s in json.load(open("../data/sites.json"))["sites"]}
t0 = dt.datetime.fromisoformat(meta["start"].replace("Z", "+00:00"))

def idx(date):
    return int((date.replace(tzinfo=dt.timezone.utc) - t0).total_seconds() // 3600)

def horizon_at(site, az):
    h = site.get("horizon")
    if h is None:
        return np.zeros_like(az)
    h = np.array(h)
    x = (az / 0.5) % len(h)
    i0 = np.floor(x).astype(int) % len(h); i1 = (i0 + 1) % len(h); f = x - np.floor(x)
    return h[i0] * (1 - f) + h[i1] * f

def metrics(site, start, days):
    i0, n = idx(start), days * 24
    sl = eph[i0:i0 + n]
    az_s, el_s = az_el(site["lat"], site["lon"], sl[:, 1], sl[:, 0], sl[:, 2], height_km=(site.get("groundM") or 0) / 1000 + 0.002)
    az_e, el_e = az_el(site["lat"], site["lon"], sl[:, 4], sl[:, 3], sl[:, 5], height_km=(site.get("groundM") or 0) / 1000 + 0.002)
    limb = np.degrees(np.arcsin(SUN_RADIUS_KM / sl[:, 2]))
    sun = (el_s + limb) > horizon_at(site, az_s)
    earth = el_e > horizon_at(site, az_e)
    def longest(mask, value):
        best = cur = 0
        for m in mask:
            cur = cur + 1 if m == value else 0
            best = max(best, cur)
        return best
    return dict(sun_pct=100 * sun.mean(), earth_pct=100 * earth.mean(), both_pct=100 * (sun & earth).mean(),
                longest_dark_h=longest(sun, False), longest_nocomm_h=longest(earth, False),
                max_sun_el=float(el_s.max()))

if __name__ == "__main__":
    import json as _j
    if "--json" in __import__("sys").argv:
        out = {}
        for label, start, days in (("w30", dt.datetime(2026, 11, 14), 30), ("y2027", dt.datetime(2027, 1, 1), 365)):
            out[label] = {sid: metrics(s, start, days) for sid, s in sites.items()}
        print(_j.dumps(out)); raise SystemExit
    for label, start, days in (("next 30 d from 2026-11-14", dt.datetime(2026, 11, 14), 30),
                                ("calendar year 2027", dt.datetime(2027, 1, 1), 365)):
        print("\n" + label)
        print(f"{'site':20s} {'sun%':>6s} {'earth%':>7s} {'both%':>6s} {'maxDark h':>10s} {'maxNoComm h':>12s}")
        for sid, s in sites.items():
            m = metrics(s, start, days)
            print(f"{sid:20s} {m['sun_pct']:6.1f} {m['earth_pct']:7.1f} {m['both_pct']:6.1f} {m['longest_dark_h']:10d} {m['longest_nocomm_h']:12d}")
