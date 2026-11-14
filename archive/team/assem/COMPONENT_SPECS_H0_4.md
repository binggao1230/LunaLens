# H0–4 Component Specifications: SitePicker & ScenarioSettings

This document specifies the component interface, visual layout, validation logic,
and mobile interaction behavior for the H0–4 frontend components owned by
Frontend B (Assem): `SitePicker` and `ScenarioSettings`.

---

## 1. `SitePicker` (`web/src/features/scenario/SitePicker.tsx`)

### 1.1 Responsibilities
- Render the curated sites retrieved from `/api/sites` grouped by their `category`.
- Visually indicate the currently selected site (curated or custom).
- Provide a dual-field custom coordinate input form for `latitude` and `longitude`.
- Provide inline error feedback for invalid coordinates.
- Remain usable when curated sites fail to load or return empty.

### 1.2 Component Interface (Props)

The component connects to the shared Zustand store `useScenarioStore` by default,
while supporting optional props for headless / unit testing:

```typescript
export interface SitePickerProps {
  /** Optional scenario ID to edit (defaults to activeScenarioId) */
  scenarioId?: string;
  /** Optional override callback for testing */
  onSelectSite?: (site: SiteInfo) => void;
  onCustomCoordinates?: (lat: number, lon: number) => void;
}
```

### 1.3 Internal State & Validation Logic

Custom coordinate entry uses local state for draft values before submitting:

```typescript
interface CustomCoordFormState {
  latInput: string;
  lonInput: string;
  latError: string | null;
  lonError: string | null;
}
```

#### Validation Rules:
1. **Latitude (`lat`)**:
   - Required, non-empty, parseable float.
   - Range: `-90.00` to `+90.00` (inclusive).
   - South latitude is negative.
   - Error message: `"Latitude must be between -90.00° and 90.00°"`.
2. **Longitude (`lon`)**:
   - Required, non-empty, parseable float.
   - Range: `0.00` to `360.00` (inclusive, east-positive).
   - Negative values are rejected (no auto-modulo or silent clamping).
   - Error message: `"Longitude must be between 0.00° and 360.00°"`.
3. **Submit Action (`Apply coordinates`)**:
   - Disabled while either field has an error or is empty.
   - Upon click or Enter key: invokes `setCustomCoordinates(scenarioId, lat, lon)`.
   - Clears inputs or syncs them to formatted `lat.toFixed(2)` and `lon.toFixed(2)`.

### 1.4 Curated Site Groups
- Sites are grouped by `category` (e.g. `"Artemis III candidates"`, `"Apollo"`, `"CLPS / Commercial"`, `"Other nations"`).
- Empty groups are not rendered.
- Each site row displays:
  - Site name (`SiteInfo.name`)
  - Formatted coordinates: e.g. `89.67°S, 129.80°E`
  - Active check / indicator (distinct icon or text badge, not color alone).

---

## 2. `ScenarioSettings` (`web/src/features/scenario/ScenarioSettings.tsx`)

### 2.1 Responsibilities
- Configure landing date and time in UTC.
- Select stay duration (default 29.53 days).
- Select mast height (default 2.0 m).
- Select Earth link clearance margin (default 2.0°).
- Update the scenario settings through `updateScenarioSettings`.

### 2.2 Component Interface (Props)

```typescript
export interface ScenarioSettingsProps {
  /** Optional scenario ID to edit (defaults to activeScenarioId) */
  scenarioId?: string;
  /** Optional override callback for testing */
  onUpdateSettings?: (settings: Partial<ScenarioSettings>) => void;
}
```

### 2.3 Field Specifications

| Field | Input Type | Range / Options | Default | Behavior |
|---|---|---|---|---|
| **Landing Date (UTC)** | `<input type="date">` | `2025-01-01` to `2035-12-31` | `2027-01-01` | Saved as UTC ISO string. |
| **Landing Time (UTC)** | `<input type="time">` | `00:00` to `23:59` (step 60s) | `00:00` | Merged with date as `YYYY-MM-DDTHH:MM:00Z`. |
| **Stay Duration** | `<select>` or numeric | `1.0`, `7.0`, `14.0`, `29.53`, `60.0` days | `29.53 days (1 lunar day)` | Selectable preset with 29.53 as default. |
| **Mast Height** | `<select>` or slider | `1.0 m`, `2.0 m`, `5.0 m`, `10.0 m` | `2.0 m` | Elevation offset relative to local terrain. |
| **Link Margin** | `<select>` or slider | `0.0°`, `1.0°`, `2.0°`, `5.0°` | `2.0°` | Clearance above terrain for Direct-to-Earth. |

### 2.4 UTC Instant Handling
To prevent local browser timezone offset drift:
```typescript
function parseUtcDateTime(startUtc: string): { date: string; time: string } {
  const d = new Date(startUtc);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 16);
  return { date, time };
}

function buildUtcIsoString(dateStr: string, timeStr: string): string {
  // Directly assemble ISO-8601 UTC string without creating a local Date
  return `${dateStr}T${timeStr}:00Z`;
}
```

---

## 3. Responsive & Accessibility Criteria (at 390 px)

1. **Touch targets**: All interactive elements (buttons, selects, inputs, site rows) must have a minimum touch target height of `44px`.
2. **Stacked layout**: In viewports under `768px`, the coordinate form stacks `latitude` and `longitude` inputs vertically.
3. **No horizontal overflow**: All error messages and site coordinate strings wrap cleanly within a `390px` viewport.
4. **Accessible cues**:
   - Active site indicated by a checkmark badge `[Selected]` and border style, never color alone.
   - Inputs carry descriptive `<label>` elements and `aria-invalid` attributes when in error.
