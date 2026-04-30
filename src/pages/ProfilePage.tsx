import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  ChevronRight, 
  Check, 
  Shield, 
  Zap, 
  Download, 
  FileText, 
  LogOut, 
  Smartphone,
  LayoutTemplate,
  Fingerprint,
  Wand2,
  Baby,
  ShieldAlert,
  Volume2,
  Mic
} from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES, FONTS } from '../constants';
import { Theme, Font } from '../types';
import { signInWithGoogle, logout, subscribeToAuthChanges } from '../services/authService';
import { requestNotificationPermission, showLocalNotification } from '../services/notificationService';
import { User } from 'firebase/auth';

interface ProfilePageProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: Font;
  setFont: (f: Font) => void;
  showToast: (msg: string) => void;
  onViewMemory?: () => void;
  onViewAiSettings?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  theme, setTheme, font, setFont, showToast, onViewMemory, onViewAiSettings
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [showThemes, setShowThemes] = useState(false);
  const [showFonts, setShowFonts] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
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

  const SectionTitle = ({ title }: { title: string }) => (
    <div className="text-[14px] font-bold text-[var(--mu)] mb-2 mt-8 px-6">{title}</div>
  );

  const CardGroup = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden">{children}</div>
  );

  const CardItem = ({ icon, title, subtitle, onClick, right, border = true }: {
    icon: React.ReactNode; title: string; subtitle?: string; onClick?: () => void; right?: React.ReactNode; border?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-colors text-left", border && "border-b border-[var(--bd)]")}
    >
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span>
        {subtitle && <span className="text-[13px] text-[var(--mu)] mt-1">{subtitle}</span>}
      </div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  return (
    <main className="flex-1 overflow-y-auto pb-12 bg-[var(--bg)]" style={{ minHeight: 0 }}>
      <div className="max-w-2xl mx-auto pb-10">

        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)]" />
          ) : (
            <div className="w-[60px] h-[60px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center text-2xl font-bold">
              {user?.displayName?.[0] || 'T'}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1">{user?.displayName || 'Telier Labs'}</div>
             <div className="text-[14px] text-[var(--mu)] truncate">{user?.email || 'telierlabsx@gmail.com'}</div>
             {!user && (
               <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[13px] font-bold">
                 Masuk dengan Google
               </button>
             )}
          </div>
        </div>

        <div className="bg-[var(--sf)] rounded-[24px] p-5 flex items-center justify-between mx-4 mt-3">
          <div className="flex items-center gap-4">
             <Zap size={22} className="text-[var(--text)]" />
             <div className="flex flex-col">
               <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Cylen Premium</span>
               <span className="text-[13px] text-[var(--mu)] mt-0.5">Early access to new features</span>
             </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-colors shadow-sm">
            Upgrade
          </button>
        </div>

        <SectionTitle title="General" />
        <CardGroup>
          <CardItem
            icon={<Palette size={20} />}
            title="Appearance"
            subtitle={THEMES.find(t => t.id === theme)?.name || 'System'}
            onClick={() => { setShowThemes(!showThemes); setShowFonts(false); }}
            right={<ChevronRight size={18} className={cn("text-[var(--mu)] opacity-40 transition-transform", showThemes && "rotate-90")} />}
          />
          {showThemes && (
            <div className="px-5 pb-5 pt-2 grid grid-cols-3 gap-3 bg-[var(--bd)] bg-opacity-20 border-b border-[var(--bd)]">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => { setTheme(t.id); showToast(`Tema ${t.name} diterapkan`); }}
                  className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl transition-all bg-[var(--sf)]", theme === t.id ? "ring-2 ring-[var(--text)]" : "hover:brightness-95")}>
                  <div className="w-full aspect-square rounded-[12px] border border-[var(--bd)] flex items-center justify-center shadow-sm" style={{ backgroundColor: t.bg }}>
                    <div className="w-1/2 h-1/2 rounded-md" style={{ backgroundColor: t.accent }} />
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text)]">{t.name}</span>
                </button>
              ))}
            </div>
          )}

          <CardItem icon={<Smartphone size={20} />} title="Haptics" />
          <CardItem icon={<LayoutTemplate size={20} />} title="Widget" />
          
          <CardItem
            icon={<Fingerprint size={20} />}
            title="Advanced"
            subtitle={FONTS.find(f => f.id === font)?.name || 'System Font'}
            onClick={() => { setShowFonts(!showFonts); setShowThemes(false); }}
            border={false}
            right={<ChevronRight size={18} className={cn("text-[var(--mu)] opacity-40 transition-transform", showFonts && "rotate-90")} />}
          />
          {showFonts && (
            <div className="px-5 pb-5 pt-2 flex flex-col gap-2 bg-[var(--bd)] bg-opacity-20">
              {FONTS.map((f) => (
                <button key={f.id} onClick={() => { setFont(f.id); showToast(`Font ${f.name} diterapkan`); }}
                  className={cn("flex items-center gap-4 p-4 rounded-2xl transition-all text-left", font === f.id ? "bg-[var(--text)] text-[var(--bg)] shadow-md" : "bg-[var(--sf)] text-[var(--text)] hover:brightness-95")}>
                  <div className="text-[22px] w-8 flex-shrink-0 font-bold text-center" style={{ fontFamily: f.family }}>Ag</div>
                  <span className="flex-1 text-[15px] font-semibold">{f.name}</span>
                  {font === f.id && <Check size={18} />}
                </button>
              ))}
            </div>
          )}
        </CardGroup>

        <SectionTitle title="Cylen" />
        <CardGroup>
          <CardItem icon={<Wand2 size={20} />} title="Customize Cylen" onClick={onViewAiSettings} />
          <CardItem icon={<Baby size={20} />} title="Kids Mode" />
          <CardItem icon={<ShieldAlert size={20} />} title="NSFW Preferences" border={false} />
        </CardGroup>

        <SectionTitle title="Voice" />
        <CardGroup>
          <CardItem icon={<Volume2 size={20} />} title="Voice" subtitle="Ara" />
          <CardItem icon={<Mic size={20} />} title="Dictation" border={false} />
        </CardGroup>

        <SectionTitle title="Data & Information" />
        <CardGroup>
          <CardItem icon={
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M5.26 9.77A7.2 7.2 0 0 1 12 4.8c1.73 0 3.29.62 4.51 1.64l3.37-3.37A12 12 0 0 0 12 0C7.27 0 3.2 2.7 1.16 6.65l4.1 3.12z"/>
              <path fill="#34A853" d="M16.04 18.01A7.18 7.18 0 0 1 12 19.2a7.2 7.2 0 0 1-6.73-4.57l-4.1 3.1A12 12 0 0 0 12 24c2.93 0 5.63-1.06 7.7-2.8l-3.66-3.19z"/>
              <path fill="#4A90D9" d="M19.7 21.2A12 12 0 0 0 24 12c0-.72-.07-1.42-.19-2.1H12v4.46h6.69a5.7 5.7 0 0 1-2.65 3.65l3.66 3.19z"/>
              <path fill="#FBBC05" d="M5.27 14.63A7.3 7.3 0 0 1 4.8 12c0-.91.16-1.78.45-2.59L1.15 6.3A12 12 0 0 0 0 12c0 1.93.46 3.76 1.16 5.42l4.1-3.1z"/>
            </svg>
          } title="Akun Google" />
          <CardItem icon={<Shield size={20} />} title="Keamanan" />
          <CardItem icon={<FileText size={20} />} title="Memori Cylen" onClick={onViewMemory} />
          <CardItem icon={<Download size={20} />} title="Ekspor Data" border={false} />
        </CardGroup>

        {user && (
          <div className="mx-4 mt-6">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-[var(--sf)] rounded-[24px] hover:bg-red-500/10 transition-colors group">
              <LogOut size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
              <span className="text-[15px] font-bold text-red-500">Log out</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
