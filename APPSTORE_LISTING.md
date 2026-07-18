# App Store Connect listing + App Privacy - paste-ready copy

App: **Dhātu** (Gujarati learning). Bundle id `app.dhatu.gujarati`. Free, no ads,
no in-app purchases. Primary category: **Education**. Privacy policy:
https://dhatu.pages.dev/privacy.html

Read the COMPLIANCE section at the bottom before submitting - there are review
blockers to resolve first (Sign in with Apple, in-app account deletion, Ko-fi).

---

## App information

**App Name** (max 30 chars)
```
Dhatu: Learn Gujarati
```

**Subtitle** (max 30 chars)
```
Gujarati Language & Culture
```

**Promotional Text** (max 170 chars, editable without a new build)
```
Learn Gujarati from your first letter to real conversation - and explore the culture behind it. Free, ad-free, with native audio, vocabulary, and speaking practice.
```

**Keywords** (max 100 chars, comma-separated, no spaces after commas)
```
gujarati,learn gujarati,gujarati language,culture,india,script,kakko,speaking,heritage,bhasha
```

**Description** (max 4000 chars)
```
Dhatu is a free, ad-free app for learning Gujarati from scratch - the script,
the sounds, the words, real conversation, and the culture behind it all. Whether
you are reconnecting with your family's language or starting fresh, Dhatu takes
you step by step from your first letter to holding a conversation.

WHAT SETS DHATU APART: CULTURE
Dhatu is more than a phrasebook. A built-in Culture section takes you deep into
where the language comes from - Gujarat's history, food, music, communities, and
landmarks - in illustrated, carefully sourced stories you can listen to in both
English and Gujarati. It is the part learners say they cannot find in any other
app.

WHAT YOU LEARN
- The Gujarati script (kakko), one sound at a time, with native audio.
- Reading and writing, with romanized hints early on that fade away as you grow.
- Everyday vocabulary across dozens of topics - food, family, travel, numbers,
  work, and more - each word with its own illustration and example sentence.
- Grammar and sentence-building through short, guided exercises.
- Speaking practice: hold the button, say the phrase, and get feedback on your
  pronunciation.
- Gujarat's culture and history: eras, communities, food, music, and places,
  with narration in both languages.

HOW IT WORKS
- Bite-size lessons grouped into units and chapters, so progress feels natural.
- Thousands of clear native-voice audio clips for every word and phrase.
- Timed proficiency checks to see how far you have come.
- A streak, points, and a personal profile to keep you motivated.
- Connect with friends, follow their progress, and cheer each other on.

WHY DHATU
- Culture at its heart: understand the people, places, and history behind the
  words, not just the vocabulary.
- Completely free. No ads, no paywalls, no upsells.
- Built for real comprehension, not just matching games - later lessons drop the
  training-wheel romanization so you actually read Gujarati.
- Respectful, culturally grounded content.

Sign in to save your progress and sync across devices.

Start today - your first lesson is one tap away.
```

**Support URL:** https://dhatu.pages.dev
**Marketing URL** (optional): https://dhatu.pages.dev
**Copyright:** 2026 [nonprofit legal name]

## Age rating
Answer **None** to all content questions -> expected **4+**. (No violence,
sexual content, profanity, gambling, or unrestricted web access.)

## Review notes (App Review -> App Information -> Notes)
Provide a demo account, since content is behind sign-in:
"All content is available after signing in. Demo account: <email> / <password>.
Speaking practice records a short audio clip and sends it to a speech-to-text
service to score pronunciation; it is processed transiently and not stored."

---

## App Privacy (App Store Connect -> App Privacy) - mirrors privacy.html

**Do you or your partners collect data from this app? Yes.**
**Is data used to track users?** No (no tracking, no ads, no data brokers).

Declare these data types (all **Linked to the user's identity**, **Not used for
tracking**):

1. **Contact Info -> Name**
   - Purpose: App Functionality. (From Google sign-in.)
2. **Contact Info -> Email Address**
   - Purpose: App Functionality.
3. **Identifiers -> User ID**
   - Purpose: App Functionality. (Google account id + chosen username.)
4. **User Content -> Audio Data**
   - Purpose: App Functionality. (Pronunciation clips, processed transiently to
     produce a transcript for feedback, not stored - note this in the description
     field Apple provides.)
5. **User Content -> Photos or Videos**
   - Purpose: App Functionality. (Only the Google profile photo URL; the app does
     not access the device photo library.)
6. **Usage Data -> Product Interaction**
   - Purpose: App Functionality. (Lessons completed, streak, points, saved words,
     follows/pokes.)

Do NOT declare: Location, Contacts, Health, Financial Info, Browsing History,
Search History, Purchases, Diagnostics. The app collects none of these.

Note: keep this identical to https://dhatu.pages.dev/privacy.html and the Google
Play Data-safety form. If one changes, change all three.

---

## COMPLIANCE - status before submitting to App Review

Apple rejects on these more strictly than Google. Three items were found; two are
fixed, one remains and needs the Apple Developer account to complete.

1. **[CODE DONE - needs config] Sign in with Apple (Guideline 4.8).** A "Sign in
   with Apple" button is now on the sign-in screen for the iOS app and the website
   (hidden on native Android); `signInWithApple()` is in `src/firebase.js` (native
   Apple sheet via the Capacitor plugin, popup on web). It stays inert with a
   friendly "not available yet" message until Apple is enabled as a Firebase auth
   provider, which requires the **Apple Developer account**. To activate: in the
   Apple Developer portal enable the Sign in with Apple capability on the App ID
   and create a Services ID (web) + key; in the Firebase console enable the Apple
   provider (Services ID, Team ID, Key ID, private key); in Xcode add the Sign in
   with Apple capability. No further app-code change needed.

2. **[FIXED] In-app account deletion (Guideline 5.1.1(v)).** Added a Profile-tab
   "Delete account" control that re-authenticates and deletes the Firebase auth
   user plus all their Firestore data (username, public profile, progress, pokes).
   `deleteAccount()` in `src/firebase.js`; privacy.html updated. Satisfies Google
   Play too.

3. **[FIXED] Ko-fi link (Guideline 3.2.1).** The personal Ko-fi "support" link is
   now hidden inside the native iOS app (`IS_IOS` gate in `src/App.jsx`); Android
   and the plain web keep it. If the nonprofit later wants in-app donations on iOS,
   it must be an Apple-approved nonprofit using Apple Pay.
