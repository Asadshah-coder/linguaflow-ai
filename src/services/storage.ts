import type { AppSettings, HistoryEntry } from '../types';

const SETTINGS_KEY = 'linguaflow:settings:v1';
const HISTORY_KEY = 'linguaflow:history:v1';
const MAX_HISTORY = 50;

const DEFAULT_SETTINGS: AppSettings = {
  provider: 'mymemory',
  myMemoryEmail: '',
  libreTranslateUrl: '',
  libreTranslateKey: '',
  theme: 'light',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function loadSettings(): AppSettings {
  const envProvider = (import.meta.env.VITE_DEFAULT_PROVIDER as string) || '';
  const s = readJson<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  if (envProvider === 'libretranslate' || envProvider === 'mymemory') s.provider = envProvider;
  const envEmail = (import.meta.env.VITE_MYMEMORY_EMAIL as string) || '';
  if (envEmail && !s.myMemoryEmail) s.myMemoryEmail = envEmail;
  const envUrl = (import.meta.env.VITE_LIBRETRANSLATE_URL as string) || '';
  if (envUrl && !s.libreTranslateUrl) s.libreTranslateUrl = envUrl;
  return s;
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage full / private mode — settings simply won't persist */
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(list) ? list.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry[] {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const next = [full, ...loadHistory()].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
