# Dhātu (ધાતુ): Project Handoff

This document is written so a new chat (or a new developer) can pick up the project
with no prior context. Read it top to bottom before making changes.

---

## 1. What this is

**Dhātu** is a web app that teaches **Gujarati to English speakers**. It is
research-based (grounded in second-language-acquisition evidence), Duolingo-inspired
in feel, but Gujarati-only. It covers sounds, script, grammar, vocabulary,
conversation practice, and a "History of Gujarat" section.

- **Live site:** https://dhatu.pages.dev
- **Support link in-app:** https://ko-fi.com/rainglade
- **Name meaning:** *dhātu* means "root" (as in a verb root), fitting a language app.

---

## 2. Tech stack and how it is deployed

- **Single-file React app.** Essentially the entire app lives in `src/App.jsx`
  (~3,000 lines): all screens, all content, all CSS, all icons. This is deliberate
  and keeps deployment trivial, but it means edits must be careful (see Gotchas).
- **Build tool:** Vite 8 (`vite build` → outputs to `dist/`).
- **Framework:** React 18 (`react`, `react-dom`). No Redux/Zustand, no router library,
  no UI component library. State is plain React hooks. Navigation is a manual
  screen state machine (see section 4).
- **No backend.** Everything is client-side. Progress is saved in the browser via
  `localStorage`.
- **Fonts:** loaded from Google Fonts inside the CSS string: **Anek Gujarati** for
  Gujarati text (class `gu`), **Inter** for Latin text.
- **Images:** the History section pulls cover images directly from Wikimedia Commons
  (`Special:FilePath/...` URLs). No local image files.
- **Hosting:** **Cloudflare Pages**, connected to a **GitHub repo**, auto-deploying
  on every push to the `main` branch.
  - Build command: `npm run build`
  - Build output directory: `dist`

### Deploy / update flow (current)
The user updates the live site by **replacing `src/App.jsx` through the GitHub web
interface**. Because Cloudflare builds from source, replacing that one file updates
the whole app. Steps: open repo → `src` folder → edit or upload `App.jsx` → commit to
`main` → Cloudflare rebuilds automatically in a minute or two.

### Run locally
```
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build into dist/
npm run preview  # serve the built dist/ locally
```

---

## 3. IMPORTANT: the two copies of the app

There are (or were) **two versions of the same app** that must not be confused:

1. **The deployable web project**: this repo. `src/App.jsx` uses **real
   `localStorage`** for persistence via a `useLocalState` hook. **This is the source
   of truth going forward.**
2. **The in-chat artifact**: a single `.jsx` file used inside the Claude chat so the
   user could see a live preview. The Claude artifact sandbox **blocks
   `localStorage`**, so that version used plain in-memory `useState` instead of
   `useLocalState`, and omitted the reset-progress logic.

**They are otherwise identical.** The web `src/App.jsx` was last synced FROM the
artifact, then had the persistence pieces re-applied. The ONLY differences are:

- `src/App.jsx` has a `useLocalState(key, initial)` hook (defined just above
  `export default function App()`).
- Persisted state uses `useLocalState("dhatu_...", default)` instead of `useState`.
- There is an `onboarded` flag, a `confirmReset` flag, a `resetAllProgress()`
  function, and a "Reset progress" UI in the Profile screen.

### If you need an in-chat live preview in a new chat
Take `src/App.jsx` and make a temporary artifact copy where you:
- delete the `useLocalState` hook,
- change each `useLocalState("dhatu_x", d)` back to `useState(d)`,
- change `const [screen, setScreen] = useState(() => (onboarded ? "learn" : "onboarding"));`
  back to `useState("onboarding");` and drop the `onboarded` line,
- (optional) drop the reset UI.

Do the real work in `src/App.jsx` and treat the artifact as a disposable preview, so
the two do not drift again.

---

## 4. Architecture of `src/App.jsx`

