import React from 'react';
import { X, Mail, Share2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
  groupId?: string | null; // ── NANGKEP ID GRUP BUAT BIKIN LINK ──
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, showToast, groupId }) => {
  if (!isOpen) return null;

  // FUNGSI COPY LINK UNIK
  const handleCopyLink = () => {
    if (!groupId) {
      showToast('Gagal membuat link');
      return;
    }
    const inviteLink = `${window.location.origin}/join/${groupId}`;
    navigator.clipboard.writeText(inviteLink);
    showToast('Link undangan disalin!');
    onClose();
  };

  // FUNGSI SHARE VIA WHATSAPP
  const handleWhatsApp = () => {
    if (!groupId) return;
    const inviteLink = `${window.location.origin}/join/${groupId}`;
    const text = `Hai! Gabung ke grup AI gua di Cylen yuk, kita diskusi bareng AI: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  // FUNGSI EMAIL (Opsional, pakai mailto)
  const handleEmail = () => {
    if (!groupId) return;
    const inviteLink = `${window.location.origin}/join/${groupId}`;
    const subject = "Undangan Gabung Grup AI Cylen";
    const body = `Hai!\n\nGabung ke grup diskusi AI di Cylen lewat link ini:\n${inviteLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 m-auto z-[201] w-[90%] max-w-[320px] h-fit bg-[var(--bg)] rounded-[24px] shadow-2xl border border-[var(--bd)]/20 flex flex-col overflow-hidden"
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[var(--bd)]/15">
          <h3 className="text-[16px] font-bold text-[var(--text)]">Undang Teman</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/60 transition-colors">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-3 bg-[var(--sf)]/20">
          <button onClick={handleEmail} className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[var(--bg)] border border-[var(--bd)]/20 flex items-center justify-center text-[var(--text)]/70 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
              <Mail size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-[var(--text)]/60">Email</span>
          </button>

          <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[var(--bg)] border border-[var(--bd)]/20 flex items-center justify-center text-[var(--text)]/70 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
              <Share2 size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-[var(--text)]/60">Salin Link</span>
          </button>

          <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2 group">
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[var(--bg)] border border-[var(--bd)]/20 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all active:scale-95 shadow-sm">
              <MessageSquare size={22} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-medium text-[var(--text)]/60">WhatsApp</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
