import type { Language, ProviderId, TranslateRequest, TranslateResponse, TranslationProvider } from '../types';
import { TranslationError } from '../types';
import { LANGUAGES } from '../data/languages';

/**
 * Split long text into chunks the provider accepts, breaking on sentence
 * boundaries so translations stay coherent. MyMemory rejects queries over
 * 500 chars (anonymous) — we stay safely under that.
 */
export function chunkText(text: string, maxChars = 450): string[] {
  const chunks: string[] = [];
  // Split on paragraph breaks first, then on sentence boundaries.
  const paragraphs = text.split(/(\n+)/);
  const sentences: string[] = [];
  for (const p of paragraphs) {
    if (/^\n+$/.test(p)) {
      sentences.push(p);
      continue;
    }
    // Keep the delimiter attached to the sentence it ends.
    const parts = p.match(/[^.!?।۔。！？\n]+[.!?।۔。！？]*\s*|.+$/g);
    if (parts) sentences.push(...parts);
    else sentences.push(p);
  }

  let current = '';
  const push = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };
  for (const s of sentences) {
    if (/^\n+$/.test(s)) {
      // Preserve paragraph breaks as their own chunk.
      push();
      chunks.push(s);
      continue;
    }
    if (s.length > maxChars) {
      // A single over-long sentence: hard-split it (prefer word boundaries).
      push();
      chunks.push(...hardSplit(s, maxChars));
      continue;
    }
    if ((current + s).length > maxChars) push();
    current += s;
  }
  push();
  return chunks.filter((c) => c.length > 0);
}

/** Hard-split an over-long sentence, preferring word boundaries. */
function hardSplit(s: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = s;
  while (rest.length > maxChars) {
    let cut = maxChars;
    const sp = rest.lastIndexOf(' ', maxChars);
    if (sp > maxChars * 0.5) cut = sp + 1; // keep the space with the first part
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

interface MyMemoryApiResponse {
  responseData: { translatedText: string; match?: number };
  responseStatus: number | string;
  responseDetails?: string;
  quotaFinished?: boolean;
  detectedLanguage?: string;
  matches?: Array<{ source?: string | false; target?: string | false }>;
}

const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';

function mapMyMemoryError(status: number | string, details: string): TranslationError {
  const s = String(status);
  const d = (details || '').toUpperCase();
  if (s === '429' || d.includes('TOO MANY REQUESTS')) {
    return new TranslationError('rate_limit', 'Too many requests — please wait a few seconds and try again.');
  }
  if (
    d.includes('YOU USED ALL AVAILABLE FREE TRANSLATIONS') ||
    d.includes('QUOTA') ||
    d.includes('DAILY LIMIT')
  ) {
    return new TranslationError(
      'quota',
      'The free daily translation quota is exhausted. Add your email in Settings for a higher limit, or try again tomorrow.',
    );
  }
  if (d.includes('INVALID EMAIL')) {
    return new TranslationError('config', 'The email configured for MyMemory is invalid. Update it in Settings.');
  }
  if (d.includes('INVALID TARGET LANGUAGE') || d.includes('INVALID SOURCE LANGUAGE')) {
    return new TranslationError('unsupported', 'This language pair is not supported by the provider.');
  }
  if (d.includes('QUERY LENGTH LIMIT EXCEEDED')) {
    return new TranslationError('invalid', 'Text is too long for a single request. Try shorter text.');
  }
  if (s === '403') {
    return new TranslationError('unknown', `Provider refused the request (403): ${details || 'no details'}`);
  }
  return new TranslationError('unknown', `Translation failed (${s}): ${details || 'no details'}`);
}

/**
 * MyMemory (Translated Labs) — free, documented, no API key required.
 * https://mymemory.translated.net/doc/spec.php
 */
export class MyMemoryProvider implements TranslationProvider {
  id: ProviderId = 'mymemory';
  label = 'MyMemory';
  private email: string;

  constructor(email = '') {
    this.email = email.trim();
  }

  isConfigured(): boolean {
    return true; // works without any credentials
  }

  async getLanguages(): Promise<Language[]> {
    return LANGUAGES;
  }

  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    const text = req.text.trim();
    if (!text) throw new TranslationError('empty', 'Enter some text to translate.');

    const chunks = chunkText(text);
    const out: string[] = [];
    let detected: string | undefined;

    for (let i = 0; i < chunks.length; i++) {
      if (req.signal?.aborted) throw new TranslationError('aborted', 'Translation cancelled.');
      const chunk = chunks[i];
      if (/^\n+$/.test(chunk)) {
        out.push(chunk);
        continue;
      }
      const params = new URLSearchParams({
        q: chunk,
        langpair: `${req.source === 'auto' ? 'autodetect' : req.source}|${req.target}`,
      });
      if (this.email) params.set('de', this.email);

      let res: Response;
      try {
        res = await fetch(`${MYMEMORY_ENDPOINT}?${params.toString()}`, { signal: req.signal });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new TranslationError('aborted', 'Translation cancelled.');
        }
        throw new TranslationError('network', 'Network error — check your connection and try again.');
      }
      if (!res.ok) {
        throw mapMyMemoryError(res.status, res.statusText);
      }
      let data: MyMemoryApiResponse;
      try {
        data = (await res.json()) as MyMemoryApiResponse;
      } catch {
        throw new TranslationError('unknown', 'The provider returned an unreadable response.');
      }
      const status = Number(data.responseStatus);
      if (status !== 200) {
        throw mapMyMemoryError(data.responseStatus, data.responseDetails ?? '');
      }
      if (data.quotaFinished) {
        throw new TranslationError(
          'quota',
          'The free daily translation quota is exhausted. Add your email in Settings for a higher limit, or try again tomorrow.',
        );
      }
      out.push(data.responseData.translatedText ?? '');
      if (data.detectedLanguage) detected = data.detectedLanguage;
      req.onProgress?.(i + 1, chunks.length);
    }

    // If auto-detect only surfaced a regional variant (e.g. "en-GB"), keep the
    // raw value — the UI maps it to a display name where possible.
    return { text: out.join(''), detectedSource: detected, provider: this.id, chunks: chunks.length };
  }
}

