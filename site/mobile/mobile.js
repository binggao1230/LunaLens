import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';
import { dataBounds, latestCompleteTouchdown } from '../js/engine/scenario.js';
import { createMission } from '../js/views/mission.js';
import { createEducation } from '../js/edu/edu.js';
import { getLanguage, initTranslations, registerMessages, setLanguage, t } from '../js/i18n.js';
import { getMode, initMode, setMode, parseHash, formatHash } from '../js/mode.js';

registerMessages({
  Education: ['Éducation', '教育'],
  'Collapse guide': ['Réduire le guide', '收起向导'],
  'Expand guide': ['Développer le guide', '展开向导'],
  'Return to probe choice': ['Retour au choix de la sonde', '返回着陆器选择'],
  'Mobile lunar mission': ['Mission lunaire mobile', '移动月球任务'],
  'Loading the lunar mission…': ['Chargement de la mission lunaire…', '正在载入月球任务…'],
  'Lunar data could not be loaded.': ['Les données lunaires n’ont pas pu être chargées.', '月球数据无法载入。'],
  'Open the full LunaLens site.': ['Ouvrir le site LunaLens complet.', '打开完整 LunaLens 网站。'],
});

const $ = (id) => document.getElementById(id);
const DAY = 864e5, STAY_H = 709;
let eph, sites = [], mission, education, landing = 0, toastTimer;
let guideCollapsed = false;
const isReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function tell(message, duration = 2600) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

function updateSiteLabels() {
  for (const site of sites) {
    const raw = site.raw;
    Object.defineProperties(site, {
      short: { configurable: true, get: () => t(raw.short ?? raw.name.split(' · ')[0]) },
      label: { configurable: true, get: () => t(raw.name) },
      tagText: { configurable: true, get: () => t(raw.group) },
    });
  }
}

function showView(view, { replace = true } = {}) {
  const next = view === 'mission' ? 'mission' : 'start';
  document.body.dataset.view = next;
  const hash = formatHash(next, 'education');
  if (replace) history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  $('page-scroll').scrollTo({ top: 0, behavior: isReduced() ? 'auto' : 'smooth' });
  $('mobile-back').hidden = next !== 'mission';
  $('mobile-back').setAttribute('aria-label', t('Return to probe choice'));
  mission?.render();
  education?.onView(next);
  $('mode-label').textContent = t('Education');
}

function setLanding(ms) {
  if (!eph || !Number.isFinite(ms)) return;
  const bounds = dataBounds(eph);
  const min = bounds.firstMs;
  const max = latestCompleteTouchdown(bounds, STAY_H);
  landing = Math.min(max, Math.max(min, Math.floor(ms / DAY) * DAY));
  mission?.redraw();
}

function updateGuideToggle() {
  const panel = $('edu').querySelector('.edu-panel');
  if (!panel) return;
  panel.dataset.collapsed = String(guideCollapsed);
  let button = panel.querySelector('.mobile-guide-toggle');
  if (!button) {
    button = document.createElement('button');
    button.className = 'mobile-guide-toggle';
    button.type = 'button';
    button.addEventListener('click', () => {
      guideCollapsed = !guideCollapsed;
      panel.dataset.collapsed = String(guideCollapsed);
      updateGuideToggleLabel(button, panel);
    });
    panel.querySelector('.edu-top')?.append(button);
  }
  updateGuideToggleLabel(button, panel);
}

function updateGuideToggleLabel(button, panel) {
  const collapsed = panel.dataset.collapsed === 'true';
  button.textContent = collapsed ? '⌃' : '⌄';
  button.setAttribute('aria-label', t(collapsed ? 'Expand guide' : 'Collapse guide'));
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-controls', 'edu-text');
  button.title = t(collapsed ? 'Expand guide' : 'Collapse guide');
}

function attachMobileGuide() {
  const guide = $('edu');
  new MutationObserver(updateGuideToggle).observe(guide, { childList: true, subtree: true });
  guide.addEventListener('click', (event) => {
    const expert = event.target.closest('[data-act="expert"]');
    if (!expert) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = '../';
  }, true);
}

async function start() {
  try {
    const [metaResponse, binaryResponse, sitesResponse] = await Promise.all([
      fetch('data/ephemeris.json'), fetch('data/ephemeris.f64'), fetch('data/sites.json'),
    ]);
    if (![metaResponse, binaryResponse, sitesResponse].every((response) => response.ok)) throw new Error('Missing project data');
    const [meta, binary, catalog] = await Promise.all([metaResponse.json(), binaryResponse.arrayBuffer(), sitesResponse.json()]);
    eph = new Ephemeris(binary, meta);
    sites = catalog.sites.map((raw) => {
      const site = new Site(raw, eph);
      site.raw = raw;
      return site;
    });
    updateSiteLabels();

    initMode();
    if (getMode() !== 'education') setMode('education');
    initTranslations();
    $('language').value = getLanguage();
    landing = Math.min(latestCompleteTouchdown(dataBounds(eph), STAY_H), Math.max(eph.t0, Math.floor(Date.now() / DAY) * DAY));

    const ctx = {
      sites: () => sites,
      eph: () => eph,
      landing: () => landing,
      margin: () => 2,
      conditions: () => ({ stayH: STAY_H, marginDeg: 2, requiredSunH: 156, requireEarthAtTouchdown: true }),
      go: (view) => showView(view),
      toast: tell,
      setLanding,
      range: () => ({ min: eph.t0, max: latestCompleteTouchdown(dataBounds(eph), STAY_H) }),
      arrive: (siteIndex) => {
        if (Number.isInteger(siteIndex) && sites[siteIndex]) mission.pick(sites[siteIndex].id);
        showView('mission');
        education?.onArrived();
      },
      inspect: () => {},
      onProbePick: (id) => education?.onProbePick(id),
      onValidate: () => education?.onValidate(),
      onMissionRefresh: (site, frame) => education?.onMissionRefresh(site, frame),
      eduHighlight: () => education?.highlight() ?? null,
    };

    mission = createMission(ctx);
    education = createEducation({
      mission, sites: () => sites, eph: () => eph, landing: () => landing, margin: () => 2,
      setLanding, showView, view: () => document.body.dataset.view, language: getLanguage, toast: tell,
    });
    attachMobileGuide();
    $('language').addEventListener('change', async (event) => {
      setLanguage(event.target.value);
      updateSiteLabels();
      await education.setLanguage(event.target.value);
      mission.redraw();
      $('mode-label').textContent = t('Education');
    });
    $('mobile-back').addEventListener('click', () => showView('start'));

    const requestedView = parseHash(location.hash).view;
    showView(requestedView === 'mission' ? 'mission' : 'start', { replace: !location.hash });
    document.documentElement.dataset.ready = 'true';
  } catch (error) {
    console.error(error);
    $('page-scroll').innerHTML = `<main class="mobile-error" role="alert"><img src="assets/lunalens-logo.svg" alt=""><h1>LunaLens</h1><p>${t('Lunar data could not be loaded.')}</p><a href="../">${t('Open the full LunaLens site.')}</a></main>`;
  }
}

window.addEventListener('hashchange', () => {
  const view = parseHash(location.hash).view;
  if (mission) showView(view === 'mission' ? 'mission' : 'start', { replace: false });
});

start();
