import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Type as TypeIcon, 
  ChevronRight, 
  Check, 
  Shield, 
  Bell, 
  Zap, 
  BarChart3, 
  Download, 
  FileText, 
  Info, 
  LogOut, 
  X,
  Image as ImageIcon,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES, FONTS } from '../constants';
import { Theme, Font } from '../types';
import { signInWithGoogle, logout, subscribeToAuthChanges } from '../services/authService';
import { requestNotificationPermission, showLocalNotification } from '../services/notificationService';
import { User } from 'firebase/auth';
import { isConfigured as isFirebaseConfigured } from '../lib/firebase';

interface ProfilePageProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: Font;
  setFont: (f: Font) => void;
  showToast: (msg: string) => void;
  onViewMemory?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  theme, setTheme, font, setFont, showToast, onViewMemory
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showThemes, setShowThemes] = useState(false);
  const [showFonts, setShowFonts] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithGoogle(); showToast('Berhasil masuk dengan Google'); }
    catch { showToast('Gagal masuk'); }
  };

  const handleLogout = async () => {
    try { await logout(); showToast('Berhasil keluar'); }
    catch { showToast('Gagal keluar'); }
  };

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) { showToast('Notifikasi diaktifkan!'); showLocalNotification('Cylen AI', 'Notifikasi berhasil diaktifkan!'); }
    else showToast('Gagal mengaktifkan notifikasi');
  };

  const Section = ({ label }: { label: string }) => (
    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-2 mt-6 px-1">{label}</div>
  );

  const CardGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[var(--cd)] rounded-2xl border border-[var(--bd)] overflow-hidden">{children}</div>
  );

  const CardItem = ({ icon, title, right, onClick, border = true }: {
    icon: React.ReactNode; title: string; right?: React.ReactNode; onClick?: () => void; border?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-3 px-4 py-[14px] hover:bg-[var(--sf)] transition-colors text-left", border && "border-b border-[var(--bd)]")}
    >
      <div className="w-8 h-8 bg-[var(--ib)] rounded-[10px] flex items-center justify-center flex-shrink-0 text-[var(--text)]">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--text)]">{title}</span>
      {right ?? <ChevronRight size={15} className="text-[var(--mu)] opacity-30" />}
    </button>
  );

  const BrainIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );

  return (
    <main className="flex-1 overflow-y-auto pb-12" style={{ minHeight: 0 }}>
      <div className="max-w-2xl mx-auto px-4">

        {/* PROFIL CARD */}
        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-2xl flex items-center gap-4 p-5 mt-5">
          <div className="relative flex-shrink-0">
            {user?.photoURL
              ? <img src={user.photoURL} alt="Profile" className="w-14 h-14 rounded-full object-cover" />
              : <div className="w-14 h-14 bg-[var(--ac)] text-[var(--at)] rounded-full flex items-center justify-center text-2xl font-bold">{user?.displayName?.[0] || 'K'}</div>
            }
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-[var(--bg)] border border-[var(--bd)] rounded-full flex items-center justify-center">
              <ImageIcon size={11} className="text-[var(--mu)]" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate text-[var(--text)]">{user?.displayName || 'Kamu'}</div>
            <div className="text-xs text-[var(--mu)] truncate">{user?.email || 'Belum masuk'}</div>
            {!user && (
              <button onClick={handleLogin} className="mt-2 flex items-center gap-1.5 px-4 py-1.5 bg-[var(--ac)] text-[var(--at)] rounded-full text-xs font-bold">
                <UserIcon size={13} /> Masuk dengan Google
              </button>
            )}
            {user && <div className="mt-1 inline-block px-3 py-0.5 bg-[var(--ac)] text-[var(--at)] text-[9px] font-bold uppercase tracking-widest rounded-full">Premium</div>}
          </div>
        </div>

        {/* TAMPILAN */}
        <Section label="Tampilan" />
        <CardGroup>
          <CardItem
            icon={<Palette size={16} />}
            title="Tema Warna"
            onClick={() => { setShowThemes(!showThemes); setShowFonts(false); }}
            right={<ChevronRight size={15} className={cn("text-[var(--mu)] opacity-30 transition-transform", showThemes && "rotate-90")} />}
          />
          {showThemes && (
            <div className="px-4 pb-4 pt-2 grid grid-cols-3 gap-3 border-b border-[var(--bd)]">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => { setTheme(t.id); showToast(`Tema ${t.name} diterapkan`); }}
                  className={cn("flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all", theme === t.id ? "ring-2 ring-[var(--ac)]" : "hover:bg-[var(--sf)]")}>
                  <div className="w-full aspect-square rounded-lg border border-[var(--bd)] flex items-center justify-center" style={{ backgroundColor: t.bg }}>
                    <div className="w-1/2 h-1/2 rounded-sm" style={{ backgroundColor: t.accent }} />
                  </div>
                  <span className="text-[10px] font-medium text-[var(--text)]">{t.name}</span>
                </button>
              ))}
            </div>
          )}
          <CardItem
            icon={<TypeIcon size={16} />}
            title="Gaya Huruf"
            onClick={() => { setShowFonts(!showFonts); setShowThemes(false); }}
            border={false}
            right={<ChevronRight size={15} className={cn("text-[var(--mu)] opacity-30 transition-transform", showFonts && "rotate-90")} />}
          />
          {showFonts && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              {FONTS.map((f) => (
                <button key={f.id} onClick={() => { setFont(f.id); showToast(`Font ${f.name} diterapkan`); }}
                  className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all text-left", font === f.id ? "border-[var(--ac)] bg-[var(--sf)]" : "border-[var(--bd)]")}>
                  <div className="text-xl w-8 flex-shrink-0 font-semibold text-[var(--text)]" style={{ fontFamily: f.family }}>Ag</div>
                  <span className="flex-1 text-sm font-medium text-[var(--text)]">{f.name}</span>
                  {font === f.id && <Check size={15} className="text-[var(--ac)]" />}
                </button>
              ))}
            </div>
          )}
        </CardGroup>

        {/* AKUN */}
        <Section label="Akun" />
        <CardGroup>
          <CardItem icon={
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.26 9.77A7.2 7.2 0 0 1 12 4.8c1.73 0 3.29.62 4.51 1.64l3.37-3.37A12 12 0 0 0 12 0C7.27 0 3.2 2.7 1.16 6.65l4.1 3.12z"/>
              <path fill="#34A853" d="M16.04 18.01A7.18 7.18 0 0 1 12 19.2a7.2 7.2 0 0 1-6.73-4.57l-4.1 3.1A12 12 0 0 0 12 24c2.93 0 5.63-1.06 7.7-2.8l-3.66-3.19z"/>
              <path fill="#4A90D9" d="M19.7 21.2A12 12 0 0 0 24 12c0-.72-.07-1.42-.19-2.1H12v4.46h6.69a5.7 5.7 0 0 1-2.65 3.65l3.66 3.19z"/>
              <path fill="#FBBC05" d="M5.27 14.63A7.3 7.3 0 0 1 4.8 12c0-.91.16-1.78.45-2.59L1.15 6.3A12 12 0 0 0 0 12c0 1.93.46 3.76 1.16 5.42l4.1-3.1z"/>
            </svg>
          } title="Akun Google" />
          <CardItem icon={<Shield size={16} />} title="Keamanan" />
          <CardItem icon={<BrainIcon />} title="Memori Cylen" onClick={onViewMemory} />
          <CardItem icon={<Bell size={16} />} title="Notifikasi" onClick={handleEnableNotifications} border={false} />
        </CardGroup>

        {/* LANGGANAN */}
        <Section label="Langganan" />
        <CardGroup>
          <CardItem icon={<Zap size={16} />} title="Plan Premium" right={<span className="text-xs font-bold text-[var(--ac)]">Kelola</span>} />
          <CardItem icon={<BarChart3 size={16} />} title="Penggunaan" border={false} />
        </CardGroup>

        {/* LAINNYA */}
        <Section label="Lainnya" />
        <CardGroup>
          <CardItem icon={<Download size={16} />} title="Ekspor Data" />
          <CardItem icon={<FileText size={16} />} title="Syarat & Privasi" />
          <CardItem icon={<Info size={16} />} title="Tentang Cylen" border={false} right={null} />
        </CardGroup>

        {/* LOGOUT / HAPUS */}
        <div className="flex flex-col gap-2 mt-4">
          {user && (
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-[14px] bg-[var(--cd)] border border-[var(--bd)] rounded-2xl hover:bg-[var(--sf)] transition-colors">
              <div className="w-8 h-8 bg-red-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
                <LogOut size={16} className="text-red-500" />
              </div>
              <span className="text-sm font-medium text-red-500">Keluar dari Akun</span>
            </button>
          )}
          <button onClick={() => { if(confirm('Hapus akun permanen?')) showToast('Permintaan dikirim'); }}
            className="w-full flex items-center gap-3 px-4 py-[14px] bg-[var(--cd)] border border-[var(--bd)] rounded-2xl hover:bg-[var(--sf)] transition-colors">
            <div className="w-8 h-8 bg-red-100 rounded-[10px] flex items-center justify-center flex-shrink-0">
              <X size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Hapus Akun</span>
          </button>
        </div>

        {/* BRANDING BAWAH */}
        <div className="flex flex-col items-center gap-2 mt-10 mb-4">
          <div className="w-10 h-10 bg-[var(--ac)] rounded-[12px] flex items-center justify-center">
            <Zap size={20} className="text-[var(--at)]" />
          </div>
          <span className="text-sm font-bold text-[var(--text)]">Cylen AI</span>
          <span className="text-[11px] text-[var(--mu)]">Versi 1.0.0 · Build 2026.02</span>
        </div>

      </div>
    </main>
  );
};