interface LibreLanguage {
  code: string;
  name: string;
}

/**
 * LibreTranslate — open-source, self-hostable translation API.
 * https://github.com/LibreTranslate/LibreTranslate
 * Requires a running instance (public demo or your own server).
 */
export class LibreTranslateProvider implements TranslationProvider {
  id: ProviderId = 'libretranslate';
  label = 'LibreTranslate';
  private baseUrl: string;
  private apiKey: string;
  private languageCache: Language[] | null = null;

  constructor(baseUrl: string, apiKey = '') {
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '');
    this.apiKey = apiKey.trim();
  }

  isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  async getLanguages(): Promise<Language[]> {
    if (this.languageCache) return this.languageCache;
    if (!this.isConfigured()) throw new TranslationError('config', 'Set your LibreTranslate server URL in Settings first.');
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/languages`);
    } catch {
      throw new TranslationError('network', 'Could not reach the LibreTranslate server. Check the URL in Settings.');
    }
    if (!res.ok) throw new TranslationError('unknown', `LibreTranslate server error (${res.status}).`);
    const list = (await res.json()) as LibreLanguage[];
    this.languageCache = list.map((l) => {
      const known = LANGUAGES.find((k) => k.code === l.code);
      return {
        code: l.code,
        name: l.name || known?.name || l.code,
        nativeName: known?.nativeName || l.name || l.code,
        rtl: known?.rtl,
        speechCode: known?.speechCode,
      };
    });
    return this.languageCache;
  }

  async translate(req: TranslateRequest): Promise<TranslateResponse> {
    if (!this.isConfigured()) throw new TranslationError('config', 'Set your LibreTranslate server URL in Settings first.');
    const text = req.text.trim();
    if (!text) throw new TranslationError('empty', 'Enter some text to translate.');
    // LibreTranslate accepts longer payloads; still chunk defensively.
    const chunks = chunkText(text, 4000);
    const out: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (/^\n+$/.test(chunk)) {
        out.push(chunk);
        continue;
      }
      const body: Record<string, string> = {
        q: chunk,
        source: req.source,
        target: req.target,
        format: 'text',
      };
      if (this.apiKey) body.api_key = this.apiKey;
      let res: Response;
      try {
        res = await fetch(`${this.baseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: req.signal,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new TranslationError('aborted', 'Translation cancelled.');
        }
        throw new TranslationError('network', 'Could not reach the LibreTranslate server.');
      }
      if (res.status === 429) throw new TranslationError('rate_limit', 'LibreTranslate rate limit hit — slow down and retry.');
      if (res.status === 400) throw new TranslationError('unsupported', 'This language pair is not supported by your LibreTranslate server.');
      if (res.status === 403) throw new TranslationError('config', 'LibreTranslate rejected the API key.');
      if (!res.ok) throw new TranslationError('unknown', `LibreTranslate server error (${res.status}).`);
      const data = (await res.json()) as { translatedText?: string; error?: string };
      if (data.error) throw new TranslationError('unknown', `LibreTranslate: ${data.error}`);
      out.push(data.translatedText ?? '');
      req.onProgress?.(i + 1, chunks.length);
    }
    return { text: out.join(''), provider: this.id, chunks: chunks.length };
  }
}

export function createProvider(id: ProviderId, opts: { email: string; libreUrl: string; libreKey: string }): TranslationProvider {
  return id === 'libretranslate'
    ? new LibreTranslateProvider(opts.libreUrl, opts.libreKey)
    : new MyMemoryProvider(opts.email);
}
