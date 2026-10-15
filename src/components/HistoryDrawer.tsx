import { History, Trash2, X } from 'lucide-react';
import type { HistoryEntry } from '../types';
import { languageName } from '../data/languages';
import { clearHistory } from '../services/storage';

interface Props {
  open: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
  onRestore: (e: HistoryEntry) => void;
  onCleared: () => void;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function HistoryDrawer({ open, entries, onClose, onRestore, onCleared }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Translation history">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <History className="h-5 w-5 text-indigo-500" aria-hidden /> History
          </h2>
          <div className="flex items-center gap-1">
            {entries.length > 0 && (
              <button
                className="icon-btn"
                aria-label="Clear all history"
                title="Clear all"
                onClick={() => {
                  clearHistory();
                  onCleared();
                }}
              >
                <Trash2 className="h-[18px] w-[18px]" aria-hidden />
              </button>
            )}
            <button className="icon-btn" onClick={onClose} aria-label="Close history">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="slim-scroll flex-1 overflow-y-auto p-4">
          {entries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <History className="h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No translations yet</p>
              <p className="max-w-60 text-xs text-slate-400">Your recent translations will show up here, stored only in this browser.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      onRestore(e);
                      onClose();
                    }}
                    className="w-full rounded-2xl border border-slate-200 p-3.5 text-left transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:hover:border-indigo-500/50"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <span className="truncate">
                        {e.source === 'auto' && e.detectedSource
                          ? `${languageName(e.detectedSource)} → ${languageName(e.target)}`
                          : `${languageName(e.source)} → ${languageName(e.target)}`}
                      </span>
                      <span className="shrink-0 font-normal normal-case">{timeAgo(e.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm font-medium">{e.sourceText}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{e.translatedText}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          History never leaves your device — it lives in this browser's local storage.
        </p>
      </aside>
    </div>
  );
}
