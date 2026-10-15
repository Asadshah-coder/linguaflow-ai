import { useState } from 'react';
import { History, Languages, LogIn, LogOut, Moon, Settings, Sun, User } from 'lucide-react';
import type { ApiUser } from '../services/api';

interface Props {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  providerLabel: string;
  user: ApiUser | null;
  authLoading: boolean;
  onSignIn: () => void;
  onLogout: () => void;
}

export default function Header({ theme, onToggleTheme, onOpenSettings, onOpenHistory, historyCount, providerLabel, user, authLoading, onSignIn, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
            <Languages className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight">
              LinguaFlow <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">AI</span>
            </p>
            <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              All-language translator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className="mr-1 hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 md:inline-flex"
            title="Active translation provider"
          >
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" aria-hidden />
            {providerLabel}
          </span>
          {!authLoading &&
            (user ? (
              <div className="relative">
                <button
                  className="icon-btn"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label={`Account: ${user.email}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title={user.email}
                >
                  <User className="h-5 w-5" aria-hidden />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
                    <div className="absolute right-0 z-50 mt-2 w-60 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                      <p className="truncate border-b border-slate-100 px-4 py-3 text-sm font-semibold dark:border-slate-800">
                        {user.email}
                      </p>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                      >
                        <LogOut className="h-4 w-4" aria-hidden /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="mr-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            ))}
          <button className="icon-btn relative" onClick={onOpenHistory} aria-label="Translation history" title="History">
            <History className="h-5 w-5" aria-hidden />
            {historyCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                {historyCount > 99 ? '99+' : historyCount}
              </span>
            )}
          </button>
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings" title="Settings">
            <Settings className="h-5 w-5" aria-hidden />
          </button>
          <button
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}
