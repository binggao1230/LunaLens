"""Response models: the source of truth for the frontend contract.

``WORKPLAN.md`` section 4.2 freezes four endpoints. This file is the field-level
definition of each response. A change here after the H2 interface freeze needs
Bing's approval and a message to both frontend developers, and it must be
reflected in the generated ``web/src/api/types.ts``.

Conventions (``AGENTS.md``): longitude east-positive 0-360, south latitude
negative, angles in degrees, times in ISO-8601 UTC.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class SiteInfo(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    category: str
    source: str


class HorizonProfile(BaseModel):
    az_deg: list[float]
    elev_deg: list[float]
    site_alt_m: float | None = None
    dem_name: str | None = None
    radius_km: float | None = None
    has_terrain: bool = False


class HourlySample(BaseModel):
    time_utc: str
    sun_az: float
    sun_el: float
    sun_disk_fraction: float
    earth_az: float
    earth_el: float
    link: bool


class Window(BaseModel):
    start_utc: str
    end_utc: str


class StayMetrics(BaseModel):
    hours: int
    sunlit_hours: int
    sunlit_share: float
    longest_sunlit_h: int
    longest_dark_h: int
    link_hours: int
    link_share: float
    longest_link_h: int
    longest_link_gap_h: int


class ScenarioResult(BaseModel):
    site: dict[str, float]
    start_utc: str
    days: float
    mast_m: float
    margin_deg: float
    horizon: HorizonProfile
    samples: list[HourlySample]
    sun_windows: list[Window]
    comm_windows: list[Window]
    metrics: StayMetrics


class SlipRow(BaseModel):
    slip_day: int
    sunlit_at_touchdown: bool
    continuous_sun_h: int
    link_share: float


class SlipResult(BaseModel):
    site: dict[str, float]
    start_utc: str
    slip_days: int
    mast_m: float
    margin_deg: float
    rows: list[SlipRow]


class ValidationResult(BaseModel):
    generated_utc: str | None = None
    horizons: dict = Field(default_factory=dict)
    pgda: dict = Field(default_factory=dict)
    status: str = "not_computed"
