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
import { HapticsPage } from './pages/HapticsPage'; 
import { ReportPage } from './pages/ReportPage';
import { LoginPage } from './pages/LoginPage';
import { subscribeToAuthChanges } from './services/authService';
import { auth } from './lib/firebase';
import { User } from 'firebase/auth';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';

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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 

  const { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, searchQuery, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession } = useChat();
  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, createGroup, addParticipant, sendGroupMessage } = useGroupChat();
  
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

  const handleNewChat = () => { createNewChat(false); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false); showToast('Memulai chat baru'); };
  const handleToggleGhostMode = () => { if (isTemporary) createNewChat(false); else { createNewChat(true); showToast('Mode Hantu diaktifkan'); } setView('chat'); };
  const handleBackClick = () => {
    switch (view) {
      case 'group-chat': setView('group-list'); break;
      case 'group-profile': setView('group-chat'); break;
      case 'memory': case 'ai-settings': case 'haptics': case 'report': setView('profile'); break;
      default: setView('chat'); break;
    }
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const activeChat = chatSessions.find(s => s.id === activeChatId); 

  if (isAuthLoading) {
    return <div style={{ height: '100vh', width: '100vw', backgroundColor: '#ffffff' }} />;
  }

  if (!user) return <LoginPage />;

  return (
    <div className={cn("app transition-colors duration-300", theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); }} onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }} onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }} onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }} onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }} onNewChat={handleNewChat} onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view !== 'search' && view !== 'tasks' && view !== 'group-profile' && view !== 'haptics' && view !== 'report' && (
          <Header view={view as any} onMenuClick={() => setIsSidebarOpen(true)} onBackClick={handleBackClick} onNewChatClick={handleNewChat} onToggleGhostMode={handleToggleGhostMode} isCanvasActive={isCanvasActive} onZoomClick={() => setIsZoomOpen(true)} isEmptyChat={isEmptyChat} isTemporary={isTemporary} activeChatTitle={getSmartTitle(activeChat)} />
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}
          <AnimatePresence mode="wait">
            {view === 'chat' && (
              <motion.div key="chat" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
                <ChatPage 
                  messages={messages} 
                  isSending={isSending} 
                  isSearching={isSearching} 
                  searchQuery={searchQuery} 
                  inputText={inputText} 
                  setInputText={setInputText} 
                  activityStatus={activityStatus} 
                  onSend={handleSendMessage} 
                  attachedImage={attachedImage} 
                  setAttachedImage={setAttachedImage} 
                  onTogglePin={togglePin} 
                  pinnedMessages={pinnedMessages} 
                  // ── INI YANG DIBENERIN: SEKARANG LANGSUNG NERIMA TEXT DARI ACTIONBAR ──
                  onSaveItem={(text) => { 
                    saveItem(text, activeChatId); 
                    showToast('Tersimpan di Perpustakaan!'); 
                  }} 
                  onRetry={retryLastMessage} 
                  mode={chatMode} 
                  onModeChange={setChatMode} 
                  isCanvasActive={isCanvasActive} 
                  onOpenCanvas={() => setIsCanvasActive(true)} 
                  onCloseCanvas={() => setIsCanvasActive(false)} 
                  isTemporary={isTemporary} 
                />
              </motion.div>
            )}
            {view === 'group-list' && (<motion.div key="group-list" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden"><GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={createGroup} onBack={() => setView('chat')} /></motion.div>)}
            {view === 'group-chat' && activeGroup && (<motion.div key="group-chat" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden"><GroupChatPage activeGroup={activeGroup} isSending={isGroupSending} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} showToast={showToast} onBack={() => setView('group-list')} onNavigateProfile={() => setView('group-profile')} /></motion.div>)}
            {view === 'group-profile' && activeGroup && (<motion.div key="group-profile" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden"><GroupProfilePage activeGroup={activeGroup} showToast={showToast} onBack={() => setView('group-chat')} /></motion.div>)}
            {view === 'profile' && (<ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onViewHaptics={() => setView('haptics')} onViewReport={() => setView('report')} />)}
            {view === 'haptics' && <HapticsPage onBack={() => setView('profile')} />}
            {view === 'report' && <ReportPage onBack={() => setView('profile')} showToast={showToast} />}
            {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} onBack={() => setView('chat')} />}
            {view === 'search' && <SearchPage onBack={() => setView('chat')} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }} chatSessions={chatSessions} />}
            {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} onBack={() => setView('profile')} />}
            {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} showToast={showToast} />}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {toast && (<motion.div initial={{opacity:0, y:20, x:'-50%'}} animate={{opacity:1, y:0, x:'-50%'}} exit={{opacity:0, y:20, x:'-50%'}} transition={{ duration: 0.2, ease: "easeOut" }} className="fixed bottom-32 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-3 rounded-full text-[14px] font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[100] whitespace-nowrap border border-white/10">{toast}</motion.div>)}
      </AnimatePresence>
    </div>
  );
}
