import { describe, expect, it } from 'vitest';
import { detectLanguageCode } from './detection';

describe('detectLanguageCode', () => {
  it('detects English in a paragraph', async () => {
    await expect(
      detectLanguageCode(
        'Hello everyone, welcome to our meeting today. We will discuss the quarterly results and plan for next month together.',
      ),
    ).resolves.toBe('en');
  });

  it('detects Urdu', async () => {
    await expect(detectLanguageCode('آپ کیسے ہیں؟ میں بالکل ٹھیک ہوں، آپ کا بہت شکریہ')).resolves.toBe('ur');
  });

  it('detects French in a paragraph', async () => {
    await expect(
      detectLanguageCode(
        'Je voudrais réserver une table pour deux personnes ce soir au restaurant près de la gare, s’il vous plaît.',
      ),
    ).resolves.toBe('fr');
  });

  it('detects Spanish in a paragraph', async () => {
    await expect(
      detectLanguageCode(
        'Buenos días a todos, hoy vamos a hablar sobre los resultados del trimestre y los planes para el futuro próximo.',
      ),
    ).resolves.toBe('es');
  });

  it('returns undefined for very short text', async () => {
    await expect(detectLanguageCode('Hi')).resolves.toBeUndefined();
    await expect(detectLanguageCode('')).resolves.toBeUndefined();
  });

  it('returns undefined for ambiguous short text instead of guessing wrong', async () => {
    // "Good morning" is misdetected by trigram models; we must not claim it.
    await expect(detectLanguageCode('Good morning')).resolves.toBeUndefined();
  });
});
