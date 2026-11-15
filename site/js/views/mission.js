import { t, getLanguage, registerMessages, hasTranslation } from '../i18n.js';
import { escapeHtml, fmtDeg, fmtLatLon, fmtDateTime, fmtDayMonth } from '../format.js';
import { nextTransition, nextMarginTransition, evaluateSiteMcda } from '../engine/metrics.js';
import { createPolar3d } from './polar3d/index.js';
import { mountProbePreviews } from './probe-gallery.js';
import { playProbeFlight } from './probe-flight.js';
import { onMode, isEducation } from '../mode.js';
import { CHARACTER_MARKUP } from '../edu/character.js';
import { createHistoric } from '../edu/historic.js';

const D2R = Math.PI / 180, HOUR = 36e5, SPAN = 709;
const COLORS = { link: '#43d98a', sun: '#f5c542', dark: '#7d7993', both: '#9be7ff' };
const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R)];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const MESSAGES = {
  'Leave Earth': ['Quitter la Terre', '离开地球'],
  'Lunar transfer': ['Transit lunaire', '地月巡航'],
  'Moon approach': ['Approche lunaire', '接近月球'],
  'Braking for landing': ['Freinage avant l’alunissage', '转身减速'],
  'Final descent': ['Descente finale', '最后降落'],
  'Touchdown': ['Alunissage', '已着陆'],
  'Exit flight': ['Quitter le vol', '退出飞行'],
  'Landed · exit when you are ready': ['Alunissage terminé · quittez quand vous le souhaitez', '着陆完成 · 可停留观看，点击退出离开'],
  'Skip flight': ['Passer le vol', '跳过飞行'],
  'Illustrative flight · not to scale': ['Vol illustratif · hors échelle', '飞行演示 · 非真实比例'],
  'Preparing spacecraft…': ['Préparation du vaisseau…', '正在准备探测器…'],
  'Mission': ['Mission', '任务'],
  'See which lunar landing sites have sunlight and a direct line of sight to Earth, hour by hour. Pick a lander, choose a site, then send a probe.': ['Voyez quels sites d’alunissage reçoivent la lumière du Soleil et voient la Terre en direct, heure par heure. Choisissez un atterrisseur, un site, puis envoyez une sonde.', '逐小时查看哪些月面着陆点有阳光、又能直视地球。选择着陆器与地点，然后发射探测器。'],
  'Choose your probe': ['Choisissez votre sonde', '选择你的探测器'],
  'Validate': ['Valider', '确认'],
  'Previous probe': ['Sonde précédente', '上一个探测器'],
  'Next probe': ['Sonde suivante', '下一个探测器'],
  'Drag to rotate · scroll to zoom': ['Glissez pour tourner · défilez pour zoomer', '拖动旋转 · 滚轮缩放'],
  'Loading model…': ['Chargement du modèle…', '正在加载模型…'],
  'Model unavailable. Select another probe or continue.': ['Modèle indisponible. Choisissez une autre sonde ou continuez.', '模型不可用。可选择其他探测器或继续。'],
  'Artemis lander concept': ['Concept d’atterrisseur Artemis', 'Artemis 着陆器概念'],
  'Illustrative Artemis lander for crewed south-pole missions.': ['Atterrisseur Artemis illustratif pour les missions habitées au pôle Sud.', '阿尔忒弥斯载人南极任务的概念着陆器。'],
  'Apollo Lunar Module': ['Module lunaire Apollo', '阿波罗登月舱'],
  'The lander that carried six Apollo crews to the Moon, 1969–1972.': ['L’atterrisseur qui a déposé six équipages Apollo sur la Lune, 1969–1972.', '1969–1972 年间六次阿波罗登月任务的载人登月舱。'],
  'Intuitive Machines lander; flew IM-1 (2024) and IM-2 (2025).': ['Atterrisseur d’Intuitive Machines ; missions IM-1 (2024) et IM-2 (2025).', '直觉机器公司着陆器，执行 IM-1（2024）与 IM-2（2025）任务。'],
  'India’s lander; Chandrayaan-3 made the first soft landing in 2023.': ['Atterrisseur indien ; Chandrayaan-3 a réussi le premier alunissage en douceur en 2023.', '印度着陆器；月船三号于 2023 年实现首次软着陆。'],
  'Pick a landing site': ['Choisissez un site d’alunissage', '选择着陆点'],
  'Site locations': ['Sites d’alunissage', '着陆地点'],
  'Search sites': ['Rechercher un site', '搜索地点'],
  'Send probe': ['Envoyer la sonde', '发射探测器'],
  '3D': ['3D', '3D'],
  '2D': ['2D', '2D'],
  'Reset view': ['Réinitialiser la vue', '重置视角'],
  'Earth link': ['Liaison Terre', '地球通信'],
  'Earth link available': ['Liaison Terre disponible', '可与地球通信'],
  'Sunlit, no Earth link': ['Éclairé, sans liaison Terre', '有日照，无地球通信'],
  'In shadow': ['À l’ombre', '处于阴影'],
  'Sunlit as well': ['Aussi éclairé', '同时有日照'],
  'Drag to rotate, scroll to zoom. Not to scale. Cyan ring: the Moon’s orbit around Earth; amber: Earth’s orbit around the Sun. Cyan line: 75°S, where the terrain model ends.': ['Faites glisser pour tourner, molette pour zoomer. Hors échelle. Anneau cyan : orbite de la Lune autour de la Terre ; ambre : orbite de la Terre autour du Soleil. Ligne cyan : 75°S, limite du modèle de relief.', '拖动旋转，滚轮缩放。未按比例。青色圈：月球绕地球轨道；琥珀色圈：地球绕太阳轨道。青色线：75°S，地形模型边界。'],
  'The Moon as seen from Earth. Tap a dot to select a site.': ['La Lune vue depuis la Terre. Touchez un point pour choisir un site.', '从地球看到的月球。点击圆点选择地点。'],
  'Sun elevation': ['Élévation du Soleil', '太阳仰角'],
  'Earth elevation': ['Élévation de la Terre', '地球仰角'],
  'Direct-to-Earth link': ['Liaison directe avec la Terre', '直连地球'],
  'Available': ['Disponible', '可用'],
  'Blocked': ['Bloquée', '被遮挡'],
  'Sunset': ['Coucher du Soleil', '日落'],
  'Sunrise': ['Lever du Soleil', '日出'],
  '{event} in': ['{event} dans', '距{event}还有'],
  'Stays in view': ['Reste visible', '持续可见'],
  'Does not rise': ['Ne se lève pas', '不会升起'],
  'no terrain': ['sans relief', '无地形'],
  'Sun': ['Soleil', '太阳'],
  'Earth': ['Terre', '地球'],
  'Sub-solar point': ['Point subsolaire', '日下点'],
  '{v} M km': ['{v} M km', '{v} 百万公里'],
  '{pct}% lit': ['{pct} % éclairée', '{pct}% 受照'],
  'Recommended': ['Recommandé', '推荐'],
  'Sunset in': ['Coucher du Soleil dans', '日落倒计时'],
  'Earthset in': ['Coucher de la Terre dans', '地落倒计时'],
  'Earthrise': ['Lever de la Terre', '地升'],
  'Open in Plan': ['Ouvrir dans Plan', '在 Plan 中打开'],
  'Stays in view': ['Reste visible', '全程可见'],
  'None in this stay': ['Aucun pendant le séjour', '停留期内无'],
  '{n} h lit and linked': ['{n} h éclairé et relié', '{n} 小时同时可用'],
  'Both': ['Les deux', '同时可见'],
  'min': ['min', '分钟'],
  'h': ['h', '小时'],
  'd': ['j', '天'],
  'Play': ['Lecture', '播放'],
  'Pause': ['Pause', '暂停'],
  'Sun and Earth over the next {days} days': ['Soleil et Terre sur les {days} prochains jours', '未来 {days} 天的太阳与地球可见情况'],
  'Export CSV': ['Exporter en CSV', '导出 CSV'],
  'Probe on its way to {site}': ['Sonde en route vers {site}', '探测器正飞往 {site}'],
  'Click to skip': ['Cliquez pour passer', '点击跳过'],
  '3D is not available on this device. Showing the 2D view.': ['La 3D n’est pas disponible sur cet appareil. Affichage en 2D.', '此设备不支持 3D，已切换为 2D 视图。'],
  'No site matches that search.': ['Aucun site ne correspond à cette recherche.', '没有匹配的地点。'],
  'Back to the probe choice': ['Retour au choix de la sonde', '返回探测器选择'],
  'Probe': ['Sonde', '探测器'],
  'to Earth': ['vers la Terre', '朝向地球'],
  'to Sun': ['vers le Soleil', '朝向太阳'],
  'E': ['E', '东'],
  'South pole': ['Pôle Sud', '南极'],
  'Whole Moon': ['Lune entière', '整个月球'],
  'LOLA relief, 75°S to the pole. Drag to pan, scroll to zoom. Dark is night.': ['Relief LOLA, de 75°S au pôle. Faites glisser pour déplacer, molette pour zoomer. Le sombre est la nuit.', 'LOLA 地形，南纬 75° 至极点。拖动平移，滚轮缩放。暗处为夜晚。'],
  'Whole Moon, near side in the centre. Drag to pan, scroll to zoom. Dark is night.': ['Lune entière, face visible au centre. Faites glisser pour déplacer, molette pour zoomer. Le sombre est la nuit.', '整个月球，正面居中。拖动平移，滚轮缩放。暗处为夜晚。'],
  '{count} sites lie north of this map. Switch to Whole Moon.': ['{count} sites se trouvent au nord de cette carte. Passez à Lune entière.', '{count} 个地点位于本地图以北，请切换到“整个月球”。'],
  'Today': ['Aujourd’hui', '今天'],
  'Previous day': ['Jour précédent', '前一天'],
  'Next day': ['Jour suivant', '后一天'],
  'Landing date (UTC)': ['Date d’alunissage (UTC)', '着陆日期（UTC）'],
  'Include in comparison': ['Inclure dans la comparaison', '加入对比'],
  'Compare {name}': ['Comparer {name}', '对比 {name}'],
  'compared': ['comparés', '已对比'],
  'Total sunlight': ['Ensoleillement total', '累计日照'],
  'Total Earth link': ['Liaison Terre totale', '累计对地通信'],
  'Simultaneous window': ['Fenêtre simultanée', '同时可用窗口'],
  'both': ['les deux', '同时'],
  'sites': ['sites', '个地点'],
  'All': ['Tous', '全选'],
  'Clear': ['Effacer', '清空'],
  'Select all sites to compare': ['Sélectionner tous les sites à comparer', '全选地点进行对比'],
  'Clear comparison selection': ['Effacer la sélection de comparaison', '清空对比选择'],
  'No sites selected for comparison. Tick checkboxes in Site locations to compare.': ['Aucun site sélectionné pour la comparaison. Cochez des cases dans Sites d’alunissage pour comparer.', '未选择对比地点。请在着陆地点列表中勾选以展开对比。'],
  'Reference (smooth sphere)': ['Référence (sphère lisse)', '参考点（光滑球面）'],
  'MCDA score': ['Score MCDA', '多准则评分'],
  '{score}/100 MCDA': ['{score}/100 MCDA', '{score}/100 综合分'],
  'Longest sunlit run': ['Plus longue période éclairée', '最长连续日照'],
  'Longest darkness': ['Plus longue nuit', '最长连续黑暗'],
  'Max terrain horizon': ['Horizon max du relief', '最大地形遮挡角'],
  'Earthrise': ['Lever de Terre', '地球升起'],
  'Earthset': ['Coucher de Terre', '地球落下'],
  'Link at touchdown': ['Liaison à l’alunissage', '着陆时地球直连'],
  'Viable on this date': ['Viable à cette date', '该日期可行'],
  'Blocked at touchdown': ['Bloquée à l’alunissage', '着陆时被遮挡'],
};
for (const [key, value] of Object.entries(MESSAGES)) if (!hasTranslation(key)) registerMessages({ [key]: value });

