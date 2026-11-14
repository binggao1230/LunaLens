import { loadEphemeris } from './engine/ephemeris.js';
import { Site } from './engine/site.js';
import { loadDem, computeHorizon } from './engine/dem.js';
import { t, getLanguage, setLanguage, initTranslations, applyTranslations } from './i18n.js';
import './team-messages.js';
import { escapeHtml, fmtLatLon, utcMidnight } from './format.js';
import { createMission } from './views/mission.js';
import { evaluateSiteMcda } from './engine/metrics.js';
import { createPlan } from './views/plan.js';

const D2R = Math.PI / 180, R2D = 180 / Math.PI, DAY = 864e5, HOUR = 36e5;
// A site has a terrain model when its horizon came from LOLA rather than from a smooth sphere.
const isModelled = (s) => Boolean(s.terrain && s.terrain !== 'none');
const SLIP_DAYS = 28, LOOKAHEAD_H = 60 * 24, SIM_H = SLIP_DAYS * 24 + LOOKAHEAD_H;
const SUN_R = 0.265;
const STAYS = { lunar1: 709, days14: 336, lunar2: 1417 };
const GROUP_ORDER = ['Polar rims', 'Landed', 'Apollo'];
const DEFAULT_SITE = 'shackleton-rim';
const SITE_SOURCES = {
  apollo11: 'https://en.wikipedia.org/wiki/Tranquility_Base',
  apollo12: 'https://en.wikipedia.org/wiki/Apollo_12',
  apollo15: 'https://en.wikipedia.org/wiki/Apollo_15',
  apollo16: 'https://en.wikipedia.org/wiki/Apollo_16',
  apollo17: 'https://en.wikipedia.org/wiki/Apollo_17',
  im1: 'https://en.wikipedia.org/wiki/IM-1',
  im2: 'https://en.wikipedia.org/wiki/IM-2',
  ch3: 'https://en.wikipedia.org/wiki/Chandrayaan-3',
  'shackleton-rim': 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  'degerlache-rim': 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  'nobile-rim': 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  'shackleton-floor': 'https://en.wikipedia.org/wiki/Shackleton_(crater)',
};

const $ = (id) => document.getElementById(id);
const state = {
  site: 0, landing: 0, hour: 0, timer: null, stayKey: 'lunar1', margin: 2,
  slipMinDays: 6.5, slipNeedLink: true, slipMetric: 'sun', mcdaPreset: 'balanced', version: 0,
  // A scenario is one site on one landing date. Compare rows and the header tray both read this
  // list, so "the same site nine days later" is a row like any other.
  scenarios: [], scenario: 0,
};
const layout = { pano: null, tl: null, slip: null };
let eph, SITES = [], sims = [], mission = null;
const stayH = () => STAYS[state.stayKey];

/* ---------- sites and the real engine ---------- */

function decorate(site) {
  Object.defineProperty(site, 'short', {
    configurable: true,
    get: () => (site.custom ? fmtLatLon(site.lat, site.lon) : t(site.raw.short ?? site.raw.name.split(' · ')[0])),
  });
  Object.defineProperty(site, 'label', {
    configurable: true,
    get: () => (site.custom ? t('Custom point') : t(site.raw.name)),
  });
  Object.defineProperty(site, 'tagText', {
    configurable: true,
    get: () => (site.custom ? t('Picked on map') : t(site.raw.group)),
  });
  return site;
}
function makeSite(raw, custom = false) {
  const site = new Site(raw, eph);
  site.raw = raw;
  site.custom = custom;
  return decorate(site);
}
const lon360 = (lon) => ((lon % 360) + 360) % 360;
const coordText = (site) => `${Math.abs(site.lat).toFixed(2)}°${site.lat < 0 ? 'S' : 'N'}, ${lon360(site.lon).toFixed(2)}°E`;
const hzAt = (site, az) => site.horizonAt(az);

function diskFrac(h) {
  const x = h / SUN_R;
  if (x >= 1) return 1;
  if (x <= -1) return 0;
  return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
}

function simulate(site, landingMs = state.landing) {
  const series = site.series, base = Math.round(eph.indexOf(landingMs)), n = SIM_H + 1;
  const r = {
    sAz: new Float32Array(n), sEl: new Float32Array(n), frac: new Float32Array(n),
    eAz: new Float32Array(n), eEl: new Float32Array(n), comm: new Uint8Array(n),
  };
  for (let i = 0; i < n; i++) {
    const j = base + i;
    r.sAz[i] = series.sunAz[j]; r.sEl[i] = series.sunEl[j];
    r.frac[i] = diskFrac(series.sunEl[j] - series.sunHor[j]);
    r.eAz[i] = series.earthAz[j]; r.eEl[i] = series.earthEl[j];
    r.comm[i] = series.earthEl[j] > series.earthHor[j] + state.margin ? 1 : 0;
  }
  const hours = stayH();
  let lit = 0, comm = 0, run = 0, best = 0;
  for (let i = 0; i < hours; i++) {
    if (r.frac[i] > 0) { lit++; run++; best = Math.max(best, run); } else run = 0;
    comm += r.comm[i];
  }
  const mcda = evaluateSiteMcda(site, base, base + hours, {
    marginDeg: state.margin,
    preset: state.mcdaPreset,
    minSunDays: state.slipMinDays,
    needLinkAtTouchdown: state.slipNeedLink,
  });
  r.litPct = 100 * lit / hours; r.commPct = 100 * comm / hours; r.longest = best;
  r.longestDark = mcda.longestDarkH; r.score = mcda.score; r.viable = mcda.viable;
  return r;
}

function subSun(ms) { const s = eph.stateAt(eph.indexOf(ms)); return { lat: s[1], lon: s[0] }; }
function subEarth(ms) { const s = eph.stateAt(eph.indexOf(ms)); return { lat: s[4], lon: s[3] }; }

/* ---------- formatting ---------- */

