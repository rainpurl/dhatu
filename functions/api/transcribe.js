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
 * Auth: a signed-in user's Firebase ID token ties usage to a real account. For
 * pre-launch testing before sign-in is wired into the native app, set the env
 * var STT_ALLOW_ANON="1" to also accept anonymous calls (global cap only).
 */

const FIREBASE_PROJECT_ID = "dhatu-9f586";
const MODEL = "@cf/openai/whisper-large-v3-turbo";
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
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });
}
const fallback = (reason, status = 200) => jsonResponse({ fallback: true, reason }, status);

// CORS preflight (a cross-origin POST with JSON triggers one).
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // Bindings not set up yet -> graceful fallback, no error.
    if (!env.AI || !env.GRADER) return fallback("not-configured");

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

    const today = new Date().toISOString().slice(0, 10);

    // ---- soft caps (read-only checks; degrade before the platform limit) ----
    const gKey = "stt:g:" + today;
    const gN = parseInt((await env.GRADER.get(gKey)) || "0", 10) || 0;
    if (gN >= GLOBAL_DAILY) return fallback("global-cap");
    let uKey = null, uN = 0;
    if (uid) {
      uKey = "stt:u:" + uid + ":" + today;
      uN = parseInt((await env.GRADER.get(uKey)) || "0", 10) || 0;
      if (uN >= USER_DAILY) return fallback("user-cap");
    }

    // ---- transcribe ----
    let text = "";
    try {
      const r = await env.AI.run(MODEL, { audio, language: LANG, task: "transcribe" });
      text = (r && (typeof r.text === "string" ? r.text : r.response)) || "";
    } catch (e) {
      return fallback("model-error");
    }
    text = String(text || "").trim();
    if (!text) return fallback("no-speech");

    // record spend (best-effort; soft counters, eventual consistency is fine)
    const writes = [env.GRADER.put(gKey, String(gN + 1), { expirationTtl: 60 * 60 * 48 })];
    if (uKey) writes.push(env.GRADER.put(uKey, String(uN + 1), { expirationTtl: 60 * 60 * 48 }));
    context.waitUntil(Promise.all(writes));

    return jsonResponse({ text });
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