Rough top-to-bottom layout of the file:

1. **Imports**: `React, { useState, useEffect, useRef }`.
2. **TTS helpers**: `_loadVoices`, `_pickVoice`, `speak`, `speakEn`, `speakGu`,
   `stopSpeak`. Uses the browser Web Speech API. Prefers Google/Neural/Natural voices.
3. **`useLocalState` hook**: localStorage-backed state (web version only).
4. **Small utilities**: `shuffle`, a Levenshtein-based similarity for speech checking, etc.
5. **`Ic` object**: all SVG icons as small components (`Ic.learn`, `Ic.check`,
   `Ic.trophy`, topic icons like `Ic.family`, `Ic.bowl`, `Ic.film`, etc.). A few icons
   (e.g. `Ic.coffee`) are assigned after the object literal via `Ic.coffee = (p) => ...`.
6. **`CSS`**: one big template-string stylesheet injected via `<style>{CSS}</style>`.
   Contains the recessed/bevel design tokens in `:root` and all component styles,
   plus responsive `@media (min-width:820px)` and `(min-width:1200px)` rules.
7. **Content data** (all authored inline, Gujarati verified):
   - `UNITS`: 6 units, each with `lessons` (`{id, label, kind?}`).
     `LESSON_ORDER` is the flattened lesson id list.
   - `LESSON_ICON` map + `lessonIcon(l)` helper: topic icon per lesson.
   - Lesson exercise content (intro, hvpt, letter, match, listen, build, fill, note,
     speak). **HVPT** = High-Variability Phonetic Training, the research differentiator.
   - `GRAMMAR` (6 topics), `CONVERSATIONS` (3), `TOPICS` (vocab lists).
   - Script data: `VOWELS`, `CONS_ROWS` (7 phonetic groups), `CONJUNCTS`, `NUMERALS`,
     `SIGNS`. Frequency-ordered views: `VOWELS_FREQ`, `CONS_FREQ` (with their
     `_ORDER` arrays), and `SCRIPT_LEARN_POOL` (common-first mix for the letter quiz).
   - History: `FP` (Wikimedia FilePath base), `CATEGORIES` (5 themes),
     `ERAS` (13 in-depth chapters, each `{id, category, yr, title, emo, img?, blurb,
     body[], site?, sources[]}`), `ERA_GU_SUMMARY` (per-era Gujarati summary).
8. **Components:** `SafeImg` (image with graceful colored-banner fallback),
   `ScriptLearn` (the letter-learning quiz screen), `WriteCanvas` (finger-trace
   canvas: **currently unused** after the script rebuild, kept but harmless),
   plus inline `TopBar`, `NavBar`, `LessonRunner`, etc. inside `App`.
9. **`App`**: holds all state and renders the current screen.

### Screen state machine
`screen` is a string; each value renders a full screen. Values:
`onboarding, learn, script, scriptLearn, review, vocab, history, profile, lesson,
complete, grammar, talk, vocabPractice`.

Bottom nav tabs: **Learn / Script (if readWrite) / Review / Vocab (if vocabTab) /
History (if showHistory) / Profile**. There is no Home tab; default screen is Learn.

### localStorage keys
`dhatu_onboarded, dhatu_readWrite, dhatu_showHistory, dhatu_vocabTab, dhatu_kaudi,
dhatu_streak, dhatu_completed, dhatu_srs, dhatu_weekHit`. `resetAllProgress()` clears
all of these.

---

## 5. Locked design decisions (do not silently change)

- **Visual style:** recessed / beveled (soft inset shadows), NOT flat Duolingo-style
  hard drop shadows. Bevel tokens live in `:root`: `--bevel-raise`, `--bevel-press`,
  `--bevel-inset`, `--bevel-soft`. Selected/correct/wrong states use colored inset
  rings, not borders.