const GROUND = '<path d="M0 100 Q80 90 160 100 V120 H0Z" fill="#1d1a2e"/><path d="M0 100 Q80 90 160 100" fill="none" stroke="#3a3558" stroke-width="1"/>';
const STARS = '<g fill="#fff" opacity=".7"><circle cx="18" cy="16" r=".9"/><circle cx="52" cy="30" r=".7"/><circle cx="126" cy="14" r="1"/><circle cx="144" cy="40" r=".7"/><circle cx="96" cy="22" r=".6"/><circle cx="30" cy="54" r=".6"/></g>';
const LEG = 'stroke="#c9c5da" stroke-width="1.6" stroke-linecap="round"';
const ART = {
  apollo: `<svg viewBox="0 0 160 120" aria-hidden="true">${STARS}${GROUND}
    <g ${LEG}><path d="M58 76 L36 98M102 76 L124 98M70 80 L62 98M90 80 L98 98" fill="none"/></g>
    <g fill="#c9c5da"><ellipse cx="34" cy="99" rx="8" ry="2"/><ellipse cx="126" cy="99" rx="8" ry="2"/><ellipse cx="62" cy="99" rx="6" ry="1.6"/><ellipse cx="98" cy="99" rx="6" ry="1.6"/></g>
    <polygon points="62,50 98,50 108,66 98,82 62,82 52,66" fill="#b8923a" stroke="#f1d58a" stroke-width="1.2"/>
    <polygon points="70,32 90,32 96,50 64,50" fill="#8d8aa0" stroke="#e5e2f0" stroke-width="1.2"/>
    <rect x="74" y="58" width="12" height="10" rx="2" fill="#0d0b18"/></svg>`,
  novac: `<svg viewBox="0 0 160 120" aria-hidden="true">${STARS}${GROUND}
    <g ${LEG}><path d="M68 78 L44 98M92 78 L116 98" fill="none"/></g>
    <g fill="#c9c5da"><ellipse cx="42" cy="99" rx="8" ry="2"/><ellipse cx="118" cy="99" rx="8" ry="2"/></g>
    <polygon points="74,82 86,82 91,92 69,92" fill="#59546e"/>
    <rect x="64" y="30" width="32" height="54" rx="6" fill="#8e97ad" stroke="#e5e8f3" stroke-width="1.2"/>
    <path d="M64 36 Q80 14 96 36Z" fill="#aab2c6" stroke="#e5e8f3" stroke-width="1.2"/>
    <rect x="70" y="46" width="20" height="8" rx="2" fill="#2b3350"/><rect x="70" y="60" width="20" height="14" rx="2" fill="#2b3350" opacity=".6"/></svg>`,
  vikram: `<svg viewBox="0 0 160 120" aria-hidden="true">${STARS}${GROUND}
    <g ${LEG}><path d="M58 80 L40 98M102 80 L120 98M70 82 L64 98M90 82 L96 98" fill="none"/></g>
    <g fill="#c9c5da"><ellipse cx="38" cy="99" rx="8" ry="2"/><ellipse cx="122" cy="99" rx="8" ry="2"/></g>
    <polygon points="54,58 106,58 114,44 62,44" fill="#1f3f95" stroke="#7fa2ff" stroke-width="1.2"/>
    <rect x="54" y="58" width="52" height="24" rx="3" fill="#cfd1dd" stroke="#fff" stroke-width="1.2"/>
    <rect x="62" y="64" width="14" height="10" rx="2" fill="#2a2640"/><path d="M106 82 L134 96" stroke="#9b97ae" stroke-width="3" stroke-linecap="round"/></svg>`,
  polar: `<svg viewBox="0 0 160 120" aria-hidden="true">${STARS}
    <circle cx="26" cy="26" r="9" fill="#f5c542" opacity=".95"/><circle cx="26" cy="26" r="16" fill="#f5c542" opacity=".18"/>
    <path d="M0 96 L38 74 L70 88 L112 58 L160 92 V120 H0Z" fill="#1d1a2e" stroke="#3a3558" stroke-width="1"/>
    <path d="M112 58 L160 92 L140 92 Z" fill="#05040a" opacity=".7"/>
    <path d="M112 58 L150 54" stroke="#f5c542" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>
    <g transform="translate(112 58)"><g ${LEG}><path d="M-5 0 L-9 8M5 0 L9 8" fill="none"/></g><rect x="-6" y="-8" width="12" height="9" rx="2" fill="#cfd1dd" stroke="#fff" stroke-width=".8"/><rect x="-6" y="-12" width="12" height="3" fill="#1f3f95"/></g>
    <circle cx="136" cy="22" r="6" fill="#5aa2ff"/><circle cx="134" cy="20" r="2.4" fill="#8fd0a0" opacity=".8"/></svg>`,
};
const PROBES = [
  { id: 'artemis', name: 'Artemis lander concept', meta: 'Illustrative Artemis lander for crewed south-pole missions.', sites: ['shackleton-rim', 'degerlache-rim', 'nobile-rim', 'shackleton-floor'] },
  { id: 'apollo', name: 'Apollo Lunar Module', meta: 'The lander that carried six Apollo crews to the Moon, 1969–1972.', sites: ['apollo11', 'apollo12', 'apollo15', 'apollo16', 'apollo17'] },
  { id: 'novac', name: 'Nova-C', meta: 'Intuitive Machines lander; flew IM-1 (2024) and IM-2 (2025).', sites: ['im1', 'im2'] },
  { id: 'vikram', name: 'Vikram', meta: 'India’s lander; Chandrayaan-3 made the first soft landing in 2023.', sites: ['ch3'] },
];

