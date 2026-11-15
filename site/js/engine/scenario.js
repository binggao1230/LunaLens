// One UTC scenario for every Expert view: the touchdown, the stay and the conditions.
// Pure functions only: no DOM, no network. Times are milliseconds since the epoch, UTC.
// The evaluator samples one touchdown per hour, so every start is snapped to the hour grid
// and the grid offset is reported instead of being hidden.

export const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Screening assumptions. These are editable defaults, not mission requirements. */
export const DEFAULT_CONDITIONS = Object.freeze({
  stayH: 709,
  marginDeg: 2,
  requiredSunH: 156,
  requireEarthAtTouchdown: true,
});

export const STAY_CHOICES = Object.freeze([
  { key: 'lunar1', label: '1 lunar day', hours: 709 },
  { key: 'days14', label: '14 Earth days', hours: 336 },
  { key: 'lunar2', label: '2 lunar days', hours: 1417 },
]);

export const RANKINGS = Object.freeze(['flexibility', 'overlap']);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Validate one set of conditions. Returns { ok, errors, conditions }. */
export function normalizeConditions(input = {}, base = DEFAULT_CONDITIONS) {
  const raw = { ...base, ...input };
  const errors = [];
  const stayH = Number(raw.stayH);
  const marginDeg = Number(raw.marginDeg);
  const requiredSunH = Number(raw.requiredSunH);
  const requireEarthAtTouchdown = Boolean(raw.requireEarthAtTouchdown);
  if (!Number.isInteger(stayH) || stayH < 1) errors.push({ code: 'stay', message: 'Stay must be a whole number of hours.' });
  if (!isNum(marginDeg) || marginDeg < -45 || marginDeg > 45) errors.push({ code: 'margin', message: 'Earth margin must be between −45° and 45°.' });
  if (!isNum(requiredSunH) || requiredSunH < 0 || !Number.isInteger(requiredSunH)) errors.push({ code: 'requiredSun', message: 'Continuous sunlight must be a whole number of hours.' });
  if (Number.isInteger(stayH) && isNum(requiredSunH) && requiredSunH > stayH) errors.push({ code: 'sunLongerThanStay', message: 'Continuous sunlight from touchdown cannot exceed the stay.' });
  return { ok: errors.length === 0, errors, conditions: { stayH, marginDeg, requiredSunH, requireEarthAtTouchdown } };
}

/** Data bounds as sample times. `lastMs` is the timestamp of the final hourly sample. */
export function dataBounds(ephemeris) {
  const firstMs = ephemeris.t0;
  const lastMs = ephemeris.tEnd;
  return { firstMs, lastMs, stepMs: ephemeris.stepMs, startIndex: 0, endIndex: ephemeris.n };
}

/** The latest touchdown whose stay still ends at or before the last sample (conservative bound). */
export function latestCompleteTouchdown(bounds, stayH) {
  return bounds.lastMs - stayH * HOUR_MS;
}

/** Years that intersect the loaded ephemeris, ascending. */
export function availableYears(bounds) {
  if (!isNum(bounds.firstMs) || !isNum(bounds.lastMs)) return [];
  const first = new Date(bounds.firstMs).getUTCFullYear();
  const last = new Date(bounds.lastMs).getUTCFullYear();
  const out = [];
  for (let y = first; y <= last; y++) out.push(y);
  return out;
}

const yearStart = (y) => Date.UTC(y, 0, 1);

/** A half-year as an end-exclusive UTC range: half 1 = Jan–Jun, half 2 = Jul–Dec. */
export function halfYearRange(year, half) {
  const y = Number(year);
  return half === 2 ? { startMs: Date.UTC(y, 6, 1), endMs: Date.UTC(y + 1, 0, 1) } : { startMs: yearStart(y), endMs: Date.UTC(y, 6, 1) };
}

export function yearRange(year) {
  const y = Number(year);
  return { startMs: yearStart(y), endMs: Date.UTC(y + 1, 0, 1) };
}

export function dayRange(ms) {
  const start = Math.floor(ms / DAY_MS) * DAY_MS;
  return { startMs: start, endMs: start + DAY_MS };
}

/**
 * Build the request for one of the five supported entry modes.
 * `kind`: 'hour' | 'day' | 'half' | 'year' | 'range'.
 * `endMs` is end-exclusive for 'range'; a date-only UI end maps to the next midnight before calling.
 */
export function makeRequest({ kind = 'range', touchdownMs, startMs, endMs, year, half = 1 } = {}) {
  if (kind === 'hour') return { kind, touchdownMs };
  if (kind === 'day') return { kind, ...dayRange(touchdownMs) };
  if (kind === 'half') return { kind, year: Number(year), half, ...halfYearRange(year, half) };
  if (kind === 'year') return { kind, year: Number(year), ...yearRange(year) };
  return { kind: 'range', startMs, endMs };
}

const snapUp = (ms, t0, step) => t0 + Math.ceil((ms - t0) / step) * step;
const snapDown = (ms, t0, step) => t0 + Math.floor((ms - t0) / step) * step;

