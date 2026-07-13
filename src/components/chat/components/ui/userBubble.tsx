// ─────────────────────────────────────────────
// USER BUBBLE — src/components/chat/components/ui/UserBubble.tsx
// User message with swipe-to-reply & context menu
// PERUBAHAN (fix bug bubble 2-baris kepanjangan):
//   • GANTI: `maxWidth: 'fit-content'` -> `display: 'table'` + `width: 'auto'`
//     saat isPill true.
//     Kenapa: keyword `fit-content` cuma menghitung
//     min(max-content, available-width), dan `max-content` adalah lebar
//     teks versi TIDAK di-wrap (1 baris). Untuk teks yang butuh wrap ke
//     2 baris, max-content-nya jadi lebih lebar dari container, jadi
//     browser jatuh ke available-width -> bubble mentok selebar
//     container. `display: table` memakai algoritma table-layout yang
//     menghitung ulang lebar berdasarkan hasil wrap teks yang
//     sebenarnya, jadi bubble menyusut pas mengikuti baris terpanjang
//     yang benar-benar dirender (1 atau 2 baris).
//   • maxWidth 85% tetap dipertahankan sebagai batas aman di kedua kasus.
//   • (dari revisi sebelumnya) warna bubble tetap pakai color-mix()
//     yang narik dari var(--text)/var(--bg) app, bukan prefers-color-scheme.
// ─────────────────────────────────────────────
import React, { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Edit2, Copy, Check } from 'lucide-react';
import { CollapsibleUserBubble } from './CollapsibleUserBubble';
import { parseReplyQuote } from '../../utils';
import type { Message } from '../../types';

interface UserBubbleProps {
  msg: Message;
  displayContent: string;
  onResend?: (content: string) => void;
  onEdit?: (content: string) => void;
  onSwipeToReply?: (msg: Message) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

// Background bubble: campuran tipis var(--text) di atas var(--bg) app.
// Light mode (text gelap, bg terang) -> hasil abu muda.
// Dark mode  (text terang, bg gelap)  -> hasil abu gelap (bukan hitam pekat).
const BUBBLE_BG = 'color-mix(in srgb, var(--text, #141414) 7%, var(--bg, #ffffff))';
const MENU_BG = 'color-mix(in srgb, var(--text, #141414) 11%, var(--bg, #ffffff))';

export const UserBubble = memo(({ msg, displayContent, onResend, onEdit, onSwipeToReply, isMenuOpen, setIsMenuOpen }: UserBubbleProps) => {
  const [userMenuCopied, setUserMenuCopied] = useState(false);
  const [isPill, setIsPill] = useState(false);

  useEffect(() => {
    const handler = () => setIsMenuOpen(false);
    if (isMenuOpen) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isMenuOpen, setIsMenuOpen]);

  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    navigator.clipboard.writeText(actualContent);
    setUserMenuCopied(true);
    setTimeout(() => { setUserMenuCopied(false); setIsMenuOpen(false); }, 1500);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    onEdit?.(actualContent);
    setIsMenuOpen(false);
  };

  return (
    <div
      style={{
        background: BUBBLE_BG,
        borderRadius: isPill ? 999 : '18px 4px 18px 18px',
        color: 'var(--text, #141414)',
        // Kunci fix: display:table + width:auto bikin bubble shrink-wrap
        // ke lebar hasil wrap teks yang SEBENARNYA (1 atau 2 baris),
        // bukan menebak dari versi teks tak-di-wrap seperti fit-content.
        display: isPill ? 'table' : 'block',
        width: isPill ? 'auto' : undefined,
        maxWidth: '85%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        position: 'relative',
        transition: 'border-radius 0.15s ease',
      }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
      >
        <CollapsibleUserBubble
          content={displayContent}
          onClick={e => { e.stopPropagation(); setIsMenuOpen(true); }}
          onShapeChange={setIsPill}
        />
      </motion.div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 99999,
              width: 152, background: MENU_BG, borderRadius: 14,
              boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
              display: 'flex', flexDirection: 'column', padding: 4,
            }}
          >
            <button
              onClick={e => { e.stopPropagation(); onResend?.(displayContent); setIsMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}
            >
              <RotateCcw size={14} color="var(--mu,#909090)" /> Ulangi
            </button>
            <button
              onClick={handleEdit}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}
            >
              <Edit2 size={14} color="var(--mu,#909090)" /> Edit
            </button>
            <div style={{ height: 1, background: 'rgba(128,128,128,0.25)', margin: '2px 8px' }} />
            <button
              onClick={handleUserMenuCopy}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}
            >
              {userMenuCopied ? <><Check size={14} color="var(--text,#141414)" /> Tersalin</> : <><Copy size={14} color="var(--mu,#909090)" /> Salin</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
