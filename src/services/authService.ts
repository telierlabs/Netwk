import { 
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// isMobile dan signInWithRedirect DIHAPUS TOTAL

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth tidak terkonfigurasi.");
  
  // Langsung tembak pakai Popup aja, nggak peduli HP atau PC
  await signInWithPopup(auth, googleProvider);
};

export const handleRedirectResult = async () => {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error: any) {
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
