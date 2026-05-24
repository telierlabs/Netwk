import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, ChevronRight, Shield, Zap, Download, LogOut, Wand2, Network, BarChart3, BrainCircuit,
  Camera, Image as ImageIcon, X, Check, Edit2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { signInWithGoogle, logout } from '../services/authService';
import { auth } from '../lib/firebase';

interface ProfilePageProps {
  showToast: (msg: string) => void;
  onViewAppearance?: () => void;
  onViewHaptics?: () => void;
  onViewReport?: () => void;
  onViewAiSettings?: () => void;
  onViewUsage?: () => void;
  onViewIntegrations?: () => void;
  onViewSecurity?: () => void;
  onViewExport?: () => void;
  onUpgradeClick?: () => void;
  onViewMemory?: () => void;
  onBack?: () => void; // Tambah prop onBack
}

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

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
  onViewUsage, onViewIntegrations, onViewSecurity, onViewExport, onUpgradeClick, onViewMemory, onBack
}) => {
  const { profile, updateProfile } = useProfile();
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [showLangPopup, setShowLangPopup] = useState(false);

  const handleLogin = async () => { try { await signInWithGoogle(); showToast('Berhasil masuk'); } catch { showToast('Gagal masuk'); } };
  const handleLogout = async () => { try { await logout(); showToast('Berhasil keluar'); } catch { showToast('Gagal keluar'); } };

  const handleSaveName = async () => {
    if (!editNameInput.trim()) return showToast('Nama tidak boleh kosong');
    await updateProfile({ name: editNameInput.trim() });
    setShowEditName(false);
    showToast('Nama diperbarui di Cloud');
  };

  const handleSaveLanguage = async (code: string, name: string) => {
    await updateProfile({ lang: code });
    localStorage.setItem('cylen_lang', code);
    window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang: code } }));
    setShowLangPopup(false);
    showToast(`Bahasa diubah ke ${name}`);
  };

  const SectionTitle = ({ title }: { title: string }) => (<div className="text-[13px] font-bold text-[var(--mu)] mb-2 mt-8 px-6 uppercase tracking-widest opacity-70">{title}</div>);
  const CardGroup = ({ children }: { children: React.ReactNode }) => (<div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden border border-[var(--bd)]/50">{children}</div>);
  const CardItem = ({ icon, title, onClick, right, border = true }: any) => (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-all active:scale-[0.99] text-left", border && "border-b border-[var(--bd)]")}>
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
      <div className="flex-1 flex flex-col min-w-0"><span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span></div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-50 h-full" style={{ scrollbarWidth: 'none' }}>
      <div className="max-w-2xl mx-auto pb-12">
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-4 border border-[var(--bd)]/50">
          <div className="w-[60px] h-[60px] rounded-full bg-[var(--ac)] text-[var(--bg)] flex items-center justify-center text-xl font-bold shadow-sm">
            {profile.avatar ? <img src={profile.avatar} className="w-full h-full rounded-full object-cover" /> : profile.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
             {!showEditName ? (
               <div className="flex items-center gap-2 cursor-pointer group w-fit" onClick={() => { setEditNameInput(profile.name); setShowEditName(true); }}>
                 <div className="font-bold text-[18px] text-[var(--text)]">{profile.name}</div>
                 <Edit2 size={14} className="text-[var(--text)]/40 group-hover:text-[var(--text)]" />
               </div>
             ) : (
               <div className="flex items-center gap-2">
                 <input autoFocus value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} className="bg-[var(--bg)] border border-[var(--bd)] rounded px-2 py-1 text-[16px]" />
                 <button onClick={handleSaveName}><Check size={18} className="text-green-500" /></button>
               </div>
             )}
             <div className="text-[14px] text-[var(--mu)] truncate mt-0.5">{auth.currentUser?.email}</div>
          </div>
        </div>

        <SectionTitle title="General" />
        <CardGroup>
          <CardItem icon={<Palette size={20} />} title="Appearance" onClick={onViewAppearance} />
          <CardItem icon={<IconHaptics />} title="Haptics" onClick={onViewHaptics} />
          <CardItem icon={<Globe size={20} />} title="Bahasa / Language" onClick={() => setShowLangPopup(true)} right={<div className="text-[14px] text-[var(--mu)] font-medium">{profile.lang.toUpperCase()}</div>} />
        </CardGroup>

        <SectionTitle title="Ecosystem" />
        <CardGroup>
          <CardItem icon={<BrainCircuit size={20} />} title="Cylen Memory" onClick={onViewMemory} />
          <CardItem icon={<Wand2 size={20} />} title="Customize Cylen" onClick={onViewAiSettings} />
          <CardItem icon={<Network size={20} />} title="Personal Intelligence" onClick={onViewIntegrations} border={false} />
        </CardGroup>

        <CardGroup>
          <CardItem icon={<LogOut size={20} />} title="Sign out" onClick={handleLogout} border={false} right={<div />} />
        </CardGroup>
      </div>

      {/* Language Modal */}
      <AnimatePresence>
        {showLangPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] p-6 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[var(--bg)] p-6 rounded-3xl w-full max-w-sm border border-[var(--bd)]">
              <h3 className="font-bold text-xl mb-4">Pilih Bahasa</h3>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => handleSaveLanguage(l.code, l.name)} className="w-full flex items-center justify-between p-4 hover:bg-[var(--sf)] rounded-xl">
                  <span className="font-bold">{l.flag} {l.name}</span>
                  {profile.lang === l.code && <Check className="text-blue-500" />}
                </button>
              ))}
              <button onClick={() => setShowLangPopup(false)} className="w-full mt-4 p-3 font-bold text-red-500">Batal</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
