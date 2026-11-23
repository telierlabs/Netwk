import { useCallback, useEffect, useMemo } from 'react';
import { useProfile } from '../hooks/useProfile';
import { LOCALES } from './locales';

// ─────────────────────────────────────────────
// i18n CYLEN — murni statis, tanpa AI.
// id & en ada di file ini. Bahasa lain ada di src/lib/locales*.ts.
// Teks yang belum ada terjemahannya otomatis tampil dalam bahasa Inggris.
//
// Dua cara pakai:
//  1) Kamus pusat:  const { t } = useT();  t('upgrade')
//  2) Blok TEXT per halaman:  const tx = usePageText('nama-halaman', TEXT);
// ─────────────────────────────────────────────

export type Lang = string;

const id = {
  // Profil
  premiumDesc: 'Akses Intelijen Tanpa Batas',
  upgrade: 'Upgrade',
  signInGoogle: 'Masuk dengan Google',
  guest: 'Pengguna Tamu',
  sectionGeneral: 'Umum',
  appearance: 'Tampilan',
  haptics: 'Getaran',
  language: 'Bahasa',
  usage: 'Penggunaan & Analitik',
  sectionEcosystem: 'Ekosistem',
  memory: 'Memori Cylen',
  customize: 'Kustomisasi Cylen',
  personalIntel: 'Kecerdasan Personal',
  sectionData: 'Data & Privasi',
  security: 'Keamanan',
  privacyPolicy: 'Kebijakan Privasi',
  exportData: 'Ekspor Data',
  sectionAccount: 'Akun',
  about: 'Tentang',
  reportProblem: 'Laporkan Masalah',
  signOut: 'Keluar',
  chooseLanguage: 'Pilih Bahasa',
  cancel: 'Batal',

  // Toast profil
  toastSignedIn: 'Berhasil masuk',
  toastSignInFailed: 'Gagal masuk',
  toastSignedOut: 'Berhasil keluar',
  toastSignOutFailed: 'Gagal keluar',
  toastPhotoUpdated: 'Foto profil diperbarui',
  toastPhotoSaveFailed: 'Gagal menyimpan foto',
  toastPhotoProcessFailed: 'Gagal memproses foto',
  toastPhotoDeleted: 'Foto profil dihapus',
  toastPhotoDeleteFailed: 'Gagal menghapus foto',
  toastNameEmpty: 'Nama tidak boleh kosong',
  toastNameUpdated: 'Nama diperbarui',
  toastNameSaveFailed: 'Gagal menyimpan nama',
  toastLangChanged: 'Bahasa diubah ke {name}',
  toastLangSaveFailed: 'Gagal menyimpan bahasa',

  // Toast App
  toastNewChat: 'Memulai chat baru',
  toastGhost: 'Mode Hantu diaktifkan',
  toastDark: 'Tema Gelap diaktifkan!',
  toastLight: 'Tema Terang diaktifkan!',
  toastSaved: 'Tersimpan di Perpustakaan!',
} as const;

export type TKey = keyof typeof id;

const en: Record<TKey, string> = {
  // Profile
  premiumDesc: 'Unlimited Intelligence Access',
  upgrade: 'Upgrade',
  signInGoogle: 'Sign in with Google',
  guest: 'Guest User',
  sectionGeneral: 'General',
  appearance: 'Appearance',
  haptics: 'Haptics',
  language: 'Language',
  usage: 'Usage & Analytics',
  sectionEcosystem: 'Ecosystem',
  memory: 'Cylen Memory',
  customize: 'Customize Cylen',
  personalIntel: 'Personal Intelligence',
  sectionData: 'Data & Privacy',
  security: 'Security',
  privacyPolicy: 'Privacy Policy',
  exportData: 'Export Data',
  sectionAccount: 'Account',
  about: 'About',
  reportProblem: 'Report a Problem',
  signOut: 'Sign out',
  chooseLanguage: 'Choose Language',
  cancel: 'Cancel',

  // Profile toasts
  toastSignedIn: 'Signed in',
  toastSignInFailed: 'Sign in failed',
  toastSignedOut: 'Signed out',
  toastSignOutFailed: 'Sign out failed',
  toastPhotoUpdated: 'Profile photo updated',
  toastPhotoSaveFailed: 'Failed to save photo',
  toastPhotoProcessFailed: 'Failed to process photo',
  toastPhotoDeleted: 'Profile photo removed',
  toastPhotoDeleteFailed: 'Failed to remove photo',
  toastNameEmpty: 'Name cannot be empty',
  toastNameUpdated: 'Name updated',
  toastNameSaveFailed: 'Failed to save name',
  toastLangChanged: 'Language changed to {name}',
  toastLangSaveFailed: 'Failed to save language',

  // App toasts
  toastNewChat: 'Starting a new chat',
  toastGhost: 'Ghost mode enabled',
  toastDark: 'Dark theme enabled!',
  toastLight: 'Light theme enabled!',
  toastSaved: 'Saved to Library!',
};

