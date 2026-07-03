#!/usr/bin/env node
/*
  generate-audio.mjs
  ------------------
  One-time (and re-runnable) generator that turns the app's spoken text into
  pre-recorded mp3s using a cloud text-to-speech service. It covers:

    - every Gujarati word, phrase, and letter (browser TTS is silent for
      Gujarati on most desktops, so these need real audio)
    - the English narration of each History/Culture chapter (browser TTS reads
      these but sounds robotic; recorded audio is clear and consistent)

  It writes:
    public/audio/<hash>.mp3     one file per unique phrase
    public/audio/manifest.json  a map the app reads to find each file

  The app (src/App.jsx) plays these files when present and falls back to the
  browser's built-in speech only when a file is missing. So generating audio is
  purely additive: nothing breaks if you never run this.

  ----------------------------------------------------------------------------
  QUICK START (see AUDIO.md for the plain, step-by-step version)

    Google Cloud Text-to-Speech (default):
      GOOGLE_TTS_KEY=your_api_key  node scripts/generate-audio.mjs

    Microsoft Azure Speech:
      TTS_PROVIDER=azure  AZURE_TTS_KEY=your_key  AZURE_TTS_REGION=eastus \
        node scripts/generate-audio.mjs

  Requires Node 18 or newer (uses the built-in fetch). No npm packages needed.

  ----------------------------------------------------------------------------
  OPTIONS (environment variables)

    TTS_PROVIDER   google | azure                 (default: google)
    GOOGLE_TTS_KEY Google Cloud API key           (Google only)
    AZURE_TTS_KEY  Azure Speech key               (Azure only)
    AZURE_TTS_REGION  e.g. eastus                  (Azure only)
    GU_VOICE       Gujarati voice name            (see defaults below)
    EN_VOICE       English voice name             (see defaults below)
    GU_RATE        Gujarati speaking rate         (Google: number like 0.9,
                                                    Azure: percent like -8%)
    EN_RATE        English speaking rate          (Google: number like 1.0,
                                                    Azure: percent like 0%)

  FLAGS (command line)
    --gu-only      only generate Gujarati audio
    --en-only      only generate English narration
    --force        re-generate even if the mp3 already exists
    --dry          list what would be generated, make no API calls, write nothing
    --limit N      only process the first N items (handy for a quick test)
*/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src", "App.jsx");
const OUT_DIR = path.join(ROOT, "public", "audio");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

const argv = process.argv.slice(2);
const FORCE = argv.includes("--force");
const DRY = argv.includes("--dry");
const GU_ONLY = argv.includes("--gu-only");
const EN_ONLY = argv.includes("--en-only");
const LIMIT = (() => {
  const i = argv.indexOf("--limit");
  return i >= 0 && argv[i + 1] ? parseInt(argv[i + 1], 10) : 0;
})();

const PROVIDER = (process.env.TTS_PROVIDER || "google").toLowerCase();

/* A few Gujarati vowels are mangled by TTS as isolated glyphs, so we synthesize
   their exact target sound by IPA (via SSML on a WaveNet voice) instead. */
const PRONUNCIATION_OVERRIDES = {
  "ઇ": "ɪ",   // short i, as in "sit"
  "ઐ": "ɛː",  // "eh", as in "bed"
  "ઔ": "ɔː",  // "aw", as in "bought"
  "ઍ": "æ",   // "a", as in "apple"
  "કૅ": "kæ", // candra-e matra on ka; Chirp3 mangles the candra-e like the vowel above
  // Rare/borrowed consonants (nukta letters): TTS is silent on the bare glyphs,
  // so we synthesize the target sound by IPA, exactly like the vowels above.
  "ૹ": "ʒə",      // zha, like the 's' in "vision"
  "ફ઼": "fə",     // fa, the 'f' sound
  "જ઼": "zə",     // za, the 'z' sound
  "ચ઼": "tsə",    // a 'ts' sound in loanwords
  "ત૽": "tə",     // the English 't' in "top"
  // Perso-Arabic sounds an English voice cannot make: synthesize the real Arabic
  // letter (+ alif for a clear vowel) on an Arabic voice, which speaks them natively.
  "ખ઼": { text: "خا", voice: "ar-XA-Wavenet-A", lang: "ar-XA" }, // kha, Arabic خ
  "ગ઼": { text: "غا", voice: "ar-XA-Wavenet-A", lang: "ar-XA" }, // gha, Arabic غ
  "ક઼": { text: "قا", voice: "ar-XA-Wavenet-A", lang: "ar-XA" }, // qa, Arabic ق
};

