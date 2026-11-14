import { ref, type Ref } from 'vue';

export type AppLanguage = 'en' | 'fr' | 'zh';

const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    'Choose language': 'Choose language',
    Earth: 'Earth',
    'Lunar horizon illustration': 'Illustration of a lunar horizon',
    'Moon surface view': 'View from the lunar surface',
    'Ready to explore offline': 'Ready to explore offline',
    'Explore the Moon': 'Explore the Moon',
    'Choose a place. Choose a day. See what changes.': 'Choose a place. Choose a day. See what changes.',
    'Start exploring': 'Start exploring',
    '12 curated lunar places': '12 curated lunar places',
    'Sunlight · Earth · terrain': 'Sunlight · Earth · terrain',
    'Moon light and temperature': 'Moon light and temperature',
    'The Moon has almost no air to hold heat.': 'The Moon has almost no air to hold heat.',
    'In full sunlight, the surface can reach about 127°C. In darkness, it can fall to about −173°C. These are broad reference values, not a temperature forecast for your chosen place.':
      'In full sunlight, the surface can reach about 127°C. In darkness, it can fall to about −173°C. These are broad reference values, not a temperature forecast for your chosen place.',
    'A lunar day and night': 'A lunar day and night',
    'One full cycle takes about 29.5 Earth days. Near the equator, daylight and darkness each last about two weeks. At the poles, hills and craters make the pattern very different.':
      'One full cycle takes about 29.5 Earth days. Near the equator, daylight and darkness each last about two weeks. At the poles, hills and craters make the pattern very different.',
    'NASA Moon facts': 'NASA Moon facts',
    'NASA: Moonlight and lunar day': 'NASA: Moonlight and lunar day',
    'The app shows sunlight, not temperature': 'The app shows sunlight, not temperature',
    'Your selected day shows when sunlight clears the modeled horizon. It does not calculate the surface temperature at this place.':
      'Your selected day shows when sunlight clears the modeled horizon. It does not calculate the surface temperature at this place.',
    'Lunar exploration': 'Lunar exploration',
    'Choose a place and a UTC date.': 'Choose a place and a UTC date.',
    'Lunar place': 'Lunar place',
    'Day (UTC)': 'Day (UTC)',
    'Data: 2026–2030 · day starts at 00:00 UTC': 'Data: 2026–2030 · day starts at 00:00 UTC',
    'Show me this day': 'Show me this day',
    'Loading lunar data…': 'Loading lunar data…',
    'Your lunar day': 'Your lunar day',
    Sunlight: 'Sunlight',
    'Earth in view': 'Earth in view',
    Together: 'Together',
    'hours of 24': 'hours of 24',
    'Hours when the Sun clears the modeled horizon.': 'Hours when the Sun clears the modeled horizon.',
    'Hours when Earth’s centre is above the modeled horizon.':
      'Hours when Earth’s centre is above the modeled horizon.',
    'Hours when both are true at once.': 'Hours when both are true at once.',
    'Why does sunlight matter?': 'Why does sunlight matter?',
    'Sunlight can provide energy, but hills can cast long shadows. Near the poles the Sun stays low, so small changes in terrain matter.':
      'Sunlight can provide energy, but hills can cast long shadows. Near the poles the Sun stays low, so small changes in terrain matter.',
    'What does “Earth in view” mean?': 'What does “Earth in view” mean?',
    'A straight geometric view to Earth clears the modeled horizon. This does not check antennas, signal strength, or a full radio link.':
      'A straight geometric view to Earth clears the modeled horizon. This does not check antennas, signal strength, or a full radio link.',
    'Why look at both?': 'Why look at both?',
    'A mission may need sunlight and a direct view of Earth at the same time. This overlap is a helpful clue, not a mission guarantee.':
      'A mission may need sunlight and a direct view of Earth at the same time. This overlap is a helpful clue, not a mission guarantee.',
    'Hourly sunlight and Earth view': 'Hourly sunlight and Earth view',
    'The Moon’s surface can get very hot in sunlight and very cold in darkness. This app does not calculate a temperature for this site.':
      'The Moon’s surface can get very hot in sunlight and very cold in darkness. This app does not calculate a temperature for this site.',
    'Think like an explorer': 'Think like an explorer',
    'What changed when you changed the place or day? Did sunlight and Earth in view change in the same way?':
      'What changed when you changed the place or day? Did sunlight and Earth in view change in the same way?',
    Terrain: 'Terrain',
    'A sampled terrain horizon is included.': 'A sampled terrain horizon is included.',
    'No sampled terrain horizon is available; a smooth horizon is used.':
      'No sampled terrain horizon is available; a smooth horizon is used.',
    'Coordinates and site source': 'Coordinates and site source',
    'Data coverage': 'Data coverage',
    'Sun and Earth positions: NASA/JPL Horizons (DE441).': 'Sun and Earth positions: NASA/JPL Horizons (DE441).',
    Source: 'Source',
    'Full LunaLens website': 'Full LunaLens website',
    'Choose a valid calendar date.': 'Choose a valid calendar date.',
    'Choose one of the available learning sites.': 'Choose one of the available learning sites.',
    'The offline lunar data could not be loaded.': 'The offline lunar data could not be loaded.',
    'Choose a date within the available data: {start} to {end}.':
      'Choose a date within the available data: {start} to {end}.',
    'Historical landing': 'Historical landing',
    'Landed mission': 'Landed mission',
    'South pole': 'South pole',
    'No terrain model': 'No terrain model',
    sunlight: 'sunlight',
    'no sunlight': 'no sunlight',
    'Earth below the horizon': 'Earth below the horizon',
    apollo11: 'Apollo 11 · Tranquility Base',
    apollo12: 'Apollo 12 · Oceanus Procellarum',
    apollo15: 'Apollo 15 · Hadley–Apennine',
    apollo16: 'Apollo 16 · Descartes',
    apollo17: 'Apollo 17 · Taurus–Littrow',
    im1: 'IM-1 · Malapert A',
    im2: 'IM-2 · Mons Mouton',
    ch3: 'Chandrayaan-3 · Shiv Shakti',
    'shackleton-rim': 'Shackleton rim crest',
    'degerlache-rim': 'de Gerlache rim crest',
    'nobile-rim': 'Nobile rim crest',
    'shackleton-floor': 'Shackleton floor (centre)',
  },
  fr: {
    'Choose language': 'Choisir la langue',
    Earth: 'Terre',
    'Lunar horizon illustration': 'Illustration de l’horizon lunaire',
    'Moon surface view': 'Vue depuis la surface lunaire',
    'Ready to explore offline': 'Prêt à explorer hors ligne',
    'Explore the Moon': 'Explorer la Lune',
    'Choose a place. Choose a day. See what changes.': 'Choisis un lieu, puis un jour. Observe ce qui change.',
    'Start exploring': 'Commencer',
    '12 curated lunar places': '12 lieux lunaires',
    'Sunlight · Earth · terrain': 'Soleil · Terre · relief',
    'Moon light and temperature': 'Lumière et température sur la Lune',
    'The Moon has almost no air to hold heat.': 'La Lune n’a presque pas d’air pour retenir la chaleur.',
    'In full sunlight, the surface can reach about 127°C. In darkness, it can fall to about −173°C. These are broad reference values, not a temperature forecast for your chosen place.':
      'En plein Soleil, la surface peut atteindre environ 127 °C. Dans l’obscurité, elle peut descendre vers −173 °C. Ce sont des repères généraux, pas une prévision pour le lieu choisi.',
    'A lunar day and night': 'Un jour et une nuit lunaires',
    'One full cycle takes about 29.5 Earth days. Near the equator, daylight and darkness each last about two weeks. At the poles, hills and craters make the pattern very different.':
      'Un cycle complet dure environ 29,5 jours terrestres. Près de l’équateur, le jour et la nuit durent chacun environ deux semaines. Aux pôles, les cratères et les reliefs changent beaucoup ce rythme.',
    'NASA Moon facts': 'NASA : faits sur la Lune',
    'NASA: Moonlight and lunar day': 'NASA : clair de Lune et jour lunaire',
    'The app shows sunlight, not temperature': 'L’app montre le Soleil, pas la température',
    'Your selected day shows when sunlight clears the modeled horizon. It does not calculate the surface temperature at this place.':
      'Le jour choisi indique quand le Soleil dépasse l’horizon modélisé. L’app ne calcule pas la température de surface de ce lieu.',
    'Lunar exploration': 'Exploration lunaire',
    'Choose a place and a UTC date.': 'Choisis un lieu et une date UTC.',
    'Lunar place': 'Lieu lunaire',
    'Day (UTC)': 'Jour (UTC)',
    'Data: 2026–2030 · day starts at 00:00 UTC': 'Données : 2026–2030 · journée dès 00:00 UTC',
    'Show me this day': 'Voir cette journée',
    'Loading lunar data…': 'Chargement des données lunaires…',
    'Your lunar day': 'Ta journée lunaire',
    Sunlight: 'Ensoleillement',
    'Earth in view': 'Terre visible',
    Together: 'En même temps',
    'hours of 24': 'heures sur 24',
    'Hours when the Sun clears the modeled horizon.': 'Heures où le Soleil dépasse l’horizon modélisé.',
    'Hours when Earth’s centre is above the modeled horizon.':
      'Heures où le centre de la Terre dépasse l’horizon modélisé.',
    'Hours when both are true at once.': 'Heures où les deux sont vrais en même temps.',
    'Why does sunlight matter?': 'Pourquoi le Soleil compte ?',
    'Sunlight can provide energy, but hills can cast long shadows. Near the poles the Sun stays low, so small changes in terrain matter.':
      'Le Soleil peut fournir de l’énergie, mais les reliefs projettent de longues ombres. Près des pôles, il reste bas : le terrain compte beaucoup.',
    'What does “Earth in view” mean?': 'Que signifie « Terre visible » ?',
    'A straight geometric view to Earth clears the modeled horizon. This does not check antennas, signal strength, or a full radio link.':
      'La ligne droite vers le centre de la Terre dépasse l’horizon modélisé. Cela ne vérifie ni les antennes, ni le signal, ni toute la liaison radio.',
    'Why look at both?': 'Pourquoi regarder les deux ?',
    'A mission may need sunlight and a direct view of Earth at the same time. This overlap is a helpful clue, not a mission guarantee.':
      'Une mission peut avoir besoin du Soleil et d’une vue directe vers la Terre en même temps. C’est un indice, pas une garantie de mission.',
    'Hourly sunlight and Earth view': 'Soleil et Terre heure par heure',
    'The Moon’s surface can get very hot in sunlight and very cold in darkness. This app does not calculate a temperature for this site.':
      'La surface lunaire peut beaucoup chauffer au Soleil et refroidir dans l’ombre. Cette app ne calcule pas la température de ce lieu.',
    'Think like an explorer': 'À toi de mener l’enquête',
    'What changed when you changed the place or day? Did sunlight and Earth in view change in the same way?':
      'Qu’est-ce qui change quand tu modifies le lieu ou la date ? Le Soleil et la Terre changent-ils de la même façon ?',
    Terrain: 'Relief',
    'A sampled terrain horizon is included.': 'Un horizon calculé à partir du relief est inclus.',
    'No sampled terrain horizon is available; a smooth horizon is used.':
      'Pas de profil de relief disponible : un horizon lisse est utilisé.',
    'Coordinates and site source': 'Coordonnées et source du site',
    'Data coverage': 'Période des données',
    'Sun and Earth positions: NASA/JPL Horizons (DE441).':
      'Positions du Soleil et de la Terre : NASA/JPL Horizons (DE441).',
    Source: 'Source',
    'Full LunaLens website': 'Site LunaLens complet',
    'Choose a valid calendar date.': 'Choisis une date valide.',
    'Choose one of the available learning sites.': 'Choisis un lieu proposé.',
    'The offline lunar data could not be loaded.': 'Impossible de charger les données lunaires hors ligne.',
    'Choose a date within the available data: {start} to {end}.': 'Choisis une date entre le {start} et le {end}.',
    'Historical landing': 'Site historique',
    'Landed mission': 'Mission posée',
    'South pole': 'Pôle Sud',
    'No terrain model': 'Sans relief modélisé',
    sunlight: 'du soleil',
    'no sunlight': 'pas de soleil',
    'Earth below the horizon': 'Terre sous l’horizon',
    apollo11: 'Apollo 11 · Tranquillity Base',
    apollo12: 'Apollo 12 · Océan des Tempêtes',
    apollo15: 'Apollo 15 · Hadley–Apennins',
    apollo16: 'Apollo 16 · Descartes',
    apollo17: 'Apollo 17 · Taurus–Littrow',
    im1: 'IM-1 · Malapert A',
    im2: 'IM-2 · Mons Mouton',
    ch3: 'Chandrayaan-3 · Shiv Shakti',
    'shackleton-rim': 'Crête du cratère Shackleton',
    'degerlache-rim': 'Crête du cratère de Gerlache',
    'nobile-rim': 'Crête du cratère Nobile',
    'shackleton-floor': 'Fond du cratère Shackleton (centre)',
  },
  zh: {
    'Choose language': '选择语言',
    Earth: '地球',
    'Lunar horizon illustration': '月球地平线示意图',
    'Moon surface view': '月球表面所见',
    'Ready to explore offline': '离线探索已就绪',
    'Explore the Moon': '探索月球',
    'Choose a place. Choose a day. See what changes.': '选择地点和日期，看看月面会有什么变化。',
    'Start exploring': '开始探索',
    '12 curated lunar places': '12 个月球地点',
    'Sunlight · Earth · terrain': '阳光 · 地球 · 地形',
    'Moon light and temperature': '月球上的光照与温度',
    'The Moon has almost no air to hold heat.': '月球几乎没有大气来保存热量。',
    'In full sunlight, the surface can reach about 127°C. In darkness, it can fall to about −173°C. These are broad reference values, not a temperature forecast for your chosen place.':
      '在充足阳光下，月表温度可达约 127°C；黑暗中可降至约 −173°C。这是大致参考值，并非所选地点的温度预测。',
    'A lunar day and night': '月球上的白昼与黑夜',
    'One full cycle takes about 29.5 Earth days. Near the equator, daylight and darkness each last about two weeks. At the poles, hills and craters make the pattern very different.':
      '一个完整昼夜约为 29.5 个地球日。赤道附近，白昼和黑夜各约两周；两极的山丘和环形山会让光照模式大不相同。',
    'NASA Moon facts': 'NASA 月球知识',
    'NASA: Moonlight and lunar day': 'NASA：月光与月球昼夜',
    'The app shows sunlight, not temperature': '应用显示日照，不计算温度',
    'Your selected day shows when sunlight clears the modeled horizon. It does not calculate the surface temperature at this place.':
      '所选日期显示阳光何时越过模拟地平线，不会计算该地点的月表温度。',
    'Lunar exploration': '月球探索',
    'Choose a place and a UTC date.': '选择月球地点和 UTC 日期。',
    'Lunar place': '月球地点',
    'Day (UTC)': '日期（UTC）',
    'Data: 2026–2030 · day starts at 00:00 UTC': '数据范围：2026–2030 · 每日从 UTC 00:00 开始',
    'Show me this day': '查看这一天',
    'Loading lunar data…': '正在载入月球数据…',
    'Your lunar day': '月球上的这一天',
    Sunlight: '阳光',
    'Earth in view': '可见地球',
    Together: '同时发生',
    'hours of 24': '小时 / 24 小时',
    'Hours when the Sun clears the modeled horizon.': '太阳高于模拟地平线的小时数。',
    'Hours when Earth’s centre is above the modeled horizon.': '地球中心高于模拟地平线的小时数。',
    'Hours when both are true at once.': '两种情况同时发生的小时数。',
    'Why does sunlight matter?': '为什么日照很重要？',
    'Sunlight can provide energy, but hills can cast long shadows. Near the poles the Sun stays low, so small changes in terrain matter.':
      '阳光可以提供能量，但山丘会投下长长的阴影。两极的太阳高度很低，因此地形变化会产生很大影响。',
    'What does “Earth in view” mean?': '“可见地球”是什么意思？',
    'A straight geometric view to Earth clears the modeled horizon. This does not check antennas, signal strength, or a full radio link.':
      '从地点到地球中心的几何直线高于模拟地平线；这并未评估天线、信号强度或完整通信链路。',
    'Why look at both?': '为什么要同时观察？',
    'A mission may need sunlight and a direct view of Earth at the same time. This overlap is a helpful clue, not a mission guarantee.':
      '任务可能需要同时获得阳光并直视地球。这种重合是有用线索，并不代表任务一定可行。',
    'Hourly sunlight and Earth view': '逐小时日照与地球可见情况',
    'The Moon’s surface can get very hot in sunlight and very cold in darkness. This app does not calculate a temperature for this site.':
      '月表在阳光下可能很热，在黑暗中可能很冷。本应用不计算该地点的温度。',
    'Think like an explorer': '像月球探索者一样思考',
    'What changed when you changed the place or day? Did sunlight and Earth in view change in the same way?':
      '改变地点或日期后，哪些结果发生了变化？日照和地球可见情况的变化相同吗？',
    Terrain: '地形',
    'A sampled terrain horizon is included.': '使用了采样的地形地平线。',
    'No sampled terrain horizon is available; a smooth horizon is used.': '没有可用的地形地平线数据，使用平滑地平线。',
    'Coordinates and site source': '坐标与地点来源',
    'Data coverage': '数据覆盖范围',
    'Sun and Earth positions: NASA/JPL Horizons (DE441).': '太阳与地球位置：NASA/JPL Horizons（DE441）。',
    Source: '来源',
    'Full LunaLens website': 'LunaLens 完整网站',
    'Choose a valid calendar date.': '请选择有效日期。',
    'Choose one of the available learning sites.': '请选择列表中的地点。',
    'The offline lunar data could not be loaded.': '无法载入离线月球数据。',
    'Choose a date within the available data: {start} to {end}.': '请选择数据范围内的日期：{start} 至 {end}。',
    'Historical landing': '历史着陆点',
    'Landed mission': '已着陆任务',
    'South pole': '南极',
    'No terrain model': '无地形模型',
    sunlight: '有阳光',
    'no sunlight': '无阳光',
    'Earth below the horizon': '地球位于地平线下',
    apollo11: '阿波罗 11 号 · 宁静基地',
    apollo12: '阿波罗 12 号 · 风暴洋',
    apollo15: '阿波罗 15 号 · 哈德利-亚平宁',
    apollo16: '阿波罗 16 号 · 笛卡尔高地',
    apollo17: '阿波罗 17 号 · 陶拉斯-利特罗',
    im1: 'IM-1 · 马拉珀特 A',
    im2: 'IM-2 · 穆顿山',
    ch3: '月船 3 号 · 湿婆力量点',
    'shackleton-rim': '沙克尔顿环形山脊',
    'degerlache-rim': '德热拉什环形山脊',
    'nobile-rim': '诺比莱环形山脊',
    'shackleton-floor': '沙克尔顿环形山底（中心）',
  },
};

const savedLanguage = globalThis.localStorage?.getItem('lunalens-language');
const language = ref<AppLanguage>(savedLanguage === 'fr' || savedLanguage === 'zh' ? savedLanguage : 'en');

export function useLanguage(): {
  language: Ref<AppLanguage>;
  setLanguage: (value: unknown) => void;
  t: (key: string) => string;
} {
  function setLanguage(value: unknown) {
    if (value !== 'en' && value !== 'fr' && value !== 'zh') return;
    language.value = value;
    globalThis.localStorage?.setItem('lunalens-language', value);
    document.documentElement.lang = value === 'zh' ? 'zh-Hans' : value;
  }

  function t(key: string) {
    return translations[language.value][key] ?? translations.en[key] ?? key;
  }

  return { language, setLanguage, t };
}

document.documentElement.lang = language.value === 'zh' ? 'zh-Hans' : language.value;
