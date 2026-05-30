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

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#000000', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.35)', '--cd':'#171717', '--ac':'#ffffff', '--at':'#000000', '--ib':'#252525' },
};

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return "Cylen";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

function applyThemeToDOM(bg: string, isDark: boolean) {
  document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
  const themeMeta = document.createElement('meta');
  themeMeta.name = 'theme-color';
  themeMeta.content = bg;
  document.head.appendChild(themeMeta);
  document.querySelectorAll('meta[name="color-scheme"]').forEach(el => el.remove());
  const csMeta = document.createElement('meta');
  csMeta.name = 'color-scheme';
  csMeta.content = isDark ? 'dark' : 'light';
  document.head.appendChild(csMeta);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
}

export default function AppMobile() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [isRouting, setIsRouting] = useState(true); 
  const [view, setView] = useState<View | string>('chat');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 't-dark' : 't-light'
  );
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS['t-light'];
    const isDark = theme === 't-dark';
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    applyThemeToDOM(vars['--bg'], isDark);
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

  const handleNewChat = () => { createNewChat(false); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false); };
  const handleToggleGhostMode = () => { if (isTemporary) createNewChat(false); else createNewChat(true); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false); };
  const handleBackClick = () => {
    switch (view) {
      case 'group-chat': setView('group-list'); break;
      case 'group-profile': setView('group-chat'); break;
      case 'memory': case 'ai-settings': case 'appearance': case 'usage':
      case 'integrations': case 'security': case 'export': case 'haptics': case 'report':
        setView('profile'); break;
      default: setView('chat'); break;
    }
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const activeChat = chatSessions.find((s: any) => s.id === activeChatId);

  if (isAuthLoading || (user && isRouting)) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }} />;
  }

  // 👇 Ini memanggil LoginPage modular yang baru lu simpen
  if (!user) return <LoginPage />;

  return (
    <div className={cn('app', theme)} style={{ fontFamily: currentFontFamily, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'clip', backgroundColor: 'var(--bg)' }}>
      <style>{`html, body, #root { background-color: var(--bg) !important; margin: 0 !important; padding: 0 !important; }`}</style>
      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} participants={activeGroup?.participants || []} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id: string) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); }} onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }} onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }} onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }} onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }} onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }} onNewChat={handleNewChat} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      {view !== 'search' && view !== 'tasks' && view !== 'appearance' && view !== 'usage' && view !== 'integrations' && view !== 'security' && view !== 'export' && view !== 'group-profile' && view !== 'saved' && view !== 'haptics' && view !== 'report' && (
        <Header view={view as any} onMenuClick={() => setIsSidebarOpen(true)} onBackClick={handleBackClick} onNewChatClick={handleNewChat} onToggleGhostMode={handleToggleGhostMode} isCanvasActive={isCanvasActive} onZoomClick={() => setIsZoomOpen(true)} isEmptyChat={isEmptyChat} isTemporary={isTemporary} activeChatTitle={getSmartTitle(activeChat)} />
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}
        {view === 'chat' && <ChatPage messages={messages} isSending={isSending} isSearching={isSearching} webCount={0} postCount={0} activityStatus={activityStatus} inputText={inputText} setInputText={setInputText} onSend={handleSendMessage} attachedImage={attachedImage} setAttachedImage={setAttachedImage} onTogglePin={togglePin} pinnedMessages={pinnedMessages} onSaveItem={(text: string) => { saveItem(text, activeChatId); showToast('Pesan berhasil disimpan!'); }} onRetry={retryLastMessage} mode={chatMode} onModeChange={setChatMode} isCanvasActive={isCanvasActive} onOpenCanvas={() => setIsCanvasActive(true)} onCloseCanvas={() => setIsCanvasActive(false)} onUpgradeClick={() => setIsSubscriptionOpen(true)} isTemporary={isTemporary} />}
        {view === 'profile' && <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onUpgradeClick={() => setIsSubscriptionOpen(true)} onViewAppearance={() => setView('appearance')} onViewUsage={() => setView('usage')} onViewIntegrations={() => setView('integrations')} onViewSecurity={() => setView('security')} onViewExport={() => setView('export')} onViewHaptics={() => setView('haptics')} onViewReport={() => setView('report')} />}
        {view === 'appearance' && <AppearancePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} onBack={handleBackClick} showToast={showToast} />}
        {view === 'usage' && <UsagePage onBack={handleBackClick} />}
        {view === 'integrations' && <IntegrationPage onBack={handleBackClick} showToast={showToast} />}
        {view === 'security' && <SecurityPage onBack={handleBackClick} showToast={showToast} />}
        {view === 'export' && <ExportDataPage onBack={handleBackClick} showToast={showToast} />}
        {view === 'haptics' && <HapticsPage onBack={handleBackClick} />}
        {view === 'report' && <ReportPage onBack={handleBackClick} showToast={showToast} />}
        {view === 'ai-settings' && <AiSettings onBack={handleBackClick} />}
        {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId: string) => { setActiveChatId(chatId); setView('chat'); }} onBack={() => setView('chat')} />}
        {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} />}
        {view === 'search' && <SearchPage chatSessions={chatSessions} onBack={() => setView('chat')} onSelectChat={(chatId: string) => { setActiveChatId(chatId); setView('chat'); showToast('Membuka percakapan'); }} />}
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
      </div>
      <AnimatePresence>
        {toast && <motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }} className="fixed bottom-24 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
