# LinguaFlow AI — All-Language Translator

A free, fast, full-stack web translator. Paste any text, pick from **100+ languages** (or let it auto-detect), and get instant translations — no API key required. Sign in to sync your translation history across devices.

Built with **React 19 + Vite + TypeScript + Tailwind CSS** frontend and a **FastAPI + SQLAlchemy** backend, with a pluggable translation-provider architecture.

---

## Features

- **100+ languages, bidirectional** — language list built from the provider's real capabilities
- **Automatic source-language detection** — client-side via `franc` (offline, lazy-loaded),
  shown as a "Detected:" chip only when confident; never guesses on short/ambiguous text
- **Searchable language dropdowns** with keyboard navigation (↑/↓, Enter, Esc)
- **Swap languages** button (preserves text; uses detected language when source was auto)
- **Translate / Copy / Paste / Clear** controls, **Ctrl+Enter** shortcut
- **Character counter** with a 5,000-char limit; long texts are **auto-chunked** on sentence boundaries
- **Text-to-speech** (browser Web Speech API, native voices per language)
- **User accounts** — email + password auth (Argon2 hashing, JWT), sign-in modal, session restore
- **Synced translation history** — signed-in users' history lives in the database (per-user isolated); guests keep local `localStorage` history
- **Light & dark mode** (no flash on load)
- **Right-to-left rendering** for Urdu, Arabic, Hebrew, Persian, Pashto, Sindhi, Uyghur, Yiddish, Dhivehi, Sorani Kurdish
- **Accessible notifications** (toasts), loading skeletons, progress for multi-part translations
- **Two providers**: MyMemory (default, free, no key) and LibreTranslate (self-hosted, configurable in Settings)

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 3, Lucide icons |
| Build | Vite 8 |
| Translation | MyMemory API (default) · LibreTranslate (optional) |
| Speech | Web Speech API (`speechSynthesis`) |
| Persistence | `localStorage` (settings, theme, history) |
| Tests | Vitest (28 frontend) + pytest (15 backend) |
| Auth | Argon2 password hashing, JWT (7-day expiry) |
| Database | SQLite (dev) → PostgreSQL (prod) via `DATABASE_URL` |

### Architecture

```
├── src/                   # React frontend
│   ├── components/        # Header, TranslatorCard, LanguageSelector, SettingsPanel,
│   │                      # HistoryDrawer, AuthModal, Toasts, Footer
│   ├── data/languages.ts  # 100+ language registry (code, native name, RTL, TTS tag)
│   ├── hooks/             # useTranslator (translation state machine), useAuth
│   ├── services/
│   │   ├── api.ts         # backend API client (auth + history)
│   │   ├── providers.ts   # TranslationProvider interface, chunking, error mapping
│   │   │                  # MyMemoryProvider (auto-chunk ≤450 chars) +
│   │   │                  # LibreTranslateProvider (configurable endpoint)
│   │   ├── detection.ts   # franc-based auto-detect, lazy chunk, confidence-gated
│   │   ├── speech.ts      # Web Speech API wrapper
│   │   └── storage.ts     # settings + guest-history persistence
│   └── types.ts           # shared domain types
└── backend/               # FastAPI backend
    └── app/
        ├── main.py        # app, CORS, routers, serves built frontend in prod
        ├── config.py      # env-based settings
        ├── database.py    # SQLAlchemy engine/session
        ├── models.py      # User, HistoryEntry
        ├── schemas.py     # Pydantic request/response models
        ├── security.py    # Argon2 hashing + JWT
        ├── deps.py        # get_current_user
        └── routers/       # auth (register/login/me), history (CRUD)
```

**Design note:** translation itself stays client-side (browser → MyMemory directly).
Proxying it through our backend would funnel every user's quota through one server
IP — worse for everyone. The backend owns identity + history only.

Providers implement a common `TranslationProvider` interface, so adding DeepL / Google /
Microsoft later means one new class — no UI changes.

## Getting started

**Prerequisites:** Node.js 18+ and npm · Python 3.11+ (backend).

```bash
git clone https://github.com/<your-username>/linguaflow-ai.git
cd linguaflow-ai
```

