/* Firebase: Google sign-in + per-user progress sync in Firestore.

   Progress is kept in the browser's localStorage (all the "dhatu_" keys the app
   already uses). This module mirrors that to Firestore so it follows the user
   across devices:
     - on sign-in we pull the user's saved progress into localStorage before the
       app mounts, so the app reads cloud data on start;
     - on every change we push a debounced snapshot back up.
   If Firestore is unreachable, everything still works locally and just does not
   sync, so the app never breaks on a network error. */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where,
  updateDoc, arrayUnion, arrayRemove, runTransaction, addDoc, deleteDoc, orderBy, limit,
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUid = null;
let currentUser = null;
let currentUsername = null;

const PREFIX = "dhatu_";

const _n = (k) => { try { return JSON.parse(window.localStorage.getItem(PREFIX + k)); } catch (e) { return null; } };

/* Public profile: the only fields other users can see (streak, Kaudi, name).
   Kept in a separate collection so private progress is never exposed. */
async function updatePublicProfile() {
  if (!currentUid) return;
  try {
    await setDoc(
      doc(db, "publicProfiles", currentUid),
      {
        username: currentUsername || "",
        name: (currentUser && currentUser.displayName) || "",
        photo: (currentUser && currentUser.photoURL) || "",
        streak: _n("streak") || 0,
        kaudi: _n("kaudi") || 0,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {}
}

function localSnapshot() {
  const out = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out[k] = window.localStorage.getItem(k);
    }
  } catch (e) {}
  return out;
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (u) => {
    currentUid = u ? u.uid : null;
    cb(u);
  });
}

export function signInWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

/* Pull the signed-in user's saved progress into localStorage. Call this and
   await it before mounting the app so useLocalState initializers read cloud
   values. On a brand-new account we seed the doc from whatever is local. */
export async function loadProgressToLocal(user) {
  const uid = typeof user === "string" ? user : user && user.uid;
  if (!uid) return;
  try {
    const ref = doc(db, "users", uid);
    // Keep a small profile on the doc so the staff view can show who each user is.
    if (user && typeof user !== "string") {
      setDoc(
        ref,
        { profile: { name: user.displayName || "", email: user.email || "", photo: user.photoURL || "" }, updatedAt: Date.now() },
        { merge: true }
      ).catch(() => {});
    }
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().progress) {
      // Cloud is the source of truth on sign-in: clear local first so an admin
      // reset (empty cloud progress) actually takes effect on the device.
      const data = snap.data().progress;
      clearLocalProgress();
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith(PREFIX) && typeof v === "string") window.localStorage.setItem(k, v);
      });
    } else {
      await setDoc(ref, { progress: localSnapshot(), updatedAt: Date.now() }, { merge: true });
    }
  } catch (e) {
    // offline or rules not set yet: keep working locally, just do not sync
  }
}

let _saveTimer = null;
/* Debounced upload of the current local progress snapshot for the signed-in
   user. Called by useLocalState whenever a value changes. */
export function scheduleSave() {
  if (!currentUid) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    if (!currentUid) return;
    try {
      await setDoc(
        doc(db, "users", currentUid),
        { progress: localSnapshot(), updatedAt: Date.now() },
        { merge: true }
      );
    } catch (e) {}
  }, 1200);
}

/* Clear local progress on sign-out so the next person on a shared device does
   not inherit it. Cloud copy is untouched and restored on next sign-in. */
export function clearLocalProgress() {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch (e) {}
}
