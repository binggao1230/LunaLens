import { Ephemeris } from '../js/engine/ephemeris.js';
import { Site } from '../js/engine/site.js';

const copy = {
  en: { eyebrow:'A closer look at the Moon',title:'Choose a place.\nSee its sky.',lead:'Explore how the Sun and Earth appear from lunar landing sites.',start:'Start exploring',placeDate:'Choose a place and day',lunarPlace:'Lunar place',dayUtc:'Day · UTC',showDay:'Show this lunar day',loading:'Loading local lunar data…',skyReadout:'SKY READOUT',sunlight:'Sunlight',earthView:'Earth in view',together:'Together',sunDesc:'Hours when the Sun clears the modeled horizon.',earthDesc:'Hours when Earth’s centre clears the modeled horizon.',togetherDesc:'Hours when sunlight and Earth view happen at once.',oneDay:'ONE LUNAR DAY',whenVisible:'When can you see them?',moveHour:'Move through the hours of this day',timelineHint:'Choose an hour to inspect the lunar sky.',why:'What do these results mean?',sunExplain:'The Sun counts as visible when its upper edge clears the local terrain horizon.',earthExplain:'This is a direct geometric view to Earth’s centre. It does not check antennas or a complete radio link.',togetherExplain:'The overlap shows hours when both conditions are true. It is a useful planning clue, not a landing or power guarantee.',accuracy:'Terrain horizons are regional estimates. Local rocks and landing-point details may differ.',nextStep:'NEXT STEP',compareTitle:'Try another place',compareText:'Change the location to see how the same lunar day changes.',changePlace:'Change place',fullExperience:'Open the full LunaLens navigator',offline:'Calculations use local project data.',explore:'Explore',timeline:'Timeline',learn:'Learn',fullSite:'Full site',hours:'hours',terrain:'Terrain-backed horizon',smooth:'Smooth-sphere reference',dataReady:'Local sky data ready · {start} to {end} UTC',pickDay:'Choose a date within the available data.',failed:'Local lunar data could not be loaded. Open this page from the LunaLens project server.',hourSummary:'At {time} UTC: {sun} · {earth}.',visibleSun:'Sun above horizon',darkSun:'Sun below horizon',earthYes:'Earth in view',earthNo:'Earth below horizon',loadingSites:'Loading sites…',titleSuffix:' · UTC' },
  fr: { eyebrow:'La Lune de plus près',title:'Choisissez un lieu.\nObservez son ciel.',lead:'Voyez comment le Soleil et la Terre apparaissent depuis les sites lunaires.',start:'Commencer',placeDate:'Choisir un lieu et un jour',lunarPlace:'Lieu lunaire',dayUtc:'Jour · UTC',showDay:'Voir cette journée lunaire',loading:'Chargement des données lunaires…',skyReadout:'ÉTAT DU CIEL',sunlight:'Ensoleillement',earthView:'Terre visible',together:'En même temps',sunDesc:'Heures où le Soleil dépasse l’horizon modélisé.',earthDesc:'Heures où le centre de la Terre dépasse l’horizon modélisé.',togetherDesc:'Heures où le Soleil et la Terre sont visibles ensemble.',oneDay:'UNE JOURNÉE LUNAIRE',whenVisible:'Quand peut-on les voir ?',moveHour:'Parcourir les heures de cette journée',timelineHint:'Choisissez une heure pour observer le ciel lunaire.',why:'Que signifient ces résultats ?',sunExplain:'Le Soleil est compté comme visible lorsque son bord supérieur dépasse l’horizon local du terrain.',earthExplain:'Il s’agit d’une ligne de visée géométrique vers le centre de la Terre. Les antennes et la liaison radio complète ne sont pas évaluées.',togetherExplain:'Le chevauchement indique les heures où les deux conditions sont réunies. C’est un indice de planification, pas une garantie d’atterrissage ou de puissance.',accuracy:'Les horizons du terrain sont des estimations régionales. Les détails locaux du site peuvent différer.',nextStep:'POUR CONTINUER',compareTitle:'Essayez un autre lieu',compareText:'Changez de lieu pour voir comment cette même journée lunaire évolue.',changePlace:'Changer de lieu',fullExperience:'Ouvrir le navigateur LunaLens complet',offline:'Calculs effectués avec les données locales du projet.',explore:'Explorer',timeline:'Chronologie',learn:'Comprendre',fullSite:'Site complet',hours:'heures',terrain:'Horizon avec relief',smooth:'Référence sphérique',dataReady:'Données locales prêtes · {start} à {end} UTC',pickDay:'Choisissez une date couverte par les données.',failed:'Impossible de charger les données lunaires locales. Ouvrez cette page depuis le serveur du projet LunaLens.',hourSummary:'À {time} UTC : {sun} · {earth}.',visibleSun:'Soleil au-dessus de l’horizon',darkSun:'Soleil sous l’horizon',earthYes:'Terre visible',earthNo:'Terre sous l’horizon',loadingSites:'Chargement des sites…',titleSuffix:' · UTC' },
  zh: { eyebrow:'近距离探索月球',title:'选择一个地点。\n看看当地天空。',lead:'探索从月球着陆点看到的太阳和地球。',start:'开始探索',placeDate:'选择地点和日期',lunarPlace:'月球地点',dayUtc:'日期 · UTC',showDay:'查看这一天',loading:'正在加载本地月球数据…',skyReadout:'天空概况',sunlight:'阳光',earthView:'可见地球',together:'同时可见',sunDesc:'太阳高于模拟地形地平线的小时数。',earthDesc:'地球中心高于模拟地平线的小时数。',togetherDesc:'太阳和地球同时可见的小时数。',oneDay:'一个月球日',whenVisible:'什么时候能看到它们？',moveHour:'浏览当天的小时',timelineHint:'选择一个小时查看月球天空。',why:'这些结果代表什么？',sunExplain:'太阳上缘越过当地地形地平线时，计为可见。',earthExplain:'这是到地球中心的几何视线，不包含天线或完整无线电链路评估。',togetherExplain:'重叠部分表示两项条件同时满足的小时数，是规划参考，不代表着陆或供电保证。',accuracy:'地形地平线是区域估算，着陆点的局部细节可能不同。',nextStep:'下一步',compareTitle:'试试另一个地点',compareText:'更换地点，观察同一天的月球天空如何变化。',changePlace:'更换地点',fullExperience:'打开完整 LunaLens 导航器',offline:'计算使用项目中的本地数据。',explore:'探索',timeline:'时间线',learn:'了解',fullSite:'完整网站',hours:'小时',terrain:'包含地形的地平线',smooth:'平滑球面参考',dataReady:'本地天空数据已就绪 · {start} 至 {end} UTC',pickDay:'请选择数据覆盖范围内的日期。',failed:'无法加载本地月球数据。请从 LunaLens 项目服务器打开此页面。',hourSummary:'UTC {time}：{sun} · {earth}。',visibleSun:'太阳高于地平线',darkSun:'太阳低于地平线',earthYes:'可见地球',earthNo:'地球低于地平线',loadingSites:'正在加载地点…',titleSuffix:' · UTC' }
};
const $ = (id) => document.getElementById(id);
const lang = $('language');
const state = { sites: [], ephemeris: null, currentSite: null, hours: [], lang: 'en' };
const t = (key) => copy[state.lang][key] || copy.en[key] || key;

