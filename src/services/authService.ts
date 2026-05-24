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

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");
  await signInWithRedirect(auth, googleProvider);
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
  // Langsung listen auth state — Firebase otomatis handle redirect result
  // getRedirectResult tidak perlu dipanggil manual karena onAuthStateChanged
  // sudah trigger setelah redirect selesai
  return onAuthStateChanged(auth, callback);
};
