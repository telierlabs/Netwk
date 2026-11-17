// ─────────────────────────────────────────────
// KEYBOARD SMOOTH — src/lib/keyboard.ts
// Masalah: di HP, kolom ketik naik duluan (atau telat), keyboard meluncur belakangan. Tidak bersamaan.
// Solusi: selama kolom ketik chat fokus, keyboard TIDAK mengubah ukuran halaman (VirtualKeyboard API).
// Tinggi keyboard dianimasikan sendiri lewat JS (--kb) dan dimulai SAAT KOLOM DIKETUK, memakai tinggi keyboard
// yang terakhir diingat, jadi kolom ketik, isi chat, dan logo naik bersamaan dengan keyboard
// (tidak menunggu browser melapor tinggi keyboard). Saat tinggi asli dilaporkan, selisihnya dikoreksi halus.
// Semua yang memakai var(--kb) (tinggi aplikasi, logo, editor layar penuh) ikut bergerak seirama.
// Hanya aktif untuk elemen ber-atribut data-kb-smooth. Browser tanpa VirtualKeyboard API: tidak berubah apa-apa.
// ─────────────────────────────────────────────
export const KB_TRANSITION = 'none'; // animasinya dikerjakan JS, bukan CSS

const STORE_KEY = 'cylen_kb_h';
const OPEN_MS = 260;
const CLOSE_MS = 220;

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic, mirip gerak keyboard Android

export function initSmoothKeyboard(): () => void {
  const vk = typeof navigator !== 'undefined' ? (navigator as any).virtualKeyboard : null;
  if (!vk) return () => {};
  const root = document.documentElement;
  let current = 0;
  let raf = 0;
  let offTimer: ReturnType<typeof setTimeout> | undefined;
  let realH = 0;

  const smooth = (t: any): boolean => t instanceof Element && !!t.closest('[data-kb-smooth]');
  const apply = (px: number) => {
    current = px;
    root.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`);
  };
  const guess = (): number => {
    try {
      const v = Number(localStorage.getItem(STORE_KEY));
      if (v > 120 && v < window.innerHeight * 0.7) return v;
    } catch { /* abaikan */ }
    return Math.round(window.innerHeight * 0.4);
  };
  const tweenTo = (target: number, ms: number) => {
    cancelAnimationFrame(raf);
    const from = current;
    if (Math.abs(target - from) < 1) { apply(target); return; }
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      apply(from + (target - from) * ease(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const onGeometry = () => {
    if (!vk.overlaysContent) return;
    const h = Math.round(vk.boundingRect.height);
    if (h > 120) {
      realH = h;
      try { localStorage.setItem(STORE_KEY, String(h)); } catch { /* abaikan */ }
      if (smooth(document.activeElement)) tweenTo(h, 140); // koreksi halus ke tinggi asli
    }
  };
  const onFocusIn = (e: FocusEvent) => {
    if (!smooth(e.target)) return;
    if (offTimer) clearTimeout(offTimer);
    if (!vk.overlaysContent) vk.overlaysContent = true;
    tweenTo(realH || guess(), OPEN_MS); // mulai NAIK sekarang juga, barengan keyboard
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!smooth(e.target) || smooth(e.relatedTarget as any)) return;
    if (offTimer) clearTimeout(offTimer);
    offTimer = setTimeout(() => {
      if (smooth(document.activeElement)) return;
      tweenTo(0, CLOSE_MS);
      setTimeout(() => { if (!smooth(document.activeElement)) vk.overlaysContent = false; }, CLOSE_MS + 80);
    }, 60);
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
    try { vk.overlaysContent = false; } catch { /* abaikan */ }
  };
}
