# Dhātu (ધાતુ): Project Handoff

Read this top to bottom before making changes. It is written so a new chat or
developer can continue with no prior context.

---

## 1. What this is

**Dhātu** is a web app that teaches **Gujarati to English speakers**:
research-based, Duolingo-inspired in feel but Gujarati-only. It covers sounds,
script, grammar, vocabulary, conversation practice, and a **Culture** section
(history, faith, food, textiles). `dhātu` means "root" (as in a verb root).

- **Live site:** https://dhatu.pages.dev  (Cloudflare Pages, auto-deploys on push to `main`)
- **Repo:** https://github.com/rainpurl/dhatu
- **Support link in-app:** https://ko-fi.com/rainglade

---

## 2. Environment and workflow quirks (IMPORTANT, read first)

- **Working folder:** `/Users/rain/Documents/GitHub/dhatu` (GitHub Desktop clone).
  It is inside iCloud-synced Documents, which once caused the folder to vanish
  mid-session. If files act strange, suspect iCloud.
- **Node is NOT installed system-wide** on this Mac (`node`/`npm` are absent from
  PATH, no Homebrew). A working copy of Node 22 was downloaded to the scratchpad
  at:
  `/private/tmp/claude-501/-Users-rain-Documents-dhatu/e0ccfccd-3caf-4e51-bd6a-6d1cdcab137a/scratchpad/node-v22.13.1-darwin-arm64/bin`
  (may not persist across sessions; re-download Node 22 from nodejs.org if gone).
  To build: `export PATH="<that bin>:$PATH"` then `npm run build`. Vite 8 needs
  Node 20.19+ or 22.12+.
- **GitHub Desktop auto-commits and pushes** in the background. Commits you make
  on the CLI sometimes get pre-empted and land as commits named "Update App.jsx".
  This is harmless (code is preserved) but means `git push` from the CLI is
  usually unnecessary and CLI credentials are not set up (push from Desktop).
- **The user drives GitHub.** Do not assume you can push; the user pushes via
  Desktop. Commit locally; they publish.
- **Live preview is blocked** for signed-in screens: the app requires Google
  sign-in and this environment cannot complete OAuth. To eyeball UI, rasterize a
  static HTML mock of the relevant CSS with `qlmanage -t -s 500 -o <dir> f.html`
  then read the PNG. This is how the logo and Learn-path redesigns were verified.

---

## 3. Tech stack and architecture

- **Single-file React app:** essentially everything lives in `src/App.jsx`
  (~3,800 lines): all screens, content, CSS (one big template string injected via
  `<style>{CSS}</style>`), and SVG icons (the `Ic` object). Edits must be careful;
  prefer targeted string replacements and watch brace balance.
- **Build:** Vite 8 (`vite build` to `dist/`). React 18. No router (screen state
  machine via a `screen` string). No UI library. State is plain hooks.
- **Auth/DB:** Firebase (Google sign-in + Firestore). See section 4.
- **Fonts:** Anek Gujarati (class `gu`) + Inter, from Google Fonts in the CSS.
- **Images:** Culture covers/inline photos are hotlinked from Wikimedia Commons
  via `FP + "<url-encoded filename>?width=1000"` (FP = Special:FilePath base).
- **Audio:** pre-generated mp3s in `public/audio/` served as static assets.
- **Staff portal:** a separate static page at `public/staff/` served at `/staff`.

Key modules:
- `src/App.jsx`: the whole app.
- `src/firebase.js`: auth, per-user Firestore progress sync, public profiles,
  usernames, following, pokes.
- `src/firebaseConfig.js`: public Firebase web config (safe to commit).
- `scripts/generate-audio.mjs`: the audio generator (`npm run audio`).
- `public/staff/index.html`: the staff portal.
- `AUDIO.md`, `AUTH.md`: plain setup guides for the owner.

Screen values (the `screen` state): `onboarding, learn, script, scriptLearn,
review, vocab, history (Culture), profile, lesson, complete, grammar, talk,
vocabPractice, scriptLessons`. Bottom nav on mobile becomes a **left sidebar on desktop
(>=900px)**. On desktop every page **fills the full width** (`.scr` is
max-width:none with `5vw` side padding, not a centered column); list screens
(Vocab, Grammar, Review, Culture) use responsive card grids (`.cardgrid`,
`.wide-2col` = `auto-fill minmax`) so the space is used in columns.

---

## 4. Accounts (Firebase): required sign-in