function fmtDur(h) { return h < 48 ? `${h} ${t('h')}` : `${Math.floor(h / 24)} ${t('d')} ${h % 24} ${t('h')}`; }
function fmtDeg(v) { return `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}°`; }
function fmtUTC(ms) { return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`; }
function nextChange(test, from) { const v = test(from); for (let i = from + 1; i <= SIM_H; i++) if (test(i) !== v) return i - from; return null; }
function runs(n, cat) { const out = []; let s = 0, c = cat(0); for (let i = 1; i <= n; i++) { const k = i < n ? cat(i) : -1; if (k !== c) { out.push([s, i, c]); s = i; c = k; } } return out; }
const sunCat = (r) => (i) => (r.frac[i] >= 0.5 ? 2 : r.frac[i] > 0 ? 1 : 0);

/* ---------- tiles ---------- */

function renderTiles() {
  const r = sims[state.site], s = SITES[state.site], i = state.hour;
  const above = r.sEl[i] - hzAt(s, r.sAz[i]), lit = r.frac[i] > 0, link = !!r.comm[i];
  const ns = nextChange((k) => r.frac[k] > 0, i), ne = nextChange((k) => r.comm[k] === 1, i);
  const dur = (h) => (h == null ? `> ${Math.floor((SIM_H - i) / 24)} ${t('d')}` : fmtDur(h));
  const tile = (k, v, d, c) => `<div class="tile"><div class="k">${c ? `<i class="dot" style="background:var(--${c})"></i>` : ''}${t(k)}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  $('tiles').innerHTML =
    tile('Sun elevation', fmtDeg(r.sEl[i]), t('{deg} vs. terrain', { deg: `${above >= 0 ? '+' : '−'}${Math.abs(above).toFixed(1)}°` }), 'sun') +
    tile('Solar disk visible', `${Math.round(r.frac[i] * 100)}%`, t(lit ? 'Power available' : 'In shadow'), 'sun') +
    tile(lit ? 'Sunset in' : 'Sunrise in', dur(ns), t(lit ? 'Until the disk is fully hidden' : 'Until first light'), 'sun') +
    tile('Earth elevation', fmtDeg(r.eEl[i]), t('Link needs terrain + {margin}° margin', { margin: state.margin }), 'earth') +
    tile('Direct-to-Earth link', `<span style="color:var(--${link ? 'good' : 'critical'})">${link ? '✓' : '✕'}</span> ${t(link ? 'Available' : 'Blocked')}`, t(link ? 'Earth clears the margin' : 'Earth below the margin'), 'earth') +
    tile(link ? 'Earthset in' : 'Link returns in', dur(ne), t('From the current time'), 'earth');
  $('now').textContent = t('Landing + {dur} · {time} · over the stay: sunlit {lit}%, Earth link {link}%', { dur: fmtDur(i), time: fmtUTC(state.landing + i * HOUR), lit: r.litPct.toFixed(0), link: r.commPct.toFixed(0) });
}

/* ---------- panorama ---------- */

function renderPano() {
  if (!$('pano').clientWidth) return;
  const el = $('pano'), W = el.clientWidth, H = W < 520 ? 250 : 330, L = 36, R = 10, T = 12, B = 26, hours = stayH();
  const r = sims[state.site], s = SITES[state.site], i = state.hour;
  let mx = -90; for (let k = 0; k <= hours; k++) mx = Math.max(mx, r.sEl[k], r.eEl[k]);
  const yMax = mx <= 15 ? 15 : (mx <= 45 ? 45 : 90), step = yMax === 15 ? 5 : (yMax === 45 ? 15 : 30), yMin = yMax === 15 ? -10 : -step;
  const pw = W - L - R, ph = H - T - B, X = (a) => L + a / 360 * pw, Y = (v) => T + (yMax - v) / (yMax - yMin) * ph;
  layout.pano = { L, pw, H, T, ph };
  let g = '';
  for (let v = yMin; v <= yMax; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}°</text>`;
  [['N', 0], ['E', 90], ['S', 180], ['W', 270], ['N', 360]].forEach(([n, a]) => {
    g += `<line x1="${X(a)}" x2="${X(a)}" y1="${T}" y2="${T + ph}" stroke="var(--grid)"/><text x="${X(a)}" y="${H - 8}" text-anchor="${a === 0 ? 'start' : a === 360 ? 'end' : 'middle'}">${t(n)}${W >= 520 ? ` ${a}°` : ''}</text>`;
  });
  let terr = `M${X(0)},${Y(hzAt(s, 0))}`; for (let a = 1; a <= 360; a++) terr += `L${X(a).toFixed(1)},${Y(hzAt(s, a)).toFixed(1)}`;
  const track = (az, elv) => { let d = '', pen = false; for (let k = 0; k <= hours; k++) { if (k > 0 && Math.abs(az[k] - az[k - 1]) > 180) pen = false; d += `${pen ? 'L' : 'M'}${X(az[k]).toFixed(1)},${Y(elv[k]).toFixed(1)}`; pen = true; } return d; };
  const mark = (az, elv, r0, col, name) => {
    const cy = Math.min(Math.max(Y(elv), T), T + ph), cx = X(az), left = cx > W - R - 96;
    return `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="var(--${col})" stroke="var(--surface)" stroke-width="2"/>` +
      `<text x="${cx + (left ? -r0 - 5 : r0 + 5)}" y="${cy - r0 - 2 < T + 10 ? cy + r0 + 12 : cy - r0 - 2}" text-anchor="${left ? 'end' : 'start'}" style="fill:var(--text);font-weight:600;paint-order:stroke;stroke:var(--surface);stroke-width:3px">${name} ${fmtDeg(elv)}</text>`;
  };
  const svg = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${escapeHtml(t('Horizon panorama for {site}', { site: s.label }))}">
    <defs><clipPath id="pc"><rect x="${L}" y="${T}" width="${pw}" height="${ph}"/></clipPath></defs>${g}
    <g clip-path="url(#pc)">
      <path d="${track(r.sAz, r.sEl)}" fill="none" stroke="var(--sun)" stroke-width="2" opacity=".75"/>
      <path d="${track(r.eAz, r.eEl)}" fill="none" stroke="var(--earth)" stroke-width="2" opacity=".75"/>
      <path d="${terr}L${X(360)},${T + ph}L${X(0)},${T + ph}Z" fill="var(--terrain)" fill-opacity=".88" stroke="var(--terrain-line)" stroke-width="1"/>
      <line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--muted)" stroke-dasharray="4 4"/>
    </g>
    ${mark(r.eAz[i], r.eEl[i], 6, 'earth', t('Earth'))}${mark(r.sAz[i], r.sEl[i], 7, 'sun', t('Sun'))}
  </svg>`;
  const ch = $('crosshair'); el.innerHTML = svg; el.appendChild(ch); ch.style.height = `${T + ph}px`;
}

/* ---------- timeline ---------- */

