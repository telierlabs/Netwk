import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Search, User, Settings, Bookmark, Users, ChevronsRight, ChevronsLeft, MessageSquare, PenSquare, Clock } from 'lucide-react';
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
  onViewSaved: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
  onViewTasks: () => void; // 🔥 Ditambahkan
}

// ── SIDEBAR CONTENT (khusus Desktop) ──
const SidebarContent: React.FC<{
  collapsed: boolean;
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}> = ({
  collapsed, chatSessions, activeChatId,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat,
  onToggleCollapse, onClose
}) => {
  const [search, setSearch] = useState('');
  const filtered = chatSessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const navItem = (icon: React.ReactNode, label: string, onClick: () => void, tip?: string) => (
    <button
      onClick={onClick}
      title={collapsed ? (tip || label) : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]",
        collapsed && "justify-center px-2"
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-[13.5px] font-medium">{label}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center px-3 py-4 gap-2", collapsed ? "justify-center flex-col" : "justify-between")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "flex-col gap-1")}>
          <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--at)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)]">Cylen AI</span>}
        </div>

        {onToggleCollapse && (
          <button onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors">
            {collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}
          </button>
        )}
        {onClose && !onToggleCollapse && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors">
            <ChevronsLeft size={18}/>
          </button>
        )}
      </div>

      <div className="px-3 mb-2">
        <button
          onClick={onNewChat}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl transition-opacity hover:opacity-85",
            collapsed && "justify-center px-2"
          )}
        >
          <PenSquare size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-semibold">Chat Baru</span>}
        </button>
      </div>

      <div className="px-2 flex flex-col gap-0.5">
        {navItem(<Search size={16}/>, 'Cari', onViewSearch)}
        {navItem(<MessageSquare size={16}/>, 'Chat', onSelectChat.bind(null, activeChatId))}
        {navItem(<Users size={16}/>, 'Grup AI', onViewGroup)}
        {navItem(<Bookmark size={16}/>, 'Tersimpan', onViewSaved)}
      </div>

      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}>
          <div className="flex items-center gap-2 bg-[var(--sf)] rounded-xl px-3 py-2 mb-2">
            <Search size={13} className="text-[var(--mu)] flex-shrink-0"/>
            <input
              type="text"
              placeholder="Cari chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]"
            />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1">Riwayat</div>

          {filtered.map((session) => (
            <button key={session.id} onClick={() => onSelectChat(session.id)}
              className={cn(
                "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left",
                activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]"
              )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                activeChatId === session.id ? "bg-[var(--ac)]" : "bg-[var(--bd)]"
              )}/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{session.title}</p>
                <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">
                  {session.messages[session.messages.length - 1]?.content.slice(0, 40)}...
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {collapsed && <div className="flex-1"/>}

      <div className="px-3 pb-4 flex-shrink-0">
        <button onClick={onViewProfile}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors",
            collapsed && "justify-center px-2"
          )}>
          <div className="w-8 h-8 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0">
            <User size={15} className="text-[var(--at)]"/>
          </div>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <div className="text-[13px] font-semibold text-[var(--text)] truncate">Profil & Pengaturan</div>
            </div>
          )}
          {!collapsed && <Settings size={14} className="text-[var(--mu)] flex-shrink-0"/>}
        </button>
      </div>
    </div>
  );
};

