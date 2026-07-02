#!/usr/bin/env node
/*
  generate-audio.mjs
  ------------------
  One-time (and re-runnable) generator that turns every Gujarati phrase in the
  app into a pre-recorded mp3, using a cloud text-to-speech service. It writes:

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
    GU_VOICE       voice name to use               (see defaults below)
    GU_RATE        speaking rate                   (Google: number like 0.9,
                                                     Azure: percent like -8%)

  FLAGS (command line)
    --force        re-generate even if the mp3 already exists
    --dry          list phrases and cost estimate, make no API calls, write nothing
    --limit N      only process the first N phrases (handy for a quick test)
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
const LIMIT = (() => {
  const i = argv.indexOf("--limit");
  return i >= 0 && argv[i + 1] ? parseInt(argv[i + 1], 10) : 0;
})();

const PROVIDER = (process.env.TTS_PROVIDER || "google").toLowerCase();

/* ---------------- extract Gujarati phrases from the source ---------------- */
/* The app speaks Gujarati text that is stored as pure-Gujarati string literals
   (word/phrase fields like gu and say, the script letters, and the per-era
   Gujarati history summaries). We collect every double-quoted string that is
   pure Gujarati, reading straight from the source so this list can never drift
   from the app. Mixed English explanations (which contain Latin letters and are
   never spoken as a whole) are skipped automatically. */
function extractPhrases(source) {
  const re = /"((?:[^"\\]|\\.)*)"/g;
  const set = new Set();
  let m;
  while ((m = re.exec(source))) {
    const text = m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
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
  return /[અ-હ૦-૯ૐ]/.test(text);
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
async function synth(text) {
  if (PROVIDER === "azure") return synthAzure(text);
  return synthGoogle(text);
}

async function synthGoogle(text) {
  const key = process.env.GOOGLE_TTS_KEY;
  if (!key) throw new Error("Missing GOOGLE_TTS_KEY. See AUDIO.md to get a Google Cloud Text-to-Speech key.");
  const voice = process.env.GU_VOICE || "gu-IN-Standard-A";
  const rate = Number(process.env.GU_RATE || "0.9");
  const res = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + encodeURIComponent(key),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "gu-IN", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate },
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
async function synthAzure(text) {
  const key = process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_TTS_REGION;
  if (!key || !region) throw new Error("Missing AZURE_TTS_KEY and/or AZURE_TTS_REGION. See AUDIO.md.");
  const voice = process.env.GU_VOICE || "gu-IN-DhwaniNeural";
  const rate = process.env.GU_RATE || "-8%";
  const ssml =
    `<speak version="1.0" xml:lang="gu-IN"><voice name="${voice}">` +
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
async function synthWithRetry(text) {
  try {
    return await synth(text);
  } catch (e) {
    if (/\b(429|500|502|503)\b/.test(String(e.message))) {
      await sleep(2000);
      return await synth(text);
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
  let phrases = extractPhrases(source);
  const lang = "gu";
  if (LIMIT > 0) phrases = phrases.slice(0, LIMIT);

  const totalChars = phrases.reduce((n, p) => n + p.length, 0);
  console.log(`Found ${phrases.length} unique Gujarati phrases (${totalChars} characters).`);
  console.log(`Provider: ${PROVIDER}${DRY ? "  [dry run]" : ""}`);

  if (DRY) {
    phrases.slice(0, 40).forEach((p) => console.log("  " + p));
    if (phrases.length > 40) console.log(`  ... and ${phrases.length - 40} more`);
    console.log("\nDry run only. No files written, no API calls made.");
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const items = {};
  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < phrases.length; i++) {
    const text = phrases[i];
    const file = fileFor(text, lang);
    const dest = path.join(OUT_DIR, file);
    items[keyFor(text, lang)] = file;

    if (!FORCE && fs.existsSync(dest)) {
      skipped++;
      continue;
    }
    try {
      const buf = await synthWithRetry(text);
      fs.writeFileSync(dest, buf);
      made++;
      process.stdout.write(`\r  generated ${made}  (skipped ${skipped}, failed ${failed})   `);
      await sleep(120); // be gentle on rate limits
    } catch (e) {
      failed++;
      // Do not record a manifest entry for a phrase we failed to generate, so
      // the app falls back to browser TTS for it instead of a broken file.
      delete items[keyFor(text, lang)];
      console.error(`\n  FAILED: "${text}"  ->  ${e.message}`);
    }
  }

  const manifest = {
    version: 1,
    provider: PROVIDER,
    voice: process.env.GU_VOICE || (PROVIDER === "azure" ? "gu-IN-DhwaniNeural" : "gu-IN-Standard-A"),
    generatedAt: new Date().toISOString(),
    count: Object.keys(items).length,
    items,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`\n\nDone. generated ${made}, reused ${skipped}, failed ${failed}.`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST)} (${manifest.count} phrases)`);
  console.log(`Audio:    ${path.relative(ROOT, OUT_DIR)}/`);
  if (failed) console.log("Some phrases failed; the app will use browser speech for those.");
  console.log("\nNext: commit public/audio/ and push. Cloudflare will serve the files.");
}

main().catch((e) => {
  console.error("\nError: " + e.message);
  process.exit(1);
});
