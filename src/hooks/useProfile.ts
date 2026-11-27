import { useSyncExternalStore } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { syncPromptBridge } from '../lib/promptBridge';
import { paintTheme } from '../lib/themePalettes';

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
  // BARU: suara pilihan (voiceName Gemini) & Mode Anak
  voice: 'Zephyr',
  kidsMode: false as boolean,
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

// BARU: true selama akun sedang dihapus → jangan tulis apa pun ke Firestore
// (kalau tidak, profil & profil publik bisa dibuat ulang tepat setelah dihapus)
let frozen = false;

// ───────────── NAMA "PLACEHOLDER" ─────────────
// 'User' = nilai bawaan makeDefaults(). Kalau yang ketemu nama ini (atau kosong), itu BUKAN nama asli user,
// jadi jangan sampai dipakai menimpa nama yang sebenarnya.
const PLACEHOLDER_NAME = 'User';
const isPlaceholderName = (n: unknown): boolean =>
  typeof n !== 'string' || !n.trim() || n.trim() === PLACEHOLDER_NAME;

const fallbackName = (u: User) =>
  (u.displayName && u.displayName.trim()) || (u.email ? u.email.split('@')[0] : 'User');

// ───────────── CACHE LOKAL: nama/foto/bahasa/tema langsung muncul, nggak kedip ─────────────
// FIX: foto (base64, bisa puluhan KB) disimpan di key TERPISAH dari nama.
// Dulu satu key untuk semuanya → kalau kuota localStorage penuh gara-gara foto, NAMA ikut gagal tersimpan.
const cacheKey = (uid: string) => `cylen_profile_${uid}`;
const avatarKey = (uid: string) => `cylen_profile_avatar_${uid}`;
const CACHE_FIELDS = ['lang', 'theme', 'font', 'textSize', 'voice', 'kidsMode'] as const;

const readCache = (uid: string): Partial<Profile> => {
  const out: Record<string, any> = {};
  try { Object.assign(out, JSON.parse(localStorage.getItem(cacheKey(uid)) || '{}')); } catch { /* abaikan */ }
  try {
    const raw = localStorage.getItem(avatarKey(uid));
    if (raw !== null) out.avatar = JSON.parse(raw); // string atau null (null = sengaja dihapus)
  } catch { /* abaikan */ }
  return out as Partial<Profile>;
};

let lastCachedAvatar: string | null | undefined; // biar foto nggak ditulis ulang tiap snapshot
const writeCache = (uid: string, p: Profile) => {
  const slim: Record<string, any> = {};
  if (!isPlaceholderName(p.name)) slim.name = p.name; // nama 'User' nggak pernah disimpan ke cache
  for (const k of CACHE_FIELDS) if (p[k] !== undefined) slim[k] = p[k];
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(slim)); } catch { /* kuota penuh, abaikan */ }

  const av = p.avatar ?? null;
  if (av !== lastCachedAvatar) {
    try { localStorage.setItem(avatarKey(uid), JSON.stringify(av)); lastCachedAvatar = av; } catch { /* foto terlalu besar, abaikan */ }
  }
};

