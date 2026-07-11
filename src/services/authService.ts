import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithCredential,
  User
} from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Capacitor } from "@capacitor/core";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const isNative = Capacitor.isNativePlatform();

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");

  if (isNative) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    if (!idToken) throw new Error("Gagal mendapatkan token dari Google.");
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
  } else {
    await signInWithPopup(auth, googleProvider);
  }
};

export const logout = async () => {
  if (isNative) {
    await FirebaseAuthentication.signOut();
  }
  if (!auth) return;
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