const RTL = new Set(['ar', 'he', 'fa', 'ur']);

export const normalizeLang = (l: unknown): Lang =>
  typeof l === 'string' && l.trim() ? l.trim() : 'id';

/** Dipertahankan supaya languages.ts versi lama tetap jalan. Tidak melakukan apa-apa (semua statis). */
export async function loadLanguage(_code?: string): Promise<boolean> {
  return true;
}

/** Terjemahan tanpa hook — buat dipakai di dalam handler/callback. */
export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s =
    (lang === 'id' ? id[key] : undefined) ??
    (LOCALES[lang]?.app?.[key] as string | undefined) ??
    en[key] ??
    id[key] ??
    key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/**
 * Hook terjemahan kamus pusat. Bahasa diambil dari profile.lang, jadi begitu user ganti bahasa,
 * SEMUA komponen yang pakai useT() ikut berubah.
 */
export function useT() {
  const { profile } = useProfile();
  const lang = normalizeLang(profile.lang);
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dir = RTL.has(lang.split('-')[0]) ? 'rtl' : 'ltr';
  }, [lang]);
  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );
  return { t, lang };
}

// ─────────────────────────────────────────────
// TEXT PER HALAMAN
// ─────────────────────────────────────────────
const flatten = (v: any, path = '', out: Record<string, string> = {}): Record<string, string> => {
  if (typeof v === 'string') out[path] = v;
  else if (Array.isArray(v)) v.forEach((x, i) => flatten(x, path ? `${path}.${i}` : String(i), out));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) flatten(v[k], path ? `${path}.${k}` : k, out);
  return out;
};

const rebuild = (v: any, bundle: Record<string, string>, path = ''): any => {
  if (typeof v === 'string') return bundle[path] ?? v;
  if (Array.isArray(v)) return v.map((x, i) => rebuild(x, bundle, path ? `${path}.${i}` : String(i)));
  if (v && typeof v === 'object') {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = rebuild(v[k], bundle, path ? `${path}.${k}` : k);
    return o;
  }
  return v;
};

/**
 * const tx = usePageText('nama-halaman', TEXT);
 * - id → TEXT.id, en → TEXT.en
 * - bahasa lain → terjemahan dari locales*.ts, bagian yang belum ada tampil Inggris
 */
export function usePageText<T extends Record<string, any>>(ns: string, texts: Record<string, T>): T {
  const { profile } = useProfile();
  const lang = normalizeLang(profile.lang);
  const src = (texts.en ?? texts.id) as T;
  // arah tulisan (RTL untuk ar/he/fa/ur) ikut diatur juga di sini, supaya komponen yang selalu tampil (Header/Sidebar) ikut membalik
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.dir = RTL.has(lang.split('-')[0]) ? 'rtl' : 'ltr';
  }, [lang]);
  return useMemo(() => {
    if (lang === 'id') return (texts.id ?? src) as T;
    if (lang === 'en') return src;
    const loc = LOCALES[lang]?.[ns];
    return loc ? (rebuild(src, flatten(loc)) as T) : src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, ns, src]);
}
