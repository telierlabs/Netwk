// ─────────────────────────────────────────────
// USER BUBBLE — src/components/chat/components/ui/UserBubble.tsx
// User message with swipe-to-reply & context menu
// PERUBAHAN:
//   • Bubble pakai display:block + width:fit-content (bukan display:table).
//   • Bentuk pil (radius penuh) hanya untuk teks 1 baris (diputuskan CollapsibleUserBubble).
//     Teks multi-baris memakai radius kotak 20px.
//   • (lama) menu Ulangi / Edit / Salin: sentuhan di dalam bubble/menu tidak dianggap "tap di luar".
//   • (lama) warna bubble pakai color-mix() dari var(--text)/var(--bg) app.
// ─────────────────────────────────────────────
import React, { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, Edit2, Copy, Check } from 'lucide-react';
import { usePageText } from '../../../../lib/i18n';
import { BUBBLE_NS, BUBBLE_TEXT } from '../../../../lib/bubbleText';
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
const BUBBLE_BG = 'color-mix(in srgb, var(--text, #141414) 7%, var(--bg, #ffffff))';
const MENU_BG = 'color-mix(in srgb, var(--text, #141414) 11%, var(--bg, #ffffff))';

const MENU_BTN_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--text,#141414)',
  fontSize: 13,
  fontWeight: 500,
  WebkitTapHighlightColor: 'transparent',
};

// Salin ke clipboard. Return true kalau berhasil.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* lanjut ke fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const UserBubble = memo(({ msg, displayContent, onResend, onEdit, onSwipeToReply, isMenuOpen, setIsMenuOpen }: UserBubbleProps) => {
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  const [userMenuCopied, setUserMenuCopied] = useState(false);
  const [isPill, setIsPill] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tutup menu HANYA kalau sentuhan/klik terjadi di LUAR bubble + menu ini.
  useEffect(() => {
    if (!isMenuOpen) return;

    const handler = (e: Event) => {
      const target = e.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isMenuOpen, setIsMenuOpen]);

  const handleUserMenuCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    const ok = await copyToClipboard(actualContent);
    if (!ok) { setIsMenuOpen(false); return; }
    setUserMenuCopied(true);
    setTimeout(() => { setUserMenuCopied(false); setIsMenuOpen(false); }, 1200);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    setIsMenuOpen(false);
    onEdit?.(actualContent);
  };

  const handleResend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onResend?.(displayContent);
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: BUBBLE_BG,
        borderRadius: isPill ? 999 : '20px 6px 20px 20px',
        color: 'var(--text, #141414)',
        display: 'block',
        width: 'fit-content',
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
          onClick={e => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
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
            <button type="button" onClick={handleResend} style={MENU_BTN_STYLE}>
              <RotateCcw size={14} color="var(--mu,#909090)" /> {bx.resend}
            </button>
            <button type="button" onClick={handleEdit} style={MENU_BTN_STYLE}>
              <Edit2 size={14} color="var(--mu,#909090)" /> {bx.edit}
            </button>
            <div style={{ height: 1, background: 'rgba(128,128,128,0.25)', margin: '2px 8px' }} />
            <button type="button" onClick={handleUserMenuCopy} style={MENU_BTN_STYLE}>
              {userMenuCopied
                ? <><Check size={14} color="var(--text,#141414)" /> {bx.copied}</>
                : <><Copy size={14} color="var(--mu,#909090)" /> {bx.copy}</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
