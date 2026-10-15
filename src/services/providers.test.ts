import { describe, expect, it, vi, afterEach } from 'vitest';
import { chunkText, MyMemoryProvider } from './providers';
import { TranslationError } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkText('Hello world')).toEqual(['Hello world']);
  });

  it('keeps every chunk within the limit', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(' ');
    const chunks = chunkText(text, 450);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(450);
    expect(chunks.join('')).toBe(text);
  });

  it('preserves paragraph breaks', () => {
    const chunks = chunkText('First paragraph.\n\nSecond paragraph.');
    expect(chunks.join('')).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('hard-splits a single over-long sentence', () => {
    const long = 'x'.repeat(1000);
    const chunks = chunkText(long, 450);
    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toBe(long);
  });

  it('handles Urdu/Arabic sentence delimiters', () => {
    const text = 'یہ پہلا جملہ ہے۔ یہ دوسرا جملہ ہے۔';
    const chunks = chunkText(text, 20);
    expect(chunks.join('')).toBe(text);
  });
});

describe('MyMemoryProvider', () => {
  const provider = new MyMemoryProvider();

  it('translates and returns detected language', async () => {
    mockFetchOnce({
      responseData: { translatedText: 'Hello World' },
      responseStatus: 200,
      responseDetails: '',
      detectedLanguage: 'fr',
    });
    const res = await provider.translate({ text: 'Bonjour le monde', source: 'auto', target: 'en' });
    expect(res.text).toBe('Hello World');
    expect(res.detectedSource).toBe('fr');
    expect(res.provider).toBe('mymemory');
  });

  it('uses autodetect langpair for auto source', async () => {
    const mock = mockFetchOnce({
      responseData: { translatedText: 'Hola' },
      responseStatus: 200,
      responseDetails: '',
    });
    await provider.translate({ text: 'Hello', source: 'auto', target: 'es' });
    const url = mock.mock.calls[0][0] as string;
    expect(url).toContain('langpair=autodetect%7Ces');
  });

  it('rejects empty input without calling the API', async () => {
    const mock = mockFetchOnce({});
    await expect(provider.translate({ text: '   ', source: 'en', target: 'es' })).rejects.toMatchObject({
      code: 'empty',
    });
    expect(mock).not.toHaveBeenCalled();
  });

  it('splits long text into multiple requests', async () => {
    const mock = mockFetchOnce({
      responseData: { translatedText: 'chunk' },
      responseStatus: 200,
      responseDetails: '',
    });
    const text = 'This is a sentence. '.repeat(40); // ~800 chars
    const res = await provider.translate({ text, source: 'en', target: 'es' });
    expect(mock.mock.calls.length).toBeGreaterThan(1);
    expect(res.chunks).toBe(mock.mock.calls.length);
    expect(res.text).toBe('chunk'.repeat(mock.mock.calls.length));
  });

  it('maps quota exhaustion to a quota error', async () => {
    mockFetchOnce({
      responseData: { translatedText: '' },
      responseStatus: 403,
      responseDetails: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY',
    });
    await expect(provider.translate({ text: 'Hello', source: 'en', target: 'es' })).rejects.toMatchObject({
      code: 'quota',
    });
  });

  it('maps HTTP 429 to a rate_limit error', async () => {
    mockFetchOnce({}, false, 429);
    await expect(provider.translate({ text: 'Hello', source: 'en', target: 'es' })).rejects.toMatchObject({
      code: 'rate_limit',
    });
  });

  it('maps network failure to a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const err = await provider.translate({ text: 'Hello', source: 'en', target: 'es' }).catch((e) => e);
    expect(err).toBeInstanceOf(TranslationError);
    expect((err as TranslationError).code).toBe('network');
  });

  it('honours an AbortSignal', async () => {
    mockFetchOnce({
      responseData: { translatedText: 'chunk' },
      responseStatus: 200,
      responseDetails: '',
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.translate({ text: 'Hello', source: 'en', target: 'es', signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'aborted' });
  });
});
