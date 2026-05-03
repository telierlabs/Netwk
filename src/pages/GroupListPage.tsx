import React, { useState } from 'react';
import { 
  Users, Plus, Search, ChevronRight, MessageSquare, MoreVertical, Camera
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GroupSession } from '../types';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (title: string) => void;
  onNavigateProfile?: () => void; // Opsional buat ke halaman profil
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
    <main className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden">
      
      {/* ✅ HEADER BARU: PROFIL & SEARCH */}
      <div className="px-4 py-3 border-b border-[var(--bd)]/50 bg-[var(--bg)]/80 backdrop-blur-md flex items-center gap-3 sticky top-0 z-20">
        
        {/* Tombol Profil Kiri Atas */}
        <div className="relative cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0" onClick={onNavigateProfile}>
          <div className="w-10 h-10 rounded-full bg-[var(--sf)] border border-[var(--bd)] overflow-hidden flex items-center justify-center">
            <img src="/Cylen.jpg" alt="Profile" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
            <Users size={22} className="text-[var(--mu)] absolute -z-10" />
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bg)] rounded-full" />
        </div>

        {/* Kotak Search Lebar */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--mu)]" strokeWidth={2.5} />
          <input 
            type="text" 
            placeholder="Cari grup AI..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--sf)] border border-[var(--bd)] rounded-[16px] text-[14px] font-medium outline-none focus:ring-1 focus:ring-[var(--text)]/20 transition-all placeholder:text-[var(--mu)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isCreating ? (
          <div className="p-5 border-b border-[var(--bd)] bg-[var(--sf)]/30 animate-in slide-in-from-top duration-300">
            <h3 className="text-[11px] font-black mb-3 uppercase tracking-widest text-[var(--mu)]">Buat Grup Baru</h3>
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text" 
                placeholder="Masukkan nama grup..." 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-4 py-2.5 bg-[var(--bg)] border border-[var(--bd)] rounded-[14px] text-[14px] font-semibold outline-none focus:border-[var(--text)]/30 transition-colors"
              />
              <button 
                onClick={handleCreate}
                className="px-5 py-2.5 bg-[var(--text)] text-[var(--bg)] rounded-[14px] text-[13px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                Buat
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-2.5 text-[var(--mu)] hover:text-red-500 transition-colors rounded-[14px] hover:bg-red-500/10 active:scale-95"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            disabled={groups.length >= 5}
            className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]/50 group outline-none"
          >
            <div className="w-12 h-12 bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-full flex items-center justify-center group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all">
              <Plus size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-[15px] font-bold text-[var(--text)]">Buat Grup Baru</div>
              <div className="text-[12px] font-medium text-[var(--mu)] mt-0.5">Maksimal 5 grup aktif ({groups.length}/5)</div>
            </div>
          </button>
        )}

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center opacity-60">
            <div className="w-20 h-20 bg-[var(--sf)] rounded-[24px] flex items-center justify-center text-[var(--mu)] mb-5 rotate-12">
              <MessageSquare size={36} strokeWidth={2} />
            </div>
            <h3 className="text-[18px] font-black tracking-tight mb-2">Kosong Melompong</h3>
            <p className="text-[13px] font-medium text-[var(--mu)] max-w-[260px] leading-relaxed">
              Pencet tombol di atas buat mulai diskusi seru bareng berbagai AI sekaligus.
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const lastMsg = group.messages[group.messages.length - 1];
            return (
              <button 
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]/50 group outline-none"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 bg-[var(--text)] rounded-[20px] flex items-center justify-center text-[var(--bg)] text-2xl font-black shadow-sm group-hover:scale-[1.03] transition-transform">
                    {group.title[0]}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-[var(--sf)] text-[var(--text)] rounded-full border-2 border-[var(--bg)] flex items-center justify-center shadow-sm">
                    <Users size={12} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[16px] font-bold text-[var(--text)] truncate pr-2 tracking-tight">{group.title}</h4>
                    <span className="text-[11px] font-bold text-[var(--mu)] uppercase tracking-wider flex-shrink-0">
                      {lastMsg ? lastMsg.timestamp.split(' ')[0] : 'Baru'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-[var(--mu)] truncate">
                    {lastMsg?.senderName && (
                      <span className="font-bold text-[var(--text)]/80 flex-shrink-0">{lastMsg.senderName}:</span>
                    )}
                    <span className="truncate">{lastMsg ? lastMsg.content : 'Belum ada obrolan...'}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Tombol Float Kanan Bawah Buat HP */}
      <div className="fixed bottom-6 right-6 md:hidden z-30">
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