function strip(r, x0, wPerH, y, h) {
  const hours = stayH();
  const o = `<rect x="${x0}" y="${y}" width="${hours * wPerH}" height="${h}" fill="var(--grid)" rx="3"/>`;
  return o + runs(hours, sunCat(r)).filter((q) => q[2]).map((q) => `<rect x="${x0 + q[0] * wPerH}" y="${y}" width="${(q[1] - q[0]) * wPerH}" height="${h}" fill="var(--sun)" opacity="${q[2] === 2 ? 1 : 0.45}"/>`).join('');
}
function stripComm(r, x0, wPerH, y, h) {
  const hours = stayH();
  const o = `<rect x="${x0}" y="${y}" width="${hours * wPerH}" height="${h}" fill="var(--grid)" rx="3"/>`;
  return o + runs(hours, (i) => r.comm[i]).filter((q) => q[2]).map((q) => `<rect x="${x0 + q[0] * wPerH}" y="${y}" width="${(q[1] - q[0]) * wPerH}" height="${h}" fill="var(--earth)"/>`).join('');
}
function renderTimeline() {
  if (!$('timeline').clientWidth) return;
  const hours = stayH(), el = $('timeline'), W = el.clientWidth, L = W < 520 ? 4 : 84, R = 8, pw = W - L - R, w = pw / hours, r = sims[state.site];
  const top = W < 520 ? 14 : 4, H = top + 22 + 6 + 22 + 24;
  layout.tl = { L, pw };
  const tickStep = hours > 800 ? 10 : 5;
  let ax = ''; for (let d = 0; d * 24 <= hours; d += tickStep) ax += `<text x="${L + d * 24 * w}" y="${H - 6}" text-anchor="${d ? 'middle' : 'start'}">${d ? `${d} ${t('d')}` : (W < 520 ? '0' : t('Landing'))}</text>`;
  const lab = W < 520 ? `<text x="${L}" y="10">${t('Sunlight (top) · Earth link (bottom)')}</text>`
    : `<text x="${L - 8}" y="${top + 15}" text-anchor="end">${t('Sunlight')}</text><text x="${L - 8}" y="${top + 43}" text-anchor="end">${t('Earth link')}</text>`;
  const cx = L + state.hour * w;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${escapeHtml(t('Sunlight and Earth link windows'))}">${lab}
    ${strip(r, L, w, top, 22)}${stripComm(r, L, w, top + 28, 22)}${ax}
    <line x1="${cx}" x2="${cx}" y1="${top - 3}" y2="${top + 53}" stroke="var(--text)" stroke-width="2"/></svg>`;
}

/* ---------- compare ---------- */

function renderCompare() {
  const hours = stayH();
  const verdict = compareVerdict(hours);
  // Rank scenarios, not sites: each row's score comes from its own landing date.
  const mcdaOf = (s, landing) => {
    const start = Math.round(eph.indexOf(landing));
    return evaluateSiteMcda(s, start, start + hours, { marginDeg: state.margin, preset: state.mcdaPreset, minSunDays: 6.5 });
  };
  const ranked = state.scenarios.map((x, k) => {
    const s = SITES[x.site];
    const r = simulate(s, x.landing);
    const m = mcdaOf(s, x.landing);
    r.score = m.score;
    return { x, k, s, r, m };
  }).sort((a, b) => (Number(isModelled(b.s)) - Number(isModelled(a.s))) || (Number(b.m.viable) - Number(a.m.viable)) || (b.m.score - a.m.score));
  let viableRank = 0;
  $('compare').innerHTML = (verdict ? `<p class="verdict">${verdict}</p>` : '') + ranked.map(({ x, k, s, r, m }) => {
    if (isModelled(s) && m.viable) viableRank++;
    const rec = isModelled(s) && m.viable && viableRank <= 3 ? ` <span class="pill">${escapeHtml(t('Recommended'))}</span>` : '';
    const terrNote = isModelled(s) ? escapeHtml(s.terrain) : escapeHtml(t('Reference (smooth sphere)'));
    return `<button class="row${k === state.scenario ? ' sel' : ''}" data-scenario="${k}">
      <div><div class="nm">${escapeHtml(s.label)} · ${scenarioDate(x)}${rec}</div><div class="co">${escapeHtml(s.tagText)} · ${coordText(s)} · ${terrNote}</div></div>
      <svg viewBox="0 0 ${hours} 30" preserveAspectRatio="none" aria-hidden="true">${strip(r, 0, 1, 0, 13)}${stripComm(r, 0, 1, 17, 13)}
        <rect x="${state.hour - 1}" y="0" width="2.5" height="30" fill="var(--text)"/></svg>
      <div class="nums"><div><b>${r.score}/100</b>${t('MCDA')}</div><div><b>${r.litPct.toFixed(0)}%</b>${t('sunlit')}</div><div><b>${r.commPct.toFixed(0)}%</b>${t('Earth link')}</div><div><b>${fmtDur(r.longest)}</b>${t('longest sun')}</div></div>
    </button>`;
  }).join('');
}

/** One sentence comparing every scenario with the first one: the answer to "we slip, is it still viable?". */
function compareVerdict(hours) {
  if (state.scenarios.length < 2) return '';
  const base = state.scenarios[0];
  const a = simulate(SITES[base.site], base.landing);
  const parts = [];
  for (const x of state.scenarios.slice(1)) {
    const b = simulate(SITES[x.site], x.landing);
    const dSun = Math.round((b.litPct - a.litPct) / 100 * hours);
    const dLink = Math.round((b.commPct - a.commPct) / 100 * hours);
    const dLong = b.longest - a.longest;
    const hh = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v)} h`;
    const dd = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v / 24).toFixed(1)} d`;
    const landsLit = b.frac[0] > 0;
    parts.push(`${scenarioDate(x)}: ${t('sunlight')} ${hh(dSun)}, ${t('Earth link')} ${hh(dLink)}, ${t('longest sun')} ${dd(dLong)}, ${landsLit ? t('lands in sunlight') : t('lands in shadow')}`);
  }
  return `<b>${escapeHtml(t('Compared with {date}', { date: scenarioDate(base) }))} · ${escapeHtml(SITES[base.site].label)}:</b> ${parts.map(escapeHtml).join(' · ')}`;
}

/* ---------- date slip ---------- */

function slipData() {
  const r = sims[state.site], hours = stayH(), out = [];
  for (let d = 0; d <= SLIP_DAYS; d++) {
    const i = d * 24;
    let run = 0; while (i + run <= SIM_H && run < LOOKAHEAD_H && r.frac[i + run] > 0) run++;
    let link = 0; for (let k = i; k < i + hours; k++) link += r.comm[k];
    const viable = run >= state.slipMinDays * 24 && (!state.slipNeedLink || r.comm[i] === 1);
    out.push({ d, run, share: link / hours, viable });
  }
  return out;
}
function renderSlip() {
  $('slipSub').textContent = t(state.slipMetric === 'sun' ? 'Continuous sunlight available from touchdown, for each day of delay at the active site.' : 'Share of the stay with a direct link to Earth, for each day of delay at the active site.');
  $('slipMetricBtn').textContent = t(state.slipMetric === 'sun' ? 'Show Earth-link share instead' : 'Show continuous sunlight instead');
  const data = slipData(), viable = data.filter((x) => x.viable);
  $('slipSummary').textContent = viable.length
    ? t('{ok} of {total} landing dates meet both thresholds. First: {first}.', { ok: viable.length, total: data.length, first: viable[0].d ? t('Landing slips {d} d', { d: viable[0].d }) : t('Landing on time') })
    : t('No landing date in this range meets both thresholds.');
  if (!$('slip').clientWidth) return;
  const el = $('slip'), W = el.clientWidth, H = 190, L = 40, R = 8, T = 10, B = 26, pw = W - L - R, ph = H - T - B, sun = state.slipMetric === 'sun';
  const mxD = Math.max(5, Math.ceil(Math.max(...data.map((x) => x.run)) / 24 / 5) * 5), bw = pw / data.length;
  const value = (x) => (sun ? x.run / 24 / mxD : x.share);
  const Y = (f) => T + ph - f * ph;
  layout.slip = { L, bw, data };
  let g = '';
  for (let q = 0; q <= 5; q++) { const f = q / 5; g += `<line x1="${L}" x2="${W - R}" y1="${Y(f)}" y2="${Y(f)}" stroke="var(--grid)"/><text x="${L - 6}" y="${Y(f) + 4}" text-anchor="end">${sun ? `${Math.round(f * mxD)} ${t('d')}` : `${Math.round(f * 100)}%`}</text>`; }
  let bars = '';
  data.forEach((x) => {
    const bx = L + x.d * bw + 1, w = Math.max(bw - 2, 1), y = Y(value(x)), h = T + ph - y, rr = Math.min(3, w / 2, h);
    const dim = sun && !x.viable ? ' opacity=".4"' : '';
    const fill = sun ? 'var(--sun)' : 'var(--earth)';
    if (h > 0.5) bars += `<path d="M${bx},${T + ph}V${y + rr}q0,-${rr} ${rr},-${rr}H${bx + w - rr}q${rr},0 ${rr},${rr}V${T + ph}Z" fill="${fill}"${dim}/>`;
    else bars += `<rect x="${bx}" y="${T + ph - 2}" width="${w}" height="2" fill="var(--muted)"/>`;
    if (x.d % 7 === 0) bars += `<text x="${bx + w / 2}" y="${H - 8}" text-anchor="${x.d === 0 ? 'start' : x.d === SLIP_DAYS ? 'end' : 'middle'}">${x.d ? `+${x.d} ${t('d')}` : t('On time')}</text>`;
  });
  const line = sun ? `<line x1="${L}" x2="${W - R}" y1="${Y(state.slipMinDays / mxD)}" y2="${Y(state.slipMinDays / mxD)}" stroke="var(--text)" stroke-dasharray="4 4" opacity=".6"/>` : '';
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${escapeHtml(t('Continuous sunlight by landing delay'))}">${g}${bars}${line}</svg>`;
}

