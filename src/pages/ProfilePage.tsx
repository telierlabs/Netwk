import React, { useState, useEffect } from 'react';
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
  BrainCircuit 
} from 'lucide-react';
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

  // Helper Components untuk menjaga kebersihan kode
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
    <main className="flex-1 overflow-y-auto bg-[var(--bg)]" style={{ minHeight: 0 }}>
      <div className="max-w-2xl mx-auto pb-10">

        {/* Profile Header */}
        <div className="bg-[var(--sf)] rounded-[24px] p-4 flex items-center gap-4 mx-4 mt-2 border border-[var(--bd)]/50">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-[60px] h-[60px] rounded-full object-cover bg-[var(--bd)]" />
          ) : (
            <div className="w-[60px] h-[60px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center text-2xl font-bold">
              {user?.displayName?.[0] || 'T'}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
             <div className="font-bold text-[18px] text-[var(--text)] tracking-tight leading-none mb-1">
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

        {/* Account Section - Tombol Sign Out Selalu Muncul */}
        <SectionTitle title="Account" />
        <CardGroup>
          <CardItem 
            icon={<LogOut size={20} className="text-red-500" />} 
            title={<span className="text-red-500">Sign out</span>} 
            onClick={handleLogout} 
            border={false} 
            right={<div />} // Menghilangkan panah chevron agar terlihat seperti tombol aksi
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
    </main>
  );
};
