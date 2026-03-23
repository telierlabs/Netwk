import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ChevronRight, 
  MessageSquare, 
  MoreVertical,
  Camera
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GroupSession } from '../types';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (title: string) => void;
}

export const GroupListPage: React.FC<GroupListPageProps> = ({
  groups,
  onSelectGroup,
  onCreateGroup
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
      <div className="p-4 border-b border-[var(--bd)]">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mu)]" />
          <input 
            type="text" 
            placeholder="Cari grup..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--sf)] border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-[var(--bd)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isCreating ? (
          <div className="p-6 border-b border-[var(--bd)] bg-[var(--sf)] animate-in slide-in-from-top duration-300">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-[var(--mu)]">Buat Grup Baru</h3>
            <div className="flex gap-3">
              <input 
                autoFocus
                type="text" 
                placeholder="Nama grup..." 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 px-4 py-2.5 bg-[var(--bg)] border border-[var(--bd)] rounded-xl text-sm outline-none focus:border-[var(--ac)]"
              />
              <button 
                onClick={handleCreate}
                className="px-6 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl text-sm font-bold"
              >
                Buat
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-2.5 text-[var(--mu)] hover:text-red-500 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            disabled={groups.length >= 5}
            className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)] group"
          >
            <div className="w-12 h-12 bg-[var(--ac)] text-[var(--at)] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-bold">Buat Grup Baru</div>
              <div className="text-xs text-[var(--mu)]">Maksimal 5 grup ({groups.length}/5)</div>
            </div>
          </button>
        )}

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-[var(--sf)] rounded-full flex items-center justify-center text-[var(--mu)] mb-4">
              <Users size={40} />
            </div>
            <h3 className="text-lg font-bold mb-2">Belum ada grup</h3>
            <p className="text-sm text-[var(--mu)] max-w-xs">
              Buat grup baru untuk mulai berdiskusi dengan teman dan berbagai model AI.
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const lastMsg = group.messages[group.messages.length - 1];
            return (
              <button 
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)] group"
              >
                <div className="relative">
                  <div className="w-14 h-14 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)] text-xl font-bold shadow-md group-hover:scale-105 transition-transform">
                    {group.title[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--ac)] text-[var(--at)] rounded-full border-2 border-[var(--bg)] flex items-center justify-center">
                    <Users size={12} />
                  </div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-bold truncate pr-2">{group.title}</h4>
                    <span className="text-[10px] text-[var(--mu)] font-mono whitespace-nowrap">
                      {lastMsg?.timestamp.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--mu)] truncate">
                    {lastMsg?.senderName && (
                      <span className="font-bold text-[var(--text)] opacity-70">{lastMsg.senderName}:</span>
                    )}
                    <span className="truncate">{lastMsg?.content}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="fixed bottom-6 right-6 md:hidden">
        <button 
          onClick={() => setIsCreating(true)}
          className="w-14 h-14 bg-[var(--ac)] text-[var(--at)] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </main>
  );
};
