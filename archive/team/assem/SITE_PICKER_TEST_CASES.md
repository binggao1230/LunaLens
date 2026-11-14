# Site Picker and Scenario Settings Test Cases

These checks validate the behavior defined in
[SITE_PICKER_CONTRACT.md](./SITE_PICKER_CONTRACT.md). They are intended for
implementation testing once the shared frontend scaffold is available.

## Test data

Use the following values unless a test specifies otherwise:

| Value | Test data |
|---|---|
| Curated site | Any site returned by `/api/sites` |
| Valid custom latitude | `-89.45` |
| Valid custom longitude | `222.69` |
| Boundary latitude values | `-90`, `90` |
| Boundary longitude values | `0`, `360` |
| Invalid latitude values | `-90.01`, `90.01` |
| Invalid longitude values | `-0.01`, `360.01` |
| Default landing instant | `2027-01-01T00:00:00Z` |
| Default duration | `29.53` days |
| Default mast height | `2 m` |
| Default link margin | `2°` |

## Functional cases

### SP-001 — Render curated sites by category

**Given** the API returns at least two sites in different categories
**When** the picker finishes loading
**Then** each site appears once under its API category, with its name and
formatted coordinates.

### SP-002 — Select a curated site

**Given** the picker has loaded curated sites
**When** the user selects a site
**Then** that site is visibly selected and becomes the active scenario site.

**And** the landing instant, duration, mast height, and link margin remain
unchanged.

### SP-003 — Submit valid custom coordinates

**Given** the user enters latitude `-89.45` and longitude `222.69`
**When** the user submits the custom point
**Then** the active scenario uses those coordinates and the coordinate fields
remain formatted to two decimal places.

**And** the other scenario settings remain unchanged.

### SP-004 — Accept coordinate boundaries

**When** the user submits each valid boundary pair:

- latitude `-90`, longitude `0`;
- latitude `90`, longitude `360`;

**Then** the values are accepted without a validation error.

### SP-005 — Reject invalid coordinates inline

**When** the user enters any invalid value from the test data
**Then** the relevant field shows an inline error, the custom-point action is
disabled, and no active scenario change occurs.

The UI must not silently clamp or wrap the value.

### SP-006 — Reject incomplete coordinates

**When** either coordinate field is empty or non-numeric
**Then** the relevant field shows an inline error and the custom-point action is
disabled.

### SP-007 — Preserve settings when changing site

**Given** the user has changed the landing instant, duration, mast height, and
link margin
**When** the user selects another curated site or submits valid custom
coordinates
**Then** all four settings retain their values.

### SP-008 — Preserve site when changing settings

**Given** a curated or custom site is active
**When** the user changes any scenario setting
**Then** the active site and its coordinates remain unchanged.

### SP-009 — Store the UTC landing instant

**Given** the user enters date `2027-01-01` and time `00:00`
**When** the setting is saved
**Then** the shared scenario state contains
`2027-01-01T00:00:00Z`.

The result must be identical regardless of the browser's local timezone.

### SP-010 — Apply the default settings

**Given** a new scenario is created
**Then** its initial settings are:

- duration: `29.53` days;
- mast height: `2 m`;
- link margin: `2°`.

## API state cases

### SP-011 — Show loading state

**Given** the `/api/sites` request is pending
**Then** the picker shows a non-interactive loading state and does not display
stale site data as current.

Custom coordinate entry remains available if the surrounding layout supports it.

### SP-012 — Handle an empty site response

**Given** `/api/sites` returns an empty list
**Then** the picker explains that no curated sites are available, while custom
coordinates remain usable.

### SP-013 — Handle a site request error

**Given** `/api/sites` fails
**Then** the picker shows an explicit error and does not present a success-shaped
fallback. Custom coordinates remain usable.

## Responsive cases

### SP-014 — Use the picker at phone width

**Given** a viewport approximately 390 px wide
**When** the user opens the site picker
**Then** category headings, site rows, coordinate fields, validation messages,
and the primary action are readable without horizontal scrolling.

### SP-015 — Operate controls by touch

**Given** a viewport approximately 390 px wide
**When** the user taps a site row, coordinate field, and primary action
**Then** each control has a usable touch target and the active state is
communicated by text, border, icon, or another non-color cue.

## Completion evidence

For each implemented case, record:

1. the test ID;
2. the browser viewport and local timezone;
3. the result;
4. a screenshot or test output when the case fails.

The cases requiring the live API must be rerun against the mock response first
and against the live server after the H12 integration checkpoint.