**Backend** (terminal 1):
```bash
cd backend
cp .env.example .env   # then set a real SECRET_KEY
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (terminal 2):
```bash
npm install
npm run dev            # http://localhost:5173 — /api is proxied to :8000
```

The translator works without the backend too (guest mode: local history only) —
but sign-in and synced history need it running.

### Environment configuration

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `VITE_DEFAULT_PROVIDER` | no | `mymemory` (default) or `libretranslate` |
| `VITE_MYMEMORY_EMAIL` | no | Raises MyMemory quota 50k → 500k chars/day |
| `VITE_LIBRETRANSLATE_URL` | for LibreTranslate | Your server URL, e.g. `https://translate.example.com` |
| `VITE_LIBRETRANSLATE_API_KEY` | no | Only if your server requires one |

All of these can also be set at runtime in the app's **Settings** panel (stored in the browser).

## Translation API setup

### Option A — MyMemory (default, zero setup)

Works immediately, no key needed. Anonymous quota: **50,000 chars/day** per IP.
Add any email in Settings → free key → **500,000 chars/day**. The app splits long
texts into ≤450-char chunks automatically (provider limit is 500).

Docs: https://mymemory.translated.net/doc/spec.php

### Option B — LibreTranslate (self-hosted)

1. Run a server: `docker run -d -p 5000:5000 libretranslate/libretranslate`
2. In the app: Settings → provider **LibreTranslate** → enter `http://localhost:5000`
3. The language list is fetched live from your server.

Docs: https://github.com/LibreTranslate/LibreTranslate

## Commands

```bash
npm run dev      # start dev server (proxies /api → backend :8000)
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build locally
npm test         # run Vitest unit tests (28)
npm run lint     # lint with oxlint
```

Backend:
```bash
cd backend
python -m pytest tests/ -q        # 15 tests: auth flow + history CRUD + guards
python -m uvicorn app.main:app --port 8000
```

## Testing

- **Frontend tests** (`npm test`, 28): chunking logic, MyMemory error mapping (quota /
  rate-limit / network / abort), language-registry integrity, franc detection
  confidence rules, and live-API integration (real EN→UR translation, swap, dark mode).
- **Backend tests** (`cd backend && pytest`, 15): register/login/me, duplicate/short-password/
  bad-email rejection, wrong-password guards, history CRUD, per-user isolation, 401 guards.
- **Production build** (`npm run build`): TypeScript strict check + Vite bundle.
- **Manual E2E checklist** (before release):
  1. Translate EN→UR, verify Urdu output + "Detected: English" chip.
  2. Swap languages, verify text moves correctly.
  3. Paste 2,000+ chars, verify multi-part progress and joined result.
  4. Toggle dark mode; reload — theme persists.
  5. Copy button, TTS buttons, history restore, clear-all.
  6. Mobile width (360px): panels stack, selectors usable.

## Deployment

**Single-service (recommended):** the FastAPI backend serves the built frontend,
so one service covers everything.

**Render** — New → Web Service:
- Build: `npm install && npm run build && pip install -r backend/requirements.txt`
- Start: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT` (root dir: `backend/`)
- Env: `SECRET_KEY` (long random), `DATABASE_URL` (Render Postgres)

**VPS / Hostinger** — same idea: build frontend, run uvicorn behind nginx/Caddy,
Postgres for `DATABASE_URL`.

**Frontend-only** (no login/synced history): `dist/` is still a static site —
Vercel / Netlify / Cloudflare Pages with `npm run build` → `dist`.

No secrets are needed for the default MyMemory translation setup; `SECRET_KEY`
and `DATABASE_URL` are the only production secrets.

## Supported-language limitations

- The list reflects the **MyMemory provider's actual supported languages** (verified Oct 2026),
  not "every language on Earth". LibreTranslate mode uses **your server's** live list instead.
- Quality varies by language pair — low-resource languages may be rough; that's the
  provider's MT, not the app.
- Auto-detection is provider-side and can misfire on very short or mixed-language text.
- Free-tier quotas apply (see API setup). The app surfaces quota/rate-limit errors
  with actionable messages instead of failing silently.

## API attribution & licensing

- Translations: **MyMemory** by Translated Labs (https://mymemory.translated.net) — free tier.
- Optional: **LibreTranslate** (AGPL-3.0, self-hosted) — https://github.com/LibreTranslate/LibreTranslate
- This project's code: **MIT License** (see `LICENSE`).

## Screenshots

Add genuine screenshots (not mockups) to `docs/screenshots/`:

1. `translator-light.png` — main view, light mode
2. `translator-dark.png` — main view, dark mode
3. `history.png` — history drawer open
4. `mobile.png` — 360px-wide mobile view

Then reference them here, e.g. `![Translator — light mode](docs/screenshots/translator-light.png)`.

---

Built as a portfolio-grade, zero-backend translator. PRs welcome.
