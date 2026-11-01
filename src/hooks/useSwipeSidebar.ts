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
//
// FIX LAG: dulu pengecekan "area ini bisa digeser menyamping?" (getComputedStyle
// ke SEMUA elemen induk) dijalankan di SETIAP sentuhan awal, termasuk tiap kali
// kamu mau scroll chat → bikin scroll terasa berat di awal sentuhan.
// Sekarang sentuhan awal cuma mencatat posisi (murah). Pengecekan berat baru
// dijalankan di akhir sentuhan, dan HANYA kalau gerakannya memang geseran
// horizontal yang valid (jarak cukup, cepat, tidak miring).
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

// Apakah sentuhan yang MULAI dari elemen ini harus diabaikan? (cuma relevan saat sidebar tertutup)
const isBlockedStart = (target: HTMLElement, startX: number): boolean => {
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable) return true;
  if (startX > EDGE_ZONE && target.closest('[id^="message-"]')) return true;
  if (isHorizontallyScrollable(target)) return true;
  return false;
};

export function useSwipeSidebar({ enabled, isOpen, onOpen, onClose }: Options) {
  const start = useRef<{ x: number; y: number; t: number; target: HTMLElement } | null>(null);

  // Handler cukup tahu versi terbaru dari opsi tanpa harus ganti identitas tiap render
  const latest = useRef({ enabled, isOpen, onOpen, onClose });
  latest.current = { enabled, isOpen, onOpen, onClose };

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!latest.current.enabled || e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const touch = e.touches[0];
    // Murah: cuma catat. Tidak ada getComputedStyle / traversal DOM di sini.
    start.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), target: e.target as HTMLElement };
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    const { enabled, isOpen, onOpen, onClose } = latest.current;
    if (!s || !enabled) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;

    if (Date.now() - s.t > MAX_DURATION) return;
    if (Math.abs(dx) < MIN_DISTANCE) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return; // terlalu miring = itu scroll, bukan geser

    if (!isOpen && dx > 0) {
      // Pengecekan berat baru dijalankan di sini, setelah geseran dipastikan valid
      if (isBlockedStart(s.target, s.x)) return;
      onOpen();
    } else if (isOpen && dx < 0) {
      onClose();
    }
  }, []);

  const onTouchCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
