import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Search, User, Settings, Bookmark, Users, ChevronsRight, ChevronsLeft, MessageSquare, PenSquare, Clock, MoreHorizontal, Edit2, Pin, Trash2, ListX } from 'lucide-react';
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
  onViewTasks: () => void;
  onRenameChat?: (id: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onClearAllChats?: () => void;
}

const formatSessionDate = (dateString?: string | Date | number) => {
  const d = dateString ? new Date(dateString) : new Date();
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = days[d.getDay()];
  const date = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${dayName}, ${hours}:${minutes}, ${date} ${monthName} ${year}`;
};

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
  onRenameChat?: (id: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}> = ({
  collapsed, chatSessions, activeChatId,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat,
  onToggleCollapse, onClose, onRenameChat, onPinChat, onDeleteChat
}) => {
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    <div className="flex flex-col h-full relative">
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
          <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors">
            {collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}
          </button>
        )}
      </div>

      <div className="px-3 mb-2">
        <button onClick={onNewChat} className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl transition-opacity hover:opacity-85", collapsed && "justify-center px-2")}>
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
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0 pb-4" style={{scrollbarWidth:'none'}}>
          <div className="flex items-center gap-2 bg-[var(--sf)] rounded-xl px-3 py-2 mb-2">
            <Search size={13} className="text-[var(--mu)] flex-shrink-0"/>
            <input type="text" placeholder="Cari chat..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]" />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1">Riwayat</div>

          {filtered.map((session) => (
            <div key={session.id} className="relative group">
              <button onClick={() => onSelectChat(session.id)} className={cn("w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left", activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]")}>
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", activeChatId === session.id ? "bg-[var(--ac)]" : "bg-[var(--bd)]")}/>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[13px] font-medium text-[var(--text)] truncate">{session.title}</p>
                  <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">{session.messages[session.messages.length - 1]?.content.slice(0, 35)}...</p>
                  <p className="text-[9px] text-[var(--mu)] opacity-70 mt-1">{formatSessionDate((session as any).updatedAt || new Date())}</p>
                </div>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }}
                className={cn("absolute right-2 top-2 p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--bd)] transition-opacity", openMenuId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                <MoreHorizontal size={14} />
              </button>

              <AnimatePresence>
                {openMenuId === session.id && (
                  <motion.div initial={{opacity:0, y:-5, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, scale:0.95}} className="absolute right-0 top-9 w-36 bg-[var(--bg)] border border-[var(--bd)] rounded-xl shadow-xl z-[100] py-1 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); onRenameChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Edit2 size={13} /> Ubah Nama</button>
                    <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Pin size={13} /> Pin Chat</button>
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /> Hapus</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {collapsed && <div className="flex-1"/>}

      <div className="px-3 pb-4 flex-shrink-0 bg-[var(--sf)] z-10 pt-2">
        <button onClick={onViewProfile} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bd)] transition-colors", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0"><User size={15} className="text-[var(--at)]"/></div>
          {!collapsed && (<div className="flex-1 text-left min-w-0"><div className="text-[13px] font-semibold text-[var(--text)] truncate">Profil & Pengaturan</div></div>)}
          {!collapsed && <Settings size={14} className="text-[var(--mu)] flex-shrink-0"/>}
        </button>
      </div>
    </div>
  );
};

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
  onViewTasks: () => void;
  onRenameChat?: (id: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onClearAllChats?: () => void;
}> = ({
  chatSessions, activeChatId, onSelectChat, onViewProfile, onViewGroup, onViewSaved, 
  onViewSearch, onClose, onNewChat, onViewTasks, onRenameChat, onPinChat, onDeleteChat, onClearAllChats
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]" onClick={() => setOpenMenuId(null)}>

      <div className="px-6 pt-10 pb-8 flex items-center justify-between">
        <button onClick={() => { onViewProfile(); onClose(); }} className="flex items-center gap-4 active:scale-95 transition-transform text-left">
          <div className="w-12 h-12 rounded-full bg-[var(--text)] flex items-center justify-center flex-shrink-0 shadow-sm"><User size={26} className="text-[var(--bg)]" /></div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[var(--text)] tracking-tight leading-tight">User Premium</span>
            <span className="text-[13px] text-[var(--mu)] mt-0.5">user@cylen.ai</span>
          </div>
        </button>
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)] hover:opacity-70 transition-opacity">
          <ChevronsRight size={28} strokeWidth={2.2} />
        </button>
      </div>

      <div className="px-5 mb-6 mt-1">
        <button onClick={() => { onViewTasks(); onClose(); }} className="w-full flex items-center gap-3 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-[20px] px-5 py-4 transition-colors text-left active:scale-[0.98]">
          <Clock size={20} className="text-[var(--text)]" />
          <span className="text-[16px] font-bold text-[var(--text)]">Tasks</span>
        </button>
      </div>

      <div className="px-3 mb-4 flex flex-col gap-1">
        <button onClick={() => { onViewGroup(); onClose(); }} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--sf)] rounded-[20px] transition-colors text-left">
          <Users size={22} className="text-[var(--text)] opacity-80" />
          <span className="text-[16px] font-medium text-[var(--text)]">Grup AI</span>
        </button>
        <button onClick={() => { onViewSaved(); onClose(); }} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--sf)] rounded-[20px] transition-colors text-left">
          <Bookmark size={22} className="text-[var(--text)] opacity-80" />
          <span className="text-[16px] font-medium text-[var(--text)]">Tersimpan</span>
        </button>
      </div>

      <div className="px-3 flex-1 overflow-y-auto min-h-0 pb-4" style={{scrollbarWidth:'none'}}>
        
        <div className="flex items-center justify-between px-4 mb-2 mt-2">
          <span className="text-[14px] text-[var(--mu)] font-medium">Conversations</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.stopPropagation(); onClearAllChats?.(); }} 
              className="p-1 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-md transition-all"
              title="Hapus Semua Riwayat"
            >
              <ListX size={17} strokeWidth={2} />
            </button>
            <ChevronRight size={16} className="text-[var(--mu)] opacity-50 rotate-90" />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {chatSessions.length === 0 && (
            <div className="px-4 py-4 text-[14px] text-[var(--mu)]">Belum ada riwayat chat.</div>
          )}
          {chatSessions.map((session) => (
            <div key={session.id} className="relative group w-full">
              <button
                onClick={() => { onSelectChat(session.id); onClose(); }}
                className="w-full flex flex-col px-4 py-4 rounded-[20px] hover:bg-[var(--sf)] transition-colors text-left relative"
              >
                <div className="flex items-center justify-between w-full">
                  <span className={cn("text-[16px] truncate max-w-[85%] transition-colors pr-4", activeChatId === session.id ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)]")}>
                    {session.title}
                  </span>
                </div>
                <span className="text-[13px] text-[var(--mu)] mt-1.5 leading-relaxed line-clamp-1">
                  {session.messages[session.messages.length - 1]?.content}
                </span>
                <span className="text-[11px] text-[var(--mu)] opacity-80 mt-2 font-medium tracking-wide">
                  {formatSessionDate((session as any).updatedAt || new Date())}
                </span>
              </button>

              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setOpenMenuId(openMenuId === session.id ? null : session.id); 
                }}
                className="absolute right-4 top-4 p-1.5 rounded-full text-[var(--mu)] bg-transparent hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors"
              >
                <MoreHorizontal size={18} />
              </button>

              <AnimatePresence>
                {openMenuId === session.id && (
                  <motion.div 
                    initial={{opacity:0, y:-10, scale:0.95}} 
                    animate={{opacity:1, y:0, scale:1}} 
                    exit={{opacity:0, scale:0.95, transition: { duration: 0.1 }}} 
                    className="absolute right-4 top-12 w-[160px] bg-[var(--bg)] border border-[var(--bd)] rounded-[16px] shadow-2xl z-[150] py-1.5 overflow-hidden flex flex-col"
                  >
                    <button onClick={(e) => { e.stopPropagation(); onRenameChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--sf)] transition-colors active:scale-95">
                      <Edit2 size={16} /> Ubah Nama
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--sf)] transition-colors active:scale-95">
                      <Pin size={16} /> Pin Chat
                    </button>
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-red-500 hover:bg-red-500/10 transition-colors active:scale-95">
                      <Trash2 size={16} /> Hapus
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 pb-6 flex items-center gap-3 flex-shrink-0 relative z-20">
        <button onClick={() => { onViewSearch(); onClose(); }} className="flex-1 flex items-center gap-3 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-full px-5 py-3.5 transition-colors text-left">
          <Search size={22} className="text-[var(--mu)] flex-shrink-0" />
          <span className="text-[16px] text-[var(--mu)] font-medium">Search</span>
        </button>
        <button onClick={() => { onViewProfile(); onClose(); }} className="p-3.5 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-full text-[var(--text)] transition-colors"><Settings size={24} /></button>
        <button onClick={() => { onNewChat(); onClose(); }} className="p-3.5 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-full text-[var(--text)] transition-colors"><PenSquare size={24} /></button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen, onClose, chatSessions, activeChatId, onSelectChat,
  onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat, onViewTasks,
  onRenameChat, onPinChat, onDeleteChat, onClearAllChats
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const sharedProps = { chatSessions, activeChatId, onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat, onRenameChat, onPinChat, onDeleteChat, onClearAllChats };

  return (
    <>
      <aside className="hidden md:flex flex-col flex-shrink-0 border-r border-[var(--bd)] bg-[var(--bg)] transition-all duration-250 z-30 relative" style={{ width: collapsed ? 64 : 280, minHeight: '100dvh' }}>
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
