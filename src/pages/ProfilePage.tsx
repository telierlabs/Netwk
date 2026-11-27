import React, { useState, useEffect, memo } from 'react';
import {
  Shield, LogOut, Brain, Globe, Info, X, Bell, ArrowLeftRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { subscribeToAuthChanges, signInWithGoogle, logout, switchAccount } from '../services/authService';
import { User } from 'firebase/auth';
import { useProfile } from '../hooks/useProfile';
import { useT, usePageText } from '../lib/i18n';
import { getLanguage } from '../lib/languages';
import { getVoice } from '../lib/voices';
import { PromoPill } from '../components/paywall/PromoPill';
import {
  IconAppearance, IconHaptics, IconUsage, IconVoice, IconKids, IconCustomize, IconBlocks, IconPrivacy, IconReport, MaskImg,
} from '../components/profile/ProfileIcons';

interface ProfilePageProps {
  showToast: (msg: string) => void;
  onBack?: () => void;
  onViewLanguage?: () => void;
  onViewVoice?: () => void;
  onViewKids?: () => void;
  onViewEditProfile?: () => void;
  onViewAppearance?: () => void;
  onViewHaptics?: () => void;
  onViewReport?: () => void;
  onViewAiSettings?: () => void;
  onViewUsage?: () => void;
  onViewIntegrations?: () => void;
  // BARU: halaman gabungan Data & Privasi (pengganti Keamanan + Ekspor Data)
  onViewData?: () => void;
  onUpgradeClick?: () => void;
  onViewMemory?: () => void;
  onViewPermissions?: () => void;
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

const CYLEN_LOGO_SRC = '/82374-removebg-preview.png';
const CYLEN_WORDMARK_SRC = '/104076-removebg-preview.png';

const PAGE_TEXT: Record<string, Record<string, string>> = {
  id: {
    title: 'Pengaturan', close: 'Tutup', on: 'Aktif', off: 'Nonaktif',
    sectionApp: 'Aplikasi', sectionCylen: 'Cylen', appLanguage: 'Bahasa Aplikasi', connectors: 'Konektor',
    kids: 'Mode Anak', voiceSection: 'Suara', dataInfo: 'Data & Informasi',
    permissions: 'Notifikasi & Izin', dataPrivacy: 'Data & Privasi',
    switchAccount: 'Ganti Akun',
  },
  en: {
    title: 'Settings', close: 'Close', on: 'On', off: 'Off',
    sectionApp: 'App', sectionCylen: 'Cylen', appLanguage: 'App Language', connectors: 'Connectors',
    kids: 'Kids Mode', voiceSection: 'Voice', dataInfo: 'Data & Information',
    permissions: 'Notifications & Permissions', dataPrivacy: 'Data & Privacy',
    switchAccount: 'Switch Account',
  },
};
const THEME_LABEL: Record<string, Record<string, string>> = {
  id: { system: 'Sistem', 't-light': 'Terang', 't-dark': 'Gelap', 't-foryou': 'For You' },
  en: { system: 'System', 't-light': 'Light', 't-dark': 'Dark', 't-foryou': 'For You' },
};

// ─────────────────────────────────────────────
// KOMPONEN KECIL — SENGAJA DI LUAR ProfilePage (biar nggak re-mount tiap render)
// ─────────────────────────────────────────────
const SectionLabel = memo(({ title }: { title: string }) => (
  <div className="px-6 mt-7 mb-2 text-[16px] font-medium text-[var(--mu)]">{title}</div>
));

interface NavItem {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  danger?: boolean;
}
const NAV_BASE = "w-full flex items-center gap-4 bg-[var(--sf)] px-5 py-4 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--ib)]";
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
          <span className="text-[18px] font-medium leading-tight truncate">{it.title}</span>
          {it.subtitle && <span className="text-[15px] font-normal text-[var(--mu)] mt-0.5 truncate">{it.subtitle}</span>}
        </div>
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────
// HALAMAN PROFIL (gaya Grok)
// ─────────────────────────────────────────────
export const ProfilePage: React.FC<ProfilePageProps> = ({
  showToast, onBack, onViewLanguage, onViewVoice, onViewKids, onViewEditProfile, onViewAppearance, onViewHaptics, onViewReport, onViewAiSettings,
  onViewUsage, onViewIntegrations, onViewData, onUpgradeClick, onViewMemory, onViewPermissions, theme
}) => {
  const { profile } = useProfile();
  const { t } = useT();
  const [user, setUser] = useState<User | null>(() => auth.currentUser);

  const pageText = usePageText('profile', PAGE_TEXT);
  const themeTx = usePageText('theme', THEME_LABEL);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { try { await signInWithGoogle(); showToast(t('toastSignedIn')); } catch { showToast(t('toastSignInFailed')); } };
  const handleLogout = async () => { try { await logout(); showToast(t('toastSignedOut')); } catch { showToast(t('toastSignOutFailed')); } };

  // BARU: Ganti Akun → popup pilih akun Google; kalau akunnya beda, halaman dimuat ulang supaya data akun lama bersih
  const handleSwitch = async () => {
    try {
      if (await switchAccount()) window.location.reload();
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') showToast(t('toastSignInFailed'));
    }
  };

  const displayName = profile.name || user?.displayName || 'User';
  const displayAvatar = profile.avatar;
  const activeLang = getLanguage(profile.lang);
  const themeLabel = themeTx[theme || profile.theme];

  const kidsOn = !!profile.kidsMode;
  const voiceName = getVoice(profile.voice).id;

  const permItems: NavItem[] = [
    { key: 'permissions', icon: <Bell size={24} />, title: pageText.permissions, onClick: onViewPermissions },
  ];
  const appItems: NavItem[] = [
    { key: 'appearance', icon: <IconAppearance />, title: t('appearance'), subtitle: themeLabel, onClick: onViewAppearance },
    { key: 'haptics', icon: <IconHaptics />, title: t('haptics'), onClick: onViewHaptics },
    { key: 'language', icon: <Globe size={24} />, title: pageText.appLanguage, subtitle: activeLang.name, onClick: onViewLanguage },
    { key: 'usage', icon: <IconUsage />, title: t('usage'), onClick: onViewUsage },
  ];
  const cylenItems: NavItem[] = [
    { key: 'memory', icon: <Brain size={24} />, title: t('memory'), onClick: onViewMemory },
    { key: 'customize', icon: <IconCustomize />, title: t('customize'), onClick: onViewAiSettings },
    { key: 'connectors', icon: <IconBlocks />, title: pageText.connectors, onClick: onViewIntegrations },
  ];
  const kidsItems: NavItem[] = [
    { key: 'kids', icon: <IconKids />, title: pageText.kids, subtitle: kidsOn ? pageText.on : pageText.off, onClick: onViewKids },
  ];
  const voiceItems: NavItem[] = [
    { key: 'voice', icon: <IconVoice />, title: pageText.voiceSection, subtitle: voiceName, onClick: onViewVoice },
  ];
  // Data & Privasi + Tentang + Kebijakan Privasi dalam satu blok
  const dataItems: NavItem[] = [
    { key: 'data', icon: <Shield size={24} />, title: pageText.dataPrivacy, onClick: onViewData },
    { key: 'about', icon: <Info size={24} />, title: t('about'), onClick: () => openLink(ABOUT_URL) },
    { key: 'privacy', icon: <IconPrivacy />, title: t('privacyPolicy'), onClick: () => openLink(PRIVACY_URL) },
  ];
  const reportItems: NavItem[] = [
    { key: 'report', icon: <IconReport />, title: t('reportProblem'), onClick: onViewReport },
  ];
  const signOutItems: NavItem[] = [
    { key: 'switch', icon: <ArrowLeftRight size={24} />, title: pageText.switchAccount, onClick: handleSwitch },
    { key: 'signout', icon: <LogOut size={24} />, title: t('signOut'), onClick: handleLogout, danger: true },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)] relative z-50">
      <header
        className="flex items-center gap-4 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={onBack}
          aria-label={pageText.close}
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors"
        >
          <X size={26} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{pageText.title}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-2 pb-10">

          {user ? (
            <button
              onClick={onViewEditProfile}
              className="mx-3 w-[calc(100%-1.5rem)] rounded-[28px] bg-[var(--sf)] p-5 flex items-center gap-4 text-left transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--ib)]"
            >
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-[var(--ib)] ring-2 ring-[var(--bd)] flex-shrink-0">
                {displayAvatar
                  ? <img src={displayAvatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-[var(--ac)] text-[var(--at)] flex items-center justify-center text-3xl font-bold">{displayName[0]?.toUpperCase()}</div>}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[22px] font-semibold tracking-tight text-[var(--text)] truncate">{displayName}</span>
                <span className="text-[16px] text-[var(--mu)] truncate mt-0.5">{user.email}</span>
              </div>
            </button>
          ) : (
            <div className="mx-3 rounded-[28px] bg-[var(--sf)] p-5 flex items-center gap-4">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-[var(--ib)] ring-2 ring-[var(--bd)] flex-shrink-0">
                <div className="w-full h-full bg-[var(--ac)] text-[var(--at)] flex items-center justify-center text-3xl font-bold">{displayName[0]?.toUpperCase()}</div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <span className="text-[22px] font-semibold tracking-tight text-[var(--text)] truncate">{displayName}</span>
                <span className="text-[16px] text-[var(--mu)] truncate mt-0.5">{t('guest')}</span>
                <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-blue-600 text-white rounded-full text-[12px] font-bold active:bg-blue-700 transition-colors">
                  {t('signInGoogle')}
                </button>
              </div>
            </div>
          )}

          <div className="mt-3">
            <PromoPill inline onClick={onUpgradeClick} />
          </div>

          <div className="mt-3">
            <NavBlock items={permItems} />
          </div>

          <SectionLabel title={pageText.sectionApp} />
          <NavBlock items={appItems} />

          <SectionLabel title={pageText.sectionCylen} />
          <NavBlock items={cylenItems} />

          <div className="h-5" />
          <NavBlock items={kidsItems} />

          <SectionLabel title={pageText.voiceSection} />
          <NavBlock items={voiceItems} />

          <SectionLabel title={pageText.dataInfo} />
          <NavBlock items={dataItems} />

          <div className="h-5" />
          <NavBlock items={reportItems} />

          <div className="h-5" />
          <NavBlock items={signOutItems} />

          <div className="flex flex-col items-center gap-3 mt-12 mb-6 select-none opacity-60">
            <MaskImg src={CYLEN_LOGO_SRC} width={48} height={48} />
            <MaskImg src={CYLEN_WORDMARK_SRC} width={124} height={28} />
            <span className="text-[12px] font-mono tracking-wider text-[var(--mu)]">Cylen v1</span>
          </div>
        </div>
      </div>
    </div>
  );
};
