// AppDesktop.tsx — Layout khusus Laptop/PC
// Sidebar permanen di kiri, topbar, chat area lebih lebar.

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupChatPage } from './pages/GroupChatPage';
import { GroupListPage } from './pages/GroupListPage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';
import {
  Search, User, Settings, Bookmark, Users,
  ChevronsLeft, ChevronsRight, PenSquare,
  MessageSquare, ArrowLeft, Pin, Download
} from 'lucide-react';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#fff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#0d0d0d', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#f0f0f0', '--mu':'rgba(255,255,255,.35)', '--cd':'#171717', '--ac':'#fff', '--at':'#0d0d0d', '--ib':'#252525' },
  't-cream': { '--bg':'#f8f4ed', '--sf':'#ede8df', '--bd':'rgba(0,0,0,.07)', '--text':'#2a1f0e', '--mu':'rgba(42,31,14,.42)', '--cd':'#fff', '--ac':'#2a1f0e', '--at':'#f8f4ed', '--ib':'#e0d8c8' },
  't-dusk':  { '--bg':'#12101f', '--sf':'#1d1a2e', '--bd':'rgba(255,255,255,.06)', '--text':'#ddd8f5', '--mu':'rgba(221,216,245,.38)', '--cd':'#181526', '--ac':'#9d7fea', '--at':'#12101f', '--ib':'#252140' },
  't-forest':{ '--bg':'#f0f4ee', '--sf':'#e2ead8', '--bd':'rgba(0,0,0,.07)', '--text':'#162216', '--mu':'rgba(22,34,22,.42)', '--cd':'#fff', '--ac':'#162216', '--at':'#f0f4ee', '--ib':'#d4dece' },
  't-slate': { '--bg':'#f0f2f5', '--sf':'#e4e8ee', '--bd':'rgba(0,0,0,.08)', '--text':'#1a2132', '--mu':'rgba(26,33,50,.42)', '--cd':'#fff', '--ac':'#1a2132', '--at':'#f0f2f5', '--ib':'#dde2ea' },
};

/* ── DESKTOP SIDEBAR ── */
const DesktopSidebar: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  chatSessions: any[];
  activeChatId: string;
  view: View;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
}> = ({ collapsed, onToggle, chatSessions, activeChatId, view, onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat }) => {
  const [search, setSearch] = useState('');
  const filtered = chatSessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  const NavBtn = ({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
        collapsed ? 'justify-center px-2' : '',
        active ? 'bg-[var(--bd)] text-[var(--text)]' : 'text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]'
      )}>
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-[13.5px] font-medium">{label}</span>}
    </button>
  );

  return (
    <aside
      className="flex flex-col flex-shrink-0 border-r border-[var(--bd)] bg-[var(--sf)] transition-all duration-200"
      style={{ width: collapsed ? 64 : 256, height: '100dvh' }}
    >
      {/* TOP */}
      <div className={cn('flex items-center px-3 py-4 gap-2', collapsed ? 'justify-center' : 'justify-between')}>
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
          <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--at)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)]">Cylen AI</span>}
        </div>
        <button onClick={onToggle}
          className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors flex-shrink-0">
          {collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}
        </button>
      </div>

      {/* NEW CHAT */}
      <div className="px-3 mb-3">
        <button onClick={onNewChat}
          className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl hover:opacity-85 transition-opacity', collapsed && 'justify-center px-2')}>
          <PenSquare size={15} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-semibold">Chat Baru</span>}
        </button>
      </div>

      {/* NAV */}
      <div className="px-2 flex flex-col gap-0.5">
        <NavBtn icon={<Search size={16}/>} label="Cari Percakapan" onClick={onViewSearch} active={view==='search'}/>
        <NavBtn icon={<Users size={16}/>} label="Grup AI" onClick={onViewGroup} active={view==='group-list'||view==='group-chat'}/>
        <NavBtn icon={<Bookmark size={16}/>} label="Tersimpan" onClick={onViewSaved} active={view==='saved'}/>
      </div>

      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>

      {/* HISTORY */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}>
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--bd)] rounded-xl px-3 py-2 mb-2">
            <Search size={12} className="text-[var(--mu)] flex-shrink-0"/>
            <input type="text" placeholder="Cari chat..." value={search} onChange={e=>setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]"/>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1">Riwayat</div>
          {filtered.map(session => (
            <button key={session.id} onClick={() => onSelectChat(session.id)}
              className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left',
                activeChatId === session.id ? 'bg-[var(--bg)]' : 'hover:bg-[var(--bg)]')}>
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                activeChatId === session.id ? 'bg-[var(--ac)]' : 'bg-[var(--bd)]')}/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text)] truncate">{session.title}</p>
                <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">
                  {session.messages[session.messages.length-1]?.content.slice(0,40)}...
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
          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg)] transition-colors', collapsed && 'justify-center px-2')}>
          <div className="w-8 h-8 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-[var(--at)]"/>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text)] truncate">Profil & Pengaturan</div>
              </div>
              <Settings size={13} className="text-[var(--mu)] flex-shrink-0"/>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

