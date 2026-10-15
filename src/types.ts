/** Core domain types for LinguaFlow AI. */

export interface Language {
  /** Provider language code, e.g. "en", "ur", "zh-CN". */
  code: string;
  /** English display name. */
  name: string;
  /** Native display name. */
  nativeName: string;
  /** Right-to-left script (Arabic, Urdu, Hebrew, …). */
  rtl?: boolean;
  /** BCP-47 tag used for text-to-speech, e.g. "ur-PK". Defaults to `code`. */
  speechCode?: string;
}

export type ProviderId = 'mymemory' | 'libretranslate';

export interface TranslateRequest {
  text: string;
  /** Source language code, or "auto" for automatic detection. */
  source: string;
  target: string;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export interface TranslateResponse {
  text: string;
  /** ISO code the provider detected, when source was "auto". */
  detectedSource?: string;
  provider: ProviderId;
  chunks: number;
}

export type TranslationErrorCode =
  | 'empty'
  | 'invalid'
  | 'network'
  | 'quota'
  | 'rate_limit'
  | 'unsupported'
  | 'config'
  | 'aborted'
  | 'unknown';

export class TranslationError extends Error {
  code: TranslationErrorCode;
  constructor(code: TranslationErrorCode, message: string) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
  }
}

export interface TranslationProvider {
  id: ProviderId;
  label: string;
  /** Translate text. Implementations handle chunking + retries. */
  translate(req: TranslateRequest): Promise<TranslateResponse>;
  /** Languages supported by this provider. */
  getLanguages(): Promise<Language[]>;
  /** Whether this provider is configured and usable. */
  isConfigured(): boolean;
}

export type TranslateStatus = 'idle' | 'loading' | 'success' | 'error';

export interface HistoryEntry {
  id: string;
  sourceText: string;
  translatedText: string;
  source: string;
  target: string;
  detectedSource?: string;
  provider: ProviderId;
  createdAt: number;
}

export interface AppSettings {
  provider: ProviderId;
  myMemoryEmail: string;
  libreTranslateUrl: string;
  libreTranslateKey: string;
  theme: 'light' | 'dark';
}

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}
