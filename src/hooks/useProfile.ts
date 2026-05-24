import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export function useProfile() {
  const [profile, setProfile] = useState({ 
    name: 'User Premium', 
    avatar: null as string | null,
    lang: 'id',
    theme: 'system',      // <-- Tambahan buat tema
    font: 'Sora',         // <-- Tambahan buat font
    textSize: 16          // <-- Tambahan buat ukuran font
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'profile', 'data');
        
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as any);
          } else {
            const defaultProfile = { 
              name: user.displayName || 'User Premium', 
              avatar: user.photoURL,
              lang: 'id',
              theme: 'system',
              font: 'Sora',
              textSize: 16
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
