import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");
  await signInWithRedirect(auth, googleProvider);
};

export const handleRedirectResult = async () => {
  if (!auth) return null;
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.error("Redirect result error:", error);
    return null;
  }
};

export const logout = async () => {
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
