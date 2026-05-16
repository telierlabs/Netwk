import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, ChevronRight, Shield, Zap, Download, LogOut, Wand2, Network, BarChart3, BrainCircuit,
  Camera, Trash2, Image as ImageIcon, X, Check, Edit2, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { subscribeToAuthChanges, signInWithGoogle, logout } from '../services/authService';
import { User } from 'firebase/auth';

interface ProfilePageProps {
  showToast: (msg: string) => void;
  onViewAppearance?: () => void;
  onViewAiSettings?: () => void;
  onViewUsage?: () => void;
  onViewIntegrations?: () => void;
  onViewSecurity?: () => void;
  onViewExport?: () => void;
  onUpgradeClick?: () => void;
  onViewMemory?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  showToast, onViewAppearance, onViewAiSettings, onViewUsage, onViewIntegrations, 
  onViewSecurity, onViewExport, onUpgradeClick, onViewMemory
}) => {
  const [user, setUser] = useState<User | null>(null);

  // --- STATE CUSTOM USER PROFILE ---
  const [customAvatar, setCustomAvatar] = useState<string | null>(localStorage.getItem('cylen_avatar'));
  const [customName, setCustomName] = useState<string>(localStorage.getItem('cylen_user_name') || '');
  
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false); // Modal lihat foto full
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { 
    try { await signInWithGoogle(); showToast('Berhasil masuk'); } catch { showToast('Gagal masuk'); } 
  };

  const handleLogout = async () => { 
    try { await logout(); showToast('Berhasil keluar'); } catch { showToast('Gagal keluar'); } 
  };

  // --- LOGIKA GANTI AVATAR ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImg(event.target?.result as string);
        setShowAvatarMenu(false);
        setShowFullAvatar(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = () => {
    if (previewImg) {
      setCustomAvatar(previewImg);
      localStorage.setItem('cylen_avatar', previewImg);
      window.dispatchEvent(new Event('avatar-changed')); // Sync ke tempat lain
      setPreviewImg(null);
      showToast('Foto profil berhasil diperbarui');
    }
  };

  const handleDeleteAvatar = () => {
    setCustomAvatar(null);
    localStorage.removeItem('cylen_avatar');
    window.dispatchEvent(new Event('avatar-changed'));
    setShowAvatarMenu(false);
    setShowFullAvatar(false);
    showToast('Foto profil dihapus');
  };

  // --- LOGIKA GANTI NAMA ---
  const handleEditNameClick = () => {
    setEditNameInput(customName || user?.displayName || 'Kamu');
    setShowEditName(true);
  };

  const handleSaveName = () => {
    if (!editNameInput.trim()) return showToast('Nama tidak boleh kosong');
    setCustomName(editNameInput.trim());
    localStorage.setItem('cylen_user_name', editNameInput.trim());
    window.dispatchEvent(new Event('user-profile-changed')); // Sync nama
    setShowEditName(false);
    showToast('Nama berhasil diperbarui');
  };

  const displayName = customName || user?.displayName || 'Telier Labs';
  const displayAvatar = customAvatar || user?.photoURL;

  // Helper Components
  const SectionTitle = ({ title }: { title: string }) => (
    <div className="text-[13px] font-bold text-[var(--mu)] mb-2 mt-8 px-6 uppercase tracking-widest opacity-70">
      {title}
    </div>
  );

  const CardGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden border border-[var(--bd)]/50">
      {children}
    </div>
  );

  const CardItem = ({ icon, title, onClick, right, border = true, className }: any) => (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-all active:scale-[0.99] text-left", border && "border-b border-[var(--bd)]", className)}>
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span>
      </div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-50" style={{ minHeight: 0 }}>
      
      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="max-w-2xl mx-auto pb-10">

        {/* --- PROFILE HEADER --- */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2 border border-[var(--bd)]/50">
          
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            {/* KLIK FOTO = LIHAT FULLSCREEN */}
            <div 
              onClick={() => setShowFullAvatar(true)}
              className="cursor-pointer w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)] flex items-center justify-center text-2xl font-bold overflow-hidden shadow-sm hover:opacity-80 transition-opacity"
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* KLIK KAMERA = GANTI FOTO */}
            <button 
              onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(true); }}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center shadow-md border-[2.5px] border-[var(--sf)] hover:scale-110 active:scale-95 transition-transform"
            >
              <Camera size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Name & Info Area */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div 
               className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1 flex items-center gap-2 cursor-pointer group w-fit"
               onClick={handleEditNameClick}
             >
               <span className="truncate">{displayName}</span>
               <Edit2 size={14} className="text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors" />
             </div>
             <div className="text-[14px] text-[var(--mu)] truncate mt-0.5">
               {user?.email || 'telierlabsx@gmail.com'}
             </div>
             {!user && (
               <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold hover:bg-blue-700 transition-colors">
                 Masuk dengan Google
               </button>
             )}
          </div>
        </div>

        {/* Premium Banner */}
        <div className="bg-[var(--sf)] rounded-[24px] p-5 flex items-center justify-between mx-4 mt-3 border border-blue-500/20 bg-gradient-to-br from-transparent to-blue-500/5">
          <div className="flex items-center gap-4">
            <Zap size={22} className="text-blue-500" />
            <div className="flex flex-col">
              <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Cylen Premium</span>
              <span className="text-[13px] text-[var(--mu)] mt-0.5">Akses Intelijen Tanpa Batas</span>
            </div>
          </div>
          <button onClick={onUpgradeClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-all active:scale-95 shadow-lg shadow-blue-500/20">
            Upgrade
          </button>
        </div>

        <SectionTitle title="General" />
        <CardGroup>
          <CardItem icon={<Palette size={20} />} title="Appearance" onClick={onViewAppearance} />
          <CardItem icon={<BarChart3 size={20} />} title="Usage & Analytics" onClick={onViewUsage} border={false} />
        </CardGroup>

        <SectionTitle title="Ecosystem" />
        <CardGroup>
          <CardItem icon={<BrainCircuit size={20} />} title="Cylen Memory" onClick={onViewMemory} />
          <CardItem icon={<Wand2 size={20} />} title="Customize Cylen" onClick={onViewAiSettings} />
          <CardItem icon={<Network size={20} />} title="Personal Intelligence" onClick={onViewIntegrations} border={false} />
        </CardGroup>

        <SectionTitle title="Data & Privacy" />
        <CardGroup>
          <CardItem icon={<Shield size={20} />} title="Security" onClick={onViewSecurity} />
          <CardItem icon={<Download size={20} />} title="Export Data" onClick={onViewExport} border={false} />
        </CardGroup>

        <SectionTitle title="Account" />
        <CardGroup>
          <CardItem icon={<LogOut size={20} className="text-red-500" />} title={<span className="text-red-500">Sign out</span>} onClick={handleLogout} border={false} right={<div />} />
        </CardGroup>

      </div>

      {/* ================= MODAL LIHAT PROFIL FULLSCREEN ================= */}
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
              <button onClick={() => { setShowFullAvatar(false); setShowAvatarMenu(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <Edit2 size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {displayAvatar ? (
                <img src={displayAvatar} alt="Profile Full" className="w-full h-auto max-h-full object-contain" />
              ) : (
                <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[#222] rounded-full flex items-center justify-center text-white text-8xl font-bold shadow-2xl">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL EDIT NAMA ================= */}
      <AnimatePresence>
        {showEditName && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-[320px] bg-[var(--bg)] rounded-3xl p-6 shadow-2xl border border-[var(--bd)]/10">
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-4">Edit Nama Profil</h3>
              <input 
                autoFocus
                value={editNameInput}
                onChange={e => setEditNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                className="w-full bg-[var(--sf)] px-4 py-3.5 rounded-2xl outline-none text-[15px] font-bold text-[var(--text)] border border-[var(--bd)]/20 focus:border-[var(--text)]/40 transition-colors"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowEditName(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--text)]/60 hover:bg-[var(--sf)] transition-colors active:scale-95">Batal</button>
                <button onClick={handleSaveName} className="px-6 py-2.5 rounded-xl font-bold bg-[var(--text)] text-[var(--bg)] shadow-md active:scale-95 transition-transform">Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL MENU GANTI FOTO ================= */}
      <AnimatePresence>
        {showAvatarMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAvatarMenu(false)} className="fixed inset-0 bg-black/60 z-[200]" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[24px] z-[201] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-[var(--bd)]/10">
              <div className="w-12 h-1.5 bg-[var(--bd)]/20 rounded-full mx-auto mb-6" />
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-4 px-2">Foto Profil Anda</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-4 px-4 py-3.5 bg-[var(--sf)] hover:bg-[#000] hover:text-[#fff] text-[var(--text)] rounded-2xl transition-colors font-bold text-[15px]">
                  <ImageIcon size={20} /> Ambil dari Galeri
                </button>
                {customAvatar && (
                  <button onClick={handleDeleteAvatar} className="w-full flex items-center gap-4 px-4 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-colors font-bold text-[15px]">
                    <Trash2 size={20} /> Hapus Foto Profil
                  </button>
                )}
                <button onClick={() => setShowAvatarMenu(false)} className="w-full mt-2 py-3.5 text-[var(--text)]/60 font-bold hover:bg-[var(--sf)] rounded-2xl transition-colors text-[15px]">Batal</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= MODAL CROP RASIO (DRAGGABLE) ================= */}
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
              
              <div className="relative w-[85vw] max-w-[340px] aspect-square rounded-full border-2 border-white/60 border-dashed overflow-hidden flex items-center justify-center shadow-2xl">
                <motion.div ref={constraintsRef} className="absolute inset-[-150%] flex items-center justify-center pointer-events-none"></motion.div>
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
                Simpan Profil
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
};
