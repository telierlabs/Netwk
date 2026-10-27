import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette, ChevronRight, Shield, Zap, Download, LogOut, Wand2, Network, BarChart3, BrainCircuit,
  Camera, Check, Edit2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { subscribeToAuthChanges, signInWithGoogle, logout } from '../services/authService';
import { User } from 'firebase/auth';
import { useProfile } from '../hooks/useProfile';
import { useT, translate, normalizeLang } from '../lib/i18n';
import type { Lang } from '../lib/i18n';

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
  theme?: string;
  setTheme?: any;
  font?: string;
  setFont?: any;
}

const LANGUAGES: { code: Lang; name: string; flag: string }[] = [
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

// ── KOMPRES FOTO: biar muat di Firestore (limit dokumen 1MB) ──
const compressImage = (file: File, max = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─────────────────────────────────────────────
// KOMPONEN KECIL — SENGAJA DI LUAR ProfilePage.
// Dulu ketiganya didefinisikan DI DALAM ProfilePage, jadi tiap render
// React nganggep itu komponen baru → seluruh daftar menu dibongkar & dibangun
// ulang (unmount/mount) setiap kali ada state berubah. Itu penyebab utama lag.
// ─────────────────────────────────────────────
const SectionTitle = memo(({ title }: { title: string }) => (
  <div className="text-[13px] font-bold text-[var(--mu)] mb-2 mt-8 px-6 uppercase tracking-widest opacity-70">{title}</div>
));

const CardGroup = memo(({ children }: { children: React.ReactNode }) => (
  <div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden border border-[var(--bd)]/50">{children}</div>
));

const CardItem = memo(({ icon, title, onClick, right, border = true, className }: {
  icon: React.ReactNode; title: string; onClick?: () => void; right?: React.ReactNode | null; border?: boolean; className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-colors active:scale-[0.99] text-left", border && "border-b border-[var(--bd)]", className)}
  >
    <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
    <div className="flex-1 flex flex-col min-w-0"><span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span></div>
    {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
  </button>
));

// ─────────────────────────────────────────────
// POPUP BAHASA
// - Di-render lewat portal ke <body> (lepas dari <main> yang scroll & z-50).
// - Tanpa backdrop-blur (blur layar penuh itu berat banget di HP menengah).
// - Animasi cuma transform + opacity → jalan di GPU, nggak bikin re-layout.
// ─────────────────────────────────────────────
const LanguageSheet = memo(({ open, current, onSelect, onClose, title, cancelLabel }: {
  open: boolean; current: Lang; onSelect: (code: Lang, name: string) => void; onClose: () => void; title: string; cancelLabel: string;
}) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="lang-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[200]"
          />
          <motion.div
            key="lang-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform' }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[32px] z-[201] p-6 border-t border-[var(--bd)] max-w-2xl mx-auto"
          >
            <div className="w-12 h-1.5 bg-[var(--bd)] rounded-full mx-auto mb-6" />
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)] border border-[var(--bd)]"><Globe size={20} /></div>
              <h3 className="text-[20px] font-bold text-[var(--text)] tracking-tight">{title}</h3>
            </div>
            <div className="flex flex-col gap-2 pb-4">
              {LANGUAGES.map((l) => {
                const active = current === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => onSelect(l.code, l.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-4 rounded-2xl active:scale-[0.98] transition-transform",
                      active ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)]"
                    )}
                  >
                    <div className="flex items-center gap-4"><span className="text-[22px]">{l.flag}</span><span className="font-bold text-[16px]">{l.name}</span></div>
                    {active && <Check size={20} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <button onClick={onClose} className="w-full mt-2 py-4 text-[var(--text)]/60 font-bold rounded-2xl text-[16px] active:bg-[var(--sf)]">{cancelLabel}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

// ─────────────────────────────────────────────
// HALAMAN PROFIL
// ─────────────────────────────────────────────
export const ProfilePage: React.FC<ProfilePageProps> = ({
  showToast, onViewAppearance, onViewHaptics, onViewReport, onViewAiSettings,
  onViewUsage, onViewIntegrations, onViewSecurity, onViewExport, onUpgradeClick, onViewMemory
}) => {
  const { profile, updateProfile } = useProfile();
  const { t, lang } = useT();
  const [user, setUser] = useState<User | null>(null);

  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [showLangPopup, setShowLangPopup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { try { await signInWithGoogle(); showToast(t('toastSignedIn')); } catch { showToast(t('toastSignInFailed')); } };
  const handleLogout = async () => { try { await logout(); showToast(t('toastSignedOut')); } catch { showToast(t('toastSignOutFailed')); } };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      const ok = await updateProfile({ avatar: dataUrl });
      showToast(ok ? t('toastPhotoUpdated') : t('toastPhotoSaveFailed'));
    } catch {
      showToast(t('toastPhotoProcessFailed'));
    }
    setShowFullAvatar(false);
  };

  const handleEditNameClick = () => {
    setEditNameInput(profile.name);
    setShowEditName(true);
  };

  const handleSaveName = async () => {
    if (!editNameInput.trim()) return showToast(t('toastNameEmpty'));
    const ok = await updateProfile({ name: editNameInput.trim() });
    setShowEditName(false);
    showToast(ok ? t('toastNameUpdated') : t('toastNameSaveFailed'));
  };

  // Popup ditutup DULU (instan), simpan ke Firestore jalan di belakang.
  // Dulu: await updateProfile() baru tutup popup → tiap klik terasa macet nunggu jaringan.
  const handleSaveLanguage = async (code: Lang, name: string) => {
    setShowLangPopup(false);
    if (code === lang) return;

    try { localStorage.setItem('cylen_lang', code); } catch { /* abaikan */ }
    document.documentElement.lang = code;

    const ok = await updateProfile({ lang: code });
    if (ok) {
      window.dispatchEvent(new CustomEvent('language-changed', { detail: { lang: code } }));
      // Toast pakai bahasa BARU yang dipilih
      showToast(translate(code, 'toastLangChanged', { name }));
    } else {
      try { localStorage.setItem('cylen_lang', lang); } catch { /* abaikan */ }
      document.documentElement.lang = lang;
      showToast(t('toastLangSaveFailed'));
    }
  };

  // ── VARIABEL TAMPILAN ──
  const displayName = profile.name || user?.displayName || 'User';
  const displayAvatar = profile.avatar;
  const activeLangData = LANGUAGES.find(l => l.code === normalizeLang(profile.lang)) || LANGUAGES[0];

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-50" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="max-w-2xl mx-auto pb-6">

        {/* --- PROFILE HEADER --- */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2 border border-[var(--bd)]/50">
          <div className="relative group shrink-0">
            <div onClick={() => setShowFullAvatar(true)} className="cursor-pointer w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)] flex items-center justify-center text-2xl font-bold overflow-hidden shadow-sm hover:opacity-80 transition-opacity">
              {displayAvatar ? <img src={displayAvatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center">{displayName[0]?.toUpperCase()}</div>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center shadow-md border-[2.5px] border-[var(--sf)] active:scale-95 transition-transform"><Camera size={13} strokeWidth={2.5} /></button>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {!showEditName ? (
              <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1 flex items-center gap-2 cursor-pointer group w-fit" onClick={handleEditNameClick}>
                <span className="truncate">{displayName}</span><Edit2 size={14} className="text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors" />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <input autoFocus value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} className="bg-[var(--bg)] border border-[var(--bd)] rounded px-2 py-1 text-[16px] text-[var(--text)] w-full outline-none" />
                <button onClick={handleSaveName}><Check size={20} className="text-blue-500" /></button>
              </div>
            )}
            <div className="text-[14px] text-[var(--mu)] truncate mt-0.5">{user?.email || t('guest')}</div>
            {!user && <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold hover:bg-blue-700 transition-colors">{t('signInGoogle')}</button>}
          </div>
        </div>

        <div className="bg-[var(--sf)] rounded-[24px] p-5 flex items-center justify-between mx-4 mt-3 border border-blue-500/20 bg-gradient-to-br from-transparent to-blue-500/5">
          <div className="flex items-center gap-4"><Zap size={22} className="text-blue-500" />
            <div className="flex flex-col"><span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Cylen Premium</span><span className="text-[13px] text-[var(--mu)] mt-0.5">{t('premiumDesc')}</span></div>
          </div>
          <button onClick={onUpgradeClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-all active:scale-95 shadow-lg shadow-blue-500/20">{t('upgrade')}</button>
        </div>

        <SectionTitle title={t('sectionGeneral')} />
        <CardGroup>
          <CardItem icon={<Palette size={20} />} title={t('appearance')} onClick={onViewAppearance} />
          <CardItem icon={<IconHaptics />} title={t('haptics')} onClick={onViewHaptics} />
          <CardItem
            icon={<Globe size={20} />}
            title={t('language')}
            onClick={() => setShowLangPopup(true)}
            right={<div className="flex items-center gap-2 text-[14px] text-[var(--mu)] font-medium"><span>{activeLangData.flag} {activeLangData.code.toUpperCase()}</span><ChevronRight size={18} className="opacity-40" /></div>}
          />
          <CardItem icon={<BarChart3 size={20} />} title={t('usage')} onClick={onViewUsage} border={false} />
        </CardGroup>

        <SectionTitle title={t('sectionEcosystem')} />
        <CardGroup>
          <CardItem icon={<BrainCircuit size={20} />} title={t('memory')} onClick={onViewMemory} />
          <CardItem icon={<Wand2 size={20} />} title={t('customize')} onClick={onViewAiSettings} />
          <CardItem icon={<Network size={20} />} title={t('personalIntel')} onClick={onViewIntegrations} border={false} />
        </CardGroup>

        <SectionTitle title={t('sectionData')} />
        <CardGroup>
          <CardItem icon={<Shield size={20} />} title={t('security')} onClick={onViewSecurity} />
          <CardItem icon={<Download size={20} />} title={t('exportData')} onClick={onViewExport} border={false} />
        </CardGroup>

        <SectionTitle title={t('sectionAccount')} />

        <CardGroup>
          <CardItem icon={<IconReport />} title={t('reportProblem')} onClick={onViewReport} border={false} right={<div />} />
        </CardGroup>

        <div className="h-4"></div>

        <CardGroup>
          <CardItem icon={<LogOut size={20} />} title={t('signOut')} onClick={handleLogout} border={false} right={<div />} />
        </CardGroup>

        {/* --- FOOTER CYLEN V1 --- */}
        <div className="flex flex-col items-center justify-center mt-10 mb-4 opacity-50 select-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text)] mb-2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span className="text-[12px] font-bold text-[var(--text)] tracking-[0.1em] uppercase">Cylen v1</span>
        </div>
      </div>

      <LanguageSheet
        open={showLangPopup}
        current={lang}
        onSelect={handleSaveLanguage}
        onClose={() => setShowLangPopup(false)}
        title={t('chooseLanguage')}
        cancelLabel={t('cancel')}
      />
    </main>
  );
};