- **Palette:** warm **maroon + gold**. Key vars: `--brand:#8A1C3B`, `--gold:#E0A63C`,
  `--diya:#F2892E`, plus ok/no greens/reds and warm neutrals. (An alternate blue/paper
  palette was considered and rejected; keep maroon/gold.)
- **Light mode only** for now.
- **Fonts:** Anek Gujarati (Gujarati) + Inter (Latin).
- **Gamification naming:** points are **Kaudi** (cowrie shell, `Ic.kaudi`); streak is a
  **diya** lamp (`Ic.diya`). No hearts, no lives.
- **Lesson icons:** each lesson shows a topic-matching icon (chat, numbers, family,
  bowl, home, blocks, link, tag, clock, steps, pen, diya, shirt, film...). Checkpoints
  and the lesson-complete medal use `Ic.trophy`.
- **Onboarding** (3 steps) sets `readWrite` and `showHistory`. If `readWrite` is false,
  the Script tab is hidden, `letter` exercises are filtered out, and romanization leads.
  The Vocab tab stays hidden until the first lesson is complete (`vocabTab`).

### Hard content/style rules (from the user)
- **NO em dashes anywhere** (in code, UI copy, or docs). Use commas, "to", or rewrite.
  Verify with: `grep -c $'\u2014' src/App.jsx` → must be `0`.
- **No AI-artifact "eyebrow"/kicker labels** above headings.
- **No Anthropic / AI branding** anywhere in the app.

---

## 6. What is done

- Full onboarding, Learn path (6 units), lessons with 9 exercise types incl. HVPT.
- Review (spaced repetition), Vocab tab with themed word lists + practice mode.
- Grammar guide (6 topics), Conversations (3), Talk practice with speech recognition.
- **Script page (rebuilt):** one scrollable page, letters ordered most-common to
  least-common, tap a letter to hear it (brief highlight), persistent "Learn the
  letters" button opening the `ScriptLearn` quiz (tests both letter→sound and
  sound→letter, common-first, awards Kaudi).
- **History (rebuilt by theme):** opens to 5 topic categories (Ancient Foundations,
  Kingdoms and Courts, Trade and the Indian Ocean, Colonial Rule and Resistance,
  Modern Gujarat); each expands to its chapters; each chapter opens an in-depth,
  sourced entry with dual "Listen in English / Listen in Gujarati" buttons. 13 chapters
  total, balanced and sourced.
- **Image covers:** 11 of 13 history chapters have verified Wikimedia Commons covers.
- **Recessed restyle** applied across every component; responsive desktop layout
  (wider grids, centered floating nav/footer bars on screens ≥820px).
- **Persistence** via localStorage; **Reset progress** control in Profile; Ko-fi
  support link in Profile.
- Verified: builds cleanly with `vite build`; 0 em dashes; 0 flat hard-shadows.

---

## 7. What is pending / next steps

1. **Audio (pipeline BUILT, not yet generated).** Decision made: option (a),
   cloud-generated audio via a script. The pipeline exists and builds cleanly;
   the user still needs to run it once with an API key, then commit the output.
   - **Playback layer** (in `src/App.jsx`, the speech helpers near the top):
     `speak()` now checks a manifest and plays a pre-recorded file when one
     exists, otherwise falls back to the old browser TTS. Purely additive, so
     the app is unchanged until audio is generated. Manifest is fetched from
     `/audio/manifest.json`; a missing manifest just means TTS-as-before.
   - **Generator:** `scripts/generate-audio.mjs` (run via `npm run audio`).
     Scans `src/App.jsx` for every pure-Gujarati string (word/phrase fields, the
     script letters, and the 13 per-era history summaries), calls a cloud TTS
     API, and writes one mp3 per phrase to `public/audio/` plus `manifest.json`.
     Idempotent (skips existing files), no npm deps (Node 18+ built-in fetch),
     supports Google (default) and Azure via env vars. About 284 phrases / 3.2k
     characters total, well within free tiers.
   - **How to finish:** follow `AUDIO.md` (get a Google Cloud TTS key, run
     `GOOGLE_TTS_KEY=... npm run audio`, commit `public/audio/`, push).
   - **Scope note:** Gujarati only for now (the silent case). English history
     narration still uses browser TTS; the generator can be extended to English
     later. Extraction is keyed on "pure Gujarati string" (has a Gujarati
     letter/digit, no Latin letters), so it auto-syncs as content changes.
