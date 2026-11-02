import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Status "lagi proses login", dipakai App.tsx buat nahan tampilan landing ──
let signingIn = false;
const signingInListeners = new Set<(v: boolean) => void>();
const setSigningIn = (v: boolean) => {
  signingIn = v;
  signingInListeners.forEach((l) => l(v));
};
export const subscribeToSigningIn = (cb: (v: boolean) => void) => {
  signingInListeners.add(cb);
  cb(signingIn);
  return () => { signingInListeners.delete(cb); };
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");

  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("Gagal mendapatkan token dari Google.");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    return;
  }

  setSigningIn(true);
  try {
    await signInWithPopup(auth, googleProvider);
    // sukses: biarin true, nanti dimatiin pas user beneran masuk (lihat subscribeToAuthChanges)
  } catch (e: any) {
    if (e?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    setSigningIn(false); // batal / gagal -> balik ke landing
    if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
      console.error("Login error:", e);
    }
    throw e;
  }
};

export const handleRedirectResult = async () => {};

export const logout = async () => {
  if (!auth) return;
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut();
  }
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    if (user) setSigningIn(false);
    callback(user);
  });
};