/* ---------- maps ---------- */

const PN = 762, PM = 1200, PR = 1737400, GW = 1024, GH = 512;
let demG = null, moonBase = null;
function polarXY(lat, lon) { const r = 2 * PR * Math.tan((90 + lat) * D2R / 2) / PM; return [PN / 2 + r * Math.sin(lon * D2R), PN / 2 - r * Math.cos(lon * D2R)]; }
function polarLL(px, py) { const x = (px - PN / 2) * PM, y = (PN / 2 - py) * PM; return { lat: -90 + 2 * Math.atan(Math.hypot(x, y) / (2 * PR)) * R2D, lon: (Math.atan2(x, y) * R2D + 360) % 360 }; }
function globeXY(lat, lon) { return [(((lon + 180) % 360 + 360) % 360) / 360 * GW, (90 - lat) / 180 * GH]; }
function marker(x, y, k, sel, label, vbW) {
  const left = x > vbW - 150 * k;
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(sel ? 6.5 : 4.5) * k}" fill="${sel ? '#ffd24a' : '#fff'}" stroke="#000" stroke-width="${1.5 * k}"/>` +
    (label ? `<text x="${(x + (left ? -9 : 9) * k).toFixed(1)}" y="${(y + 4 * k).toFixed(1)}" text-anchor="${left ? 'end' : 'start'}" style="font-size:${12 * k}px;stroke-width:${3 * k}px" font-weight="${sel ? 700 : 500}">${escapeHtml(label)}</text>` : '');
}
function renderPolar() {
  const now = state.landing + state.hour * HOUR, ss = subSun(now), se = subEarth(now), l = ss.lon * D2R;
  if (demG) {
    const d = demG.img.data, gx = demG.gx, gy = demG.gy, alt = 10 * D2R;
    const lx = Math.cos(alt) * Math.sin(l), ly = Math.cos(alt) * Math.cos(l), lz = Math.sin(alt), sc = 255 / (2 * lz);
    for (let i = 0, n = PN * PN; i < n; i++) { const a = gx[i], b = gy[i]; let v = (lz - a * lx - b * ly) / Math.sqrt(a * a + b * b + 1) * sc; v = v < 0 ? 0 : v > 255 ? 255 : v; const j = i * 4; d[j] = d[j + 1] = d[j + 2] = v; }
    $('polarC').getContext('2d').putImageData(demG.img, 0, 0);
  }
  const k = PN / Math.max($('polar').clientWidth, 1), c = PN / 2; let o = '';
  [-80, -85].forEach((la) => { const r = polarXY(la, 0)[1]; o += `<circle cx="${c}" cy="${c}" r="${c - r}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${k}"/><text x="${c + 4 * k}" y="${r + 13 * k}" style="font-size:${10 * k}px;stroke-width:${3 * k}px">${-la}°S</text>`; });
  o += `<path d="M${c},0V${PN}M0,${c}H${PN}" stroke="#fff" stroke-opacity=".2" stroke-width="${k}"/>`;
  [[t('0° · Earth side'), c, 14 * k, 'middle'], ['90°E', PN - 4 * k, c - 5 * k, 'end'], [t('180° · far side'), c, PN - 6 * k, 'middle'], ['270°E', 4 * k, c - 5 * k, 'start']].forEach((q) => {
    o += `<text x="${q[1]}" y="${q[2]}" text-anchor="${q[3]}" style="font-size:${10 * k}px;stroke-width:${3 * k}px">${q[0]}</text>`;
  });
  const rim = (lon, rr) => [c + rr * Math.sin(lon * D2R), c - rr * Math.cos(lon * D2R)], sp = rim(ss.lon, c - 40 * k), ep = rim(se.lon, c - 40 * k);
  o += `<circle cx="${ep[0]}" cy="${ep[1]}" r="${7 * k}" fill="#3987e5" stroke="#fff" stroke-width="${1.5 * k}"/><text x="${ep[0]}" y="${ep[1] + 20 * k}" text-anchor="middle" style="font-size:${11 * k}px;stroke-width:${3 * k}px">${t('to Earth')}</text>`;
  o += `<circle cx="${sp[0]}" cy="${sp[1]}" r="${8 * k}" fill="#eda100" stroke="#fff" stroke-width="${1.5 * k}"/><text x="${sp[0]}" y="${sp[1] + 21 * k}" text-anchor="middle" style="font-size:${11 * k}px;stroke-width:${3 * k}px">${t('to Sun')}</text>`;
  SITES.forEach((s, i) => { if (s.lat < -75) { const p = polarXY(s.lat, s.lon); o += marker(p[0], p[1], k, i === state.site, s.short, PN); } });
  $('polarS').innerHTML = o;
}
function renderGlobe() {
  const ss = subSun(state.landing + state.hour * HOUR);
  if (moonBase) {
    const out = moonBase.out.data, src = moonBase.src, cc = moonBase.cc, sp = Math.sin(ss.lat * D2R), cp = Math.cos(ss.lat * D2R);
    for (let x = 0; x < GW; x++) cc[x] = Math.cos(((x + 0.5) / GW * 360 - 180 - ss.lon) * D2R);
    for (let y = 0, j = 0; y < GH; y++) {
      const a = moonBase.sl[y] * sp, b = moonBase.cl[y] * cp;
      for (let x = 0; x < GW; x++, j += 4) { const q = a + b * cc[x], f = q > 0.06 ? 1 : q < -0.06 ? 0.28 : 0.28 + 0.72 * (q + 0.06) / 0.12; out[j] = src[j] * f; out[j + 1] = src[j + 1] * f; out[j + 2] = src[j + 2] * f; }
    }
    $('globeC').getContext('2d').putImageData(moonBase.out, 0, 0);
  }
  const k = GW / Math.max($('globe').clientWidth, 1); let o = '';
  SITES.forEach((s, i) => { if (i !== state.site) { const p = globeXY(s.lat, s.lon); o += marker(p[0], p[1], k, false, '', GW); } });
  const s = SITES[state.site], p = globeXY(s.lat, s.lon); o += marker(p[0], Math.min(p[1], GH - 8 * k), k, true, s.short, GW);
  $('globeS').innerHTML = o;
}
function renderMaps() { renderPolar(); renderGlobe(); }

