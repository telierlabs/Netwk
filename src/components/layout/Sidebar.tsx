import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// 🔥 FIX: Ikon titik 3 diganti ChevronDown (V), Ikon tasks disesuaikan Lucide
import { ChevronRight, ChevronDown, Search, User, Settings, Bookmark, Users, ChevronsRight, ChevronsLeft, MessageSquare, PenSquare, Clock, Edit2, Pin, Trash2, ListX, X, SquarePen, Plus } from 'lucide-react';
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

  // 🔥 FIX NAVITEM: Licin banget & transparan elegan
  const navItem = (icon: React.ReactNode, label: string, onClick: () => void, tip?: string) => (
    <button
      onClick={onClick}
      title={collapsed ? (tip || label) : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.96] text-[var(--text)] opacity-80 hover:bg-[var(--sf)]/60 hover:opacity-100",
        collapsed && "justify-center px-2"
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-[13.5px] font-semibold">{label}</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full relative bg-transparent">
      <div className={cn("flex items-center px-3 py-4 gap-2", collapsed ? "justify-center flex-col" : "justify-between")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "flex-col gap-1")}>
          <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--at)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)]">Cylen AI</span>}
        </div>

        {onToggleCollapse && (
          <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--text)]/10 hover:text-[var(--text)] transition-all active:scale-90">
            {collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}
          </button>
        )}
      </div>

      <div className="px-3 mb-2">
        <button onClick={onNewChat} className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl transition-all active:scale-[0.96] shadow-sm hover:opacity-90", collapsed && "justify-center px-2")}>
          <PenSquare size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-semibold tracking-wide">Chat Baru</span>}
        </button>
      </div>

      <div className="px-2 flex flex-col gap-0.5">
        {navItem(<Search size={16}/>, 'Cari', onViewSearch)}
        {navItem(<MessageSquare size={16}/>, 'Chat', onSelectChat.bind(null, activeChatId))}
        {navItem(<Users size={16}/>, 'Grup AI', onViewGroup)}
        {navItem(<Bookmark size={16}/>, 'Tersimpan', onViewSaved)}
      </div>

      <div className="mx-3 my-3 border-t border-[var(--text)]/10"/>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0 pb-4" style={{scrollbarWidth:'none'}}>
          <div className="flex items-center gap-2 bg-[var(--text)]/5 border border-[var(--text)]/10 rounded-xl px-3 py-2 mb-2 transition-all focus-within:border-[var(--text)]/30">
            <Search size={13} className="text-[var(--mu)] flex-shrink-0"/>
            <input type="text" placeholder="Cari chat..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]" />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--mu)] px-1 mb-1 mt-1">Riwayat</div>

          {filtered.map((session) => (
            <div key={session.id} className="relative group">
              <button onClick={() => onSelectChat(session.id)} className={cn("w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-[0.96] text-left", activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]")}>
                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", activeChatId === session.id ? "bg-[var(--ac)] shadow-[0_0_8px_var(--ac)]" : "bg-[var(--bd)]")}/>
                <div className="flex-1 min-w-0 pr-6">
                  <p className={cn("text-[13px] truncate", activeChatId === session.id ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)]")}>{session.title}</p>
                  <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">{session.messages[session.messages.length - 1]?.content.slice(0, 35)}...</p>
                  <p className="text-[9px] text-[var(--mu)] opacity-70 mt-1 tracking-wide">{formatSessionDate((session as any).updatedAt || new Date())}</p>
                </div>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }}
                className={cn("absolute right-2 top-2 p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 transition-all active:scale-90", openMenuId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
              >
                <MoreHorizontal size={14} />
              </button>

              <AnimatePresence>
                {openMenuId === session.id && (
                  <motion.div initial={{opacity:0, y:-5, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, scale:0.95}} transition={{duration:0.1}} className="absolute right-0 top-9 w-36 bg-[var(--bg)]/90 backdrop-blur-xl border border-[var(--text)]/10 rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); onRenameChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--sf)] transition-colors active:scale-95"><Edit2 size={13} /> Ubah Nama</button>
                    <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-[var(--text)] hover:bg-[var(--sf)] transition-colors active:scale-95"><Pin size={13} /> Pin Chat</button>
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-bold text-red-500 hover:bg-red-500/10 transition-colors active:scale-95"><Trash2 size={13} /> Hapus</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {collapsed && <div className="flex-1"/>}

      <div className="px-3 pb-4 flex-shrink-0 bg-[var(--sf)] z-10 pt-2 border-t border-[var(--bd)]/50">
        <button onClick={onViewProfile} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bd)] transition-all active:scale-[0.98]", collapsed && "justify-center px-2")}>
          <div className="w-8 h-8 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0 shadow-sm"><User size={15} className="text-[var(--at)]"/></div>
          {!collapsed && (<div className="flex-1 text-left min-w-0"><div className="text-[13px] font-bold text-[var(--text)] truncate">Profil & Pengaturan</div></div>)}
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
  // 🔥 FIX STATE: Simpan state collapse Riwayat
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-full bg-transparent" onClick={() => setOpenMenuId(null)}>

      <div className="px-6 pt-10 pb-6 flex items-center justify-between border-b border-[var(--text)]/10">
        <button onClick={() => { onViewProfile(); onClose(); }} className="flex items-center gap-4 active:scale-95 transition-all text-left">
          <div className="w-12 h-12 rounded-full bg-[var(--text)] flex items-center justify-center flex-shrink-0 shadow-lg border border-[var(--text)]/10"><User size={26} className="text-[var(--bg)]" /></div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[var(--text)] tracking-tight leading-tight drop-shadow-sm">User Premium</span>
            <span className="text-[13px] font-medium text-[var(--text)]/60 mt-0.5">user@cylen.ai</span>
          </div>
        </button>
        {/* 🔥 FIX CLOSE ICON NETRAL & LICIN */}
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-transparent flex items-center justify-center text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-90 transition-all">
          <X size={26} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-5 mb-5 mt-4">
        {/* 🔥 FIX: Bubble item solid di Tasks dibantai jadi transparan elegan (bg-[var(--bd)]) */}
        <button onClick={() => { onViewTasks(); onClose(); }} className="w-full flex items-center gap-3 bg-[var(--text)]/5 text-[var(--text)] rounded-2xl px-5 py-4 transition-all active:scale-[0.96] hover:bg-[var(--bd)] text-left border border-[var(--text)]/5">
          <Clock size={20} strokeWidth={2.5} />
          <span className="text-[16px] font-bold tracking-wide">Tasks Manager</span>
        </button>
      </div>

      <div className="px-3 mb-3 flex flex-col gap-1">
        <button onClick={() => { onViewGroup(); onClose(); }} className="flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--text)]/10 rounded-2xl transition-all active:scale-[0.96] text-left">
          <div className="w-9 h-9 rounded-full bg-[var(--bd)] flex items-center justify-center flex-shrink-0 border border-[var(--text)]/5"><Users size={18} className="text-[var(--text)]" /></div>
          <span className="text-[15px] font-bold text-[var(--text)]">Grup AI Workspace</span>
        </button>
        <button onClick={() => { onViewSaved(); onClose(); }} className="flex-1 items-center gap-4 px-4 py-3.5 hover:bg-[var(--text)]/10 rounded-2xl transition-all active:scale-[0.96] text-left">
          <div className="w-9 h-9 rounded-full bg-[var(--bd)] flex items-center justify-center flex-shrink-0 border border-[var(--text)]/5"><Bookmark size={18} className="text-[var(--text)]" /></div>
          <span className="text-[15px] font-bold text-[var(--text)]">Arsip Tersimpan</span>
        </button>
      </div>

      <div className="px-3 flex-1 overflow-y-auto min-h-0 pb-4" style={{scrollbarWidth:'none'}}>
        
        <div className="flex items-center justify-between px-4 mb-3 mt-4">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text)]/50">Conversations</span>
          <div className="flex items-center gap-3">
            {/* 🔥 FIX: Ikon garis 3 diganti ChevronDown (V) untuk collapse */}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsHistoryCollapsed(p => !p); }} 
              className="p-1.5 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-lg transition-all active:scale-95"
            >
              <ChevronDown size={16} strokeWidth={2.5} className={cn("transition-transform duration-200", isHistoryCollapsed ? "rotate-90" : "rotate-0")}/>
            </button>
          </div>
        </div>
        
        {/* 🔥 FIX ANIMATION: Riwayat chat bisa collapse super licin */}
        <AnimatePresence>
          {!isHistoryCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }} // ios-like curve
              style={{ overflow: 'hidden' }}
              className="flex flex-col gap-1 transform-gpu will-change-transform"
            >
              {chatSessions.length === 0 && (
                <div className="px-4 py-6 text-center text-[13px] text-[var(--text)]/60 font-medium bg-[var(--text)]/5 rounded-2xl mx-2 border border-[var(--text)]/5">Belum ada riwayat obrolan.</div>
              )}
              {chatSessions.map((session) => (
                <div key={session.id} className="relative group w-full">
                  <button
                    onClick={() => { onSelectChat(session.id); onClose(); }}
                    className={cn("w-full flex flex-col px-4 py-3.5 rounded-2xl transition-all active:scale-[0.96] text-left relative", activeChatId === session.id ? "bg-[var(--sf)]/80 backdrop-blur-sm border border-[var(--bd)]/50 shadow-sm" : "hover:bg-[var(--text)]/5")}
                  >
                    <div className="flex items-center justify-between w-full pr-6">
                      <span className={cn("text-[15px] truncate max-w-full transition-colors", activeChatId === session.id ? "font-bold text-[var(--text)]" : "font-semibold text-[var(--text)]")}>
                        {session.title}
                      </span>
                    </div>
                    <span className="text-[13px] text-[var(--text)]/60 mt-1 line-clamp-1 leading-relaxed">
                      {session.messages[session.messages.length - 1]?.content}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)]/40 mt-2 font-mono">
                      {formatSessionDate((session as any).updatedAt || new Date())}
                    </span>
                  </button>

                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setOpenMenuId(openMenuId === session.id ? null : session.id); 
                    }}
                    className="absolute right-3 top-3.5 p-1.5 rounded-full text-[var(--text)]/50 bg-transparent hover:bg-[var(--text)]/10 hover:text-[var(--text)] transition-all active:scale-90"
                  >
                    <ChevronDown size={18} className={cn("transition-transform duration-200", openMenuId === session.id ? "rotate-180" : "rotate-0")} />
                  </button>

                  <AnimatePresence>
                    {openMenuId === session.id && (
                      <motion.div 
                        initial={{opacity:0, y:-10, scale:0.95}} 
                        animate={{opacity:1, y:0, scale:1}} 
                        exit={{opacity:0, scale:0.95}} 
                        transition={{ duration: 0.15, ease: "easeOut" }} 
                        className="absolute right-4 top-12 w-[160px] bg-[var(--bg)]/90 backdrop-blur-2xl border border-[var(--text)]/10 rounded-[16px] shadow-2xl z-[150] py-1.5 overflow-hidden flex flex-col"
                      >
                        <button onClick={(e) => { e.stopPropagation(); onRenameChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--text)]/10 transition-colors active:scale-95 flex-shrink-0">
                          <Edit2 size={16} /> Ubah Nama
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--text)]/10 transition-colors active:scale-95">
                          <Pin size={16} /> Pin Chat
                        </button>
                        <div className="h-[1px] w-full bg-[var(--text)]/10 my-1" />
                        <button onClick={(e) => { e.stopPropagation(); onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-[14px] font-bold text-red-500 hover:bg-red-500/10 transition-colors active:scale-95">
                          <Trash2 size={16} /> Hapus</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* 🔥 FIX: Bagian bawah melayang (floating), tanpa garis pembatas, tanpa background norak */}
      <div className="p-4 pb-6 flex items-center gap-3 flex-shrink-0 relative z-20 bg-transparent"> 
        {/* Pencarian melayang (bg-[var(--bd)]) */}
        <button onClick={() => { onViewSearch(); onClose(); }} className="flex-1 flex items-center gap-3 bg-[var(--bd)]/40 backdrop-blur-xl hover:bg-[var(--bd)] rounded-[20px] px-5 py-3.5 transition-all active:scale-[0.96] text-left border border-[var(--text)]/10 shadow-lg">
          <Search size={20} className="text-[var(--text)]/70 flex-shrink-0 dark:text-[var(--text)]/50" />
          <span className="text-[16px] text-[var(--text)]/80 font-bold dark:text-[var(--text)]/80">Search</span>
        </button>
        {/* Tambah chat melayang (bg-[var(--bd)]) + Ikon netral */}
        <button onClick={() => { onNewChat(); onClose(); }} className="p-3.5 bg-[var(--bd)]/40 backdrop-blur-xl hover:bg-[var(--bd)] border border-[var(--text)]/10 text-[var(--text)] rounded-[20px] shadow-lg transition-all active:scale-90">
          <Plus size={24} />
        </button>
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
      {/* SIDEBAR DESKTOP (KACA JUGA) */}
      <aside className="hidden md:flex flex-col flex-shrink-0 border-r border-[var(--text)]/10 bg-[var(--bg)]/4 dark:bg-[var(--bg)]/4 backdrop-blur-2xl transition-all duration-300 z-30 relative shadow-[4px_0_24px_rgba(0,0,0,0.02)]" style={{ width: collapsed ? 64 : 280, minHeight: '100dvh' }}>
        <SidebarContent {...sharedProps} collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} />
      </aside>

      {/* SIDEBAR MOBILE FULL SCREEN 100% KACA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: '-100%', opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '-100%', opacity: 0 }} 
            // 🔥 FIX: Animasi curve iOS yang super licin, ga pake spring berat
            transition={{ type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.35 }} 
            // 🔥 FIX KACA MOBILE: Transparan + Blur Ekstrem + Shadow Grok
            className="fixed inset-0 w-full h-[100dvh] bg-[var(--bg)]/4 dark:bg-[var(--bg)]/4 backdrop-blur-2xl supports-[backdrop-filter]:bg-transparent z-[200] flex flex-col md:hidden transform-gpu will-change-transform"
          >
            <MobileSidebarContent {...sharedProps} onClose={onClose} onViewTasks={onViewTasks} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
