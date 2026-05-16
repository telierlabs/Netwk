import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, Share2, UserPlus, Image as ImageIcon, LogOut, User, Bot, ChevronRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession } from '../types';
import { cn } from '../lib/utils';
import { AI_CONFIG } from '../components/group/AddAIModal';

interface GroupProfilePageProps {
  activeGroup: GroupSession;
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const GroupProfilePage: React.FC<GroupProfilePageProps> = ({
  activeGroup, onBack, showToast
}) => {
  // Navigation State
  const [view, setView] = useState<'main' | 'gallery' | 'detail'>('main');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user');

  const users = activeGroup.participants.filter(p => !p.isAI);
  const ais = activeGroup.participants.filter(p => p.isAI);

  // Ekstrak semua media (gambar) asli dari pesan grup
  const allMedia = (activeGroup.messages || []).reduce((acc: string[], msg: any) => {
    if (msg.images && Array.isArray(msg.images)) {
      acc.push(...msg.images);
    }
    return acc;
  }, []);

  const handleDownload = () => {
    if (!selectedMedia) return;
    const link = document.createElement('a');
    link.href = selectedMedia;
    link.download = `Cylen_Media_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Gambar berhasil diunduh');
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {/* ================= VIEW: MAIN PROFILE ================= */}
        {view === 'main' && (
          <motion.div 
            key="main"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col h-full"
          >
            {/* ─── HEADER ─── */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--bd)]/10 bg-[var(--bg)] sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95">
                  <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-8" style={{ scrollbarWidth: 'none' }}>
              
              {/* ─── HERO SECTION ─── */}
              <div className="flex flex-col items-center pt-6 pb-8 border-b border-[var(--bd)]/10">
                <div className="w-32 h-32 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-5xl font-bold shadow-lg mb-5">
                  {activeGroup.title[0]}
                </div>
                <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">{activeGroup.title}</h1>
                <p className="text-[14px] text-[var(--text)]/50 mt-1 font-medium">Grup · {activeGroup.participants.length} anggota</p>
                
                {/* ACTION BUTTONS */}
                <div className="flex items-center gap-6 mt-7">
                  <button onClick={onBack} className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text)]/70">Pesan</span>
                  </button>
                  <button onClick={() => showToast('Link grup disalin!')} className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
                      <Share2 size={20} />
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text)]/70">Bagikan</span>
                  </button>
                  <button onClick={() => showToast('Gunakan ikon + di chat untuk tambah anggota')} className="flex flex-col items-center gap-2 group">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
                      <UserPlus size={20} />
                    </div>
                    <span className="text-[12px] font-medium text-[var(--text)]/70">Tambah</span>
                  </button>
                </div>
              </div>

              {/* ─── MEDIA SECTION (Asli) ─── */}
              <div className="py-4 border-b border-[var(--bd)]/10">
                <div 
                  className="flex items-center justify-between px-5 mb-3 cursor-pointer group"
                  onClick={() => setView('gallery')}
                >
                  <h3 className="text-[14px] font-semibold text-[var(--text)]/70 group-hover:text-[var(--text)] transition-colors">Media, tautan, dan dok</h3>
                  <div className="flex items-center gap-1 text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors">
                    <span className="text-[13px] font-medium">{allMedia.length}</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
                <div className="flex gap-2.5 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {allMedia.length > 0 ? (
                    allMedia.slice(0, 4).map((m, i) => (
                      <div 
                        key={i} 
                        className="w-20 h-20 rounded-xl bg-[var(--sf)] border border-[var(--bd)]/10 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setSelectedMedia(m); setView('detail'); }}
                      >
                        <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="w-full py-6 flex flex-col items-center justify-center text-[var(--text)]/30 bg-[var(--sf)]/30 border border-[var(--bd)]/10 rounded-[16px]">
                      <ImageIcon size={28} className="mb-2 opacity-50" />
                      <span className="text-[12px] font-medium">Belum ada media</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── PARTICIPANTS TABS ─── */}
              <div className="pt-5 flex flex-col">
                <h3 className="px-5 text-[14px] font-semibold text-[var(--text)]/70 mb-3">Daftar Anggota</h3>
                
                <div className="mx-5 mb-4 p-1 bg-[var(--sf)] rounded-xl flex gap-1 border border-[var(--bd)]/10">
                  <button 
                    onClick={() => setActiveTab('user')}
                    className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'user' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}
                  >
                    Manusia ({users.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'ai' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}
                  >
                    AI Bot ({ais.length})
                  </button>
                </div>

                <div className="flex flex-col">
                  <AnimatePresence mode="wait">
                    {activeTab === 'user' ? (
                      <motion.div key="user" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="flex flex-col">
                        {users.map(u => (
                          <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                            <div className="w-12 h-12 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] shrink-0">
                              <User size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[15px] font-bold text-[var(--text)] truncate">{u.name}</p>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--ac)] text-[var(--at)]">Admin</span>
                              </div>
                              <p className="text-[13px] text-[var(--text)]/50 mt-0.5 truncate">Pembuat Grup</p>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="flex flex-col">
                        {ais.length === 0 ? (
                          <div className="py-8 text-center text-[13px] font-medium text-[var(--text)]/40">Belum ada AI di grup ini.</div>
                        ) : (
                          ais.map(ai => {
                            const aiData = AI_CONFIG.find(a => a.name === ai.name);
                            return (
                              <div key={ai.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                                <div 
                                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                                  style={{ backgroundColor: aiData?.bgColor || 'var(--sf)', color: aiData?.iconColor || 'var(--text)' }}
                                >
                                  {aiData ? <aiData.Logo size={24} /> : <Bot size={24} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[15px] font-bold text-[var(--text)] truncate">{ai.name}</h4>
                                  <p className="text-[13px] text-[var(--text)]/50 mt-0.5 truncate font-medium">{ai.model}</p>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ─── KELUAR GRUP ─── */}
              <div className="mt-4 px-5">
                <button 
                  onClick={() => showToast('Anda tidak bisa keluar dari grup buatan sendiri.')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-colors active:scale-[0.98] justify-center"
                >
                  <LogOut size={20} strokeWidth={2.5} />
                  Keluar dari grup
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= VIEW: GALLERY GRID ================= */}
        {view === 'gallery' && (
          <motion.div 
            key="gallery"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col bg-[var(--bg)] absolute inset-0 z-30"
          >
            <div className="px-4 py-3 flex items-center gap-4 border-b border-[var(--bd)]/10 shrink-0 bg-[var(--bg)] sticky top-0 z-10">
              <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <h3 className="text-[18px] font-bold text-[var(--text)]">Media Grup</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-1 grid grid-cols-3 gap-1 content-start">
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
                <div className="col-span-3 text-center py-20 text-[var(--text)]/40 text-[14px] font-medium">
                  Belum ada media di grup ini.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ================= VIEW: DETAIL FOTO (Fullscreen) ================= */}
        {view === 'detail' && (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col bg-black absolute inset-0 z-40"
          >
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setView('gallery')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <button onClick={handleDownload} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <Download size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {selectedMedia && <img src={selectedMedia} alt="Detail" className="w-full h-full object-contain" />}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
