import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export function useProfile() {
  const [profile, setProfile] = useState({ 
    name: 'User Premium', 
    avatar: null as string | null,
    lang: 'id'
  });
  const [loading, setLoading] = useState(true);

  // 1. Dengerin perubahan Auth dan sinkronin profil
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'profile', 'data');
        
        // Pake onSnapshot biar profil update secara real-time kalau lu ganti dari device lain
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as any);
          } else {
            // Data pertama kali: pake data dari Google Auth
            const defaultProfile = { 
              name: user.displayName || 'User Premium', 
              avatar: user.photoURL,
              lang: 'id'
            };
            setDoc(docRef, defaultProfile);
            setProfile(defaultProfile);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  // 2. Fungsi buat update profil ke Firestore
  const updateProfile = async (newData: any) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'profile', 'data');
      await setDoc(docRef, newData, { merge: true });
      setProfile(prev => ({ ...prev, ...newData }));
    } catch (e) {
      console.error("Gagal update profil:", e);
    }
  };

  return { profile, updateProfile, loading };
}
