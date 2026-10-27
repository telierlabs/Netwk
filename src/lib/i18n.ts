import { useCallback } from 'react';
import { useProfile } from '../hooks/useProfile';

export type Lang = 'id' | 'en';

// ─────────────────────────────────────────────
// KAMUS TERJEMAHAN
// Tambah teks baru: isi di `id` DAN `en` (TypeScript bakal protes kalau `en` ada yang kelewat).
// Pakai {nama} buat variabel, contoh: t('toastLangChanged', { name: 'English' })
// ─────────────────────────────────────────────
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
  exportData: 'Ekspor Data',
  sectionAccount: 'Akun',
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
  exportData: 'Export Data',
  sectionAccount: 'Account',
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

const dict: Record<Lang, Record<TKey, string>> = { id, en };

export const normalizeLang = (l: unknown): Lang => (l === 'en' ? 'en' : 'id');

/** Terjemahan tanpa hook — buat dipakai di dalam handler/callback. */
export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = dict[lang]?.[key] ?? dict.id[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

/**
 * Hook terjemahan. Bahasa diambil dari profile.lang (store yang sama dipakai semua halaman),
 * jadi begitu user ganti bahasa, SEMUA komponen yang pakai useT() langsung ikut berubah.
 */
export function useT() {
  const { profile } = useProfile();
  const lang = normalizeLang(profile.lang);
  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );
  return { t, lang };
}
