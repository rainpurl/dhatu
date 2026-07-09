/* Cloudflare Pages Function: free speech-to-text for the speaking exercises.
 *
 * POST /api/transcribe  { audio: <base64>, mime }   (Bearer Firebase ID token)
 *   -> { text }                    on success
 *   -> { fallback: true, reason }  whenever transcription is unavailable
 *
 * Why this exists: the app should not depend on each learner's device having a
 * Gujarati speech model. This transcribes recorded audio server-side with
 * Whisper so recognition is identical on every phone. The client uses it as the
 * primary engine and falls back to the device recognizer / self-check when it is
 * unavailable.
 *
 * This never bills: it runs on the Workers Free plan, where exceeding the daily
 * Workers AI allocation returns an error (which we catch) rather than a charge.
 * We add our own soft caps well under the platform limit, so we always degrade
 * gracefully. See GRADER.md.
 *
 * Tiered engines (so we stay free as usage grows):
 *   1. Cloudflare Workers AI Whisper (primary, free plan).
 *   2. Groq Whisper (overflow) - kicks in when the CF daily global cap is hit,
 *      or CF is unconfigured / errors / returns empty. Free tier; set the
 *      GROQ_API_KEY env var to enable it. Left unset -> behaves exactly as
 *      before (CF only). The client then falls back to the device recognizer.
 *
 * Auth: a signed-in user's Firebase ID token ties usage to a real account. For
 * pre-launch testing before sign-in is wired into the native app, set the env
 * var STT_ALLOW_ANON="1" to also accept anonymous calls (global cap only).
 */

const FIREBASE_PROJECT_ID = "dhatu-9f586";
const MODEL = "@cf/openai/whisper-large-v3-turbo";
const GROQ_MODEL = "whisper-large-v3"; // Groq overflow (OpenAI-compatible Whisper; free tier). large-v3 (10.3% WER) beats turbo (12%) with identical free rate limits, and short clips make the latency difference negligible.
const LANG = "gu"; // hint Gujarati; improves short-utterance accuracy and script
const GLOBAL_DAILY = 300; // soft global cap/day (keeps us well under KV write limits)
const USER_DAILY = 40;    // soft per-account cap/day
const MAX_AUDIO_B64 = 1_500_000; // ~1.1MB of audio (~30s); bounds per-call cost

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
  "access-control-max-age": "86400",
};
function jsonResponse(obj, status = 200) {
  // Explicit UTF-8 so the native HTTP client does not mangle Gujarati text.
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });
}
const fallback = (reason, status = 200) => jsonResponse({ fallback: true, reason }, status);

