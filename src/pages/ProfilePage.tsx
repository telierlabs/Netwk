import React, { useState, useEffect } from 'react';
import { Palette, ChevronRight, Check, Shield, Zap, Download, FileText, LogOut, Smartphone, Wand2, Network, BarChart3, BrainCircuit } from 'lucide-react';
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
  showToast, onViewAppearance, onViewAiSettings, onViewUsage, onViewIntegrations, onViewSecurity, onViewExport, onUpgradeClick, onViewMemory
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => { setUser(u); });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => { try { await signInWithGoogle(); showToast('Berhasil masuk'); } catch { showToast('Gagal masuk'); } };
  const handleLogout = async () => { try { await logout(); showToast('Berhasil keluar'); } catch { showToast('Gagal keluar'); } };

  const SectionTitle = ({ title }: { title: string }) => <div className="text-[14px] font-bold text-[var(--mu)] mb-2 mt-8 px-6">{title}</div>;
  const CardGroup = ({ children }: { children: React.ReactNode }) => <div className="bg-[var(--sf)] rounded-[24px] mx-4 flex flex-col overflow-hidden">{children}</div>;
  const CardItem = ({ icon, title, subtitle, onClick, right, border = true }: any) => (
    <button onClick={onClick} className={cn("w-full flex items-center gap-4 px-5 py-[18px] hover:bg-[var(--bd)] transition-colors text-left", border && "border-b border-[var(--bd)]")}>
      <div className="text-[var(--text)] opacity-80 flex-shrink-0">{icon}</div>
      <div className="flex-1 flex flex-col min-w-0"><span className="text-[16px] font-medium text-[var(--text)] leading-tight">{title}</span>{subtitle && <span className="text-[13px] text-[var(--mu)] mt-1">{subtitle}</span>}</div>
      {right !== null && (right ?? <ChevronRight size={18} className="text-[var(--mu)] opacity-40" />)}
    </button>
  );

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)]" style={{ minHeight: 0 }}>
      <div className="max-w-2xl mx-auto pb-10">

        {/* Profile Header */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2">
          {user?.photoURL ? <img src={user.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)]" /> : <div className="w-[60px] h-[60px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center text-2xl font-bold">{user?.displayName?.[0] || 'T'}</div>}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1">{user?.displayName || 'Telier Labs'}</div>
             <div className="text-[14px] text-[var(--mu)] truncate">{user?.email || 'telierlabsx@gmail.com'}</div>
             {!user && <button onClick={handleLogin} className="mt-2 self-start px-4 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[13px] font-bold">Masuk dengan Google</button>}
          </div>
        </div>

        {/* Premium Banner */}
        <div className="bg-[var(--sf)] rounded-[24px] p-5 flex items-center justify-between mx-4 mt-3">
          <div className="flex items-center gap-4"><Zap size={22} className="text-[var(--text)]" /><div className="flex flex-col"><span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Cylen Premium</span><span className="text-[13px] text-[var(--mu)] mt-0.5">Akses Intelijen Tanpa Batas</span></div></div>
          <button onClick={onUpgradeClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-full text-[14px] transition-colors shadow-sm">Upgrade</button>
        </div>

        {/* Menus */}
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

        {/* Sign Out Button (Grok Style) */}
        {user && (
          <div className="mt-6">
            <CardGroup>
              <CardItem 
                icon={<LogOut size={20} />} 
                title="Sign out" 
                onClick={handleLogout} 
                border={false} 
                right={<div />} // Ngilangin panah (chevron)
              />
            </CardGroup>
          </div>
        )}

        {/* Footer Cylen Label (Grok Style) */}
        <div className="flex flex-col items-center justify-center gap-2 mt-10 mb-12 text-[var(--mu)]">
          <div className="flex items-center gap-2 opacity-80">
            {/* Custom Logo Minimalis Cylen */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span className="font-mono text-[14px] font-medium tracking-tight">1.1.58-release.00</span>
          </div>
          <div className="text-[13px] font-medium">
            New Version is Available: <span onClick={() => showToast('Memperbarui Cylen...')} className="underline cursor-pointer hover:text-[var(--text)] transition-colors">Update</span>
          </div>
        </div>

      </div>
    </main>
  );
};
