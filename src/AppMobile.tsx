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
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { TasksPage } from './pages/TasksPage';
import { AppearancePage, UsagePage, IntegrationPage, SecurityPage, ExportDataPage } from './pages/NewPage';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#000000', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.35)', '--cd':'#171717', '--ac':'#ffffff', '--at':'#000000', '--ib':'#252525' },
  't-cream': { '--bg':'#f8f4ed', '--sf':'#ede8df', '--bd':'rgba(0,0,0,.07)', '--text':'#2a1f0e', '--mu':'rgba(42,31,14,.42)', '--cd':'#fff', '--ac':'#2a1f0e', '--at':'#f8f4ed', '--ib':'#e0d8c8' },
  't-slate': { '--bg':'#f0f2f5', '--sf':'#e4e8ee', '--bd':'rgba(0,0,0,.08)', '--text':'#1a2132', '--mu':'rgba(26,33,50,.42)', '--cd':'#fff', '--ac':'#1a2132', '--at':'#f0f2f5', '--ib':'#dde2ea' },
  't-aurora-light': { '--bg':'#f4f7fb', '--sf':'#eef2f9', '--bd':'rgba(59,130,246,0.15)', '--text':'#0f172a', '--mu':'rgba(15,23,42,0.5)', '--cd':'#ffffff', '--ac':'#3b82f6', '--at':'#ffffff', '--ib':'#dbeafe' },
  't-aurora-dark': { '--bg':'#0b0f19', '--sf':'#131b2f', '--bd':'rgba(96,165,250,0.15)', '--text':'#f8fafc', '--mu':'rgba(248,250,252,0.5)', '--cd':'#111827', '--ac':'#60a5fa', '--at':'#000000', '--ib':'#1e3a8a' },
  't-aurora-blue': { '--bg':'#0f172a', '--sf':'#1e293b', '--bd':'rgba(56,189,248,0.15)', '--text':'#f0f9ff', '--mu':'rgba(240,249,255,0.5)', '--cd':'#0f172a', '--ac':'#38bdf8', '--at':'#0f172a', '--ib':'#0c4a6e' },
  't-aurora-green': { '--bg':'#064e3b', '--sf':'#065f46', '--bd':'rgba(52,211,153,0.15)', '--text':'#ecfdf5', '--mu':'rgba(236,253,245,0.5)', '--cd':'#022c22', '--ac':'#34d399', '--at':'#064e3b', '--ib':'#065f46' },
};

export default function AppMobile() {
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // TEMA DEFAULT DIUBAH JADI LIGHT MODE (PUTIH)
  const [theme, setTheme] = useState<Theme>('t-light'); 
  
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

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
    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    if (!directText) { setInputText(''); setAttachedImage(null); }
  };

  const handleNewChat = () => {
    createNewChat(false);
    setView('chat');
    setIsSidebarOpen(false);
    setIsCanvasActive(false); 
    setIsZoomOpen(false); 
    showToast('Memulai chat baru');
  };

  const handleNewTempChat = () => {
    createNewChat(true);
    setView('chat');
    setIsSidebarOpen(false);
    setIsCanvasActive(false); 
    setIsZoomOpen(false); 
    showToast('Mode Hantu diaktifkan');
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const currentSession = chatSessions.find(s => s.id === activeChatId);
  const isTemporary = currentSession?.isTemporary;

  return (
    <div className={cn('app transition-colors duration-350', theme)} style={{ fontFamily: currentFontFamily, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        html, body {
          position: fixed !important;
          margin: 0; padding: 0;
          width: 100%; height: 100%;
          overflow: hidden !important;
          overscroll-behavior: none; 
          top: 0; left: 0; right: 0; bottom: 0;
        }
        #root {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
      `}</style>

      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />

      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} participants={activeGroup?.participants || []} />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); }} 
        onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }}
        onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }}
        onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }}
        onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }}
        onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }}
        onNewChat={handleNewChat}
      />

      {view !== 'search' && view !== 'tasks' && view !== 'appearance' && view !== 'usage' && view !== 'integrations' && view !== 'security' && view !== 'export' && (
        <Header 
          view={view as any} 
          onMenuClick={() => setIsSidebarOpen(true)} 
          onBackClick={() => { if (view === 'group-chat') setView('group-list'); else if (view === 'memory' || view === 'ai-settings') setView('profile'); else setView('chat'); }} 
          onNewChatClick={handleNewChat}
          onNewTempChatClick={handleNewTempChat}
          isCanvasActive={isCanvasActive} 
          onZoomClick={() => setIsZoomOpen(true)}
          isEmptyChat={isEmptyChat}
          isTemporary={isTemporary}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}

        {view === 'chat' && (
          <ChatPage
            messages={messages} isSending={isSending} isSearching={isSearching}
            searchQuery={searchQuery} inputText={inputText} setInputText={setInputText}
            onSend={handleSendMessage} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
            onTogglePin={togglePin} pinnedMessages={pinnedMessages}
            onSaveItem={(item) => { saveItem({ ...item, chatId: activeChatId }); showToast('Pesan berhasil disimpan!'); }}
            onRetry={retryLastMessage} mode={chatMode} onModeChange={setChatMode}
            isCanvasActive={isCanvasActive} onOpenCanvas={() => setIsCanvasActive(true)}
            onCloseCanvas={() => setIsCanvasActive(false)} 
            onUpgradeClick={() => setIsSubscriptionOpen(true)}
          />
        )}
        
        {view === 'profile' && <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onUpgradeClick={() => setIsSubscriptionOpen(true)} onViewAppearance={() => setView('appearance')} onViewUsage={() => setView('usage')} onViewIntegrations={() => setView('integrations')} onViewSecurity={() => setView('security')} onViewExport={() => setView('export')} />}
        
        {view === 'appearance' && <AppearancePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} onBack={() => setView('profile')} showToast={showToast} />}
        {view === 'usage' && <UsagePage onBack={() => setView('profile')} />}
        {view === 'integrations' && <IntegrationPage onBack={() => setView('profile')} showToast={showToast} />}
        {view === 'security' && <SecurityPage onBack={() => setView('profile')} showToast={showToast} />}
        {view === 'export' && <ExportDataPage onBack={() => setView('profile')} showToast={showToast} />}

        {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} />}
        {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} />}
        {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} />}
        {view === 'search' && <SearchPage chatSessions={chatSessions} onBack={() => setView('chat')} onSelectChat={(chatId) => { setActiveChatId(chatId); setView('chat'); showToast('Membuka percakapan'); }} />}
        {view === 'group-list' && <GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={(title) => { const id = createGroup(title); if (id) { setActiveGroupId(id); setView('group-chat'); showToast('Grup berhasil dibuat'); } else showToast('Maksimal 5 grup tercapai'); }} />}
        {view === 'group-chat' && activeGroup && <GroupChatPage activeGroup={activeGroup} isSending={isGroupSending} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} showToast={showToast} />}
      </div>

      <AnimatePresence>
        {toast && <motion.div initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:20,x:'-50%'}} className="fixed bottom-24 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
