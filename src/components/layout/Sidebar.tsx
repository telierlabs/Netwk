import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Search, User, Settings, Bookmark, Users, ChevronsRight, ChevronsLeft, MessageSquare, PenSquare } from 'lucide-react';
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

// ── MOBILE SIDEBAR CONTENT (layout khusus HP) ──
const MobileSidebarContent: React.FC<{
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onClose: () => void;
  onNewChat: () => void; // 🔥 WAJIB ADA BIAR BISA KLIK CHAT BARU
}> = ({
  chatSessions, activeChatId,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onClose, onNewChat
}) => {
  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">

      {/* 🔥 USER INFO (Hitam pekat bulat di atas, bersih) */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between border-b border-[var(--bd)]">
        <button
          onClick={() => { onViewProfile(); onClose(); }}
          className="flex items-center gap-3 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--text)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <User size={18} className="text-[var(--bg)]" />
          </div>
          <div className="text-left">
            <div className="text-[14px] font-bold text-[var(--text)] leading-tight">User Premium</div>
            <div className="text-[11px] text-[var(--mu)] leading-tight mt-0.5">user@cylen.ai</div>
          </div>
        </button>
        <button 
          onClick={onClose}
          className="p-2 text-[var(--text)] hover:opacity-70 transition-opacity"
        >
          <ChevronsLeft size={20} />
        </button>
      </div>

      {/* 🔥 SEARCH BAR (Minimalis murni line/border) */}
      <div className="px-4 py-4">
        <button
          onClick={() => { onViewSearch(); onClose(); }}
          className="w-full flex items-center gap-2 border border-[var(--bd)] rounded-full px-4 py-2.5 transition-colors hover:bg-[var(--bd)]"
        >
          <Search size={15} className="text-[var(--text)] flex-shrink-0 opacity-70"/>
          <span className="text-[13px] text-[var(--mu)] font-medium">Cari percakapan...</span>
        </button>
      </div>

      {/* 🔥 FITUR UTAMA (Bersih, tanpa kotak abu, langsung list) */}
      <div className="px-4 mb-4 flex flex-col gap-1">
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="w-full flex items-center justify-between py-3 rounded-lg transition-colors hover:px-2 hover:bg-[var(--bd)] group"
        >
          <div className="flex items-center gap-3 text-[var(--text)] font-semibold text-[14px]">
             <PenSquare size={18} className="opacity-80 group-hover:opacity-100" />
             Chat Baru
          </div>
        </button>
        
        <button
          onClick={() => { onViewGroup(); onClose(); }}
          className="w-full flex items-center justify-between py-3 rounded-lg transition-colors hover:px-2 hover:bg-[var(--bd)] group"
        >
          <div className="flex items-center gap-3 text-[var(--text)] font-medium text-[14px]">
             <Users size={18} className="opacity-70 group-hover:opacity-100" />
             Grup AI
          </div>
        </button>

        <button
          onClick={() => { onViewSaved(); onClose(); }}
          className="w-full flex items-center justify-between py-3 rounded-lg transition-colors hover:px-2 hover:bg-[var(--bd)] group"
        >
          <div className="flex items-center gap-3 text-[var(--text)] font-medium text-[14px]">
             <Bookmark size={18} className="opacity-70 group-hover:opacity-100" />
             Tersimpan
          </div>
        </button>
      </div>

      {/* 🔥 RIWAYAT CHAT (List flat polos) */}
      <div className="px-4 flex-1 overflow-y-auto min-h-0" style={{scrollbarWidth:'none'}}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-1 mt-2">Riwayat Chat</div>
        <div className="flex flex-col gap-1 pb-6">
          {chatSessions.length === 0 && (
            <div className="px-2 py-4 text-[13px] text-[var(--mu)]">Belum ada riwayat chat.</div>
          )}
          {chatSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => { onSelectChat(session.id); onClose(); }}
              className="w-full flex items-start gap-3 py-3 rounded-lg hover:px-2 hover:bg-[var(--bd)] transition-all text-left"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-colors",
                activeChatId === session.id ? "bg-[var(--text)]" : "bg-transparent"
              )}/>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[14px] truncate transition-colors", activeChatId === session.id ? "font-bold text-[var(--text)]" : "font-medium text-[var(--text)] opacity-90")}>
                  {session.title}
                </p>
                <p className="text-[12px] text-[var(--mu)] truncate mt-0.5">
                  {session.messages[session.messages.length - 1]?.content.slice(0, 45)}...
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── MAIN SIDEBAR COMPONENT ──
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen, onClose, chatSessions, activeChatId, onSelectChat,
  onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const sharedProps = {
    chatSessions, activeChatId,
    onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat,
  };

  return (
    <>
      {/* ── DESKTOP SIDEBAR (permanen, kiri) ── */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 border-r border-[var(--bd)] bg-[var(--sf)] transition-all duration-250"
        style={{ width: collapsed ? 64 : 260, minHeight: '100dvh' }}
      >
        <SidebarContent
          {...sharedProps}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(c => !c)}
        />
      </aside>

      {/* ── MOBILE SIDEBAR (overlay, fullscreen) ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 z-[190] md:hidden" 
            />
            {/* Z-Index 200 buat nutupin layar full */}
            <motion.div
              initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{duration:0.18, ease:'easeOut'}}
              className="fixed inset-y-0 left-0 w-full bg-[var(--bg)] z-[200] flex flex-col shadow-2xl md:hidden"
            >
              <MobileSidebarContent
                chatSessions={chatSessions}
                activeChatId={activeChatId}
                onSelectChat={onSelectChat}
                onViewProfile={onViewProfile}
                onViewGroup={onViewGroup}
                onViewSaved={onViewSaved}
                onViewSearch={onViewSearch}
                onClose={onClose}
                onNewChat={onNewChat} // 🔥 PENTING: Props ini udah diturunin
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
