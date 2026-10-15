import { useState } from 'react';
import { Loader2, LogIn, TriangleAlert, UserPlus, X } from 'lucide-react';
import { ApiError } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

export default function AuthModal({ open, onClose, onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(email.trim(), password);
      else await onRegister(email.trim(), password);
      onClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Sign in' : 'Create account'}>
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm animate-slide-up rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <button className="icon-btn absolute right-4 top-4" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" aria-hidden />
        </button>

        <h2 className="text-xl font-extrabold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {mode === 'login'
            ? 'Sign in to sync your translation history across devices.'
            : 'One account — your history follows you everywhere.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Auth mode">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`rounded-xl py-2 text-sm font-semibold transition ${
                mode === m ? 'bg-white shadow dark:bg-slate-900' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="auth-email" className="field-label mb-1.5 block">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="field-label mb-1.5 block">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : mode === 'login' ? (
              <LogIn className="h-4 w-4" aria-hidden />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden />
            )}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          No spam, no tracking — your password is hashed with Argon2 and never stored in plain text.
        </p>
      </div>
    </div>
  );
}
