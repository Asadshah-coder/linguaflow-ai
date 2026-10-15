import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import TranslatorCard from './components/TranslatorCard';
import SettingsPanel from './components/SettingsPanel';
import HistoryDrawer from './components/HistoryDrawer';
import AuthModal from './components/AuthModal';
import Toasts from './components/Toasts';
import Footer from './components/Footer';
import { useTranslator } from './hooks/useTranslator';
import { useAuth } from './hooks/useAuth';
import { loadSettings, saveSettings } from './services/storage';
import { api, type ServerHistoryEntry } from './services/api';
import { createProvider } from './services/providers';
import { LANGUAGES } from './data/languages';
import type { AppSettings, HistoryEntry, Language } from './types';

function toHistoryEntry(e: ServerHistoryEntry): HistoryEntry {
  return {
    id: `srv-${e.id}`,
    sourceText: e.source_text,
    translatedText: e.translated_text,
    source: e.source,
    target: e.target,
    detectedSource: e.detected_source || undefined,
    provider: e.provider as HistoryEntry['provider'],
    createdAt: new Date(e.created_at).getTime(),
  };
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [languages, setLanguages] = useState<Language[]>(LANGUAGES);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [serverHistory, setServerHistory] = useState<HistoryEntry[]>([]);

  const auth = useAuth();

  const handleTranslated = useCallback(
    (entry: {
      sourceText: string;
      translatedText: string;
      source: string;
      target: string;
      detectedSource?: string;
      provider: HistoryEntry['provider'];
    }) => {
      // Fire-and-forget: translation already succeeded locally.
      api
        .saveHistory({
          source_text: entry.sourceText,
          translated_text: entry.translatedText,
          source: entry.source,
          target: entry.target,
          detected_source: entry.detectedSource,
          provider: entry.provider,
        })
        .then((saved) => setServerHistory((prev) => [toHistoryEntry(saved), ...prev].slice(0, 50)))
        .catch(() => {
          /* history sync failed — translation itself is unaffected */
        });
    },
    [],
  );

  const t = useTranslator(settings, {
    skipLocalHistory: !!auth.user,
    onTranslated: handleTranslated,
  });

  // Load server history on login; drop it on logout.
  useEffect(() => {
    if (!auth.user) {
      setServerHistory([]);
      return;
    }
    let cancelled = false;
    api
      .listHistory()
      .then((list) => {
        if (!cancelled) setServerHistory(list.map(toHistoryEntry));
      })
      .catch(() => {
        if (!cancelled) t.pushToast('error', 'Could not load your synced history.');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  const history = auth.user ? serverHistory : t.history;

  const handleClearHistory = useCallback(() => {
    if (auth.user) {
      api
        .clearHistory()
        .then(() => setServerHistory([]))
        .catch(() => t.pushToast('error', 'Could not clear synced history.'));
    } else {
      t.setHistory([]);
      try {
        localStorage.removeItem('linguaflow:history:v1');
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  // Theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const toggleTheme = useCallback(() => {
    setSettings((s) => {
      const next = { ...s, theme: s.theme === 'dark' ? 'light' : 'dark' } as AppSettings;
      saveSettings(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const providerLabel = useMemo(
    () => (settings.provider === 'libretranslate' ? 'LibreTranslate' : 'MyMemory'),
    [settings.provider],
  );

  // Load provider language list (live for LibreTranslate, built-in for MyMemory).
  useEffect(() => {
    let cancelled = false;
    const provider = createProvider(settings.provider, {
      email: settings.myMemoryEmail,
      libreUrl: settings.libreTranslateUrl,
      libreKey: settings.libreTranslateKey,
    });
    if (settings.provider === 'mymemory' || !provider.isConfigured()) {
      setLanguages(LANGUAGES);
      return;
    }
    setLanguagesLoading(true);
    provider
      .getLanguages()
      .then((list) => {
        if (!cancelled && list.length) setLanguages(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          t.pushToast('error', err instanceof Error ? err.message : 'Could not load the LibreTranslate language list.');
          setLanguages(LANGUAGES);
        }
      })
      .finally(() => {
        if (!cancelled) setLanguagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.provider, settings.libreTranslateUrl, settings.libreTranslateKey]);

  return (
    <div className="min-h-screen">
      <Header
        theme={settings.theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={history.length}
        providerLabel={providerLabel}
        user={auth.user}
        authLoading={auth.loading}
        onSignIn={() => setAuthOpen(true)}
        onLogout={() => {
          auth.logout();
          t.pushToast('info', 'Signed out. History is now stored only in this browser.');
        }}
      />

      <main className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        {/* Hero */}
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="mx-auto max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">
            Translate anything,{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              in any language.
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
            {languages.length}+ languages, automatic detection, and instant results —
            free{auth.user ? ', with your history synced to your account' : ', no account needed'}.
          </p>
        </div>

        <TranslatorCard t={t} languages={languages} languagesLoading={languagesLoading} />
      </main>

      <Footer />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
      <HistoryDrawer
        open={historyOpen}
        entries={history}
        onClose={() => setHistoryOpen(false)}
        onRestore={t.restoreEntry}
        onCleared={handleClearHistory}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={async (email, password) => {
          await auth.login(email, password);
          t.pushToast('success', 'Signed in — history will now sync.');
        }}
        onRegister={async (email, password) => {
          await auth.register(email, password);
          t.pushToast('success', 'Account created — welcome!');
        }}
      />
      <Toasts toasts={t.toasts} onDismiss={t.dismissToast} />
    </div>
  );
}