- Sign-in is **required** (no guest mode), **Google only** (phone/SMS was
  rejected because SMS costs money; see the no-cost rule).
- On first sign-in the user must **pick a unique username** (enforced via a
  Firestore `usernames` registry + transaction). Changeable later in Profile.
- Per-user progress (all `dhatu_` localStorage keys) syncs to
  `users/{uid}.progress`. Cloud is authoritative on sign-in (local is cleared
  then repopulated, so an admin reset propagates).
- **Public profile** (`publicProfiles/{uid}`) exposes only username, name, photo,
  streak, Kaudi, so friends can see stats without seeing private progress.
- **Social:** follow by username, see friends' streak/Kaudi, poke them, receive
  pokes. All in the Profile tab.
- **Staff portal** at `/staff`: password gate (`rain`) plus Google sign-in
  restricted to admin UID(s); lists all users with streak/Kaudi/lessons and a
  per-user **Reset** button.

### Owner setup still required (see AUTH.md for the walkthrough)
1. Firebase console (project **dhatu-9f586**): enable **Google** sign-in; create
   **Firestore**; add `dhatu.pages.dev` to Authorized domains.
2. Paste your Firebase **User UID** into `ADMIN_UIDS` in
   `public/staff/index.html`.
3. Publish the **complete Firestore rules** from AUTH.md (covers `users`,
   `publicProfiles`, `usernames`, `pokes`, plus admin read/write).
4. Create the **pokes composite index** when Firestore prompts (one-click link on
   first query: `to` asc, `at` desc).

Until rules/index are applied, social features fail quietly (app still works).

**Sync safety (do not regress):** `loadProgressToLocal` only replaces local when
the cloud doc has real `dhatu_` progress keys; an **empty or missing cloud doc
never clears local** (it re-seeds cloud from local instead). `scheduleSave`
**skips writing an empty snapshot**. Together these prevent the data-loss bug
where an empty `{}` progress object wiped a device. Tradeoff: a staff **Reset**
(which writes `progress:{}`) will not force-wipe a device that still has local
progress; it fully resets only accounts with no local copy.

---

## 5. Audio pipeline

- All spoken Gujarati and the English Culture narration are pre-recorded mp3s in
  `public/audio/` with `manifest.json` (currently **646 clips**). The app's
  `speak()` plays a clip when the manifest has one, else falls back to browser
  TTS. A missing manifest just means TTS-as-before.
- **Voices:** Google **Chirp3-HD** (`gu-IN-Chirp3-HD-Aoede`,
  `en-US-Chirp3-HD-Aoede`), the most natural tier. These replaced robotic WaveNet.
- **Vowel IPA overrides:** four vowels (ઇ ɪ, ઐ ɛː, ઔ ɔː, ઍ æ) are synthesized by
  IPA via SSML on a WaveNet voice, because TTS mispronounces isolated glyphs.
  This is baked into the generator (`PRONUNCIATION_OVERRIDES`) so re-runs keep the
  correct sounds. ઑ was left as-is (owner said it is correct).
- **Self-heal:** the generator retries any suspiciously small (<1800 byte) clip
  with a WaveNet voice, because Chirp3-HD occasionally returns near-silence for
  very short words.
- **Pause-lists:** short Gujarati comma-lists (counts like `આઠ, નવ, દસ`, greetings,
  directions; `text.length <= 40` and every comma part `<= 14` chars) are
  synthesized on a Gujarati WaveNet voice with SSML `<break>`s so items do not run
  together. Long prose (Culture summaries) stays on Chirp3-HD. If you change this
  rule, delete the affected clips first so they regenerate.
- **Regenerating after content changes** (needs a Google TTS API key + local
  Node):
  ```
  GOOGLE_TTS_KEY=<key> npm run audio          # idempotent; skips existing clips
  # then remove orphaned clips not in the manifest:
  python3 - <<'PY'
  import json,os; d="public/audio"; m=json.load(open(d+"/manifest.json"))
  keep=set(m["items"].values())|{"manifest.json"}
  [os.remove(d+"/"+f) for f in os.listdir(d) if f.endswith(".mp3") and f not in keep]
  PY
  ```
  Then commit `public/audio/`. The generator extracts every pure-Gujarati string
  (word/phrase fields, script letters, per-chapter Gujarati summaries) and each
  chapter's English `body.join(" ")`, so it auto-syncs with content.
- **API key:** the owner pasted a Google TTS key several times; it was used to
  generate audio. **Advise rotating it** (it appeared in chat). To generate you
  only need it once; audio is static after that (no runtime cost).

