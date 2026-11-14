# Shared Scenario State Contract (Zustand)

This contract defines the shared scenario state structure, Zustand store interface,
and action signatures required by the Frontend B features (`SitePicker`, `ScenarioSettings`,
`PolarMap`, `CompareTable`, `SlipChart`).

It serves as the specification agreed between Frontend B (Assem) and Frontend A (Eya)
for implementation in `web/src/state/scenarios.ts`.

---

## 1. State Model

### 1.1 Types and Models

```typescript
export interface SiteInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category: string;
  source: string;
}

export interface ScenarioSite {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  source?: string;
  isCustom: boolean;
}

export interface ScenarioSettings {
  /** ISO-8601 UTC timestamp, e.g. "2027-01-01T00:00:00Z" */
  startUtc: string;
  /** Stay duration in Earth days (default: 29.53) */
  durationDays: number;
  /** Mast / antenna height in metres (default: 2.0) */
  mastM: number;
  /** Earth communication clearance margin in degrees (default: 2.0) */
  marginDeg: number;
}

export interface Scenario {
  id: string;
  name: string;
  site: ScenarioSite;
  settings: ScenarioSettings;
}

export interface ScenarioState {
  // Scenarios collection
  scenarios: Scenario[];
  activeScenarioId: string;

  // Curated sites library (loaded from /api/sites)
  curatedSites: SiteInfo[];
  curatedSitesLoading: boolean;
  curatedSitesError: string | null;

  // Actions
  setCuratedSites: (sites: SiteInfo[]) => void;
  setCuratedSitesLoading: (loading: boolean) => void;
  setCuratedSitesError: (error: string | null) => void;

  setActiveScenario: (id: string) => void;
  selectCuratedSite: (scenarioId: string, site: SiteInfo) => void;
  setCustomCoordinates: (scenarioId: string, lat: number, lon: number, customName?: string) => void;
  updateScenarioSettings: (scenarioId: string, settings: Partial<ScenarioSettings>) => void;
  
  addScenario: (initialSite?: ScenarioSite) => string;
  duplicateScenario: (scenarioId: string) => string;
  removeScenario: (scenarioId: string) => void;
}
```

---

## 2. Default Values & Invariants

### 2.1 Default Scenario Settings
- `startUtc`: `"2027-01-01T00:00:00Z"` (ISO-8601 UTC)
- `durationDays`: `29.53` (1 synodic lunar month)
- `mastM`: `2.0` (metres)
- `marginDeg`: `2.0` (degrees)

### 2.2 Default Initial Scenario
When the application starts, it contains at least one scenario:
```typescript
export const DEFAULT_INITIAL_SCENARIO: Scenario = {
  id: "scenario-1",
  name: "Scenario 1",
  site: {
    id: "shackleton-rim",
    name: "Shackleton rim crest",
    lat: -89.67,
    lon: 129.8,
    category: "Artemis III candidates",
    source: "NASA Artemis III candidate regions",
    isCustom: false,
  },
  settings: {
    startUtc: "2027-01-01T00:00:00Z",
    durationDays: 29.53,
    mastM: 2.0,
    marginDeg: 2.0,
  },
};
```

### 2.3 Hard Invariants
1. **Latitude**: Range `[-90.0, 90.0]` degrees (south is negative).
2. **Longitude**: Range `[0.0, 360.0]` degrees (east-positive).
3. **UTC preservation**: Time strings must strictly use UTC (`Z` offset), preventing local browser timezone drift.
4. **Isolation**: Updating a site or setting on scenario `A` must not mutate scenario `B`.
5. **Selection preservation**:
   - Changing a site preserves `startUtc`, `durationDays`, `mastM`, and `marginDeg`.
   - Changing scenario settings preserves the site coordinates.
6. **Active scenario count**: `scenarios.length` must remain between 1 and 4 for comparison views (F6).

---

## 3. Zustand Action Specifications

### 3.1 `selectCuratedSite(scenarioId: string, site: SiteInfo)`
- Updates `scenario.site` with the chosen `SiteInfo`.
- Sets `isCustom: false`.
- Preserves all other scenario settings.
- If `scenario.name` was the default site name, it updates to the new site name.

### 3.2 `setCustomCoordinates(scenarioId: string, lat: number, lon: number, customName?: string)`
- Validates latitude in `[-90, 90]` and longitude in `[0, 360]`.
- Updates `scenario.site` to `{ lat, lon, isCustom: true, name: customName ?? \`Custom (\${lat.toFixed(2)}°, \${lon.toFixed(2)}°)\` }`.
- Preserves all settings.

### 3.3 `updateScenarioSettings(scenarioId: string, settings: Partial<ScenarioSettings>)`
- Merges valid fields (`startUtc`, `durationDays`, `mastM`, `marginDeg`).
- Preserves the site.

### 3.4 `duplicateScenario(scenarioId: string)`
- Creates a deep copy of scenario with a new unique ID.
- Gives it a distinguished name, e.g. `"<Original Name> (copy)"`.
- Appends to `scenarios` (up to the 4-scenario limit).
- Returns the new scenario ID.

### 3.5 `removeScenario(scenarioId: string)`
- Removes the scenario if `scenarios.length > 1`.
- If the removed scenario was `activeScenarioId`, active scenario shifts to the previous or first remaining scenario.

---

## 4. Component Selectors Pattern

Components consume specific state slices via Zustand selectors to avoid redundant renders:

```typescript
// Active scenario selector
export const selectActiveScenario = (state: ScenarioState): Scenario | undefined =>
  state.scenarios.find((s) => s.id === state.activeScenarioId);

// Usage in SitePicker:
// const activeScenario = useScenarioStore(selectActiveScenario);
// const curatedSites = useScenarioStore((s) => s.curatedSites);
// const selectCuratedSite = useScenarioStore((s) => s.selectCuratedSite);
// const setCustomCoordinates = useScenarioStore((s) => s.setCustomCoordinates);
```
