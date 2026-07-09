# AI feedback grader (Cloudflare Workers AI) - scope

This document scopes an **optional, free** AI feedback layer for open production
(writing now, speech later) and, most importantly, the **non-AI fallback** that
takes over whenever the AI is unavailable or the free budget is spent. Nothing
here changes the current app until it is built and the owner sets up the
bindings; it is purely additive.

## Status

- **Phase 1 (writing feedback + full fallback): BUILT.** Code is in
  `functions/api/grade-writing.js`, `functions/api/grader-health.js`, and the
  client `AIFeedback` component / `aiGradeWriting` helper in `src/App.jsx` (shown
  on `type` exercises after Check). It ships **safe by default**: until the owner
  adds the two bindings below, every call returns the non-AI fallback (model
  answer + self-check list). Verified end-to-end with a forged RS256 token:
  success, cache hit (no re-spend), global cap, bad model output, expired/absent
  token, and missing-bindings all behave correctly.
- **Owner action to switch AI on (one-time, dashboard):** (1) confirm Workers
  **Free** plan, no billing; (2) add the **`AI`** Workers AI binding to the Pages
  project; (3) create a KV namespace bound as **`GRADER`**; (4) redeploy.
  See "Owner setup" below. The **same two bindings** power both the writing
  grader and the speech transcriber; set them up once.
- **Phase 2 (speech recognition + full fallback): BUILT.** Code is in
  `functions/api/transcribe.js` and the client `useVoiceCheck` / `sttTranscribe`
  in `src/App.jsx`. In the native app the speaking exercises record audio and
  send it to `POST /api/transcribe`, which runs Whisper
  (`@cf/openai/whisper-large-v3-turbo`) and returns the transcript; the app then
  grades it with the existing deterministic `_gradeSpeech()`. Same safety model as
  Phase 1: soft caps (global 300/day, per-user 40/day), and any failure returns
  `{fallback}` so the client drops to the device recognizer, then to self-check.
  It uses the **`AI`** and **`GRADER`** bindings (no new bindings).
  - **Overflow engine (Groq): BUILT.** When the CF global daily cap is hit (or CF
    is unconfigured / errors / returns empty), the Function transcribes via
    **Groq's** OpenAI-compatible Whisper (`whisper-large-v3`, 10.3% WER, better
    than turbo's 12% at the same free rate limits) so learners
    keep getting real recognition as usage grows. Enable it by setting the Pages
    env var **`GROQ_API_KEY`** (free tier). Left unset -> CF-only, unchanged.
    Per-user daily caps still apply across both engines; the CF global counter
    only counts CF hits, so once it caps, traffic routes to Groq. Groq rate-limit
    or failure -> device recognizer, as before. The key is a **server-side secret**
    (never in the client), same model as the AI binding.
  - **Auth:** requires a signed-in user's Firebase ID token, exactly like the
    grader. To test the cloud path **before** native sign-in is wired
    (`google-services.json`), set a Pages env var **`STT_ALLOW_ANON=1`** to accept
    anonymous calls under the global cap; remove it once sign-in works in the app.
  - Native calls target `https://dhatu.pages.dev/api/*` absolutely (the WebView
    origin is localhost), so the site must be deployed for the cloud path to work;
    otherwise the app falls back automatically.

## The one hard rule this design protects

Nothing may cost money at runtime. This is guaranteed structurally, not by
hoping usage stays low:

- The Worker runs on the **Cloudflare Workers Free plan**. On the Free plan the
  daily Workers AI allocation (a fixed number of "Neurons" per day; verify the
  current figure in the dashboard, historically ~10k/day) is the **only** thing
  available, and requests beyond it **fail with an error rather than billing**.
  There is no payment method to charge. Overage is a 429/error, which we catch.
- The owner must **not** upgrade to the Workers Paid plan for this feature, and
  must not attach billing to Workers AI. If they ever do, they must set a
  hard spend limit. The doc assumes Free plan throughout.
- On top of the platform stop, we add our own **soft caps below the platform
  limit** so we degrade to the fallback gracefully, before the platform ever
  errors.

