import type { Lang } from './i18n';

// ─────────────────────────────────────────────
// DAFTAR BAHASA + LOGIKA GANTI BAHASA (dipisah dari ProfilePage)
// Dipakai oleh: popup bahasa (components/profile/LanguageSheet.tsx)
// dan nanti halaman bahasa khusus yang kamu buat.
// ─────────────────────────────────────────────
export const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export const getLanguage = (code?: string) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

/**
 * Ganti bahasa aplikasi.
 * - langsung terapkan ke tampilan (localStorage + <html lang>)
 * - simpan ke profil Firestore
 * - kalau gagal simpan, balikin ke bahasa sebelumnya
 *
 * return: changed = false kalau bahasanya memang sama (tidak ada yang dilakukan),
 *         ok      = apakah penyimpanan berhasil.
 * Toast ditampilkan oleh pemanggil (biar halaman bahasa bebas menentukan teksnya).
 */
export async function changeLanguage(opts: {
  code: Lang;
  currentLang: Lang;
  updateProfile: (data: Record<string, any>) => Promise<boolean>;
}): Promise<{ changed: boolean; ok: boolean }> {
  const { code, currentLang, updateProfile } = opts;
  if (code === currentLang) return { changed: false, ok: true };

  try { localStorage.setItem('cylen_lang', code); } catch { /* abaikan */ }
  document.documentElement.lang = code;

  const ok = await updateProfile({ lang: code });
  if (ok) {
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang: code } }));
  } else {
    try { localStorage.setItem('cylen_lang', currentLang); } catch { /* abaikan */ }
    document.documentElement.lang = currentLang;
  }
  return { changed: true, ok };
}