---

## 6. Locked design decisions (do not silently change)

- **Recessed theme everywhere** (soft inset shadows), NOT flat hard drop shadows.
  Tokens in `:root`: `--bevel-raise/press/inset/soft` and `--sink-brand/gold/ok/
  no/dark` for colored recessed surfaces. Selected states use colored inset rings.
  - **One intentional exception:** the Learn-path **lesson node badges**
    (`.lrow .lbadge` and the older `.node .disc`) are raised 3D circles (colored
    bottom edge via `--edge`, press-down on active). Do not recess these back.
- **Learn tab layout:** a **vertical "lesson journey"** (list of lesson cards
  connected by a spine), NOT a scattered circle path. Each row: icon badge,
  title, status (Completed / Continue / Start / Checkpoint), chevron.
- **Palette:** warm maroon + gold. `--brand:#8A1C3B`, `--gold:#E0A63C`,
  `--diya:#F2892E`. Light mode only.
- **Logo:** a **bandhani keri (paisley)** SVG (`Ic.logo`), dotted; used in top
  bar, onboarding, sign-in, favicon. (An earlier dot-rosette was rejected.)
- **NO em dashes** anywhere (code, UI, docs). Verify: `grep -c $'\u2014'
  src/App.jsx` must be `0`.
- **NO emojis** in the app UI. All icons are SVG (`Ic.*`); topic/lesson icons map
  through `LESSON_ICON`/`TopicIcon`. Verify no emoji chars in `src/App.jsx`.
- **Decolonial language (important):** refer to "India" only as the post-1947
  country. For anything pre-partition use "the subcontinent" or "South Asia".
  Keep proper nouns (Indian Ocean, Archaeological Survey of India, etc.). Never
  equate the political **state** of Gujarat (formed 1960) with the older
  cultural/linguistic Gujarat.
- **Deity language:** use "deity", not "god/goddess", for non-Abrahamic figures.
- **Nothing may cost money, ever (hard line):** no paid APIs/plans at runtime.
  Audio is generated once (free tier) and served static. Firebase Spark plan
  (free, no billing attached). This is why phone/SMS auth was rejected and why
  reliable Gujarati speech-to-text (which would need a paid service) was not used.
- **Gamification:** points are **Kaudi** (cowrie shell, `Ic.kaudi`); streak is a
  **diya** (`Ic.diya`). A lesson awards **at most 10 Kaudi**, minus 2 per wrong
  answer (floor 2). **Streak repair** costs **30 Kaudi** (Profile, when a day was
  missed). No hearts/lives.
- **Web is first-class**, not a scaled-down phone app. Native iOS/Android will be
  a separate codebase.
- No AI/Anthropic branding; no AI-artifact "eyebrow"/kicker labels.

---

## 7. Feature inventory (current)

- **Learn:** units with the vertical lesson journey; 9 exercise types (intro,
  hvpt = High-Variability Phonetic Training, letter, match, listen, build, fill,
  note, speak). Tapping any Gujarati word in an exercise plays its audio.
  "Snooze speaking/listening for 5 min" buttons on those exercise types.
  Every lesson's `ex` array is post-processed once at load by `expandLesson()`
  (just after the last lesson module, before the `TOPICS` pushes): it appends
  auto-generated listen/match reinforcement built from the lesson's own taught
  words, roughly doubling the questions. Lessons with fewer than 3 taught
  words (grammar/note-heavy) are left unchanged. No new audio is needed since it
  reuses taught words. The **lesson-taking view is full-width on desktop**
  (`.dhatu.lesson-view`); all other screens are full-width on desktop too.
  Top of the tab: a **resume card** (jumps to the next recommended lesson, shows
  overall course-completion bar), a **daily-goal strip** (3 lessons/day, tracked
  in `dhatu_dayLog`; turns green when met), and **per-unit progress bars** in each
  unit header (X/Y lessons, "Done" pill when complete). On wide desktop (>=1200px)
  a fixed **right rail** (`.rail`, on the `.dhatu.withrail` Learn root) shows
  streak, Kaudi, course progress, daily goal, and a Continue button; it is hidden
  below 1200px. A **completed unit auto-collapses** (header only) with a caret;
  tapping the header toggles its lesson list (override stored in `dhatu_unitOpen`).