// CORS preflight (a cross-origin POST with JSON triggers one).
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// Base64 -> bytes (standard base64; the client sends WAV/AAC bytes base64-encoded).
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Groq overflow transcription via its OpenAI-compatible Whisper endpoint.
// Returns the recognized text, or "" on any failure (unset key, rate limit,
// network) so the caller degrades to the device recognizer. Never throws.
async function transcribeGroq(env, audioB64, mime, hint) {
  try {
    if (!env.GROQ_API_KEY) return "";
    const form = new FormData();
    form.append("file", new Blob([b64ToBytes(audioB64)], { type: mime || "audio/wav" }), "audio.wav");
    form.append("model", GROQ_MODEL);
    form.append("language", LANG);
    form.append("response_format", "json");
    form.append("temperature", "0");
    if (hint) form.append("prompt", hint); // biases toward the expected phrase
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.GROQ_API_KEY },
      body: form,
    });
    if (!res.ok) return "";
    const data = await res.json().catch(() => ({}));
    return String((data && data.text) || "").trim();
  } catch (e) {
    return "";
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // Primary engine = Cloudflare Workers AI (needs AI + GRADER bindings).
    // Overflow engine = Groq (needs GROQ_API_KEY). If neither is available,
    // degrade gracefully so the client uses the device recognizer / self-check.
    const haveCF = !!(env.AI && env.GRADER);
    if (!haveCF && !env.GROQ_API_KEY) return fallback("not-configured");

    // ---- auth: verify the Firebase ID token; ties spend to a real account ----
    const authz = request.headers.get("Authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    let uid = token ? await verifyFirebaseToken(token) : null;
    const anonOk = env.STT_ALLOW_ANON === "1";
    if (!uid) {
      if (!anonOk) return fallback("signin", 401);
      uid = null; // anonymous: global cap only
    }

    // ---- input ----
    const body = await request.json().catch(() => ({}));
    const audio = String(body.audio || "");
    if (!audio) return fallback("empty");
    if (audio.length > MAX_AUDIO_B64) return fallback("too-long");
    // Optional expected phrase: biases Whisper so it locks onto the target words
    // instead of looping on short audio. Used by vocab practice.
    const hint = String(body.hint || "").slice(0, 120);

    const today = new Date().toISOString().slice(0, 10);

    // ---- soft caps (read-only checks; degrade before the platform limit) ----
    // Global cap hit -> overflow to Groq (keep serving users) instead of failing.
    // Per-user cap hit -> stop that user on either engine (abuse guard).
    let cfOk = haveCF;
    let gKey = null, gN = 0, uKey = null, uN = 0;
    if (haveCF) {
      gKey = "stt:g:" + today;
      gN = parseInt((await env.GRADER.get(gKey)) || "0", 10) || 0;
      if (gN >= GLOBAL_DAILY) cfOk = false; // CF budget spent for today -> Groq overflow
    }
    if (uid && env.GRADER) {
      uKey = "stt:u:" + uid + ":" + today;
      uN = parseInt((await env.GRADER.get(uKey)) || "0", 10) || 0;
      if (uN >= USER_DAILY) return fallback("user-cap");
    }

    // ---- transcribe: Cloudflare Whisper primary, Groq overflow ----
    let text = "", engine = "", ranModel = false;
    if (cfOk) {
      try {
        // vad_filter strips silence around the utterance, which sharply reduces
        // Whisper's tendency to hallucinate words on short/near-silent clips.
        const input = { audio, language: LANG, task: "transcribe", vad_filter: true };
        if (hint) input.initial_prompt = hint;
        const r = await env.AI.run(MODEL, input);
        text = String((r && (typeof r.text === "string" ? r.text : r.response)) || "").trim();
        engine = "cf"; ranModel = true;
      } catch (e) { text = ""; } // fall through to Groq overflow
    }
    // Overflow to Groq when CF is over budget, unconfigured, errored, or empty.
    if (!text && env.GROQ_API_KEY) {
      ranModel = true;
      const g = await transcribeGroq(env, audio, body.mime, hint);
      if (g) { text = g; engine = "groq"; }
    }
    // no-speech = a model ran and heard nothing; over-capacity = no engine ran.
    if (!text) return fallback(ranModel ? "no-speech" : "over-capacity");

    // record spend (best-effort; soft counters, eventual consistency is fine).
    // Global counter tracks the CF Neuron budget (only CF hits count it, so once
    // it caps we route to Groq); the per-user counter counts either engine.
    if (env.GRADER) {
      const writes = [];
      if (engine === "cf" && gKey) writes.push(env.GRADER.put(gKey, String(gN + 1), { expirationTtl: 60 * 60 * 48 }));
      if (uKey) writes.push(env.GRADER.put(uKey, String(uN + 1), { expirationTtl: 60 * 60 * 48 }));
      if (writes.length) context.waitUntil(Promise.all(writes));
    }

    return jsonResponse({ text, engine });
  } catch (e) {
    return fallback("error");
  }
}

/* ---- Firebase ID token verification (RS256 via Google's public JWKS) ---- */
let _jwksCache = null; // { at, keys } cached per isolate
async function getGoogleKeys() {
  const now = Date.now();
  if (_jwksCache && now - _jwksCache.at < 60 * 60 * 1000) return _jwksCache.keys;
  const res = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!res.ok) return _jwksCache ? _jwksCache.keys : null;
  const data = await res.json();
  const keys = {};
  for (const k of data.keys || []) keys[k.kid] = k;
  _jwksCache = { at: now, keys };
  return keys;
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}
async function verifyFirebaseToken(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);
    if (header.alg !== "RS256" || !header.kid) return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) return null;
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < now) return null;
    if (payload.iat && payload.iat > now + 300) return null;
    const keys = await getGoogleKeys();
    const jwk = keys && keys[header.kid];
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signed = new TextEncoder().encode(parts[0] + "." + parts[1]);
    const sig = b64urlToBytes(parts[2]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, signed);
    return ok ? payload.sub : null;
  } catch (e) {
    return null;
  }
}