// ── MOBILE SIDEBAR CONTENT ──
const MobileSidebarContent: React.FC<{
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onClose: () => void;
  onNewChat: () => void;
  onViewTasks: () => void; // 🔥 Ditambahkan
}> = ({
  chatSessions, activeChatId,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onClose, onNewChat, onViewTasks
}) => {
  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">

      <div className="px-6 pt-10 pb-8 flex items-center justify-between">
        <button
          onClick={() => { onViewProfile(); onClose(); }}
          className="flex items-center gap-4 active:scale-95 transition-transform text-left"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--text)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <User size={26} className="text-[var(--bg)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[var(--text)] tracking-tight leading-tight">User Premium</span>
            <span className="text-[13px] text-[var(--mu)] mt-0.5">user@cylen.ai</span>
          </div>
        </button>
        <button 
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)] hover:opacity-70 transition-opacity"
        >
          <ChevronsRight size={28} strokeWidth={2.2} />
        </button>
      </div>

      {/* 🔥 TOMBOL TASKS AKTIF */}
      <div className="px-5 mb-6 mt-1">
        <button 
          onClick={() => { onViewTasks(); onClose(); }} 
          className="w-full flex items-center gap-3 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-[20px] px-5 py-4 transition-colors text-left active:scale-[0.98]"
        >
          <Clock size={20} className="text-[var(--text)]" />
          <span className="text-[16px] font-bold text-[var(--text)]">Tasks</span>
        </button>
      </div>

      <div className="px-3 mb-4 flex flex-col gap-1">
        <button
          onClick={() => { onViewGroup(); onClose(); }}
          className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--sf)] rounded-[20px] transition-colors text-left"
        >
          <Users size={22} className="text-[var(--text)] opacity-80" />
          <span className="text-[16px] font-medium text-[var(--text)]">Grup AI</span>
        </button>

        <button
          onClick={() => { onViewSaved(); onClose(); }}
          className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--sf)] rounded-[20px] transition-colors text-left"
        >
          <Bookmark size={22} className="text-[var(--text)] opacity-80" />
          <span className="text-[16px] font-medium text-[var(--text)]">Tersimpan</span>
        </button>
      </div>

      <div className="px-3 flex-1 overflow-y-auto min-h-0" style={{scrollbarWidth:'none'}}>
        <div className="flex items-center justify-between px-4 mb-2 mt-2">
          <span className="text-[14px] text-[var(--mu)] font-medium">Conversations</span>
          <ChevronRight size={16} className="text-[var(--mu)] opacity-50 rotate-90" />
        </div>
        
        <div className="flex flex-col gap-1 pb-4">
          {chatSessions.length === 0 && (
            <div className="px-4 py-4 text-[15px] text-[var(--mu)]">Belum ada riwayat chat.</div>
          )}
          {chatSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => { onSelectChat(session.id); onClose(); }}
              className="w-full flex flex-col px-4 py-4 rounded-[20px] hover:bg-[var(--sf)] transition-colors text-left relative group"
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn(
                  "text-[16px] truncate max-w-[85%] transition-colors", 
                  activeChatId === session.id ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)]"
                )}>
                  {session.title}
                </span>
              </div>
              <span className="text-[13px] text-[var(--mu)] mt-1.5">
                {session.messages[session.messages.length - 1]?.content.slice(0, 35)}...
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 pb-6 flex items-center gap-3 bg-[var(--bg)] flex-shrink-0">
        <button
          onClick={() => { onViewSearch(); onClose(); }}
          className="flex-1 flex items-center gap-3 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-full px-5 py-3.5 transition-colors text-left"
        >
          <Search size={22} className="text-[var(--mu)] flex-shrink-0" />
          <span className="text-[16px] text-[var(--mu)] font-medium">Search</span>
        </button>
        <button onClick={() => { onViewProfile(); onClose(); }} className="p-3.5 hover:bg-[var(--sf)] rounded-full text-[var(--text)] transition-colors"><Settings size={24} /></button>
        <button onClick={() => { onNewChat(); onClose(); }} className="p-3.5 hover:bg-[var(--sf)] rounded-full text-[var(--text)] transition-colors"><PenSquare size={24} /></button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen, onClose, chatSessions, activeChatId, onSelectChat,
  onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat, onViewTasks
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const sharedProps = { chatSessions, activeChatId, onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat };

  return (
    <>
      <aside className="hidden md:flex flex-col flex-shrink-0 border-r border-[var(--bd)] bg-[var(--sf)] transition-all duration-250" style={{ width: collapsed ? 64 : 260, minHeight: '100dvh' }}>
        <SidebarContent {...sharedProps} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
      </aside>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}} onClick={onClose} className="fixed inset-0 bg-black/40 z-[190] md:hidden" />
            <motion.div initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{duration:0.18, ease:'easeOut'}} className="fixed inset-y-0 left-0 w-full md:max-w-sm bg-[var(--bg)] z-[200] flex flex-col shadow-2xl md:hidden">
              <MobileSidebarContent {...sharedProps} onClose={onClose} onViewTasks={onViewTasks} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
