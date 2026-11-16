import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield, Zap, Download, LogOut, BarChart3, BrainCircuit,
  Camera, Check, Edit2, Globe, Trash2, Image as ImageIcon, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { subscribeToAuthChanges, signInWithGoogle, logout } from '../services/authService';
import { User } from 'firebase/auth';
import { useProfile } from '../hooks/useProfile';
import { useT } from '../lib/i18n';
// ── Kode bahasa sudah dipisah (lib/languages.ts) + punya halaman sendiri (pages/LanguagePage.tsx) ──
import { getLanguage } from '../lib/languages';
import { getVoice } from '../lib/voices';
// Ikon gaya Grok + gambar logo Cylen
import {
  IconAppearance, IconHaptics, IconVoice, IconKids, IconCustomize, IconBlocks, IconPrivacy, IconReport, MaskImg,
} from '../components/profile/ProfileIcons';

interface ProfilePageProps {
  showToast: (msg: string) => void;
  // BARU: tombol X di pojok kiri atas (kembali ke chat)
  onBack?: () => void;
  // Buka halaman Bahasa / Suara / Mode Anak
  onViewLanguage?: () => void;
  onViewVoice?: () => void;
  onViewKids?: () => void;
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
  // tidak dipakai lagi (menu buka link web), dibiarkan opsional biar App.tsx lama/baru tetap aman
  onViewPrivacy?: () => void;
  onViewAbout?: () => void;
  theme?: string;
  setTheme?: any;
  font?: string;
  setFont?: any;
}

const PRIVACY_URL = 'https://www.cylenai.com/privacy-policy';
const ABOUT_URL = 'https://www.cylenai.com/about';
const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

// Logo & tulisan Cylen (file di folder public). Diwarnai lewat CSS mask → otomatis ngikut tema.
const CYLEN_LOGO_SRC = '/82374-removebg-preview.png';
const CYLEN_WORDMARK_SRC = '/104076-removebg-preview.png';
// Teks lokal (biar nggak perlu ubah file i18n)
const PAGE_TEXT: Record<string, { title: string; close: string; voiceSection: string; kids: string; on: string; off: string }> = {
  id: { title: 'Pengaturan', close: 'Tutup', voiceSection: 'Suara', kids: 'Mode Anak', on: 'Aktif', off: 'Nonaktif' },
  en: { title: 'Settings', close: 'Close', voiceSection: 'Voice', kids: 'Kids Mode', on: 'On', off: 'Off' },
};
const THEME_LABEL: Record<string, Record<string, string>> = {
  id: { system: 'Sistem', 't-light': 'Terang', 't-dark': 'Gelap', 't-foryou': 'For You' },
  en: { system: 'System', 't-light': 'Light', 't-dark': 'Dark', 't-foryou': 'For You' },
};
const AVATAR_TEXT: Record<string, { title: string; change: string; remove: string; removed: string; removeFailed: string; cancel: string }> = {
  id: { title: 'Foto Profil', change: 'Ganti foto', remove: 'Hapus foto', removed: 'Foto profil dihapus', removeFailed: 'Gagal menghapus foto', cancel: 'Batal' },
  en: { title: 'Profile photo', change: 'Change photo', remove: 'Remove photo', removed: 'Profile photo removed', removeFailed: 'Failed to remove photo', cancel: 'Cancel' },
};

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
// KOMPONEN KECIL — SENGAJA DI LUAR ProfilePage (biar nggak re-mount tiap render)
// ─────────────────────────────────────────────

// Label bagian (gaya Grok: huruf biasa, abu-abu)
const SectionLabel = memo(({ title }: { title: string }) => (
  <div className="px-6 mt-7 mb-2 text-[15px] font-medium text-[var(--mu)]">{title}</div>
));

// Menu = SATU blok terpotong-potong (sama seperti menu di sidebar):
// potongan atas & bawah bulat besar, tengah hampir persegi, celah 2px.
interface NavItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
}
const NAV_BASE = "w-full flex items-center gap-4 bg-[var(--text)]/5 px-5 py-4 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--text)]/10";
const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';

