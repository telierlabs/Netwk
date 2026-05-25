import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export function useProfile() {
  const [profile, setProfile] = useState({ 
    name: 'User Premium', 
    avatar: null as string | null,
    lang: 'id',
    theme: 'system',
    font: 'Sora',
    textSize: 16,
    // ── FITUR BARU: AI SETTINGS & USAGE ──
    personality: { 
      tone: 'Default', warmth: 2, formality: 2, enthusiasm: 2, length: 2, customPrompt: '' 
    },
    usage: {
      total: 0,
      daily: [] as { date: string, count: number }[],
      firstUsed: new Date().toISOString()
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'profile', 'data');
        
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            // Gabungin data Firestore dengan struktur default biar gak error kalau ada field yg kosong
            setProfile(prev => ({
              ...prev,
              ...data,
              personality: data.personality || prev.personality,
              usage: data.usage || prev.usage
            }) as any);
          } else {
            // Data pertama kali: pake data dari Google Auth
            const defaultProfile = { 
              name: user.displayName || 'User Premium', 
              avatar: user.photoURL,
              lang: 'id',
              theme: 'system',
              font: 'Sora',
              textSize: 16,
              personality: profile.personality,
              usage: profile.usage
            };
            setDoc(docRef, defaultProfile);
            setProfile(defaultProfile as any);
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
