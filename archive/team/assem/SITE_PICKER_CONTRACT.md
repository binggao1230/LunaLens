# Site Picker and Scenario Settings Contract

This contract defines the behavior for the site picker and scenario settings before
the shared frontend scaffold is available.

## Scope

The feature lets a user:

- choose a curated lunar site from grouped lists;
- enter a custom latitude and longitude;
- set the landing date and UTC time;
- set the stay duration, mast height, and Earth-link margin;
- update the active scenario through the shared state.

The feature does not calculate ephemeris, terrain horizons, or visibility metrics.
Those values come from the API and shared state owned by other contributors.

## Curated site picker

### Input data

The picker consumes the `/api/sites` response:

```text
id, name, lat, lon, category, source
```

Each site is displayed with its name, category, and formatted coordinates. The
source is retained for the trust/data view but is not required in the compact
picker row.

### Groups

Sites are grouped by their API `category` value. The UI must not invent or
rewrite categories supplied by the API. Empty groups are not rendered.

### States

| State | Behavior |
|---|---|
| Loading | Show a non-interactive loading state in the picker. |
| Loaded | Render grouped sites and identify the active site. |
| Empty | Show that no curated sites are available and keep custom coordinates usable. |
| Error | Show an explicit error and keep custom coordinates usable. |
| Selected | Update the active scenario and visibly mark the selected site. |

Selecting a curated site must not change the landing date, UTC time, duration,
mast height, or link margin.

## Custom coordinates

### Validation

| Field | Required range | Precision |
|---|---:|---:|
| Latitude | `-90` to `90` degrees | `0.01` degree |
| Longitude | `0` to `360` degrees east-positive | `0.01` degree |

The fields reject empty, non-numeric, and out-of-range values. Validation errors
are shown inline and associated with the relevant input. The submit action is
disabled while either field is invalid.

Values are not silently clamped or wrapped. In particular, longitude `360` is
accepted as the upper boundary, while negative longitude is rejected.

Submitting valid coordinates creates or selects a custom site in the active
scenario. It must not alter the other scenario settings.

## Scenario settings

| Setting | UI behavior | Default |
|---|---|---|
| Landing date | Required UTC calendar date | `2027-01-01` until shared state provides another value |
| Landing time | Required UTC time | `00:00 UTC` until shared state provides another value |
| Stay duration | Selectable duration in days | `29.53` days (one lunar day) |
| Mast height | Selectable height in metres | `2 m` |
| Link margin | Selectable margin in degrees | `2°` |

The date and time are stored and sent as one ISO-8601 UTC `start` value. Local
timezone conversion must not change the selected UTC instant.

Changing a setting updates only the active scenario. It does not update other
scenarios in the comparison set.

## Responsive behavior

At approximately 390 px:

- site groups remain vertically readable;
- coordinate fields stack or remain large enough for touch input;
- validation text is visible without horizontal scrolling;
- the primary action remains reachable after the fields;
- the active selection is communicated by more than color alone.

## Acceptance checks

1. A user can select a curated site and see its active state.
2. A user can enter a valid custom point using two numbers.
3. Invalid latitude and longitude values produce inline errors.
4. Selecting a site preserves all scenario settings.
5. Changing a setting preserves the selected site.
6. A UTC date and time round-trip without local timezone drift.
7. The default stay covers one lunar day (`29.53` days).
8. The picker remains usable at approximately 390 px wide.

## Integration boundary

The implementation must import shared state and API types rather than creating a
second scenario model. The exact store actions and generated type names remain
deferred until Eya's scaffold is available.
