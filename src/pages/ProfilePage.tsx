import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  ChevronRight, 
  Shield, 
  Zap, 
  Download, 
  LogOut, 
  Wand2, 
  Network, 
  BarChart3, 
  BrainCircuit,
  Camera,
  Trash2,
  Image as ImageIcon,
  X,
  Check
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
  showToast, 
  onViewAppearance, 
  onViewAiSettings, 
  onViewUsage, 
  onViewIntegrations, 
  onViewSecurity, 
  onViewExport, 
  onUpgradeClick, 
  onViewMemory
}) => {
  const [user, setUser] = useState<User | null>(null);

  // State untuk Custom Avatar
  const [customAvatar, setCustomAvatar] = useState<string | null>(localStorage.getItem('cylen_avatar'));
  const [showMenu, setShowMenu] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { 
    try { 
      await signInWithGoogle(); 
      showToast('Berhasil masuk'); 
    } catch { 
      showToast('Gagal masuk'); 
    } 
  };

  const handleLogout = async () => { 
    try { 
      await logout(); 
      showToast('Berhasil keluar'); 
    } catch { 
      showToast('Gagal keluar'); 
    } 
  };

  // --- LOGIKA CUSTOM AVATAR ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImg(event.target?.result as string);
        setShowMenu(false);
      };
      reader.readAsDataURL(file);
    }
    // Reset input agar bisa pilih file yang sama lagi
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = () => {
    if (previewImg) {
      setCustomAvatar(previewImg);
      localStorage.setItem('cylen_avatar', previewImg);
      window.dispatchEvent(new Event('avatar-changed')); // Sync ke Sidebar
      setPreviewImg(null);
      showToast('Foto profil berhasil diperbarui');
    }
  };

  const handleDeleteAvatar = () => {
    setCustomAvatar(null);
    localStorage.removeItem('cylen_avatar');
    window.dispatchEvent(new Event('avatar-changed'));
    setShowMenu(false);
    showToast('Foto profil dikembalikan ke default');
  };

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
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-all active:scale-[0.99] text-left", 
        border && "border-b border-[var(--bd)]",
        className
      )}
    >
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span>
      </div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      
      {/* Input File Tersembunyi */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="max-w-2xl mx-auto pb-10">

        {/* Profile Header */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2 border border-[var(--bd)]/50">
          
          {/* FOTO PROFIL BISA DIKLIK */}
          <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setShowMenu(true)}>
            {customAvatar ? (
              <img src={customAvatar} alt="Profile" className="w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)]" />
            ) : user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)]" />
            ) : (
              <div className="w-[60px] h-[60px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center text-2xl font-bold">
                {user?.displayName?.[0] || 'T'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-[26px] h-[26px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center shadow-md border-2 border-[var(--sf)] transition-transform group-hover:scale-110">
              <Camera size={13} strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1 truncate">
               {user?.displayName || 'Telier Labs'}
             </div>
             <div className="text-[14px] text-[var(--mu)] truncate">
               {user?.email || 'telierlabsx@gmail.com'}
             </div>
             {!user && (
               <button 
                 onClick={handleLogin} 
                 className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold hover:bg-blue-700 transition-colors"
               >
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
          <button 
            onClick={onUpgradeClick} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-all active:scale-95 shadow-lg shadow-blue-500/20"
          >
            Upgrade
          </button>
        </div>

        {/* General Section */}
        <SectionTitle title="General" />
        <CardGroup>
          <CardItem icon={<Palette size={20} />} title="Appearance" onClick={onViewAppearance} />
          <CardItem icon={<BarChart3 size={20} />} title="Usage & Analytics" onClick={onViewUsage} border={false} />
        </CardGroup>

        {/* Ecosystem Section */}
        <SectionTitle title="Ecosystem" />
        <CardGroup>
          <CardItem icon={<BrainCircuit size={20} />} title="Cylen Memory" onClick={onViewMemory} />
          <CardItem icon={<Wand2 size={20} />} title="Customize Cylen" onClick={onViewAiSettings} />
          <CardItem icon={<Network size={20} />} title="Personal Intelligence" onClick={onViewIntegrations} border={false} />
        </CardGroup>

        {/* Data & Privacy Section */}
        <SectionTitle title="Data & Privacy" />
        <CardGroup>
          <CardItem icon={<Shield size={20} />} title="Security" onClick={onViewSecurity} />
          <CardItem icon={<Download size={20} />} title="Export Data" onClick={onViewExport} border={false} />
        </CardGroup>

        {/* Account Section */}
        <SectionTitle title="Account" />
        <CardGroup>
          <CardItem 
            icon={<LogOut size={20} className="text-red-500" />} 
            title={<span className="text-red-500">Sign out</span>} 
            onClick={handleLogout} 
            border={false} 
            right={<div />} 
          />
        </CardGroup>

        {/* Footer info & Versioning */}
        <div className="flex flex-col items-center justify-center gap-3 mt-12 mb-12 text-[var(--mu)]">
          <div className="flex items-center gap-2 opacity-50">
            <div className="p-1.5 bg-[var(--sf)] rounded-lg border border-[var(--bd)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">v1.1.58-release.00</span>
          </div>
          
          <div className="text-[12px] font-medium flex items-center gap-1.5">
            <span className="opacity-60">New Version Available:</span> 
            <button 
              onClick={() => showToast('Memperbarui Cylen...')} 
              className="text-blue-500 font-bold hover:underline underline-offset-4 decoration-2"
            >
              Update Now
            </button>
          </div>
          
          <div className="text-[11px] opacity-30 font-bold tracking-widest uppercase mt-2">
            CYLEN BY VYNIX
          </div>
        </div>
      </div>

      {/* ================= MODAL PILIHAN MENU PROFIL ================= */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/60 z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[24px] z-[201] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            >
              <div className="w-12 h-1.5 bg-[var(--bd)]/20 rounded-full mx-auto mb-6" />
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-4 px-2">Foto Profil</h3>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-4 px-4 py-3.5 bg-[var(--sf)] hover:bg-[#000] hover:text-[#fff] text-[var(--text)] rounded-2xl transition-colors font-bold text-[15px]"
                >
                  <ImageIcon size={20} /> Ambil dari Galeri
                </button>
                
                {customAvatar && (
                  <button 
                    onClick={handleDeleteAvatar}
                    className="w-full flex items-center gap-4 px-4 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-colors font-bold text-[15px]"
                  >
                    <Trash2 size={20} /> Hapus Foto Kustom
                  </button>
                )}
                
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full mt-2 py-3.5 text-[var(--text)]/60 font-bold hover:bg-[var(--sf)] rounded-2xl transition-colors text-[15px]"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= MODAL PREVIEW (EDIT RASIO) ================= */}
      <AnimatePresence>
        {previewImg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black z-[300] flex flex-col"
          >
            {/* Header Preview */}
            <div className="px-5 py-4 flex items-center justify-between text-white border-b border-white/10 shrink-0">
              <button onClick={() => setPreviewImg(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
              <h3 className="text-[16px] font-bold">Edit Profil</h3>
              <button onClick={handleSaveAvatar} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors">
                <Check size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Container Preview */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <p className="text-white/50 text-[13px] mb-8 text-center font-medium">Gambar akan dipotong menyesuaikan lingkaran profil.</p>
              
              <div className="relative w-full max-w-[300px] aspect-square rounded-full border-2 border-white border-dashed overflow-hidden shadow-2xl flex items-center justify-center">
                <img src={previewImg} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
              </div>
            </div>
            
            {/* Footer / Simpan */}
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
