import { t, locale } from './i18n.js';
const pad = (n) => String(n).padStart(2, '0');

export const DAY_MS = 86400000;
export const monthName = (month) => new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month)));

export function fmtDate(ms) {
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ms));
}

export function fmtDayMonth(ms) {
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(ms));
}

export function fmtTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const fmtDateTime = (ms) => `${fmtDate(ms)}, ${fmtTime(ms)} UTC`;

export function isoDate(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const utcMidnight = (ms) => Math.floor(ms / DAY_MS) * DAY_MS;

/** Signed number with a real minus sign, e.g. +1.20 / −0.35. */
export function signed(value, digits = 1) {
  const text = Math.abs(value).toFixed(digits);
  return `${value < 0 && Number(text) !== 0 ? '−' : '+'}${text}`;
}

export const fmtDeg = (value, digits = 1) => (Number(Math.abs(value).toFixed(digits)) === 0 ? '0°' : `${signed(value, digits)}°`);

export function fmtLat(lat, digits = 2) {
  return `${Math.abs(lat).toFixed(digits)}°${t(lat < 0 ? 'S' : 'N')}`;
}

export function fmtLon(lon, digits = 2) {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(wrapped).toFixed(digits)}°${t(wrapped < 0 ? 'W' : 'E')}`;
}

export const fmtLatLon = (lat, lon, digits = 2) => `${fmtLat(lat, digits)} ${fmtLon(lon, digits)}`;

export function fmtHours(hours) {
  if (hours < 48) return `${hours} ${t('h')}`;
  const days = hours / 24;
  return `${days.toFixed(days < 10 ? 1 : 0)} ${t('d')}`;
}

export function compass(azDeg) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return t(names[Math.round((((azDeg % 360) + 360) % 360) / 45) % 8]);
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}
