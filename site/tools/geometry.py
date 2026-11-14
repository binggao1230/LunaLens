"""Sun / Earth azimuth+elevation at a lunar site from sub-body points (mirror of site/js/geometry.js)."""
import numpy as np

R_MOON_KM = 1737.4


def unit(lat_deg, lon_deg):
    la, lo = np.radians(lat_deg), np.radians(lon_deg)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


def az_el(site_lat, site_lon, body_lat, body_lon, dist_km, height_km=0.0):
    la, lo = np.radians(site_lat), np.radians(site_lon)
    n = np.array([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)])
    e = np.array([-np.sin(lo), np.cos(lo), 0.0])
    k = np.array([-np.sin(la) * np.cos(lo), -np.sin(la) * np.sin(lo), np.cos(la)])
    u = unit(body_lat, body_lon)
    v = dist_km[:, None] * u - (R_MOON_KM + height_km) * n
    norm = np.linalg.norm(v, axis=1)
    el = np.degrees(np.arcsin(np.clip((v @ n) / norm, -1, 1)))
    az = np.degrees(np.arctan2(v @ e, v @ k)) % 360.0
    return az, el


def load_ephemeris(base="../site/data/ephemeris"):
    import json
    meta = json.load(open(base + ".json"))
    arr = np.fromfile(base + ".f64", dtype="<f8").reshape(-1, 6)
    return meta, arr
