import { languageByCode } from '../data/languages';
// NOTE: `franc` is intentionally NOT imported statically — it is loaded via
// dynamic import() inside detectLanguageCode so its trigram data ships in a
// separate lazy chunk instead of bloating the main bundle.

/**
 * Client-side language detection (offline, instant, deterministic).
 *
 * The translation provider's own `detectedLanguage` field proved unreliable
 * in live testing (present for some inputs, absent for others), so the app
 * detects locally with franc and maps ISO 639-3 → the registry's codes.
 * The provider still receives `autodetect` for the actual translation;
 * this is only for display (the "Detected:" chip) and for swap.
 *
 * Honesty rule: short or ambiguous text is frequently misdetected, so a
 * language is reported ONLY when the top candidate clearly beats the
 * runner-up (score gap ≥ CONFIDENCE_GAP). Otherwise we report nothing
 * rather than a wrong guess.
 */

/** ISO 639-3 → registry code for every language we can map confidently. */
const ISO3_TO_REGISTRY: Record<string, string> = {
  eng: 'en', urd: 'ur', arb: 'ar', fra: 'fr', spa: 'es', deu: 'de', ita: 'it',
  por: 'pt', rus: 'ru', hin: 'hi', pan: 'pa', ben: 'bn', tam: 'ta', tel: 'te',
  mar: 'mr', guj: 'gu', kan: 'kn', mal: 'ml', ori: 'or', asm: 'as', nep: 'ne',
  sin: 'si', tha: 'th', vie: 'vi', ind: 'id', msa: 'ms', tur: 'tr', fas: 'fa',
  pes: 'fa', heb: 'he', ell: 'el', pol: 'pl', ukr: 'uk', nld: 'nl', swe: 'sv',
  dan: 'da', nob: 'no', nno: 'no', fin: 'fi', hun: 'hu', ces: 'cs', slk: 'sk',
  ron: 'ro', bul: 'bg', hrv: 'hr', srp: 'sr', bos: 'bs', slv: 'sl', lit: 'lt',
  lav: 'lv', est: 'et', mlt: 'mt', isl: 'is', gle: 'ga', cym: 'cy', eus: 'eu',
  cat: 'ca', glg: 'gl', afr: 'af', sqi: 'sq', amh: 'am', hye: 'hy', aze: 'az',
  bel: 'be', kat: 'ka', kaz: 'kk', kir: 'ky', uzb: 'uz', tgk: 'tg', tuk: 'tk',
  mon: 'mn', khm: 'km', lao: 'lo', mya: 'my', swa: 'sw', hau: 'ha', ibo: 'ig',
  yor: 'yo', som: 'so', zul: 'zu', xho: 'xh', sot: 'st', nso: 'nso', sna: 'sn',
  lin: 'ln', lug: 'lg', kin: 'rw', nya: 'ny', orm: 'om', tir: 'ti', pus: 'ps',
  snd: 'sd', uig: 'ug', yid: 'yi', div: 'dv', kur: 'ku', ckb: 'ckb', hmn: 'hmn',
  jav: 'jv', sun: 'su', ceb: 'ceb', tgl: 'fil', haw: 'haw', mri: 'mi', smo: 'sm',
  lat: 'la', epo: 'eo', que: 'qu', grn: 'gn', aym: 'ay', hat: 'ht', ewe: 'ee',
  bam: 'bm', fry: 'fy', mni: 'mni', lus: 'lus', mai: 'mai', bho: 'bho',
  doi: 'doi', gom: 'gom', kri: 'kri', ilo: 'ilo', gla: 'gd', jpn: 'ja', kor: 'ko',
  cmn: 'zh-CN', zho: 'zh-CN', yue: 'zh-TW',
};

const WHITELIST = Object.keys(ISO3_TO_REGISTRY);
const CONFIDENCE_GAP = 0.15;
const MIN_LENGTH = 10;

/**
 * Detect the language of `text`. Returns a registry language code, or
 * undefined when the text is too short, ambiguous, or not confidently
 * identified. Never guesses wildly — no result beats a wrong result.
 */
export async function detectLanguageCode(text: string): Promise<string | undefined> {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) return undefined;
  let ranked: Array<[string, number]>;
  try {
    const { francAll } = await import('franc');
    ranked = francAll(trimmed, { minLength: MIN_LENGTH, only: WHITELIST }) as Array<[string, number]>;
  } catch {
    return undefined;
  }
  if (!ranked.length || ranked[0][0] === 'und') return undefined;
  const [topLang, topScore] = ranked[0];
  const runnerUpScore = ranked[1]?.[1] ?? 0;
  if (topScore - runnerUpScore < CONFIDENCE_GAP) return undefined; // too ambiguous
  const code = ISO3_TO_REGISTRY[topLang];
  return code && languageByCode(code) ? code : undefined;
}