/**
 * Normalize a request against the loaded data.
 * Returned `evaluated` is the part of the request that can hold a complete stay; the rest is
 * reported as omitted rather than silently clamped. `state` is 'full', 'partial' or 'none'.
 */
export function normalizeRequest(request, bounds, conditions) {
  const cond = normalizeConditions(conditions);
  if (!cond.ok) return { ok: false, errors: cond.errors, state: 'invalid', conditions: cond.conditions };
  const c = cond.conditions;
  const step = bounds.stepMs || HOUR_MS;
  const latest = latestCompleteTouchdown(bounds, c.stayH);
  const dataEndExclusive = bounds.lastMs + step;
  const base = { ok: true, errors: [], conditions: c, requested: null, evaluated: null, coverage: null, preview: null };
  const noCoverage = (reason, requested) => ({
    ...base, state: 'none',
    requested: requested ?? null,
    coverage: { state: 'none', reason, requestedHours: requested ? Math.max(0, (requested.endMs - requested.startMs) / HOUR_MS) : 0, evaluatedHours: 0, omittedHours: requested ? Math.max(0, (requested.endMs - requested.startMs) / HOUR_MS) : 0, latestTouchdownMs: latest },
  });

  if (request?.kind === 'hour') {
    if (!isNum(request.touchdownMs)) return { ...noCoverage('invalid-time'), state: 'invalid' };
    const snapped = snapDown(request.touchdownMs, bounds.firstMs, step);
    const adjustedMs = snapped - request.touchdownMs;
    const requested = { startMs: snapped, endMs: snapped + step, kind: 'hour' };
    if (snapped < bounds.firstMs || snapped > latest) {
      const reason = snapped > latest ? 'no-complete-stay' : 'before-data';
      return { ...noCoverage(reason, requested), adjustedMs, requested };
    }
    return {
      ...base, state: 'full', kind: 'hour', touchdownMs: snapped, adjustedMs,
      requested, evaluated: { startMs: snapped, endMs: snapped + step, count: 1 },
      coverage: { state: 'full', reason: null, requestedHours: 1, evaluatedHours: 1, omittedHours: 0, latestTouchdownMs: latest },
    };
  }

  if (!isNum(request?.startMs) || !isNum(request?.endMs)) return { ...noCoverage('invalid-range'), state: 'invalid' };
  if (request.endMs <= request.startMs) {
    return { ...noCoverage('empty-range', request), state: 'invalid', errors: [{ code: 'range', message: 'The end of the range must be after its start.' }] };
  }
  const requested = { startMs: request.startMs, endMs: request.endMs };
  const requestedHours = (request.endMs - request.startMs) / HOUR_MS;
  const start = snapUp(Math.max(request.startMs, bounds.firstMs), bounds.firstMs, step);
  const end = snapDown(Math.min(request.endMs, dataEndExclusive), bounds.firstMs, step);
  const lastStart = snapDown(latest, bounds.firstMs, step) + step; // exclusive: latest complete start plus one hour
  const from = start, to = Math.min(end, lastStart);
  const evaluatedHours = Math.max(0, (to - from) / HOUR_MS);
  const coverage = {
    state: evaluatedHours === 0 ? 'none' : (from <= request.startMs + 1 && to >= request.endMs - 1 && evaluatedHours === requestedHours ? 'full' : 'partial'),
    reason: null, requestedHours, evaluatedHours,
    omittedHours: Math.max(0, requestedHours - evaluatedHours),
    latestTouchdownMs: latest,
  };
  if (evaluatedHours === 0) {
    const reason = request.endMs <= bounds.firstMs ? 'before-data'
      : request.startMs > latest ? 'no-complete-stay'
        : 'no-complete-stay';
    return { ...noCoverage(reason, requested), kind: request.kind, coverage: { ...coverage, reason } };
  }
  return {
    ...base, kind: request.kind, requested, preview: { previewMs: null },
    evaluated: { startMs: from, endMs: to, count: evaluatedHours, startIndex: Math.round((from - bounds.firstMs) / step), endIndex: Math.round((to - bounds.firstMs) / step) },
    coverage,
  };
}

/**
 * Keep the preview cursor independent of the touchdown. It is clamped to the evaluated stay
 * and to the data; it never changes the touchdown or the coverage decision.
 */
export function clampPreview(previewMs, touchdownMs, conditions, bounds) {
  if (!isNum(previewMs)) return null;
  const end = Math.min(touchdownMs + conditions.stayH * HOUR_MS, bounds.lastMs + bounds.stepMs);
  return Math.min(Math.max(previewMs, touchdownMs), end);
}

/** Human label for a request kind, used by results and logs. */
export function requestLabel(request) {
  if (!request) return '';
  if (request.kind === 'hour') return 'exact hour';
  if (request.kind === 'day') return 'day';
  if (request.kind === 'half') return `H${request.half} ${request.year}`;
  if (request.kind === 'year') return `${request.year}`;
  return 'custom range';
}