const DEFAULT_VOICE = {
  // Chirp3-HD are Google's most natural voices; using one persona (Aoede) across
  // both languages gives a consistent narrator.
  google: { gu: "gu-IN-Chirp3-HD-Aoede", en: "en-US-Chirp3-HD-Aoede" },
  azure: { gu: "gu-IN-DhwaniNeural", en: "en-US-AriaNeural" },
};

/* ---------------- extract spoken text from the source ---------------- */
/* Gujarati: the app speaks pure-Gujarati string literals (word/phrase fields
   like gu and say, the script letters, and the per-era Gujarati summaries). We
   collect every double-quoted string that is pure Gujarati, reading straight
   from the source so this list can never drift from the app. Mixed
   English-and-Gujarati explanations (which contain Latin letters and are never
   spoken as a whole) are skipped automatically. */
function extractGujarati(source) {
  const re = /"((?:[^"\\]|\\.)*)"/g;
  const set = new Set();
  let m;
  while ((m = re.exec(source))) {
    const text = unescapeStr(m[1]).trim();
    if (isSpokenGujarati(text)) set.add(text);
  }
  return [...set];
}

/* True only for strings that are spoken: contain a real Gujarati letter,
   digit, or the Om sign, and no Latin letters. This excludes bare combining
   marks (e.g. a lone anusvar, which has no spoken form) and mixed
   English-and-Gujarati explanation text. */
function isSpokenGujarati(text) {
  if (!text) return false;
  if (/[A-Za-z]/.test(text)) return false;
  // Range covers the core letters, digits, and Om; ૹ (za) is added explicitly
  // because it sits past હ in Unicode but is a real, spoken consonant.
  return /[અ-હ૦-૯ૐૹ]/.test(text);
}

/* English: the History/Culture screen speaks each chapter's body joined by a
   space (era.body.join(" ")). We read the era body arrays out of the ERAS.push
   section so the text matches exactly what the app plays. */
function extractEnglishNarration(source) {
  const start = source.indexOf("ERAS.push");
  if (start < 0) return [];
  const region = source.slice(start);
  const out = [];
  const re = /\bbody:\s*\[/g;
  let m;
  while ((m = re.exec(region))) {
    const arr = readArrayLiteral(region, re.lastIndex); // starts just after '['
    if (!arr) continue;
    const parts = [];
    const sre = /"((?:[^"\\]|\\.)*)"/g;
    let sm;
    while ((sm = sre.exec(arr))) parts.push(unescapeStr(sm[1]));
    if (parts.length) out.push(parts.join(" "));
  }
  return out;
}

/* Read a bracketed array literal starting just after its opening '[', returning
   the raw inner text. String-aware so brackets inside strings do not confuse
   the depth count. */
function readArrayLiteral(s, from) {
  let i = from;
  let depth = 1;
  let buf = "";
  while (i < s.length && depth > 0) {
    const ch = s[i];
    if (ch === '"') {
      let str = '"';
      i++;
      while (i < s.length) {
        const c = s[i];
        str += c;
        i++;
        if (c === "\\") { str += s[i]; i++; continue; }
        if (c === '"') break;
      }
      buf += str;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) break; }
    buf += ch;
    i++;
  }
  return depth === 0 ? buf : null;
}

