# Building the native Dhātu app (Capacitor) and publishing to Google Play

Dhātu is wrapped as a **real native app with Capacitor**: the web app (built to
`dist/`) is bundled *inside* a native Android app that runs in a native WebView,
with native plugins (native Google sign-in, status bar) and full offline. It is a
genuine `.aab` you upload to Google Play, not a shortcut to the website.

What is already set up in this repo:
- `capacitor.config.json` (appId `app.dhatu.learning`, appName Dhātu, `webDir: dist`).
- Capacitor + plugin deps in `package.json` (`@capacitor/core`, `/android`,
  `/cli`, `/app`, `/status-bar`, and `@capacitor-firebase/authentication`).
- Native Google sign-in wired in `src/firebase.js`: on a native build it uses the
  native plugin and hands the credential to Firebase; on the web it still uses the
  popup. (No change needed by you; it switches automatically.)
- App icons in `public/` (from the new logo) and the privacy policy at
  `public/privacy.html` -> https://dhatu.pages.dev/privacy.html
- Speech recognition for the speaking exercises (`src/App.jsx` `useVoiceCheck`),
  three engines in order of preference so it works the same on every device:
  1. **Cloud Whisper** (primary): records audio with `capacitor-voice-recorder`
     and transcribes it server-side via the free `/api/transcribe` Pages Function
     (Cloudflare Workers AI Whisper). Uniform across devices, no on-device model
     needed. Needs internet, the Cloudflare **AI** binding enabled (same one the
     writing grader uses), and a signed-in user (or `STT_ALLOW_ANON=1` for
     pre-launch testing). See GRADER.md.
  2. **Device recognizer** (`@capacitor-community/speech-recognition`): used when
     the cloud is offline or over its free budget.
  3. **Self-check** ("say it out loud, then continue") if neither is available.
  Both native engines add the **RECORD_AUDIO** permission and prompt for the mic
  the first time. On the web the app uses the browser Web Speech API.

You run the rest on your Mac. You need **Android Studio** (with a JDK and the
Android SDK) and, to publish, a **Google Play Console** account (one-time $25).

---

## Release build config (already applied in the local `android/`, git-ignored)

The `android/` folder is git-ignored, so if it is ever regenerated (`npx cap add
android`) these manual steps must be re-applied. They are what makes a working
signed release build:

1. **`android/app/google-services.json`** - downloaded from the Firebase Android
   app (package `app.dhatu.learning`). Required; Firebase can't init without it.
2. **play-services-auth** - add to `android/app/build.gradle` `dependencies {}`:
   `implementation "com.google.android.gms:play-services-auth:20.7.0"`.
   REQUIRED: the Firebase-auth Google provider needs `GoogleSignIn`; without it
   the app crashes on launch with `NoClassDefFoundError`.
3. **server_client_id** - in `android/app/src/main/res/values/strings.xml`:
   `<string name="server_client_id">…apps.googleusercontent.com</string>`
   (the OAuth **web** client id from `google-services.json`), for Google sign-in.
4. **Signing** - `android/keystore.properties` (git-ignored) holds `storeFile`,
   `keyAlias`, `storePassword`, `keyPassword`; `android/app/build.gradle` has a
   `signingConfigs.release` reading it and `buildTypes.release` using it. The
   keystore itself is `~/dhatu-release.keystore` (SHA-1 `12:DF:6D:…`) - back it up.
5. **Launcher icons** - source in `assets/icon-foreground.png`,
   `icon-background.png`, `icon-only.png`; regenerate with
   `npx @capacitor/assets generate --android`.
6. **Target API 35 (Play requirement).** Play rejects targetSdk < 35. In
   `android/variables.gradle` set `compileSdkVersion = 35` and
   `targetSdkVersion = 35`. compileSdk 35 needs a newer toolchain than Capacitor
   6's default, so also bump: `android/build.gradle` classpath
   `com.android.tools.build:gradle:8.7.2` (was 8.2.1), and
   `android/gradle/wrapper/gradle-wrapper.properties` `gradle-8.9-all.zip`
   (was 8.2.1). Requires SDK `platforms;android-35` + `build-tools;35.0.0`
   installed via `sdkmanager`. Builds clean with JDK 17.

Build the signed artifacts:
```
npm run build && npx cap copy android
cd android && ./gradlew bundleRelease assembleRelease
```
Outputs: `android/app/build/outputs/bundle/release/app-release.aab` (upload to
Play) and `.../apk/release/app-release.apk` (sideload test).

---

## One-time setup

1. **Install dependencies** (pulls the Capacitor packages now in package.json):
   ```
   npm install
   ```
2. **Create the Android project**:
   ```
   npm run build
   npx cap add android
   npx cap sync
   ```
   This makes an `android/` folder (git-ignored). Re-run `npx cap sync` after any
   web change.

