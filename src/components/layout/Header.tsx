import React from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { View } from '../../types';

interface HeaderProps {
  view: View;
  onMenuClick: () => void;
  onBackClick: () => void;
  onNewChatClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  view,
  onMenuClick,
  onBackClick,
  onNewChatClick
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-4 border-b border-[var(--bd)] bg-[var(--bg)]/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={view === 'chat' ? onMenuClick : onBackClick} 
          className="p-2 transition-colors"
        >
          {view === 'chat' ? (
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
              <path d="M2 4L11 1L20 4" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 14L11 17L20 14" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <ArrowLeft size={24} />
          )}
        </button>
        {view === 'chat' && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)] text-xs">✦</div>
            <h1 className="text-lg font-medium tracking-tight">Cylen AI</h1>
          </div>
        )}
        {(view === 'group-list' || view === 'group-chat') && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)] text-xs">
              <Users size={14} />
            </div>
            <h1 className="text-lg font-semibold">
              {view === 'group-list' ? 'Grup AI' : 'Diskusi Grup'}
            </h1>
          </div>
        )}
        {view === 'profile' && <h1 className="text-lg font-semibold">Profil & Pengaturan</h1>}
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onNewChatClick}
          className="p-2 transition-all"
          title="Chat Baru"
        >
          <svg width="20" height="20" viewBox="0 0 17 17" fill="none">
            <path d="M11 2L14 5L5 14L2 14L2 11L11 2Z" stroke="var(--text)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M1 17H13" stroke="var(--text)" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
};
