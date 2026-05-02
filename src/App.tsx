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
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { TasksPage } from './pages/TasksPage'; 
import { Theme, Font, View } from './types';
import { FONTS } from './constants';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#fff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  // 🔥 FIX DARK THEME: Pure Black biar efek Kaca Meledak!
  't-dark':  { '--bg':'#010101', '--sf':'#161616', '--bd':'rgba(255,255,255,.07)', '--text':'#f0f0f0', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#fff', '--at':'#0d0d0d', '--ib':'#222222' },
};

export default function App() {
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 

  const {
    chatSessions, activeChatId, setActiveChatId,
    messages, isSending, isSearching, searchQuery,
    sendMessage, createNewChat, createTempChat,
    togglePin, pinnedMessages,
    retryLastMessage,
    chatMode, setChatMode,
    isTemporary 
  } = useChat();

  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, createGroup, addParticipant, sendGroupMessage } = useGroupChat();
  const { savedItems, saveItem, deleteItem } = useSaved();
  const { memoryItems, deleteMemory } = useMemory();

  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--text'];
  }, [theme]);

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
    setIsSidebarOpen(false); 
    setIsCanvasActive(false);
    setIsZoomOpen(false); 
    showToast('Memulai chat baru'); 
  };

  const handleNewTempChat = () => {
    if (createTempChat) {
      createTempChat();
      showToast('Mode Hantu diaktifkan');
    }
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');

  return (
    <div className={cn("app transition-colors duration-300", theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} />

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
        onNewChat={handleNewChat}
        onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {view !== 'search' && view !== 'tasks' && (
          <Header 
            view={view as any} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            onBackClick={() => { setView('chat'); }} 
            onNewChatClick={handleNewChat} 
            onNewTempChatClick={handleNewTempChat}
            isCanvasActive={isCanvasActive}
            onZoomClick={() => setIsZoomOpen(true)} 
            isEmptyChat={isEmptyChat}
            isTemporary={isTemporary} 
          />
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {view === 'tasks' && <TasksPage onClose={() => setView('chat')} />}

          <AnimatePresence mode="wait">
            {view === 'chat' && (
              <motion.div key="chat" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0}} transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
                <ChatPage
                  messages={messages} isSending={isSending} isSearching={isSearching}
                  searchQuery={searchQuery} inputText={inputText} setInputText={setInputText}
                  onSend={handleSendMessage} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
                  onTogglePin={togglePin} pinnedMessages={pinnedMessages}
                  onSaveItem={(item) => { saveItem({ ...item, chatId: activeChatId }); showToast('Pesan disimpan!'); }}
                  onRetry={retryLastMessage} mode={chatMode} onModeChange={setChatMode}
                  isCanvasActive={isCanvasActive} 
                  onOpenCanvas={() => setIsCanvasActive(true)}
                  onCloseCanvas={() => setIsCanvasActive(false)}
                />
              </motion.div>
            )}

            {view === 'group-list' && (
              <motion.div key="group-list" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                <GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={createGroup} />
              </motion.div>
            )}

            {view === 'group-chat' && (
              <motion.div key="group-chat" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0}} transition={{ duration: 0.2 }} className="flex-1 flex flex-col overflow-hidden">
                <GroupChatPage group={activeGroup!} messages={activeGroup?.messages || []} isSending={isGroupSending} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} onBack={() => setView('group-list')} />
              </motion.div>
            )}

            {view === 'profile' && <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} />}
            {view === 'saved' && <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} />}
            {view === 'search' && <SearchPage onBack={() => setView('chat')} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }} chatSessions={chatSessions} />}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0, y:20, x:'-50%'}} animate={{opacity:1, y:0, x:'-50%'}} exit={{opacity:0, y:20, x:'-50%'}} transition={{ duration: 0.2, ease: "easeOut" }} className="fixed bottom-32 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-3 rounded-full text-[14px] font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[100] whitespace-nowrap border border-white/10">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