/* ---------- site list, settings, tray ---------- */

function orderedSites() {
  return SITES.map((s, k) => [s, k]).sort((a, b) => {
    const ga = a[0].custom ? -1 : GROUP_ORDER.indexOf(a[0].raw.group), gb = b[0].custom ? -1 : GROUP_ORDER.indexOf(b[0].raw.group);
    return ga - gb || a[1] - b[1];
  });
}
function fillSelect() {
  $('sitelist').innerHTML = orderedSites().map(([s, k]) => `<button class="site${k === state.site ? ' sel' : ''}" data-k="${k}"><b>${escapeHtml(s.label)}</b><span>${escapeHtml(s.tagText)} · ${coordText(s)}</span></button>`).join('');
  const s = SITES[state.site];
  $('clat').value = s.lat.toFixed(2); $('clon').value = lon360(s.lon).toFixed(2);
  $('tray').innerHTML = state.scenarios.map((x, i) =>
    `<span class="chip-wrap"><button class="chip${i === state.scenario ? ' on' : ''}" data-scenario="${i}">${escapeHtml(scenarioLabel(x))}</button>`
    + `<button class="chip-x" data-drop="${i}" aria-label="${escapeHtml(t('Remove scenario'))}">×</button></span>`).join('')
    + `<button class="chip ghost" data-add="current">${escapeHtml(t('+ Add scenario'))}</button>`
    + `<button class="chip ghost" data-add="date">${escapeHtml(t('+14 d'))}</button>`
    + `<button class="chip ghost" data-add="site">${escapeHtml(t('Another site'))}</button>`;
}
function option(value, label, selected) { return `<option value="${value}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`; }
function renderSettings() {
  $('stay').innerHTML = [['lunar1', '1 lunar day'], ['days14', '14 Earth days'], ['lunar2', '2 lunar days']].map(([v, l]) => option(v, t(l), v === state.stayKey)).join('');
  $('mast').innerHTML = option('2', t('2 m (fixed)'), true);
  $('mast').title = t('Skylines are computed for a 2 m mast.');
  $('margin').innerHTML = [2, 5].map((v) => option(v, `${v}°`, v === state.margin)).join('');
  $('slipMin').innerHTML = [[5, '5 days'], [6.5, '6.5 days (Artemis III)'], [10, '10 days'], [14, '14 days']].map(([v, l]) => option(v, t(l), v === state.slipMinDays)).join('');
  $('slipLink').innerHTML = option('yes', t('Yes'), state.slipNeedLink) + option('no', t('No'), !state.slipNeedLink);
  $('play').textContent = `${state.timer ? '❚❚' : '▶'} ${t(state.timer ? 'Pause' : 'Play')}`;
  $('jsun').textContent = `${t('Sun')} ⏭`;
  $('jearth').textContent = `${t('Earth')} ⏭`;
}

function toast(msg, ms) { const el = $('toast'); el.textContent = msg; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { el.style.display = 'none'; }, ms || 1800); }
// The Atlas page is its own application, framed inside this one. It reads a share hash holding the
// pinned site and the clock, so the frame opens on whatever this page is showing.
function atlasUrl() {
  const s = SITES[state.site];
  if (!s) return 'atlas/index.html';
  const lon = s.lon > 180 ? s.lon - 360 : s.lon;
  const q = new URLSearchParams();
  q.set('s', `${s.lat.toFixed(4)},${lon.toFixed(4)},${s.short || s.id || 'site'}`);
  q.set('t', `${new Date(state.landing).toISOString().slice(0, 16)}Z`);
  return `atlas/index.html#${q.toString()}`;
}

// The frame is same-origin, so its share hash can be read directly: when the user changes the site,
// the date or the pinned point inside the Atlas, the rest of the app follows without a reload.
let atlasHash = '', atlasPoll = null;
function showAtlas() {
  const host = $('v-atlas');
  let frame = host.querySelector('iframe');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.title = 'Atlas';
    frame.src = atlasUrl();
    frame.addEventListener('load', () => {
      try {
        atlasHash = frame.contentWindow.location.hash;
        // Its page title repeats our brand two lines under our own header. Drop the title block, keep
        // every control in that bar (mode switch, mission jump, help) exactly where it is.
        const doc = frame.contentDocument;
        if (doc && !doc.getElementById('lunalens-frame-style')) {
          const style = doc.createElement('style');
          style.id = 'lunalens-frame-style';
          style.textContent = 'header.top h1{display:none} header.top{padding-top:6px;padding-bottom:6px}';
          doc.head.append(style);
        }
      } catch { /* cross-origin frame: nothing to do */ }
    });
    host.append(frame);
  } else {
    frame.src = atlasUrl();
  }
}

