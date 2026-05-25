import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// ── BAWA PALET WARNA KE SINI BIAR BISA LANGSUNG DIPASANG PAS BUKA WEB ──
const THEME_PALETTES: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.4)', '--cd':'#ffffff', '--ac':'#0a0a0a', '--at':'#ffffff', '--ib':'#f0f0f0' },
  't-dark': { '--bg':'#121212', '--sf':'#1e1e1e', '--bd':'rgba(255,255,255,.08)', '--text':'#e5e5e5', '--mu':'rgba(255,255,255,.45)', '--cd':'#1a1a1a', '--ac':'#ffffff', '--at':'#000000', '--ib':'#2a2a2a' },
  't-foryou': { '--bg':'#fbf8f0', '--sf':'#f1eae0', '--bd':'rgba(90,80,70,.12)', '--text':'#433422', '--mu':'rgba(67,52,34,.55)', '--cd':'#ffffff', '--ac':'#8b6f54', '--at':'#ffffff', '--ib':'#e5dcce' }
};

export function useProfile() {
  const [profile, setProfile] = useState({ 
    name: 'User Premium', 
    avatar: null as string | null,
    lang: 'id',
    theme: 'system',
    font: 'Sora',
    textSize: 16,
    personality: { tone: 'Default', warmth: 2, formality: 2, enthusiasm: 2, length: 2, customPrompt: '' },
    usage: { total: 0, daily: [] as { date: string, count: number }[], firstUsed: new Date().toISOString() }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid, 'profile', 'data');
        
        onSnapshot(docRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            
            // ── TUKANG CAT OTOMATIS: Langsung pasang tema pas data ditarik ──
            if (data.theme) {
              let varsToApply = THEME_PALETTES['t-light'];
              if (data.theme === 'system') {
                const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                varsToApply = THEME_PALETTES[isDarkMode ? 't-dark' : 't-light'];
              } else if (THEME_PALETTES[data.theme]) {
                varsToApply = THEME_PALETTES[data.theme];
              }
              const root = document.documentElement;
              Object.entries(varsToApply).forEach(([key, val]) => root.style.setProperty(key, val));
              root.className = data.theme === 'system' ? '' : data.theme;
              
              const metaThemeColor = document.querySelector('meta[name="theme-color"]');
              if (metaThemeColor) metaThemeColor.setAttribute('content', varsToApply['--bg']);
            }
            
            // Pasang ukuran font otomatis
            if (data.textSize) {
              document.documentElement.style.fontSize = `${(data.textSize / 16) * 100}%`;
            }

            setProfile(prev => ({
              ...prev,
              ...data,
              personality: data.personality || prev.personality,
              usage: data.usage || prev.usage
            }) as any);
          } else {
            const defaultProfile = { 
              name: user.displayName || 'User Premium', 
              avatar: user.photoURL,
              lang: 'id', theme: 'system', font: 'Sora', textSize: 16,
              personality: profile.personality, usage: profile.usage
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
