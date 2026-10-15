import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, HistoryEntry, ProviderId, Toast, TranslateStatus } from '../types';
import { TranslationError } from '../types';
import { createProvider } from '../services/providers';
import { addHistory, loadHistory } from '../services/storage';
import { detectLanguageCode } from '../services/detection';
import { AUTO_DETECT, languageByCode } from '../data/languages';

export const MAX_CHARS = 5000;

let toastId = 0;
const makeToast = (kind: Toast['kind'], message: string): Toast => ({ id: ++toastId, kind, message });

export interface TranslatorOptions {
  /** When true, successful translations are NOT saved to localStorage history. */
  skipLocalHistory?: boolean;
  /** Called after every successful translation (used to sync server history). */
  onTranslated?: (entry: {
    sourceText: string;
    translatedText: string;
    source: string;
    target: string;
    detectedSource?: string;
    provider: ProviderId;
  }) => void;
}

export function useTranslator(settings: AppSettings, opts: TranslatorOptions = {}) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>(AUTO_DETECT);
  const [targetLang, setTargetLang] = useState<string>('ur');
  const [status, setStatus] = useState<TranslateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [detectedSource, setDetectedSource] = useState<string | undefined>();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const pushToast = useCallback((kind: Toast['kind'], message: string) => {
    const t = makeToast(kind, message);
    setToasts((prev) => [...prev.slice(-2), t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Abort in-flight translation when the provider config changes.
  useEffect(() => {
    abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.provider, settings.myMemoryEmail, settings.libreTranslateUrl, settings.libreTranslateKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const provider = useMemo(
    () =>
      createProvider(settings.provider, {
        email: settings.myMemoryEmail,
        libreUrl: settings.libreTranslateUrl,
        libreKey: settings.libreTranslateKey,
      }),
    [settings],
  );

  const translate = useCallback(async () => {
    const text = sourceText.trim();
    if (!text) {
      setError('Enter some text to translate first.');
      pushToast('error', 'Enter some text to translate first.');
      return;
    }
    if (!provider.isConfigured()) {
      const msg =
        settings.provider === 'libretranslate'
          ? 'Set your LibreTranslate server URL in Settings first.'
          : 'Translation provider is not configured.';
      setError(msg);
      pushToast('error', msg);
      return;
    }

    // Same-language shortcut — no API call needed.
    if (sourceLang !== AUTO_DETECT && sourceLang === targetLang) {
      setTranslatedText(sourceText);
      setDetectedSource(undefined);
      setStatus('success');
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);
    setProgress(null);
    try {
      // Client-side detection is deterministic; the provider's own
      // `detectedLanguage` field is flaky, so it serves only as fallback.
      const clientDetected = sourceLang === AUTO_DETECT ? await detectLanguageCode(text) : undefined;
      const res = await provider.translate({
        text,
        source: sourceLang,
        target: targetLang,
        signal: controller.signal,
        onProgress: (done, total) => setProgress(total > 1 ? { done, total } : null),
      });
      const detected = clientDetected || res.detectedSource;
      setTranslatedText(res.text);
      setDetectedSource(detected);
      setStatus('success');
      const entryData = {
        sourceText: text,
        translatedText: res.text,
        source: sourceLang,
        target: targetLang,
        detectedSource: detected,
        provider: res.provider,
      };
      if (optsRef.current.skipLocalHistory) {
        optsRef.current.onTranslated?.(entryData);
      } else {
        setHistory(addHistory(entryData));
      }
    } catch (err) {
      if (err instanceof TranslationError && err.code === 'aborted') {
        setStatus('idle');
        return;
      }
      const message = err instanceof Error ? err.message : 'Translation failed. Please try again.';
      setError(message);
      setStatus('error');
      pushToast('error', message);
    } finally {
      setProgress(null);
    }
  }, [sourceText, sourceLang, targetLang, provider, settings.provider, pushToast]);

  const swap = useCallback(() => {
    if (status === 'loading') return;
    const newSource = sourceLang === AUTO_DETECT ? detectedSource || 'en' : sourceLang;
    setSourceLang(targetLang);
    setTargetLang(newSource);
    setSourceText(translatedText);
    setTranslatedText('');
    setDetectedSource(undefined);
    setStatus('idle');
    setError(null);
  }, [sourceLang, targetLang, translatedText, detectedSource, status]);

  const clearAll = useCallback(() => {
    abortRef.current?.abort();
    setSourceText('');
    setTranslatedText('');
    setDetectedSource(undefined);
    setStatus('idle');
    setError(null);
    setProgress(null);
  }, []);

  const restoreEntry = useCallback((entry: HistoryEntry) => {
    setSourceLang(entry.source);
    setTargetLang(entry.target);
    setSourceText(entry.sourceText);
    setTranslatedText(entry.translatedText);
    setDetectedSource(entry.detectedSource);
    setStatus('success');
    setError(null);
  }, []);

  const detectedLabel = detectedSource
    ? (languageByCode(detectedSource)?.name ?? detectedSource)
    : null;

  return {
    sourceText, setSourceText,
    translatedText,
    sourceLang, setSourceLang,
    targetLang, setTargetLang,
    status, error, detectedSource, detectedLabel, progress,
    history, setHistory,
    toasts, pushToast, dismissToast,
    translate, swap, clearAll, restoreEntry,
    isLoading: status === 'loading',
  };
}
