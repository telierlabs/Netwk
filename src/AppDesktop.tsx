// AppDesktop.tsx — Layout khusus Laptop/PC (Grok-style)

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
  ChevronsLeft, ChevronsRight, PenSquare, ArrowLeft,
} from 'lucide-react';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light':  { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)',  '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)',         '--cd':'#fff',    '--ac':'#0a0a0a', '--at':'#fff',    '--ib':'#f0f0f0' },
  't-dark':   { '--bg':'#000000', '--sf':'#111111', '--bd':'rgba(255,255,255,.08)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.38)', '--cd':'#111111', '--ac':'#ffffff', '--at':'#000000', '--ib':'#1a1a1a' },
  't-cream':  { '--bg':'#f8f4ed', '--sf':'#ede8df', '--bd':'rgba(0,0,0,.07)',  '--text':'#2a1f0e', '--mu':'rgba(42,31,14,.42)',       '--cd':'#fff',    '--ac':'#2a1f0e', '--at':'#f8f4ed', '--ib':'#e0d8c8' },
  't-dusk':   { '--bg':'#12101f', '--sf':'#1d1a2e', '--bd':'rgba(255,255,255,.06)', '--text':'#ddd8f5', '--mu':'rgba(221,216,245,.38)', '--cd':'#181526', '--ac':'#9d7fea', '--at':'#12101f', '--ib':'#252140' },
  't-forest': { '--bg':'#f0f4ee', '--sf':'#e2ead8', '--bd':'rgba(0,0,0,.07)', '--text':'#162216', '--mu':'rgba(22,34,22,.42)',        '--cd':'#fff',    '--ac':'#162216', '--at':'#f0f4ee', '--ib':'#d4dece' },
  't-slate':  { '--bg':'#f0f2f5', '--sf':'#e4e8ee', '--bd':'rgba(0,0,0,.08)', '--text':'#1a2132', '--mu':'rgba(26,33,50,.42)',        '--cd':'#fff',    '--ac':'#1a2132', '--at':'#f0f2f5', '--ib':'#dde2ea' },
};

