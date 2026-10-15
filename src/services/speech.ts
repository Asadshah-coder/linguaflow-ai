import { languageByCode } from '../data/languages';

/**
 * Text-to-speech via the browser's built-in Web Speech API.
 * No API key, no network — voices come from the OS/browser.
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(langCode: string): SpeechSynthesisVoice | null {
  const lang = languageByCode(langCode);
  const target = (lang?.speechCode || langCode).toLowerCase();
  const base = target.split('-')[0];
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang.toLowerCase() === target) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ||
    null
  );
}

/** Speak text aloud. Returns false when speech isn't available. */
export function speak(text: string, langCode: string): boolean {
  if (!speechSupported() || !text.trim()) return false;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const lang = languageByCode(langCode);
  utter.lang = lang?.speechCode || langCode;
  const voice = pickVoice(langCode);
  if (voice) utter.voice = voice;
  utter.rate = 0.95;
  window.speechSynthesis.speak(utter);
  return true;
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

// Warm up the voice list (browsers load it asynchronously).
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
