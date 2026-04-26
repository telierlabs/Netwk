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

      {/* TOP */}
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

      {/* NEW CHAT BUTTON */}
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

      {/* NAV */}
      <div className="px-2 flex flex-col gap-0.5">
        {navItem(<Search size={16}/>, 'Cari', onViewSearch)}
        {navItem(<MessageSquare size={16}/>, 'Chat', onSelectChat.bind(null, activeChatId))}
        {navItem(<Users size={16}/>, 'Grup AI', onViewGroup)}
        {navItem(<Bookmark size={16}/>, 'Tersimpan', onViewSaved)}
      </div>

      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>

      {/* HISTORY */}
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

      {/* PROFILE */}
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
}> = ({
  chatSessions, activeChatId,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onClose
}) => {
  return (
    <div className="flex flex-col h-full">

      {/* 🔥 FIX: Search bar & Close button dipisah di atas */}
      <div className="px-4 pt-5 pb-3 flex items-center gap-2">
        <button
          onClick={() => { onViewSearch(); onClose(); }}
          className="flex-1 flex items-center gap-2 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-xl px-3 py-2.5 transition-colors"
        >
          <Search size={14} className="text-[var(--mu)] flex-shrink-0"/>
          <span className="text-[13px] text-[var(--mu)] font-medium">Cari percakapan...</span>
        </button>
        <button 
          onClick={onClose}
          className="p-2.5 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-xl text-[var(--mu)] hover:text-[var(--text)] transition-colors flex-shrink-0"
        >
          <ChevronsRight size={18} />
        </button>
      </div>

      {/* FITUR — card grouped (🔥 FIX: Cari Percakapan Dihapus dari list) */}
      <div className="px-4 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-2 px-1">Fitur</div>
        <div className="bg-[var(--sf)] rounded-2xl overflow-hidden">
          {[
            { icon: <Users size={16}/>, label: 'Grup AI', onClick: () => { onViewGroup(); onClose(); } },
            { icon: <Bookmark size={16}/>, label: 'Tersimpan', onClick: () => { onViewSaved(); onClose(); } },
          ].map((item, i, arr) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-[var(--text)] hover:bg-[var(--bd)] transition-colors"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bd)' : 'none' }}
            >
              <span className="text-[var(--mu)]">{item.icon}</span>
              <span className="text-[14px] font-medium flex-1 text-left">{item.label}</span>
              <ChevronRight size={15} className="text-[var(--mu)]"/>
            </button>
          ))}
        </div>
      </div>

      {/* RIWAYAT CHAT */}
      <div className="px-4 flex-1 overflow-y-auto min-h-0" style={{scrollbarWidth:'none'}}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-2 px-1">Riwayat Chat</div>
        <div className="bg-[var(--sf)] rounded-2xl overflow-hidden">
          {chatSessions.length === 0 && (
            <div className="px-4 py-4 text-[13px] text-[var(--mu)]">Belum ada riwayat chat.</div>
          )}
          {chatSessions.map((session, i) => (
            <button
              key={session.id}
              onClick={() => { onSelectChat(session.id); onClose(); }}
              className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-[var(--bd)] transition-colors text-left"
              style={{ borderBottom: i < chatSessions.length - 1 ? '1px solid var(--bd)' : 'none' }}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                activeChatId === session.id ? "bg-[var(--ac)]" : "bg-[var(--bd)]"
              )}/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{session.title}</p>
                <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">
                  {session.messages[session.messages.length - 1]?.content.slice(0, 40)}...
                </p>
                {session.updatedAt && (
                  <p className="text-[10px] text-[var(--mu)] mt-0.5 uppercase tracking-wide">
                    {new Date(session.updatedAt).toLocaleDateString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* USER INFO — kotak hitam di bawah */}
      <div className="p-4 flex-shrink-0">
        <button
          onClick={() => { onViewProfile(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-[var(--ac)] rounded-2xl"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--at)] opacity-20 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <User size={15} className="text-[var(--at)]"/>
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[13px] font-semibold text-[var(--at)] truncate">User Premium</div>
            <div className="text-[11px] text-[var(--at)] opacity-60 truncate">user@cylen.ai</div>
          </div>
          <Settings size={14} className="text-[var(--at)] opacity-60 flex-shrink-0"/>
        </button>
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
            {/* 🔥 FIX: Z-Index dinaikin jadi 200 biar 100% nutupin ChatInput yang ada di 105 */}
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
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
