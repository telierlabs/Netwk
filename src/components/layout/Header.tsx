import React from 'react';
import { ArrowLeft, Video } from 'lucide-react';
import { View } from '../../types';
import { cn } from '../../lib/utils';

interface HeaderProps {
  view: View | string;
  onMenuClick: () => void;
  onBackClick: () => void;
  onNewChatClick: () => void;
  onZoomClick?: () => void; // 🔥 TAMBAHIN INI
  isCanvasActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  view, onMenuClick, onBackClick, onNewChatClick, onZoomClick, isCanvasActive
}) => {
  return (
    <header className={cn(
      "grid grid-cols-[auto_1fr_auto] items-center px-4 bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-500 ease-in-out border-b border-transparent",
      isCanvasActive ? "h-10 opacity-60 py-1 border-[var(--bd)]" : "py-4"
    )}>
      {/* KIRI */}
      <button
        onClick={view === 'chat' ? onMenuClick : onBackClick}
        className="p-1 transition-colors active:scale-90"
      >
        {view === 'chat' ? (
          <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
            <path d="M2 4L11 1L20 4" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 14L11 17L20 14" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <ArrowLeft size={22} strokeWidth={2.5} />
        )}
      </button>

      {/* TENGAH */}
      <div className="flex justify-center">
        {view === 'chat' && (
          <h1 className={cn(
            "font-semibold tracking-tight transition-all duration-500",
            isCanvasActive ? "text-sm" : "text-base"
          )}>
            Cylen AI
          </h1>
        )}
        {(view === 'group-list' || view === 'group-chat') && (
          <h1 className="text-base font-semibold tracking-tight">
            {view === 'group-list' ? 'Grup AI' : 'Diskusi Grup'}
          </h1>
        )}
        {view === 'profile' && <h1 className="text-base font-semibold">Profil & Pengaturan</h1>}
        {view === 'saved' && <h1 className="text-base font-semibold">Tersimpan</h1>}
      </div>

      {/* KANAN */}
      <div className="flex items-center gap-3">
        {view === 'group-chat' && (
          <button 
            onClick={onZoomClick} // 🔥 SEKARANG UDAH NYAMBUNG SAKLARNYA
            className="p-1 text-[var(--text)] hover:opacity-70 active:scale-90 transition-all"
            title="Start Zoom Meeting"
          >
            <Video size={20} strokeWidth={2.2} />
          </button>
        )}

        <button
          onClick={onNewChatClick}
          className="p-1 transition-all active:scale-90"
          title="Chat Baru"
        >
          <svg width="20" height="20" viewBox="0 0 17 17" fill="none">
            <path d="M11 2L14 5L5 14L2 14L2 11L11 2Z" stroke="var(--text)" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M1 17H13" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
};