3. **Register the app in Firebase (needed for native Google sign-in):**
   - Firebase console -> project **dhatu-9f586** -> Add app -> **Android**.
   - Package name: **`app.dhatu.learning`** (must match `capacitor.config.json`).
   - Add your signing **SHA-1** and **SHA-256** fingerprints. Get the debug one
     from Android Studio (Gradle tab -> `signingReport`) or:
     ```
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
     Add the **release** keystore's fingerprints too once you create it (Step in
     "Publishing"). Also add Google Play's App Signing SHA-1 later.
   - Download **`google-services.json`** and put it in **`android/app/`**.
   - Make sure the **Google** sign-in provider is enabled in Firebase
     Authentication (it already is for the web app).

4. **Finish the auth plugin's Android setup** per
   `@capacitor-firebase/authentication` docs (it mostly works from
   `google-services.json`; you may need to add your Firebase **Web client ID** to
   `strings.xml` as `server_client_id`, which the plugin docs spell out).

---

## Run it

```
npm run build && npx cap sync
npx cap open android      # opens Android Studio
```
Then Run on an emulator or a plugged-in phone. Test that **Google sign-in works**
and that lessons/audio play.

---

## App icon and splash

Generate native icons/splash from the logo:
```
npx @capacitor/assets generate --android
```
(Put a 1024x1024 `resources/icon.png` and a `resources/splash.png` first; you can
export those from `public/logo.svg` / `public/icon-512.png`.)

---

## Publishing to Google Play

1. In Android Studio: set `versionCode` / `versionName` in
   `android/app/build.gradle`, then **Build -> Generate Signed Bundle / APK ->
   Android App Bundle**. Create a **release keystore** and **back it up with its
   passwords** (losing it means you can never update the app).
2. Google Play Console (pay the one-time $25), create the app, upload the `.aab`
   to **Internal testing** first, then promote to Production.
3. Store listing:
   - Icon: `public/icon-512.png` (512x512).
   - Feature graphic 1024x500, and at least 2 phone screenshots (grab from the app).
   - Description: reuse the site copy.
   - **Privacy policy URL:** `https://dhatu.pages.dev/privacy.html`
   - **Data safety** form: declare account info (name, email) + app activity,
     stored via Firebase, used for sign-in and saving progress; not sold/shared.
     The app records audio **only on-device** for the speaking exercises (mic
     permission); no audio is uploaded or stored, so declare it as processed on
     the device and not collected.
   - **Permissions:** the store will show RECORD_AUDIO. It is used for
     pronunciation checking in the speaking exercises.
   - Content rating questionnaire, target audience.
4. Submit for review (first review usually a few days).

**Updating later:** make web changes, `npm run build && npx cap sync`, bump the
version, rebuild the signed `.aab` with the **same keystore**, upload.

---

## iOS

Needs a Mac with **full Xcode** (not just Command Line Tools), **CocoaPods**, and
an **Apple Developer Program** membership. The `ios/` folder is git-ignored, like
`android/`, so the manual config below must be re-applied if it is regenerated.

**Apple Developer Program cost + nonprofit waiver.** It is normally **$99/year**,
but Apple **waives that fee for eligible nonprofits** (501(c)(3) etc.) via its
fee-waiver / Apple School-and-nonprofit program - apply once the org's D-U-N-S
and Apple Developer enrollment are in place, same idea as Google for Nonprofits.

**Already scaffolded + applied on this machine (survives in the local `ios/`):**
- `@capacitor/ios@6.2.1` installed (in `package.json`); iOS platform added via
  `npx cap add ios` (appId `app.dhatu.learning`, display name `Dhātu`).
- **Permission strings** added to `ios/App/App/Info.plist` (REQUIRED - the app
  crashes / App Review rejects without them): `NSMicrophoneUsageDescription` and
  `NSSpeechRecognitionUsageDescription` (both needed for the speaking exercises:
  `capacitor-voice-recorder` + `@capacitor-community/speech-recognition`).
- **App icons** generated into the asset catalog via
  `npx @capacitor/assets generate --ios` (same diamond as Android).

**Remaining owner steps (need Xcode + Apple account, so pending):**
1. **Install the toolchain:** full **Xcode** from the App Store, then
   `xcode-select --install` is not enough - run `sudo xcode-select -s
   /Applications/Xcode.app/Contents/Developer`. Install **CocoaPods**
   (`sudo gem install cocoapods` or via Homebrew).
2. **Sync (runs `pod install`, which failed here for lack of CocoaPods):**
   ```
   npm run build && npx cap sync ios
   npx cap open ios
   ```
3. **Firebase iOS app:** in the Firebase console add an **iOS** app (bundle id
   `app.dhatu.learning`), download **`GoogleService-Info.plist`**, and drag it
   into the `App` target in Xcode (checked "Copy items if needed").
4. **Google sign-in URL scheme:** open `GoogleService-Info.plist`, copy
   `REVERSED_CLIENT_ID`, and add it as a URL scheme under the target's
   **Info -> URL Types** (or a `CFBundleURLTypes` entry in `Info.plist`). The same
   `src/firebase.js` native path (`@capacitor-firebase/authentication`) then works
   on iOS - it is gated on `window.Capacitor.isNativePlatform()`, which is true on
   iOS too, so no code change.
5. **Signing:** in Xcode target **Signing & Capabilities**, select the org team;
   let Xcode manage signing (creates the App ID + provisioning profile).
6. **Version:** set `MARKETING_VERSION` (e.g. 1.0) and `CURRENT_PROJECT_VERSION`
   (build number) in the target's build settings.
7. **Archive + upload:** Xcode **Product -> Archive**, then **Distribute App ->
   App Store Connect**. Create the app in **App Store Connect** (same listing copy
   as `PLAY_LISTING.md`, App Privacy answers mirroring `privacy.html`), attach the
   build, and submit for review.
8. **Speech backend** is shared with Android (the Cloudflare `/api/transcribe`
   Function + Groq overflow), so nothing iOS-specific there.

The web bundle, Firebase, speech, and back-button handling are all shared with
Android - iOS is purely the native shell + signing.