function unescapeStr(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

/* ---------------- filename + manifest key ---------------- */
function fileFor(text, lang) {
  const h = crypto.createHash("sha1").update(lang + "|" + text).digest("hex").slice(0, 10);
  return `${lang}-${h}.mp3`;
}
function keyFor(text, lang) {
  return lang + "|" + text;
}

/* ---------------- providers ---------------- */
function voiceFor(lang) {
  const env = lang === "en" ? process.env.EN_VOICE : process.env.GU_VOICE;
  const provider = PROVIDER === "azure" ? "azure" : "google";
  return env || DEFAULT_VOICE[provider][lang];
}
function langCode(lang) {
  return lang === "en" ? "en-US" : "gu-IN";
}

async function synth(text, lang) {
  if (PROVIDER === "azure") return synthAzure(text, lang);
  return synthGoogle(text, lang);
}

async function synthGoogle(text, lang, voiceOverride) {
  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) throw new Error("Missing GOOGLE_TTS_KEY. See AUDIO.md to get a Google Cloud Text-to-Speech key.");
  const rate = Number((lang === "en" ? process.env.EN_RATE : process.env.GU_RATE) || (lang === "en" ? "1.0" : "0.9"));
  // A pronunciation override can be either an IPA string (rendered on an English
  // WaveNet voice) or an object {ipa|text, voice, lang} that names its own voice.
  // The latter lets Perso-Arabic sounds (ɣ, q, x) be spoken by an Arabic voice,
  // which produces them natively; an English voice cannot and mangles them.
  const ov = lang === "gu" ? PRONUNCIATION_OVERRIDES[text] : null;
  const ovIpa = ov ? (typeof ov === "string" ? ov : ov.ipa || null) : null;
  const ovText = ov && typeof ov === "object" ? ov.text || null : null;
  const ovVoice = ov && typeof ov === "object" && ov.voice ? ov.voice : "en-US-Wavenet-F";
  const ovLang = ov && typeof ov === "object" && ov.lang ? ov.lang : "en-US";
  // A Gujarati comma-list (e.g. a count "આઠ, નવ, દસ") should pause between items.
  // Chirp3-HD runs them together and does not support SSML, so we synthesize these
  // on a Gujarati WaveNet voice with explicit breaks between the comma-separated parts.
  // Only short word-lists (counts, greetings, directions), not long prose that
  // merely contains commas: every comma-separated part must be short.
  const pauseList = lang === "gu" && !ov && text.includes(",") && text.length <= 40 &&
    text.split(",").every((p) => p.trim().length <= 14);
  // Letters with a pronunciation override are synthesized on a WaveNet voice
  // (Chirp3-HD does not support SSML), giving the exact intended sound.
  let input, voiceName, langCd;
  if (ov) {
    input = ovIpa ? { ssml: `<speak><phoneme alphabet="ipa" ph="${ovIpa}">v</phoneme></speak>` } : { text: ovText };
    voiceName = ovVoice;
    langCd = ovLang;
  } else if (pauseList) {
    const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
    input = { ssml: `<speak>${parts.join('<break time="450ms"/>')}</speak>` };
    voiceName = voiceOverride || "gu-IN-Wavenet-A";
    langCd = "gu-IN";
  } else {
    input = { text };
    voiceName = voiceOverride || voiceFor(lang);
    langCd = langCode(lang);
  }
  const res = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input,
        voice: { languageCode: langCd, name: voiceName },
        audioConfig: { audioEncoding: "MP3", speakingRate: ov ? 0.85 : rate },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google TTS ${res.status}: ${body.slice(0, 400)}`);
  }
  const j = await res.json();
  if (!j.audioContent) throw new Error("Google TTS returned no audioContent.");
  return Buffer.from(j.audioContent, "base64");
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function synthAzure(text, lang) {
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  if (!key || !region) throw new Error("Missing AZURE_TTS_KEY and/or AZURE_TTS_REGION. See AUDIO.md.");
  const rate = (lang === "en" ? process.env.EN_RATE : process.env.GU_RATE) || (lang === "en" ? "0%" : "-8%");
  const ssml =
    `<speak version="1.0" xml:lang="${langCode(lang)}"><voice name="${voiceFor(lang)}">` +
    `<prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "dhatu-audio",
    },
    body: ssml,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure TTS ${res.status}: ${body.slice(0, 400)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/* retry once on rate-limit / transient error */
async function synthWithRetry(text, lang) {
  try {
    return await synth(text, lang);
  } catch (e) {
    if (/\b(429|500|502|503)\b/.test(String(e.message))) {
      await sleep(2000);
      return await synth(text, lang);
    }
    throw e;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- main ---------------- */
async function main() {
  if (!fs.existsSync(SRC)) {
    console.error("Cannot find src/App.jsx at " + SRC);
    process.exit(1);
  }
  const source = fs.readFileSync(SRC, "utf8");

  const work = [];
  if (!EN_ONLY) extractGujarati(source).forEach((t) => work.push({ text: t, lang: "gu" }));
  if (!GU_ONLY) extractEnglishNarration(source).forEach((t) => work.push({ text: t, lang: "en" }));

  // de-duplicate by (lang, text)
  const seen = new Set();
  let list = [];
  for (const it of work) {
    const k = keyFor(it.text, it.lang);
    if (!seen.has(k)) { seen.add(k); list.push(it); }
  }
  if (LIMIT > 0) list = list.slice(0, LIMIT);

  const guN = list.filter((i) => i.lang === "gu").length;
  const enN = list.filter((i) => i.lang === "en").length;
  const chars = list.reduce((n, i) => n + i.text.length, 0);
  console.log(`Found ${list.length} items: ${guN} Gujarati, ${enN} English narration (${chars} characters).`);
  console.log(`Provider: ${PROVIDER}  voices: gu=${voiceFor("gu")} en=${voiceFor("en")}${DRY ? "  [dry run]" : ""}`);

  if (DRY) {
    list.slice(0, 40).forEach((i) => console.log(`  [${i.lang}] ${i.text.slice(0, 80)}${i.text.length > 80 ? "..." : ""}`));
    if (list.length > 40) console.log(`  ... and ${list.length - 40} more`);
    console.log("\nDry run only. No files written, no API calls made.");
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = {};
  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const it of list) {
    const file = fileFor(it.text, it.lang);
    const dest = path.join(OUT_DIR, file);
    items[keyFor(it.text, it.lang)] = file;

    if (!FORCE && fs.existsSync(dest)) {
      skipped++;
      continue;
    }
    try {
      let buf = await synthWithRetry(it.text, it.lang);
      // Chirp3-HD occasionally returns near-silence for very short words; fall
      // back to a reliable WaveNet voice when the clip is suspiciously small.
      if (buf.length < 1800 && PROVIDER !== "azure") {
        try {
          const fb = await synthGoogle(it.text, it.lang, it.lang === "en" ? "en-US-Wavenet-F" : "gu-IN-Wavenet-A");
          if (fb.length > buf.length) buf = fb;
        } catch (e) {}
      }
      fs.writeFileSync(dest, buf);
      made++;
      process.stdout.write(`\r  generated ${made}  (skipped ${skipped}, failed ${failed})   `);
      await sleep(120); // be gentle on rate limits
    } catch (e) {
      failed++;
      // Do not record a manifest entry for something we failed to generate, so
      // the app falls back to browser TTS for it instead of a broken file.
      delete items[keyFor(it.text, it.lang)];
      console.error(`\n  FAILED [${it.lang}]: "${it.text.slice(0, 60)}..."  ->  ${e.message}`);
    }
  }

  const manifest = {
    version: 1,
    provider: PROVIDER,
    voices: { gu: voiceFor("gu"), en: voiceFor("en") },
    generatedAt: new Date().toISOString(),
    count: Object.keys(items).length,
    items,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`\n\nDone. generated ${made}, reused ${skipped}, failed ${failed}.`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST)} (${manifest.count} clips)`);
  console.log(`Audio:    ${path.relative(ROOT, OUT_DIR)}/`);
  if (failed) console.log("Some items failed; the app will use browser speech for those.");
  console.log("\nNext: commit public/audio/ and push. Cloudflare will serve the files.");
}

main().catch((e) => {
  console.error("\nError: " + e.message);
  process.exit(1);
});
