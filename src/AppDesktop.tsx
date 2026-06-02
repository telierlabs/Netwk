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
import { GroupProfilePage } from './pages/GroupProfilePage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { TasksPage } from './pages/TasksPage';
import { AppearancePage } from './pages/AppearancePage';
import { UsagePage } from './pages/UsagePage';
import { IntegrationPage } from './pages/IntegrationPage';
import { SecurityPage } from './pages/SecurityPage';
import { ExportDataPage } from './pages/ExportDataPage';
import { HapticsPage } from './pages/HapticsPage'; 
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { subscribeToAuthChanges } from './services/authService';
import { auth } from './lib/firebase';
import { User } from 'firebase/auth';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';
import { Search, User as UserIcon, Settings, Bookmark, Users, ChevronsLeft, ChevronsRight, PenSquare, Clock, MoreHorizontal, Edit2, Pin, Trash2 } from 'lucide-react';
import { SubscriptionModal } from './components/paywall/SubscriptionModal';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#000000', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#ffffff', '--at':'#000000', '--ib':'#252525' },
};

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return "Cylen";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

const DesktopSidebar: React.FC<any> = ({ collapsed, onToggle, view, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onViewTasks, onNewChat, chatSessions, activeChatId, onSelectChat, onRenameChat, onPinChat, onDeleteChat }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const filtered = [...chatSessions].sort((a:any, b:any) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  const NavBtn = ({ icon, label, onClick, active }: any) => (
    <button onClick={onClick} title={label} className={cn('w-full flex items-center justify-center p-3 rounded-xl transition-colors my-0.5', !collapsed && 'justify-start gap-3 px-3', active ? 'bg-[var(--bd)] text-[var(--text)]' : 'text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]')}>
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && <span className="text-[13.5px] font-medium">{label}</span>}
    </button>
  );
  return (
    <aside className="flex flex-col flex-shrink-0 border-r border-[var(--bd)] transition-all duration-200" style={{ width: collapsed ? 64 : 240, height: '100dvh', backgroundColor: 'var(--bg)' }}>
      <div className={cn('flex items-center py-4 px-2', collapsed ? 'flex-col gap-3' : 'px-3 gap-2 justify-between')}>
        <button onClick={onNewChat} title="Cylen" className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-70 transition-opacity">
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 38, height: 38, objectFit: 'contain' }} />
        </button>
        {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)] flex-1">Cylen</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors flex-shrink-0" title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronsRight size={17}/> : <ChevronsLeft size={17}/>}
        </button>
      </div>
      <div className={cn('px-2 mb-2', collapsed && 'flex justify-center')}>
        <button onClick={onNewChat} title="Chat Baru" className={cn('flex items-center gap-2 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}>
          <PenSquare size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-medium">Chat Baru</span>}
        </button>
      </div>
      <div className="px-2 flex flex-col">
        <NavBtn icon={<Search size={17}/>} label="Cari" onClick={onViewSearch} active={view==='search'}/>
        <NavBtn icon={<Clock size={17}/>} label="Tasks" onClick={onViewTasks} active={view==='tasks'}/>
        <NavBtn icon={<Users size={17}/>} label="Grup AI" onClick={onViewGroup} active={view==='group-list'||view==='group-chat'||view==='group-profile'}/>
        <NavBtn icon={<Bookmark size={17}/>} label="Tersimpan" onClick={onViewSaved} active={view==='saved'}/>
      </div>
      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1 mt-1">Riwayat</div>
          {filtered.map((session:any) => (
            <div key={session.id} className="relative group">
              <button onClick={() => onSelectChat(session.id)} className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left', activeChatId === session.id ? 'bg-[var(--sf)]' : 'hover:bg-[var(--sf)]')}>
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', activeChatId === session.id ? 'bg-[var(--ac)]' : 'bg-[var(--bd)]')}/>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate flex-1">{getSmartTitle(session)}</p>
                    {session.isPinned && <Pin size={10} className="text-[var(--text)]/60 flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">{session.messages[session.messages.length-1]?.content?.slice(0,40) || 'Memulai chat...'}...</p>
                </div>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }} className={cn("absolute right-2 top-2 p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 transition-all active:scale-90", openMenuId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <MoreHorizontal size={14} />
              </button>
              <AnimatePresence>
                {openMenuId === session.id && (
                  <motion.div initial={{opacity:0, y:-5, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, scale:0.95}} transition={{duration:0.1}} className="absolute right-0 top-9 w-36 bg-[var(--bg)] border border-[var(--bd)] rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); const newTitle = prompt('Nama baru:', getSmartTitle(session)); if (newTitle?.trim()) onRenameChat?.(session.id, newTitle.trim()); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Edit2 size={13} /> Ubah Nama</button>
                    <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Pin size={13} /> {session.isPinned ? 'Unpin' : 'Pin'}</button>
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Hapus chat ini?')) onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /> Hapus</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
      {collapsed && <div className="flex-1"/>}
      <div className={cn('px-2 pb-4 flex-shrink-0', collapsed && 'flex justify-center')}>
        <button onClick={onViewProfile} title="Profil & Pengaturan" className={cn('flex items-center gap-3 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}>
          <div className="w-7 h-7 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0"><UserIcon size={13} className="text-[var(--at)]"/></div>
          {!collapsed && (<><span className="text-[13px] font-medium text-[var(--text)] flex-1 text-left truncate">Profil & Pengaturan</span><Settings size={13} className="text-[var(--mu)] flex-shrink-0"/></>)}
        </button>
      </div>
    </aside>
  );
};

const DesktopChatView: React.FC<any> = (props) => {
  const isEmpty = props.messages.length === 0 && !props.isSending;
  if (isEmpty) {
    if (props.isTemporary) return <ChatPage {...props} />;
    return (
      <div className="flex-1 flex flex-col items-center px-4" style={{ minHeight: 0, justifyContent: 'center', paddingBottom: '10vh' }}>
        <style>{`@keyframes fadeUpDesktop { from{opacity:0; margin-top: 15px} to{opacity:1; margin-top: 0} }`}</style>
        <div className="flex items-center gap-4 mb-8">
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 72, height: 72, objectFit: 'contain' }} />
          <span className="font-bold text-[var(--text)]" style={{ fontSize: '3rem', letterSpacing: '-0.02em', lineHeight: 1 }}>Cylen</span>
        </div>
        <div style={{ width: '100%', maxWidth: 780, animation: 'fadeUpDesktop 0.35s ease forwards' }}>
          <ChatPage {...props} desktopWelcomeMode />
        </div>
      </div>
    );
  }
  return <ChatPage {...props} />;
};

export default function AppDesktop() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [isRouting, setIsRouting] = useState(true); 
  const [view, setView] = useState<View | string>('chat');
  
  const [collapsed, setCollapsed] = useState(true);
  const [theme, setTheme] = useState<Theme>('t-light'); 
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--text'];
  }, [theme]);

  const { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession } = useChat();
  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, thinkingAI, createGroup, addParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup } = useGroupChat();
  const { savedItems, saveItem, deleteItem } = useSaved();
  const { memoryItems, deleteMemory } = useMemory();

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffect(() => {
    if (isAuthLoading || !user) return; 
    
    const checkRoute = async () => {
      const path = window.location.pathname;
      if (path.startsWith('/join/')) {
        const groupId = path.split('/join/')[1];
        if (groupId) {
          const result = await joinGroup(groupId);
          if (result.success) {
            setActiveGroupId(groupId);
            setView('group-chat'); 
            showToast(result.alreadyMember ? 'Selamat datang kembali!' : 'Berhasil bergabung ke grup!');
          } else {
            showToast(result.message || 'Gagal masuk grup');
          }
        }
        window.history.replaceState({}, '', '/');
      }
      setTimeout(() => setIsRouting(false), 50); 
    };

    checkRoute();
  }, [isAuthLoading, user]);

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    const textToSend = directText ?? inputText;
    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    if (!directText) { setInputText(''); setAttachedImage(null); }
  };
  const handleNewChat = () => { createNewChat(false); setView('chat'); setIsCanvasActive(false); setIsZoomOpen(false); };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const activeChat = chatSessions.find((s:any) => s.id === activeChatId);

  const chatProps = {
    messages, isSending, isSearching, activityStatus, webCount: 0, postCount: 0,
    inputText, setInputText, onSend: handleSendMessage, attachedImage, setAttachedImage,
    onTogglePin: togglePin, pinnedMessages,
    onSaveItem: (text: string) => { saveItem(text, activeChatId); showToast('Pesan berhasil disimpan!'); },
    onRetry: retryLastMessage, mode: chatMode, onModeChange: setChatMode,
    isCanvasActive, onOpenCanvas: () => setIsCanvasActive(true), onCloseCanvas: () => setIsCanvasActive(false),
    onUpgradeClick: () => setIsSubscriptionOpen(true), isTemporary,
  };

  if (isAuthLoading || (user && isRouting)) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }} />;
  }

  // 👇 INI YANG PENTING: Firebase handle kemunculan login page
  if (!user) return <LoginPage />;

  return (
    <div className={cn('app transition-colors duration-350', theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'clip' }}>
      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} participants={activeGroup?.participants || []} />
      <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} view={view} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id: string) => { setActiveChatId(id); setView('chat'); setIsCanvasActive(false); }} onViewProfile={() => setView('profile')} onViewGroup={() => setView('group-list')} onViewSaved={() => setView('saved')} onViewSearch={() => setView('search')} onViewTasks={() => setView('tasks')} onNewChat={handleNewChat} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {view === 'chat' && !isEmptyChat && (<div className="absolute top-4 left-6 z-10 hidden md:block pointer-events-none"><span className="font-bold text-[var(--text)] opacity-50 tracking-tight text-[18px]">{getSmartTitle(activeChat)}</span></div>)}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'chat' && isEmptyChat && (
            <div className={cn("flex-shrink-0 flex items-center justify-end px-4 py-2 transition-all border-b border-transparent z-10", isTemporary ? "bg-[var(--text)]/[0.02]" : "")}>
              <button onClick={() => { if (isTemporary) createNewChat(false); else createNewChat(true); }} title={isTemporary ? "Keluar Mode Hantu" : "Mode Hantu"} className="p-2 rounded-xl transition-all active:scale-95 text-[var(--text)]/40 hover:bg-[var(--text)]/10 hover:text-[var(--text)] outline-none">
                {isTemporary ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]"><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/><path d="M9 10h.01" stroke="var(--bg)" strokeWidth="3"/><path d="M15 10h.01" stroke="var(--bg)" strokeWidth="3"/></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>)}
              </button>
            </div>
          )}
          {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}
          {view === 'chat' && <DesktopChatView {...chatProps} />}
          {view === 'profile' && <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onUpgradeClick={() => setIsSubscriptionOpen(true)} onViewAppearance={() => setView('appearance')} onViewUsage={() => setView('usage')} onViewIntegrations={() => setView('integrations')} onViewSecurity={() => setView('security')} onViewExport={() => setView('export')} onViewHaptics={() => setView('haptics')} onViewReport={() => setView('report')} />}
          {view === 'appearance' && <AppearancePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} onBack={() => setView('profile')} showToast={showToast} />}
          {view === 'usage' && <UsagePage onBack={() => setView('profile')} />}
          {view === 'integrations' && <IntegrationPage onBack={() => setView('profile')} showToast={showToast} />}
          {view === 'security' && <SecurityPage onBack={() => setView('profile')} showToast={showToast} />}
          {view === 'export' && <ExportDataPage onBack={() => setView('profile')} showToast={showToast} />}
          {view === 'haptics' && <HapticsPage onBack={() => setView('profile')} />}
          {view === 'report' && <ReportPage onBack={() => setView('profile')} showToast={showToast} />}
          {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId: string) => { setActiveChatId(chatId); setView('chat'); }} onBack={() => setView('chat')} />}
          {view === 'group-list' && <GroupListPage groups={groupSessions} onSelectGroup={(id: string) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={(title: string) => { createGroup(title).then(id => { if (id) { setActiveGroupId(id); setView('group-chat'); showToast('Grup dibuat di Cloud'); }}); }} onBack={() => setView('chat')} />}
          
          {view === 'group-chat' && activeGroup && <GroupChatPage activeGroup={activeGroup} isSending={isGroupSending} thinkingAI={thinkingAI} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} showToast={showToast} onBack={() => setView('group-list')} onNavigateProfile={() => setView('group-profile')} />}
          
          {view === 'group-profile' && activeGroup && (
            <GroupProfilePage 
              activeGroup={activeGroup} 
              showToast={showToast} 
              onBack={() => setView('group-chat')} 
              onLeaveGroup={async (id) => {
                 const res = await leaveGroup(id);
                 if(res.success) setView('group-list');
                 return res;
              }} 
              onDeleteGroup={async (id) => {
                 const res = await deleteGroup(id);
                 if(res.success) setView('group-list');
                 return res;
              }}
            />
          )}
          {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} />}
          {view === 'search' && <SearchPage chatSessions={chatSessions} onBack={() => setView('chat')} onSelectChat={(chatId: string) => { setActiveChatId(chatId); setView('chat'); showToast('Membuka percakapan'); }} />}
          {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} />}
        </div>
      </div>
      <AnimatePresence>
        {toast && <motion.div initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:20,x:'-50%'}} className="fixed bottom-8 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
