import { ref } from 'vue';

const STORAGE_KEY = 'lunalens-color-mode';
const systemPreference = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let followsSystem = true;

function readPreference(): boolean {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      followsSystem = false;
      return saved === 'dark';
    }
  } catch {
    // Keep the system preference when storage is unavailable.
  }
  return systemPreference?.matches ?? false;
}

export const isDarkMode = ref(readPreference());

function applyColorMode(dark: boolean): void {
  isDarkMode.value = dark;
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#111720' : '#f4f1e9');
}

applyColorMode(isDarkMode.value);

systemPreference?.addEventListener('change', (event) => {
  if (followsSystem) applyColorMode(event.matches);
});

export function toggleColorMode(): void {
  const next = !isDarkMode.value;
  followsSystem = false;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next ? 'dark' : 'light');
  } catch {
    // The current screen still changes when storage is unavailable.
  }
  applyColorMode(next);
}