- **Script:** one scrollable page of letters (common-first); tap a letter card to
  hear it (no separate sound button). A **sticky** letter-info bar shows the roman,
  a short hint, and an **example** (an English word when the sound exists in
  English, else a Gujarati word; `ex:{en}` or `ex:{gu,roman}` on each letter).
  **"Learn the letters"** opens a menu (`scriptLessons` screen) of a sequenced
  curriculum (`SCRIPT_LESSONS`, ~12 lessons: core vowels, core consonants, then
  aspirates/palatals/retroflexes/sibilants, numerals, signs) following the
  script-methodology research doc. Each lesson is a 10-question ScriptLearn quiz
  over its glyph group; completion is tracked in `dhatu_scriptDone` and shown as a
  progress journey. (Matras and conjuncts from the doc are not yet lessons; they
  need a CV-building exercise format, a good next step.)
- **Review:** spaced repetition (SRS).
- **Vocab:** themed topics (icons via `TopicIcon`); tap-to-practice speaking.
- **Culture:** 7 categories (Ancient Foundations, Kingdoms and Courts, Trade and
  the Indian Ocean, Colonial Rule and Resistance, Modern Gujarat, Textiles and
  Fashion, Food and Cooking), each with
  photo cover cards; **28 chapters** with photo covers + inline photos, dual
  "Listen in English / Listen in Gujarati" (Gujarati is a full multi-sentence
  summary per chapter), sources. A "Did you know?" fun-fact card rotates every
  10 hours (one fact notes the kaudi shell as early Gujarati currency).
- **Grammar guide:** 8 topics. **Conversations (Talk):** 7 dialogues with speaking
  practice.
- **Profile:** account card (name, @username, change username), stats, streak
  repair, this-week activity, **Friends** (follow by username, see streak/Kaudi,
  poke, pokes received), badges, settings (read/write, Culture tab, Vocab tab),
  Ko-fi support, sign out. Real daily-streak tracking (via `dhatu_lastActive`).

Speech check note: browser speech recognition barely supports gu-IN, so speaking
checks degrade to an "I said it out loud" self-confirm with a calm (not red)
message. This is a platform limit, intentionally left as graceful fallback.

---

## 8. Content inventory

- **Culture chapters (28):** indus, maurya, vallabhi, dwarka; solanki, modhera,
  sultanate, palitana, narsinh, somnath; surat_trade, diaspora, parsi, textiles; colonial,
  many_rulers, peasant, gandhi, rajkot, partition, junagadh (the Colonial Rule and
  Resistance category, expanded from the deep-research report); state, nav_nirman,
  adivasi_dalit, modern, kutch, gir, food.
- **Vocab topics:** slang, family (expanded kinship: older/younger sibling,
  maternal/paternal, kaka/mota bapa/mama/foi/masi), numbers, food, verbs,
  transport, colors, animals, time, greetings, market, festivals, culture,
  adjectives, body, weather, places, feelings, numbers2 (11-100), days, routine, professions, health, directions, streetfood, diet, textilecraft.
- **Learn units/lessons:** Unit 1 (first words, numbers 1-5, yes/no/sorry,
  numbers 6-10, checkpoint); Unit 2 (family, food, home, colors, animals, getting
  around, checkpoint); Unit 3 (grammar: word order, postpositions, gender, present
  tense, action words/verbs, checkpoint); Unit 4 (past: went/came, -e marker, time and days,
  checkpoint); Unit 5 (polite you, everyday phrases, casual talk/slang, at the
  market, checkpoint); Unit 6 (modern culture: festivals/Garba, cinema, checkpoint);
  Unit 7 (Textiles and fashion: cloth/craft, looms, dress, trade/labor, Bandhani,
  Ajrakh, checkpoint); Unit 8 (Food and cooking: thali, snacks, everyday meals,
  food history, street food, veg/non-veg/pure-veg nuance, regional kitchens, checkpoint);
  Unit 9 (Describing the world: opposites/adjectives, the body, weather/seasons,
  places around town, checkpoint); Unit 10 (Numbers and counting: 11-15, 16-20,
  tens, 21-99, hundreds/thousands, lakh/crore/big numbers, shopping, checkpoint;
  teaches counting to any number); Unit 11 (Time and routine: days, telling time, daily
  routine, checkpoint); Unit 12 (Making plans: future tense, arranging to meet,
  checkpoint); Unit 13 (People and work: jobs, "what do you do?", checkpoint); Unit
  14 (Health and the body: symptoms, at the doctor, checkpoint); Unit 15 (Travel
  and directions: left/right, asking the way, checkpoint).
  Unit 1 also has a greetings/courtesy lesson. Most vocab lessons were built from
  existing vocab topics, so those words already have audio. Textiles and food used
  to be nested lessons inside Unit 6 (u6l2/u6l3); they were split out into the
  dedicated Units 7 and 8 (fuller modules with analytical notes on GI, labor,
  fermentation, ports, and regional/religious diversity). The Unit 6 festivals
  lesson was extended with દિવાળી (Diwali).
