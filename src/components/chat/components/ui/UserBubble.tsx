// ─────────────────────────────────────────────
// USER BUBBLE — src/components/chat/components/ui/UserBubble.tsx
// User message with swipe-to-reply & context menu
// PERUBAHAN:
//   • Bentuk dinamis: PILL (rounded-full) kalau teks ≤2 baris,
//     otomatis balik jadi KOTAK kalau teksnya lebih panjang.
//     Deteksi baris dikirim dari CollapsibleUserBubble via onShapeChange.
//   • Border tipis dihapus total (no more garis tipis).
//   • Warna background dipisah dari var(--sf) lama supaya dark mode
//     jadi ABU netral, bukan item legam.
//     Asumsi dark mode aktif lewat class ".dark" di parent ATAU
//     prefers-color-scheme: dark. Kalau app pakai mekanisme lain
//     (misal data-theme="dark"), tinggal kasih tau selector-nya.
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

const BUBBLE_STYLE_ID = 'cylen-user-bubble-styles';

// Inject CSS sekali aja ke <head>, biar warna bubble user & menu-nya
// gak ketiban var(--sf) lama yang bikin dark mode jadi item legam.
function ensureBubbleStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BUBBLE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = BUBBLE_STYLE_ID;
  style.textContent = `
    .cylen-user-bubble,
    .cylen-user-menu {
      background: #f5f3ef;
    }
    @media (prefers-color-scheme: dark) {
      .cylen-user-bubble,
      .cylen-user-menu {
        background: #3a3a3a;
      }
    }
    .dark .cylen-user-bubble,
    .dark .cylen-user-menu {
      background: #3a3a3a;
    }
  `;
  document.head.appendChild(style);
}

export const UserBubble = memo(({ msg, displayContent, onResend, onEdit, onSwipeToReply, isMenuOpen, setIsMenuOpen }: UserBubbleProps) => {
  const [userMenuCopied, setUserMenuCopied] = useState(false);
  const [isPill, setIsPill] = useState(false);

  useEffect(() => {
    ensureBubbleStyles();
  }, []);

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
      className="cylen-user-bubble"
      style={{
        borderRadius: isPill ? 999 : '18px 4px 18px 18px',
        color: 'var(--text, #141414)',
        maxWidth: isPill ? 'fit-content' : '85%',
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
            className="cylen-user-menu"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 99999,
              width: 152, borderRadius: 14,
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
