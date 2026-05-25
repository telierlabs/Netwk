// ─────────────────────────────────────────────
// ACTION BAR — src/components/chat/components/ui/ActionBar.tsx
// Copy · Share · Library (Save) · Like · Dislike · Regenerate · Pin
// ─────────────────────────────────────────────
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Check, Library, Share2, ThumbsUp, ThumbsDown, RotateCcw, Pin, PinOff } from 'lucide-react';
import { db, auth } from '../../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
  const [shared, setShared] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);

  // ── 1. LOGIKA COPY ──
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── 2. LOGIKA SHARE (BAGIKAN) ──
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cylen AI',
          text: content,
        });
      } catch (e) {
        // Abaikan kalau user batalin share
      }
    } else {
      // Fallback kalau browser/device gak support Web Share API (misal di PC)
      handleCopy();
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  // ── 3. LOGIKA SAVE KE PERPUSTAKAAN ──
  const handleSave = () => {
    if (onSaveItem) {
      onSaveItem(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // ── 4. LOGIKA LIKE / DISLIKE KE FIRESTORE ──
  const handleFeedback = async (type: 'up' | 'down') => {
    // Kalau di-klik dua kali, batalkan
    if (liked === type) {
      setLiked(null);
      return;
    }

    setLiked(type);

    // Kirim diam-diam ke Firestore
    try {
      if (auth.currentUser) {
        await addDoc(collection(db, 'ai_feedback'), {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || 'Guest',
          rating: type,
          contentPreview: content.substring(0, 500), // Simpan 500 karakter pertama aja biar hemat DB
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Gagal nyimpen feedback ke Firebase", error);
    }
  };

  const buttons = [
    {
      icon: copied ? <Check size={19} strokeWidth={2.5} className="text-green-500" /> : <Copy size={19} strokeWidth={2} />,
      onClick: handleCopy,
      active: copied,
    },
    {
      icon: shared ? <Check size={19} strokeWidth={2.5} className="text-green-500" /> : <Share2 size={19} strokeWidth={2} />,
      onClick: handleShare,
      active: shared,
    },
    {
      icon: saved ? <Check size={19} strokeWidth={2.5} className="text-green-500" /> : <Library size={19} strokeWidth={2} />,
      onClick: handleSave,
      active: saved,
    },
    {
      icon: <ThumbsUp size={19} strokeWidth={liked === 'up' ? 2.5 : 2} />,
      onClick: () => handleFeedback('up'),
      active: liked === 'up',
    },
    {
      icon: <ThumbsDown size={19} strokeWidth={liked === 'down' ? 2.5 : 2} />,
      onClick: () => handleFeedback('down'),
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
