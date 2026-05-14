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
  onToggleGhostMode?: () => void;
  onZoomClick?: () => void;
  isCanvasActive?: boolean;
  isEmptyChat?: boolean;
  isTemporary?: boolean;
  activeChatTitle?: string; // <-- Tambahan Prop Baru
}

export const Header: React.FC<HeaderProps> = ({
  view, onMenuClick, onBackClick, onNewChatClick, onNewTempChatClick,
  onToggleGhostMode, isCanvasActive, isEmptyChat, isTemporary,
  activeChatTitle = "Cylen" // <-- Default "Cylen"
}) => {
  if (view === 'group-list' || view === 'group-chat' || view === 'group-profile' || view === 'saved') {
    return null;
  }

  return (
    <header
      className={cn(
        "flex-shrink-0 grid grid-cols-[auto_1fr_auto] items-center px-4 z-50 transition-[height,padding,opacity,transform] duration-300 ease-out outline-none [-webkit-tap-highlight-color:transparent]",
        "backdrop-blur-2xl backdrop-saturate-150 border-b-[1px] border-solid shadow-[0_4px_24px_rgba(0,0,0,0.03)]",
        isTemporary ? "border-[var(--text)]/10" : "border-gray-500/20",
        isCanvasActive ? "h-10 opacity-80 py-1" : "py-3"
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg) 65%, transparent)'
      }}
    >
      {/* ─── LEFT: Hamburger / Back ─── */}
      <button
        onClick={view === 'chat' ? onMenuClick : onBackClick}
        className="p-2 -ml-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
      >
        {view === 'chat' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-[var(--text)]">
            <path d="M4 9h16M4 15h16"/>
          </svg>
        ) : (
          <ArrowLeft size={24} strokeWidth={2.5} className="text-[var(--text)]"/>
        )}
      </button>

      {/* ─── CENTER: Title ─── */}
      <div className="flex flex-col items-center justify-center outline-none overflow-hidden">
        {view === 'chat' && (
          <div className="flex items-center gap-2 max-w-[50vw]">
            <h1 className={cn(
              "font-bold tracking-tight transition-[font-size] duration-300 text-[var(--text)] truncate",
              isCanvasActive ? "text-[14px]" : "text-[16px]"
            )}>
              {activeChatTitle}
            </h1>
            {isTemporary && (
              <span className="text-[10px] font-bold bg-[var(--text)]/10 text-[var(--text)]/70 border border-[var(--text)]/20 px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-200 shrink-0">
                Mode Hantu
              </span>
            )}
          </div>
        )}
        {view === 'profile' && <h1 className="text-[16px] font-bold text-[var(--text)]">Profil & Pengaturan</h1>}
      </div>

      {/* ─── RIGHT: Actions ─── */}
      <div className="flex items-center gap-2 outline-none">
        {view === 'chat' && (
          isEmptyChat ? (
            <button
              onClick={onToggleGhostMode}
              className="p-2 -mr-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
            >
              {isTemporary ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
                  <path d="M9 10h.01" stroke="var(--bg)" strokeWidth="3"/><path d="M15 10h.01" stroke="var(--bg)" strokeWidth="3"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                  <path d="M9 10h.01"/><path d="M15 10h.01"/>
                  <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={onNewChatClick}
              className="p-2 -mr-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
            >
              <SquarePen size={24} strokeWidth={2.2} className="text-[var(--text)]"/>
            </button>
          )
        )}

        {view !== 'chat' && (
          <button
            onClick={onNewChatClick}
            className="p-2 -mr-2 transition-transform duration-200 hover:bg-[var(--text)]/10 rounded-xl active:scale-95 text-[var(--text)] outline-none [-webkit-tap-highlight-color:transparent]"
          >
            <SquarePen size={24} strokeWidth={2.2} className="text-[var(--text)]"/>
          </button>
        )}
      </div>
    </header>
  );
};