const NavBlock = ({ items }: { items: NavItem[] }) => (
  <div className="mx-3 flex flex-col gap-[2px]">
    {items.map((it, i) => (
      <button key={it.key} onClick={it.onClick} className={cn(NAV_BASE, blockRadius(i, items.length), it.danger && 'text-red-500')}>
        <div className="w-6 flex justify-center flex-shrink-0 opacity-90">{it.icon}</div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[17px] font-semibold leading-tight truncate">{it.title}</span>
          {it.subtitle && <span className="text-[14px] font-normal text-[var(--mu)] mt-0.5 truncate">{it.subtitle}</span>}
        </div>
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// POPUP FOTO PROFIL (ganti / hapus)
// ─────────────────────────────────────────────
const AvatarSheet = memo(({ open, avatar, initial, labels, onChange, onRemove, onClose }: {
  open: boolean;
  avatar: string | null;
  initial: string;
  labels: { title: string; change: string; remove: string; cancel: string };
  onChange: () => void;
  onRemove: () => void;
  onClose: () => void;
}) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="avatar-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[200]"
          />
          <motion.div
            key="avatar-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform' }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[32px] z-[201] p-6 border-t border-[var(--bd)] max-w-2xl mx-auto"
          >
            <div className="w-12 h-1.5 bg-[var(--bd)] rounded-full mx-auto mb-6" />

            <div className="flex flex-col items-center mb-6">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-[var(--bd)] flex items-center justify-center text-4xl font-bold border border-[var(--bd)]">
                {avatar
                  ? <img src={avatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center">{initial}</div>}
              </div>
              <h3 className="text-[18px] font-bold text-[var(--text)] tracking-tight mt-4">{labels.title}</h3>
            </div>

            <div className="flex flex-col gap-2 pb-2">
              <button
                onClick={onChange}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)] active:scale-[0.98] transition-transform"
              >
                <ImageIcon size={20} />
                <span className="font-bold text-[16px]">{labels.change}</span>
              </button>

              {avatar && (
                <button
                  onClick={onRemove}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 active:scale-[0.98] transition-transform"
                >
                  <Trash2 size={20} />
                  <span className="font-bold text-[16px]">{labels.remove}</span>
                </button>
              )}
            </div>

            <button onClick={onClose} className="w-full mt-2 py-4 text-[var(--text)]/60 font-bold rounded-2xl text-[16px] active:bg-[var(--sf)]">{labels.cancel}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});

// ─────────────────────────────────────────────
// HALAMAN PROFIL (gaya Grok)
// ─────────────────────────────────────────────
export const ProfilePage: React.FC<ProfilePageProps> = ({
  showToast, onBack, onViewLanguage, onViewVoice, onViewKids, onViewAppearance, onViewHaptics, onViewReport, onViewAiSettings,
  onViewUsage, onViewIntegrations, onViewSecurity, onViewExport, onUpgradeClick, onViewMemory, theme
}) => {
  const { profile, updateProfile } = useProfile();
  const { t, lang } = useT();
  // Awalnya langsung ambil user yang sudah login → email nggak kosong/kedip waktu halaman dibuka
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarText = AVATAR_TEXT[lang] || AVATAR_TEXT.id;
  const pageText = PAGE_TEXT[lang] || PAGE_TEXT.id;

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
  };

  // Ganti foto: tutup popup lalu buka pemilih file (harus dipicu langsung dari klik)
  const handlePickPhoto = () => {
    setShowAvatarSheet(false);
    fileInputRef.current?.click();
  };

  // Hapus foto: popup ditutup dulu, simpan jalan di belakang.
  // avatar = null → useProfile TIDAK akan ngisi ulang dari foto Google.
  const handleRemovePhoto = async () => {
    setShowAvatarSheet(false);
    const ok = await updateProfile({ avatar: null });
    showToast(ok ? avatarText.removed : avatarText.removeFailed);
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

  // ── VARIABEL TAMPILAN ──
  const displayName = profile.name || user?.displayName || 'User';
  const displayAvatar = profile.avatar;
  const activeLang = getLanguage(profile.lang);
  const themeLabel = THEME_LABEL[lang]?.[theme || profile.theme] || THEME_LABEL.id[theme || profile.theme];

  const kidsOn = !!profile.kidsMode;
  const voiceName = getVoice(profile.voice).id;

  const generalItems: NavItem[] = [
    { key: 'appearance', icon: <IconAppearance />, title: t('appearance'), subtitle: themeLabel, onClick: onViewAppearance },
    { key: 'haptics', icon: <IconHaptics />, title: t('haptics'), onClick: onViewHaptics },
    { key: 'language', icon: <Globe size={22} />, title: t('language'), subtitle: activeLang.name, onClick: onViewLanguage },
    { key: 'usage', icon: <BarChart3 size={22} />, title: t('usage'), onClick: onViewUsage },
  ];
  const ecosystemItems: NavItem[] = [
    { key: 'memory', icon: <BrainCircuit size={22} />, title: t('memory'), onClick: onViewMemory },
    { key: 'customize', icon: <IconCustomize />, title: t('customize'), onClick: onViewAiSettings },
    { key: 'intel', icon: <IconBlocks />, title: t('personalIntel'), onClick: onViewIntegrations },
  ];
  const kidsItems: NavItem[] = [
    { key: 'kids', icon: <IconKids />, title: pageText.kids, subtitle: kidsOn ? pageText.on : pageText.off, onClick: onViewKids },
  ];
  const voiceItems: NavItem[] = [
    { key: 'voice', icon: <IconVoice />, title: pageText.voiceSection, subtitle: voiceName, onClick: onViewVoice },
  ];
  const dataItems: NavItem[] = [
    { key: 'security', icon: <Shield size={22} />, title: t('security'), onClick: onViewSecurity },
    { key: 'privacy', icon: <IconPrivacy />, title: t('privacyPolicy'), onClick: () => openLink(PRIVACY_URL) },
    { key: 'export', icon: <Download size={22} />, title: t('exportData'), onClick: onViewExport },
  ];
  const accountItems: NavItem[] = [
    { key: 'about', icon: <Info size={22} />, title: t('about'), onClick: () => openLink(ABOUT_URL) },
    { key: 'report', icon: <IconReport />, title: t('reportProblem'), onClick: onViewReport },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)] relative z-50">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* --- HEADER: X + judul (gaya Grok) --- */}
      <header
        className="flex items-center gap-4 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={onBack}
          aria-label={pageText.close}
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--text)]/10 transition-colors"
        >
          <X size={26} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{pageText.title}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-2 pb-10">

          {/* --- KARTU PROFIL --- */}
          <div className="mx-3 rounded-[28px] bg-[var(--text)]/5 p-5 flex items-center gap-4">
            <div className="relative shrink-0">
              <button
                onClick={() => setShowAvatarSheet(true)}
                className="block w-[72px] h-[72px] rounded-full overflow-hidden bg-[var(--bd)] ring-2 ring-[var(--text)]/10 active:opacity-80 transition-opacity"
              >
                {displayAvatar
                  ? <img src={displayAvatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center text-3xl font-bold">{displayName[0]?.toUpperCase()}</div>}
              </button>
              <button
                onClick={() => setShowAvatarSheet(true)}
                aria-label={avatarText.title}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center shadow-md border-[2.5px] border-[var(--bg)] active:scale-95 transition-transform"
              >
                <Camera size={13} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {!showEditName ? (
                <button onClick={handleEditNameClick} className="flex items-center gap-2 text-left w-fit max-w-full">
                  <span className="text-[22px] font-semibold tracking-tight text-[var(--text)] truncate">{displayName}</span>
                  <Edit2 size={14} className="text-[var(--text)]/40 flex-shrink-0" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="bg-transparent border-b-2 border-[var(--text)] px-1 py-1 text-[18px] text-[var(--text)] w-full outline-none"
                  />
                  <button onClick={handleSaveName} aria-label="OK" className="p-1"><Check size={22} className="text-blue-500" /></button>
                </div>
              )}
              <div className="text-[16px] text-[var(--mu)] truncate mt-0.5">{user?.email || t('guest')}</div>
              {!user && (
                <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold active:bg-blue-700 transition-colors">
                  {t('signInGoogle')}
                </button>
              )}
            </div>
          </div>

          {/* --- KARTU PREMIUM --- */}
          <div className="mx-3 mt-3 rounded-[28px] bg-[var(--text)]/5 pl-5 pr-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Zap size={24} className="text-blue-500 flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[17px] text-[var(--text)] tracking-tight truncate">Cylen Premium</span>
                <span className="text-[14px] text-[var(--mu)] mt-0.5 truncate">{t('premiumDesc')}</span>
              </div>
            </div>
            <button onClick={onUpgradeClick} className="flex-shrink-0 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-full text-[15px] transition-[transform,background-color] active:scale-95 active:bg-blue-700">
              {t('upgrade')}
            </button>
          </div>

          <SectionLabel title={t('sectionGeneral')} />
          <NavBlock items={generalItems} />

          <SectionLabel title={t('sectionEcosystem')} />
          <NavBlock items={ecosystemItems} />

          <div className="h-3" />
          <NavBlock items={kidsItems} />

          <SectionLabel title={pageText.voiceSection} />
          <NavBlock items={voiceItems} />

          <SectionLabel title={t('sectionData')} />
          <NavBlock items={dataItems} />

          <SectionLabel title={t('sectionAccount')} />
          <NavBlock items={accountItems} />

          <div className="h-3" />
          <NavBlock items={[{ key: 'signout', icon: <LogOut size={22} />, title: t('signOut'), onClick: handleLogout, danger: true }]} />

          {/* --- FOOTER: logo + tulisan Cylen --- */}
          <div className="flex flex-col items-center gap-3 mt-12 mb-6 select-none opacity-60">
            <MaskImg src={CYLEN_LOGO_SRC} width={48} height={48} />
            <MaskImg src={CYLEN_WORDMARK_SRC} width={124} height={28} />
            <span className="text-[12px] font-mono tracking-wider text-[var(--text)]/70">Cylen v1</span>
          </div>
        </div>
      </div>

      <AvatarSheet
        open={showAvatarSheet}
        avatar={displayAvatar}
        initial={displayName[0]?.toUpperCase() || 'U'}
        labels={avatarText}
        onChange={handlePickPhoto}
        onRemove={handleRemovePhoto}
        onClose={() => setShowAvatarSheet(false)}
      />
    </div>
  );
};
