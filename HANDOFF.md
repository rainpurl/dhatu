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
  (~8,800 lines): all screens, content, CSS (one big template string injected via
  `<style>{CSS}</style>`), and SVG icons (the `Ic` object). Edits must be careful;
  prefer targeted string replacements and watch brace balance.
- **Build:** Vite 8 (`vite build` to `dist/`). React 18. No router (screen state
  machine via a `screen` string). No UI library. State is plain hooks.
- **Auth/DB:** Firebase (Google sign-in + Firestore). See section 4.
- **Fonts:** Anek Gujarati (default `gu`) + Inter, plus **Noto Sans Gujarati**
  (broad glyph coverage, in the fallback stack for rare nukta/matra glyphs),
  **Rasa** (serif) and **Mogra** (display) for the Script tab's 3-style toggle.
  All from Google Fonts in the CSS `@import`.
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

5. **(Optional) AI writing feedback.** Phase 1 is built (`functions/api/*`, plus
   the `AIFeedback` component on `type` exercises). It is dormant and shows a
   non-AI fallback until, in the Cloudflare dashboard: confirm the **Workers Free**
   plan (no billing), add the **`AI`** Workers AI binding, and create a KV
   namespace bound as **`GRADER`**. Then redeploy. Full design, budget caps,
   fallback ladder, and setup steps are in **GRADER.md**. It never bills (free
   plan overage errors instead of charging) and never gates progress (advisory
   only; the deterministic exams stay the source of truth).

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
  `public/audio/` with `manifest.json` (currently **3,550 clips**). The app's
  `speak(text, lang, voice)` plays a clip when the manifest has one, else falls
  back to browser TTS. A missing manifest just means TTS-as-before.
- **Voices (multi-voice):** the default narrator is Google **Chirp3-HD**
  (`gu-IN-Chirp3-HD-Aoede`, `en-US-Chirp3-HD-Aoede`). Two more non-robotic
  Gujarati voices are generated as **variants** (`VOICE_VARIANTS` in the
  generator: Charon = v2, Kore = v3) for every SHORT item (`text.length <=
  VARIANT_MAX_LEN` 70; long Culture summaries and English narration stay
  single-voice to keep size/cost down). Variant clips are stored under manifest
  keys `gu|<text>|v2` / `gu|<text>|v3`; `_audioFileFor(text, lang, voice)`
  resolves the variant and falls back to the default. `speakGu(text, voice)`
  takes a voice number 1/2/3. Uses of the alternate voices:
  - **Script tab:** the Style toggle (1/2/3) plays each letter in voice 1/2/3.
  - **Lessons** (LessonRunner + ScriptLearn) and **Vocab/Practice**: a *stable*
    voice per lesson/topic via `_voiceForId(id)` (hash of id -> 1..3), so it is
    consistent within one lesson/topic and varies across them.
  - **Conversations:** the two speakers use different voices (them=2, you=3).
  - **Review:** each word plays in a per-word voice (`_voiceForId(item.gu)`).
- **IPA / special-voice overrides** (`PRONUNCIATION_OVERRIDES`, baked in so
  re-runs keep the sounds): four vowels (ઇ ɪ, ઐ ɛː, ઔ ɔː, ઍ æ) and the candra-e
  matra કૅ (kæ) are synthesized by IPA on an English WaveNet voice; the
  rare/borrowed nukta letters get IPA (ફ઼ fə, જ઼ zə, ૹ ʒə, ચ઼ tsə, ત૽ tə) and the
  Perso-Arabic ones are spoken on an **Arabic voice** (ખ઼ خا, ગ઼ غا, ક઼ قا via
  `{text, voice:"ar-XA-Wavenet-A", lang:"ar-XA"}`), because an English voice
  cannot make ɣ/q/x. Override items are single-voice (skipped by the variant
  pass). ઑ was left as-is. The **halant (્) has no audio on purpose**: TTS cannot
  voice a vowel-less consonant (it adds a vowel or reads a fallback letter), so
  the halant tile is a silent, visual-only mark. `MANUAL_CLIPS` is the mechanism
  for hand-placed recorded clips (currently empty) if a real recording is ever
  needed.
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

