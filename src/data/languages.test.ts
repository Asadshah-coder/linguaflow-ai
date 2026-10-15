import { describe, expect, it } from 'vitest';
import { LANGUAGES, AUTO_DETECT, languageByCode, languageName } from './languages';

const REQUIRED = ['en', 'ur', 'ar', 'zh-CN', 'zh-TW', 'es', 'fr', 'hi', 'pa', 'de', 'ja', 'ko', 'pt', 'ru', 'tr'];

describe('language registry', () => {
  it('contains every required language', () => {
    for (const code of REQUIRED) {
      expect(languageByCode(code), `missing ${code}`).toBeDefined();
    }
  });

  it('has unique codes', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has 100+ languages', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(100);
  });

  it('every entry has a name and native name', () => {
    for (const l of LANGUAGES) {
      expect(l.name.trim().length).toBeGreaterThan(0);
      expect(l.nativeName.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks RTL languages', () => {
    for (const code of ['ar', 'ur', 'he', 'fa', 'ps']) {
      expect(languageByCode(code)?.rtl, `${code} should be rtl`).toBe(true);
    }
    expect(languageByCode('en')?.rtl).not.toBe(true);
  });

  it('resolves display names, with auto-detect label', () => {
    expect(languageName('ur')).toBe('Urdu');
    expect(languageName(AUTO_DETECT)).toBe('Auto-detect');
    expect(languageName('xx-unknown')).toBe('xx-unknown');
  });
});
