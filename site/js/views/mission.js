import { t, getLanguage, registerMessages, hasTranslation } from '../i18n.js';
import { escapeHtml, fmtDeg, fmtLatLon, fmtDateTime, fmtDayMonth } from '../format.js';
import { nextTransition } from '../engine/metrics.js';

const D2R = Math.PI / 180, HOUR = 36e5, SPAN = 709;
const COLORS = { link: '#43d98a', sun: '#f5c542', dark: '#7d7993', both: '#9be7ff' };
const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R)];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const MESSAGES = {
  'Mission': ['Mission', 'Mission'],
  'See which lunar landing sites have sunlight and a direct line of sight to Earth, hour by hour. Pick a lander, choose a site, then send a probe.': ['Voyez quels sites d’alunissage reçoivent la lumière du Soleil et voient la Terre en direct, heure par heure. Choisissez un atterrisseur, un site, puis envoyez une sonde.', '逐小时查看哪些月面着陆点有阳光、又能直视地球。选择着陆器与地点，然后发射探测器。'],
  'Choose your probe': ['Choisissez votre sonde', '选择你的探测器'],
  'Validate': ['Valider', '确认'],
  'Apollo Lunar Module': ['Module lunaire Apollo', '阿波罗登月舱'],
  'Crewed landers, 1969–1972': ['Atterrisseurs habités, 1969–1972', '载人着陆器，1969–1972'],
  'Intuitive Machines IM-1 (2024) and IM-2 (2025)': ['Intuitive Machines IM-1 (2024) et IM-2 (2025)', 'Intuitive Machines IM-1（2024）与 IM-2（2025）'],
  'Chandrayaan-3 (2023)': ['Chandrayaan-3 (2023)', '月船三号（2023）'],
  'South polar candidates': ['Candidats du pôle Sud', '南极候选点'],
  'Rim crests and the Shackleton floor': ['Crêtes de cratères et fond de Shackleton', '环形山边缘与沙克尔顿坑底'],
  '1 site': ['1 site', '1 个地点'],
  '{count} sites': ['{count} sites', '{count} 个地点'],
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
  'Drag to rotate, scroll to zoom. Earth and Sun are not to scale.': ['Faites glisser pour tourner, molette pour zoomer. La Terre et le Soleil ne sont pas à l’échelle.', '拖动旋转，滚轮缩放。地球与太阳未按比例绘制。'],
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
  'Both': ['Les deux', '同时可见'],
  'min': ['min', '分钟'],
  'h': ['h', '小时'],
  'd': ['j', '天'],
  'Play': ['Lecture', '播放'],
  'Pause': ['Pause', '暂停'],
  'Sun and Earth over the next {days} days': ['Soleil et Terre sur les {days} prochains jours', '未来 {days} 天的太阳与地球可见情况'],
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
  { id: 'apollo', name: 'Apollo Lunar Module', meta: 'Crewed landers, 1969–1972', sites: ['apollo11', 'apollo12', 'apollo15', 'apollo16', 'apollo17'] },
  { id: 'novac', name: 'Nova-C', meta: 'Intuitive Machines IM-1 (2024) and IM-2 (2025)', sites: ['im1', 'im2'] },
  { id: 'vikram', name: 'Vikram', meta: 'Chandrayaan-3 (2023)', sites: ['ch3'] },
  { id: 'polar', name: 'South polar candidates', meta: 'Rim crests and the Shackleton floor', sites: ['shackleton-rim', 'degerlache-rim', 'nobile-rim', 'shackleton-floor'] },
];

