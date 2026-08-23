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

// Web Client ID dari Google Cloud Console
const WEB_CLIENT_ID = "669074921410-dmq5a5qv6nrsh0nocfno7o7kp1ahn2rf.apps.googleusercontent.com";

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");

  try {
    if (isNative) {
      const result = await FirebaseAuthentication.signInWithGoogle({ 
        clientId: WEB_CLIENT_ID,
        serverClientId: WEB_CLIENT_ID,
        useCredentialManager: false 
      });
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error("Gagal mendapatkan token.");
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
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
