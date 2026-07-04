# Generating audio for Dhātu

The app speaks Gujarati words and phrases, and reads each History/Culture
chapter aloud in English. By default it uses the browser's built-in
text-to-speech, which on most desktops has **no Gujarati voice installed** (so
Gujarati is often silent) and reads English in a **robotic** system voice.

The fix is to generate real audio files once and ship them with the site: clear
Gujarati, and natural English narration. This guide walks through it. You do not
need to know how the app works, just follow the steps.

Nothing here is destructive: generated audio is purely additive. Until you run
this, the app keeps using browser speech exactly as before.

By default the generator produces both Gujarati and English audio. To do just
one, add `--gu-only` or `--en-only` to the command.

---

## What you need

1. **Node 18 or newer** installed on your computer. Check by opening a terminal
   and running `node --version`. If you do not have it, install it from
   https://nodejs.org (the "LTS" version is fine).
2. **A cloud text-to-speech API key.** Google Cloud is the default and is
   covered below. Azure is also supported (see the end).

There is a generous free tier: Google gives roughly 1 million characters per
month free for the higher-quality voices, and 4 million for the standard ones.
The whole app is only a few thousand characters, so generating all of Dhātu's
audio is effectively free.

---

## Step 1: Get a Google Cloud API key

1. Go to https://console.cloud.google.com and sign in.
2. Create a project (top bar, "Select a project" then "New project"). Any name.
3. Enable the API: search the top bar for **"Cloud Text-to-Speech API"**, open
   it, and click **Enable**. (You may be asked to turn on billing. The free
   tier still applies; you will not be charged for this small amount.)
4. Create the key: go to **APIs & Services → Credentials → Create credentials →
   API key**. Copy the key it shows you.
5. (Recommended) Click the key to edit it, and under "API restrictions"
   restrict it to **Cloud Text-to-Speech API** only.

Keep the key private. Do not commit it or paste it into any file in the repo.

---

## Step 2: Run the generator

In a terminal, from the project folder, run (paste your key in place of
`YOUR_KEY`):

```
GOOGLE_TTS_KEY=YOUR_KEY npm run audio
```

You will see it find the phrases and generate one file each. It writes:

- `public/audio/*.mp3`: one small file per phrase
- `public/audio/manifest.json`: the list the app reads

Want to preview first without spending anything? Run a dry run:

```
npm run audio -- --dry
```

That prints the phrases it would generate and makes no API calls.

---

## Step 3: Commit and publish

Add the new `public/audio/` folder to the repo and push to `main` (through the
GitHub web interface or however you normally update the site). Cloudflare
rebuilds automatically, and the app will start playing the recorded audio.

To confirm it worked: open the live site, go to a lesson or the Script page, tap
a play button, and you should hear a clear Gujarati voice.

---

## Re-running later (after you add content)

The script is safe to run again any time. It **skips phrases that already have
a file**, so re-running only generates audio for new or changed phrases. Just
run the same command again and commit the new files.

To force every file to regenerate (for example after changing the voice):

```
GOOGLE_TTS_KEY=YOUR_KEY npm run audio -- --force
```

---

## Changing the voice

Set `GU_VOICE` to pick a different voice. For clearer, more natural Gujarati,
try one of Google's WaveNet voices:

```
GOOGLE_TTS_KEY=YOUR_KEY GU_VOICE=gu-IN-Wavenet-A npm run audio -- --force
```

Google's Gujarati voice names look like `gu-IN-Standard-A` through `-D` and
`gu-IN-Wavenet-A` through `-D` (A and C are female, B and D are male). If a name
is not available you will get a clear error and can try another.

You can also slow the speech down for learners with `GU_RATE` (default `0.9`;
lower is slower):

```
GOOGLE_TTS_KEY=YOUR_KEY GU_RATE=0.85 npm run audio -- --force
```

The English narration voice is set the same way with `EN_VOICE` (default
`en-US-Wavenet-F`) and `EN_RATE` (default `1.0`). For example:

```
GOOGLE_TTS_KEY=YOUR_KEY EN_VOICE=en-US-Neural2-C npm run audio -- --force
```

---

## Using Azure instead of Google

Azure's neural Gujarati voices are also very good. Get a **Speech** resource key
and its region from the Azure portal, then:

```
TTS_PROVIDER=azure AZURE_TTS_KEY=YOUR_KEY AZURE_TTS_REGION=eastus npm run audio
```

Azure voice names: `gu-IN-DhwaniNeural` (female, default) and
`gu-IN-NiranjanNeural` (male). For Azure, `GU_RATE` is a percentage like `-8%`.

---

## Troubleshooting

- **"Missing GOOGLE_TTS_KEY"**: you did not pass the key. Re-check Step 2.
- **A 403 error**: the API is not enabled, or the key is restricted to a
  different API. Re-check Step 1, points 3 and 5.
- **A few phrases say FAILED**: the app simply uses browser speech for those.
  You can re-run to retry them.
- **No sound after publishing**: make sure `public/audio/` (including
  `manifest.json`) was actually committed and pushed.

## Credits (recorded clips)

Most audio is TTS-generated, but one clip is a real recording because TTS cannot
produce a vowel-less consonant (the halant demo). `public/audio/gu-halant.m4a`
is from "Voiceless velar plosive" by Karmosin, Wikimedia Commons, licensed
**CC BY-SA 3.0** (https://commons.wikimedia.org/wiki/File:Voiceless_velar_plosive.ogg),
converted to m4a. It is wired via `MANUAL_CLIPS` in `scripts/generate-audio.mjs`
so re-running the generator never overwrites it.
