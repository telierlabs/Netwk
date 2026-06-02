import { 
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "../lib/firebase";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Inisialisasi DB menggunakan app dari auth biar ga perlu repot edit lib/firebase.ts
const db = getFirestore(auth.app);

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

// 👇 BUKAN LOCALSTORAGE: Simpan dan cek izin user pakai Firestore Cloud
export const checkUserPermissions = async (uid: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().permissionsGranted === true;
    }
    return false;
  } catch (error) {
    console.error("Gagal cek izin Firestore:", error);
    return false;
  }
};

export const saveUserPermissions = async (uid: string): Promise<void> => {
  try {
    const docRef = doc(db, "users", uid);
    // Pakai merge: true biar data user lain (kalau ada) ga ketimpa
    await setDoc(docRef, { permissionsGranted: true }, { merge: true });
  } catch (error) {
    console.error("Gagal simpan izin ke Firestore:", error);
  }
};
