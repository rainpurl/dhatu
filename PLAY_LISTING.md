# Google Play listing + Data Safety - paste-ready copy

App: **Dhātu** (Gujarati learning). Package `app.dhatu.gujarati`. Free, no ads,
no in-app purchases. Category: **Education**. Contact: dhatulearning@katr.es.
Privacy policy URL: https://dhatu.pages.dev/privacy.html

---

## Store listing

**App name** (max 30 chars)
```
Dhatu: Learn Gujarati
```

**Short description** (max 80 chars)
```
Learn to read, write & speak Gujarati - plus its rich culture and history.
```

**Full description** (max 4000 chars)
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

---

## Content rating questionnaire
Category: **Reference, News, or Educational**. Answer **No** to every content
question (no violence, no sexual content, no profanity, no drugs, no gambling,
no user-generated shareable content beyond a username/profile). Expected rating:
**Everyone / PEGI 3**.

## Target audience & content
- Target age group: **13-17 and 18+** (do NOT target under 13 - the app is not
  designed for children and requires Google sign-in).
- Is the app designed for children? **No.**
- Ads: **No, my app does not contain ads.**

## App access
Play reviewers need to reach the signed-in experience. Provide credentials OR
enable the temporary reviewer path:
- Preferred: create a throwaway Google account, sign into the app once, and give
  its email + password under "All functionality is available with restrictions ->
  Provide instructions": "Tap Sign in with Google using the account below."
- Alternative: note that all content is behind Google sign-in and provide test
  credentials. (Do not ship the guest bypass to production.)

---

## DATA SAFETY form (the important one - must match privacy.html)

Overview answers:
- Does your app collect or share user data? **Yes.**
- Is all user data encrypted in transit? **Yes.**
- Do you provide a way to request data deletion? **Yes** - via email
  (dhatulearning@katr.es); also list the privacy policy URL.

Data types to declare:

1. **Personal info -> Name**
   - Collected: Yes. Shared: No.
   - Purpose: App functionality; Account management.
   - Required (not optional).
   - Source: from Google sign-in.

2. **Personal info -> Email address**
   - Collected: Yes. Shared: No.
   - Purpose: App functionality; Account management.
   - Required.

3. **Personal info -> User IDs**
   - Collected: Yes (Google account identifier + your chosen username).
   - Shared: No. Purpose: App functionality; Account management. Required.

4. **Photos** (profile photo URL from Google)
   - Collected: Yes. Shared: No. Purpose: App functionality. Optional.
   - (Only the Google profile photo; the app does not access the device gallery.)

5. **App activity -> Other user-generated content**
   - Collected: Yes (learning progress, saved words, follows, pokes, username).
   - Shared: No. Purpose: App functionality. Required.

6. **Audio -> Voice or sound recordings**
   - Collected: Yes. Shared: **Yes** (sent to a speech-to-text processor).
   - Purpose: App functionality (pronunciation feedback).
   - Optional (only when the user does speaking practice).
   - **Processed ephemerally?** YES - check "Data is processed ephemerally" /
     not stored. The clip is transcribed and discarded; only used for feedback.

Do NOT declare: location, contacts, financial info, health, messages, calendar,
web history, installed apps. The app collects none of these.

Notes:
- "Shared" in Play's definition = transferred to a third party. Firebase (Google)
  is a processor/storage provider, which Play treats as "collected, not shared";
  the speech-to-text call transfers the audio clip to a processor, declared under
  Audio as above with ephemeral processing.
- Everything here matches https://dhatu.pages.dev/privacy.html. If you change one,
  change both.

---

## Graphics checklist (sizes Play requires)
- App icon: 512 x 512 PNG (32-bit, <1 MB). Source: assets/icon-only.png -> resize.
- Feature graphic: 1024 x 500 PNG/JPG (no alpha).
- Phone screenshots: at least 2 (up to 8), 16:9 or 9:16, min 320 px, max 3840 px.
  1080 x 1920 is ideal. Captured from the device via adb (see below).

Suggested screenshot set (7): onboarding/logo, a script lesson, a vocab word card
with illustration, a multiple-choice exercise, speaking practice (hold-to-talk),
the profile/streak screen, the friends/social screen.
