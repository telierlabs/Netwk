import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { View } from '../../types';
import { cn } from '../../lib/utils'; // Pastikan import cn

interface HeaderProps {
  view: View | string;
  onMenuClick: () => void;
  onBackClick: () => void;
  onNewChatClick: () => void;
  isCanvasActive?: boolean; // 🔥 PROP BARU BUAT CANVAS MODE
}

export const Header: React.FC<HeaderProps> = ({
  view, onMenuClick, onBackClick, onNewChatClick, isCanvasActive
}) => {
  return (
    <header className={cn(
      "grid grid-cols-[auto_1fr_auto] items-center px-4 bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-500 ease-in-out border-b border-transparent",
      isCanvasActive ? "h-10 opacity-60 py-1 border-[var(--bd)]" : "py-4" // 🔥 HEADER MENGECIL PAS CANVAS AKTIF
    )}>
      {/* KIRI */}
      <button
        onClick={view === 'chat' ? onMenuClick : onBackClick}
        className="p-1 transition-colors"
      >
        {view === 'chat' ? (
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M2 4L11 1L20 4" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 14L11 17L20 14" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <ArrowLeft size={22} />
        )}
      </button>

      {/* TENGAH */}
      <div className="flex justify-center">
        {view === 'chat' && (
          <h1 className={cn(
            "font-semibold tracking-tight transition-all duration-500",
            isCanvasActive ? "text-sm" : "text-base" // 🔥 TEKS MENGECIL
          )}>
            Cylen AI
          </h1>
        )}
        {(view === 'group-list' || view === 'group-chat') && (
          <h1 className="text-base font-semibold">
            {view === 'group-list' ? 'Grup AI' : 'Diskusi Grup'}
          </h1>
        )}
        {view === 'profile' && <h1 className="text-base font-semibold">Profil & Pengaturan</h1>}
        {view === 'saved' && <h1 className="text-base font-semibold">Tersimpan</h1>}
      </div>

      {/* KANAN */}
      <button
        onClick={onNewChatClick}
        className="p-1 transition-all"
        title="Chat Baru"
      >
        <svg width="20" height="20" viewBox="0 0 17 17" fill="none">
          <path d="M11 2L14 5L5 14L2 14L2 11L11 2Z" stroke="var(--text)" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M1 17H13" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      </button>
    </header>
  );
};
