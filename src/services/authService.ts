import { 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase Auth tidak terkonfigurasi.");
  }
  if (isMobile()) {
    // Mobile: redirect, popup diblokir browser mobile
    return await signInWithRedirect(auth, googleProvider);
  } else {
    // Desktop: popup biasa
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }

  // Handle hasil redirect login (khusus mobile)
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) {
        // user sudah di-set oleh onAuthStateChanged, ini cuma safety net
        console.log("Redirect login berhasil:", result.user.email);
      }
    })
    .catch((error) => {
      console.error("Redirect result error:", error);
    });

  return onAuthStateChanged(auth, callback);
};
