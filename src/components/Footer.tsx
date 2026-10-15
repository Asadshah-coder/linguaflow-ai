import { Globe, MoonStar, Volume2, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Auto-detect',
    text: 'Source language is detected automatically — just paste and translate.',
  },
  {
    icon: Globe,
    title: '100+ languages',
    text: 'Full bidirectional translation across every language the provider supports.',
  },
  {
    icon: Volume2,
    title: 'Listen aloud',
    text: 'Built-in text-to-speech reads translations in their native voice.',
  },
  {
    icon: MoonStar,
    title: 'Dark mode + history',
    text: 'Easy on the eyes at night; recent translations saved privately on-device.',
  },
];

export default function Footer() {
  return (
    <footer className="mx-auto mt-14 max-w-6xl px-4 pb-10 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="card !shadow-md p-5">
            <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-600 dark:text-indigo-400">
              <f.icon className="h-[18px] w-[18px]" aria-hidden />
            </div>
            <h3 className="text-sm font-bold">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{f.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>
          Translations by <span className="font-semibold">MyMemory</span> (Translated Labs) — free tier.
          LibreTranslate option for self-hosted setups.
        </p>
        <p>LinguaFlow AI · MIT License · No account, no tracking — your text goes only to the translation API.</p>
      </div>
    </footer>
  );
}
