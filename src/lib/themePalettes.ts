// ─────────────────────────────────────────────────────────────
// PALET WARNA: SATU-SATUNYA SUMBER KEBENARAN
// Dipakai oleh App.tsx, hooks/useProfile.ts, dan pages/AppearancePage.tsx.
//
// Dulu useProfile.ts punya salinan palet LAMA sendiri dan menimpa palet baru
// setiap kali profil selesai dimuat → warna awal salah sampai halaman Appearance dibuka.
//
// Catatan: index.html punya salinan inline karena harus jalan SEBELUM JavaScript app dimuat.
// Kalau mengubah warna di sini, ubah juga di index.html.
// ─────────────────────────────────────────────────────────────

export const THEME_PALETTES: Record<string, Record<string, string>> = {
  't-light': {
    '--bg': '#f1f1f1', '--sf': '#ffffff', '--bd': 'rgba(0,0,0,.07)',
    '--text': '#161616', '--mu': 'rgba(0,0,0,.45)', '--cd': '#f7f7f7',
    '--ac': '#141414', '--at': '#f5f5f5', '--ib': '#ececec',
  },
  't-dark': {
    '--bg': '#131314', '--sf': '#1e1f20', '--bd': 'rgba(255,255,255,.07)',
    '--text': '#e3e3e3', '--mu': 'rgba(255,255,255,.5)', '--cd': '#242526',
    '--ac': '#e3e3e3', '--at': '#131314', '--ib': '#2a2b2d',
  },
  't-foryou': {
    '--bg': '#f4f3ee', '--sf': '#faf9f6', '--bd': 'rgba(38,37,34,.09)',
    '--text': '#2a2926', '--mu': 'rgba(42,41,38,.55)', '--cd': '#ebe9e1',
    '--ac': '#2a2926', '--at': '#f4f3ee', '--ib': '#e9e7df',
  },
};

export type PaletteId = 't-light' | 't-dark' | 't-foryou';

// 'system' (atau kosong) → ikut mode gelap/terang HP. Id yang tidak dikenal → light.
export const resolveThemeId = (id?: string | null): PaletteId => {
  if (!id || id === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 't-dark' : 't-light';
  }
  return (THEME_PALETTES[id] ? id : 't-light') as PaletteId;
};

// Pasang variabel warna ke <html> (tanpa menyimpan ke profil)
export const paintTheme = (id: string) => {
  const resolved = resolveThemeId(id);
  const vars = THEME_PALETTES[resolved];
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
  root.className = id === 'system' ? '' : id;

  // Scrollbar & elemen form browser ikut gelap/terang
  root.style.colorScheme = resolved === 't-dark' ? 'dark' : 'light';

  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', vars['--bg']));
};
