import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Tangkap hasil redirect saat halaman/aplikasi dimuat ulang setelah login dari browser
if (auth) {
  getRedirectResult(auth).catch((error) => {
    console.error("Redirect Login Error:", error);
  });
}

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");

  try {
    // Di Android native / APK, gunakan redirect agar membuka browser sistem lalu kembali ke app
    if (Capacitor.isNativePlatform()) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Untuk web biasa tetap aman pakai redirect atau popup
      await signInWithRedirect(auth, googleProvider);
    }
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
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