// ── SIDEBAR ──
const DesktopSidebar: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  view: View;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
  chatSessions: any[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
}> = ({ collapsed, onToggle, view, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat, chatSessions, activeChatId, onSelectChat }) => {
  const [search, setSearch] = useState('');
  const filtered = chatSessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));

  const NavBtn = ({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'w-full flex items-center justify-center p-3 rounded-xl transition-colors my-0.5',
        !collapsed && 'justify-start gap-3 px-3',
        active
          ? 'bg-[var(--bd)] text-[var(--text)]'
          : 'text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]'
      )}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-[13.5px] font-medium">{label}</span>}
    </button>
  );

  return (
    <aside
      className="flex flex-col flex-shrink-0 border-r border-[var(--bd)] transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, height: '100dvh', backgroundColor: 'var(--bg)' }}
    >
      <div className={cn('flex items-center py-4 px-2', collapsed ? 'flex-col gap-3' : 'px-3 gap-2 justify-between')}>
        <button
          onClick={onNewChat}
          title="Cylen AI"
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 38, height: 38, objectFit: 'contain' }} />
        </button>
        {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)] flex-1">Cylen AI</span>}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors flex-shrink-0"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronsRight size={17}/> : <ChevronsLeft size={17}/>}
        </button>
      </div>

      <div className={cn('px-2 mb-2', collapsed && 'flex justify-center')}>
        <button
          onClick={onNewChat}
          title="Chat Baru"
          className={cn(
            'flex items-center gap-2 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors',
            collapsed ? 'justify-center w-10 h-10' : 'w-full px-3'
          )}
        >
          <PenSquare size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-medium">Chat Baru</span>}
        </button>
      </div>

      <div className="px-2 flex flex-col">
        <NavBtn icon={<Search size={17}/>} label="Cari" onClick={onViewSearch} active={view==='search'}/>
        <NavBtn icon={<Users size={17}/>} label="Grup AI" onClick={onViewGroup} active={view==='group-list'||view==='group-chat'}/>
        <NavBtn icon={<Bookmark size={17}/>} label="Tersimpan" onClick={onViewSaved} active={view==='saved'}/>
      </div>

      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}>
          <div className="flex items-center gap-2 bg-[var(--sf)] rounded-xl px-3 py-2 mb-2">
            <Search size={12} className="text-[var(--mu)] flex-shrink-0"/>
            <input
              type="text"
              placeholder="Cari chat..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]"
            />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1">Riwayat</div>
          {filtered.map(session => (
            <button
              key={session.id}
              onClick={() => onSelectChat(session.id)}
              className={cn(
                'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left',
                activeChatId === session.id ? 'bg-[var(--sf)]' : 'hover:bg-[var(--sf)]'
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', activeChatId === session.id ? 'bg-[var(--ac)]' : 'bg-[var(--bd)]')}/>
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

      <div className={cn('px-2 pb-4 flex-shrink-0', collapsed && 'flex justify-center')}>
        <button
          onClick={onViewProfile}
          title="Profil & Pengaturan"
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors',
            collapsed ? 'justify-center w-10 h-10' : 'w-full px-3'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0">
            <User size={13} className="text-[var(--at)]"/>
          </div>
          {!collapsed && (
            <>
              <span className="text-[13px] font-medium text-[var(--text)] flex-1 text-left truncate">Profil & Pengaturan</span>
              <Settings size={13} className="text-[var(--mu)] flex-shrink-0"/>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

// ── DESKTOP CHAT VIEW ──
const DesktopChatView: React.FC<{
  messages: any[];
  isSending: boolean;
  isSearching: boolean;
  searchQuery: string;
  inputText: string;
  setInputText: (t: string) => void;
  onSend: (imgs?: string[], pdfs?: any[], directText?: string) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (i: number) => void;
  pinnedMessages: any[];
  onSaveItem?: (item: any) => void;
  onRetry?: () => void;
  mode?: any;
  onModeChange?: (m: any) => void;
}> = (props) => {
  const hasMessages = props.messages.length > 1 || (props.messages.length === 1 && props.messages[0]?.role !== 'assistant');
  const isEmpty = !hasMessages && !props.isSending;

  if (isEmpty) {
    return (
      <div
        className="flex-1 flex flex-col items-center px-4"
        style={{ minHeight: 0, justifyContent: 'center', paddingBottom: '10vh' }}
      >
        <style>{`
          @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
        <div className="flex items-center gap-4 mb-8">
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <span className="font-bold text-[var(--text)]" style={{ fontSize: '3rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Cylen
          </span>
        </div>
        <div style={{ width: '100%', maxWidth: 780, animation: 'fadeUp 0.35s ease forwards' }}>
          <ChatPage {...props} desktopWelcomeMode />
        </div>
      </div>
    );
  }

  return <ChatPage {...props} />;
};

/* ── MAIN APP DESKTOP ── */
export default function AppDesktop() {
  const [view, setView] = useState<View>('chat');
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState<Theme>('t-dark');
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
    chatMode, setChatMode,
  } = useChat();

  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, createGroup, addParticipant, sendGroupMessage } = useGroupChat();
  const { savedItems, saveItem, deleteItem } = useSaved();
  const { memoryItems, deleteMemory } = useMemory();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    sendMessage(directText ?? inputText, attachedImage, images, pdfs, directText);
    if (!directText) {
      setInputText('');
      setAttachedImage(null);
    }
  };

  const handleNewChat = () => {
    createNewChat();
    setView('chat');
    showToast('Memulai chat baru');
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  const chatProps = {
    messages, isSending, isSearching, searchQuery,
    inputText, setInputText,
    onSend: handleSendMessage,
    attachedImage, setAttachedImage,
    onTogglePin: togglePin, pinnedMessages,
    onSaveItem: (item: any) => { saveItem({ ...item, chatId: activeChatId }); showToast('Pesan berhasil disimpan!'); },
    onRetry: retryLastMessage,
    mode: chatMode,
    onModeChange: setChatMode,
  };

  return (
    <div
      className={cn('app transition-colors duration-350', theme)}
      style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}
    >
      <style>{`
        .t-light  { --bg:#ffffff; --sf:#f5f5f5; --bd:rgba(0,0,0,.08);  --text:#0a0a0a; --mu:rgba(0,0,0,.38);         --cd:#fff;    --ac:#0a0a0a; --at:#fff;    --ib:#f0f0f0; }
        .t-dark   { --bg:#000000; --sf:#111111; --bd:rgba(255,255,255,.08); --text:#ffffff; --mu:rgba(255,255,255,.38); --cd:#111111; --ac:#ffffff; --at:#000000; --ib:#1a1a1a; }
        .t-cream  { --bg:#f8f4ed; --sf:#ede8df; --bd:rgba(0,0,0,.07);  --text:#2a1f0e; --mu:rgba(42,31,14,.42);       --cd:#fff;    --ac:#2a1f0e; --at':'#f8f4ed'; --ib:#e0d8c8; }
        .t-dusk   { --bg:#12101f; --sf:#1d1a2e; --bd:rgba(255,255,255,.06); --text:#ddd8f5; --mu:rgba(221,216,245,.38); --cd:#181526; --ac:#9d7fea; --at:#12101f; --ib:#252140; }
        .t-forest { --bg:#f0f4ee; --sf:#e2ead8; --bd:rgba(0,0,0,.07);  --text:#162216; --mu:rgba(22,34,22,.42);        --cd:#fff;    --ac:#162216; --at:#f0f4ee; --ib:#d4dece; }
        .t-slate  { --bg:#f0f2f5; --sf:#e4e8ee; --bd:rgba(0,0,0,.08);  --text:#1a2132; --mu:rgba(26,33,50,.42);        --cd:#fff;    --ac:#1a2132; --at:#f0f2f5; --ib:#dde2ea; }
        body { background-color:var(--bg); color:var(--text); }
        .markdown-body h1 { font-size:1.25rem; font-weight:600; margin:1rem 0 0.5rem; }
        .markdown-body h2 { font-size:1.1rem; font-weight:600; margin:0.8rem 0 0.4rem; }
        .markdown-body p { margin-bottom:0.5rem; line-height:1.6; }
        .markdown-body ul, .markdown-body ol { margin-left:1.5rem; margin-bottom:0.5rem; }
        .markdown-body code { background:rgba(255,255,255,0.08); padding:0.2rem 0.4rem; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:0.85em; }
        .t-light .markdown-body code { background:rgba(0,0,0,0.06); }
        .markdown-body pre { background:#111; color:#f8f8f8; padding:1rem; border-radius:8px; overflow-x:auto; margin:1rem 0; }
        .markdown-body pre code { background:transparent; padding:0; color:inherit; }
      `}</style>

      <DesktopSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        view={view}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }}
        onViewProfile={() => setView('profile')}
        onViewGroup={() => setView('group-list')}
        onViewSaved={() => setView('saved')}
        onViewSearch={() => setView('search')}
        onNewChat={handleNewChat}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {view !== 'chat' && view !== 'search' && (
          <header className="flex items-center gap-3 px-6 py-4 border-b border-[var(--bd)] flex-shrink-0">
            <button
              onClick={() => {
                if (view === 'group-chat') setView('group-list');
                else if (view === 'memory') setView('profile');
                else setView('chat');
              }}
              className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft size={18}/>
            </button>
            <h1 className="text-[15px] font-semibold text-[var(--text)]">
              {view === 'profile' && 'Profil & Pengaturan'}
              {view === 'saved' && 'Tersimpan'}
              {view === 'memory' && 'Memori Cylen'}
              {view === 'group-list' && 'Grup AI'}
              {view === 'group-chat' && 'Diskusi Grup'}
            </h1>
          </header>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'chat' && <DesktopChatView {...chatProps} />}
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
            className="fixed bottom-8 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
