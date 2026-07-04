/* Cloudflare Pages Function: optional, free AI writing feedback.
 *
 * POST /api/grade-writing  { text, en, promptId, level }  (Bearer Firebase ID token)
 *   -> { scores, comments, suggestion, overall }   on success
 *   -> { fallback: true, reason }                   whenever AI is unavailable
 *
 * This never bills: it runs on the Workers Free plan, where exceeding the daily
 * Workers AI allocation returns an error (which we catch) rather than a charge.
 * On top of that we enforce our own soft caps well below the platform limit, an
 * answer cache, and a per-user cap, so we degrade to the app's non-AI fallback
 * gracefully. See GRADER.md. Output here is advisory coaching only; the
 * deterministic exams remain the real measure of proficiency.
 */

const FIREBASE_PROJECT_ID = "dhatu-9f586";
const MODEL = "@cf/meta/llama-3.1-8b-instruct"; // swap to a 70b model if Gujarati quality is too weak
const GLOBAL_DAILY = 300; // soft global cap/day (also keeps us under KV's free write limit)
const USER_DAILY = 15;    // soft per-account cap/day
const MAX_TEXT = 600;     // bound per-call cost

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
const fallback = (reason, status = 200) => jsonResponse({ fallback: true, reason }, status);

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // Bindings not set up yet -> graceful fallback, no error.
    if (!env.AI || !env.GRADER) return fallback("not-configured");

    // ---- auth: verify the Firebase ID token; ties spend to a real account ----
    const authz = request.headers.get("Authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    const uid = await verifyFirebaseToken(token);
    if (!uid) return fallback("signin", 401);

    // ---- input ----
    const body = await request.json().catch(() => ({}));
    let text = String(body.text || "").trim();
    const en = String(body.en || "").slice(0, 300);
    const promptId = String(body.promptId || "").slice(0, 120);
    const level = String(body.level || "ILR 1").slice(0, 24);
    if (!text) return fallback("empty");
    if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);

    const today = new Date().toISOString().slice(0, 10);

    // ---- cache: identical answers cost zero Neurons ----
    const hash = await sha256Hex(MODEL + "|" + promptId + "|" + text.normalize("NFC"));
    const cacheKey = "c:" + hash;
    const cached = await env.GRADER.get(cacheKey);
    if (cached) return new Response(cached, { headers: { "content-type": "application/json" } });

    // ---- soft caps (read-only checks; degrade before the platform limit) ----
    const gKey = "g:" + today;
    const uKey = "u:" + uid + ":" + today;
    const gN = parseInt((await env.GRADER.get(gKey)) || "0", 10) || 0;
    if (gN >= GLOBAL_DAILY) return fallback("global-cap");
    const uN = parseInt((await env.GRADER.get(uKey)) || "0", 10) || 0;
    if (uN >= USER_DAILY) return fallback("user-cap");

    // ---- grade ----
    let out;
    try {
      const r = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: rubricPrompt(level) },
          { role: "user", content: `English prompt: ${en}\nLearner's Gujarati answer: ${text}\n\nReturn ONLY the JSON object, nothing else.` },
        ],
        temperature: 0.2,
        max_tokens: 400,
      });
      out = (r && (r.response || r.result)) || (typeof r === "string" ? r : "");
    } catch (e) {
      return fallback("model-error");
    }

    const parsed = safeParseFeedback(out);
    if (!parsed) return fallback("bad-output");

    const payload = JSON.stringify(parsed);
    // record spend + cache (best-effort; soft counters, eventual consistency is fine)
    context.waitUntil(Promise.all([
      env.GRADER.put(cacheKey, payload, { expirationTtl: 60 * 60 * 24 * 30 }),
      env.GRADER.put(gKey, String(gN + 1), { expirationTtl: 60 * 60 * 48 }),
      env.GRADER.put(uKey, String(uN + 1), { expirationTtl: 60 * 60 * 48 }),
    ]));
    return new Response(payload, { headers: { "content-type": "application/json" } });
  } catch (e) {
    return fallback("error");
  }
}

function rubricPrompt(level) {
  return [
    "You are a supportive Gujarati writing coach giving brief formative feedback",
    `on a learner's answer at roughly ${level} on the ILR scale.`,
    "Score each dimension 1-5 (5 best) and add a one-sentence comment for each,",
    "in English. Dimensions: task (did it answer the prompt), accuracy (grammar,",
    "case, verb agreement), discourse (clause order, connectors), register",
    "(politeness, e.g. તું vs તમે), orthography (spelling and matras).",
    "Then give one concrete suggestion and a one-line encouraging overall note.",
    "Be honest but kind. Respond with ONLY a JSON object of this exact shape:",
    '{"scores":{"task":n,"accuracy":n,"discourse":n,"register":n,"orthography":n},',
    '"comments":{"task":"...","accuracy":"...","discourse":"...","register":"...","orthography":"..."},',
    '"suggestion":"...","overall":"..."}',
  ].join(" ");
}

// Pull a JSON object out of the model output and validate its shape.
function safeParseFeedback(out) {
  if (!out || typeof out !== "string") return null;
  let s = out.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let obj;
  try { obj = JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
  if (!obj || typeof obj !== "object" || !obj.scores || typeof obj.scores !== "object") return null;
  const dims = ["task", "accuracy", "discourse", "register", "orthography"];
  const scores = {}, comments = {};
  for (const d of dims) {
    const n = Number(obj.scores[d]);
    scores[d] = Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 3;
    comments[d] = String((obj.comments && obj.comments[d]) || "").slice(0, 240);
  }
  return {
    scores,
    comments,
    suggestion: String(obj.suggestion || "").slice(0, 300),
    overall: String(obj.overall || "").slice(0, 200),
  };
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
    // claim checks
    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID) return null;
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < now) return null;
    if (payload.iat && payload.iat > now + 300) return null;
    // signature check
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

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
