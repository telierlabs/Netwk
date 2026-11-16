// ─────────────────────────────────────────────
// KEYBOARD SMOOTH — src/lib/keyboard.ts
// Masalah: di HP, pas kolom ketik diketuk, halaman langsung "loncat" mengecil (kolom ketik naik duluan),
// baru keyboard-nya meluncur naik. Jadi tidak bersamaan.
// Solusi: selama kolom ketik chat fokus, keyboard TIDAK lagi mengubah ukuran halaman (VirtualKeyboard API,
// Chrome Android). Tinggi keyboard dibaca lalu dipakai untuk menganimasikan tinggi aplikasi (--kb) dengan
// transisi halus, jadi kolom ketik naik BARENGAN dengan keyboard dan turun mulus saat ditutup.
// Hanya aktif untuk elemen ber-atribut data-kb-smooth. Browser tanpa VirtualKeyboard API: tidak berubah apa-apa.
// ─────────────────────────────────────────────
export const KB_TRANSITION = 'height .28s cubic-bezier(.22,.8,.28,1)';

export function initSmoothKeyboard(): () => void {
  const vk = typeof navigator !== 'undefined' ? (navigator as any).virtualKeyboard : null;
  if (!vk) return () => {};
  const root = document.documentElement;
  let offTimer: ReturnType<typeof setTimeout> | undefined;
  const smooth = (t: any): boolean => t instanceof Element && !!t.closest('[data-kb-smooth]');
  const setKb = (px: number) => root.style.setProperty('--kb', `${Math.max(0, Math.round(px))}px`);

  const onGeometry = () => {
    if (!vk.overlaysContent) return;
    setKb(vk.boundingRect.height);
  };
  const onFocusIn = (e: FocusEvent) => {
    if (!smooth(e.target)) return;
    if (offTimer) clearTimeout(offTimer);
    if (!vk.overlaysContent) vk.overlaysContent = true;
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!smooth(e.target) || smooth(e.relatedTarget)) return;
    if (offTimer) clearTimeout(offTimer);
    // beri waktu animasi turun selesai, baru kembalikan perilaku normal (supaya input lain di app tidak terpengaruh)
    offTimer = setTimeout(() => {
      if (smooth(document.activeElement)) return;
      setKb(0);
      setTimeout(() => { if (!smooth(document.activeElement)) vk.overlaysContent = false; }, 320);
    }, 120);
  };

  vk.addEventListener('geometrychange', onGeometry);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  return () => {
    vk.removeEventListener('geometrychange', onGeometry);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    if (offTimer) clearTimeout(offTimer);
    setKb(0);
    try { vk.overlaysContent = false; } catch { /* abaikan */ }
  };
}
