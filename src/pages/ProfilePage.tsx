import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, ChevronRight, Shield, Zap, Download, LogOut, Wand2, Network, BarChart3, BrainCircuit,
  Camera, Trash2, Image as ImageIcon, X, Check, Edit2, ArrowLeft, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { subscribeToAuthChanges, signInWithGoogle, logout } from '../services/authService';
import { User } from 'firebase/auth';

interface ProfilePageProps {
  showToast: (msg: string) => void;
  onViewAppearance?: () => void;
  onViewHaptics?: () => void; // PROPS BARU
  onViewReport?: () => void; // PROPS BARU
  onViewAiSettings?: () => void;
  onViewUsage?: () => void;
  onViewIntegrations?: () => void;
  onViewSecurity?: () => void;
  onViewExport?: () => void;
  onUpgradeClick?: () => void;
  onViewMemory?: () => void;
  theme?: string;
  setTheme?: any;
  font?: string;
  setFont?: any;
}

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

// SVG KHUSUS ALA GROK
const IconHaptics = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="3" />
    <path d="M2 10h1" /><path d="M2 14h1" /><path d="M21 10h1" /><path d="M21 14h1" />
  </svg>
);

const IconReport = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
);

export const ProfilePage: React.FC<ProfilePageProps> = ({
  showToast, onViewAppearance, onViewHaptics, onViewReport, onViewAiSettings, 
  onViewUsage, onViewIntegrations, onViewSecurity, onViewExport, onUpgradeClick, onViewMemory
}) => {
  const [user, setUser] = useState<User | null>(null);

  const [customAvatar, setCustomAvatar] = useState<string | null>(localStorage.getItem('cylen_avatar'));
  const [customName, setCustomName] = useState<string>(localStorage.getItem('cylen_user_name') || '');
  
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const [showLangPopup, setShowLangPopup] = useState(false);
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('cylen_lang') || 'id');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { try { await signInWithGoogle(); showToast('Berhasil masuk'); } catch { showToast('Gagal masuk'); } };
  const handleLogout = async () => { try { await logout(); showToast('Berhasil keluar'); } catch { showToast('Gagal keluar'); } };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => { setPreviewImg(event.target?.result as string); setShowAvatarMenu(false); setShowFullAvatar(false); };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = () => {
    if (previewImg) {
      setCustomAvatar(previewImg); localStorage.setItem('cylen_avatar', previewImg);
      window.dispatchEvent(new Event('avatar-changed')); setPreviewImg(null); showToast('Foto profil diperbarui');
    }
  };

  const handleDeleteAvatar = () => {
    setCustomAvatar(null); localStorage.removeItem('cylen_avatar');
    window.dispatchEvent(new Event('avatar-changed')); setShowAvatarMenu(false); setShowFullAvatar(false); showToast('Foto profil dihapus');
  };

  const handleEditNameClick = () => { setEditNameInput(customName || user?.displayName || 'Kamu'); setShowEditName(true); };

  const handleSaveName = () => {
    if (!editNameInput.trim()) return showToast('Nama tidak boleh kosong');
    setCustomName(editNameInput.trim()); localStorage.setItem('cylen_user_name', editNameInput.trim());
    window.dispatchEvent(new Event('user-profile-changed')); setShowEditName(false); showToast('Nama diperbarui');
  };

  const handleSaveLanguage = (code: string, name: string) => {
    setCurrentLang(code); localStorage.setItem('cylen_lang', code);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang: code } }));
    setShowLangPopup(false); showToast(`Bahasa diubah ke ${name}`);
  };

  const displayName = customName || user?.displayName || 'Telier Labs';
  const displayAvatar = customAvatar || user?.photoURL;
  const activeLangData = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  const SectionTitle = ({ title }: { title: string }) => (<div className="text-[13px] font-bold text-[var(--mu)] mb-2 mt-8 px-6 uppercase tracking-widest opacity-70">{title}</div>);
  const CardGroup = ({ children }: { children: React.ReactNode }) => (<div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden border border-[var(--bd)]/50">{children}</div>);
  const CardItem = ({ icon, title, onClick, right, border = true, className }: any) => (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-all active:scale-[0.99] text-left", border && "border-b border-[var(--bd)]", className)}>
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
      <div className="flex-1 flex flex-col min-w-0"><span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span></div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  const popupAnimation = { initial: { opacity: 0, y: "100%" }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: "100%" }, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } };

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-50" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="max-w-2xl mx-auto pb-6">

        {/* --- PROFILE HEADER --- */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2 border border-[var(--bd)]/50">
          <div className="relative group shrink-0">
            <div onClick={() => setShowFullAvatar(true)} className="cursor-pointer w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)] flex items-center justify-center text-2xl font-bold overflow-hidden shadow-sm hover:opacity-80 transition-opacity">
              {displayAvatar ? <img src={displayAvatar} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center">{displayName[0]?.toUpperCase()}</div>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowAvatarMenu(true); }} className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center shadow-md border-[2.5px] border-[var(--sf)] active:scale-95 transition-transform"><Camera size={13} strokeWidth={2.5} /></button>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1 flex items-center gap-2 cursor-pointer group w-fit" onClick={handleEditNameClick}>
               <span className="truncate">{displayName}</span><Edit2 size={14} className="text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors" />
             </div>
             <div className="text-[14px] text-[var(--mu)] truncate mt-0.5">{user?.email || 'telierlabsx@gmail.com'}</div>
             {!user && <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold hover:bg-blue-700 transition-colors">Masuk dengan Google</button>}
          </div>
        </div>

        <div className="bg-[var(--sf)] rounded-[24px] p-5 flex items-center justify-between mx-4 mt-3 border border-blue-500/20 bg-gradient-to-br from-transparent to-blue-500/5">
          <div className="flex items-center gap-4"><Zap size={22} className="text-blue-500" />
            <div className="flex flex-col"><span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Cylen Premium</span><span className="text-[13px] text-[var(--mu)] mt-0.5">Akses Intelijen Tanpa Batas</span></div>
          </div>
          <button onClick={onUpgradeClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-all active:scale-95 shadow-lg shadow-blue-500/20">Upgrade</button>
        </div>

        <SectionTitle title="General" />
        <CardGroup>
          <CardItem icon={<Palette size={20} />} title="Appearance" onClick={onViewAppearance} />
          <CardItem icon={<IconHaptics />} title="Haptics" onClick={onViewHaptics} />
          <CardItem icon={<Globe size={20} />} title="Bahasa / Language" onClick={() => setShowLangPopup(true)} right={<div className="flex items-center gap-2 text-[14px] text-[var(--mu)] font-medium"><span>{activeLangData.flag} {activeLangData.code.toUpperCase()}</span><ChevronRight size={18} className="opacity-40" /></div>} />
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
          <CardItem icon={<IconReport />} title="Report a Problem" onClick={onViewReport} />
          <CardItem icon={<LogOut size={20} />} title="Sign out" onClick={handleLogout} border={false} right={<div />} />
        </CardGroup>

        {/* --- FOOTER CYLEN V1 --- */}
        <div className="flex flex-col items-center justify-center mt-10 mb-4 opacity-50 select-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text)] mb-2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span className="text-[12px] font-bold text-[var(--text)] tracking-[0.1em] uppercase">Cylen v1</span>
        </div>
      </div>

      {/* MODAL BAHASA & AVATAR ... (Sama kayak sebelumnya, sengaja disingkat ngerender biar ga numpuk, paste ulang full modallu disini kalau ilang) */}
      <AnimatePresence>
        {showLangPopup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setShowLangPopup(false)} className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm" />
            <motion.div {...popupAnimation} className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[32px] z-[201] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-[var(--bd)]/10 max-w-2xl mx-auto">
              <div className="w-12 h-1.5 bg-[var(--bd)]/30 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-3 mb-6 px-2"><div className="w-10 h-10 rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)] border border-[var(--bd)]/20"><Globe size={20} /></div><h3 className="text-[20px] font-bold text-[var(--text)] tracking-tight">Pilih Bahasa</h3></div>
              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                {LANGUAGES.map((l) => (
                  <button key={l.code} onClick={() => handleSaveLanguage(l.code, l.name)} className={cn("w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all active:scale-[0.98]", currentLang === l.code ? "bg-[var(--text)] text-[var(--bg)] shadow-md" : "bg-[var(--sf)] text-[var(--text)] hover:bg-[var(--bd)]/50 border border-[var(--bd)]/20")}>
                    <div className="flex items-center gap-4"><span className="text-[22px]">{l.flag}</span><span className="font-bold text-[16px]">{l.name}</span></div>
                    {currentLang === l.code && <Check size={20} strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowLangPopup(false)} className="w-full mt-2 py-4 text-[var(--text)]/60 font-bold hover:bg-[var(--sf)] rounded-2xl transition-colors text-[16px]">Batal</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
};
