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
          className="p-2 hover:bg-[var(--sf)] rounded-xl transition-colors"
        >
          {view === 'chat' ? (
            <div className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-6 bg-[var(--text)] rounded-full" />
              <span className="block h-0.5 w-4 bg-[var(--text)] rounded-full" />
            </div>
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
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs">
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
          className="p-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl shadow-lg hover:scale-105 transition-all flex items-center justify-center"
          title="Chat Baru"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
