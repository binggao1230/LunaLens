// Education mode: historic landing sites as flags on the Mission map and globe, with a story card for each.
// Data: assets/historic-sites.json (team-written summaries; some positions are approximate, see the file).
// The Mission view owns the map and the globe; it gives this module a projector, (lat, lon) → screen
// position, and calls place() after every frame. Everything here is plain DOM over the stage.
import { escapeHtml } from '../format.js';
import { t, getLanguage } from '../i18n.js';

const FLAG = 'assets/historic-flag.svg';
const ANCHOR_X = 119 / 500, ANCHOR_Y = 476 / 545; // centre of the base disc in the SVG
const ICONS = {
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  night: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>',
  earth: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  terrain: '<svg viewBox="0 0 24 24"><path d="M3 19 9.5 7l4 7 2.5-3.5L21 19z"/></svg>',
  moon_vs_earth: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="5"/><circle cx="17.5" cy="12" r="3.5"/><path d="M13 12h1"/></svg>',
};
const STATUS = { success: 'Success', partial: 'Partial success', failed: 'Failed', planned: 'Planned' };

let cache = null;
export async function loadHistoricSites() {
  if (!cache) {
    cache = fetch('assets/historic-sites.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => ({ sites: data.sites, lessons: data.lessons }))
      .catch((error) => { cache = null; throw error; });
  }
  return cache;
}

/**
 * opts: { stage, projector(), flyTo(site), onOpen(site), onClose(), highlight() → ids, offMap() → bool, farVisible() → bool }
 * projector() returns (lat, lon) → { x, y, visible, scale } or null when nothing can be placed yet.
 */
export function createHistoric(opts) {
  const { stage } = opts;
  const layer = document.createElement('div'); layer.className = 'hflags'; layer.hidden = true;
  const panel = document.createElement('div'); panel.className = 'hpanel'; panel.hidden = true;
  const card = document.createElement('div'); card.className = 'hcard'; card.hidden = true;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-labelledby', 'hcard-title');
  stage.append(layer, panel, card);
  let data = null, on = false, openId = null, hover = null, anchorEl = null, lastKey = '';
  const lang = () => (getLanguage() === 'fr' ? 'fr' : 'en'); // the texts exist in English and French
  const text = (site, field) => site[`${field}_${lang()}`] ?? site[`${field}_en`];
  const byId = (id) => data?.sites.find((s) => s.id === id);

  async function ensure() {
    if (data) return data;
    try { data = await loadHistoricSites(); } catch (error) { console.error(error); data = { sites: [], lessons: {} }; }
    build();
    return data;
  }
  function build() {
    layer.innerHTML = data.sites.map((s) => `<button type="button" class="hflag${s.status === 'planned' ? ' planned' : ''}" data-hid="${escapeHtml(s.id)}" aria-label="${escapeHtml(`${s.name}, ${s.year}`)}" aria-haspopup="dialog" style="display:none"><img src="${FLAG}" alt="" draggable="false"></button>`).join('');
  }

  /** Reposition every flag from the current projector; called after each 2D draw and each 3D frame. */
  function place() {
    if (!on || !data) return;
    const project = opts.projector();
    const hl = new Set(opts.highlight?.() ?? []);
    const offMap = [];
    for (const button of layer.children) {
      const site = byId(button.dataset.hid);
      const p = project ? project(site.lat, site.lon) : null;
      if (!p || !p.visible) { button.style.display = 'none'; if (site) offMap.push(site); continue; }
      button.style.display = '';
      button.style.left = `${p.x.toFixed(1)}px`; button.style.top = `${p.y.toFixed(1)}px`;
      button.style.setProperty('--s', String(Math.max(0.75, Math.min(1.375, p.scale ?? 1))));
      button.classList.toggle('sel', site.id === openId);
      button.classList.toggle('hl', hl.has(site.id));
      button.classList.toggle('hover', site.id === hover);
    }
    renderPanel(opts.offMap?.() ? offMap : []);
    if (openId && anchorEl?.classList.contains('hflag')) positionCard(anchorEl);
  }

  function renderPanel(list) {
    const key = `${list.map((s) => s.id).join(',')}|${lang()}|${openId}`;
    if (key === lastKey) return;
    lastKey = key;
    panel.hidden = list.length === 0;
    if (!list.length) { panel.innerHTML = ''; return; }
    panel.innerHTML = `<div class="hpanel-head">${escapeHtml(t('Historic sites'))} <span>${escapeHtml(t('{n} off this map', { n: list.length }))}</span></div>
      <div class="hpanel-list">${list.map((s) => `<button type="button" data-hid="${escapeHtml(s.id)}" class="${s.id === openId ? 'on' : ''}" aria-haspopup="dialog"><img src="${FLAG}" alt=""><span>${escapeHtml(s.name)} <small>${s.year}</small></span><i>${escapeHtml(t(s.side === 'far' ? 'far side' : 'off map'))}</i></button>`).join('')}</div>`;
  }

  function cardHtml(site) {
    const lesson = data.lessons[site.lesson];
    const chip = `<span class="hchip s-${escapeHtml(site.status)}">${escapeHtml(t(STATUS[site.status] ?? site.status))}</span>`;
    return `<div class="hcard-top"><div><h3 id="hcard-title" tabindex="-1">${escapeHtml(site.name)}</h3><p class="hcard-meta">${escapeHtml(site.agency)} · ${site.year}${site.side === 'far' ? ` · ${escapeHtml(t('far side'))}` : ''}</p></div>${chip}</div>
      <p class="hcard-title">${escapeHtml(text(site, 'title'))}</p>
      <p class="hcard-fact">${escapeHtml(text(site, 'fact'))}</p>
      ${lesson ? `<p class="hcard-lesson"><i aria-hidden="true">${ICONS[site.lesson] ?? ''}</i>${escapeHtml(lesson[lang()] ?? lesson.en)}</p>` : ''}
      ${site.approx ? `<p class="hcard-note">${escapeHtml(t('Position approximate'))}</p>` : ''}
      <div class="hcard-actions"><button type="button" class="btn-primary" data-act="fly">${escapeHtml(t('Fly to'))}</button><button type="button" class="btn-ghost" data-act="close">${escapeHtml(t('Close'))}</button></div>`;
  }
  function positionCard(anchor) {
    const sr = stage.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    const ax = ar.left - sr.left + ar.width / 2, ay = ar.top - sr.top;
    const w = card.offsetWidth || 300, h = card.offsetHeight || 200;
    let left = ax + 18, top = ay - h / 2;
    if (left + w > sr.width - 12) left = ax - w - 18;
    if (left < 12) left = Math.max(12, Math.min(sr.width - w - 12, ax - w / 2));
    top = Math.max(12, Math.min(sr.height - h - 12, top));
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  }
  function open(id, anchor) {
    const site = byId(id); if (!site) return;
    openId = id; anchorEl = anchor;
    card.innerHTML = cardHtml(site);
    card.hidden = false;
    positionCard(anchor);
    place();
    card.querySelector('#hcard-title')?.focus({ preventScroll: true });
    opts.onOpen?.(site);
  }
  function close(returnFocus = true) {
    if (!openId) return;
    const was = anchorEl; openId = null; anchorEl = null;
    card.hidden = true; card.innerHTML = '';
    place();
    if (returnFocus && was?.isConnected) was.focus({ preventScroll: true });
    opts.onClose?.();
  }

  layer.addEventListener('click', (e) => { const b = e.target.closest('.hflag'); if (b) (openId === b.dataset.hid ? close() : open(b.dataset.hid, b)); });
  layer.addEventListener('pointerover', (e) => { const b = e.target.closest('.hflag'); if (b) { hover = b.dataset.hid; b.classList.add('hover'); } });
  layer.addEventListener('pointerout', (e) => { const b = e.target.closest('.hflag'); if (b) { hover = null; b.classList.remove('hover'); } });
  panel.addEventListener('click', (e) => { const b = e.target.closest('[data-hid]'); if (b) open(b.dataset.hid, b); });
  card.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') close();
    if (act === 'fly') { const site = byId(openId); if (site) opts.flyTo(site); }
  });
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  stage.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openId) close(); });

  return {
    /** Turn the layer on or off (Education mode and the toggle decide). */
    async setOn(value) {
      on = Boolean(value);
      layer.hidden = !on; panel.hidden = !on || panel.innerHTML === '';
      if (!on) { close(false); lastKey = ''; return; }
      await ensure();
      place();
    },
    place,
    /** Re-render texts after a language change. */
    relabel() { lastKey = ''; if (openId) { const site = byId(openId); card.innerHTML = cardHtml(site); } place(); },
    open: (id) => { const b = layer.querySelector(`[data-hid="${id}"]`); if (b) open(id, b.style.display === 'none' ? panel.querySelector(`[data-hid="${id}"]`) ?? b : b); },
    close,
    get openId() { return openId; },
    sites: () => data?.sites ?? [],
  };
}