/* ── DESKTOP TOPBAR ── */
const DesktopTopbar: React.FC<{
  view: View;
  chatTitle?: string;
  onBack: () => void;
  onNewChat: () => void;
}> = ({ view, chatTitle, onBack, onNewChat }) => {
  const titles: Partial<Record<View, string>> = {
    chat: chatTitle || 'Chat',
    profile: 'Profil & Pengaturan',
    saved: 'Tersimpan',
    memory: 'Memori Cylen',
    search: 'Cari Percakapan',
    'group-list': 'Grup AI',
    'group-chat': 'Diskusi Grup',
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--bd)] bg-[var(--bg)] flex-shrink-0">
      <div className="flex items-center gap-3">
        {view !== 'chat' && (
          <button onClick={onBack} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--text)] transition-colors">
            <ArrowLeft size={18}/>
          </button>
        )}
        <h1 className="text-[15px] font-semibold text-[var(--text)]">{titles[view] || 'Cylen AI'}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onNewChat}
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--text)] border border-[var(--bd)] rounded-xl transition-colors">
          <PenSquare size={14}/>
          Chat Baru
        </button>
      </div>
    </header>
  );
};

/* ── MAIN APP DESKTOP ── */
export default function AppDesktop() {
  const [view, setView] = useState<View>('chat');
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const vars = THEME_VARS[theme];
    if (!vars) return;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--text'];
  }, [theme]);

  const {
    chatSessions, activeChatId, setActiveChatId,
    messages, isSending, isSearching, searchQuery,
    sendMessage, createNewChat,
    togglePin, pinnedMessages,
    retryLastMessage,
  } = useChat();

  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, createGroup, addParticipant, sendGroupMessage } = useGroupChat();
  const { savedItems, saveItem, deleteItem } = useSaved();
  const { memoryItems, deleteMemory } = useMemory();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[]) => {
    sendMessage(inputText, attachedImage, images, pdfs);
    setInputText('');
    setAttachedImage(null);
  };

  const handleNewChat = () => {
    createNewChat();
    setView('chat');
    showToast('Memulai chat baru');
  };

  const activeChat = chatSessions.find(s => s.id === activeChatId);
  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  return (
    <div
      className={cn('app transition-colors duration-350', theme)}
      style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}
    >
      <style>{`
        .t-light { --bg:#fff; --sf:#f5f5f5; --bd:rgba(0,0,0,.08); --text:#0a0a0a; --mu:rgba(0,0,0,.38); --cd:#fff; --ac:#0a0a0a; --at:#fff; --ib:#f0f0f0; }
        .t-dark  { --bg:#0d0d0d; --sf:#1c1c1c; --bd:rgba(255,255,255,.07); --text:#f0f0f0; --mu:rgba(255,255,255,.35); --cd:#171717; --ac:#fff; --at:#0d0d0d; --ib:#252525; }
        .t-cream { --bg:#f8f4ed; --sf:#ede8df; --bd:rgba(0,0,0,.07); --text:#2a1f0e; --mu:rgba(42,31,14,.42); --cd:#fff; --ac:#2a1f0e; --at:#f8f4ed; --ib:#e0d8c8; }
        .t-dusk  { --bg:#12101f; --sf:#1d1a2e; --bd:rgba(255,255,255,.06); --text:#ddd8f5; --mu:rgba(221,216,245,.38); --cd:#181526; --ac:#9d7fea; --at:#12101f; --ib:#252140; }
        .t-forest{ --bg:#f0f4ee; --sf:#e2ead8; --bd:rgba(0,0,0,.07); --text:#162216; --mu:rgba(22,34,22,.42); --cd:#fff; --ac:#162216; --at:#f0f4ee; --ib:#d4dece; }
        .t-slate { --bg:#f0f2f5; --sf:#e4e8ee; --bd:rgba(0,0,0,.08); --text:#1a2132; --mu:rgba(26,33,50,.42); --cd:#fff; --ac:#1a2132; --at:#f0f2f5; --ib:#dde2ea; }
        body { background-color:var(--bg); color:var(--text); }
        .markdown-body h1 { font-size:1.25rem; font-weight:600; margin:1rem 0 0.5rem; }
        .markdown-body h2 { font-size:1.1rem; font-weight:600; margin:0.8rem 0 0.4rem; }
        .markdown-body p { margin-bottom:0.5rem; line-height:1.6; }
        .markdown-body ul, .markdown-body ol { margin-left:1.5rem; margin-bottom:0.5rem; }
        .markdown-body code { background:rgba(0,0,0,0.05); padding:0.2rem 0.4rem; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:0.85em; }
        .t-dark .markdown-body code { background:rgba(255,255,255,0.1); }
        .markdown-body pre { background:#1a1a1a; color:#f8f8f8; padding:1rem; border-radius:8px; overflow-x:auto; margin:1rem 0; }
        .markdown-body pre code { background:transparent; padding:0; color:inherit; }
      `}</style>

      {/* SIDEBAR PERMANEN */}
      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        view={view}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }}
        onViewProfile={() => setView('profile')}
        onViewGroup={() => setView('group-list')}
        onViewSaved={() => setView('saved')}
        onViewSearch={() => setView('search')}
        onNewChat={handleNewChat}
      />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* TOPBAR */}
        {view !== 'search' && (
          <DesktopTopbar
            view={view}
            chatTitle={activeChat?.title}
            onBack={() => {
              if (view === 'group-chat') setView('group-list');
              else if (view === 'memory') setView('profile');
              else setView('chat');
            }}
            onNewChat={handleNewChat}
          />
        )}

        {/* PAGES */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'chat' && (
            <ChatPage
              messages={messages} isSending={isSending} isSearching={isSearching}
              searchQuery={searchQuery} inputText={inputText} setInputText={setInputText}
              onSend={handleSendMessage}
              attachedImage={attachedImage} setAttachedImage={setAttachedImage}
              onTogglePin={togglePin} pinnedMessages={pinnedMessages}
              onSaveItem={(item) => { saveItem({ ...item, chatId: activeChatId }); showToast('Pesan berhasil disimpan!'); }}
              onRetry={retryLastMessage}
            />
          )}
          {view === 'profile' && (
            <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont}
              showToast={showToast} onViewMemory={() => setView('memory')} />
          )}
          {view === 'saved' && (
            <SavedPage savedItems={savedItems} onDelete={deleteItem}
              onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} />
          )}
          {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} />}
          {view === 'search' && (
            <SearchPage chatSessions={chatSessions} onBack={() => setView('chat')}
              onSelectChat={(chatId) => { setActiveChatId(chatId); setView('chat'); showToast('Membuka percakapan'); }} />
          )}
          {view === 'group-list' && (
            <GroupListPage
              groups={groupSessions}
              onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }}
              onCreateGroup={(title) => {
                const id = createGroup(title);
                if (id) { setActiveGroupId(id); setView('group-chat'); showToast('Grup berhasil dibuat'); }
                else showToast('Maksimal 5 grup tercapai');
              }}
            />
          )}
          {view === 'group-chat' && activeGroup && (
            <GroupChatPage activeGroup={activeGroup} isSending={isGroupSending}
              onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} showToast={showToast} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:20,x:'-50%'}}
            className="fixed bottom-8 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
