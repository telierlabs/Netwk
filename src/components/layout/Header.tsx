import React from 'react';
import { ArrowLeft, SquarePen } from 'lucide-react';
import { View } from '../../types';
import { cn } from '../../lib/utils';

interface HeaderProps {
  view: View | string;
  onMenuClick: () => void;
  onBackClick: () => void;
  onNewChatClick: () => void;
  onNewTempChatClick?: () => void;
  onZoomClick?: () => void;
  isCanvasActive?: boolean;
  isEmptyChat?: boolean; 
  isTemporary?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  view, onMenuClick, onBackClick, onNewChatClick, onNewTempChatClick, isCanvasActive, isEmptyChat, isTemporary
}) => {
  return (
    <header 
      className={cn(
        "flex-shrink-0 grid grid-cols-[auto_1fr_auto] items-center px-4 z-50 transition-[height,padding,opacity,transform] duration-300 ease-out outline-none [-webkit-tap-highlight-color:transparent]", 
        // 🔥 FIX KACA BLUR: backdrop-blur dewa!
        "backdrop-blur-2xl backdrop-saturate-150 border-b-[1px] border-solid border-gray-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.03)]", 
        isCanvasActive ? "h-10 opacity-80 py-1" : "py-3" 
      )}
      // 🔥 FIX FATAL WARNA SOLID: Pake color-mix biar dipaksa transparan 65% di browser apapun!
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg) 65%, transparent)' }}
    >
      <button 
        onClick={view === 'chat' ? onMenuClick : onBackClick} 
        className="p-2 -ml-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
      >
        {view === 'chat' ? (
          // 🔥 FIX IKON HAMBURGER: Murni 2 Garis Elegan
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-[var(--text)]">
            <path d="M4 9h16M4 15h16"/>
          </svg>
        ) : (
          <ArrowLeft size={24} strokeWidth={2.5} className="text-[var(--text)]"/>
        )}
      </button>

      <div className="flex flex-col items-center justify-center outline-none">
        {view === 'chat' && (
          <div className="flex items-center gap-2">
            <h1 className={cn("font-bold tracking-tight transition-[font-size] duration-300 text-[var(--text)]", isCanvasActive ? "text-[14px]" : "text-[16px]")}>Cylen</h1>
            {isTemporary && (
              <span className="text-[10px] font-bold bg-[var(--text)] text-[var(--bg)] px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-200 opacity-80">
                Mode Hantu
              </span>
            )}
          </div>
        )}
        {(view === 'group-list' || view === 'group-chat') && <h1 className="text-[16px] font-bold tracking-tight text-[var(--text)]">{view === 'group-list' ? 'Grup AI' : 'Diskusi Grup'}</h1>}
        {view === 'profile' && <h1 className="text-[16px] font-bold text-[var(--text)]">Profil & Pengaturan</h1>}
        {view === 'saved' && <h1 className="text-[16px] font-bold text-[var(--text)]">Disimpan</h1>}
      </div>

      <div className="flex items-center gap-2 outline-none">
        <button 
          onClick={isEmptyChat ? (isTemporary ? onNewChatClick : onNewTempChatClick) : onNewChatClick} 
          className="p-2 -mr-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
        >
          {isEmptyChat ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-opacity", isTemporary ? "opacity-100 text-[var(--text)]" : "opacity-50 text-[var(--text)]")}>
              <path d="M9 10h.01"/><path d="M15 10h.01"/>
              <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
            </svg>
          ) : (
            <SquarePen size={24} strokeWidth={2.2} className="text-[var(--text)]"/>
          )}
        </button>
      </div>
    </header>
  );
};
