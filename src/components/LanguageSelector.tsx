import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react';
import { AUTO_DETECT, LANGUAGES, languageName } from '../data/languages';
import type { Language } from '../types';

interface Props {
  value: string;
  onChange: (code: string) => void;
  label: string;
  includeAuto?: boolean;
  disabled?: boolean;
  languages?: Language[];
}

export default function LanguageSelector({ value, onChange, label, includeAuto = false, disabled = false, languages }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const list = languages ?? LANGUAGES;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? list.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.nativeName.toLowerCase().includes(q) ||
            l.code.toLowerCase() === q,
        )
      : list;
    return includeAuto
      ? [{ code: AUTO_DETECT, name: 'Detect language', nativeName: 'Auto' } as Language, ...base]
      : base;
  }, [query, list, includeAuto]);

  // Clamp the highlight index without an effect (avoids set-state-in-effect).
  const safeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${safeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, open]);

  const toggle = () => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      setOpen(true);
      // Focus search after the popover paints.
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setOpen(false);
    }
  };

  const select = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[safeIndex];
      if (item) select(item.code);
    }
  };

  const current = value === AUTO_DETECT ? null : list.find((l) => l.code === value);

  return (
    <div ref={rootRef} className="relative">
      <span className="field-label mb-1.5 block">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} language: ${value === AUTO_DETECT ? 'Detect language' : languageName(value)}`}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm font-semibold shadow-sm transition hover:border-indigo-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-500/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          {value === AUTO_DETECT && <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />}
          <span className="truncate">
            {value === AUTO_DETECT ? 'Detect language' : (current?.name ?? value)}
          </span>
          {value !== AUTO_DETECT && current && current.nativeName !== current.name && (
            <span className="hidden truncate text-xs font-normal text-slate-400 sm:inline">{current.nativeName}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute z-50 mt-2 w-72 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-80">
            <div className="border-b border-slate-100 p-2 dark:border-slate-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search languages…"
                  aria-label="Search languages"
                  className="w-full rounded-xl bg-slate-100 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800"
                />
              </div>
            </div>
            <div
              ref={listRef}
              role="listbox"
              aria-label={`${label} language options`}
              onKeyDown={onKeyDown}
              tabIndex={-1}
              className="slim-scroll max-h-72 overflow-y-auto p-1.5"
            >
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-slate-500">No languages match “{query}”.</p>
              )}
              {filtered.map((l, i) => {
                const selected = l.code === value;
                const isAuto = l.code === AUTO_DETECT;
                return (
                  <button
                    key={l.code}
                    role="option"
                    aria-selected={selected}
                    data-index={i}
                    onClick={() => select(l.code)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`lang-option flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      i === safeIndex ? 'bg-slate-100 dark:bg-slate-800' : ''
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {isAuto && <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{isAuto ? 'Detect language' : l.name}</span>
                        {!isAuto && l.nativeName !== l.name && (
                          <span className="block truncate text-xs text-slate-400">{l.nativeName}</span>
                        )}
                      </span>
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-800">
              {filtered.length} of {list.length} languages
            </p>
          </div>
        </>
      )}
    </div>
  );
}