2. **Two history chapters without cover images:** `vallabhi` (Maitraka-era Vallabhi
   university, a ruined site) and `nav_nirman` (the 1974 Nav Nirman protests). No
   free-licensed Wikimedia image was found for either; they currently use the clean
   `SafeImg` colored-banner + emoji fallback. Do not fabricate image URLs: verify any
   candidate with a real request first (e.g. `curl -sI -L "<FilePath URL>"` → 200).
3. **Optional:** the unused `WriteCanvas` tracing component could be re-integrated into
   the ScriptLearn flow if letter-writing practice is wanted, or removed.

---

## 8. Gotchas and conventions

- **Single huge file:** when editing `src/App.jsx`, prefer targeted string replacements
  over rewriting large blocks. After any structural edit, watch brace balance
  (a dropped `}` after editing a screen block has bitten this project before).
- **Always verify before shipping:**
  - Syntax/build: `npm run build` (from the project root; installs first if needed).
    A quick alternative during editing is esbuild:
    `npx esbuild src/App.jsx --bundle --format=esm --outfile=/tmp/t.js --external:react --external:react-dom`.
  - Em-dash sweep: `grep -c $'\u2014' src/App.jsx` must be `0`.
  - Flat-shadow sweep (should be 0): `grep -c "box-shadow:0 [0-9]px 0 " src/App.jsx`.
- **Wikimedia images:** build URLs as `FP + "<url-encoded filename>?width=1000"`.
  Filenames are case-sensitive and space-sensitive. Verify each returns HTTP 200 before
  adding. Rate-limited responses (429) mean retry after a short wait, not a bad URL.
- **`node_modules` is not in this zip** (it is git-ignored and large). Run
  `npm install` after unzipping.
- **Node version:** the existing Cloudflare build already succeeds with the current
  config, so no `.nvmrc` was added. If a future dependency bump requires a newer Node,
  set a `NODE_VERSION` environment variable in Cloudflare Pages settings or add a
  `.nvmrc` file, rather than guessing.

---

## 9. User preferences (apply in any new chat)

- **Ask questions instead of assuming** important things.
- Keep answers **factual, clean, and succinct** (not over-humanized).
- If a turn will take **more than ~10 seconds**, state a time estimate first.
- The user has **built websites but not apps**; explain app/deploy steps plainly.
- Reiterate: **no em dashes**, no AI-artifact kicker labels, no AI/Anthropic branding.

---

## 10. File map

```
dhatu-web/
├── HANDOFF.md            <- this document
├── README.md
├── AUDIO.md              <- how to generate pre-recorded audio (plain steps)
├── index.html            <- title, favicon (maroon ધા), meta
├── package.json          <- react 18, vite 8, @vitejs/plugin-react; "audio" script
├── package-lock.json
├── vite.config.js        <- react plugin, outDir dist
├── .gitignore            <- node_modules, dist, .DS_Store, *.log, .wrangler
├── scripts/
│   └── generate-audio.mjs <- cloud-TTS audio generator (npm run audio)
├── public/               <- static assets; public/audio/ appears after generating
│   └── audio/            <- generated mp3s + manifest.json (commit these)
└── src/
    ├── main.jsx          <- React entry, mounts <App/> in StrictMode
    └── App.jsx           <- THE APP (all screens, content, CSS, icons)
```

To continue in a new chat: attach this file and (ideally) `src/App.jsx`, state which of
the pending items to tackle, and confirm the audio decision if that is the next focus.