export function createMission(ctx) {
  const $ = (id) => document.getElementById(id);
  const startEl = $('v-start'), missionEl = $('v-mission'), flightEl = $('flight');
  const local = { flat: 'pole', probe: 'novac', picked: null, mode: '3d', hour: 0, timer: null, open: null, query: '', listKey: '', laneKey: '' };
  let view3d = null, view3dLoading = false, view3dFailed = false, lastFrame = null, flying = false;

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
    return { ms, index, j, sun: unit(state[1], state[0]), earth: unit(state[4], state[3]), earthLat: state[4], earthLon: state[3], sunLat: state[1], sunLon: state[0], status };
  }

  /* ---------- start page ---------- */

  function renderStart() {
    const list = sites();
    startEl.innerHTML = `<div class="start"><div class="start-moon"></div>
      <h1>LunaLens</h1>
      <p class="lede">${escapeHtml(t('See which lunar landing sites have sunlight and a direct line of sight to Earth, hour by hour. Pick a lander, choose a site, then send a probe.'))}</p>
      <div class="pick">${escapeHtml(t('Choose your probe'))}</div>
      <div class="cards" role="radiogroup" aria-label="${escapeHtml(t('Choose your probe'))}">
        ${PROBES.map((p) => {
          const count = p.sites.filter((id) => list.some((s) => s.id === id)).length;
          return `<button class="pcard${p.id === local.probe ? ' on' : ''}" role="radio" aria-checked="${p.id === local.probe}" data-probe="${p.id}">
            <span class="tick">✓</span><span class="art">${ART[p.id]}</span>
            <b>${escapeHtml(t(p.name))}</b><span class="meta">${escapeHtml(t(p.meta))}</span>
            <span class="count">${escapeHtml(count === 1 ? t('1 site') : t('{count} sites', { count }))}</span></button>`;
        }).join('')}
      </div>
      <div class="go"><button class="btn-primary" id="validate">${escapeHtml(t('Validate'))}</button></div></div>`;
  }

  /* ---------- mission page skeleton ---------- */

  function buildMission() {
    missionEl.innerHTML = `<div class="mission">
      <div>
        <section class="glass datebar"><label for="m-date" id="m-datelabel"></label>
          <button class="btn-ghost" id="m-prev">‹</button><input type="date" id="m-date"><button class="btn-ghost" id="m-next">›</button><button class="btn-ghost" id="m-today"></button></section>
        <section class="glass stage" id="m-stage">
          <canvas id="m-3d" aria-label="3D Moon"></canvas><canvas id="m-2d" aria-label="2D Moon" hidden></canvas>
          <div class="overlay-tl"><div><h2 id="m-title"></h2><div class="hint" id="m-hint"></div><div class="mseg" id="m-flat" style="margin-top:10px"><button data-flat="pole"></button><button data-flat="moon"></button></div></div>
            <div style="display:flex;gap:8px;align-items:center"><button class="btn-ghost" id="m-reset"></button><div class="mseg" id="m-seg"><button data-mode="3d"></button><button data-mode="2d"></button></div></div></div>
          <div class="legend2" id="m-legend"></div><div class="note2" id="m-note" hidden></div><div class="zoom2" id="m-zoom"><button id="m-zout" aria-label="−">−</button><button id="m-zin" aria-label="+">+</button></div><div class="site-label" id="m-label"></div>
        </section>
        <section class="glass timebar"><button id="m-play"></button><input type="range" id="m-time" min="0" max="${SPAN}" step="1" value="0"><span class="when" id="m-when"></span></section>
        <section class="glass lanes" id="m-lanes"></section>
      </div>
      <aside class="glass side-panel"><h3 id="m-ph"></h3><input type="search" id="m-search" autocomplete="off"><div class="sl" id="m-list"></div>
        <button class="btn-primary" id="m-send"></button></aside>
    </div>`;
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
    $('m-list').onclick = (event) => {
      const row = event.target.closest('[data-id]'); if (!row) return;
      const same = local.picked === row.dataset.id;
      local.picked = row.dataset.id;
      local.open = same && local.open === row.dataset.id ? null : row.dataset.id;
      refresh(true);
      focusSite();
    };
    $('m-lanes').onclick = (event) => {
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

  function setStaticText() {
    $('m-datelabel').textContent = t('Landing date (UTC)');
    $('m-today').textContent = t('Today');
    $('m-prev').setAttribute('aria-label', t('Previous day'));
    $('m-next').setAttribute('aria-label', t('Next day'));
    $('m-title').textContent = t('Pick a landing site');
    $('m-hint').textContent = t(local.mode === '3d' ? 'Drag to rotate, scroll to zoom. Earth and Sun are not to scale.' : local.flat === 'pole' ? 'LOLA relief, 75°S to the pole. Drag to pan, scroll to zoom. Dark is night.' : 'Whole Moon, near side in the centre. Drag to pan, scroll to zoom. Dark is night.');
    const [fp, fm] = $('m-flat').children;
    fp.textContent = t('South pole'); fm.textContent = t('Whole Moon');
    fp.classList.toggle('on', local.flat === 'pole'); fm.classList.toggle('on', local.flat === 'moon');
    $('m-flat').hidden = local.mode !== '2d'; $('m-zoom').hidden = local.mode !== '2d';
    if (local.mode !== '2d') $('m-note').hidden = true;
    const [b3, b2] = $('m-seg').children;
    b3.textContent = t('3D'); b2.textContent = t('2D');
    b3.classList.toggle('on', local.mode === '3d'); b2.classList.toggle('on', local.mode === '2d');
    b3.disabled = view3dFailed;
    $('m-reset').textContent = t('Reset view');
    $('m-reset').hidden = local.mode !== '3d';
    $('m-legend').innerHTML = `<span><i style="background:${COLORS.link}"></i>${escapeHtml(t('Earth link available'))}</span><span><i style="background:${COLORS.sun}"></i>${escapeHtml(t('Sunlit, no Earth link'))}</span><span><i style="background:${COLORS.dark}"></i>${escapeHtml(t('In shadow'))}</span>`;
    $('m-ph').textContent = t('Site locations');
    $('m-search').placeholder = t('Search sites');
    $('m-search').setAttribute('aria-label', t('Search sites'));
    $('m-send').textContent = `${t('Send probe')} →`;
    $('m-play').textContent = `${local.timer ? '❚❚' : '▶'} ${t(local.timer ? 'Pause' : 'Play')}`;
  }

  /* ---------- site list and lanes ---------- */

  function detailsHtml(site, f) {
    const series = site.series, status = f.status.get(site.id), j = f.j;
    const sunNext = nextTransition(site, 'sun', f.index);
    let sunLine;
    if (sunNext.kind === 'none') sunLine = [t('Sun'), t(sunNext.state ? 'Stays in view' : 'Does not rise')];
    else sunLine = [t('{event} in', { event: t(sunNext.kind === 'set' ? 'Sunset' : 'Sunrise') }), dur(sunNext.timeMs - f.ms)];
    const rows = [
      [t('Sun elevation'), fmtDeg(series.sunEl[j])], sunLine,
      [t('Earth elevation'), fmtDeg(series.earthEl[j])],
      [t('Direct-to-Earth link'), t(status.link ? 'Available' : 'Blocked')],
    ];
    return rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b>`).join('');
  }
  function renderList(force) {
    const f = lastFrame ?? frame();
    const key = [local.probe, local.picked, local.open, local.query, getLanguage(), ctx.margin(), sites().length].join('|');
    const listEl = $('m-list');
    if (force || key !== local.listKey) {
      local.listKey = key;
      const rows = orderedSites().filter((site) => !local.query || `${site.label} ${site.short}`.toLowerCase().includes(local.query));
      listEl.innerHTML = rows.length ? rows.map((site) => {
        const open = local.open === site.id;
        const terrain = !site.terrain || site.terrain === 'none' ? t('no terrain') : site.terrain;
        return `<div class="srow${site.id === local.picked ? ' on' : ''}${open ? ' open' : ''}" data-row="${escapeHtml(site.id)}">
          <button data-id="${escapeHtml(site.id)}" aria-expanded="${open}"><span class="dotc"></span>
            <span><span class="nm">${escapeHtml(site.label)}</span><span class="sub2">${escapeHtml(fmtLatLon(site.lat, site.lon))} · ${escapeHtml(terrain)}</span></span><span class="chev">⌄</span></button>
          <div class="det"></div></div>`;
      }).join('') : `<div class="empty">${escapeHtml(t('No site matches that search.'))}</div>`;
    }
    for (const row of listEl.querySelectorAll('[data-row]')) {
      const site = sites().find((s) => s.id === row.dataset.row); if (!site) continue;
      row.querySelector('.dotc').style.background = colorOf(f.status.get(site.id));
      if (row.classList.contains('open')) row.querySelector('.det').innerHTML = detailsHtml(site, f);
    }
  }
  function laneSites() {
    const chosen = pickedSite();
    return [chosen, ...orderedSites().filter((s) => s !== chosen)].slice(0, 3);
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
  function renderLanes(force) {
    const key = [local.probe, local.picked, getLanguage(), ctx.margin(), ctx.landing(), sites().length].join('|');
    const el = $('m-lanes');
    if (force || key !== local.laneKey) {
      local.laneKey = key;
      const rect = (runs, y, color) => runs.map(([a, b]) => `<rect x="${a}" y="${y}" width="${b - a}" height="14" rx="2" fill="${color}"/>`).join('');
      const days = (SPAN / 24).toFixed(0);
      const lanes = laneSites().map((site) => {
        const sun = runsOf((s, i) => s.series.sunVis[i] === 1, site);
        const link = runsOf((s, i) => s.series.earthClr[i] > ctx.margin(), site);
        const both = runsOf((s, i) => s.series.sunVis[i] === 1 && s.series.earthClr[i] > ctx.margin(), site);
        return `<div class="lane-site"><div class="nm">${escapeHtml(site.short)}</div>
          <svg viewBox="0 0 ${SPAN} 54" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(site.label)}">
            <rect x="0" y="0" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/><rect x="0" y="20" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/><rect x="0" y="40" width="${SPAN}" height="14" rx="2" fill="rgba(255,255,255,.07)"/>
            ${rect(sun, 0, COLORS.sun)}${rect(link, 20, COLORS.link)}${rect(both, 40, COLORS.both)}
            <line class="cur" x1="0" x2="0" y1="0" y2="54" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg></div>`;
      }).join('');
      el.innerHTML = `<div class="lane-axis"><span></span><div style="justify-content:flex-start;gap:16px;font-family:inherit;flex-wrap:wrap"><span style="color:${COLORS.sun}">■ ${escapeHtml(t('Sun'))}</span><span style="color:${COLORS.link}">■ ${escapeHtml(t('Earth link'))}</span><span style="color:${COLORS.both}">■ ${escapeHtml(t('Both'))}</span><span style="margin-left:auto">${escapeHtml(t('Sun and Earth over the next {days} days', { days }))}</span></div></div>${lanes}
        <div class="lane-axis"><span></span><div><span>${escapeHtml(fmtDayMonth(ctx.landing()))}</span><span>${escapeHtml(fmtDayMonth(ctx.landing() + (SPAN / 2) * HOUR))}</span><span>${escapeHtml(fmtDayMonth(ctx.landing() + SPAN * HOUR))}</span></div></div>`;
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
    try {
      const T = await import('../vendor/three/three.module.js');
      const { OrbitControls } = await import('../vendor/three/OrbitControls.js');
      const canvas = $('m-3d'), stage = $('m-stage');
      const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);
      const controls = new OrbitControls(camera, canvas);
      controls.enablePan = false; controls.minDistance = 1.7; controls.maxDistance = 14; controls.rotateSpeed = 0.7;
      const sunLight = new T.DirectionalLight(0xfff1d6, 3.1);
      scene.add(sunLight, new T.AmbientLight(0x8da4ff, 0.2));
      const moon = new T.Mesh(new T.SphereGeometry(1, 96, 64), new T.MeshStandardMaterial({ map: new T.TextureLoader().load('assets/moon_1024.jpg', () => request()), roughness: 1, metalness: 0 }));
      scene.add(moon);

      const glowTexture = (inner) => {
        const c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, inner); grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
        return new T.CanvasTexture(c);
      };
      const earthTexture = () => {
        const c = document.createElement('canvas'); c.width = 512; c.height = 256;
        const g = c.getContext('2d');
        g.fillStyle = '#1d5fc0'; g.fillRect(0, 0, 512, 256);
        let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        g.fillStyle = '#3e9a5a';
        for (let i = 0; i < 70; i++) { g.beginPath(); g.ellipse(rnd() * 512, 40 + rnd() * 176, 8 + rnd() * 36, 5 + rnd() * 18, rnd() * 3, 0, 6.3); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (let i = 0; i < 46; i++) { g.beginPath(); g.ellipse(rnd() * 512, rnd() * 256, 14 + rnd() * 40, 3 + rnd() * 7, rnd() * 3, 0, 6.3); g.fill(); }
        g.fillRect(0, 0, 512, 12); g.fillRect(0, 244, 512, 12);
        return new T.CanvasTexture(c);
      };
      const earth = new T.Mesh(new T.SphereGeometry(0.36, 48, 32), new T.MeshStandardMaterial({ map: earthTexture(), roughness: 0.9, emissive: 0x0b1d40, emissiveIntensity: 0.9 }));
      const earthGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture('rgba(110,170,255,.55)'), blending: T.AdditiveBlending, depthWrite: false }));
      earthGlow.scale.set(1.4, 1.4, 1);
      const sunBody = new T.Mesh(new T.SphereGeometry(0.22, 24, 16), new T.MeshBasicMaterial({ color: 0xffd45a }));
      const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture('rgba(255,205,90,.7)'), blending: T.AdditiveBlending, depthWrite: false }));
      sunGlow.scale.set(2.8, 2.8, 1);
      scene.add(earth, earthGlow, sunBody, sunGlow);
      const starPositions = [];
      for (let i = 0; i < 900; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u), d = 40 + Math.random() * 30;
        starPositions.push(r * Math.cos(a) * d, u * d, r * Math.sin(a) * d);
      }
      const starGeometry = new T.BufferGeometry();
      starGeometry.setAttribute('position', new T.Float32BufferAttribute(starPositions, 3));
      scene.add(new T.Points(starGeometry, new T.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.7 })));

      const markerGroup = new T.Group();
      scene.add(markerGroup);
      const selectRing = new T.Mesh(new T.RingGeometry(1.7, 2.1, 32), new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }));
      scene.add(selectRing);
      let markers = [], markerKey = '', pending = false, tween = 0, home = null;
      const sphereGeometry = new T.SphereGeometry(1, 16, 12), ringGeometry = new T.RingGeometry(1.5, 2, 24);

      const buildMarkers = () => {
        const list = sites();
        const key = list.map((s) => `${s.id}:${s.lat}:${s.lon}`).join('|');
        if (key === markerKey) return;
        markerKey = key;
        markerGroup.clear();
        markers = list.map((site) => {
          const normal = new T.Vector3(...unit(site.lat, site.lon));
          const dotMesh = new T.Mesh(sphereGeometry, new T.MeshBasicMaterial({ color: COLORS.dark }));
          dotMesh.position.copy(normal).multiplyScalar(1.004);
          const ring = new T.Mesh(ringGeometry, new T.MeshBasicMaterial({ color: COLORS.sun, side: T.DoubleSide }));
          ring.position.copy(normal).multiplyScalar(1.003);
          ring.lookAt(normal.clone().multiplyScalar(2));
          markerGroup.add(dotMesh, ring);
          return { site, normal, dotMesh, ring };
        });
      };
      const request = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; draw(); }); };
      const placeLabel = (position, normal) => {
        const label = $('m-label'), site = pickedSite();
        const facing = normal.dot(camera.position.clone().normalize()) > 0.08;
        if (!facing || !site) { label.style.display = 'none'; return; }
        const p = position.clone().project(camera);
        label.style.display = 'block';
        label.style.left = `${(p.x * 0.5 + 0.5) * stage.clientWidth}px`;
        label.style.top = `${(-p.y * 0.5 + 0.5) * stage.clientHeight}px`;
        label.textContent = labelText(site);
      };
      function draw() {
        if (view() !== 'mission' || local.mode !== '3d' || !lastFrame) return;
        const f = lastFrame;
        buildMarkers();
        sunLight.position.set(...f.sun).multiplyScalar(10);
        earth.position.set(...f.earth).multiplyScalar(3.0);
        earthGlow.position.copy(earth.position);
        sunBody.position.set(...f.sun).multiplyScalar(8);
        sunGlow.position.copy(sunBody.position);
        const chosen = pickedSite();
        for (const m of markers) {
          const status = f.status.get(m.site.id), selected = m.site === chosen;
          m.dotMesh.material.color.set(colorOf(status));
          m.dotMesh.scale.setScalar(selected ? 0.034 : 0.024);
          m.ring.visible = status.link && status.sun;
          m.ring.scale.setScalar(selected ? 0.034 : 0.024);
        }
        const picked = markers.find((m) => m.site === chosen);
        selectRing.visible = Boolean(picked);
        if (picked) {
          selectRing.position.copy(picked.normal).multiplyScalar(1.006);
          selectRing.lookAt(picked.normal.clone().multiplyScalar(2));
          selectRing.scale.setScalar(0.034);
          placeLabel(picked.normal.clone().multiplyScalar(1.01), picked.normal);
        }
        renderer.render(scene, camera);
      }
      const resize = () => {
        const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
        renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); request();
      };
      new ResizeObserver(resize).observe(stage);
      controls.addEventListener('change', request);
      const setHome = () => {
        const dir = new T.Vector3(...unit(lastFrame.earthLat + 14, lastFrame.earthLon - 24));
        camera.position.copy(dir.multiplyScalar(6.4)); camera.lookAt(0, 0, 0); controls.update();
      };
      const flyTo = (dir, distance) => {
        cancelAnimationFrame(tween);
        const from = camera.position.clone().normalize(), to = dir.clone().normalize(), dist = camera.position.length();
        const target = distance ?? dist, start = performance.now();
        const rotation = new T.Quaternion().setFromUnitVectors(from, to), identity = new T.Quaternion();
        const step = (now) => {
          const k = Math.min(1, (now - start) / 600), e = k < 0.5 ? 4 * k ** 3 : 1 - ((-2 * k + 2) ** 3) / 2;
          camera.position.copy(from.clone().applyQuaternion(identity.clone().slerp(rotation, e))).multiplyScalar(dist + (target - dist) * e);
          camera.lookAt(0, 0, 0); controls.update(); draw();
          if (k < 1) tween = requestAnimationFrame(step);
        };
        tween = requestAnimationFrame(step);
      };
      let down = null;
      canvas.addEventListener('pointerdown', (event) => { down = [event.clientX, event.clientY]; });
      canvas.addEventListener('pointerup', (event) => {
        if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
        const box = canvas.getBoundingClientRect(), caster = new T.Raycaster();
        caster.setFromCamera(new T.Vector2(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1), camera);
        const hits = caster.intersectObjects([moon, ...markers.map((m) => m.dotMesh)]);
        const first = hits[0];
        if (!first || first.object === moon) return;
        const hit = markers.find((m) => m.dotMesh === first.object);
        if (hit) { local.picked = hit.site.id; refresh(true); }
      });
      view3d = {
        request: () => { if (!home) { setHome(); home = true; } request(); },
        reset: () => { if (lastFrame) flyTo(new T.Vector3(...unit(lastFrame.earthLat + 14, lastFrame.earthLon - 24)), 6.4); },
        focus: (site) => flyTo(new T.Vector3(...unit(site.lat, site.lon))),
      };
      resize();
    } catch (error) {
      console.error(error);
      view3dFailed = true;
      local.mode = '2d';
      ctx.toast(t('3D is not available on this device. Showing the 2D view.'));
    }
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
    const baseX = w / 2, baseY = h / 2 + 34;
    const size = pole ? Math.max(120, Math.min(w - 40, h - 90)) : Math.max(160, Math.min(w - 40, (h - 110) * 2));
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
  }
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
    local.flat = kind; view2d.z = 1; view2d.x = 0; view2d.y = 0; hoverId = null;
    refresh(true);
  }

  /* ---------- flow ---------- */

  function setMode(mode) {
    if (mode === '3d' && view3dFailed) return;
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
    $('m-3d').hidden = local.mode !== '3d'; $('m-2d').hidden = local.mode !== '2d';
    renderTime();
    renderDate();
    renderList(full);
    renderLanes(full);
    if (local.mode === '3d') { create3d(); view3d?.request(); } else draw2d();
  }

  function sendProbe() {
    if (flying) return;
    const site = pickedSite(); if (!site) return;
    stopPlay();
    flying = true;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 600 : 3800;
    const stars = Array.from({ length: 70 }, (_, i) => `<circle cx="${(i * 137.5) % 1000}" cy="${(i * 71.3) % 600}" r="${0.6 + (i % 3) * 0.4}" fill="#fff" opacity="${0.3 + (i % 5) * 0.12}"/>`).join('');
    flightEl.innerHTML = `<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><radialGradient id="fm" cx="35%" cy="30%"><stop offset="0" stop-color="#e8e5f2"/><stop offset=".6" stop-color="#8d89a4"/><stop offset="1" stop-color="#2b2740"/></radialGradient>
      <radialGradient id="fe" cx="35%" cy="30%"><stop offset="0" stop-color="#9fd0ff"/><stop offset=".55" stop-color="#2d73d6"/><stop offset="1" stop-color="#10285a"/></radialGradient></defs>
      ${stars}<circle cx="150" cy="450" r="62" fill="url(#fe)"/>
      <g id="fl-moon"><circle cx="820" cy="200" r="120" fill="url(#fm)"/></g>
      <path id="fl-path" d="M200 420 Q470 60 730 190" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5" stroke-dasharray="4 8"/>
      <path id="fl-trail" d="M200 420 Q470 60 730 190" fill="none" stroke="#f5c542" stroke-width="2" stroke-linecap="round"/>
      <g id="fl-probe"><polygon points="12,0 -8,-7 -4,0 -8,7" fill="#fff"/><circle cx="-10" cy="0" r="3" fill="#f5c542"/></g></svg>
      <div class="cap"><h2>${escapeHtml(t('Probe on its way to {site}', { site: site.short }))}</h2><p>${escapeHtml(t('Click to skip'))}</p></div>`;
    flightEl.classList.add('show');
    requestAnimationFrame(() => flightEl.classList.add('in'));
    const path = $('fl-path'), trail = $('fl-trail'), probeEl = $('fl-probe'), moonEl = $('fl-moon');
    const total = path.getTotalLength();
    trail.style.strokeDasharray = `${total}`;
    const begin = performance.now();
    let done = false;
    const finish = () => {
      if (done) return; done = true; flying = false;
      flightEl.classList.remove('in');
      setTimeout(() => { flightEl.classList.remove('show'); flightEl.innerHTML = ''; }, 350);
      ctx.arrive(sites().indexOf(site));
    };
    flightEl.onclick = finish;
    const step = (now) => {
      if (done) return;
      const k = Math.min(1, (now - begin) / duration), e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
      const at = path.getPointAtLength(total * e), ahead = path.getPointAtLength(Math.min(total, total * e + 1));
      probeEl.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${Math.atan2(ahead.y - at.y, ahead.x - at.x) / D2R})`);
      trail.style.strokeDashoffset = `${total * (1 - e)}`;
      moonEl.setAttribute('transform', `translate(820 200) scale(${1 + 0.35 * e}) translate(-820 -200)`);
      if (k < 1) requestAnimationFrame(step); else setTimeout(finish, reduced ? 0 : 250);
    };
    requestAnimationFrame(step);
  }

  startEl.addEventListener('click', (event) => {
    const card = event.target.closest('[data-probe]');
    if (card) { local.probe = card.dataset.probe; local.picked = null; local.open = null; renderStart(); return; }
    if (event.target.closest('#validate')) {
      local.picked = orderedSites()[0]?.id ?? null; local.open = null; local.hour = 0;
      local.flat = (pickedSite()?.lat ?? 0) < -75 ? 'pole' : 'moon'; view2d.z = 1; view2d.x = 0; view2d.y = 0;
      ctx.go('mission');
    }
  });
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
  };
}
