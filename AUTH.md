# Accounts and sign-in (Firebase)

Dhātu requires signing in with Google. Each user's progress (streak, Kaudi,
finished lessons, review words, settings) is saved to their account in Firebase
Firestore, so it follows them across devices. Everything here runs on Firebase's
free **Spark** plan, which has no billing attached and cannot charge you.

The app code is already wired up. The config lives in `src/firebaseConfig.js`
(these values are public by design; access is controlled by the rules below, not
by hiding them). You only need to finish a few settings in the Firebase console.

---

## Finish setup in the Firebase console

Project: **dhatu-9f586** at [console.firebase.google.com](https://console.firebase.google.com).

1. **Enable Google sign-in**
   Build → Authentication → Get started → Sign-in method → **Google** → Enable →
   pick a support email → Save.

2. **Create the database**
   Build → Firestore Database → Create database → Start in **production mode** →
   choose a location → Enable.

3. **Set security rules** (this is required, the default blocks everything)
   Firestore Database → **Rules** tab → replace everything with the block below →
   Publish:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

   This lets each signed-in person read and write only their own record, and
   nobody else's.

4. **Authorize your domains**
   Authentication → Settings → Authorized domains → **Add domain** →
   `dhatu.pages.dev`. (`localhost` is already there for local testing.)

That is all. Push the code, and sign-in will work on the live site.

---

## How it works (for future reference)

- `src/firebase.js` handles Google sign-in and syncs progress.
- On sign-in, the user's saved progress is pulled from Firestore into the
  browser before the app loads, so the app starts with their real data.
- On every change, a debounced snapshot is pushed back to Firestore.
- If Firestore is unreachable (offline, or rules not set yet), the app still
  works locally and simply does not sync, so it never breaks on a network error.
- Sign-out clears the local copy so a shared device does not leak progress; the
  cloud copy is untouched and restored on the next sign-in.

## Cost

Free tier (Spark plan): unlimited Google sign-ins, and Firestore allows 50,000
reads and 20,000 writes per day plus 1 GB storage at no cost. Because the Spark
plan has no billing account, going over a limit pauses service until the next
day rather than charging you. A single learner uses a tiny fraction of this.
