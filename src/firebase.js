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
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
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
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

let currentUid = null;
let currentUser = null;
let currentUsername = null;
// Set while an account deletion is in flight so the reauth step (which briefly
// re-signs the user in) can't race the sync functions into re-creating the very
// docs we are deleting.
let _deleting = false;

const PREFIX = "dhatu_";

/* The chosen username, remembered locally and tagged with the uid it belongs to.
   Kept OUTSIDE the dhatu_ progress prefix so it survives a progress clear, and
   uid-gated so a shared device never shows one account's name for another. This
   is what stops the "pick a username" screen from reappearing on every refresh
   when Firestore is briefly unreachable or its rules are not published yet. */
const UNAME_KEY = "dhatu.username";
function readLocalUsername(uid) {
  try {
    const o = JSON.parse(window.localStorage.getItem(UNAME_KEY));
    return o && o.uid === uid ? o.name : null;
  } catch (e) { return null; }
}
function writeLocalUsername(uid, name) {
  try { window.localStorage.setItem(UNAME_KEY, JSON.stringify({ uid, name })); } catch (e) {}
}

const _n = (k) => { try { return JSON.parse(window.localStorage.getItem(PREFIX + k)); } catch (e) { return null; } };

/* Public profile: the only fields other users can see (streak, Kaudi, name).
   Kept in a separate collection so private progress is never exposed. */
async function updatePublicProfile() {
  if (!currentUid || _deleting) return;
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

function localIsEmpty() {
  return Object.keys(localSnapshot()).length === 0;
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (u) => {
    currentUid = u ? u.uid : null;
    currentUser = u;
    if (!u) currentUsername = null;
    cb(u);
  });
}

export async function signInWithGoogle() {
  // In the native (Capacitor) app, signInWithPopup does not work inside the
  // WebView, so use the native Google sign-in plugin and pass its credential to
  // the Firebase JS SDK. The import is dynamic + vite-ignored and guarded by the
  // Capacitor global, so the plain web build never needs the plugin.
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result && result.credential && result.credential.idToken;
    const accessToken = result && result.credential && result.credential.accessToken;
    const cred = GoogleAuthProvider.credential(idToken, accessToken);
    return signInWithCredential(auth, cred);
  }
  return signInWithPopup(auth, provider);
}

/* Sign in with Apple. Required on iOS because the app also offers Google login
   (App Store Guideline 4.8); also offered on the web. Native uses the Capacitor
   Firebase plugin (which does the native Apple sheet) and hands the credential to
   the JS SDK; web uses a popup. Needs Apple enabled as a Firebase auth provider
   (Services ID + key), which requires an Apple Developer account - until that is
   configured, this throws auth/operation-not-allowed, handled by the caller. */
export async function signInWithApple() {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithApple();
    const idToken = result && result.credential && result.credential.idToken;
    const rawNonce = result && result.credential && result.credential.nonce;
    const cred = appleProvider.credential({ idToken, rawNonce });
    return signInWithCredential(auth, cred);
  }
  return signInWithPopup(auth, appleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

/* Permanently delete the signed-in user's account and data, in-app. Required by
   both the App Store (Guideline 5.1.1(v)) and Google Play. Removes the Firestore
   footprint (username reservation, public profile, progress doc, and pokes to/from
   the user) and then the Firebase auth user. Firebase requires a recent login to
   delete an account, so if the session is stale we transparently re-authenticate
   (native Google plugin, or popup on web) and retry. Clears local data on success.
   Throws on failure so the UI can show an error. */
export async function deleteAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("not signed in");
  const uid = user.uid;
  const name = currentUsername;
  _deleting = true;
  try {
    await deleteUserData(uid, name);
    try {
      await deleteUser(user);
    } catch (e) {
      if (e && e.code === "auth/requires-recent-login") {
        await reauthCurrent(user);
        // The reauth briefly re-signed the user in; re-clean anything touched.
        await deleteUserData(uid, name);
        await deleteUser(user);
      } else {
        throw e;
      }
    }
    clearLocalProgress();
    try { window.localStorage.removeItem(UNAME_KEY); } catch (e) {}
    currentUid = null;
    currentUser = null;
    currentUsername = null;
  } finally {
    _deleting = false;
  }
}

// Best-effort delete of every Firestore doc tied to the account. Idempotent:
// missing docs are fine, so it is safe to call twice (see the reauth retry).
async function deleteUserData(uid, name) {
  const ops = [];
  if (name) ops.push(deleteDoc(doc(db, "usernames", name.toLowerCase())));
  ops.push(deleteDoc(doc(db, "publicProfiles", uid)));
  ops.push(deleteDoc(doc(db, "users", uid)));
  for (const field of ["to", "from"]) {
    try {
      const snap = await getDocs(query(collection(db, "pokes"), where(field, "==", uid)));
      snap.docs.forEach((d) => ops.push(deleteDoc(doc(db, "pokes", d.id))));
    } catch (e) {}
  }
  await Promise.all(ops.map((p) => p.catch(() => {})));
}

// Re-establish a recent login so deleteUser is allowed. Native path reuses the
// Google plugin; web uses a reauth popup.
async function reauthCurrent(user) {
  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result && result.credential && result.credential.idToken;
    const accessToken = result && result.credential && result.credential.accessToken;
    const cred = GoogleAuthProvider.credential(idToken, accessToken);
    await reauthenticateWithCredential(user, cred);
  } else {
    await reauthenticateWithPopup(user, provider);
  }
}

// A short-lived Firebase ID token for the current user, or null if signed out.
// Used to authenticate calls to the AI-feedback Pages Function so spend is tied
// to a real account. Returns null (never throws) so callers fall back cleanly.
export async function getIdToken() {
  try {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  } catch (e) {
    return null;
  }
}

