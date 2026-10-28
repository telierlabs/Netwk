import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ZoomOverlay } from './components/chat/ZoomOverlay';
import { SubscriptionModal } from './components/paywall/SubscriptionModal';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupChatPage } from './pages/GroupChatPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupProfilePage } from './pages/GroupProfilePage';
import { SavedPage } from './pages/SavedPage';
import { ProjectPage } from './pages/ProjectPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { TasksPage } from './pages/TasksPage'; 
import { HapticsPage } from './pages/HapticsPage'; 
import { ReportPage } from './pages/ReportPage';
import { AppearancePage } from './pages/AppearancePage';
import { UsagePage } from './pages/UsagePage';
import { IntegrationPage } from './pages/IntegrationPage';
import { SecurityPage } from './pages/SecurityPage';
import { ExportDataPage } from './pages/ExportDataPage';
import { LoginPage } from './pages/LoginPage';
import { subscribeToAuthChanges } from './services/authService';
import { auth } from './lib/firebase';
import { User } from 'firebase/auth';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';
import { useT } from './lib/i18n';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#fff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#010101', '--sf':'#161616', '--bd':'rgba(255,255,255,.07)', '--text':'#f0f0f0', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#fff', '--at':'#0d0d0d', '--ib':'#222222' },
};

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return "Cylen";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

// ── Layar lebar (≥768px) = tampilan desktop. Batasnya sama dengan "md:" di Tailwind/Sidebar ──
const useIsDesktop = () => {
  const query = '(min-width: 768px)';
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
};