- **Learn:** units with the vertical lesson journey; 16 exercise types (intro,
  hvpt = High-Variability Phonetic Training, letter, match, listen, build, fill,
  note, speak, translate = English prompt, pick the Gujarati; oddone = pick the
  word that doesn't belong (**options show only the Gujarati/roman word, no English
  gloss, so it doesn't give itself away**); tf = true/false; order = arrange scrambled
  sentences/lines into a coherent sequence, for discourse and reply-building;
  plus three **typed** types: **type** = read an English prompt and *type* the
  Gujarati translation yourself; **cloze** = a C-test where you type the missing
  words in a sentence; **typeen** = shown a Gujarati word (with audio), type its
  English meaning. Gujarati typing (type/cloze) is graded by **`gradeGu()`**
  (module-level, just above `GuKeyboard`): exact/accept-variant = **full credit**;
  a minor typo (small Levenshtein, or only combining marks differ) = **half
  credit** with a note on what went wrong ("a matra/modifier is off", "check the
  ending, wrong tense", or a spelling slip); too far = 0. English typing (typeen)
  is graded by **`matchEn()`**: case-, space-, and punctuation-insensitive, ignores
  leading articles, accepts a synonym set (glosses split on "/" and ","), and
  forgives one typo on longer answers. Learners without an OS Gujarati keyboard use
  the on-screen **`GuKeyboard`** (tap-to-type vowels, consonants, matras, halant,
  space, backspace; matra keys show a dotted circle). type/cloze/typeen need no new
  audio (they reuse taught words). Half-credit shows an amber **"Almost, half
  credit"** feedback sheet (`.sheet.half`). All three work in lessons *and* exams.
  `type`/`cloze` are threaded through the advanced units (u17-u21); `typeen` is
  auto-added once per lesson by `expandLesson()` (read/write mode only).
  Higher units (16-20) lean on build/order/type/cloze/note over vocab drills,
  emphasizing tense, tone, and carrying a conversation. Tapping any Gujarati word in an exercise plays its audio.
  "Snooze speaking/listening for 5 min" buttons on those exercise types.
  `expandLesson()` auto-generates a varied reinforcement top-up (listen +
  translate + a true/false + a **typeen** + a match) from each lesson's own taught
  words, so the new types appear across all lessons with no new audio. oddone is
  hand-authored where a clean category exists (e.g. Colors, Animals).
  **Timed proficiency exams** (`EXAMS`, framed on the ILR scale per the
  proficiency-exam research report) sit as milestones in the journey: Limited
  Working (after Unit 5, 38 questions), Professional Working (after 10, 39), Full
  Professional (after 15, 41), and the **Primary Fluency final exam** at the very
  end (**`afterUnit: "u21"`**, **64 questions, near-native**). Countdown-timed sets
  of auto-graded questions: listen/translate/tf/oddone plus **read** (a Gujarati
  passage + comprehension MCQ), and production types **build**, **order**
  (reassemble a scrambled dialogue; order items reuse the app's own 25
  conversations, whose lines all have clips), **type**, **cloze**, and **typeen**.
  Scoring is **fractional** (a half-credit Gujarati typo counts 0.5 toward the pct).
  **After the exam there is a full Review**: every question, marked correct / half /
  missed, with your answer, the correct answer, and (for typos) the feedback note.
  A **passed** exam card is **shiny gold** with a sheen sweep (`.examcard.passed`),
  deliberately not green, since completed units already use green. Every build tile,
  order line, and typeen word is verified against the audio manifest at generation
  time so exams add zero clips; type/cloze
  need none. Difficulty escalates by tier; the final pulls in complex sentences,
  reported speech, conditionals, comparisons, register (તું vs તમે), idiom/slang,
  reading inference, and free-form typed production (e.g. "If it rains, we will
  stay home"). Timers: 13 / 15 / 19 / 35 min. The
  EXAMS array is generated by `scripts/... exams.mjs` (scratchpad) from vetted
  word pools + hand-written hard items + production items (build/order/type/cloze,
  with a clip-verification pass), then spliced into `src/App.jsx`. Each is
  a **test-out**: always available (not locked); passing marks every lesson it
  covers (all units up to its `afterUnit`) as completed. Shows a score and
  pass/fail (70-80% pass), awards 30 Kaudi on first pass, stores results in
  `dhatu_examsDone`. Rendered by `ExamRunner`. The final exam's `afterUnit`
  tracks the last unit so it stays at the very end.
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
- **Script:** one scrollable page of letters; tap a letter card to hear it (no
  separate sound button). A **sticky** letter-info bar (works because the Script
  root is an app-shell, `.script-shell{height:100dvh}`, making `.scr` the real
  scroller) shows the roman, a short hint, and an **example**. A **Style toggle**
  (1/2/3) at the top switches the letter font (Anek / Rasa / Mogra) *and* the
  voice; choice persists in `dhatu_scriptFont`. Sections: Vowels, Consonants,
  Numerals, **Modifiers** (the signs plus the vowel-sign matras ા િ ી ુ ૂ ૃ ે ૈ ો ૌ
  and the two candra matras ૅ ૉ, each shown on ક and playing a ક+sign syllable
  via a `say` field), Conjunct letters (only non-obvious ligatures), and
  **Rare and borrowed consonants** (nukta letters fa/za/zha/qha/gha/qa/tsa and
  the English-t ત૽). Correct answers in ScriptLearn **auto-advance**; the done
  screen has a **Continue to next lesson** button.
  **"Learn the letters"** opens a menu (`scriptLessons` screen) of a sequenced
  curriculum (`SCRIPT_LESSONS`, 16 lessons: core vowels, core consonants, aspirates/palatals/
  retroflexes/sibilants, matra/vowel-sign ladders, numerals, signs, and conjuncts) following the
  script-methodology research doc. Each lesson is a 10-question ScriptLearn quiz
  over its glyph group; completion is tracked in `dhatu_scriptDone` and shown as a
  progress journey. Matra and conjunct lessons use inline CV/cluster items (e.g. કા, ન્ત) with a
  teaching-note intro step. Concrete-noun intros show a picture via `WORD_IMG` (food, animals, transport,
  places, weather). Body-part words render a highlighted line-figure (`BodyDiagram`/`BODY_PARTS`);
  color words render a swatch (`COLOR_SWATCH`); family words render a highlighted
  family tree (`FamilyTree`/`FAMILY_NODE`) with father's/mother's sides labeled.
- **Review:** spaced repetition (SRS). The **Review nav tab is hidden until the
  user has review items** (`srs.length > 0`), so a new learner never sees an empty
  tab.
- **Vocab:** themed topics (icons via `TopicIcon`); tap-to-practice speaking.
  Noun word-cards show a **photo thumbnail** when the word is in `WORD_IMG`
  (Wikimedia hotlinks, ~70 nouns across food, animals, transport, places,
  weather, produce, nature, home, clothing, tech, body, sport, music).
  Words with a common variation carry an optional `alt:[{gu,r}]` list, shown as a
  tappable "also ..." line under the word (e.g. potato બટાકા / બટાટા, onion
  ડુંગળી / કાંદા, hospital દવાખાનું / હોસ્પિટલ). 14 variant pairs so far.
- **Culture:** 7 categories (Ancient Foundations, Kingdoms and Courts, Trade and
  the Indian Ocean, Colonial Rule and Resistance, Modern Gujarat, Textiles and
  Fashion, Food and Cooking), each with
  photo cover cards; **41 chapters** with photo covers + inline photos, dual
  "Listen in English / Listen in Gujarati" (Gujarati is a full multi-sentence
  summary per chapter), sources. A "Did you know?" fun-fact card rotates every
  10 hours (one fact notes the kaudi shell as early Gujarati currency).
- **Grammar guide:** 14 topics. **Conversations (Talk):** 25 dialogues with
  speaking practice, beginner through advanced (the two speakers use different
  voices).
- **Profile:** account card (name, @username, change username), stats, a
  **lifetime Kaudi earned** line (`dhatu_kaudiEarned`, bumped by the `earnKaudi`
  helper alongside the spendable balance; never decreases on spending), streak
  repair, **Extra oil** (a streak freeze in the diya theme with a flickering-flame
  animation: buy for 50 Kaudi, auto-consumed on a single missed day; you may hold
  **at most one charge** (no stockpiling) and freezes cannot run more than
  **OIL_MAX_RUN = 5** days in a row; `dhatu_oil`/`dhatu_oilRun`, applied via a
  mount reconcile effect), this-week activity, **Friends** (follow by username,
  see streak/Kaudi, poke, pokes received), **Awards** (13 badges that turn gold
  when earned, each with its own icon: First lesson, Checkpoint, Wordsmith 100
  Kaudi, Reviewer, Literally literate = all script lessons, Saaro mitra = 2
  friends, Satat/Amar/Akhand/Suvarṇa jyot = 7/30/100/365-day streaks, Dhanvaan
  1000 Kaudi, Conversationalist 5000 Kaudi, Mastery = every lesson; **the three
  Kaudi awards key off lifetime earned, not the current balance**), settings
  (read/write, Culture tab, Vocab tab, and the two localization toggles below),
  Ko-fi support, sign out. Real daily-streak tracking (via `dhatu_lastActive`).
- **Localization rewards:** **Gujarati numerals** for the Kaudi/streak counters
  unlock at the **halfway** mark (`completed.length >= half of all lessons`, i.e.
  well after numbers are taught); the **full Gujarati interface** (nav labels +
  screen title bars, via the `t(en, gu)` helper) unlocks at **100% mastery**. Both
  default on when unlocked, each with a settings toggle to switch back to English
  (`dhatu_guNumbers`, `dhatu_guInterface`). `numFmt(n)` maps 0-9 to ૦-૯; only the
  Kaudi and streak numbers are converted, not lesson content. Interface coverage is
  the app chrome (nav + TopBar titles); teaching content stays as authored.
- **Culture cards:** cover images are now **square** (`aspect-ratio:1` on
  `.era-band` / `.cat-cover`) so more of each photo shows. `SafeImg` now sends
  `referrerPolicy="no-referrer"` (matching the working WORD_IMG hotlinks), which
  fixes the Commons covers that previously failed to load (e.g. the ones that were
  silently hidden). A few chapters (e.g. nav_nirman) still have no cover file and
  render as a clean colored square.

Speech check note: browser speech recognition barely supports gu-IN, so speaking
checks degrade to an "I said it out loud" self-confirm with a calm (not red)
message. This is a platform limit, intentionally left as graceful fallback.

---

## 8. Content inventory

**Scale (current):** 22 Learn units / ~103 lessons; 16 "Learn the letters" script
lessons; ~53 vocab topics; 14 grammar patterns; 25 conversations; 7 Culture
categories / 41 chapters; 4 timed proficiency exams; **3,550 audio clips across
3 voices** (Units 1-21 + earlier content fully generated); ~70 noun images
(`WORD_IMG`, shown in lessons and the Vocab list) + body/family diagrams + color
swatches; 14 variant pairs (`alt`). Units 1-15 are
foundations/themes/practical systems; Units 16-18 are an advanced grammar arc
(opinions and comparisons; conditionals and modality; reported speech and
subordinate clauses); Units 19-22 are conversation, complex sentences, sounding
natural, and shades of meaning (emphasis/quantity/frequency nuance). The Primary
Fluency final exam is anchored `afterUnit: "u22"` so it stays at the very end.

**PENDING AUDIO (this batch):** Unit 22's lessons, the three new vocab topics
(airport, cleaning, office), and the two new culture chapters (Amul, Surat
diamonds, each with a Gujarati `guSummary` + English narration) added ~32 new
Gujarati clips + 2 English chapter readings that do NOT exist yet. The app falls
back to browser TTS for them until the owner runs `GOOGLE_TTS_KEY=<key> npm run
audio` (auto-discovers new strings, skips existing), then commits the new
`public/audio/` files. See AUDIO.md.

**Consistency gate:** a checker script (kept in the session scratchpad,
`check.mjs`) extracts every gu+romanization pair and verifies: every spoken word
has a clip, no gu field has stray Latin, no romanization conflicts (same gu, two
spellings), no in-topic or cross-topic vocab duplicates. Run it after any content
change; all five must read 0. Romanization house style uses diacritics (ṭ ḍ ṇ ḷ
ṣ ṁ) and "oo" for long-u (doodh, phool, roopiyaa).

- **Culture: 7 categories, 41 chapters.** Ancient: indus, maurya, vallabhi,
  dwarka. Kingdoms: solanki, modhera, sultanate, palitana, narsinh, somnath.
  Trade: surat_trade, diaspora, parsi. Colonial Rule and Resistance (expanded from
  a deep-research report): colonial, many_rulers, peasant, gandhi, rajkot,
  partition, junagadh. Modern: state, nav_nirman, adivasi_dalit, modern, kutch,
  gir, **language** (the Gujarati language and its writers). Textiles and Fashion:
  textiles, t_bandhani, t_patola. Food and Cooking: food, f_street, f_faith,
  f_ports. (Textiles/Food are Culture *modules* built from the two md files; the
  Learn Units 7/8 are separate.)
- **Vocab topics (~46):** slang split into slang + slang2 (from a modern-slang
  research md; slang2 carries the New tag), family (expanded: son/daughter, child/
  offspring, didi, cousin, nephew/niece, and gender-neutral spouse/parents/
  siblings/family/elder), numbers, food, verbs, verbs2, transport, colors, animals,
  time, greetings, market, festivals, culture, adjectives, body, weather, places,
  feelings, numbers2 (11-100), days, routine, professions, health, directions,
  streetfood, diet, textilecraft, household, produce, clothing, nature, school,
  questions, kitchen, sports, connectors (joining words), tech (phones), money,
  people (describing people).
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
  and directions: left/right, asking the way, checkpoint); Unit 16 (Putting it
  together, advanced: reasons and opinions with કારણ કે/તેથી/મને લાગે છે કે,
  telling a short story in the past, comparisons with કરતાં/વધારે/સૌથી,
  checkpoint); Unit 17 (Wishes and possibilities: જો...તો conditionals, કાશ/આશા
  wishes and hopes, can/must with શકવું and મારે...પડશે, checkpoint); Unit 18
  (Reporting and connecting: reported speech with કે, જ્યારે...ત્યારે time
  clauses, જે...તે relative clauses, checkpoint).
  Unit 1 also has a greetings/courtesy lesson. Most vocab lessons were built from
  existing vocab topics, so those words already have audio. Textiles and food used
  to be nested lessons inside Unit 6 (u6l2/u6l3); they were split out into the
  dedicated Units 7 and 8 (fuller modules with analytical notes on GI, labor,
  fermentation, ports, and regional/religious diversity). The Unit 6 festivals
  lesson was extended with દિવાળી (Diwali).
- **Grammar (13):** word order, postpositions, gender/my, present tense, past/-e
  marker, polite you, negation, questions, future tense, commands/requests,
  want-like-need (joie/game), this-that-here-there, have (paase/mane + chhe).
- **Conversations (25):** hello, tea stall, asking the way, market haggling,
  meeting family, at the doctor, at the station, making plans, work, telling time,
  on the phone, buying clothes, restaurant, Diwali, please-repeat, catching up
  (slang + code-mix), at the temple, auto-rickshaw haggling, weather, weekend
  plans (conditionals), job interview (can/experience).
- **Only `nav_nirman` lacks a cover image** (no free-licensed one found; clean
  colored hero). Do not fabricate image URLs; verify each with
  `curl -sI -L "<FilePath URL>"` (expect 200; 429 means retry).

---

## 9. Pending / next steps

1. **Owner: publish the Firestore rules in the Firebase console** (the rules are
   NOT deployed from the repo). Use the full block in AUTH.md; the two admin UIDs
   are already set in `public/staff/index.html` and in AUTH.md's `isAdmin()`. Also:
   enable Google sign-in, create Firestore, add `dhatu.pages.dev` authorized
   domain, create the pokes composite index, and (optional) set the OAuth consent
   **App name** to "Dhatu Learning" so the sign-in popup reads nicely (AUTH.md).
2. **Owner: rotate the Google TTS API key** (it appeared in chat repeatedly and
   was used again this session). Audio is fully static, so nothing needs a live key.
3. **All current content is voiced** (**3,550 clips, 3 voices**). Re-run
   `npm run audio` only after adding new Gujarati content; it is idempotent and
   self-syncing (default clip + v2/v3 variants for short items). If you change an
   override or the pause-list rule, delete the affected clips first so they
   regenerate. Generation of all variants takes ~15 min; run in the background.
4. **Verify by ear, live:** the vowel/candra IPA overrides (ઇ ઐ ઔ ઍ, કૅ), the
   Perso-Arabic Arabic-voice letters (ખ઼ ગ઼ ક઼), and that each Script Style /
   lesson / conversation speaker uses a distinct voice. Also
   **social features** (follow/poke, after rules + index). None testable from here.
5. Open ideas not yet done: matras/conjuncts have letter-recognition lessons but
   no handwriting/CV-*building* exercises; a true Gujarati **handwriting font**
   for Script Style 3 (none is freely/OFL-licensed; Mogra is the display stand-in);
   native-recorded voices; more noun images; a Unit 16. (Done recently: multi-voice
   audio across script/lessons/conversations/vocab/review; Script 3-style font+voice
   toggle; Modifiers section with matras + candra signs; Rare/borrowed consonants
   with Arabic-voice audio; Review-tab hiding; ~13 new vocab topics; 11 new
   conversations; 4 new grammar entries; the Gujarati-language Culture chapter; a
   consistency-gate checker.)

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
├── GRADER.md             <- optional AI writing-feedback design + owner setup
├── README.md
├── index.html            <- title, bandhani favicon, meta
├── package.json          <- react 18, vite 8, firebase; "audio" script
├── vite.config.js
├── functions/
│   └── api/              <- Cloudflare Pages Functions (AI grader + health)
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
