# Frontend Integration Checklist

This checklist is for integrating the site picker, scenario settings, map, and
comparison features once the shared frontend scaffold is available.

## Required inputs from Eya

- [ ] `web/` scaffold and package scripts
- [ ] shared scenario state location and public actions
- [ ] active-scenario selection action
- [ ] current-time state shape
- [ ] API client location and loading/error conventions
- [ ] generated API types, especially the site response
- [ ] test runner and browser validation command

## Integration rules

- [ ] Import shared state and API types; do not create a second scenario model.
- [ ] Keep feature imports limited to `state/`, `api/`, `ui/`, and `lib/`.
- [ ] Keep map, picker, settings, compare, and slip code inside the paths owned
      by Frontend B.
- [ ] Preserve the API's east-positive longitude convention from `0` to `360`.
- [ ] Store the landing instant as an ISO-8601 UTC value.
- [ ] Surface API failures explicitly; do not replace failed data with fake
      success-shaped values.
- [ ] Keep custom-coordinate entry usable when curated-site loading fails.

## Site picker integration

- [ ] Map the API site fields to display rows without changing their category.
- [ ] Connect curated-site selection to the active scenario action.
- [ ] Connect custom-coordinate submission to the scenario action.
- [ ] Preserve all non-site settings when changing the site.
- [ ] Implement the cases in `SITE_PICKER_TEST_CASES.md`.

## Scenario settings integration

- [ ] Connect date and time controls to the shared scenario state.
- [ ] Verify local browser timezone does not alter the UTC instant.
- [ ] Connect duration, mast height, and link margin controls.
- [ ] Preserve the active site when changing settings.
- [ ] Verify the API query receives `start`, `days`, `mast_m`, and `margin_deg`.

## Map integration

- [ ] Load map assets through the agreed public asset path.
- [ ] Render curated markers from API site coordinates.
- [ ] Render the active marker distinctly without relying on color alone.
- [ ] Convert pointer/touch positions to latitude/longitude through the shared
      geo helper.
- [ ] Reject or explain points outside the map's supported bounds.
- [ ] Re-run the projection checks in `MAP_PROJECTION_CONTRACT.md`.

## Review gate

Do not merge the feature implementation until:

1. the shared state actions are identified in code;
2. the generated API types compile;
3. the focused picker and settings cases pass;
4. the map projection check passes for the known points;
5. the layout is checked at approximately 390 px and desktop width.