function syncFromAtlas() {
  const frame = $('v-atlas')?.querySelector('iframe');
  if (!frame || document.body.dataset.view !== 'atlas') return;
  let hash;
  try { hash = frame.contentWindow.location.hash; } catch { return; }
  if (!hash || hash === atlasHash) return;
  atlasHash = hash;
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  let changed = false;
  const time = q.get('t');
  if (time && /^\d{4}-\d\d-\d\dT\d\d:\d\dZ$/.test(time)) {
    const ms = Date.parse(time);
    if (Number.isFinite(ms) && Math.abs(utcMidnight(ms) - state.landing) > 60e3) { state.landing = utcMidnight(ms); changed = true; }
  }
  const first = q.getAll('s')[0];
  if (first) {
    const [lat, lon] = first.split(',').map(Number);
    const norm = (v) => ((v % 360) + 360) % 360;
    const k = SITES.findIndex((s) => Math.abs(s.lat - lat) < 0.03 && Math.abs(norm(s.lon) - norm(lon)) < 0.03);
    if (k >= 0 && k !== state.site) { state.site = k; changed = true; }
  }
  if (changed) { $('date').value = new Date(state.landing).toISOString().slice(0, 10); recompute(); }
}

function showView(v) {
  if (!['start', 'mission', 'explore', 'compare', 'slip', 'data', 'build', 'atlas', 'plan'].includes(v)) v = 'start';
  document.body.dataset.view = v;
  history.replaceState(null, '', `${location.search}#/${v}`);
  document.querySelectorAll('[data-nav] button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  window.scrollTo(0, 0);
  if (v === 'atlas') showAtlas();
  if (v === 'plan') showPlan();
  renderAll();
}

// Plan: the mission page that puts the Atlas map in a window and wraps our own panels around it.
let plan = null;
function showPlan() {
  if (!plan) {
    plan = createPlan({
      root: $('v-plan'), eph: () => eph, t,
      sites: () => SITES, site: () => SITES[state.site],
      landing: () => state.landing, setLanding,
      hour: () => state.hour, setHour,
      margin: () => state.margin, setMargin: (v) => { state.margin = v; recompute(); },
      pickSite: (id) => { const k = SITES.findIndex((s) => s.id === id); if (k >= 0) { state.site = k; recompute(); } },
    });
  } else plan.render();
}
function jump(test, what) {
  const n = nextChange(test, state.hour);
  if (n != null && state.hour + n <= stayH()) setHour(state.hour + n); else toast(t('No {what} event left in this stay', { what: t(what) }));
}
function selectSite(k) { state.site = k; renderAll(); }

let demPromise = null;
function ensureDem() {
  if (!demPromise) demPromise = loadDem('data/dem240').catch((error) => { demPromise = null; throw error; });
  return demPromise;
}
async function setCustom(lat, lon) {
  const raw = { id: `c${lat.toFixed(4)}_${lon.toFixed(4)}`, name: 'Custom point', group: 'Picked on map', lat, lon: ((lon + 180) % 360 + 360) % 360 - 180, kind: 'custom', terrain: 'none', horizon: null, groundM: null, source: 'Coordinates entered by the user' };
  const site = makeSite(raw, true);
  let k = SITES.findIndex((s) => s.custom);
  if (k < 0) { k = SITES.length; SITES.push(site); } else SITES[k] = site;
  sims[k] = simulate(site); state.site = k; state.version++; renderAll();
  if (lat <= -75) {
    toast(t('Loading terrain…'), 8000);
    try {
      const dem = await ensureDem();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const result = computeHorizon(dem, lat, site.lon, { minRangeM: 480 });
      if (result && SITES[k] === site) {
        site.setHorizon(result.horizon, result.groundM, 'LOLA 240 m, computed in your browser', 480);
        site.slopeDeg = result.slopeDeg;
        sims[k] = simulate(site); state.version++; renderAll();
      }
      $('toast').style.display = 'none';
    } catch (error) {
      console.error(error);
      toast(t('Terrain data could not be loaded. This site uses a smooth-sphere horizon.'), 4000);
    }
  }
}
function mapPick(id, vbW, vbH, toXY, toLL, filter) {
  const el = $(id), pos = (e) => { const b = el.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * vbW, (e.clientY - b.top) / b.height * vbH, vbW / b.width]; };
  el.addEventListener('click', (e) => {
    const [x, y, k] = pos(e); let best = -1, bd = 16 * k;
    SITES.forEach((s, i) => { if (filter(s)) { const p = toXY(s.lat, s.lon), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } } });
    if (best >= 0) selectSite(best); else { const q = toLL(x, y); if (q.lat <= 90 && q.lat >= -90) setCustom(q.lat, q.lon); }
  });
  el.addEventListener('pointermove', (e) => {
    const [x, y] = pos(e), q = toLL(x, y);
    let h = `<b>${Math.abs(q.lat).toFixed(2)}°${q.lat < 0 ? 'S' : 'N'}, ${q.lon.toFixed(2)}°E</b>`;
    if (id === 'polar' && demG) { const xi = Math.min(PN - 1, Math.max(0, Math.floor(x))), yi = Math.min(PN - 1, Math.max(0, Math.floor(y))); h += `<br>${t('Elevation {z} m (LOLA)', { z: demG.z[yi * PN + xi] })}`; }
    showTip(e, `${h}<br>${t('Tap to select')}`);
  });
  el.addEventListener('pointerleave', hideTip);
}
function loadMaps() {
  fetch('assets/sp_dem_1200m.bin').then((r) => r.arrayBuffer()).then((buf) => {
    const z = new Int16Array(buf), gx = new Float32Array(PN * PN), gy = new Float32Array(PN * PN);
    for (let r = 1; r < PN - 1; r++) for (let c = 1; c < PN - 1; c++) { const i = r * PN + c; gx[i] = (z[i + 1] - z[i - 1]) / (2 * PM); gy[i] = (z[i - PN] - z[i + PN]) / (2 * PM); }
    const img = new ImageData(PN, PN); img.data.fill(255); demG = { z, gx, gy, img }; renderPolar();
  });
  const im = new Image();
  im.onload = () => {
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, GW, GH);
    const d = cx.getImageData(0, 0, GW, GH), sl = new Float32Array(GH), cl = new Float32Array(GH);
    for (let y = 0; y < GH; y++) { const la = (90 - (y + 0.5) / GH * 180) * D2R; sl[y] = Math.sin(la); cl[y] = Math.cos(la); }
    moonBase = { src: d.data.slice(), out: d, sl, cl, cc: new Float32Array(GW) }; renderGlobe();
  };
  im.src = 'assets/moon_1024.jpg';
}

/* ---------- 3D (terrain relief and time lanes) ---------- */