// ───────────── PROFIL PUBLIK: nama + foto yang bisa dilihat user lain (anggota grup) ─────────────
// Disimpan di koleksi `publicProfiles/{uid}`. Cuma nama & avatar, nggak ada data pribadi lain.
let lastPublicKey = '';
const syncPublic = (uid: string, name: string, avatar: string | null) => {
  if (frozen) return; // akun sedang dihapus
  if (isPlaceholderName(name)) return; // jangan timpa profil publik yang bagus dengan 'User'
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

// FIX WARNA AWAL: dulu file ini punya salinan palet LAMA sendiri (#ffffff / #121212 / dst.) dan memasangnya
// tiap profil selesai dimuat, menimpa palet baru dari index.html & App.tsx. Sekarang pakai palet bersama
// (lib/themePalettes.ts), jadi warna awal sudah benar dan tidak ditimpa lagi.
const applyTheme = (p: Profile) => {
  if (p.theme) paintTheme(p.theme);
  if (p.textSize) document.documentElement.style.fontSize = `${(p.textSize / 16) * 100}%`;
};

// ───────────── LISTENER FIRESTORE (dengan coba-ulang kalau error) ─────────────
let unsubSnap: (() => void) | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const handleSnapshot = (user: User, snap: DocumentSnapshot) => {
  if (frozen) return; // akun sedang dihapus
  // Akun sudah ganti/keluar selagi data ini di jalan → abaikan
  if (auth.currentUser?.uid !== user.uid) return;
  // Offline & dokumen belum ke-cache ≠ dokumen nggak ada. Jangan timpa apa-apa.
  if (!snap.exists() && snap.metadata.fromCache) return;

  const data: Record<string, any> = snap.exists() ? (snap.data() as Record<string, any>) : {};
  const defaults = makeDefaults();
  const cached = readCache(user.uid);

  // Nama & foto terbaik yang kita punya (urutan: cache → akun Google)
  const bestName = !isPlaceholderName(cached.name) ? (cached.name as string) : fallbackName(user);
  const bestAvatar = cached.avatar !== undefined ? cached.avatar : (user.photoURL ?? null);

  const patch: Record<string, any> = {};
  if (!snap.exists()) {
    Object.assign(patch, defaults, { name: bestName, avatar: bestAvatar });
  } else {
    // Dokumen ada tapi nama kosong/hilang → isi lagi
    if (typeof data.name !== 'string' || !data.name.trim()) patch.name = bestName;
    // avatar === undefined = belum pernah diset → isi. avatar === null = user sengaja hapus → JANGAN diisi ulang.
    if (data.avatar === undefined) patch.avatar = bestAvatar;
  }

  if (Object.keys(patch).length) {
    setDoc(doc(db, 'users', user.uid, 'profile', 'data'), patch, { merge: true })
      .catch((e) => console.error('Gagal backfill profil:', e));
  }

  // FIX: kalau nama di Firestore ternyata 'User' (sisa nilai bawaan), TAMPILKAN nama asli (cache/Google)
  // — Firestore-nya sendiri tidak diubah.
  let name = patch.name ?? data.name;
  if (isPlaceholderName(name)) name = bestName;

  const merged = {
    ...defaults,
    ...data,
    ...patch,
    name,
    personality: { ...defaults.personality, ...(data.personality || {}) },
    usage: data.usage || defaults.usage,
    haptics: { ...defaults.haptics, ...(data.haptics || {}) },
  } as Profile;

  applyTheme(merged);
  writeCache(user.uid, merged);
  setState({ profile: merged, loading: false });
  syncPromptBridge(merged); // kepribadian + Mode Anak → geminiService

  syncPublic(user.uid, merged.name, merged.avatar ?? null);
};

const subscribeProfile = (user: User, attempt = 0) => {
  unsubSnap?.();
  unsubSnap = onSnapshot(
    doc(db, 'users', user.uid, 'profile', 'data'),
    (snap) => handleSnapshot(user, snap),
    (err) => {
      console.error('Snapshot profil error:', err);
      setState({ loading: false }); // tampilan tetap pakai nama/foto dari cache, nggak dikosongkan
      // FIX: dulu error = listener mati selamanya (profil nyangkut). Sekarang coba sambung lagi.
      if (attempt < 5) {
        retryTimer = setTimeout(() => {
          if (auth.currentUser?.uid === user.uid) subscribeProfile(user, attempt + 1);
        }, Math.min(30000, 2000 * 2 ** attempt));
      }
    }
  );
};

// BARU: dipakai saat hapus akun. Bekukan profil (lepas listener, tolak semua tulisan),
// dan kalau penghapusan gagal, buka lagi.
export const freezeProfile = () => {
  frozen = true;
  unsubSnap?.(); unsubSnap = null;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
};
export const unfreezeProfile = () => {
  frozen = false;
  const u = auth.currentUser;
  if (u) subscribeProfile(u);
};

auth.onAuthStateChanged((user) => {
  unsubSnap?.(); // ← listener lama WAJIB dilepas (dulu bocor & numpuk)
  unsubSnap = null;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  lastPublicKey = '';
  lastCachedAvatar = undefined;

  if (!user) {
    const blank = makeDefaults();
    setState({ profile: blank as Profile, loading: false });
    syncPromptBridge(blank); // keluar akun → instruksi pribadi ikut dibersihkan
    return;
  }

  // Tampilkan dulu dari cache / akun Google, sebelum Firestore kebaca
  const cached = readCache(user.uid);
  const { name: cachedName, avatar: cachedAvatar, ...cachedRest } = cached;
  setState({
    profile: {
      ...makeDefaults(),
      ...cachedRest,
      name: !isPlaceholderName(cachedName) ? (cachedName as string) : fallbackName(user),
      avatar: cachedAvatar !== undefined ? cachedAvatar : (user.photoURL ?? null),
    } as Profile,
    loading: true,
  });

  if (!frozen) subscribeProfile(user);
});

// ───────────── UPDATE: optimistic + rollback kalau gagal ─────────────
export async function updateProfile(newData: Record<string, any>): Promise<boolean> {
  if (frozen) return false; // akun sedang dihapus
  const user = auth.currentUser;
  if (!user) return false;

  // Firestore nolak nilai `undefined`
  const clean = Object.fromEntries(Object.entries(newData).filter(([, v]) => v !== undefined));
  const keys = Object.keys(clean);
  if (!keys.length) return true;

  // Catat nilai lama HANYA untuk field yang diubah
  const before = state.profile;
  const prevValues: Record<string, any> = {};
  keys.forEach((k) => { prevValues[k] = before[k]; });

  const next = { ...before, ...clean } as Profile;
  setState({ profile: next });
  writeCache(user.uid, next);
  syncPromptBridge(next);

  try {
    await setDoc(doc(db, 'users', user.uid, 'profile', 'data'), clean, { merge: true });

    if ('name' in clean || 'avatar' in clean) {
      syncPublic(user.uid, next.name, next.avatar ?? null);
    }
    return true;
  } catch (e) {
    console.error('Gagal update profil:', e);
    // FIX: dulu seluruh profil dikembalikan ke kondisi lama → perubahan lain yang terjadi bersamaan
    // (mis. hitungan pemakaian, getaran) ikut terhapus. Sekarang cuma field yang gagal yang dibalikin.
    const reverted = { ...state.profile, ...prevValues } as Profile;
    setState({ profile: reverted });
    writeCache(user.uid, reverted);
    syncPromptBridge(reverted);
    return false;
  }
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => state;

export function useProfile() {
  const { profile, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { profile, updateProfile, loading };
}
