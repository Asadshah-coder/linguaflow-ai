import { useState } from 'react';
import { Check, KeyRound, Mail, Server, X } from 'lucide-react';
import type { AppSettings, ProviderId } from '../types';

interface Props {
  open: boolean;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
}

const PROVIDERS: Array<{ id: ProviderId; name: string; blurb: string; needsConfig: boolean }> = [
  {
    id: 'mymemory',
    name: 'MyMemory',
    blurb: 'Free, no sign-up. 50k chars/day anonymous, 500k/day with a free email key.',
    needsConfig: false,
  },
  {
    id: 'libretranslate',
    name: 'LibreTranslate',
    blurb: 'Open-source, self-hostable. Point it at your own server (or a public instance).',
    needsConfig: true,
  },
];

export default function SettingsPanel({ open, settings, onChange, onClose }: Props) {
  const [savedFlash, setSavedFlash] = useState(false);
  if (!open) return null;

  const update = (patch: Partial<AppSettings>) => {
    onChange({ ...settings, ...patch });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <h3 className="field-label mb-2">Translation provider</h3>
        <div className="space-y-2">
          {PROVIDERS.map((p) => {
            const active = settings.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => update({ provider: p.id })}
                aria-pressed={active}
                className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:bg-indigo-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{p.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{p.blurb}</span>
                </span>
                {active && <Check className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />}
              </button>
            );
          })}
        </div>

        {settings.provider === 'mymemory' && (
          <div className="mt-5 animate-fade-in">
            <label htmlFor="mm-email" className="field-label mb-1.5 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" aria-hidden /> MyMemory email <span className="font-normal normal-case">(optional)</span>
            </label>
            <input
              id="mm-email"
              type="email"
              value={settings.myMemoryEmail}
              onChange={(e) => update({ myMemoryEmail: e.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              A free MyMemory key (just an email) raises the anonymous 50k chars/day quota to 500k/day.
              Stored only in this browser — never sent anywhere except MyMemory's API.
            </p>
          </div>
        )}

        {settings.provider === 'libretranslate' && (
          <div className="mt-5 space-y-4 animate-fade-in">
            <div>
              <label htmlFor="lt-url" className="field-label mb-1.5 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5" aria-hidden /> Server URL
              </label>
              <input
                id="lt-url"
                type="url"
                value={settings.libreTranslateUrl}
                onChange={(e) => update({ libreTranslateUrl: e.target.value })}
                placeholder="https://translate.example.com"
                autoComplete="url"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="lt-key" className="field-label mb-1.5 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> API key <span className="font-normal normal-case">(optional)</span>
              </label>
              <input
                id="lt-key"
                type="password"
                value={settings.libreTranslateKey}
                onChange={(e) => update({ libreTranslateKey: e.target.value })}
                placeholder="Only if your server requires one"
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                The language list is fetched live from your server when you switch to LibreTranslate.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className={`text-xs font-medium text-emerald-600 transition-opacity dark:text-emerald-400 ${savedFlash ? 'opacity-100' : 'opacity-0'}`}>
            Saved automatically ✓
          </p>
          <button
            onClick={onClose}
            className="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
