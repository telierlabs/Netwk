import { useCallback, useEffect, useRef } from 'react';
import type { TouchEvent } from 'react';
import { animate, useMotionValue } from 'motion/react';
import type { MotionValue } from 'motion/react';

// ─────────────────────────────────────────────────────────────
// SIDEBAR NGIKUTIN JARI (khusus HP)
//
// `progress` = MotionValue 0..1  (0 = tertutup, 1 = terbuka penuh).
// Sidebar & overlay-nya HARUS dibaca dari `progress` ini (lihat catatan di bawah),
// jadi selama jari bergeser TIDAK ADA React re-render sama sekali — nilai
// langsung dipakai GPU lewat transform. Itu yang bikin mulus, nggak patah-patah.
//
//  - Geser kanan di layar chat  : sidebar ikut keluar sesuai jari
//  - Geser kiri saat terbuka    : sidebar ikut menutup sesuai jari
//  - Lepas jari                 : lanjut sendiri (spring) ke buka/tutup,
//                                 pakai kecepatan flick + posisi terakhir
//  - Tombol hamburger / klik overlay: ikut dianimasikan lewat `isOpen`
//
// Gesture diabaikan kalau mulai dari kolom ketik, area yang bisa digeser
// menyamping (kode/tabel), atau gelembung pesan (kecuali tepi kiri layar).
// Pengecekan berat dijalankan SEKALI per gesture, bukan tiap sentuhan.
// ─────────────────────────────────────────────────────────────

interface Options {
  enabled: boolean;      // gesture boleh aktif?
  isOpen: boolean;       // state sidebar di App (hamburger / overlay tetap lewat ini)
  onOpen: () => void;
  onClose: () => void;
  width?: number;        // lebar sidebar (px). Samakan dengan lebar di Sidebar.tsx
}

const LOCK_DISTANCE = 10;   // jarak minimal sebelum arah geser ditentukan (px)
const EDGE_ZONE = 24;       // tepi kiri layar yang selalu boleh ditarik (px)
const FLICK_SPEED = 0.35;   // px/ms — di atas ini dianggap lemparan
const SPRING = { type: 'spring' as const, stiffness: 520, damping: 46, mass: 0.9 };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// Sidebar kamu fullscreen (inset-0 w-full), jadi 1 px geser jari = 1 px panel bergerak.
const defaultWidth = () =>
  typeof window === 'undefined' ? 390 : window.innerWidth;

const isHorizontallyScrollable = (el: HTMLElement | null): boolean => {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const ox = window.getComputedStyle(node).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 2) return true;
    node = node.parentElement;
  }
  return false;
};

const isBlockedStart = (target: HTMLElement, startX: number): boolean => {
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || target.isContentEditable) return true;
  if (startX > EDGE_ZONE && target.closest('[id^="message-"]')) return true;
  if (isHorizontallyScrollable(target)) return true;
  return false;
};

type Gesture = {
  x: number; y: number; target: HTMLElement;
  mode: 'idle' | 'drag' | 'ignore';
  dragX: number;      // posisi X saat gesture "dikunci"
  base: number;       // nilai progress saat dikunci
  lastX: number; lastT: number; v: number; // kecepatan (px/ms)
};

export function useSwipeSidebar({ enabled, isOpen, onOpen, onClose, width }: Options) {
  const progress: MotionValue<number> = useMotionValue(isOpen ? 1 : 0);
  const g = useRef<Gesture | null>(null);
  const anim = useRef<{ stop: () => void } | null>(null);
  const settlingTo = useRef<number | null>(null);

  const latest = useRef({ enabled, isOpen, onOpen, onClose, width });
  latest.current = { enabled, isOpen, onOpen, onClose, width };
  const getW = () => latest.current.width || defaultWidth();

  const run = (to: number, velocityPxPerMs = 0) => {
    anim.current?.stop();
    settlingTo.current = to;
    anim.current = animate(progress, to, {
      ...SPRING,
      velocity: (velocityPxPerMs * 1000) / getW(),
    });
  };

  // Hamburger / overlay / pilih chat → state isOpen berubah → animasikan progress.
  // Kalau perubahan ini datang dari lepas-jari (sudah dianimasikan), jangan diulang.
  useEffect(() => {
    if (g.current?.mode === 'drag') return;
    const to = isOpen ? 1 : 0;
    if (settlingTo.current === to) { settlingTo.current = null; return; }
    run(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!latest.current.enabled || e.touches.length !== 1) { g.current = null; return; }
    const t = e.touches[0];
    // Murah: cuma catat posisi. Tidak ada getComputedStyle di sini.
    g.current = {
      x: t.clientX, y: t.clientY, target: e.target as HTMLElement,
      mode: 'idle', dragX: t.clientX, base: 0,
      lastX: t.clientX, lastT: performance.now(), v: 0,
    };
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const s = g.current;
    if (!s || s.mode === 'ignore') return;
    const t = e.touches[0];

    if (s.mode === 'idle') {
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_DISTANCE) return;

      // Dominan vertikal = scroll biasa, lepaskan
      if (Math.abs(dy) > Math.abs(dx) * 0.8) { s.mode = 'ignore'; return; }

      const open = latest.current.isOpen;
      if (!open && dx <= 0) { s.mode = 'ignore'; return; }   // tertutup: cuma geser kanan
      if (!open && isBlockedStart(s.target, s.x)) { s.mode = 'ignore'; return; }

      // Kunci jadi drag. Mulai dari posisi jari SEKARANG biar tidak "loncat".
      anim.current?.stop();
      settlingTo.current = null;
      s.mode = 'drag';
      s.base = progress.get();
      s.dragX = t.clientX;
      s.lastX = t.clientX;
      s.lastT = performance.now();
      return;
    }

    // mode === 'drag': langsung tulis ke MotionValue (tanpa React render)
    const now = performance.now();
    const dt = now - s.lastT;
    if (dt > 0) s.v = 0.8 * s.v + 0.2 * ((t.clientX - s.lastX) / dt);
    s.lastX = t.clientX;
    s.lastT = now;
    progress.set(clamp01(s.base + (t.clientX - s.dragX) / getW()));
  }, [progress]);

  const finish = useCallback(() => {
    const s = g.current;
    g.current = null;
    if (!s || s.mode !== 'drag') return;

    const p = progress.get();
    const flick = Math.abs(s.v) > FLICK_SPEED;
    const target = flick ? (s.v > 0 ? 1 : 0) : (p > 0.5 ? 1 : 0);

    run(target, s.v);
    const { isOpen, onOpen, onClose } = latest.current;
    if (target === 1 && !isOpen) onOpen();
    else if (target === 0 && isOpen) onClose();
    else settlingTo.current = null; // state tidak berubah (geser dibatalkan) → effect tidak jalan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return {
    progress,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: finish,
      onTouchCancel: finish,
    },
  };
}
