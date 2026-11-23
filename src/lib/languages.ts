// ─────────────────────────────────────────────
// DAFTAR BAHASA (36) + LOGIKA GANTI BAHASA — dipisah dari ProfilePage
// ui: true  → antarmuka Cylen sudah diterjemahkan
//             (tambahkan kamus di lib/i18n.ts, lalu ubah ui jadi true)
// ─────────────────────────────────────────────
export interface LanguageInfo {
  code: string;     // kode ISO (zh-CN / zh-TW untuk Mandarin)
  name: string;     // nama asli bahasanya
  english: string; // nama dalam bahasa Inggris (buat pencarian)
  ui: boolean;
  flag?: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'id', name: 'Bahasa Indonesia', english: 'Indonesian', ui: true, flag: '🇮🇩' },
  { code: 'en', name: 'English', english: 'English', ui: true, flag: '🇬🇧' },
  { code: 'ms', name: 'Bahasa Melayu', english: 'Malay', ui: true },
  { code: 'jv', name: 'Basa Jawa', english: 'Javanese', ui: true },
  { code: 'su', name: 'Basa Sunda', english: 'Sundanese', ui: true },
  { code: 'fil', name: 'Filipino', english: 'Filipino', ui: true },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', ui: true },
  { code: 'th', name: 'ไทย', english: 'Thai', ui: true },
  { code: 'zh-CN', name: '简体中文', english: 'Chinese (Simplified)', ui: true },
  { code: 'zh-TW', name: '繁體中文', english: 'Chinese (Traditional)', ui: true },
  { code: 'ja', name: '日本語', english: 'Japanese', ui: true },
  { code: 'ko', name: '한국어', english: 'Korean', ui: true },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', ui: true },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', ui: true },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', ui: true },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', ui: true },
  { code: 'mr', name: 'मराठी', english: 'Marathi', ui: true },
  { code: 'ur', name: 'اردو', english: 'Urdu', ui: true },
  { code: 'ar', name: 'العربية', english: 'Arabic', ui: true },
  { code: 'fa', name: 'فارسی', english: 'Persian', ui: true },
  { code: 'he', name: 'עברית', english: 'Hebrew', ui: true },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', ui: true },
  { code: 'es', name: 'Español', english: 'Spanish', ui: true },
  { code: 'pt', name: 'Português', english: 'Portuguese', ui: true },
  { code: 'fr', name: 'Français', english: 'French', ui: true },
  { code: 'de', name: 'Deutsch', english: 'German', ui: true },
  { code: 'it', name: 'Italiano', english: 'Italian', ui: true },
  { code: 'nl', name: 'Nederlands', english: 'Dutch', ui: true },
  { code: 'ca', name: 'Català', english: 'Catalan', ui: true },
  { code: 'sv', name: 'Svenska', english: 'Swedish', ui: true },
  { code: 'no', name: 'Norsk', english: 'Norwegian', ui: true },
  { code: 'da', name: 'Dansk', english: 'Danish', ui: true },
  { code: 'fi', name: 'Suomi', english: 'Finnish', ui: true },
  { code: 'pl', name: 'Polski', english: 'Polish', ui: true },
  { code: 'ru', name: 'Русский', english: 'Russian', ui: true },
  { code: 'uk', name: 'Українська', english: 'Ukrainian', ui: true },
];

export const getLanguage = (code?: string): LanguageInfo =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

// Urutan "Semua bahasa": A–Z berdasarkan nama Inggris
export const LANGUAGES_SORTED: LanguageInfo[] = [...LANGUAGES].sort((a, b) => a.english.localeCompare(b.english));

// Hilangkan aksen & huruf besar supaya "deutsch", "Español", "german" semuanya ketemu
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const searchLanguages = (query: string): LanguageInfo[] => {
  const q = fold(query.trim());
  if (!q) return LANGUAGES_SORTED;
  return LANGUAGES_SORTED.filter((l) => fold(l.name).includes(q) || fold(l.english).includes(q) || l.code.toLowerCase().startsWith(q));
};

// Bahasa perangkat (buat bagian "Disarankan")
export const detectDeviceLanguage = (): LanguageInfo | undefined => {
  if (typeof navigator === 'undefined') return undefined;
  const raw = (navigator.language || '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-hant') return getLanguage('zh-TW');
  if (lower.startsWith('zh')) return getLanguage('zh-CN');
  const base = lower.split('-')[0];
  const alias: Record<string, string> = { nb: 'no', nn: 'no', tl: 'fil', iw: 'he', in: 'id' };
  const code = alias[base] || base;
  return LANGUAGES.find((l) => l.code === code);
};

/**
 * Ganti bahasa aplikasi.
 * - langsung terapkan ke tampilan (localStorage + <html lang>)
 * - simpan ke profil Firestore
 * - kalau gagal simpan, balikin ke bahasa sebelumnya
 * return: changed = false kalau bahasanya sama; ok = penyimpanan berhasil.
 * Toast ditampilkan oleh pemanggil.
 */
export async function changeLanguage(opts: {
  code: string;
  currentLang: string;
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
