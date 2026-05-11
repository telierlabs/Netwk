import React, { useState } from 'react';
import { Search, MessageSquare, X, Plus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession } from '../types';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (title: string) => void;
  onNavigateProfile?: () => void;
  onBack?: () => void;
}

export const GroupListPage: React.FC<GroupListPageProps> = ({
  groups, onSelectGroup, onCreateGroup, onNavigateProfile, onBack
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

      {/* ─── HEADER ─── */}
      <div className="px-4 py-3 border-b border-[var(--bd)]/15 bg-[var(--bg)] sticky top-0 z-20">
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95 shrink-0"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-semibold text-[var(--text)]">Grup AI</h1>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text)]/35" strokeWidth={2} />
          <input
            type="text"
            placeholder="Cari grup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--sf)] rounded-full text-[14px] outline-none placeholder:text-[var(--text)]/30 text-[var(--text)] border border-transparent focus:border-[var(--bd)]/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 flex gap-2 border-b border-[var(--bd)]/15 bg-[var(--sf)]/20">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nama grup baru..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 px-4 py-2.5 bg-[var(--bg)] border border-[var(--bd)]/25 rounded-full text-[14px] font-medium outline-none text-[var(--text)] placeholder:text-[var(--text)]/30 focus:border-[var(--text)]/30 transition-colors"
                />
                <button
                  onClick={handleCreate}
                  className="px-5 py-2.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[13px] font-semibold active:scale-95 transition-transform"
                >
                  Buat
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-10 h-10 flex items-center justify-center text-[var(--text)]/40 hover:text-[var(--text)]/70 rounded-full hover:bg-[var(--sf)] transition-colors"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 bg-[var(--sf)] rounded-2xl flex items-center justify-center text-[var(--text)]/20 mb-4">
              <MessageSquare size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-[16px] font-semibold text-[var(--text)]/50 mb-1">Belum Ada Grup</h3>
            <p className="text-[13px] text-[var(--text)]/30 max-w-[220px] leading-relaxed">
              Ketuk tombol + di bawah untuk membuat grup AI baru.
            </p>
          </div>
        ) : (
          filteredGroups.map((group, idx) => {
            const lastMsg = group.messages[group.messages.length - 1];
            const aiCount = group.participants.filter(p => p.isAI).length;

            return (
              <motion.button
                key={group.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => onSelectGroup(group.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--sf)]/50 transition-colors border-b border-[var(--bd)]/10 active:bg-[var(--sf)]"
              >
                <div className="w-12 h-12 bg-[var(--text)] rounded-2xl flex items-center justify-center text-[var(--bg)] text-[16px] font-bold shrink-0">
                  {group.title[0]}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <h4 className="text-[15px] font-semibold text-[var(--text)] truncate pr-2">{group.title}</h4>
                    <span className="text-[11px] text-[var(--text)]/35 shrink-0">
                      {lastMsg?.timestamp?.split(' ')[0] || ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-[var(--text)]/45 truncate">
                    {lastMsg?.senderName && (
                      <span className="font-medium text-[var(--text)]/60 shrink-0">{lastMsg.senderName}:</span>
                    )}
                    <span className="truncate">{lastMsg?.content || 'Belum ada obrolan...'}</span>
                  </div>
                </div>
                {aiCount > 0 && (
                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--bd)]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[11px] font-medium text-[var(--text)]/50">{aiCount} AI</span>
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-30">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsCreating(true)}
          className="w-[52px] h-[52px] bg-[var(--text)] text-[var(--bg)] rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.22)] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus size={22} strokeWidth={2} />
        </motion.button>
      </div>
    </main>
  );
};
