const messages = {};

let language = 'en';
try {
  const shared = new URLSearchParams(globalThis.location?.search).get('lang');
  const saved = globalThis.localStorage?.getItem('lunalens-language');
  language = 'en';
} catch {}

export const getLanguage = () => language;
export function registerMessages(extra) { Object.assign(messages, extra); }
export const locale = () => 'en-GB';
export const hasTranslation = (key) => Object.hasOwn(messages, key);
export function t(key, values = {}) {
  const message = language === 'en' ? key : messages[key]?.[language === 'fr' ? 0 : 1] ?? key;
  return message.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}

const textNodes = [];
const attributes = [];
export function initTranslations(root = document) {
  const walker = document.createTreeWalker(root.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script,style,option,[data-no-translate]')) continue;
    const original = node.textContent.trim();
    if (hasTranslation(original)) textNodes.push({ node, original, leading: /^\s/.test(node.textContent) ? ' ' : '', trailing: /\s$/.test(node.textContent) ? ' ' : '' });
  }
  for (const element of root.querySelectorAll('[aria-label],[placeholder]')) {
    for (const attr of ['aria-label', 'placeholder']) {
      const original = element.getAttribute(attr);
      if (original && hasTranslation(original)) attributes.push({ element, attr, original });
    }
  }
  applyTranslations();
}

export function applyTranslations() {
  document.documentElement.lang = language;
  document.title = t('LunaLens · Lunar landing site navigator');
  for (const { node, original, leading, trailing } of textNodes) if (node.isConnected) node.textContent = leading + t(original) + trailing;
  for (const { element, attr, original } of attributes) element.setAttribute(attr, t(original));
  const select = document.querySelector('#language');
  if (select) select.value = language;
}

export function setLanguage(value) {
  if (!['en', 'fr', 'zh'].includes(value)) return;
  language = value;
  try { localStorage.setItem('lunalens-language', value); } catch {}
  if (typeof document !== 'undefined') applyTranslations();
}