- **Grammar (9):** word order, postpositions, gender/my, present tense, past/-e
  marker, polite you, negation, questions, future tense.
- **Conversations (7):** hello, tea stall, asking the way, market haggling,
  meeting family, at the doctor, at the station.
- **Only `nav_nirman` lacks a cover image** (no free-licensed one found; clean
  colored hero). Do not fabricate image URLs; verify each with
  `curl -sI -L "<FilePath URL>"` (expect 200; 429 means retry).

---

## 9. Pending / next steps

1. **Owner: finish Firebase setup** (section 4 / AUTH.md): rules, admin UID,
   pokes index, authorized domain. Social + staff features need this.
2. **Owner: rotate the Google TTS API key.**
2b. **Audio for all current lessons is generated and committed** (403 clips). The
   new vocab lessons and Units 7-8 (khaman, dhokla, kadhi, khichdi, handvo, samo,
   farali, kapaas, rang, vanaat, mashru, saadi, vepaar, gharcholu, bandar, etc.)
   are voiced with the Chirp3-HD voices; 4 orphaned clips from the deleted Unit 6
   lessons were removed. Only re-run `npm run audio` after adding new Gujarati
   content (it is idempotent and self-syncing).
3. **Verify the vowel sounds live** (ઇ ઐ ઔ ઍ). They are IPA-specified so they are
   the target sounds, but confirm by ear; IPA can be tuned per glyph, or a native
   recording can be dropped in (playback already resolves a clip per glyph).
4. **Verify social features live** (follow/poke) after rules + index; could not be
   tested multi-user from here.
5. Open ideas discussed: more Culture chapters; native-recorded vowels. (Done
   since the first handoff: unit progress bars, resume card, daily-goal tracker,
   the desktop right rail on Learn, and teaching the extra vocab topics as
   lessons.)

---

## 10. Gotchas and verification

- After any edit, build and check invariants (with local Node on PATH):
  ```
  npm run build
  grep -c $'\u2014' src/App.jsx        # em dashes, must be 0
  python3 -c "import re;print(len(re.findall('[\U0001F000-\U0001FAFF☀-➿⬀-⯿]',open('src/App.jsx').read())))"  # emojis, must be 0
  ```
- **Inline chapter photos** live in a per-chapter `figures:[{src, cap, after?}]`
  array (separate from `body`, so they do not affect the English narration audio).
  A figure with no `after` renders after paragraph index 1; `after:N` places it
  after paragraph N. (A bug where figures without `after` never rendered was
  fixed; keep that default.)
- **Adding a Culture chapter:** push it into the right `ERAS.push(...)` block with
  `{id, category, yr, title, img, figures?, blurb, body[], site?, sources[]}` (no
  `emo` field, those were removed), and add its Gujarati summary to
  `ERA_GU_SUMMARY[id]`. Then regenerate audio (section 5).
- **Wikimedia images:** verify every URL returns 200 before adding. Filenames are
  case- and space-sensitive; encode spaces `%20`, commas `%2C`; parentheses can be
  literal.
- `node_modules`, `dist`, and `.claude` are gitignored.

---

## 11. File map

```
dhatu/
├── HANDOFF.md            <- this document
├── AUDIO.md              <- how to generate audio (owner guide)
├── AUTH.md               <- Firebase + staff-portal setup, full Firestore rules
├── README.md
├── index.html            <- title, bandhani favicon, meta
├── package.json          <- react 18, vite 8, firebase; "audio" script
├── vite.config.js
├── scripts/
│   └── generate-audio.mjs  <- cloud-TTS generator (npm run audio)
├── public/
│   ├── audio/            <- generated mp3s + manifest.json (committed)
│   └── staff/index.html  <- staff portal, served at /staff
└── src/
    ├── main.jsx          <- mounts <App/>
    ├── firebase.js       <- auth, sync, usernames, following, pokes
    ├── firebaseConfig.js <- public web config
    └── App.jsx           <- THE APP (all screens, content, CSS, icons)
```

To continue in a new chat: attach this file, state which pending item to tackle,
and remember the environment quirks in section 2 (local Node path, GitHub Desktop
auto-push, no live preview behind auth).