function localize() {
  state.lang = lang.value;
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-t]').forEach((node) => { const value = t(node.dataset.t); if (value.includes('\n')) node.innerHTML = value.split('\n').map((part) => escapeHtml(part)).join('<br>'); else node.textContent = value; });
  if (state.sites.length) Array.from($('site').options).forEach((option)=>{const site=state.sites.find((item)=>item.id===option.value);if(site)option.textContent=`${site.name} · ${site.horizon?t('terrain'):t('smooth')}`;});
  document.querySelectorAll('.bottom-nav a')[0].setAttribute('aria-label', t('explore'));
  if (state.ephemeris) $('coverage').textContent = t('dataReady').replace('{start}', state.ephemeris.meta.start.slice(0,10)).replace('{end}', new Date(state.ephemeris.tEnd).toISOString().slice(0,10));
  if (state.hours.length) renderResult();
}
function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function renderResult() {
  const samples = state.hours;
  const sum = (field) => samples.filter((hour) => hour[field]).length;
  $('result-title').textContent = `${state.currentSite.name} · ${$('date').value}${t('titleSuffix')}`;
  $('sun-hours').textContent = `${sum('sun')} ${t('hours')}`;
  $('earth-hours').textContent = `${sum('earth')} ${t('hours')}`;
  $('overlap-hours').textContent = `${sum('sun') ? samples.filter((hour)=>hour.sun&&hour.earth).length : 0} ${t('hours')}`;
  $('timeline').replaceChildren(...samples.map((sample, index) => { const cell = document.createElement('span'); cell.className = `hour-cell${sample.sun?' sun-on':''}${sample.earth?' earth-on':''}${sample.sun&&sample.earth?' both-on':''}${index===Number($('hour').value)?' current':''}`; cell.setAttribute('aria-hidden','true'); return cell; }));
  $('timeline').setAttribute('aria-label', `${t('sunlight')}: ${sum('sun')} ${t('hours')}; ${t('earthView')}: ${sum('earth')} ${t('hours')}; ${t('together')}: ${samples.filter((hour)=>hour.sun&&hour.earth).length} ${t('hours')}.`);
  updateHour();
  $('results').setAttribute('aria-busy','false');
}
function updateHour() {
  const index = Number($('hour').value), sample = state.hours[index];
  if (!sample) return;
  const time = `${String(index).padStart(2,'0')}:00`;
  $('hour-label').textContent = time;
  $('hour').setAttribute('aria-valuetext', `${time} UTC`);
  $('hour-summary').textContent = t('hourSummary').replace('{time}',time).replace('{sun}',sample.sun?t('visibleSun'):t('darkSun')).replace('{earth}',sample.earth?t('earthYes'):t('earthNo'));
  document.querySelectorAll('.hour-cell').forEach((cell,i)=>cell.classList.toggle('current',i===index));
}
function showDay() {
  const date = $('date').value;
  const start = Date.parse(`${date}T00:00:00Z`), end = state.ephemeris.tEnd;
  if (!Number.isFinite(start) || start < state.ephemeris.t0 || start + 23*3600000 > end) { $('coverage').textContent = t('pickDay'); return; }
  const site = state.currentSite;
  const first = Math.round(state.ephemeris.indexOf(start));
  const series = site.series;
  state.hours = Array.from({length:24},(_,hour)=>({sun:series.sunVis[first+hour]===1,earth:series.earthVis[first+hour]===1}));
  $('hour').value = '0';
  renderResult();
}
async function initialize() {
  try {
    const [metaRes, dataRes, sitesRes] = await Promise.all([fetch('../data/ephemeris.json'),fetch('../data/ephemeris.f64'),fetch('../data/sites.json')]);
    if (![metaRes,dataRes,sitesRes].every((response)=>response.ok)) throw new Error('Missing local data');
    const [meta,buffer,catalog] = await Promise.all([metaRes.json(),dataRes.arrayBuffer(),sitesRes.json()]);
    state.ephemeris = new Ephemeris(buffer,meta); state.sites = catalog.sites;
    const picker = $('site'); picker.replaceChildren(...state.sites.map((site)=>{const option=document.createElement('option');option.value=site.id;option.textContent=`${site.name} · ${site.horizon? t('terrain'):t('smooth')}`;return option;}));
    picker.value = state.sites.some((site)=>site.id==='nobile-rim')?'nobile-rim':state.sites[0].id;
    state.currentSite = new Site(state.sites.find((site)=>site.id===picker.value),state.ephemeris);
    picker.disabled=false; $('date').disabled=false; $('show').disabled=false;
    const end = new Date(state.ephemeris.tEnd).toISOString().slice(0,10); $('date').min=meta.start.slice(0,10); $('date').max=end;
    $('coverage').textContent=t('dataReady').replace('{start}',meta.start.slice(0,10)).replace('{end}',end);
    showDay();
  } catch (error) { $('coverage').textContent=t('failed'); $('results').setAttribute('aria-busy','false'); console.error(error); }
}
lang.addEventListener('change',localize);
$('site').addEventListener('change',()=>{state.currentSite=new Site(state.sites.find((site)=>site.id===$('site').value),state.ephemeris);showDay();});
$('date').addEventListener('change',showDay); $('show').addEventListener('click',showDay);
$('hour').addEventListener('input',updateHour);
$('previous-hour').addEventListener('click',()=>{$('hour').value=String((Number($('hour').value)+22)%24);updateHour();});
$('next-hour').addEventListener('click',()=>{$('hour').value=String((Number($('hour').value)+1)%24);updateHour();});
$('change-place').addEventListener('click',()=>{$('site').focus();$('site').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});});
localize(); initialize();
