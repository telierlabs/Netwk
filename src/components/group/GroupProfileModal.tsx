import React, { useState, useEffect } from 'react';
import { X, User, Bot, ChevronRight, ArrowLeft, Download, ImageIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession } from '../../types';

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: GroupSession;
}

export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({ isOpen, onClose, activeGroup }) => {
  // State untuk navigasi di dalam modal
  const [view, setView] = useState<'main' | 'gallery' | 'detail'>('main');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  // Reset view ke awal ketika modal ditutup
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('main');
        setSelectedMedia(null);
      }, 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  // Ekstrak semua media (gambar) dari pesan di grup
  const allMedia = (activeGroup.messages || []).reduce((acc: string[], msg: any) => {
    if (msg.images && Array.isArray(msg.images)) {
      acc.push(...msg.images);
    }
    return acc;
  }, []);

  // Fungsi untuk download gambar
  const handleDownload = () => {
    if (!selectedMedia) return;
    const link = document.createElement('a');
    link.href = selectedMedia;
    link.download = `Cylen_Media_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm"
      />
      
      {/* Modal Container */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 m-auto z-[201] w-[90%] max-w-[380px] h-[80vh] max-h-[600px] bg-[var(--bg)] rounded-[24px] shadow-2xl border border-[var(--bd)]/20 overflow-hidden flex flex-col"
      >
        <AnimatePresence mode="wait">
          
          {/* ================= VIEW: MAIN PROFILE ================= */}
          {view === 'main' && (
            <motion.div 
              key="view-main"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-[var(--bd)]/15 bg-[var(--bg)] shrink-0">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text)]">{activeGroup.title}</h3>
                  <p className="text-[12px] text-[var(--text)]/50 mt-0.5">{activeGroup.participants.length} Anggota (Maks 10)</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/60 transition-colors">
                  <X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5 bg-[var(--sf)]/20 flex-1" style={{ scrollbarWidth: 'none' }}>
                
                {/* Kapasitas Member */}
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg)] border border-[var(--bd)]/20 rounded-[16px] shadow-sm">
                  <span className="text-[13px] text-[var(--text)]/60 font-medium">Kapasitas Member</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">{userCount} / 10 User</span>
                </div>

                {/* Seksi Media */}
                <div className="flex flex-col gap-2.5">
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => setView('gallery')}
                  >
                    <h4 className="text-[13px] font-bold text-[var(--text)] ml-1">Media, tautan, dan dok</h4>
                    <div className="flex items-center gap-1 text-[var(--text)]/50 group-hover:text-[var(--text)] transition-colors">
                      <span className="text-[12px] font-medium">{allMedia.length}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {allMedia.length > 0 ? (
                      allMedia.slice(0, 4).map((m, i) => (
                        <div 
                          key={i} 
                          className="w-[72px] h-[72px] rounded-[14px] bg-[var(--sf)] shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-[var(--bd)]/10" 
                          onClick={() => { setSelectedMedia(m); setView('detail'); }}
                        >
                          <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                        </div>
                      ))
                    ) : (
                      <div className="w-full py-5 flex flex-col items-center justify-center text-[var(--text)]/30 bg-[var(--bg)] border border-[var(--bd)]/20 rounded-[16px]">
                        <ImageIcon size={24} className="mb-1.5 opacity-50" />
                        <span className="text-[11px] font-medium">Belum ada media</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daftar Anggota */}
                <div className="flex flex-col gap-2 mt-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text)]/40 ml-1">Daftar Anggota</h4>
                  <div className="bg-[var(--bg)] border border-[var(--bd)]/20 rounded-[16px] overflow-hidden shadow-sm flex flex-col">
                    {activeGroup.participants.map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 ${i !== activeGroup.participants.length - 1 ? 'border-b border-[var(--bd)]/10' : ''}`}>
                        <div 
                          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm"
                          style={p.isAI ? { backgroundColor: 'var(--sf)', color: 'var(--text)' } : { backgroundColor: 'var(--text)', color: 'var(--bg)' }}
                        >
                          {p.isAI ? <Bot size={20} className="opacity-80" /> : <User size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[14px] font-bold text-[var(--text)] truncate">{p.name}</p>
                            {!p.isAI && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--ac)] text-[var(--at)]">Admin</span>}
                          </div>
                          <p className="text-[12px] text-[var(--text)]/40 mt-0.5 truncate font-medium">{p.isAI ? p.model : 'Pembuat Grup'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tombol Keluar Grup (Sesuai Screenshot) */}
                <button className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-[16px] transition-colors font-bold text-[14px]">
                  <LogOut size={18} strokeWidth={2.5} />
                  Keluar dari grup
                </button>
                <div className="pb-4" /> {/* Spacer */}
              </div>
            </motion.div>
          )}

          {/* ================= VIEW: GALLERY ================= */}
          {view === 'gallery' && (
            <motion.div 
              key="view-gallery"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              className="flex flex-col h-full bg-[var(--bg)]"
            >
              <div className="px-4 pt-5 pb-4 flex items-center gap-3 border-b border-[var(--bd)]/15 shrink-0">
                <button onClick={() => setView('main')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors">
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <h3 className="text-[16px] font-bold text-[var(--text)]">Media Grup</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 grid grid-cols-3 gap-1.5 content-start">
                {allMedia.map((m, i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-[var(--sf)] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" 
                    onClick={() => { setSelectedMedia(m); setView('detail'); }}
                  >
                    <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
                {allMedia.length === 0 && (
                  <div className="col-span-3 text-center py-20 text-[var(--text)]/40 text-[13px] font-medium">
                    Belum ada media di grup ini.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ================= VIEW: MEDIA DETAIL ================= */}
          {view === 'detail' && (
            <motion.div 
              key="view-detail"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
              className="flex flex-col h-full bg-black relative"
            >
              {/* Overlay Navigasi Atas */}
              <div className="px-4 pt-5 pb-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
                <button onClick={() => setView('gallery')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <button onClick={handleDownload} title="Download Media" className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                  <Download size={20} strokeWidth={2.5} />
                </button>
              </div>
              
              {/* Gambar Full */}
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img src={selectedMedia!} alt="Media Detail" className="w-full h-full object-contain" />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