/* Pull the signed-in user's saved progress into localStorage. Call this and
   await it before mounting the app so useLocalState initializers read cloud
   values. On a brand-new account we seed the doc from whatever is local. */
export async function loadProgressToLocal(user) {
  const uid = typeof user === "string" ? user : user && user.uid;
  if (!uid || _deleting) return;
  // Start from the locally remembered username so a failed/slow cloud read does
  // not send an already-registered user back to the username screen.
  currentUsername = readLocalUsername(uid);
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
    const cloudName = (snap.exists() && snap.data().username) || null;
    if (cloudName) currentUsername = cloudName;
    if (currentUsername) writeLocalUsername(uid, currentUsername);
    const cloud = (snap.exists() && snap.data().progress) || null;
    const cloudKeys = cloud ? Object.keys(cloud).filter((k) => k.startsWith(PREFIX)) : [];
    if (cloudKeys.length > 0) {
      // Cloud has real saved progress: it is authoritative on sign-in, so replace
      // local with it. We only get here when there is genuine data to restore.
      clearLocalProgress();
      cloudKeys.forEach((k) => { if (typeof cloud[k] === "string") window.localStorage.setItem(k, cloud[k]); });
    } else if (!localIsEmpty()) {
      // No real cloud progress yet, but this device has some. Seed the cloud from
      // local. Critically, we do NOT clear local when the cloud doc is empty or
      // missing: an empty/absent cloud doc must never wipe a device whose progress
      // simply has not synced yet (that was a data-loss bug).
      await setDoc(ref, { progress: localSnapshot(), updatedAt: Date.now() }, { merge: true });
    }
    updatePublicProfile();
  } catch (e) {
    // offline or rules not set yet: keep working locally, just do not sync
  }
}

/* Whether the signed-in user has picked a username yet. */
export function hasUsername() {
  return !!currentUsername;
}
export function getUsername() {
  return currentUsername;
}

let _saveTimer = null;
/* Debounced upload of the current local progress snapshot for the signed-in
   user. Called by useLocalState whenever a value changes. */
export function scheduleSave() {
  if (!currentUid) return;
  if (_deleting) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    if (!currentUid || _deleting) return;
    const snapshot = localSnapshot();
    // Never overwrite the cloud copy with an empty snapshot. Local can be briefly
    // empty (right after a clear, a sign-out race, or before load finishes); saving
    // that would wipe good cloud progress.
    if (Object.keys(snapshot).length === 0) return;
    try {
      await setDoc(
        doc(db, "users", currentUid),
        { progress: snapshot, updatedAt: Date.now() },
        { merge: true }
      );
      updatePublicProfile();
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

/* ---------------- usernames, following, pokes ---------------- */

// 3 to 20 chars, letters/numbers/underscore.
export function validUsername(name) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(String(name || "").trim());
}

export async function usernameAvailable(name) {
  const lc = name.trim().toLowerCase();
  try {
    const snap = await getDoc(doc(db, "usernames", lc));
    return !snap.exists() || snap.data().uid === currentUid;
  } catch (e) {
    return false;
  }
}

// Claim or change a username; enforces global uniqueness via a transaction.
export async function setUsername(name) {
  if (!currentUid) throw new Error("not signed in");
  const clean = name.trim();
  if (!validUsername(clean)) throw new Error("Use 3 to 20 letters, numbers, or underscores.");
  const lc = clean.toLowerCase();
  const prev = currentUsername;
  await runTransaction(db, async (tx) => {
    const uref = doc(db, "usernames", lc);
    const snap = await tx.get(uref);
    if (snap.exists() && snap.data().uid !== currentUid) throw new Error("That username is taken.");
    tx.set(uref, { uid: currentUid });
    tx.set(doc(db, "users", currentUid), { username: clean }, { merge: true });
  });
  currentUsername = clean;
  writeLocalUsername(currentUid, clean);
  if (prev && prev.toLowerCase() !== lc) {
    deleteDoc(doc(db, "usernames", prev.toLowerCase())).catch(() => {});
  }
  updatePublicProfile();
  return clean;
}

export async function getPublicProfile(uid) {
  const snap = await getDoc(doc(db, "publicProfiles", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

// Follow another user by their username. Returns their public profile.
export async function followByUsername(name) {
  if (!currentUid) throw new Error("not signed in");
  const lc = name.trim().toLowerCase();
  const snap = await getDoc(doc(db, "usernames", lc));
  if (!snap.exists()) throw new Error("No user with that username.");
  const uid = snap.data().uid;
  if (uid === currentUid) throw new Error("You can't follow yourself.");
  await updateDoc(doc(db, "users", currentUid), { following: arrayUnion(uid) });
  return getPublicProfile(uid);
}

export async function unfollowUser(uid) {
  if (!currentUid) return;
  await updateDoc(doc(db, "users", currentUid), { following: arrayRemove(uid) });
}

// The list of people you follow, with their public streak/Kaudi.
export async function getFollowing() {
  if (!currentUid) return [];
  try {
    const me = await getDoc(doc(db, "users", currentUid));
    const ids = (me.exists() && me.data().following) || [];
    const profiles = await Promise.all(ids.map((id) => getPublicProfile(id).catch(() => null)));
    return profiles.filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function pokeUser(toUid) {
  if (!currentUid) return;
  await addDoc(collection(db, "pokes"), {
    to: toUid,
    from: currentUid,
    fromName: currentUsername || "Someone",
    at: Date.now(),
  });
}

// Pokes you have received.
export async function getPokes() {
  if (!currentUid) return [];
  try {
    const q = query(collection(db, "pokes"), where("to", "==", currentUid), orderBy("at", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return [];
  }
}

export async function dismissPoke(id) {
  try { await deleteDoc(doc(db, "pokes", id)); } catch (e) {}
}
