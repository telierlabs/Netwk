// ─────────────────────────────────────────────
// KEYBOARD SMOOTH — src/lib/keyboard.ts
// Masalah lama: keyboard HP memicu layar aplikasi mengecil sekaligus (loncat), lalu kolom ketik ikut telat.
// Cara baru (Chrome Android, VirtualKeyboard API):
//   • selagi kolom ketik fokus, keyboard hanya MENUTUPI halaman (tidak mengubah ukuran layar)
//   • gerak naik/turun dikerjakan JS per frame, langsung ke elemen yang butuh saja (ringan, tanpa hitung ulang tata letak chat):
//       [data-kb-lift]  → naik sebesar tinggi keyboard (kolom ketik)
//       [data-kb-pad]   → ruang bawah bertambah, dan kalau sedang di dasar, tetap menempel di dasar (daftar pesan)
//       [data-kb-logo]  → mengecil halus (logo layar kosong), membesar lagi saat keyboard turun
//   • gerak DIMULAI saat kolom diketuk (pakai tinggi keyboard terakhir yang diingat), tidak menunggu browser melapor
// Hanya aktif untuk elemen ber-atribut data-kb-smooth. Browser tanpa VirtualKeyboard API: tidak berubah apa-apa.
// ─────────────────────────────────────────────
export const KB_TRANSITION = 'none';

const STORE_KEY = 'cylen_kb_h';
const OPEN_MS = 250;
const CLOSE_MS = 170;
const LOGO_SHRINK = 0.42 / 280; // logo 280px mengecil maksimal ke ±54%

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic, mirip gerak keyboard Android

export function initSmoothKeyboard(): () => void {
  const vk = typeof navigator !== 'undefined' ? (navigator as any).virtualKeyboard : null;
  if (!vk) return () => {};
  const root = document.documentElement;
  let current = 0;
  let raf = 0;
  let offTimer: ReturnType<typeof setTimeout> | undefined;
  let realH = 0;
  let stick: Map<HTMLElement, boolean> = new Map();

  const smooth = (t: any): boolean => t instanceof Element && !!t.closest('[data-kb-smooth]');

  const apply = (px: number) => {
    const delta = px - current;
    current = px;
    const v = Math.max(0, px);
    document.querySelectorAll<HTMLElement>('[data-kb-lift]').forEach(el => {
      el.style.bottom = v > 0.5 ? `${v.toFixed(1)}px` : '';
    });
    document.querySelectorAll<HTMLElement>('[data-kb-pad]').forEach(el => {
      el.style.paddingBottom = v > 0.5 ? `calc(1rem + ${v.toFixed(1)}px)` : '';
      if (stick.get(el) && delta !== 0) el.scrollTo({ top: el.scrollTop + delta, behavior: 'instant' as ScrollBehavior });
    });
    const s = Math.max(0.54, 1 - v * LOGO_SHRINK);
    document.querySelectorAll<HTMLElement>('[data-kb-logo]').forEach(el => {
      el.style.scale = v > 0.5 ? String(s.toFixed(3)) : '';
    });
  };
  const setRoot = (px: number) => root.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`); // dibaca editor layar penuh

  const guess = (): number => {
    try {
      const v = Number(localStorage.getItem(STORE_KEY));
      if (v > 120 && v < window.innerHeight * 0.7) return v;
    } catch { /* abaikan */ }
    return Math.round(window.innerHeight * 0.4);
  };

  const tweenTo = (target: number, ms: number) => {
    cancelAnimationFrame(raf);
    // daftar pesan yang sedang di dasar → tetap menempel di dasar selama gerak
    stick = new Map();
    document.querySelectorAll<HTMLElement>('[data-kb-pad]').forEach(el => {
      stick.set(el, el.scrollHeight - el.scrollTop - el.clientHeight < 140);
    });
    const from = current;
    if (Math.abs(target - from) < 1) { apply(target); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      apply(from + (target - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
      else stick = new Map();
    };
    raf = requestAnimationFrame(step);
  };

  const onGeometry = () => {
    if (!vk.overlaysContent) return;
    const h = Math.round(vk.boundingRect.height);
    if (h > 120) {
      realH = h;
      try { localStorage.setItem(STORE_KEY, String(h)); } catch { /* abaikan */ }
      if (smooth(document.activeElement)) { setRoot(h); tweenTo(h, 120); } // koreksi halus ke tinggi asli
    }
  };
  const onFocusIn = (e: FocusEvent) => {
    if (!smooth(e.target)) return;
    if (offTimer) clearTimeout(offTimer);
    if (!vk.overlaysContent) vk.overlaysContent = true;
    const h = realH || guess();
    setRoot(h);
    tweenTo(h, OPEN_MS); // mulai NAIK sekarang juga, barengan keyboard
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!smooth(e.target) || smooth(e.relatedTarget as any)) return;
    if (offTimer) clearTimeout(offTimer);
    tweenTo(0, CLOSE_MS); // keyboard Android menghilang cepat → turun langsung, tanpa jeda
    setRoot(0);
    offTimer = setTimeout(() => { if (!smooth(document.activeElement)) vk.overlaysContent = false; }, CLOSE_MS + 120);
  };

  vk.addEventListener('geometrychange', onGeometry);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  return () => {
    vk.removeEventListener('geometrychange', onGeometry);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    cancelAnimationFrame(raf);
    if (offTimer) clearTimeout(offTimer);
    apply(0);
    setRoot(0);
    try { vk.overlaysContent = false; } catch { /* abaikan */ }
  };
}
