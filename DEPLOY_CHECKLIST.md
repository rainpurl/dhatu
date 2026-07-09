# Dhātu deployment checklist (nonprofit / org accounts)

The plan: publish under the nonprofit as **Organization** accounts on both stores.
Org accounts skip Google's 12-tester / 14-day requirement, but need a **D-U-N-S
number** (free, up to ~30 days from Dun & Bradstreet). Everything build-side is
already done; this is the order to work through once the D-U-N-S arrives.

Nothing here costs money except optional store fees, and both fees can be waived
for nonprofits (Google for Nonprofits; Apple's nonprofit fee waiver).

---

## Phase 0 - Start now (while waiting on D-U-N-S)

- [ ] Confirm the nonprofit is a **registered legal entity** (name + address that
      D&B and the stores can verify). D-U-N-S is issued to a real org.
- [ ] **Apply for the free D-U-N-S number** at dnb.com (nonprofit's legal name +
      address). Do NOT pay for expedited. This is the long pole (~30 days).
- [ ] **Enroll in Google for Nonprofits** (google.com/nonprofits) to waive the
      $25 Play fee and unlock other perks.
- [ ] **Push all commits in GitHub Desktop.** This is independent of the accounts
      and: deploys the corrected privacy policy to the live URL, and triggers the
      Cloudflare redeploy that activates the speech backend (incl. Groq overflow).
- [ ] In Cloudflare Pages -> the dhatu project, confirm the STT env/bindings are
      set: `AI` (Workers AI), `GRADER` (KV namespace), `GROQ_API_KEY` (secret).
      Optional pre-launch: `STT_ALLOW_ANON=1` (remove once sign-in is enforced).

---

## Phase 1 - Google Play (Android)  [D-U-N-S required]

- [ ] Create a **Google Play Console** account as **Organization** (nonprofit
      legal name + D-U-N-S). Apply the Google-for-Nonprofits fee waiver if enrolled.
- [ ] Create the app: **Dhatu**, Free, category **Education**.
- [ ] **Upload `~/Downloads/Dhatu-release.aab`** (versionCode 3, targetSdk 35) to
      an **Internal testing** track first; install it on your own phone from Play
      to confirm sign-in works end to end.
- [ ] Accept **Play App Signing** enrollment when prompted.
- [ ] **CRITICAL - Firebase SHA-1:** Play Console -> Setup -> App integrity ->
      copy the **App signing key SHA-1** -> add it as a fingerprint to the
      `app.dhatu.learning` app in the Firebase console. Without this, Google
      sign-in fails for everyone who installs from Play.
- [ ] Fill the listing from **PLAY_LISTING.md**; upload the icon + feature
      graphic from `assets/` (`play-store-icon-512.png`, `play-feature-1024x500.png`).
- [ ] Complete **Data safety** (matches privacy.html - includes the optional
      pronunciation audio), **content rating**, **target audience** (13+, not
      designed for children), **ads: none**.
- [ ] Promote the release from Internal testing to **Production** (org accounts do
      not need the closed-testing period).

## Phase 2 - Apple App Store (iOS)  [D-U-N-S required]

- [ ] Enroll in the **Apple Developer Program** as the **Organization** (needs the
      same D-U-N-S). Apply Apple's **nonprofit fee waiver** to skip the $99/year.
- [ ] On the Mac: install **full Xcode** from the App Store and **CocoaPods**
      (`sudo gem install cocoapods`), then
      `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- [ ] `npm run build && npx cap sync ios && npx cap open ios` (this runs the
      `pod install` that could not run without CocoaPods).
- [ ] Firebase console -> add an **iOS** app (bundle id `app.dhatu.learning`),
      download **`GoogleService-Info.plist`**, drag it into the App target in Xcode.
- [ ] Add the **`REVERSED_CLIENT_ID`** URL scheme (Info -> URL Types) for Google
      sign-in.
- [ ] **Add Sign in with Apple (REQUIRED for App Review, Guideline 4.8).** The app
      offers Google login, so Apple requires an equivalent privacy-focused option.
      Enable **Apple** as a provider in Firebase Auth, add the **Sign in with Apple**
      capability in Xcode, and add a "Sign in with Apple" button using
      `@capacitor-firebase/authentication`'s Apple path (mirrors the Google path in
      `src/firebase.js`). This is the one remaining iOS code blocker.
- [ ] Set the team under **Signing & Capabilities**; set version + build number.
- [ ] **Product -> Archive -> Distribute -> App Store Connect.**
- [ ] In **App Store Connect**: create the app, reuse the PLAY_LISTING.md copy,
      fill **App Privacy** (mirror privacy.html), attach the build, submit.

See **NATIVE.md** for the full iOS detail (already-applied config vs. remaining).

---

## Already done (no action needed)
- Android signed `.aab` built (targetSdk 35, versionCode 3), verified on-device.
- iOS Xcode project scaffolded, Info.plist permission strings + app icons applied
  locally (in the git-ignored `ios/`).
- Store listing copy + graphics (PLAY_LISTING.md, assets/).
- Privacy policy corrected for cloud speech; Data-safety answers drafted.
- Speech backend: Cloudflare Whisper primary + Groq (whisper-large-v3) overflow.
- In-app account deletion (Profile -> Delete account); satisfies App Store
  5.1.1(v) and Google Play. Privacy policy updated.
- Ko-fi support link hidden inside the iOS app (kept on Android + web).

## Standing reminders
- **Back up** `~/dhatu-release.keystore` + its password (losing it = cannot update
  the Android app, ever).
- **Rotate the Google TTS key** (only needed when regenerating audio).
