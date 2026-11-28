import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MessageSquare, Info, X } from 'lucide-react';

// Avatar grup: foto kalau ada, kalau tidak ikon orang (bukan huruf awal).
// Warna ngikutin tema web (var(--text) / var(--bg)).
export const GroupAvatar: React.FC<{
  avatar?: string | null;
  size?: number;
  className?: string;
}> = ({ avatar, size = 48, className = '' }) => (
  <div
    style={{ width: size, height: size }}
    className={`rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center overflow-hidden shrink-0 ${className}`}
  >
    {avatar ? (
      <img src={avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
    ) : (
      <Users size={Math.round(size * 0.5)} strokeWidth={1.8} />
    )}
  </div>
);

interface GroupPreviewCardProps {
  open: boolean;
  title: string;
  avatar?: string | null;
  onClose: () => void;
  onChat: () => void;   // masuk antarmuka chat
  onInfo: () => void;   // buka profil grup
}

export const GroupPreviewCard: React.FC<GroupPreviewCardProps> = ({
  open, title, avatar, onClose, onChat, onInfo,
}) => {
  const [showPhoto, setShowPhoto] = useState(false);

  const close = () => { setShowPhoto(false); onClose(); };

  return (
    <>
      <AnimatePresence>
        {open && !showPhoto && (
          <motion.div
            key="preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[280px] bg-[var(--bg)] border border-[var(--bd)]/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3">
                <h3 className="text-[16px] font-bold text-[var(--text)] truncate">{title}</h3>
              </div>

              {/* Tap foto → baru tampil penuh */}
              <button
                type="button"
                onClick={() => setShowPhoto(true)}
                aria-label={title}
                className="block w-full aspect-square bg-[var(--sf)] flex items-center justify-center text-[var(--text)]/45 overflow-hidden [-webkit-tap-highlight-color:transparent]"
              >
                {avatar
                  ? <img src={avatar} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <Users size={96} strokeWidth={1.6} />}
              </button>

              <div className="flex border-t border-[var(--bd)]/15">
                <button
                  type="button"
                  onClick={() => { close(); onChat(); }}
                  aria-label="Chat"
                  className="flex-1 py-3.5 flex items-center justify-center text-[var(--text)] hover:bg-[var(--sf)] active:bg-[var(--sf)] transition-colors"
                >
                  <MessageSquare size={22} strokeWidth={1.9} />
                </button>
                <div className="w-px bg-[var(--bd)]/15" />
                <button
                  type="button"
                  onClick={() => { close(); onInfo(); }}
                  aria-label="Info"
                  className="flex-1 py-3.5 flex items-center justify-center text-[var(--text)] hover:bg-[var(--sf)] active:bg-[var(--sf)] transition-colors"
                >
                  <Info size={22} strokeWidth={1.9} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foto penuh: cuma muncul setelah foto di kartu di-tap */}
      <AnimatePresence>
        {open && showPhoto && (
          <motion.div
            key="preview-photo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[410] bg-black flex flex-col"
          >
            <div className="px-4 py-4 absolute top-0 w-full z-10" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
              <button
                onClick={() => setShowPhoto(false)}
                aria-label="Tutup"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
              {avatar
                ? <img src={avatar} alt={title} className="w-full h-auto max-h-full object-contain" />
                : (
                  <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center">
                    <Users size={160} strokeWidth={1.5} />
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
