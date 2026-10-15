import { useRef } from 'react';
import {
  ArrowLeftRight,
  ClipboardPaste,
  Copy,
  Eraser,
  Languages,
  Loader2,
  TriangleAlert,
  Volume2,
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { AUTO_DETECT, languageByCode } from '../data/languages';
import { MAX_CHARS, useTranslator } from '../hooks/useTranslator';
import { speak, speechSupported } from '../services/speech';
import type { Language } from '../types';

type Hook = ReturnType<typeof useTranslator>;

interface Props {
  t: Hook;
  languages: Language[];
  languagesLoading: boolean;
}

export default function TranslatorCard({ t, languages, languagesLoading }: Props) {
  const sourceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    sourceText, setSourceText, translatedText,
    sourceLang, setSourceLang, targetLang, setTargetLang,
    status, error, detectedSource, detectedLabel, progress,
    pushToast,
    translate, swap, clearAll, isLoading,
  } = t;

  const sourceRtl = sourceLang === AUTO_DETECT
    ? (detectedSource ? !!languageByCode(detectedSource)?.rtl : false)
    : !!languageByCode(sourceLang)?.rtl;
  const targetRtl = !!languageByCode(targetLang)?.rtl;

  const copyTranslated = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      pushToast('success', 'Translation copied to clipboard.');
    } catch {
      pushToast('error', 'Could not access the clipboard.');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        pushToast('info', 'Clipboard is empty.');
        return;
      }
      setSourceText((prev) => (prev + text).slice(0, MAX_CHARS));
      sourceTextareaRef.current?.focus();
    } catch {
      pushToast('error', 'Clipboard access was denied by the browser.');
    }
  };

  const speakSource = () => {
    const code = sourceLang === AUTO_DETECT ? detectedSource || 'en' : sourceLang;
    if (!speak(sourceText, code)) pushToast('info', 'Text-to-speech is not available in this browser.');
  };

  const speakTarget = () => {
    if (!speak(translatedText, targetLang)) pushToast('info', 'Text-to-speech is not available in this browser.');
  };

  const onTranslateKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      translate();
    }
  };

  const overLimit = sourceText.length > MAX_CHARS;

  return (
    <section aria-label="Translator" className="card animate-slide-up overflow-hidden">
      {/* Language toolbar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-b border-slate-100 p-4 dark:border-slate-800 sm:gap-3 sm:p-5">
        <LanguageSelector
          label="From"
          value={sourceLang}
          onChange={setSourceLang}
          includeAuto
          disabled={isLoading}
          languages={languages}
        />
        <button
          onClick={swap}
          disabled={isLoading}
          aria-label="Swap languages"
          title="Swap languages"
          className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <ArrowLeftRight className="h-5 w-5" aria-hidden />
        </button>
        <LanguageSelector
          label="To"
          value={targetLang}
          onChange={setTargetLang}
          disabled={isLoading}
          languages={languages}
        />
      </div>

      {/* Panels */}
      <div className="grid gap-px bg-slate-100 dark:bg-slate-800 md:grid-cols-2">
        {/* Source panel */}
        <div className="bg-white p-4 dark:bg-slate-900 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="field-label">Source text</span>
              {detectedLabel && status === 'success' && (
                <span className="truncate rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  Detected: {detectedLabel}
                </span>
              )}
            </div>
            <span className={`text-xs tabular-nums ${overLimit ? 'font-semibold text-red-500' : 'text-slate-400'}`}>
              {sourceText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <textarea
            ref={sourceTextareaRef}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value.slice(0, MAX_CHARS + 500))}
            onKeyDown={onTranslateKey}
            dir={sourceRtl ? 'rtl' : 'ltr'}
            placeholder="Type or paste text here… (Ctrl+Enter to translate)"
            aria-label="Text to translate"
            rows={8}
            maxLength={MAX_CHARS + 500}
            className="min-h-44 w-full resize-y rounded-2xl border border-transparent bg-slate-50 p-4 text-[15px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-800/60 dark:focus:border-indigo-500/50 dark:focus:bg-slate-800"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="icon-btn" onClick={pasteFromClipboard} aria-label="Paste from clipboard" title="Paste">
                <ClipboardPaste className="h-[18px] w-[18px]" aria-hidden />
              </button>
              {speechSupported() && (
                <button className="icon-btn" onClick={speakSource} disabled={!sourceText.trim()} aria-label="Read source text aloud" title="Listen">
                  <Volume2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
            </div>
            <button
              onClick={clearAll}
              disabled={!sourceText && !translatedText}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <Eraser className="h-4 w-4" aria-hidden /> Clear
            </button>
          </div>
        </div>

        {/* Target panel */}
        <div className="bg-white p-4 dark:bg-slate-900 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="field-label">Translation</span>
            <div className="flex items-center gap-1">
              {speechSupported() && (
                <button className="icon-btn" onClick={speakTarget} disabled={!translatedText} aria-label="Read translation aloud" title="Listen">
                  <Volume2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              )}
              <button className="icon-btn" onClick={copyTranslated} disabled={!translatedText} aria-label="Copy translation" title="Copy">
                <Copy className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>
          </div>
          <div
            dir={targetRtl ? 'rtl' : 'ltr'}
            aria-live="polite"
            aria-label="Translated text"
            className="slim-scroll min-h-44 max-h-80 overflow-y-auto rounded-2xl bg-slate-50 p-4 text-[15px] leading-relaxed dark:bg-slate-800/60"
          >
            {isLoading ? (
              <div className="space-y-3" aria-label="Translating">
                <div className="h-4 animate-pulse-soft rounded bg-slate-200 dark:bg-slate-700" style={{ width: '92%' }} />
                <div className="h-4 animate-pulse-soft rounded bg-slate-200 dark:bg-slate-700" style={{ width: '78%' }} />
                <div className="h-4 animate-pulse-soft rounded bg-slate-200 dark:bg-slate-700" style={{ width: '64%' }} />
                {progress && (
                  <p className="pt-1 text-xs text-slate-500">
                    Translating part {progress.done} of {progress.total}…
                  </p>
                )}
              </div>
            ) : translatedText ? (
              <p className="whitespace-pre-wrap break-words">{translatedText}</p>
            ) : (
              <p className="text-slate-400">Your translation will appear here.</p>
            )}
          </div>
          {error && !isLoading && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:p-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {languagesLoading
            ? 'Loading language list…'
            : `${languages.length} languages supported`}
          {' · '}Free tier — long texts are split automatically.
        </p>
        <button
          onClick={translate}
          disabled={isLoading || !sourceText.trim() || overLimit}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg disabled:active:scale-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Translating…
            </>
          ) : (
            <>
              <Languages className="h-4 w-4" aria-hidden /> Translate
            </>
          )}
        </button>
      </div>
      {overLimit && (
        <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-xs font-medium text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
          Text exceeds the {MAX_CHARS.toLocaleString()}-character limit — shorten it to translate.
        </p>
      )}
    </section>
  );
}
