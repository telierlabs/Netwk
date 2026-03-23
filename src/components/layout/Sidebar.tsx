import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Search, User, Settings, Bookmark, Layout, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatSession } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  chatSessions,
  activeChatId,
  onSelectChat,
  onViewProfile,
  onViewGroup
}) => {
  const [search, setSearch] = useState('');

  const filtered = chatSessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-y-0 left-0 w-full bg-[var(--bg)] z-50 flex flex-col shadow-2xl"
          >
            {/* X BUTTON */}
            <div className="flex justify-end px-4 pt-4 flex-shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-[var(--sf)] rounded-xl transition-colors text-[var(--text)]">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* SCROLL AREA */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4 flex flex-col gap-5 min-h-0">

              {/* SEARCH */}
              <div className="flex items-center gap-2 bg-[var(--sf)] rounded-2xl px-4 py-3">
                <Search size={15} className="text-[var(--mu)] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Cari percakapan..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-[var(--text)] placeholder:text-[var(--mu)]"
                />
              </div>

              {/* FITUR */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-2 px-1">Fitur</div>
                <div className="bg-[var(--sf)] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => { onViewGroup(); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-[13px] border-b border-[var(--bd)] hover:bg-[var(--bd)] transition-colors"
                  >
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-[10px] flex items-center justify-center flex-shrink-0">
                      <Users size={15} className="text-[var(--text)]" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left">Grup AI</span>
                    <ChevronRight size={14} className="text-[var(--mu)] opacity-40" />
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-[13px] border-b border-[var(--bd)] hover:bg-[var(--bd)] transition-colors">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-[10px] flex items-center justify-center flex-shrink-0">
                      <Bookmark size={15} className="text-[var(--text)]" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left">Tersimpan</span>
                    <ChevronRight size={14} className="text-[var(--mu)] opacity-40" />
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-[13px] hover:bg-[var(--bd)] transition-colors">
                    <div className="w-8 h-8 bg-[var(--bg)] rounded-[10px] flex items-center justify-center flex-shrink-0">
                      <Layout size={15} className="text-[var(--text)]" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-left">Artefak</span>
                    <ChevronRight size={14} className="text-[var(--mu)] opacity-40" />
                  </button>
                </div>
              </div>

              {/* RIWAYAT CHAT */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-2 px-1">Riwayat Chat</div>
                <div className="flex flex-col">
                  {filtered.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => { onSelectChat(session.id); onClose(); }}
                      className={cn(
                        "flex items-start gap-3 px-2 py-3 rounded-xl transition-colors text-left",
                        activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                        activeChatId === session.id ? "bg-[var(--ac)]" : "bg-[var(--bd)]"
                      )} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[var(--text)] truncate">{session.title}</h4>
                        <p className="text-xs text-[var(--mu)] truncate mt-0.5">
                          {session.messages[session.messages.length - 1]?.content.slice(0, 45)}...
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* BOTTOM USER */}
            <div className="px-4 pb-4 flex-shrink-0">
              <button
                onClick={() => { onViewProfile(); onClose(); }}
                className="w-full flex items-center gap-3 p-4 bg-[var(--ac)] text-[var(--at)] rounded-2xl"
              >
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User size={18} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">User Premium</div>
                  <div className="text-[10px] opacity-50">user@cylen.ai</div>
                </div>
                <Settings size={15} className="opacity-50" />
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
