import { useSyncExternalStore } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const THEME_PALETTES: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.4)', '--cd':'#ffffff', '--ac':'#0a0a0a', '--at':'#ffffff', '--ib':'#f0f0f0' },
  't-dark': { '--bg':'#121212', '--sf':'#1e1e1e', '--bd':'rgba(255,255,255,.08)', '--text':'#e5e5e5', '--mu':'rgba(255,255,255,.45)', '--cd':'#1a1a1a', '--ac':'#ffffff', '--at':'#000000', '--ib':'#2a2a2a' },
  't-foryou': { '--bg':'#fbf8f0', '--sf':'#f1eae0', '--bd':'rgba(90,80,70,.12)', '--text':'#433422', '--mu':'rgba(67,52,34,.55)', '--cd':'#ffffff', '--ac':'#8b6f54', '--at':'#ffffff', '--ib':'#e5dcce' }
};

const makeDefaults = () => ({
  name: 'User',
  avatar: null as string | null,
  lang: 'id',
  theme: 'system',
  font: 'Sora',
  textSize: 16,
  personality: { tone: 'Default', warmth: 2, formality: 2, enthusiasm: 2, length: 2, customPrompt: '' },
  usage: { total: 0, daily: [] as { date: string; count: number }[], firstUsed: new Date().toISOString() },
  haptics: { main: true, buttons: true, ai: true },
});

export type Profile = ReturnType<typeof makeDefaults> & Record<string, any>;
type State = { profile: Profile; loading: boolean };

// ───────────── STORE TUNGGAL (semua komponen berbagi 1 state + 1 listener) ─────────────
let state: State = { profile: makeDefaults(), loading: true };
const listeners = new Set<() => void>();
const setState = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

// ───────────── CACHE LOKAL: biar nama/foto langsung muncul, nggak kedip "User" ─────────────
const cacheKey = (uid: string) => `cylen_profile_${uid}`;
const readCache = (uid: string): Partial<Profile> => {
  try { return JSON.parse(localStorage.getItem(cacheKey(uid)) || '{}'); } catch { return {}; }
};
const writeCache = (uid: string, p: Profile) => {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify({ name: p.name, avatar: p.avatar })); } catch { /* kuota penuh, abaikan */ }
};

const fallbackName = (u: User) =>
  (u.displayName && u.displayName.trim()) || (u.email ? u.email.split('@')[0] : 'User');

// ───────────── PROFIL PUBLIK: nama + foto yang bisa dilihat user lain (anggota grup) ─────────────
// Disimpan di koleksi `publicProfiles/{uid}`. Cuma nama & avatar, nggak ada data pribadi lain.
let lastPublicKey = '';
const syncPublic = (uid: string, name: string, avatar: string | null) => {
  const key = `${uid}|${name}|${avatar ?? ''}`;
  if (key === lastPublicKey) return; // nggak ada perubahan, skip tulis
  lastPublicKey = key;
  setDoc(
    doc(db, 'publicProfiles', uid),
    { name, avatar: avatar ?? null, updatedAt: Date.now() },
    { merge: true }
  ).catch((e) => {
    lastPublicKey = ''; // gagal → boleh dicoba lagi nanti
    console.error('Gagal sinkron profil publik:', e);
  });
};

const applyTheme = (p: Profile) => {
  if (p.theme) {
    let vars = THEME_PALETTES['t-light'];
    if (p.theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      vars = THEME_PALETTES[dark ? 't-dark' : 't-light'];
    } else if (THEME_PALETTES[p.theme]) {
      vars = THEME_PALETTES[p.theme];
    }
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.className = p.theme === 'system' ? '' : p.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', vars['--bg']);
  }
  if (p.textSize) document.documentElement.style.fontSize = `${(p.textSize / 16) * 100}%`;
};

// ───────────── LISTENER AUTH + FIRESTORE (jalan sekali saja) ─────────────
let unsubSnap: (() => void) | null = null;

auth.onAuthStateChanged((user) => {
  unsubSnap?.(); // ← listener lama WAJIB dilepas (dulu bocor & numpuk)
  unsubSnap = null;
  lastPublicKey = '';

  if (!user) {
    setState({ profile: makeDefaults(), loading: false });
    return;
  }

  const docRef = doc(db, 'users', user.uid, 'profile', 'data');
  const cached = readCache(user.uid);

  // Tampilkan dulu dari cache / akun Google, sebelum Firestore kebaca
  setState({
    profile: { ...makeDefaults(), name: fallbackName(user), avatar: user.photoURL ?? null, ...cached } as Profile,
    loading: true,
  });

  unsubSnap = onSnapshot(
    docRef,
    (snap) => {
      // Offline & dokumen belum ke-cache ≠ dokumen nggak ada. Jangan timpa apa-apa.
      if (!snap.exists() && snap.metadata.fromCache) return;

      const data: Record<string, any> = snap.exists() ? snap.data() : {};
      const defaults = makeDefaults();
      const patch: Record<string, any> = {};

      if (!snap.exists()) {
        Object.assign(patch, defaults, { name: fallbackName(user), avatar: user.photoURL ?? null });
      } else {
        // Dokumen ada tapi nama kosong/hilang → isi lagi dari akun Google
        if (typeof data.name !== 'string' || !data.name.trim()) patch.name = fallbackName(user);
        // avatar === undefined = belum pernah diset → ambil foto Google.
        // avatar === null = user sengaja hapus → JANGAN diisi ulang.
        if (data.avatar === undefined) patch.avatar = user.photoURL ?? null;
      }

      if (Object.keys(patch).length) {
        setDoc(docRef, patch, { merge: true }).catch((e) => console.error('Gagal backfill profil:', e));
      }

      const merged = {
        ...defaults,
        ...data,
        ...patch,
        personality: { ...defaults.personality, ...(data.personality || {}) },
        usage: data.usage || defaults.usage,
        haptics: { ...defaults.haptics, ...(data.haptics || {}) },
      } as Profile;

      applyTheme(merged);
      writeCache(user.uid, merged);
      setState({ profile: merged, loading: false });

      // ← BARU: pastikan nama & foto terbaru juga ada di profil publik
      syncPublic(user.uid, merged.name, merged.avatar ?? null);
    },
    (err) => {
      console.error('Snapshot profil error:', err);
      setState({ loading: false });
    }
  );
});

// ───────────── UPDATE: optimistic + rollback kalau gagal ─────────────
export async function updateProfile(newData: Record<string, any>): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  // Firestore nolak nilai `undefined`
  const clean = Object.fromEntries(Object.entries(newData).filter(([, v]) => v !== undefined));
  const prev = state.profile;
  const next = { ...prev, ...clean } as Profile;

  setState({ profile: next });
  writeCache(user.uid, next);

  try {
    await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), clean, { merge: true });

    // ← BARU: kalau nama/foto berubah, langsung update profil publik
    if ('name' in clean || 'avatar' in clean) {
      syncPublic(user.uid, next.name, next.avatar ?? null);
    }
    return true;
  } catch (e) {
    console.error('Gagal update profil:', e);
    setState({ profile: prev });
    writeCache(user.uid, prev);
    return false;
  }
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => state;

export function useProfile() {
  const { profile, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { profile, updateProfile, loading };
}