let scene3d = null, sceneActive = false, sceneMode = 'terrain', sceneLoading = false;
function compareSites() {
  const active = SITES[state.site];
  return [active, ...SITES.filter((s) => s !== active && !s.custom).slice(0, 3)];
}
function render3d() {
  if (!scene3d || !sceneActive) return;
  const base = Math.round(eph.indexOf(state.landing));
  scene3d.render({ site: SITES[state.site], sites: compareSites(), eph, index: eph.indexOf(state.landing + state.hour * HOUR), i0: base, i1: base + stayH(), version: state.version, mode: sceneMode });
}
async function ensureScene() {
  if (scene3d || sceneLoading) return;
  sceneLoading = true;
  try {
    const { createScene } = await import('./views/scene3d.js');
    scene3d = await createScene($('scene'), $('scene-labels'));
    scene3d.setActive(sceneActive);
    $('scene-status').hidden = true;
    render3d();
  } catch (error) {
    console.error(error);
    $('scene-status').textContent = t('3D is unavailable on this device. The sky, map and calculations remain available above.');
    $('scene-status').hidden = false;
  } finally {
    sceneLoading = false;
  }
}

/* ---------- data page ---------- */

function renderSources() {
  $('site-sources').innerHTML = SITES.filter((s) => !s.custom).map((s) =>
    `<dt>${escapeHtml(s.label)}</dt><dd><span class="num">${fmtLatLon(s.lat, s.lon, 4)}</span> · <a href="${SITE_SOURCES[s.id]}" target="_blank" rel="noopener noreferrer">${escapeHtml(t(s.raw.source))}</a></dd>`).join('');
}

/* ---------- wiring ---------- */

function renderTime() { renderMaps(); renderTiles(); renderPano(); renderTimeline(); renderCompare(); render3d(); }
function renderAll() { fillSelect(); renderSettings(); renderTime(); renderSlip(); mission?.render(); }
// map() passes the index as the second argument, which simulate() would read as a landing date.
function recompute() { sims = SITES.map((s) => simulate(s)); renderAll(); }

/* ---------- scenarios ---------- */

const AZ = { max: 4 };
function scenarioDate(x) { return new Date(x.landing).toISOString().slice(0, 10); }
function scenarioLabel(x) { const s = SITES[x.site]; return `${s.short} · ${scenarioDate(x)}`; }
function seedScenario() {
  state.scenarios = [{ site: state.site, landing: state.landing }];
  state.scenario = 0;
}
function activateScenario(i) {
  const x = state.scenarios[i];
  if (!x) return;
  state.scenario = i;
  state.site = x.site;
  setLanding(x.landing);
  recompute();
}
function addScenario(mode) {
  const cur = state.scenarios[state.scenario] ?? { site: state.site, landing: state.landing };
  const next = { site: cur.site, landing: cur.landing };
  if (mode === 'date') next.landing = cur.landing + 14 * DAY;
  if (mode === 'site') {
    const used = new Set(state.scenarios.map((x) => x.site));
    const k = SITES.findIndex((s, i) => !used.has(i) && s.lat < -75);
    next.site = k >= 0 ? k : (cur.site + 1) % SITES.length;
  }
  if (state.scenarios.length >= AZ.max) state.scenarios.shift();
  state.scenarios.push(next);
  activateScenario(state.scenarios.length - 1);
}
function dropScenario(i) {
  state.scenarios.splice(i, 1);
  if (!state.scenarios.length) seedScenario();
  state.scenario = Math.min(state.scenario, state.scenarios.length - 1);
  const x = state.scenarios[state.scenario];
  state.site = x.site;
  setLanding(x.landing);
  recompute();
}
function setHour(h) { state.hour = Math.max(0, Math.min(stayH(), Math.round(h))); renderTime(); }

const tip = $('tip');
function showTip(e, html) {
  tip.innerHTML = html; tip.style.display = 'block';
  const w = tip.offsetWidth, x = Math.min(Math.max(e.clientX + 12, 6), window.innerWidth - w - 6);
  tip.style.left = `${x}px`; tip.style.top = `${Math.max(e.clientY - tip.offsetHeight - 12, 6)}px`;
}
function hideTip() { tip.style.display = 'none'; $('crosshair').style.display = 'none'; }

function setLanding(ms) {
  const latest = utcMidnight(eph.tEnd - SIM_H * HOUR);
  state.landing = Math.min(latest, Math.max(utcMidnight(eph.t0), utcMidnight(ms)));
  state.hour = Math.min(state.hour, stayH());
  $('date').min = new Date(utcMidnight(eph.t0)).toISOString().slice(0, 10);
  $('date').max = new Date(latest).toISOString().slice(0, 10);
  $('date').value = new Date(state.landing).toISOString().slice(0, 10);
  recompute();
}

