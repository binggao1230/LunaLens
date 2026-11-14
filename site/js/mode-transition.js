// The animated switch between Expert and Education mode: a circle wipes out from the control that was pressed,
// shows the guide (or the planner icon) for a moment while the page underneath changes, then fades away.
// With prefers-reduced-motion the mode just flips. Only the overlay lives here; the mode itself is in mode.js.
import { setMode, getMode } from './mode.js';
import { t } from './i18n.js';
import { escapeHtml } from './format.js';
import { CHARACTER_SVG } from './edu/character.js';

const ICON_PLANNER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M12 12l6.4-6.4"/></svg>';
const FLIP_AT = 260, HOLD_UNTIL = 700, DONE_AT = 1100;
let run = 0;

/** Switch to `mode` with the wipe starting at `origin` (an element or nothing). Returns at once. */
export function switchMode(mode, origin) {
  if (mode === getMode()) return;
  const overlay = document.getElementById('mode-wipe');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!overlay || reduced) { setMode(mode); return; }
  const rect = origin?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2, y = rect ? rect.top + rect.height / 2 : 40;
  overlay.style.setProperty('--x', `${x}px`);
  overlay.style.setProperty('--y', `${y}px`);
  overlay.dataset.mode = mode;
  const education = mode === 'education';
  overlay.innerHTML = `<div class="wipe-card">
    <div class="${education ? 'edu-char mood-celebrating' : 'wipe-icon'}">${education ? CHARACTER_SVG : ICON_PLANNER}</div>
    <b>${escapeHtml(t(education ? 'Education mode' : 'Expert mode'))}</b>
    <span>${escapeHtml(t(education ? 'Simpler view, with a guide' : 'Full controls and numbers'))}</span>
  </div>`;
  const token = ++run;
  overlay.classList.remove('out');
  overlay.classList.add('show');
  setTimeout(() => { if (token === run) setMode(mode); }, FLIP_AT);
  setTimeout(() => { if (token === run) overlay.classList.add('out'); }, HOLD_UNTIL);
  setTimeout(() => { if (token === run) { overlay.classList.remove('show', 'out'); overlay.innerHTML = ''; } }, DONE_AT);
}
