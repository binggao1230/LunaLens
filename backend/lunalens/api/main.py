"""FastAPI application with the four frozen endpoints plus ``/api/health``.

``/api/scenario`` and ``/api/slip`` import the real ``ephem`` and ``terrain``
packages lazily; until Science A and B merge, those requests return 503 with an
explicit message rather than fake numbers. Set ``LUNALENS_STANDIN=1`` to run
the walking skeleton on the synthetic stand-ins in ``windows/standins.py``.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

from ..windows.scenario import scenario, slip
from .schemas import ScenarioResult, SiteInfo, SlipResult, ValidationResult

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"

app = FastAPI(title="Luna Lens API", version="0.1.0")


def _standins_enabled() -> bool:
    return os.environ.get("LUNALENS_STANDIN") == "1"


def _science_services():
    """Return the real (sun_earth_azel, horizon_profile) or the synthetic stand-ins."""
    if _standins_enabled():
        from ..windows.standins import flat_horizon, synthetic_sun_earth_azel

        return synthetic_sun_earth_azel, flat_horizon
    try:
        from ..ephem.bodies import sun_earth_azel
        from ..terrain.horizon import horizon_profile

        return sun_earth_azel, horizon_profile
    except (ImportError, ModuleNotFoundError) as exc:  # pragma: no cover - depends on teammates
        raise HTTPException(
            status_code=503,
            detail="ephem/terrain packages not provided yet; the backend serves mocks until they merge",
        ) from exc


def _parse_utc(value: str) -> dt.datetime:
    value = value.strip().replace("Z", "+00:00")
    parsed = dt.datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/sites", response_model=list[SiteInfo])
def sites() -> list[dict]:
    path = DATA / "sites.json"
    if not path.is_file():
        raise HTTPException(status_code=503, detail="sites.json not present yet")
    raw = json.loads(path.read_text())
    out = []
    for site in raw.get("sites", raw if isinstance(raw, list) else []):
        out.append(
            {
                "id": site["id"],
                "name": site["name"],
                "lat": site["lat"],
                "lon": site["lon"],
                "category": site.get("category", site.get("group", "")),
                "source": site.get("source", ""),
            }
        )
    return out


@app.get("/api/scenario", response_model=ScenarioResult)
def scenario_endpoint(
    lat: float = Query(...),
    lon: float = Query(...),
    start: str = Query(...),
    days: float = Query(30.0, gt=0, le=366),
    mast_m: float = Query(2.0, ge=0, le=100),
    margin_deg: float = Query(2.0, ge=0, le=30),
) -> dict:
    sun_earth_azel, horizon_profile = _science_services()
    return scenario(
        lat,
        lon,
        _parse_utc(start),
        days,
        mast_m,
        margin_deg,
        sun_earth_azel=sun_earth_azel,
        horizon_profile=horizon_profile,
    )


@app.get("/api/slip", response_model=SlipResult)
def slip_endpoint(
    lat: float = Query(...),
    lon: float = Query(...),
    start: str = Query(...),
    slip_days: int = Query(30, ge=0, le=366),
    mast_m: float = Query(2.0, ge=0, le=100),
    margin_deg: float = Query(2.0, ge=0, le=30),
) -> dict:
    sun_earth_azel, horizon_profile = _science_services()
    return slip(
        lat,
        lon,
        _parse_utc(start),
        slip_days,
        mast_m,
        margin_deg,
        sun_earth_azel=sun_earth_azel,
        horizon_profile=horizon_profile,
    )


@app.get("/api/validation", response_model=ValidationResult)
def validation() -> dict:
    path = DATA / "validation.json"
    if not path.is_file():
        return {"status": "not_computed"}
    return json.loads(path.read_text())
