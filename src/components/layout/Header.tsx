import React from 'react';
import { ArrowLeft, Video } from 'lucide-react';
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
  view, onMenuClick, onBackClick, onNewChatClick, onNewTempChatClick, onZoomClick, isCanvasActive, isEmptyChat, isTemporary
}) => {
  return (
    <header className={cn(
      "flex-shrink-0 grid grid-cols-[auto_1fr_auto] items-center px-4 z-20 transition-all duration-300 ease-out border-b border-[var(--text)]/5",
      "bg-[var(--bg)]/70 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--bg)]/40", // 🔥 INI RUMUS KACA GROK/APPLE
      isCanvasActive ? "h-10 opacity-80 py-1" : "py-4"
    )}>
      <button 
        onClick={view === 'chat' ? onMenuClick : onBackClick} 
        className="p-1.5 -ml-1.5 transition-all duration-200 hover:bg-[var(--text)]/10 rounded-lg active:scale-90 text-[var(--text)]"
      >
        {view === 'chat' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
        ) : (
          <ArrowLeft size={22} strokeWidth={2.5} />
        )}
      </button>

      <div className="flex flex-col items-center justify-center">
        {view === 'chat' && (
          <div className="flex items-center gap-2">
            <h1 className={cn("font-bold tracking-tight transition-all duration-300 text-[var(--text)]", isCanvasActive ? "text-[14px]" : "text-[16px]")}>Cylen</h1>
            {isTemporary && (
              <span className="text-[10px] font-bold bg-[var(--text)] text-[var(--bg)] px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-200">
                Mode Hantu
              </span>
            )}
          </div>
        )}
        {(view === 'group-list' || view === 'group-chat') && <h1 className="text-[16px] font-bold tracking-tight text-[var(--text)]">{view === 'group-list' ? 'Grup AI' : 'Diskusi Grup'}</h1>}
        {view === 'profile' && <h1 className="text-[16px] font-bold text-[var(--text)]">Profil & Pengaturan</h1>}
        {view === 'saved' && <h1 className="text-[16px] font-bold text-[var(--text)]">Tersimpan</h1>}
      </div>

      <div className="flex items-center gap-2">
        {view === 'group-chat' && (
          <button onClick={onZoomClick} className="p-1.5 transition-all duration-200 hover:bg-[var(--text)]/10 rounded-lg active:scale-90 text-[var(--text)]">
            <Video size={20} strokeWidth={2.2} />
          </button>
        )}
        
        <button 
          onClick={isTemporary ? onNewChatClick : (isEmptyChat ? onNewTempChatClick : onNewChatClick)} 
          className="p-1.5 -mr-1.5 transition-all duration-200 hover:bg-[var(--text)]/10 rounded-lg active:scale-90 text-[var(--text)]"
        >
          {isEmptyChat && !isTemporary ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
              <path d="M9 10h.01"/><path d="M15 10h.01"/>
              <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
};