Net: the worst case is "AI feedback is unavailable today," never "a bill."

## What it adds (advisory only)

Two capabilities, both **formative feedback, not the pass/fail verdict**:

1. **Writing feedback (Phase 1).** Learner types an open Gujarati answer (a
   sentence or short paragraph). An LLM returns an ILR-style analytic rubric:
   task accomplishment, accuracy/range, discourse, register, orthography, with a
   short comment per dimension and one concrete suggestion.
2. **Speech feedback (Phase 2).** Learner records a short answer. Whisper
   transcribes it; the LLM gives light feedback on the transcript. This is
   heavier (audio, more Neurons) and lands after Phase 1 proves out.

**These never gate progress or change a score.** The deterministic exams
(`matchGu`, build, order, MCQ) remain the sole source of truth for pass/fail and
test-out. The AI is a coach, because the available models are only mediocre at
Gujarati (see Caveats). Framing it as advice, not a grade, is a correctness
requirement, not a disclaimer.

## Architecture

Static app stays on Cloudflare Pages. Add a **Pages Function** (server code that
deploys with the site, no separate service):

```
functions/api/grade-writing.js     POST { text, promptId }        -> feedback | {fallback}
functions/api/grade-speech.js      POST audio (Phase 2)           -> feedback | {fallback}
functions/api/grader-health.js     GET                            -> { available: bool }
```

Bindings configured in the Pages project (dashboard or `wrangler.toml`):

- `AI` - Workers AI binding (gives `env.AI.run(model, input)`).
- `GRADER` - a KV namespace binding (namespace can be titled anything, e.g. GRADER_KV) for: the response cache, the global daily Neuron
  counter, and per-user daily counters.

Data flow (writing):

```
client (authed) --Firebase ID token + text--> functions/api/grade-writing
   1. verify Firebase ID token (JWT vs Google JWKS)  -> 401 if bad
   2. per-IP + per-user + global cap checks (KV)      -> {fallback} if any exceeded
   3. cache lookup by sha256(model|promptId|normalized text) -> return cached
   4. env.AI.run(llama, rubric prompt)                -> validate JSON
   5. on any failure/invalid -> {fallback}; on success -> cache + return
```

## Models (Workers AI catalog; confirm exact IDs in dashboard)