// ── Layar sambutan khusus desktop: logo besar + kolom ketik di tengah ──
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRouting, setIsRouting] = useState(true);
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const { t } = useT(); // bahasa ikut profile.lang

  const { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, webCount, postCount, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession } = useChat();
  // ← thinkingAI ditambahin biar animasi "AI SEDANG BERPIKIR..." muncul di chat grup
  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, thinkingAI, createGroup, addParticipant, removeParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup } = useGroupChat();
  
  // ── HOOK PERPUSTAKAAN (USE SAVED) ──
  const { savedItems, saveItem, deleteItem } = useSaved();
  
  const { memoryItems, deleteMemory } = useMemory();

  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--text'];
  }, [theme]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      console.log("Status User:", currentUser ? "Login Sukses" : "Belum Login");
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ── Link undangan grup: buka /join/<idGrup> → otomatis masuk grup ──
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

  // Setelah keluar/hapus grup, halaman profil grup sudah nggak punya activeGroup (jadi layar kosong),
  // makanya langsung balik ke daftar grup kalau berhasil.
  const handleLeaveGroup = async (id: string) => {
    const res = await leaveGroup(id);
    if (res.success) setView('group-list');
    return res;
  };
  const handleDeleteGroup = async (id: string) => {
    const res = await deleteGroup(id);
    if (res.success) setView('group-list');
    return res;
  };

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    const textToSend = directText ?? inputText;
    const msgLower = textToSend.toLowerCase();
    if (msgLower.includes('ganti') || msgLower.includes('ubah')) {
      if (msgLower.includes('gelap') || msgLower.includes('hitam')) { setTheme('t-dark'); showToast(t('toastDark')); } 
      else if (msgLower.includes('terang') || msgLower.includes('putih')) { setTheme('t-light'); showToast(t('toastLight')); } 
    }
    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    if (!directText) { setInputText(''); setAttachedImage(null); }
  };

  const handleNewChat = () => { createNewChat(false); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false); showToast(t('toastNewChat')); };
  const handleToggleGhostMode = () => { if (isTemporary) createNewChat(false); else { createNewChat(true); showToast(t('toastGhost')); } setView('chat'); };
  const handleBackClick = () => {
    switch (view) {
      case 'group-chat': setView('group-list'); break;
      case 'group-profile': setView('group-chat'); break;
      case 'memory': case 'ai-settings': case 'haptics': case 'report':
      case 'appearance': case 'usage': case 'integrations': case 'security': case 'export':
        setView('profile'); break;
      default: setView('chat'); break;
    }
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const activeChat = chatSessions.find(s => s.id === activeChatId); 

  // Props chat dipakai bareng oleh tampilan mobile dan desktop
  const chatProps = {
    messages, isSending, isSearching, webCount, postCount, activityStatus,
    inputText, setInputText, onSend: handleSendMessage, attachedImage, setAttachedImage,
    onTogglePin: togglePin, pinnedMessages,
    onSaveItem: (text: string) => { saveItem(text, activeChatId); showToast(t('toastSaved')); },
    onRetry: retryLastMessage, mode: chatMode, onModeChange: setChatMode,
    isCanvasActive, onOpenCanvas: () => setIsCanvasActive(true), onCloseCanvas: () => setIsCanvasActive(false),
    onUpgradeClick: () => setIsSubscriptionOpen(true), isTemporary,
  };

  if (isAuthLoading || (user && isRouting)) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: '#ffffff' }} />;
  }

  // 👇 Langsung render LoginPage kalau user belom login
  if (!user) return <LoginPage />;

  // Halaman yang punya tombol kembali sendiri, jadi Header bawaan disembunyikan
  const hideHeaderViews = ['search', 'tasks', 'project', 'group-profile', 'haptics', 'report', 'appearance', 'usage', 'integrations', 'security', 'export'];

  return (
    <div className={cn("app transition-colors duration-300", theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} participants={activeGroup?.participants || []} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); }} onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }} onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }} onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }} onViewProject={() => { setView('project'); setIsSidebarOpen(false); }} onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }} onNewChat={handleNewChat} onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!isDesktop && !hideHeaderViews.includes(view) && (
          <Header view={view as any} onMenuClick={() => setIsSidebarOpen(true)} onBackClick={handleBackClick} onNewChatClick={handleNewChat} onToggleGhostMode={handleToggleGhostMode} isCanvasActive={isCanvasActive} onZoomClick={() => setIsZoomOpen(true)} isEmptyChat={isEmptyChat} isTemporary={isTemporary} activeChatTitle={getSmartTitle(activeChat)} />
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {isDesktop && view === 'chat' && !isEmptyChat && (
            <div className="absolute top-4 left-6 z-10 pointer-events-none">
              <span className="font-bold text-[var(--text)] opacity-50 tracking-tight text-[18px]">{getSmartTitle(activeChat)}</span>
            </div>
          )}
          {isDesktop && view === 'chat' && isEmptyChat && (
            <div className={cn("flex-shrink-0 flex items-center justify-end px-4 py-2 transition-all border-b border-transparent z-10", isTemporary ? "bg-[var(--text)]/[0.02]" : "")}>
              <button onClick={handleToggleGhostMode} title={isTemporary ? "Keluar Mode Hantu" : "Mode Hantu"} className="p-2 rounded-xl transition-all active:scale-95 text-[var(--text)]/40 hover:bg-[var(--text)]/10 hover:text-[var(--text)] outline-none">
                {isTemporary ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]"><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/><path d="M9 10h.01" stroke="var(--bg)" strokeWidth="3"/><path d="M15 10h.01" stroke="var(--bg)" strokeWidth="3"/></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>)}
              </button>
            </div>
          )}
          {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}
          <AnimatePresence mode="wait">
            {view === 'chat' && (
              <motion.div key="chat" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
                {isDesktop ? <DesktopChatView {...chatProps} /> : <ChatPage {...chatProps} />}
              </motion.div>
            )}
            {view === 'group-list' && (<motion.div key="group-list" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden"><GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={createGroup} onBack={() => setView('chat')} /></motion.div>)}
            {view === 'group-chat' && activeGroup && (<motion.div key="group-chat" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden"><GroupChatPage activeGroup={activeGroup} isSending={isGroupSending} thinkingAI={thinkingAI} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} onRemoveParticipant={removeParticipant} showToast={showToast} onBack={() => setView('group-list')} onNavigateProfile={() => setView('group-profile')} /></motion.div>)}
            {view === 'group-profile' && activeGroup && (<motion.div key="group-profile" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden"><GroupProfilePage activeGroup={activeGroup} showToast={showToast} onBack={() => setView('group-chat')} onLeaveGroup={handleLeaveGroup} onDeleteGroup={handleDeleteGroup} /></motion.div>)}
            {view === 'profile' && (<ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onViewHaptics={() => setView('haptics')} onViewReport={() => setView('report')} onUpgradeClick={() => setIsSubscriptionOpen(true)} onViewAppearance={() => setView('appearance')} onViewUsage={() => setView('usage')} onViewIntegrations={() => setView('integrations')} onViewSecurity={() => setView('security')} onViewExport={() => setView('export')} />)}
            {view === 'appearance' && <AppearancePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'usage' && <UsagePage onBack={() => setView('profile')} />}
            {view === 'integrations' && <IntegrationPage onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'security' && <SecurityPage onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'export' && <ExportDataPage onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'haptics' && <HapticsPage onBack={() => setView('profile')} />}
            {view === 'report' && <ReportPage onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} onBack={() => setView('chat')} />}
            {view === 'project' && <ProjectPage chatSessions={chatSessions} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} onBack={() => setView('chat')} />}
            {view === 'search' && <SearchPage onBack={() => setView('chat')} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }} chatSessions={chatSessions} />}
            {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} onBack={() => setView('profile')} />}
            {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} showToast={showToast} />}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {toast && (<motion.div initial={{opacity:0, y:20, x:'-50%'}} animate={{opacity:1, y:0, x:'-50%'}} exit={{opacity:0, y:20, x:'-50%'}} transition={{ duration: 0.2, ease: "easeOut" }} className="fixed bottom-32 md:bottom-8 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-3 rounded-full text-[14px] font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[100] whitespace-nowrap border border-white/10">{toast}</motion.div>)}
      </AnimatePresence>
    </div>
  );
}