// Education mode wording for the probe cards: one plain sentence, no raw numbers.
const SIMPLE_META = {
  artemis: 'A concept lander for astronauts at the Moon’s south pole.',
  apollo: 'The lander that carried astronauts to the Moon from 1969 to 1972.',
  novac: 'A small robot lander that flew to the Moon in 2024 and 2025.',
  vikram: 'India’s robot lander, which landed in 2023.',
};

export function createMission(ctx) {
  const $ = (id) => document.getElementById(id);
  const startEl = $('v-start'), missionEl = $('v-mission'), flightEl = $('flight');
  const local = { historic: true, flat: 'pole', probe: 'apollo', picked: null, mode: '3d', hour: 0, timer: null, open: null, query: '', listKey: '', laneKey: '', compared: new Set() };
  let view3d = null, view3dLoading = false, view3dFailed = false, lastFrame = null, flying = false;
  let disposePreview = () => {};
  let historic = null, project2d = null; // Education mode: historic landing-site flags over the map and the globe

  const probe = () => PROBES.find((p) => p.id === local.probe);
  const sites = () => ctx.sites();
  const view = () => document.body.dataset.view;
  const dur = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    const days = Math.floor(totalMin / 1440), hours = Math.floor((totalMin % 1440) / 60), minutes = totalMin % 60;
    if (days > 0) return `${days} ${t('d')} ${hours} ${t('h')}`;
    if (hours > 0) return `${hours} ${t('h')} ${String(minutes).padStart(2, '0')} ${t('min')}`;
    return `${minutes} ${t('min')}`;
  };

  function orderedSites() {
    const list = sites();
    const first = probe().sites.map((id) => list.find((s) => s.id === id)).filter(Boolean);
    return [...first, ...list.filter((s) => !first.includes(s))];
  }
  function pickedSite() {
    const list = sites();
    return list.find((s) => s.id === local.picked) ?? orderedSites()[0];
  }
  function defaultCompared() {
    const list = sites();
    const probeSites = probe()?.sites?.filter((id) => list.some((s) => s.id === id)) ?? [];
    const initial = probeSites.length >= 2 ? probeSites.slice(0, 4) : orderedSites().slice(0, 3).map((s) => s.id);
    return new Set(initial);
  }
  local.compared = defaultCompared();
  function statusOf(site, j) {
    const series = site.series;
    return { sun: series.sunVis[j] === 1, link: series.earthClr[j] > ctx.margin() };
  }
  const colorOf = (status) => (status.link ? COLORS.link : status.sun ? COLORS.sun : COLORS.dark);
  function frame() {
    const ms = ctx.landing() + local.hour * HOUR;
    const eph = ctx.eph();
    const index = eph.indexOf(ms);
    const j = Math.round(index);
    const state = eph.stateAt(index);
    const status = new Map(sites().map((site) => [site.id, statusOf(site, j)]));
    return { ms, index, j, sun: unit(state[1], state[0]), earth: unit(state[4], state[3]), earthLat: state[4], earthLon: state[3], sunLat: state[1], sunLon: state[0], sunDistKm: state[2], earthDistKm: state[5], status };
  }

  /* ---------- start page ---------- */

  const probeMetaHtml = (p, edu) => escapeHtml(t(edu ? SIMPLE_META[p.id] ?? p.meta : p.meta));
  const LEDE = 'See which lunar landing sites have sunlight and a direct line of sight to Earth, hour by hour. Pick a lander, choose a site, then send a probe.';
  const LEDE_SIMPLE = 'Pick a lander, and your guide will take you to the Moon.';
  function renderStart() {
    disposePreview();
    const selected = probe(), edu = isEducation();
    startEl.innerHTML = `<div class="start">
      <h1 aria-label="LunaLens"><span>Luna</span><img src="assets/lunalens-logo.svg" alt=""><span>Lens</span></h1>
      <p class="lede">${escapeHtml(t(edu ? LEDE_SIMPLE : LEDE))}</p>
      <div class="pick">${escapeHtml(t('Choose your probe'))}</div>
      <div class="guide-row" id="guide"${edu ? '' : ' hidden'}><div class="edu-char mood-happy" aria-hidden="true">${CHARACTER_MARKUP}</div>
        <p class="guide-bubble" role="status">${escapeHtml(t('Hi! I\'ll be your mission guide. Pick a lander and press Validate.'))}</p></div>
      <div class="probe-grid" data-model-error="${escapeHtml(t('Model unavailable. Select another probe or continue.'))}">
        ${PROBES.map(p => {
          return `<section class="probe-choice" data-probe-card="${p.id}" data-selected="${p.id === selected.id}">
            <div class="probe-viewport">
              <canvas data-model="${p.id}" aria-label="${escapeHtml(t(p.name))}" aria-description="${escapeHtml(t('Drag to rotate · scroll to zoom'))}"></canvas>
              <span class="probe-loading" role="status">${escapeHtml(t('Loading model…'))}</span>
            </div>
            <button class="probe-select" data-probe="${p.id}" aria-pressed="${p.id === selected.id}">
              <span class="probe-title">${escapeHtml(t(p.name))}</span><span class="probe-check" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7"/></svg></span>
              <span class="probe-meta">${probeMetaHtml(p, edu)}</span>
            </button>
          </section>`;
        }).join('')}
      </div>
      <div class="start-actions"><button class="btn-primary" id="validate">${escapeHtml(t(edu ? 'Start the mission' : 'Validate'))}<span aria-hidden="true">→</span></button></div></div>`;
    disposePreview = mountProbePreviews(startEl.querySelector('.probe-grid'));
  }
  /** The mode changed while the start page is up: update the guide, the cards and the button in place
   *  (a full renderStart would reload the four 3D previews). */
  function applyStartMode() {
    if (!startEl.querySelector('.start')) return;
    const edu = isEducation();
    startEl.querySelector('#guide').hidden = !edu;
    startEl.querySelector('.lede').textContent = t(edu ? LEDE_SIMPLE : LEDE);
    for (const p of PROBES) { const meta = startEl.querySelector(`[data-probe="${p.id}"] .probe-meta`); if (meta) meta.innerHTML = probeMetaHtml(p, edu); }
    const validate = startEl.querySelector('#validate');
    if (validate) validate.firstChild.textContent = t(edu ? 'Start the mission' : 'Validate');
  }
  onMode(() => { if (view() === 'start') applyStartMode(); else if (view() === 'mission') refresh(true); });

  /* ---------- mission page skeleton ---------- */

  function buildMission() {
    missionEl.innerHTML = `<div class="mission">
      <section class="glass datebar"><label for="m-date" id="m-datelabel"></label>
        <button class="btn-ghost" id="m-prev">‹</button><input type="date" id="m-date"><button class="btn-ghost" id="m-next">›</button><button class="btn-ghost" id="m-today"></button>
        <button id="m-play"></button><input type="range" id="m-time" min="0" max="${SPAN}" step="1" value="0"><span class="when" id="m-when"></span></section>
      <div>
        <section class="glass stage" id="m-stage">
          <canvas id="m-3d" aria-label="3D Moon"></canvas><canvas id="m-2d" aria-label="2D Moon" hidden></canvas>
          <div class="overlay-tl"><div><h2 id="m-title"></h2><div class="hint" id="m-hint"></div><div class="mseg" id="m-flat" style="margin-top:10px"><button data-flat="pole"></button><button data-flat="moon"></button></div></div>
            <div style="display:flex;gap:8px;align-items:center"><button type="button" class="hswitch" id="m-hist" role="switch" aria-checked="true"></button><button class="btn-ghost" id="m-reset"></button><div class="mseg" id="m-seg"><button data-mode="3d"></button><button data-mode="2d"></button></div></div></div>
          <div class="legend2" id="m-legend"></div><div class="m-readout" id="m-readout"></div><div class="note2" id="m-note" hidden></div><div class="zoom2" id="m-zoom"><button id="m-zout" aria-label="−">−</button><button id="m-zin" aria-label="+">+</button></div><div class="site-label" id="m-label"></div>
        </section>
        <section class="glass lanes" id="m-lanes"></section>
      </div>
      <aside class="glass side-panel">
        <div class="side-head">
          <h3 id="m-ph"></h3>
          <div class="side-head-actions">
            <button type="button" id="m-cmp-all" class="btn-ghost btn-xs"></button>
            <button type="button" id="m-cmp-clear" class="btn-ghost btn-xs"></button>
          </div>
        </div>
        <input type="search" id="m-search" autocomplete="off">
        <div class="m-scenario" id="m-scenario"></div>
        <div class="sl" id="m-list"></div>
        <button class="btn-primary" id="m-send"></button>
      </aside>
    </div>`;
    historic = createHistoric({
      stage: $('m-stage'),
      projector: () => (local.mode === '3d' ? (view3d ? view3d.project : null) : project2d),
      offMap: () => local.mode === '2d' && local.flat === 'pole',
      onOpen: (site) => ctx.onHistoricOpen?.(site),
      onClose: () => ctx.onHistoricClose?.(),
      highlight: () => ctx.eduFlagHighlight?.() ?? [],
    });
    $('m-hist').onclick = () => { local.historic = !local.historic; syncHistoric(); setStaticText(); };
    $('m-seg').onclick = (event) => { const b = event.target.closest('button'); if (b) setMode(b.dataset.mode); };
    $('m-reset').onclick = () => view3d?.reset();
    $('m-flat').onclick = (event) => { const b = event.target.closest('button'); if (b) setFlat(b.dataset.flat); };
    $('m-zin').onclick = () => zoomAt(layout2d?.baseX ?? 0, layout2d?.baseY ?? 0, 1.5);
    $('m-zout').onclick = () => zoomAt(layout2d?.baseX ?? 0, layout2d?.baseY ?? 0, 1 / 1.5);
    const shiftDay = (days) => setDate(ctx.landing() + days * 864e5);
    $('m-prev').onclick = () => shiftDay(-1);
    $('m-next').onclick = () => shiftDay(1);
    $('m-today').onclick = () => setDate(Date.now());
    $('m-date').onchange = (event) => { const ms = Date.parse(`${event.target.value}T00:00:00Z`); if (!Number.isNaN(ms)) setDate(ms); };
    $('m-play').onclick = togglePlay;
    $('m-time').oninput = (event) => { local.hour = Number(event.target.value); refresh(); };
    $('m-search').oninput = (event) => { local.query = event.target.value.trim().toLowerCase(); renderList(true); };
    $('m-send').onclick = sendProbe;
    $('m-cmp-all').onclick = () => {
      local.compared = new Set(sites().map((s) => s.id));
      renderList(true);
      renderLanes(true);
      updateHeaderCount();
    };
    $('m-cmp-clear').onclick = () => {
      local.compared = new Set();
      renderList(true);
      renderLanes(true);
      updateHeaderCount();
    };
    $('m-list').onclick = (event) => {
      const inspect = event.target.closest('[data-inspect]');
      if (inspect) { event.stopPropagation(); ctx.inspect?.(inspect.dataset.inspect); return; }
      const chk = event.target.closest('.site-chk');
      if (chk) {
        event.stopPropagation();
        const id = chk.dataset.chk;
        if (chk.checked) local.compared.add(id);
        else local.compared.delete(id);
        renderLanes(true);
        updateHeaderCount();
        return;
      }
      if (event.target.closest('.srow-chk')) return;
      const row = event.target.closest('[data-id]'); if (!row) return;
      const same = local.picked === row.dataset.id;
      local.picked = row.dataset.id;
      local.open = same && local.open === row.dataset.id ? null : row.dataset.id;
      refresh(true);
      focusSite();
    };
    $('m-list').onchange = (event) => {
      const chk = event.target.closest('.site-chk');
      if (!chk) return;
      const id = chk.dataset.chk;
      if (chk.checked) local.compared.add(id);
      else local.compared.delete(id);
      renderLanes(true);
      updateHeaderCount();
    };
    $('m-lanes').onclick = (event) => {
      if (event.target.closest('#m-export')) { exportComparedCsv(); return; }
      const svg = event.target.closest('svg'); if (!svg) return;
      const box = svg.getBoundingClientRect();
      local.hour = clamp(Math.round(((event.clientX - box.left) / box.width) * SPAN), 0, SPAN);
      refresh();
    };
    bind2d($('m-2d'));
  }

  function setDate(ms) {
    local.hour = 0;
    ctx.setLanding(ms);
  }
  function renderDate() {
    const range = ctx.range(), input = $('m-date');
    input.min = new Date(range.min).toISOString().slice(0, 10);
    input.max = new Date(range.max).toISOString().slice(0, 10);
    input.value = new Date(ctx.landing()).toISOString().slice(0, 10);
    $('m-prev').disabled = ctx.landing() <= range.min;
    $('m-next').disabled = ctx.landing() >= range.max;
  }

  function updateHeaderCount() {
    $('m-ph').innerHTML = `${escapeHtml(t('Site locations'))} <span class="pill2">${local.compared ? local.compared.size : 0} ${escapeHtml(t('compared'))}</span>`;
  }

  function setStaticText() {
    $('m-datelabel').textContent = t('Landing date (UTC)');
    $('m-today').textContent = t('Today');
    $('m-prev').setAttribute('aria-label', t('Previous day'));
    $('m-next').setAttribute('aria-label', t('Next day'));
    $('m-title').textContent = t('Pick a landing site');
    $('m-hint').textContent = t(isEducation()
      ? (local.mode === '3d' ? 'Drag to turn the Moon. Tap a dot to pick a site.' : 'Tap a dot to pick a site. Dark is night.')
      : local.mode === '3d' ? 'Drag to rotate, scroll to zoom. Not to scale. Cyan ring: the Moon’s orbit around Earth; amber: Earth’s orbit around the Sun. Cyan line: 75°S, where the terrain model ends.' : local.flat === 'pole' ? 'LOLA relief, 75°S to the pole. Drag to pan, scroll to zoom. Dark is night.' : 'Whole Moon, near side in the centre. Drag to pan, scroll to zoom. Dark is night.');
    const [fp, fm] = $('m-flat').children;
    fp.textContent = t('South pole'); fm.textContent = t('Whole Moon');
    fp.classList.toggle('on', local.flat === 'pole'); fm.classList.toggle('on', local.flat === 'moon');
    $('m-flat').hidden = local.mode !== '2d'; $('m-zoom').hidden = local.mode !== '2d';
    $('m-readout').hidden = local.mode !== '3d';
    if (local.mode !== '2d') $('m-note').hidden = true;
    const [b3, b2] = $('m-seg').children;
    b3.textContent = t('3D'); b2.textContent = t('2D');
    b3.classList.toggle('on', local.mode === '3d'); b2.classList.toggle('on', local.mode === '2d');
    b3.disabled = view3dFailed;
    $('m-hist').innerHTML = `<img src="assets/historic-flag.svg" alt=""><span class="hswitch-label">${escapeHtml(t('Historic sites'))}</span><span class="hswitch-track" aria-hidden="true"><span class="hswitch-knob"></span></span>`;
    $('m-hist').title = t('Show historic landing sites');
    $('m-hist').setAttribute('aria-checked', String(local.historic));
    historic?.relabel();
    $('m-reset').textContent = t('Reset view');
    $('m-reset').hidden = local.mode !== '3d';
    $('m-legend').innerHTML = `<span><i style="background:${COLORS.link}"></i>${escapeHtml(t('Earth link available'))}</span><span><i style="background:${COLORS.sun}"></i>${escapeHtml(t('Sunlit, no Earth link'))}</span><span><i style="background:${COLORS.dark}"></i>${escapeHtml(t('In shadow'))}</span>`;
    $('m-cmp-all').textContent = t('All');
    $('m-cmp-all').title = t('Select all sites to compare');
    $('m-cmp-clear').textContent = t('Clear');
    $('m-cmp-clear').title = t('Clear comparison selection');
    updateHeaderCount();
    $('m-search').placeholder = t('Search sites');
    $('m-search').setAttribute('aria-label', t('Search sites'));
    $('m-send').textContent = `${t('Send probe')} →`;
    $('m-play').textContent = `${local.timer ? '❚❚' : '▶'} ${t(local.timer ? 'Pause' : 'Play')}`;
  }

  /* ---------- site list and lanes ---------- */

  // Multi-criteria evaluation over the stay (simultaneous window, longest sun, eclipse survival, terrain horizon).
  function scoreOf(site) {
    const start = Math.round(ctx.eph().indexOf(ctx.landing())), margin = ctx.margin();
    const cond = ctx.conditions?.();
    return evaluateSiteMcda(site, start, start + SPAN + 1, {
      marginDeg: margin,
      preset: 'balanced',
      minSunDays: (cond?.requiredSunH ?? 156) / 24,
      needLinkAtTouchdown: cond?.requireEarthAtTouchdown ?? true,
    });
  }

  function detailsHtml(site, f) {
    const series = site.series, status = f.status.get(site.id), j = f.j;
    const sunNext = nextTransition(site, 'sun', f.index);
    let sunLine;
    if (sunNext.kind === 'none') sunLine = [t('Sun'), t(sunNext.state ? 'Stays in view' : 'Does not rise')];
    else sunLine = [t('{event} in', { event: t(sunNext.kind === 'set' ? 'Sunset' : 'Sunrise') }), dur(sunNext.timeMs - f.ms)];
    const earthNext = nextTransition(site, 'earth', f.index);
    // Geometric Earthset uses the terrain horizon only. The link margin is a separate, stricter event.
    const geometric = earthNext.kind === 'none'
      ? [t('Geometric horizon'), t(earthNext.state ? 'Stays above the terrain' : 'Stays below the terrain')]
      : [t('{event} in', { event: t(earthNext.kind === 'set' ? 'Geometric Earthset' : 'Geometric Earthrise') }), dur(earthNext.timeMs - f.ms)];
    const marginNext = nextMarginTransition(site, ctx.margin(), f.index);
    const marginName = t('Link margin {margin}°', { margin: ctx.margin() });
    const marginLine = marginNext.kind === 'none'
      ? [marginName, t(marginNext.state ? 'Stays above the margin' : 'Stays below the margin')]
      : [marginName, `${t(marginNext.state ? 'Closes in' : 'Opens in')} ${dur(marginNext.timeMs - f.ms)}`];
    const score = scoreOf(site), bothPct = Math.round(score.bothPct);
    const litPct = Math.round(score.litPct), linkPct = Math.round(score.linkPct);
    const rows = [
      [t('MCDA score'), `${score.score} / 100`],
      [t('Link at touchdown'), t(score.touchdownLink ? 'Available' : 'Blocked at touchdown')],
      [t('Simultaneous window'), `${score.both} h / ${score.hours} h (${bothPct}%)`],
      [t('Total sunlight'), `${score.lit} h (${litPct}%)`],
      [t('Longest sunlit run'), `${score.longestSunH} h`],
      [t('Longest darkness'), `${score.longestDarkH} h`],
      [t('Total Earth link'), `${score.link} h (${linkPct}%)`],
      [t('Sun elevation'), fmtDeg(series.sunEl[j])],
      sunLine,
      [t('Earth elevation'), fmtDeg(series.earthEl[j])],
      [t('Direct-to-Earth link'), t(status.link ? 'Available' : 'Blocked')],
      geometric,
      marginLine,
    ];
    return rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b>`).join('')
      + `<div class="det-actions"><button type="button" class="btn-ghost btn-xs" data-inspect="${escapeHtml(site.id)}">${escapeHtml(t('Inspect in Explore'))}</button></div>`;
  }

  // Education mode: one plain phrase for the current sky, in place of hours, coordinates and terrain.
  const plainStatus = (status) => t(status.sun && status.link ? 'Sun and Earth in view' : status.link ? 'Earth in view, no Sun' : status.sun ? 'Sunlit, no Earth link' : 'In shadow');
  function renderList(force) {
  // A site has a terrain model when its horizon was computed from LOLA, not from a smooth sphere.
  const hasModel = (site) => Boolean(site.terrain && site.terrain !== 'none');

    const f = lastFrame ?? frame();
    const edu = isEducation();
    const key = [local.probe, local.picked, local.open, local.query, getLanguage(), ctx.margin(), ctx.landing(), sites().length, Array.from(local.compared).sort().join(','), edu].join('|');
    const listEl = $('m-list');
    if (force || key !== local.listKey) {
      local.listKey = key;
      const rows = orderedSites()
        .filter((site) => !local.query || `${site.label} ${site.short}`.toLowerCase().includes(local.query))
        .map((site) => ({ site, score: scoreOf(site) }))
        .sort((a, b) =>
          (Number(hasModel(b.site)) - Number(hasModel(a.site))) ||
          (Number(b.score.viable) - Number(a.score.viable)) ||
          (b.score.score - a.score.score) ||
          (b.score.both - a.score.both));
      let viableRank = 0;
      listEl.innerHTML = rows.length ? rows.map(({ site, score }) => {
        const open = local.open === site.id;
        const isCompared = local.compared.has(site.id);
        const hasTerr = hasModel(site);
        if (hasTerr && score.viable) viableRank++;
        const terrain = !hasTerr ? t('Reference (smooth sphere)') : site.terrain;
        const badge = hasTerr && score.viable && viableRank <= 3 ? `<span class="badge">${escapeHtml(t('Recommended'))}</span>` : '';
        return `<div class="srow${site.id === local.picked ? ' on' : ''}${open ? ' open' : ''}" data-row="${escapeHtml(site.id)}">
          <div class="srow-top">
            <label class="srow-chk" title="${escapeHtml(t('Include in comparison'))}">
              <input type="checkbox" class="site-chk" data-chk="${escapeHtml(site.id)}" ${isCompared ? 'checked' : ''} aria-label="${escapeHtml(t('Compare {name}', { name: site.label }))}">
            </label>
            <button data-id="${escapeHtml(site.id)}" aria-expanded="${open}">
              <span class="dotc" title="${escapeHtml(t('Current state (sky)'))}"></span>
              <span style="flex:1;min-width:0">
                <span class="srow-title">
                  <span class="nm">${escapeHtml(site.label)}</span>
                  ${badge}
                </span>
                <span class="sub2">${edu ? escapeHtml(plainStatus(f.status.get(site.id))) : `${escapeHtml(t('{score}/100 MCDA', { score: score.score }))} · ${escapeHtml(t('{n} h lit and linked', { n: score.both }))} (${Math.round(score.bothPct)}%) · ${escapeHtml(fmtLatLon(site.lat, site.lon))} · ${escapeHtml(terrain)}`}</span>
              </span>
              <span class="chev">⌄</span>
            </button>
          </div>
          <div class="det">${open ? detailsHtml(site, f) : ''}</div>
        </div>`;
      }).join('') : `<div class="empty">${escapeHtml(t('No site matches that search.'))}</div>`;
    }
    for (const row of listEl.querySelectorAll('[data-row]')) {
      const site = sites().find((s) => s.id === row.dataset.row); if (!site) continue;
      row.querySelector('.dotc').style.background = colorOf(f.status.get(site.id));
      if (edu) row.querySelector('.sub2').textContent = plainStatus(f.status.get(site.id));
      if (row.classList.contains('open')) row.querySelector('.det').innerHTML = detailsHtml(site, f);
    }
  }

  function laneSites() {
    const highlighted = ctx.eduHighlight?.()?.id ?? null; // Education mode always shows the site it is talking about
    return orderedSites().filter((s) => local.compared?.has(s.id) || s.id === highlighted);
  }
  function runsOf(test, site) {
    const start = Math.round(ctx.eph().indexOf(ctx.landing()));
    const out = [];
    let from = -1;
    for (let h = 0; h <= SPAN + 1; h++) {
      const on = h <= SPAN && test(site, start + h);
      if (on && from < 0) from = h;
      if (!on && from >= 0) { out.push([from, h]); from = -1; }
    }
    return out;
  }
  function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }
  function exportComparedCsv() {
    const activeSites = laneSites();
    if (!activeSites.length) return;

    const startMs = ctx.landing();
    const startIndex = Math.round(ctx.eph().indexOf(startMs));
    const margin = ctx.margin();
    const headers = [
      'site_id', 'site_name', 'site_group', 'latitude_deg', 'longitude_deg_east', 'terrain', 'ground_elevation_m',
      'landing_start_utc', 'sample_time_utc', 'hours_since_landing',
      'sun_visible', 'earth_link_available', 'sun_and_earth_available',
      'sun_elevation_deg', 'sun_clearance_above_terrain_deg', 'earth_elevation_deg', 'earth_clearance_above_terrain_deg',
      'sunlight_hours_over_stay', 'sunlight_percent_over_stay',
      'earth_link_hours_over_stay', 'earth_link_percent_over_stay',
      'simultaneous_hours_over_stay', 'simultaneous_percent_over_stay', 'earth_link_margin_deg',
    ];
    const lines = [`${headers.map(csvCell).join(',')}\r\n`];
    for (const site of activeSites) {
      const score = scoreOf(site);
      const series = site.series;
      const summary = [score.lit, Math.round(score.lit / score.hours * 100), score.link,
        Math.round(score.link / score.hours * 100), score.both, Math.round(score.both / score.hours * 100)];
      for (let h = 0; h <= SPAN; h++) {
        const index = startIndex + h;
        const sunVisible = series.sunVis[index] === 1;
        const earthLink = series.earthClr[index] > margin;
        lines.push(`${[
          site.id, site.label ?? site.name ?? site.id, site.group ?? '', site.lat, site.lon,
          site.terrain === 'none' ? '' : site.terrain, site.groundM,
          new Date(startMs).toISOString(), new Date(startMs + h * HOUR).toISOString(), h,
          sunVisible, earthLink, sunVisible && earthLink,
          Number(series.sunEl[index].toFixed(4)), Number(series.sunClr[index].toFixed(4)),
          Number(series.earthEl[index].toFixed(4)), Number(series.earthClr[index].toFixed(4)),
          ...summary, margin,
        ].map(csvCell).join(',')}\r\n`);
      }
    }

    const csv = new Blob(['\uFEFF', ...lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(csv);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lunalens-comparison-${new Date(startMs).toISOString().slice(0, 10)}-${activeSites.length}-sites.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderLanes(force) {
    const hl = ctx.eduHighlight?.() ?? null;
    const key = [local.probe, local.picked, getLanguage(), ctx.margin(), ctx.landing(), sites().length, Array.from(local.compared).sort().join(','), JSON.stringify(hl)].join('|');
    const el = $('m-lanes');
    if (force || key !== local.laneKey) {
      local.laneKey = key;
      const rect = (runs, y, color) => runs.map(([a, b]) => `<rect x="${a}" y="${y}" width="${b - a}" height="14" rx="2" fill="${color}"/>`).join('');
      const days = (SPAN / 24).toFixed(0);
      const activeSites = laneSites();
      const lanes = activeSites.length ? activeSites.map((site) => {
        const sun = runsOf((s, i) => s.series.sunVis[i] === 1, site);
        const link = runsOf((s, i) => s.series.earthClr[i] > ctx.margin(), site);
        const both = runsOf((s, i) => s.series.sunVis[i] === 1 && s.series.earthClr[i] > ctx.margin(), site);
        const score = scoreOf(site);
        return `<div class="lane-site">
          <div class="nm" title="${escapeHtml(site.label)}">
            <div style="display:flex;align-items:center;gap:6px">
              <span>${escapeHtml(site.short)}</span>
            </div>
            <div class="lane-meta" style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:2px">${score.both}h ${t('both')} (${Math.round((score.both / score.hours) * 100)}%)</div>
          </div>
          <svg viewBox="0 0 ${SPAN} 54" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(site.label)}">
            <rect x="0" y="0" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/><rect x="0" y="20" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/><rect x="0" y="40" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/>
            ${rect(sun, 0, COLORS.sun)}${rect(link, 20, COLORS.link)}${rect(both, 40, COLORS.both)}
            ${hl && hl.id === site.id ? `<rect class="edu-hl" x="${hl.from}" y="-1" width="${Math.max(1, hl.to - hl.from)}" height="56" rx="3" fill="rgba(255,107,107,.18)" stroke="#ff6b6b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : ''}
            <line class="cur" x1="0" x2="0" y1="0" y2="54" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
          </svg>
        </div>`;
      }).join('') : `<div class="empty" style="text-align:center;padding:18px;color:var(--muted);font-size:13px">${escapeHtml(t('No sites selected for comparison. Tick checkboxes in Site locations to compare.'))}</div>`;

      el.innerHTML = `<div class="lane-axis">
        <span></span>
        <div class="lane-legend">
          <button type="button" class="btn-ghost btn-xs lane-export" id="m-export" ${activeSites.length ? '' : 'disabled'}>${escapeHtml(t('Export CSV'))}</button>
          <span style="color:${COLORS.sun}">■ ${escapeHtml(t('Sun'))}</span>
          <span style="color:${COLORS.link}">■ ${escapeHtml(t('Earth link'))}</span>
          <span style="color:${COLORS.both}">■ ${escapeHtml(t('Both'))}</span>
          <span style="margin-left:auto">${escapeHtml(t('Sun and Earth over the next {days} days', { days }))} <span class="pill2">${activeSites.length} ${escapeHtml(t('compared'))}</span></span>
        </div>
      </div>
      ${lanes}
      <div class="lane-axis">
        <span></span>
        <div>
          <span>${escapeHtml(fmtDayMonth(ctx.landing()))}</span>
          <span>${escapeHtml(fmtDayMonth(ctx.landing() + (SPAN / 2) * HOUR))}</span>
          <span>${escapeHtml(fmtDayMonth(ctx.landing() + SPAN * HOUR))}</span>
        </div>
      </div>`;
    }
    for (const line of el.querySelectorAll('.cur')) { line.setAttribute('x1', local.hour); line.setAttribute('x2', local.hour); }
  }
  function renderTime() {
    $('m-time').value = local.hour;
    $('m-when').textContent = fmtDateTime(ctx.landing() + local.hour * HOUR);
  }
  function togglePlay() {
    if (local.timer) { clearInterval(local.timer); local.timer = null; } else {
      local.timer = setInterval(() => { local.hour = local.hour >= SPAN ? 0 : Math.min(SPAN, local.hour + 3); refresh(); }, 90);
    }
    setStaticText();
  }
  function stopPlay() { if (local.timer) { clearInterval(local.timer); local.timer = null; } }

  /* ---------- 3D ---------- */

  async function create3d() {
    if (view3d || view3dLoading || view3dFailed) return;
    view3dLoading = true;
    view3d = await createPolar3d({
      $, view, local, sites, pickedSite, labelText, colorOf, refresh, ctx, t, escapeHtml, fmtLatLon,
      unit, dot3, clamp, COLORS,
      getFrame: () => lastFrame,
      setFailed: (value) => { view3dFailed = value; },
      onFrame: () => historic?.place(),
    });
    view3dLoading = false;
    refresh(true);
  }
  /* ---------- 2D ---------- */

  const POLE_KM = 457.44, MOON_KM = 1737.4, POLE_N = 768, MOON_W = 1024, MOON_H = 512;
  const view2d = { z: 1, x: 0, y: 0 };
  let poleTable = null, moonTable = null, hits2d = [], hoverId = null, layout2d = null;
  const poleCanvas = document.createElement('canvas'), moonCanvas = document.createElement('canvas');
  poleCanvas.width = poleCanvas.height = POLE_N; moonCanvas.width = MOON_W; moonCanvas.height = MOON_H;
  const tabled = { pole: false, moon: false };

  function loadImages() {
    if (!tabled.pole) {
      tabled.pole = true;
      const image = new Image();
      image.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = POLE_N;
        const g = c.getContext('2d'); g.drawImage(image, 0, 0, POLE_N, POLE_N);
        const data = g.getImageData(0, 0, POLE_N, POLE_N).data, n = POLE_N * POLE_N;
        const gray = new Uint8Array(n), nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n);
        for (let py = 0; py < POLE_N; py++) {
          const yUp = (1 - ((py + 0.5) / POLE_N) * 2) * POLE_KM;
          for (let px = 0; px < POLE_N; px++) {
            const x = (((px + 0.5) / POLE_N) * 2 - 1) * POLE_KM, i = py * POLE_N + px;
            const lat = -Math.PI / 2 + 2 * Math.atan(Math.hypot(x, yUp) / (2 * MOON_KM)), lon = Math.atan2(x, yUp);
            gray[i] = data[i * 4]; nx[i] = Math.cos(lat) * Math.cos(lon); ny[i] = Math.sin(lat); nz[i] = -Math.cos(lat) * Math.sin(lon);
          }
        }
        poleTable = { gray, nx, ny, nz };
        refresh();
      };
      image.src = 'data/polar-hillshade.webp';
    }
    if (!tabled.moon) {
      tabled.moon = true;
      const image = new Image();
      image.onload = () => {
        const c = document.createElement('canvas'); c.width = MOON_W; c.height = MOON_H;
        const g = c.getContext('2d'); g.drawImage(image, 0, 0, MOON_W, MOON_H);
        const sinLat = new Float32Array(MOON_H), cosLat = new Float32Array(MOON_H);
        for (let y = 0; y < MOON_H; y++) { const lat = (0.5 - (y + 0.5) / MOON_H) * Math.PI; sinLat[y] = Math.sin(lat); cosLat[y] = Math.cos(lat); }
        moonTable = { src: g.getImageData(0, 0, MOON_W, MOON_H).data, sinLat, cosLat };
        refresh();
      };
      image.src = 'assets/moon_1024.jpg';
    }
  }
  function shadePole(f) {
    const { gray, nx, ny, nz } = poleTable, g = poleCanvas.getContext('2d'), img = g.createImageData(POLE_N, POLE_N), out = img.data;
    const s0 = f.sun[0], s1 = f.sun[1], s2 = f.sun[2];
    for (let i = 0, n = POLE_N * POLE_N; i < n; i++) {
      const lit = nx[i] * s0 + ny[i] * s1 + nz[i] * s2, ramp = clamp((lit + 0.008) / 0.03, 0, 1);
      const v = gray[i] * (0.2 + 0.8 * ramp), o = i * 4;
      out[o] = v * (0.9 + 0.1 * ramp); out[o + 1] = v * (0.93 + 0.05 * ramp); out[o + 2] = v * (1.1 - 0.16 * ramp); out[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  function shadeMoon(f) {
    const { src, sinLat, cosLat } = moonTable, g = moonCanvas.getContext('2d'), img = g.createImageData(MOON_W, MOON_H), out = img.data;
    const sLat = Math.sin(f.sunLat * D2R), cLat = Math.cos(f.sunLat * D2R), cosLon = new Float32Array(MOON_W);
    for (let x = 0; x < MOON_W; x++) cosLon[x] = Math.cos(((x + 0.5) / MOON_W * 360 - 180 - f.sunLon) * D2R);
    for (let y = 0, o = 0; y < MOON_H; y++) {
      const a = sinLat[y] * sLat, b = cosLat[y] * cLat;
      for (let x = 0; x < MOON_W; x++, o += 4) {
        const ramp = clamp((a + b * cosLon[x] + 0.04) / 0.14, 0, 1), k = 0.2 + 0.8 * ramp;
        out[o] = src[o] * k * (0.9 + 0.1 * ramp); out[o + 1] = src[o + 1] * k * (0.93 + 0.05 * ramp); out[o + 2] = src[o + 2] * k * (1.1 - 0.16 * ramp); out[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }
  function labelText(site) {
    const status = lastFrame.status.get(site.id);
    return `${site.short} · ${t(status.link ? (status.sun ? 'Sunlit as well' : 'Earth link available') : status.sun ? 'Sunlit, no Earth link' : 'In shadow')}`;
  }
  const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
  // Where the 2D map sits in the stage: the same numbers for drawing and for centring a point.
  function geometry2d() {
    const stage = $('m-stage'), w = stage.clientWidth, h = stage.clientHeight, pole = local.flat === 'pole';
    const size = pole ? Math.max(120, Math.min(w - 40, h - 90)) : Math.max(160, Math.min(w - 40, (h - 110) * 2));
    return { w, h, baseX: w / 2, baseY: h / 2 + 34, size, pole };
  }
  function draw2d() {
    const canvas = $('m-2d'), stage = $('m-stage');
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h || !lastFrame) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const f = lastFrame, pole = local.flat === 'pole', table = pole ? poleTable : moonTable;
    $('m-label').style.display = 'none'; hits2d = [];
    if (!table) { loadImages(); return; }
    const { baseX, baseY, size } = geometry2d();
    const cx = baseX + view2d.x, cy = baseY + view2d.y, z = view2d.z;
    layout2d = { baseX, baseY };
    let place, kmPx = 0;
    if (pole) {
      shadePole(f);
      kmPx = (size * z) / (2 * POLE_KM);
      g.imageSmoothingQuality = 'high';
      g.drawImage(poleCanvas, cx - (size * z) / 2, cy - (size * z) / 2, size * z, size * z);
      place = (lat, lon) => { const r = 2 * MOON_KM * Math.tan(((90 + lat) * D2R) / 2); return [cx + r * Math.sin(lon * D2R) * kmPx, cy - r * Math.cos(lon * D2R) * kmPx, lat < -75]; };
      g.save(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.fillStyle = 'rgba(255,255,255,.72)'; g.lineWidth = 1; g.font = '12px "Geist Mono", ui-monospace, monospace';
      for (const lat of [-80, -85]) { const r = 2 * MOON_KM * Math.tan(((90 + lat) * D2R) / 2) * kmPx; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke(); g.textAlign = 'left'; g.fillText(`${-lat}°S`, cx + 6, cy - r - 4); }
      const edge = POLE_KM * kmPx;
      g.beginPath(); g.moveTo(cx, cy - edge); g.lineTo(cx, cy + edge); g.moveTo(cx - edge, cy); g.lineTo(cx + edge, cy); g.stroke();
      g.textAlign = 'center'; g.fillText('0°', cx, cy - edge + 16); g.fillText('180°', cx, cy + edge - 34);
      g.textAlign = 'right'; g.fillText(`90°${t('E')}`, cx + edge - 8, cy - 6); g.textAlign = 'left'; g.fillText(`270°${t('E')}`, cx - edge + 8, cy - 6);
      g.restore();
      for (const [lon, color, key] of [[f.earthLon, '#5aa2ff', 'to Earth'], [f.sunLon, COLORS.sun, 'to Sun']]) {
        const r = POLE_KM * 0.84 * kmPx, x = cx + r * Math.sin(lon * D2R), y = cy - r * Math.cos(lon * D2R);
        const glow = g.createRadialGradient(x, y, 0, x, y, 22); glow.addColorStop(0, color); glow.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.45; g.fillStyle = glow; g.beginPath(); g.arc(x, y, 22, 0, 6.2832); g.fill(); g.globalAlpha = 1;
        g.fillStyle = color; g.beginPath(); g.arc(x, y, 7, 0, 6.2832); g.fill();
        g.fillStyle = '#fff'; g.font = '12px Geist, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(t(key), x, y + 24);
      }
      g.save(); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 2; g.font = '12px "Geist Mono", ui-monospace, monospace';
      const bar = 100 * kmPx, bx = w / 2 - bar / 2; g.beginPath(); g.moveTo(bx, h - 18); g.lineTo(bx + bar, h - 18); g.stroke(); g.textAlign = 'center'; g.fillText('100 km', w / 2, h - 26); g.restore();
    } else {
      shadeMoon(f);
      const width = size * z, height = width / 2;
      g.imageSmoothingQuality = 'high';
      g.drawImage(moonCanvas, cx - width / 2, cy - height / 2, width, height);
      place = (lat, lon) => [cx + (wrapLon(lon) / 360) * width, cy - (lat / 180) * height, true];
      g.save(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1;
      for (let lon = -150; lon <= 150; lon += 30) { const x = cx + (lon / 360) * width; g.beginPath(); g.moveTo(x, cy - height / 2); g.lineTo(x, cy + height / 2); g.stroke(); }
      for (let lat = -60; lat <= 60; lat += 30) { const y = cy - (lat / 180) * height; g.beginPath(); g.moveTo(cx - width / 2, y); g.lineTo(cx + width / 2, y); g.stroke(); }
      g.restore();
      for (const [lat, lon, color, key] of [[f.earthLat, f.earthLon, '#5aa2ff', 'to Earth'], [f.sunLat, f.sunLon, COLORS.sun, 'to Sun']]) {
        const [x, y] = place(lat, lon);
        const glow = g.createRadialGradient(x, y, 0, x, y, 22); glow.addColorStop(0, color); glow.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.45; g.fillStyle = glow; g.beginPath(); g.arc(x, y, 22, 0, 6.2832); g.fill(); g.globalAlpha = 1;
        g.fillStyle = color; g.beginPath(); g.arc(x, y, 7, 0, 6.2832); g.fill();
        g.fillStyle = '#fff'; g.font = '12px Geist, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(t(key), x, y + 24);
      }
    }
    const chosen = pickedSite();
    for (const site of sites()) {
      const [x, y, inside] = place(site.lat, site.lon);
      if (!inside) continue;
      const status = f.status.get(site.id), selected = site === chosen;
      hits2d.push({ site, x, y });
      if (status.link && status.sun) { g.strokeStyle = COLORS.sun; g.lineWidth = 2; g.beginPath(); g.arc(x, y, selected ? 11 : 8.5, 0, 6.2832); g.stroke(); }
      g.fillStyle = colorOf(status); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1;
      g.beginPath(); g.arc(x, y, selected ? 7 : 5.2, 0, 6.2832); g.fill(); g.stroke();
      if (selected) { g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 13, 0, 6.2832); g.stroke(); }
    }
    const found = hits2d.find((hit) => hit.site === chosen), label = $('m-label');
    if (found) { label.style.display = 'block'; label.style.left = `${found.x}px`; label.style.top = `${found.y - 8}px`; label.textContent = labelText(chosen); }
    const hovered = hits2d.find((hit) => hit.site.id === hoverId && hit.site !== chosen);
    if (hovered) {
      const text = labelText(hovered.site);
      g.font = '12px Geist, system-ui, sans-serif'; const tw = g.measureText(text).width + 16;
      g.fillStyle = 'rgba(8,7,16,.88)'; g.strokeStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(hovered.x - tw / 2, hovered.y - 40, tw, 26, 8); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, hovered.x, hovered.y - 23);
    }
    const outside = pole ? sites().filter((s) => s.lat >= -75).length : 0, note = $('m-note');
    note.hidden = !outside;
    if (outside) note.textContent = t('{count} sites lie north of this map. Switch to Whole Moon.', { count: outside });
    project2d = (lat, lon) => { const [px, py, inside] = place(lat, lon); return { x: px, y: py, visible: inside, scale: Math.sqrt(z) }; };
    historic?.place();
  }
  function syncHistoric() { historic?.setOn(isEducation() && local.historic && view() === 'mission'); }
  function bind2d(canvas) {
    let drag = null;
    const nearest = (x, y) => { let best = null, bestDistance = 16; for (const hit of hits2d) { const d = Math.hypot(hit.x - x, hit.y - y); if (d < bestDistance) { best = hit; bestDistance = d; } } return best; };
    canvas.addEventListener('pointerdown', (event) => { canvas.setPointerCapture(event.pointerId); drag = { x: event.clientX, y: event.clientY, vx: view2d.x, vy: view2d.y, moved: false }; });
    canvas.addEventListener('pointermove', (event) => {
      const box = canvas.getBoundingClientRect();
      if (drag) {
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) > 4) drag.moved = true;
        if (drag.moved) { view2d.x = drag.vx + dx; view2d.y = drag.vy + dy; draw2d(); }
        return;
      }
      const hit = nearest(event.clientX - box.left, event.clientY - box.top), id = hit ? hit.site.id : null;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
      if (id !== hoverId) { hoverId = id; draw2d(); }
    });
    canvas.addEventListener('pointerup', (event) => {
      const moved = drag?.moved; drag = null;
      if (moved) return;
      const box = canvas.getBoundingClientRect(), hit = nearest(event.clientX - box.left, event.clientY - box.top);
      if (hit) { local.picked = hit.site.id; refresh(true); }
    });
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      zoomAt(event.clientX - box.left, event.clientY - box.top, event.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });
  }
  function zoomAt(x, y, factor) {
    if (!layout2d) return;
    const next = clamp(view2d.z * factor, 1, 12), ratio = next / view2d.z;
    const relX = x - layout2d.baseX - view2d.x, relY = y - layout2d.baseY - view2d.y;
    view2d.x = x - layout2d.baseX - relX * ratio; view2d.y = y - layout2d.baseY - relY * ratio; view2d.z = next;
    if (next === 1) { view2d.x = 0; view2d.y = 0; }
    draw2d();
  }
  function setFlat(kind) {
    historic?.close(false);
    local.flat = kind; view2d.z = 1; view2d.x = 0; view2d.y = 0; hoverId = null;
    refresh(true);
  }

  /* ---------- flow ---------- */

  function setMode(mode) {
    if (mode === '3d' && view3dFailed) return;
    historic?.close(false);
    local.mode = mode;
    $('m-3d').hidden = mode !== '3d'; $('m-2d').hidden = mode !== '2d';
    $('m-label').style.display = 'none';
    if (mode === '3d') create3d();
    refresh(true);
  }
  function focusSite() { if (local.mode === '3d' && view3d) view3d.focus(pickedSite()); }
  function refresh(full) {
    if (view() !== 'mission' || !$('m-stage')) return;
    const chosenSite = pickedSite();
    if (full && local.mode === '2d' && local.flat === 'pole' && chosenSite && chosenSite.lat >= -75 && local.autoPick !== local.picked) { local.autoPick = local.picked; local.flat = 'moon'; view2d.z = 1; view2d.x = 0; view2d.y = 0; }
    lastFrame = frame();
    if (full) setStaticText();
    syncHistoric();
    $('m-3d').hidden = local.mode !== '3d'; $('m-2d').hidden = local.mode !== '2d';
    renderTime();
    renderDate();
    renderList(full);
    renderLanes(full);
    renderScenario();
    if (local.mode === '3d') { create3d(); view3d?.request(); } else draw2d();
    ctx.onMissionRefresh?.(chosenSite, lastFrame, local.hour);
  }

  // The two countdowns that decide a stay, for the picked site, and the way into the map page.
  function renderScenario() {
    const el = $('m-scenario'); const f = lastFrame;
    const site = pickedSite();
    if (!el || !site || !f) return;
    const label = (next, setKey, riseWord) => next.kind === 'none'
      ? escapeHtml(t(next.state ? 'Stays in view' : 'None in this stay'))
      : next.kind === 'set' ? `${escapeHtml(t(setKey))} ${escapeHtml(dur(next.timeMs - f.ms))}`
        : `${escapeHtml(t(riseWord))} ${escapeHtml(dur(next.timeMs - f.ms))}`;
    const sunNext = nextTransition(site, 'sun', f.index);
    const earthNext = nextTransition(site, 'earth', f.index);
    el.innerHTML = `<span><i class="dot sun"></i>${label(sunNext, 'Sunset in', 'Sunrise')}</span>`
      + `<span><i class="dot earth"></i>${label(earthNext, 'Earthset in', 'Earthrise')}</span>`;
  }

  function sendProbe() {
    if (flying) return;
    const site = pickedSite(); if (!site) return;
    stopPlay();
    flying = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const selected = PROBES.find(probe => probe.id === local.probe);
    flightEl.innerHTML = `<canvas class="flight-scene" aria-label="${escapeHtml(t(selected.name))}"></canvas>
      <div class="flight-top"><span>${escapeHtml(t(selected.name))}</span><button class="btn-ghost flight-skip">${escapeHtml(t('Exit flight'))}<span aria-hidden="true">↗</span></button></div>
      <div class="flight-caption"><p class="flight-phase" role="status">${escapeHtml(t('Preparing spacecraft…'))}</p>
        <h2>${escapeHtml(site.short)}</h2>
        <div class="flight-track" aria-hidden="true"><span class="flight-track-fill"></span></div>
        <div class="flight-route"><span>${escapeHtml(t('Leave Earth'))}</span><span>${escapeHtml(t('Touchdown'))}</span></div>
        <p class="flight-disclaimer">${escapeHtml(t('Illustrative flight · not to scale'))}</p></div>`;
    flightEl.classList.add('show');
    flightEl.setAttribute('role', 'dialog');
    flightEl.setAttribute('aria-modal', 'true');
    flightEl.setAttribute('aria-label', t('Probe on its way to {site}', { site: site.short }));
    requestAnimationFrame(() => flightEl.classList.add('in'));
    const skip = flightEl.querySelector('.flight-skip');
    const phase = flightEl.querySelector('.flight-phase');
    const fill = flightEl.querySelector('.flight-track-fill');
    const returnFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let done = false, disposeFlight, lastPhase = '';
    const finish = () => {
      if (done) return; done = true; flying = false;
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      flightEl.classList.remove('in');
      disposeFlight?.();
      setTimeout(() => {
        flightEl.classList.remove('show'); flightEl.innerHTML = '';
        if (document.activeElement === document.body || document.activeElement === skip) returnFocus?.focus();
      }, 240);
      ctx.arrive(sites().indexOf(site));
    };
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    flightEl.onclick = null;
    skip.onclick = finish;
    skip.focus();
    disposeFlight = playProbeFlight(flightEl.querySelector('canvas'), {
      probe: selected.id, site: { lat: site.lat, lon: site.lon }, reduced,
      onComplete: () => {
        phase.textContent = t('Landed · exit when you are ready');
      },
      onError: () => {
        phase.textContent = t('Model unavailable. Select another probe or continue.');
        disposeFlight?.();
      },
      onProgress: (progress, key) => {
        fill.style.transform = `scaleX(${progress})`;
        if (key !== lastPhase) { phase.textContent = t(key); lastPhase = key; }
      },
    });
  }

  startEl.addEventListener('click', (event) => {
    const card = event.target.closest('[data-probe]');
    if (card) {
      local.probe = card.dataset.probe; local.picked = null; local.open = null;
      local.compared = defaultCompared();
      for (const item of startEl.querySelectorAll('[data-probe-card]')) item.dataset.selected = String(item.dataset.probeCard === local.probe);
      for (const button of startEl.querySelectorAll('[data-probe]')) button.setAttribute('aria-pressed', String(button.dataset.probe === local.probe));
      ctx.onProbePick?.(local.probe);
      return;
    }
    if (event.target.closest('#validate')) goMission();
  });
  function goMission() {
    ctx.onValidate?.();
    local.picked = orderedSites()[0]?.id ?? null;
    local.open = null;
    local.hour = 0;
    if (!local.compared || local.compared.size === 0) local.compared = defaultCompared();
    local.flat = (pickedSite()?.lat ?? 0) < -75 ? 'pole' : 'moon'; view2d.z = 1; view2d.x = 0; view2d.y = 0;
    ctx.go('mission');
  }
  document.querySelector('.brand')?.addEventListener('click', () => ctx.go('start'));
  buildMission();
  $('m-3d').hidden = local.mode !== '3d'; $('m-2d').hidden = local.mode !== '2d';

  return {
    render() {
      const current = view();
      if (current !== 'mission') stopPlay();
      if (current === 'start') renderStart();
      if (current === 'mission') {
        if (!local.picked) local.picked = orderedSites()[0]?.id ?? null;
        refresh(true);
      }
    },
    // Small API for Education mode (views/edu): drive the same screens the buttons drive.
    validate: goMission,
    send: sendProbe,
    probe: () => local.probe,
    pick(id) { if (!sites().some((s) => s.id === id)) return; local.picked = id; local.open = null; refresh(true); focusSite(); },
    setHour(h) { local.hour = clamp(Math.round(h), 0, SPAN); refresh(); },
    redraw: () => refresh(true),
    flags: () => historic?.place(),
    openFlag: (id) => historic?.open(id),
  };
}
