import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Share2, UserPlus, Image as ImageIcon, LogOut, User, Bot, ChevronRight, Download, Camera, Trash2, X, Check, Edit2 } from 'lucide-react';
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
  const [view, setView] = useState<'main' | 'gallery' | 'detail'>('main');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user');

  // --- STATE AVATAR & MODALS ---
  const [groupAvatar, setGroupAvatar] = useState<string | null>(localStorage.getItem(`cylen_group_avatar_${activeGroup.id}`));
  const [showFullAvatar, setShowFullAvatar] = useState(false); // Modal lihat foto full
  const [showMenu, setShowMenu] = useState(false); // Modal menu bawah
  const [previewImg, setPreviewImg] = useState<string | null>(null); // Modal crop
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef(null); // Buat batesan drag foto

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImg(event.target?.result as string);
        setShowMenu(false);
        setShowFullAvatar(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = () => {
    if (previewImg) {
      setGroupAvatar(previewImg);
      localStorage.setItem(`cylen_group_avatar_${activeGroup.id}`, previewImg);
      window.dispatchEvent(new Event('group-avatar-changed'));
      setPreviewImg(null);
      showToast('Foto profil custom berhasil disimpan!');
    }
  };

  const handleDeleteAvatar = () => {
    setGroupAvatar(null);
    localStorage.removeItem(`cylen_group_avatar_${activeGroup.id}`);
    window.dispatchEvent(new Event('group-avatar-changed'));
    setShowMenu(false);
    setShowFullAvatar(false);
    showToast('Foto profil dihapus');
  };

  const users = activeGroup.participants.filter(p => !p.isAI);
  const ais = activeGroup.participants.filter(p => p.isAI);

  const allMedia = (activeGroup.messages || []).reduce((acc: string[], msg: any) => {
    if (msg.images && Array.isArray(msg.images)) acc.push(...msg.images);
    if (msg.image && typeof msg.image === 'string') acc.push(msg.image);
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
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden relative z-50">
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <AnimatePresence mode="wait">
        
        {/* ================= VIEW: MAIN PROFILE ================= */}
        {view === 'main' && (
          <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="px-4 py-3 flex items-center justify-between bg-[var(--bg)] sticky top-0 z-20">
              <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
            </div>

            {/* ─── HERO SECTION ─── */}
            <div className="flex flex-col items-center pt-2 pb-8 border-b border-[var(--bd)]/10">
              
              <div className="relative mb-5">
                {/* KLIK FOTO = LIHAT FULLSCREEN */}
                <div 
                  onClick={() => setShowFullAvatar(true)}
                  className="w-32 h-32 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-5xl font-bold shadow-lg overflow-hidden border-4 border-[var(--bg)] cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {groupAvatar ? (
                    <img src={groupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
                  ) : (
                    activeGroup.title[0]
                  )}
                </div>
                {/* KLIK IKON KAMERA = MENU GANTI FOTO */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
                  className="absolute bottom-1 right-1 w-10 h-10 bg-[var(--text)] text-[var(--bg)] border-[3px] border-[var(--bg)] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
                >
                  <Camera size={18} strokeWidth={2.5} />
                </button>
              </div>

              <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">{activeGroup.title}</h1>
              <p className="text-[14px] text-[var(--text)]/50 mt-1 font-medium">Grup · {activeGroup.participants.length} anggota</p>
              
              <div className="flex items-center gap-6 mt-7">
                <button onClick={onBack} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm"><MessageSquare size={20} /></div>
                  <span className="text-[12px] font-medium text-[var(--text)]/70">Pesan</span>
                </button>
                <button onClick={() => showToast('Link grup disalin!')} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm"><Share2 size={20} /></div>
                  <span className="text-[12px] font-medium text-[var(--text)]/70">Bagikan</span>
                </button>
                <button onClick={() => showToast('Gunakan ikon + di chat untuk tambah anggota')} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm"><UserPlus size={20} /></div>
                  <span className="text-[12px] font-medium text-[var(--text)]/70">Tambah</span>
                </button>
              </div>
            </div>

            {/* ─── MEDIA SECTION ─── */}
            <div className="py-4 border-b border-[var(--bd)]/10">
              <div className="flex items-center justify-between px-5 mb-3 cursor-pointer group" onClick={() => setView('gallery')}>
                <h3 className="text-[14px] font-semibold text-[var(--text)]/70 group-hover:text-[var(--text)] transition-colors">Media, tautan, dan dok</h3>
                <div className="flex items-center gap-1 text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors">
                  <span className="text-[13px] font-medium">{allMedia.length}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
              <div className="flex gap-2.5 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {allMedia.length > 0 ? (
                  allMedia.slice(0, 4).map((m, i) => (
                    <div key={i} className="w-20 h-20 rounded-xl bg-[var(--sf)] border border-[var(--bd)]/10 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setSelectedMedia(m); setView('detail'); }}>
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

            {/* ─── DAFTAR ANGGOTA ─── */}
            <div className="pt-5 flex flex-col pb-8">
              <h3 className="px-5 text-[14px] font-semibold text-[var(--text)]/70 mb-3">Daftar Anggota</h3>
              <div className="mx-5 mb-4 p-1 bg-[var(--sf)] rounded-xl flex gap-1 border border-[var(--bd)]/10">
                <button onClick={() => setActiveTab('user')} className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'user' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}>Manusia ({users.length})</button>
                <button onClick={() => setActiveTab('ai')} className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'ai' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}>AI Bot ({ais.length})</button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'user' ? (
                  <motion.div key="user" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="flex flex-col">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] shrink-0"><User size={22} /></div>
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
                  <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="flex flex-col">
                    {ais.length === 0 ? <div className="py-8 text-center text-[13px] font-medium text-[var(--text)]/40">Belum ada AI di grup ini.</div> : ais.map(ai => {
                      const aiData = AI_CONFIG.find(a => a.name === ai.name);
                      return (
                        <div key={ai.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: aiData?.bgColor || 'var(--sf)', color: aiData?.iconColor || 'var(--text)' }}>
                            {aiData ? <aiData.Logo size={24} /> : <Bot size={24} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[15px] font-bold text-[var(--text)] truncate">{ai.name}</h4>
                            <p className="text-[13px] text-[var(--text)]/50 mt-0.5 truncate font-medium">{ai.model}</p>
                          </div>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 px-5">
                <button onClick={() => showToast('Anda tidak bisa keluar dari grup buatan sendiri.')} className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-colors active:scale-[0.98] justify-center">
                  <LogOut size={20} strokeWidth={2.5} /> Keluar dari grup
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= VIEW: GALLERY ================= */}
        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col bg-[var(--bg)] absolute inset-0 z-30">
            <div className="px-4 py-3 flex items-center gap-4 border-b border-[var(--bd)]/10 shrink-0 bg-[var(--bg)] sticky top-0 z-10">
              <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <h3 className="text-[18px] font-bold text-[var(--text)]">Media Grup</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-1 grid grid-cols-3 gap-1 content-start">
              {allMedia.map((m, i) => (
                <div key={i} className="aspect-square bg-[var(--sf)] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setSelectedMedia(m); setView('detail'); }}>
                  <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {allMedia.length === 0 && <div className="col-span-3 text-center py-20 text-[var(--text)]/40 text-[14px] font-medium">Belum ada media di grup ini.</div>}
            </div>
          </motion.div>
        )}

        {/* ================= VIEW: DETAIL FOTO ================= */}
        {view === 'detail' && (
          <motion.div key="detail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col bg-black absolute inset-0 z-40">
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setView('gallery')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <button onClick={handleDownload} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><Download size={24} strokeWidth={2.5} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {selectedMedia && <img src={selectedMedia} alt="Detail" className="w-full h-full object-contain" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL LIHAT PROFIL FULL ================= */}
      <AnimatePresence>
        {showFullAvatar && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setShowFullAvatar(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <button onClick={() => { setShowFullAvatar(false); setShowMenu(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <Edit2 size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {groupAvatar ? (
                <img src={groupAvatar} alt="Group Avatar Full" className="w-full h-auto max-h-full object-contain" />
              ) : (
                <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[#222] rounded-full flex items-center justify-center text-white text-8xl font-bold">
                  {activeGroup.title[0]}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL MENU UBAH PROFIL ================= */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMenu(false)} className="fixed inset-0 bg-black/60 z-[200]" />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} 
              transition={{ duration: 0.15, ease: "easeOut" }} 
              className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[24px] z-[201] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-[var(--bd)]/10"
            >
              <div className="w-12 h-1.5 bg-[var(--bd)]/20 rounded-full mx-auto mb-6" />
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-4 px-2">Foto Profil Grup</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-4 px-4 py-3.5 bg-[var(--sf)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-[var(--text)] rounded-2xl transition-colors font-bold text-[15px]">
                  <ImageIcon size={20} /> Ambil dari Galeri
                </button>
                {groupAvatar && (
                  <button onClick={handleDeleteAvatar} className="w-full flex items-center gap-4 px-4 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-colors font-bold text-[15px]">
                    <Trash2 size={20} /> Hapus Foto Grup
                  </button>
                )}
                <button onClick={() => setShowMenu(false)} className="w-full mt-2 py-3.5 text-[var(--text)]/60 font-bold hover:bg-[var(--sf)] rounded-2xl transition-colors text-[15px]">Batal</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= MODAL PREVIEW & POTONG RASIO (BISA DRAG) ================= */}
      <AnimatePresence>
        {previewImg && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="fixed inset-0 bg-black z-[300] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between text-white border-b border-white/10 shrink-0">
              <button onClick={() => setPreviewImg(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={20} strokeWidth={2.5} /></button>
              <h3 className="text-[16px] font-bold">Edit Rasio</h3>
              <button onClick={handleSaveAvatar} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"><Check size={20} strokeWidth={3} /></button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
              <p className="text-white/50 text-[13px] mb-8 text-center font-medium">Geser gambar untuk menyesuaikan profil.</p>
              
              {/* AREA CROP YANG LEGA & DRAGGABLE */}
              <div className="relative w-[85vw] max-w-[340px] aspect-square rounded-full border-2 border-white/60 border-dashed overflow-hidden flex items-center justify-center shadow-2xl">
                <motion.div ref={constraintsRef} className="absolute inset-[-150%] flex items-center justify-center pointer-events-none">
                  {/* Fotonya dimasukin ke wrapper drag constraint */}
                </motion.div>
                <motion.img 
                  drag 
                  dragConstraints={constraintsRef}
                  src={previewImg} 
                  alt="Preview" 
                  className="min-w-full min-h-full object-cover cursor-move active:cursor-grabbing hover:opacity-90 transition-opacity" 
                />
              </div>
            </div>
            
            <div className="p-6 shrink-0">
              <button onClick={handleSaveAvatar} className="w-full py-4 bg-white text-black font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-transform">
                Simpan Profil Custom
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
