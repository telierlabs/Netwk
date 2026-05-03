import React, { useState } from 'react';
import { 
  Users, Search, MessageSquare, X 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GroupSession } from '../types';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (title: string) => void;
  onNavigateProfile?: () => void; 
}

export const GroupListPage: React.FC<GroupListPageProps> = ({
  groups, onSelectGroup, onCreateGroup, onNavigateProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const filteredGroups = groups.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsCreating(false);
  };

  return (
    <main className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden outline-none">
      
      {/* ✅ HEADER: PROFIL & SEARCH ELEGAN (BENTUK PILL) */}
      <div className="px-4 py-3 border-b border-[var(--bd)]/50 bg-[var(--bg)]/80 backdrop-blur-xl flex items-center gap-3 sticky top-0 z-20 outline-none">
        
        <div className="relative cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 outline-none [-webkit-tap-highlight-color:transparent]" onClick={onNavigateProfile}>
          <div className="w-10 h-10 rounded-full bg-[var(--sf)] border border-[var(--bd)] overflow-hidden flex items-center justify-center shadow-sm">
            <img src="/Cylen.jpg" alt="Profile" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
            <Users size={22} className="text-[var(--mu)] absolute -z-10" />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bg)] rounded-full" />
        </div>

        <div className="relative flex-1 outline-none">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={18} className="text-[var(--mu)]" strokeWidth={2.5} />
          </div>
          <input 
            type="text" 
            placeholder="Cari grup AI..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--sf)]/80 hover:bg-[var(--sf)] focus:bg-[var(--sf)] border border-transparent focus:border-[var(--bd)] rounded-full text-[14px] font-medium outline-none transition-all placeholder:text-[var(--mu)] shadow-sm [-webkit-tap-highlight-color:transparent]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto outline-none">
        
        {/* ✅ PANEL BUAT GRUP MUNCUL PAS ICON PESAN DIKLIK */}
        {isCreating && (
          <div className="p-4 border-b border-[var(--bd)]/50 bg-[var(--bg)] animate-in slide-in-from-top duration-300 outline-none">
            <h3 className="text-[12px] font-bold mb-2 text-[var(--text)] outline-none">Nama Grup Baru</h3>
            <div className="flex gap-2 outline-none">
              <input 
                autoFocus
                type="text" 
                placeholder="Masukkan nama grup..." 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-4 py-2.5 bg-[var(--sf)] border border-[var(--bd)] rounded-full text-[14px] font-semibold outline-none focus:border-[var(--ac)] transition-colors [-webkit-tap-highlight-color:transparent]"
              />
              <button 
                onClick={handleCreate}
                className="px-5 py-2.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-md outline-none [-webkit-tap-highlight-color:transparent]"
              >
                Buat
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-2.5 text-[var(--mu)] hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10 active:scale-95 outline-none [-webkit-tap-highlight-color:transparent]"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* ✅ LIST GRUP ATAU TAMPILAN KOSONG */}
        {filteredGroups.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center opacity-60 outline-none">
            <div className="w-20 h-20 bg-[var(--sf)] rounded-[24px] flex items-center justify-center text-[var(--mu)] mb-5 rotate-12 outline-none">
              <MessageSquare size={36} strokeWidth={2} />
            </div>
            <h3 className="text-[18px] font-black tracking-tight mb-2 outline-none">Belum Ada Grup</h3>
            <p className="text-[13px] font-medium text-[var(--mu)] max-w-[260px] leading-relaxed outline-none">
              Ketuk ikon pesan di pojok bawah untuk membuat grup AI baru.
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const lastMsg = group.messages[group.messages.length - 1];
            return (
              <button 
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]/30 group outline-none [-webkit-tap-highlight-color:transparent]"
              >
                <div className="relative flex-shrink-0 outline-none">
                  <div className="w-14 h-14 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-2xl font-black shadow-sm group-hover:scale-[1.03] transition-transform outline-none">
                    {group.title[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--sf)] text-[var(--text)] rounded-full border-2 border-[var(--bg)] flex items-center justify-center shadow-sm outline-none">
                    <Users size={12} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0 flex flex-col justify-center outline-none">
                  <div className="flex items-center justify-between mb-1 outline-none">
                    <h4 className="text-[16px] font-bold text-[var(--text)] truncate pr-2 tracking-tight outline-none">{group.title}</h4>
                    <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider flex-shrink-0 outline-none">
                      {lastMsg ? lastMsg.timestamp.split(' ')[0] : 'Baru'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--mu)] truncate outline-none">
                    {lastMsg?.senderName && (
                      <span className="font-bold text-[var(--text)]/80 flex-shrink-0 outline-none">{lastMsg.senderName}:</span>
                    )}
                    <span className="truncate outline-none">{lastMsg ? lastMsg.content : 'Belum ada obrolan...'}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ✅ FLOATING ACTION BUTTON (FAB) BUAT HP & DESKTOP */}
      <div className="fixed bottom-6 right-6 z-30 outline-none">
        <button 
          onClick={() => setIsCreating(true)}
          className="w-14 h-14 bg-[var(--text)] text-[var(--bg)] rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none [-webkit-tap-highlight-color:transparent]"
        >
          <MessageSquare size={24} strokeWidth={2.5} className="mr-0.5 mt-0.5" />
        </button>
      </div>
    </main>
  );
};
