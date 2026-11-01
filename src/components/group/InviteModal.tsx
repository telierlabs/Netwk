import React from 'react';
import { X, Mail, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
  groupId?: string | null; // ── NANGKEP ID COLLABORATION BUAT BIKIN LINK ──
}

// ── IKON WHATSAPP RESMI (ikut warna teks: putih di dark, hitam di light) ──
const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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
    const text = `Halo! Kamu diundang bergabung ke Collaboration di Cylen. Yuk berdiskusi bersama AI di sini: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    onClose();
  };

  // FUNGSI EMAIL (Opsional, pakai mailto)
  const handleEmail = () => {
    if (!groupId) return;
    const inviteLink = `${window.location.origin}/join/${groupId}`;
    const subject = "Undangan Collaboration Cylen";
    const body = `Halo!\n\nKamu diundang bergabung ke Collaboration di Cylen. Buka link ini untuk bergabung:\n${inviteLink}`;
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
            <div className="w-[60px] h-[60px] rounded-[18px] bg-[var(--bg)] border border-[var(--bd)]/20 flex items-center justify-center text-[var(--text)]/70 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
              <WhatsAppIcon size={22} />
            </div>
            <span className="text-[12px] font-medium text-[var(--text)]/60">WhatsApp</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
