// ─────────────────────────────────────────────
// USER BUBBLE — src/components/chat/components/ui/UserBubble.tsx
// User message with swipe-to-reply & context menu
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
}

export const UserBubble = memo(({ msg, displayContent, onResend, onEdit, onSwipeToReply }: UserBubbleProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuCopied, setUserMenuCopied] = useState(false);

  useEffect(() => {
    const handler = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showUserMenu]);

  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    navigator.clipboard.writeText(actualContent);
    setUserMenuCopied(true);
    setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { actualContent } = parseReplyQuote(displayContent);
    onEdit?.(actualContent);
    setShowUserMenu(false);
  };

  return (
    <div style={{
      background: 'var(--sf, #f5f3ef)',
      border: '1.5px solid var(--bd, #dedad4)',
      borderRadius: '16px 4px 16px 16px',
      color: 'var(--text, #141414)',
      maxWidth: '85%',
      boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
      position: 'relative',
    }}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
      >
        <CollapsibleUserBubble
          content={displayContent}
          onClick={e => { e.stopPropagation(); setShowUserMenu(true); }}
        />
      </motion.div>

      <AnimatePresence>
        {showUserMenu && (
          <motion.div
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 99999,
              width: 152, background: 'var(--sf,#f5f3ef)',
              border: '1.5px solid var(--bd,#dedad4)', borderRadius: 14,
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column', padding: 4,
            }}
          >
            <button
              onClick={e => { e.stopPropagation(); onResend?.(displayContent); setShowUserMenu(false); }}
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
            <div style={{ height: 1, background: 'var(--bd,#dedad4)', margin: '2px 8px', opacity: 0.6 }} />
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