- **Text/rubric:** start with `@cf/meta/llama-3.1-8b-instruct` (cheap, fast). If
  Gujarati quality is too weak, try `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  (better multilingual, more Neurons/call). Make the model a config constant.
- **STT (Phase 2):** `@cf/openai/whisper-large-v3-turbo` (multilingual incl.
  Gujarati). Cap audio at ~15-20s to bound cost.

## Budget protection (defense in depth, cheapest layer first)

1. **Client per-user daily cap** (localStorage, e.g. 10 AI checks/day). Do not
   even call the Worker past it. Instant, saves round-trips.
2. **Server per-user daily cap** (KV keyed by Firebase uid + date). Authoritative
   version of the above; stops a user who clears localStorage.
3. **Server global daily cap** (KV counter, reset by date), set to ~70-80% of the
   platform free allocation. When hit, everyone gets `{fallback}` for the rest of
   the day, and the platform limit is never reached.
4. **Response cache** (KV, key = hash of model + promptId + normalized answer,
   TTL ~30 days). Identical/common answers cost zero Neurons. Huge multiplier on
   a language app where many learners submit the same sentence.
5. **Input caps.** Max text length (e.g. 600 chars), max audio duration. Bounds
   the Neuron cost of any single call.
6. **Platform free allocation** is the final hard stop; overage = error, caught
   by the Worker -> `{fallback}`.

Rough envelope to size caps against (fill in real Neuron numbers from the
dashboard, then compute): global cap / per-call Neurons = calls/day; minus cache
hits = the real ceiling. Start conservative, widen once real usage is known.

## The fallback ladder (the point of this design)

Any of these triggers the fallback, automatically and calmly (a small neutral
note, never a red error, never lost work): budget exceeded (any layer), auth
missing, model error/timeout, invalid JSON from the model, or the user offline.

**Writing:**
1. AI available -> LLM rubric feedback (advisory).
2. AI unavailable ->
   a. If the prompt has a known accept-set (constrained item) -> grade with the
      existing deterministic `matchGu()`. A real auto-grade, no AI.
   b. If the prompt is genuinely open (essay) -> show a **model answer + a
      self-check rubric checklist** the learner ticks off ("verb at the end of
      each clause?", "right register (તું/તમે)?", "included all three points?").
      Honest self-assessment, still educational, never blocks.

**Speech:**
1. AI available -> Whisper transcript + light LLM feedback.
2. AI unavailable -> the app's existing "I said it out loud" self-confirm plus a
   reference clip to shadow (already implemented for in-lesson speaking).

Because every open exercise ships with a model answer and a checklist regardless,
the fallback is always fully functional on its own. The AI is a bonus on top of a
complete non-AI experience, not a dependency.

## Security and abuse (a public free grader is an abuse target)

- **Auth-gate:** only signed-in Firebase users can call the grader. The Worker
  verifies the Firebase ID token by checking the JWT signature against Google's
  public certs (no Firebase Admin SDK, no secret needed). Ties every Neuron to a
  real account and enables per-user quotas.
- **Per-IP rate limit** (KV) on top, so one account/host cannot burst-drain the
  shared daily budget.
- **No PII, no secrets.** Only the learner's answer text/audio and a prompt id
  are sent, and only to Cloudflare (the same platform already hosting the site
  and audio). No third party. Note this in the privacy copy.
- **No secrets in the client.** The AI binding lives server-side in the Function.

## Rubric prompt and output contract

- System prompt: an ILR-style analytic rubric (from the proficiency research
  report) plus strict "respond with JSON only" instructions and the target level.
- Output schema (validated server-side; invalid -> fallback):
  `{ scores: {task, accuracy, discourse, register, orthography}, comments: {...}, suggestion: string, overall: string }`.
- Temperature low. If the model returns prose or malformed JSON, do not show
  garbage: fall back.

## Caveats (internal; do NOT surface in the UI)

- Per the owner's decision, the UI shows **no indication that AI is involved** and
  **no "beta" label**. The learner just sees "Feedback." Internally: Llama/Whisper
  are only fair at Gujarati, so this stays **advisory** (it never gates progress or
  changes a score; the deterministic exams remain the real measure). "Advisory" is
  a behavioral property, not a label, so subtlety and honesty coexist.
- Whisper on short, accented, or noisy Gujarati speech will mistranscribe; treat
  its output as best-effort, again without announcing it.

## Client UX changes

- On open `type`/essay/speak exercises, a small neutral **"Get feedback"** button
  appears (no AI/beta branding). Its panel is headed simply **"Feedback."** When
  detailed feedback is unavailable (not signed in, capped, offline, or bindings
  not set up), the **same "Feedback" panel** instead shows the model answer + a
  self-check list, so the transition is invisible to the learner. The
  Continue/Check flow is unchanged and never waits on the network.

## Owner setup (one-time, in the Cloudflare dashboard)

1. Confirm the Pages project is on the **Workers Free plan**; do **not** enable
   Workers Paid / billing for Workers AI.
2. Enable **Workers AI** and add the **`AI`** binding to the Pages project.
3. Create a **KV namespace** and bind it as **`GRADER`** (the binding Name must be GRADER; the namespace title itself can be anything).
4. Redeploy (push to main; Pages picks up the `functions/` directory).
5. Verify `GET /api/grader-health` returns `{available:true}` and that hitting
   the per-user cap flips exercises to the fallback with no error.

## Phasing and estimate

- **Phase 1 - writing feedback + full fallback.** Function, KV budget/cache,
  Firebase token verify, rubric prompt, client button + result/fallback panel.
  The bulk of the value; no audio complexity.
- **Phase 2 - speech feedback.** Audio capture in the client, Whisper call,
  transcript feedback, its fallback. Heavier; do after Phase 1 is validated.

Recommended: build Phase 1 first, ship behind the signed-in + beta gate, watch
real Neuron use for a week, then decide on Phase 2 and on the 8B-vs-70B model.
