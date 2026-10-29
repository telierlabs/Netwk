import { useCallback, useRef } from 'react';
import type { TouchEvent } from 'react';

// ─────────────────────────────────────────────────────────────
// GESER UNTUK BUKA SIDEBAR (khusus HP)
//  - Layar chat: geser ke KANAN  = sidebar terbuka (tanpa tekan hamburger)
//  - Sidebar terbuka: geser ke KIRI = sidebar tertutup
// Gesture sengaja diabaikan kalau:
//  - mulai dari kolom ketik (supaya nggak ganggu menggeser kursor/teks)
//  - mulai dari area yang bisa digeser menyamping (kode, tabel)
//  - mulai dari gelembung pesan (di sana geser = balas pesan),
//    kecuali mulai dari tepi kiri layar
// ─────────────────────────────────────────────────────────────

interface Options {
  enabled: boolean;      // gesture boleh aktif?
  isOpen: boolean;       // sidebar sedang terbuka?
  onOpen: () => void;
  onClose: () => void;
}

const MIN_DISTANCE = 70;   // minimal jarak geser (px)
const MAX_DURATION = 700;  // maksimal lama geser (ms)
const EDGE_ZONE = 24;      // lebar tepi kiri layar (px)

const isHorizontallyScrollable = (el: HTMLElement | null): boolean => {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const ox = window.getComputedStyle(node).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 2) return true;
    node = node.parentElement;
  }
  return false;
};

export function useSwipeSidebar({ enabled, isOpen, onOpen, onClose }: Options) {
  const start = useRef<{ x: number; y: number; t: number; blocked: boolean } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    let blocked = false;

    if (!isOpen) {
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable) blocked = true;
      else if (isHorizontallyScrollable(target)) blocked = true;
      else if (touch.clientX > EDGE_ZONE && target.closest('[id^="message-"]')) blocked = true;
    }

    start.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), blocked };
  }, [enabled, isOpen]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.blocked || !enabled) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;

    if (Date.now() - s.t > MAX_DURATION) return;
    if (Math.abs(dx) < MIN_DISTANCE) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return; // terlalu miring = itu scroll, bukan geser

    if (!isOpen && dx > 0) onOpen();
    else if (isOpen && dx < 0) onClose();
  }, [enabled, isOpen, onOpen, onClose]);

  const onTouchCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
