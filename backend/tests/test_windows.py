import datetime as dt
import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from lunalens.api.main import app
from lunalens.windows.metrics import longest_run, metrics
from lunalens.windows.scenario import horizon_at, scenario, slip
from lunalens.windows.slip import slip_series
from lunalens.windows.standins import flat_horizon, synthetic_sun_earth_azel
from lunalens.windows.visibility import disk_fraction, link_open, sun_visible
from lunalens.windows.windows import countdown_hours, intervals, next_transition

START = dt.datetime(2026, 11, 14, tzinfo=dt.timezone.utc)


def test_disk_fraction_known_values():
    assert disk_fraction(np.array(0.0), 0.265) == pytest.approx(0.5)
    assert disk_fraction(np.array(0.5), 1.0) == pytest.approx(
        1 - (math.acos(0.5) - 0.5 * math.sqrt(0.75)) / math.pi
    )
    assert disk_fraction(np.array(0.5), 1.0) == pytest.approx(0.8045, abs=1e-4)


def test_disk_fraction_bounds():
    out = disk_fraction(np.array([-5.0, -0.265, 0.265, 5.0]), 0.265)
    assert out.tolist() == [0.0, 0.0, 1.0, 1.0]


def test_sun_visible_and_link_open():
    assert sun_visible(np.array([0.0, 0.01])).tolist() == [False, True]
    flags = link_open(np.array([3.0, 2.0, 1.0]), np.array([0.0, 0.0, 0.0]), 2.0)
    assert flags.tolist() == [True, False, False]


def test_intervals():
    flags = np.array([1, 1, 0, 0, 1, 0, 1, 1], dtype=bool)
    assert intervals(flags) == [(0, 2), (4, 5), (6, 8)]
    assert intervals(np.array([], dtype=bool)) == []
    assert intervals(np.zeros(4, dtype=bool)) == []
    assert intervals(np.ones(4, dtype=bool)) == [(0, 4)]


def test_next_transition():
    flags = np.array([1, 1, 0, 0, 1], dtype=bool)
    assert next_transition(flags, 0) == ("set", 2)
    assert next_transition(flags, 2) == ("rise", 4)
    assert next_transition(flags, 4) == (None, None)
    assert next_transition(np.ones(3, dtype=bool), 0) == (None, None)


def test_countdown_hours():
    times = np.arange(10, dtype=float)
    assert countdown_hours(times, 4, 1.5) == 2.5
    assert countdown_hours(times, None, 1.5) is None


def test_metrics():
    sun = np.array([1, 1, 1, 0, 0, 1], dtype=bool)
    link = np.array([0, 1, 1, 1, 0, 0], dtype=bool)
    result = metrics(sun, link)
    assert result["sunlit_hours"] == 4
    assert result["sunlit_share"] == pytest.approx(4 / 6)
    assert result["longest_sunlit_h"] == 3
    assert result["longest_dark_h"] == 2
    assert result["link_hours"] == 3
    assert result["longest_link_h"] == 3
    assert result["longest_link_gap_h"] == 2
    assert longest_run(np.array([], dtype=bool), True) == 0


def test_slip_series():
    sun = np.array([1] * 24 + [0] * 24 + [1] * 24, dtype=bool)
    link = np.ones(72, dtype=bool)
    rows = slip_series(sun, link, 2, 24)
    assert [row["sunlit_at_touchdown"] for row in rows] == [True, False, True]
    assert [row["continuous_sun_h"] for row in rows] == [24, 0, 24]
    assert rows[0]["link_share"] == 1.0


def test_horizon_at_interpolates_and_wraps():
    profile = {"elev_deg": [0.0, 10.0, 0.0, 0.0]}
    out = horizon_at(profile, np.array([0.0, 45.0, 90.0, 135.0, 360.0]))
    assert out.tolist() == [0, 5, 10, 5, 0]


def fixed_sky(sun_el, earth_el):
    def azel(lat, lon, alt_m, times):
        count = len(times)
        return {
            "sun_az": np.zeros(count),
            "sun_el": np.full(count, sun_el),
            "earth_az": np.full(count, 90.0),
            "earth_el": np.full(count, earth_el),
        }

    return azel


def test_scenario_always_lit_and_linked():
    result = scenario(
        -89.5, 0.0, START, 2.0,
        sun_earth_azel=fixed_sky(5.0, 10.0),
        horizon_profile=flat_horizon,
    )
    assert len(result["samples"]) == 49
    assert result["metrics"]["sunlit_share"] == 1.0
    assert result["metrics"]["link_share"] == 1.0
    assert len(result["sun_windows"]) == 1
    assert result["samples"][0]["time_utc"] == "2026-11-14T00:00:00Z"


def test_scenario_terrain_blocks_sun():
    def ridge(lat, lon, mast_m=2.0):
        data = flat_horizon(lat, lon, mast_m)
        data["elev_deg"] = [3.0] * 360
        return data

    result = scenario(
        -89.5, 0.0, START, 1.0,
        sun_earth_azel=fixed_sky(1.0, 10.0),
        horizon_profile=ridge,
    )
    assert result["metrics"]["sunlit_share"] == 0.0
    assert result["metrics"]["link_share"] == 1.0


def test_slip_with_standins():
    result = slip(
        -89.5, 0.0, START, 3,
        sun_earth_azel=synthetic_sun_earth_azel,
        horizon_profile=flat_horizon,
    )
    assert [row["slip_day"] for row in result["rows"]] == [0, 1, 2, 3]


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_scenario_503_without_science_packages(client, monkeypatch):
    monkeypatch.delenv("LUNALENS_STANDIN", raising=False)
    response = client.get(
        "/api/scenario", params={"lat": -89.5, "lon": 0, "start": "2026-11-14T00:00:00Z", "days": 1}
    )
    assert response.status_code == 503


def test_scenario_and_slip_with_standins(client, monkeypatch):
    monkeypatch.setenv("LUNALENS_STANDIN", "1")
    params = {"lat": -89.5, "lon": 0, "start": "2026-11-14T00:00:00Z"}
    scenario_response = client.get("/api/scenario", params={**params, "days": 2})
    assert scenario_response.status_code == 200
    assert len(scenario_response.json()["samples"]) == 49
    slip_response = client.get("/api/slip", params={**params, "slip_days": 2})
    assert slip_response.status_code == 200
    assert len(slip_response.json()["rows"]) == 3


def test_validation_endpoint_responds(client):
    assert client.get("/api/validation").status_code == 200