function bind() {
  $('sitelist').onclick = (e) => { const b = e.target.closest('.site'); if (b) selectSite(+b.dataset.k); };
  $('tray').onclick = (e) => {
    const drop = e.target.closest('[data-drop]');
    if (drop) return dropScenario(Number(drop.dataset.drop));
    const add = e.target.closest('[data-add]');
    if (add) return addScenario(add.dataset.add);
    const chip = e.target.closest('[data-scenario]');
    if (chip) return activateScenario(Number(chip.dataset.scenario));
  };
  $('cgo').onclick = () => {
    const la = parseFloat($('clat').value), lo = parseFloat($('clon').value);
    if (Number.isNaN(la) || Number.isNaN(lo) || la < -90 || la > 90) return toast(t('Enter a latitude between −90 and 90 and a longitude in °E'));
    setCustom(la, lon360(lo));
  };
  document.querySelectorAll('[data-nav] button').forEach((b) => { b.onclick = () => showView(b.dataset.view); });
  document.querySelectorAll('[data-overlay]').forEach((b) => {
    b.onclick = () => { showView('plan'); plan?.setLayer(b.dataset.overlay); };
  });
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) return showView(g.dataset.go);
    const f = e.target.closest('button[data-fake]'); if (f) toast(t('Not built yet. ') + t(f.dataset.fake), 4500);
  });
  document.addEventListener('pointerover', (e) => { const f = e.target.closest('[data-fake]'); if (f && e.pointerType === 'mouse') showTip(e, `<b>${t('Planned, not built yet')}</b><br>${t(f.dataset.fake)}`); });
  document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-fake]')) hideTip(); });
  $('mapseg').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const polar = b.dataset.map === 'polar';
    $('polarWrap').hidden = !polar; $('globeWrap').hidden = polar;
    $('mapseg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    renderMaps();
  };
  $('jsun').onclick = () => jump((k) => sims[state.site].frac[k] > 0, 'Sun');
  $('jearth').onclick = () => jump((k) => sims[state.site].comm[k] === 1, 'Earth');
  $('date').onchange = (e) => { const ms = Date.parse(`${e.target.value}T00:00:00Z`); if (!Number.isNaN(ms)) setLanding(ms); };
  $('stay').onchange = (e) => { state.stayKey = e.target.value; state.hour = 0; recompute(); };
  $('margin').onchange = (e) => { state.margin = Number(e.target.value); recompute(); };
  $('slipApply').onclick = () => { state.slipMinDays = Number($('slipMin').value); state.slipNeedLink = $('slipLink').value === 'yes'; recompute(); };
  $('slipMetricBtn').onclick = () => { state.slipMetric = state.slipMetric === 'sun' ? 'link' : 'sun'; renderSlip(); };
  $('play').onclick = () => {
    if (state.timer) { clearInterval(state.timer); state.timer = null; renderSettings(); return; }
    if (state.hour >= stayH()) setHour(0);
    state.timer = setInterval(() => { if (state.hour >= stayH()) { $('play').click(); return; } setHour(state.hour + 3); }, 50);
    renderSettings();
  };
  $('compare').onclick = (e) => { const b = e.target.closest('.row'); if (b) activateScenario(+b.dataset.scenario); };
  $('compare-actions').onclick = (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const action = b.dataset.action;
    if (action === 'remove') dropScenario(state.scenario);
    else addScenario(action === 'add' ? 'current' : action);
  };
  $('mcda-preset')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-preset]'); if (!b) return;
    state.mcdaPreset = b.dataset.preset;
    $('mcda-preset').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    recompute();
  });
  $('lang').onchange = (e) => {
    setLanguage(e.target.value); applyTranslations(); hideTip(); renderAll(); renderSources();
    if (scene3d) render3d();
  };

  $('pano').addEventListener('pointermove', (e) => {
    const p = layout.pano, b = $('pano').getBoundingClientRect(), x = e.clientX - b.left;
    if (x < p.L || x > p.L + p.pw) return hideTip();
    const az = (x - p.L) / p.pw * 360, ch = $('crosshair');
    ch.style.display = 'block'; ch.style.left = `${x}px`;
    showTip(e, `<b>${t('Azimuth {az}°', { az: az.toFixed(0) })}</b><br>${t('Terrain horizon {deg}', { deg: fmtDeg(hzAt(SITES[state.site], az)) })}`);
  });
  $('pano').addEventListener('pointerleave', hideTip);

  let dragging = false;
  const tlHour = (e) => { const p = layout.tl, b = $('timeline').getBoundingClientRect(); return Math.max(0, Math.min(stayH(), Math.round((e.clientX - b.left - p.L) / p.pw * stayH()))); };
  $('timeline').addEventListener('pointerdown', (e) => { dragging = true; $('timeline').setPointerCapture(e.pointerId); setHour(tlHour(e)); });
  $('timeline').addEventListener('pointermove', (e) => {
    const h = tlHour(e), r = sims[state.site]; if (dragging) setHour(h);
    showTip(e, `<b>${t('Landing + {dur}', { dur: fmtDur(h) })}</b><br>${fmtUTC(state.landing + h * HOUR)}<br>${t('Solar disk {pct}% · Earth link {state}', { pct: Math.round(r.frac[h] * 100), state: t(r.comm[h] ? 'available' : 'blocked') })}`);
  });
  ['pointerup', 'pointercancel'].forEach((n) => $('timeline').addEventListener(n, () => { dragging = false; }));
  $('timeline').addEventListener('pointerleave', () => { if (!dragging) hideTip(); });

  $('slip').addEventListener('pointermove', (e) => {
    const p = layout.slip, b = $('slip').getBoundingClientRect(), d = Math.floor((e.clientX - b.left - p.L) / p.bw);
    if (d < 0 || d >= p.data.length) return hideTip();
    const x = p.data[d], head = d ? t('Landing slips {d} d', { d }) : t('Landing on time');
    const body = state.slipMetric === 'sun'
      ? (x.run === 0 ? t('Lands in shadow') : t('{dur} of continuous sunlight', { dur: x.run >= LOOKAHEAD_H ? `≥ 60 ${t('d')}` : fmtDur(x.run) }))
      : t('Earth link {pct}% of the stay', { pct: Math.round(x.share * 100) });
    showTip(e, `<b>${head}</b><br>${new Date(state.landing + d * DAY).toISOString().slice(0, 10)}<br>${body}`);
  });
  $('slip').addEventListener('pointerleave', hideTip);

  $('scene-mode').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sceneMode = b.dataset.scene;
    for (const x of $('scene-mode').children) x.setAttribute('aria-pressed', String(x === b));
    render3d();
  };
  $('scene-reset').onclick = () => scene3d?.reset();
  $('height-scale').oninput = (e) => { $('height-value').textContent = `${e.target.value}×`; scene3d?.setHeightScale(Number(e.target.value)); };
  new IntersectionObserver(([entry]) => {
    sceneActive = entry.isIntersecting;
    scene3d?.setActive(sceneActive);
    if (sceneActive) { ensureScene(); render3d(); }
  }, { rootMargin: '120px' }).observe($('scene-viewport'));

  let lastW = 0;
  new ResizeObserver(() => { const w = document.documentElement.clientWidth; if (w !== lastW && sims.length) { lastW = w; renderAll(); } }).observe(document.documentElement);
  mapPick('polar', PN, PN, polarXY, polarLL, (s) => s.lat < -75);
  mapPick('globe', GW, GH, globeXY, (x, y) => ({ lat: 90 - y / GH * 180, lon: ((x / GW * 360 - 180) % 360 + 360) % 360 }), () => true);
}

async function start() {
  const [ephemeris, siteData] = await Promise.all([
    loadEphemeris('data/ephemeris'),
    fetch('data/sites.json').then((r) => { if (!r.ok) throw new Error('Could not load the site list'); return r.json(); }),
  ]);
  eph = ephemeris;
  SITES = siteData.sites.map((raw) => makeSite(raw));
  const first = SITES.findIndex((s) => s.id === DEFAULT_SITE);
  state.site = first >= 0 ? first : 0;
  mission = createMission({
    sites: () => SITES, eph: () => eph, landing: () => state.landing, margin: () => state.margin,
    go: (view) => showView(view), toast, setLanding,
    range: () => ({ min: utcMidnight(eph.t0), max: utcMidnight(eph.tEnd - SIM_H * HOUR) }),
    arrive: (k) => { state.site = k; showView('explore'); },
  });
  $('lang').value = getLanguage();
  initTranslations();
  bind();
  setLanding(Date.now());
  seedScenario();
  renderSources();
  showView(location.hash.slice(2));
  addEventListener('hashchange', () => showView(location.hash.slice(2)));
  loadMaps();
  $('loading').hidden = true;
}

start().catch((error) => {
  console.error(error);
  $('loading').textContent = `Luna Lens could not start: ${error.message}`;
});
