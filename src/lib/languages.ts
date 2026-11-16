// ─────────────────────────────────────────────
// DAFTAR BAHASA (50) + LOGIKA GANTI BAHASA — dipisah dari ProfilePage
// ui: true  → antarmuka Cylen sudah diterjemahkan (saat ini id & en)
// ui: false → bahasa tetap bisa dipilih & disimpan, terjemahan antarmukanya menyusul
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
  { code: 'ms', name: 'Bahasa Melayu', english: 'Malay', ui: false },
  { code: 'jv', name: 'Basa Jawa', english: 'Javanese', ui: false },
  { code: 'su', name: 'Basa Sunda', english: 'Sundanese', ui: false },
  { code: 'fil', name: 'Filipino', english: 'Filipino', ui: false },
  { code: 'vi', name: 'Tiếng Việt', english: 'Vietnamese', ui: false },
  { code: 'th', name: 'ไทย', english: 'Thai', ui: false },
  { code: 'zh-CN', name: '简体中文', english: 'Chinese (Simplified)', ui: false },
  { code: 'zh-TW', name: '繁體中文', english: 'Chinese (Traditional)', ui: false },
  { code: 'ja', name: '日本語', english: 'Japanese', ui: false },
  { code: 'ko', name: '한국어', english: 'Korean', ui: false },
  { code: 'hi', name: 'हिन्दी', english: 'Hindi', ui: false },
  { code: 'bn', name: 'বাংলা', english: 'Bengali', ui: false },
  { code: 'ta', name: 'தமிழ்', english: 'Tamil', ui: false },
  { code: 'te', name: 'తెలుగు', english: 'Telugu', ui: false },
  { code: 'mr', name: 'मराठी', english: 'Marathi', ui: false },
  { code: 'ur', name: 'اردو', english: 'Urdu', ui: false },
  { code: 'ar', name: 'العربية', english: 'Arabic', ui: false },
  { code: 'fa', name: 'فارسی', english: 'Persian', ui: false },
  { code: 'he', name: 'עברית', english: 'Hebrew', ui: false },
  { code: 'tr', name: 'Türkçe', english: 'Turkish', ui: false },
  { code: 'es', name: 'Español', english: 'Spanish', ui: false },
  { code: 'pt', name: 'Português', english: 'Portuguese', ui: false },
  { code: 'fr', name: 'Français', english: 'French', ui: false },
  { code: 'de', name: 'Deutsch', english: 'German', ui: false },
  { code: 'it', name: 'Italiano', english: 'Italian', ui: false },
  { code: 'nl', name: 'Nederlands', english: 'Dutch', ui: false },
  { code: 'ca', name: 'Català', english: 'Catalan', ui: false },
  { code: 'sv', name: 'Svenska', english: 'Swedish', ui: false },
  { code: 'no', name: 'Norsk', english: 'Norwegian', ui: false },
  { code: 'da', name: 'Dansk', english: 'Danish', ui: false },
  { code: 'fi', name: 'Suomi', english: 'Finnish', ui: false },
  { code: 'pl', name: 'Polski', english: 'Polish', ui: false },
  { code: 'cs', name: 'Čeština', english: 'Czech', ui: false },
  { code: 'sk', name: 'Slovenčina', english: 'Slovak', ui: false },
  { code: 'hu', name: 'Magyar', english: 'Hungarian', ui: false },
  { code: 'ro', name: 'Română', english: 'Romanian', ui: false },
  { code: 'bg', name: 'Български', english: 'Bulgarian', ui: false },
  { code: 'el', name: 'Ελληνικά', english: 'Greek', ui: false },
  { code: 'ru', name: 'Русский', english: 'Russian', ui: false },
  { code: 'uk', name: 'Українська', english: 'Ukrainian', ui: false },
  { code: 'sr', name: 'Српски', english: 'Serbian', ui: false },
  { code: 'hr', name: 'Hrvatski', english: 'Croatian', ui: false },
  { code: 'sl', name: 'Slovenščina', english: 'Slovenian', ui: false },
  { code: 'lt', name: 'Lietuvių', english: 'Lithuanian', ui: false },
  { code: 'lv', name: 'Latviešu', english: 'Latvian', ui: false },
  { code: 'et', name: 'Eesti', english: 'Estonian', ui: false },
  { code: 'sw', name: 'Kiswahili', english: 'Swahili', ui: false },
  { code: 'af', name: 'Afrikaans', english: 'Afrikaans', ui: false },
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
