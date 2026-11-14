// Global mode: 'expert' (the planner, today's behaviour) or 'education' (the guided story).
// One value for the whole app, read by the header toggle, the start-page chooser and the Education controller.
// Persisted in the URL hash (#/<view>/education or #/<view>/expert) and in localStorage, so a shared link or a
// reload keeps the mode. Every storage access is wrapped: private windows and blocked storage must not break the app.
const MODES = ['expert', 'education'];
const KEY = 'lunalens-mode';
let mode = 'expert';
const listeners = new Set();

export const getMode = () => mode;
export const isEducation = () => mode === 'education';
export const isMode = (value) => MODES.includes(value);

/** Split "#/mission/education" (any order, any of the two parts missing) into { view, mode }. */
export function parseHash(hash) {
  const parts = String(hash ?? '').replace(/^#/, '').split('/').filter(Boolean);
  const found = parts.find(isMode) ?? null;
  const view = parts.find((part) => !isMode(part)) ?? '';
  return { view, mode: found };
}
export const formatHash = (view, value = mode) => `#/${view}/${value}`;

/** Read the initial mode: the URL hash wins, then localStorage, then 'expert'. */
export function initMode() {
  let next = null;
  try { next = parseHash(globalThis.location?.hash).mode; } catch {}
  if (!next) { try { next = globalThis.localStorage?.getItem(KEY); } catch {} }
  mode = isMode(next) ? next : 'expert';
  return mode;
}

/** Change the mode and tell every listener. Returns false when nothing changed. */
export function setMode(next) {
  if (!isMode(next) || next === mode) return false;
  mode = next;
  try { localStorage.setItem(KEY, next); } catch {}
  for (const listener of listeners) listener(mode);
  return true;
}

export function onMode(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
