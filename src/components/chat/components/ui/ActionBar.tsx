// ─────────────────────────────────────────────
// ACTION BAR — src/components/chat/components/ui/ActionBar.tsx
// Copy · Library (Save) · Like · Dislike · Regenerate · Pin
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Check, Library, ThumbsUp, ThumbsDown, RotateCcw, Pin, PinOff } from 'lucide-react';

interface ActionBarProps {
  content: string;
  msgIndex: number;
  isPinned: boolean;
  onTogglePin?: (index: number) => void;
  onRegenerate?: (index: number) => void;
  onSaveItem?: (text: string) => void;
  visible: boolean;
}

export const ActionBar = ({ content, msgIndex, isPinned, onTogglePin, onRegenerate, onSaveItem, visible }: ActionBarProps) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSaveItem) {
      onSaveItem(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const buttons = [
    {
      icon: copied ? <Check size={19} strokeWidth={2.5} className="text-green-500" /> : <Copy size={19} strokeWidth={2} />,
      onClick: handleCopy,
      active: copied,
    },
    {
      // ── MENGGANTI SHARE JADI LIBRARY (SAVE) ──
      icon: saved ? <Check size={19} strokeWidth={2.5} className="text-green-500" /> : <Library size={19} strokeWidth={2} />,
      onClick: handleSave,
      active: saved,
    },
    {
      icon: <ThumbsUp size={19} strokeWidth={liked === 'up' ? 2.5 : 2} />,
      onClick: () => setLiked(l => l === 'up' ? null : 'up'),
      active: liked === 'up',
    },
    {
      icon: <ThumbsDown size={19} strokeWidth={liked === 'down' ? 2.5 : 2} />,
      onClick: () => setLiked(l => l === 'down' ? null : 'down'),
      active: liked === 'down',
    },
    {
      icon: <RotateCcw size={19} strokeWidth={2} />,
      onClick: () => onRegenerate?.(msgIndex),
      active: false,
    },
    {
      icon: isPinned ? <PinOff size={19} strokeWidth={2} /> : <Pin size={19} strokeWidth={2} />,
      onClick: () => onTogglePin?.(msgIndex),
      active: isPinned,
    },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 5 }}
        >
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                display: 'flex', alignItems: 'center',
                color: 'var(--text, #141414)',
                opacity: btn.active ? 1 : 0.38,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = btn.active ? '1' : '0.38')}
            >
              {btn.icon}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
