# App Store Connect listing + App Privacy - paste-ready copy

App: **Dhātu** (Gujarati learning). Bundle id `app.dhatu.learning`. Free, no ads,
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
Read, write & speak Gujarati
```

**Promotional Text** (max 170 chars, editable without a new build)
```
Learn Gujarati from the first letter to real conversation - free, ad-free, with native audio, illustrated vocabulary, and speaking practice.
```

**Keywords** (max 100 chars, comma-separated, no spaces after commas)
```
gujarati,learn gujarati,gujarati language,india,script,kakko,speaking,alphabet,heritage,bhasha
```

**Description** (max 4000 chars)
```
Dhatu is a free, ad-free app for learning Gujarati from scratch - the script,
the sounds, the words, and real conversation. Whether you are reconnecting with
your family's language or starting fresh, Dhatu takes you step by step from your
first letter to holding a conversation.

WHAT YOU LEARN
- The Gujarati script (kakko), one sound at a time, with native audio.
- Reading and writing, with romanized hints early on that fade away as you grow.
- Everyday vocabulary across dozens of topics - food, family, travel, numbers,
  work, and more - each word with its own illustration and example sentence.
- Grammar and sentence-building through short, guided exercises.
- Speaking practice: hold the button, say the phrase, and get feedback on your
  pronunciation.

HOW IT WORKS
- Bite-size lessons grouped into units and chapters, so progress feels natural.
- Thousands of clear native-voice audio clips for every word and phrase.
- Timed proficiency checks to see how far you have come.
- A streak, points, and a personal profile to keep you motivated.
- Connect with friends, follow their progress, and cheer each other on.

WHY DHATU
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

## COMPLIANCE - resolve before submitting to App Review

Apple rejects on these more strictly than Google. Three items found in the app:

1. **Sign in with Apple is required (Guideline 4.8).** The app's only login is
   "Continue with Google" (a third-party social login). Apps that offer a
   third-party login must ALSO offer a privacy-focused equivalent; Sign in with
   Apple satisfies it. This is a near-certain iOS rejection as-is. Needs: enable
   Apple as a Firebase auth provider, add the `@capacitor-firebase/authentication`
   Apple path + an "Sign in with Apple" button, and add the Sign in with Apple
   capability in Xcode (requires the Apple Developer account). Web/Android can
   keep Google-only.

2. **In-app account deletion is required (Guideline 5.1.1(v)).** The app creates
   accounts but has no in-app "delete my account" flow (privacy.html only offers
   email deletion, which Apple does not accept). Needs a Profile-screen control
   that deletes the Firebase auth user + their Firestore data. Google Play now
   requires this too.

3. **Ko-fi "buy the developer a coffee" link (Guideline 3.2.1).** `src/App.jsx`
   links to a personal Ko-fi (ko-fi.com/rainglade). Under a nonprofit this is
   doubly problematic: Apple restricts donations (approved nonprofits must use
   Apple Pay and disclose fund use; personal tip jars tied to an app are not
   allowed), and a nonprofit app should not route money to a personal account.
   Recommended: remove it from the app (keep it on the plain website only), or
   replace it later with a compliant nonprofit donation flow.
