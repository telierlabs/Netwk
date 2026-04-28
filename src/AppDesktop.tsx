import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { ZoomOverlay } from './components/chat/ZoomOverlay'; 
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupChatPage } from './pages/GroupChatPage';
import { GroupListPage } from './pages/GroupListPage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { TasksPage } from './pages/TasksPage'; // 🔥 IMPORT TASKS PAGE
import { Theme, Font, View } from './types';
import { FONTS } from './constants';
import {
  Search, User, Settings, Bookmark, Users,
  ChevronsLeft, ChevronsRight, PenSquare, ArrowLeft, Video, Clock // 🔥 TAMBAH ICON CLOCK
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
  view: View | string;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onViewTasks: () => void; // 🔥 TAMBAHKAN PROPS
  onNewChat: () => void;
  chatSessions: any[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
}> = ({ collapsed, onToggle, view, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onViewTasks, onNewChat, chatSessions, activeChatId, onSelectChat }) => {
  const [search, setSearch] = useState('');
  const filtered = chatSessions.filter(s => s.title.toLowerCase().includes(search.toLowerCase()));
  const NavBtn = ({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (<button onClick={onClick} title={label} className={cn('w-full flex items-center justify-center p-3 rounded-xl transition-colors my-0.5', !collapsed && 'justify-start gap-3 px-3', active ? 'bg-[var(--bd)] text-[var(--text)]' : 'text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]')}><div className="flex-shrink-0">{icon}</div>{!collapsed && <span className="text-[13.5px] font-medium">{label}</span>}</button>);

  return (
    <aside className="flex flex-col flex-shrink-0 border-r border-[var(--bd)] transition-all duration-200" style={{ width: collapsed ? 64 : 240, height: '100dvh', backgroundColor: 'var(--bg)' }}>
      <div className={cn('flex items-center py-4 px-2', collapsed ? 'flex-col gap-3' : 'px-3 gap-2 justify-between')}><button onClick={onNewChat} title="Cylen AI" className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity"><img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 38, height: 38, objectFit: 'contain' }} /></button>{!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)] flex-1">Cylen AI</span>}<button onClick={onToggle} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors flex-shrink-0" title={collapsed ? 'Expand' : 'Collapse'}>{collapsed ? <ChevronsRight size={17}/> : <ChevronsLeft size={17}/>}</button></div>
      <div className={cn('px-2 mb-2', collapsed && 'flex justify-center')}><button onClick={onNewChat} title="Chat Baru" className={cn('flex items-center gap-2 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}><PenSquare size={16} className="flex-shrink-0"/>{!collapsed && <span className="text-[13.5px] font-medium">Chat Baru</span>}</button></div>
      
      <div className="px-2 flex flex-col">
        <NavBtn icon={<Search size={17}/>} label="Cari" onClick={onViewSearch} active={view==='search'}/>
        <NavBtn icon={<Clock size={17}/>} label="Tasks" onClick={onViewTasks} active={view==='tasks'}/> {/* 🔥 TOMBOL TASKS DI DESKTOP */}
        <NavBtn icon={<Users size={17}/>} label="Grup AI" onClick={onViewGroup} active={view==='group-list'||view==='group-chat'}/>
        <NavBtn icon={<Bookmark size={17}/>} label="Tersimpan" onClick={onViewSaved} active={view==='saved'}/>
      </div>

      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>
      {!collapsed && (<div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}><div className="flex items-center gap-2 bg-[var(--sf)] rounded-xl px-3 py-2 mb-2"><Search size={12} className="text-[var(--mu)] flex-shrink-0"/><input type="text" placeholder="Cari chat..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-transparent text-[13px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]" /></div><div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1">Riwayat</div>{filtered.map(session => (<button key={session.id} onClick={() => onSelectChat(session.id)} className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left', activeChatId === session.id ? 'bg-[var(--sf)]' : 'hover:bg-[var(--sf)]')}><div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', activeChatId === session.id ? 'bg-[var(--ac)]' : 'bg-[var(--bd)]')}/><div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-[var(--text)] truncate">{session.title}</p><p className="text-[11px] text-[var(--mu)] truncate mt-0.5">{session.messages[session.messages.length-1]?.content.slice(0,40)}...</p></div></button>))}</div>)}
      {collapsed && <div className="flex-1"/>}
      <div className={cn('px-2 pb-4 flex-shrink-0', collapsed && 'flex justify-center')}><button onClick={onViewProfile} title="Profil & Pengaturan" className={cn('flex items-center gap-3 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}><div className="w-7 h-7 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0"><User size={13} className="text-[var(--at)]"/></div>{!collapsed && (<><span className="text-[13px] font-medium text-[var(--text)] flex-1 text-left truncate">Profil & Pengaturan</span><Settings size={13} className="text-[var(--mu)] flex-shrink-0"/></>)}</button></div>
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
  isCanvasActive?: boolean;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
}> = (props) => {
  const hasMessages = props.messages.length > 1 || (props.messages.length === 1 && props.messages[0]?.role !== 'assistant');
  const isEmpty = !hasMessages && !props.isSending;

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col items-center px-4" style={{ minHeight: 0, justifyContent: 'center', paddingBottom: '10vh' }}>
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
        <div className="flex items-center gap-4 mb-8">
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <span className="font-bold text-[var(--text)]" style={{ fontSize: '3rem', letterSpacing: '-0.02em', lineHeight: 1 }}>Cylen</span>
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
  const [view, setView] = useState<View | string>('chat');
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState<Theme>('t-dark');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

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
    const textToSend = directText ?? inputText;
    const msgLower = textToSend.toLowerCase();

    if (msgLower.includes('ganti') || msgLower.includes('ubah')) {
      if (msgLower.includes('gelap') || msgLower.includes('hitam')) { setTheme('t-dark'); showToast('Tema Gelap diaktifkan!'); } 
      else if (msgLower.includes('terang') || msgLower.includes('putih')) { setTheme('t-light'); showToast('Tema Terang diaktifkan!'); }
    }

    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    if (!directText) { setInputText(''); setAttachedImage(null); }
  };

  const handleNewChat = () => { 
    createNewChat(); 
    setView('chat'); 
    setIsCanvasActive(false);
    setIsZoomOpen(false); 
    showToast('Memulai chat baru'); 
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  const chatProps = {
    messages, isSending, isSearching, searchQuery,
    inputText, setInputText, onSend: handleSendMessage,
    attachedImage, setAttachedImage,
    onTogglePin: togglePin, pinnedMessages,
    onSaveItem: (item: any) => { saveItem({ ...item, chatId: activeChatId }); showToast('Pesan berhasil disimpan!'); },
    onRetry: retryLastMessage, mode: chatMode, onModeChange: setChatMode,
    isCanvasActive,
    onOpenCanvas: () => setIsCanvasActive(true),
    onCloseCanvas: () => setIsCanvasActive(false)
  };

  return (
    <div className={cn('app transition-colors duration-350', theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      
      {/* 🔥 ZOOM OVERLAY */}
      <ZoomOverlay 
        isOpen={isZoomOpen} 
        onClose={() => setIsZoomOpen(false)} 
        groupName={activeGroup?.title || "Diskusi AI"} 
        participants={activeGroup?.participants || []}
      />

      <DesktopSidebar
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} view={view}
        chatSessions={chatSessions} activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsCanvasActive(false); }}
        onViewProfile={() => setView('profile')} onViewGroup={() => setView('group-list')} onViewSaved={() => setView('saved')} onViewSearch={() => setView('search')}
        onViewTasks={() => setView('tasks')} // 🔥 ARAHKAN KE TASKS
        onNewChat={handleNewChat}
      />
      
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        
        {/* 🔥 HEADER DESKTOP DI-HIDE KALAU BUKA TASKS ATAU SEARCH */}
        {view !== 'chat' && view !== 'search' && view !== 'tasks' && (
          <header className={cn("flex items-center justify-between px-6 border-b transition-all duration-500 ease-in-out flex-shrink-0", isCanvasActive ? "h-10 opacity-60 border-[var(--bd)]" : "py-4 border-[var(--bd)]")}>
            <div className="flex items-center gap-3">
              <button onClick={() => { if (view === 'group-chat') setView('group-list'); else if (view === 'memory' || view === 'ai-settings') setView('profile'); else setView('chat'); }} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--sf)] hover:text-[var(--text)] transition-colors"><ArrowLeft size={isCanvasActive ? 14 : 18}/></button>
              <h1 className={cn("font-semibold text-[var(--text)] transition-all", isCanvasActive ? "text-[13px]" : "text-[15px]")}>
                {view === 'profile' && 'Profil & Pengaturan'}
                {view === 'saved' && 'Tersimpan'}
                {view === 'group-list' && 'Grup AI'}
                {view === 'group-chat' && activeGroup?.title}
              </h1>
            </div>

            {/* 🔥 TOMBOL ZOOM DI DESKTOP HEADER */}
            {view === 'group-chat' && (
              <button 
                onClick={() => setIsZoomOpen(true)}
                className="p-2 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-xl text-[var(--text)] transition-all flex items-center gap-2 px-4"
              >
                <Video size={18} />
                <span className="text-[13px] font-bold">Zoom Meeting</span>
              </button>
            )}
          </header>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* 🔥 RENDER TASKS PAGE DI DESKTOP */}
          {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}

          {view === 'chat' && <DesktopChatView {...chatProps} />}
          {view === 'group-list' && <GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={(title) => { const id = createGroup(title); if (id) { setActiveGroupId(id); setView('group-chat'); showToast('Grup dibuat'); } }} />}
          {view === 'group-chat' && activeGroup && <GroupChatPage activeGroup={activeGroup} isSending={isGroupSending} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} showToast={showToast} />}
          {view === 'profile' && <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} />}
          {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} />}
        </div>
      </div>
      <AnimatePresence>{toast && <motion.div initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:20,x:'-50%'}} className="fixed bottom-8 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">{toast}</motion.div>}</AnimatePresence>
    </div>
  );
}
