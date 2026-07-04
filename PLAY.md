# Publishing Dhātu to the Google Play Store

Dhātu is now an installable **PWA** (web app manifest, icons, and a service
worker are in `public/`). The cleanest way to get it on Google Play is a **TWA
(Trusted Web Activity)**: a thin Android app that runs the live website
(dhatu.pages.dev) full-screen in Chrome. This route is ideal here because:

- It reuses the exact web app, so there is nothing to re-code.
- **Google sign-in keeps working** (a TWA runs in real Chrome, so the existing
  `signInWithPopup` flow is fine, unlike a plain WebView wrapper).
- The only cost is the **one-time $25 Google Play Console fee**. No recurring fee.

Everything below runs on your Mac (you'll need the Node you installed earlier).

---

## Step 0: Deploy the PWA first

Commit and push (so Cloudflare serves the new files), then confirm these all load:

- https://dhatu.pages.dev/manifest.webmanifest
- https://dhatu.pages.dev/logo.svg , /icon-512.png , /icon-192.png
- https://dhatu.pages.dev/sw.js

Optional sanity check: open the site in Chrome on your phone; the menu should
offer **"Install app" / "Add to Home screen"**. If it does, the PWA is valid.

---

## Step 1: Install Bubblewrap (the TWA builder)

```
npm install -g @bubblewrap/cli
```

The first run offers to download a JDK and the Android SDK for you; say yes.

---

## Step 2: Generate the Android project

```
bubblewrap init --manifest https://dhatu.pages.dev/manifest.webmanifest
```

Answer the prompts:
- **Application ID (package name):** something like `dev.dhatu.app` (permanent, can't change after publishing).
- **App name:** Dhātu
- **Launcher name:** Dhātu
- Accept the defaults it pulls from the manifest (colors, icon).
- When asked about a **signing key**, let it create one. **Back up the keystore
  file and its passwords somewhere safe** (a lost key means you can't update the
  app ever again).

---

## Step 3: Build the app bundle

```
bubblewrap build
```

This produces **`app-release-bundle.aab`** (upload this to Play) and an APK for
local testing. Test the APK on a phone/emulator if you like.

---

## Step 4: Link the app to the website (Digital Asset Links)

This is what removes the browser URL bar and proves you own both.

1. Get your app's SHA-256 fingerprint:
   ```
   bubblewrap fingerprint
   ```
   Also note the fingerprint from **Play Console -> your app -> Setup -> App
   integrity -> App signing** after you upload (Google re-signs with its own key;
   you usually need to list **both** the upload key and Google's signing key).
2. Edit `public/.well-known/assetlinks.json` and replace the two placeholders:
   - `package_name` -> your Application ID (e.g. `dev.dhatu.app`)
   - `sha256_cert_fingerprints` -> your fingerprint(s), e.g.
     `["AB:CD:...", "12:34:..."]`
3. Commit + push so it goes live at
   https://dhatu.pages.dev/.well-known/assetlinks.json

---

## Step 5: Create the Play listing and submit

In the **Google Play Console** (after paying the one-time $25):

1. Create an app, upload `app-release-bundle.aab` to a testing track first
   (internal testing is easiest), then promote to production.
2. Store listing: app name, short + full description (reuse the site copy), the
   **512x512 icon** (`public/icon-512.png`), a feature graphic (1024x500), and
   **at least 2 phone screenshots** (grab them from the running app).
3. **Privacy policy URL** (required, because the app uses Google sign-in via
   Firebase). Host a short policy page and paste the URL. See note below.
4. Fill the **Data safety** form: declare that the app collects account info
   (name, email) and app activity for sign-in and saving progress via Firebase.
5. Content rating questionnaire, target audience, etc.
6. Submit for review. First review typically takes a few days.

---

## Notes

- **Privacy policy:** you need a public URL. Simplest is a plain page (even a
  Cloudflare Pages route or a Google Doc published to web) stating what is
  collected (Google account name/email, learning progress), that it is stored in
  Firebase/Firestore, and how to request deletion.
- **Updating the app later:** bump `appVersion`/`appVersionCode` in
  `twa-manifest.json` (created by Bubblewrap), run `bubblewrap build` again with
  the **same keystore**, upload the new `.aab`.
- **iOS later:** the App Store needs the $99/year Apple Developer Program and a
  different wrapper (Capacitor or a WKWebView shell); the sign-in flow needs a
  native plugin there. Do Android first (this guide), iOS as a separate effort.
- Bubblewrap writes `twa-manifest.json` and an Android project into whatever
  folder you run it in; keep those out of this web repo (or in a separate folder)
  so they don't clutter the site build.
