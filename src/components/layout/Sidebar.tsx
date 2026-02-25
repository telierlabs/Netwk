import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Search, User, Settings, LogOut } from 'lucide-react';
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
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-full bg-[var(--bg)] z-50 flex flex-col shadow-2xl border-r border-[var(--bd)]"
          >
            <div className="border-b border-[var(--bd)]">
              <div className="p-6 flex items-center justify-between w-full max-w-3xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)] text-lg">✦</div>
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">Cylen AI</div>
                    <div className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">History & Profile</div>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 w-full max-w-3xl mx-auto">
              <button 
                onClick={onViewGroup}
                className="w-full flex items-center gap-4 p-4 border-1.5 border-[var(--bd)] rounded-2xl bg-[var(--cd)] hover:border-[var(--ac)] transition-all text-left group"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--ac)] transition-colors">Grup AI</div>
                  <div className="text-[11px] text-[var(--mu)] mt-0.5">Chat bareng beberapa AI sekaligus</div>
                </div>
                <ChevronRight size={16} className="text-[var(--mu)]" />
              </button>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mu)]" />
                <input 
                  type="text" 
                  placeholder="Cari percakapan..." 
                  className="w-full pl-10 pr-4 py-3 bg-[var(--sf)] border-none rounded-2xl text-sm focus:ring-1 focus:ring-[var(--bd)] outline-none"
                />
              </div>

              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-2 mb-2">Recent Chats</h3>
                <div className="flex flex-col gap-1">
                  {chatSessions.map((session) => (
                    <button 
                      key={session.id} 
                      onClick={() => onSelectChat(session.id)}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl transition-colors text-left group",
                        activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 transition-colors",
                        activeChatId === session.id ? "bg-[var(--ac)]" : "bg-[var(--bd)] group-hover:bg-[var(--ac)]"
                      )} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[var(--text)] truncate">{session.title}</h4>
                        <p className="text-xs text-[var(--mu)] truncate">
                          {session.messages[session.messages.length - 1]?.content.slice(0, 40)}...
                        </p>
                        <span className="text-[10px] text-[var(--mu)] font-mono opacity-50">{session.date}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--bd)]">
              <div className="p-6 w-full max-w-3xl mx-auto">
                <button 
                  onClick={onViewProfile}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--ac)] text-[var(--at)] shadow-lg"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">User Premium</div>
                    <div className="text-[10px] opacity-50">user@cylen.ai</div>
                  </div>
                  <Settings size={16} />
                </button>
                <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-[var(--mu)] hover:text-[var(--text)] transition-colors">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
