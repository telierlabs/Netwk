import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");

  if (Capacitor.isNativePlatform()) {
    // 🔥 Native Google Sign-In — tanpa browser, tanpa webview
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("Gagal mendapatkan token dari Google.");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  } else {
    // Web biasa tetap pakai popup
    await signInWithPopup(auth, googleProvider);
  }
};

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
  return onAuthStateChanged(auth, callback);
};
