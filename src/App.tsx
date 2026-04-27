import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ZoomOverlay } from './components/chat/ZoomOverlay'; // Ikon Video/Zoom lo di sini
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupChatPage } from './pages/GroupChatPage';
import { GroupListPage } from './pages/GroupListPage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#fff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#0d0d0d', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#f0f0f0', '--mu':'rgba(255,255,255,.35)', '--cd':'#171717', '--ac':'#fff', '--at':'#0d0d0d', '--ib':'#252525' },
};

export default function App() {
  // ── NAVIGATION & UI STATE ──
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // ── GLOBAL FEATURE STATE ──
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); // 🔥 Zoom state

  // ── DATA HOOKS ──
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

  // ── THEME SYNC ──
  useEffect(() => {
    const vars = THEME_VARS[theme] || THEME_VARS['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    document.body.style.backgroundColor = vars['--bg'];
    document.body.style.color = vars['--text'];
  }, [theme]);

  // ── ACTIONS ──
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    const textToSend = directText ?? inputText;
    const msgLower = textToSend.toLowerCase();

    // Auto theme changer logic
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

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  return (
    <div className={cn("app transition-colors duration-350", theme)} style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }}>
      
      {/* ── ZOOM OVERLAY (Absolute Top Layer) ── */}
      <ZoomOverlay 
        isOpen={isZoomOpen} 
        onClose={() => setIsZoomOpen(false)} 
        groupName={view === 'group-chat' ? "Diskusi AI Global" : "Personal Meeting"} 
      />

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
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* ── HEADER ── */}
        {view !== 'search' && (
          <div className="md:hidden">
            <Header 
              view={view as any} 
              onMenuClick={() => setIsSidebarOpen(true)} 
              onBackClick={() => { setView('chat'); }} 
              onNewChatClick={handleNewChat} 
              isCanvasActive={isCanvasActive}
              onZoomClick={() => setIsZoomOpen(true)} // 🔥 Trigger zoom dari header
            />
          </div>
        )}

        {/* ── MAIN CONTENT VIEW ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {view === 'chat' && (
              <motion.div key="chat" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col overflow-hidden">
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
              <motion.div key="group-list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 overflow-hidden">
                <GroupListPage sessions={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onCreateGroup={createGroup} />
              </motion.div>
            )}

            {view === 'group-chat' && (
              <motion.div key="group-chat" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col overflow-hidden">
                <GroupChatPage group={activeGroup!} messages={activeGroup?.messages || []} isSending={isGroupSending} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} onBack={() => setView('group-list')} />
              </motion.div>
            )}

            {view === 'profile' && (
              <motion.div key="profile" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 overflow-hidden">
                <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} />
              </motion.div>
            )}

            {view === 'saved' && (
              <motion.div key="saved" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 overflow-hidden">
                <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={(chatId) => { setActiveChatId(chatId); setView('chat'); }} />
              </motion.div>
            )}

            {view === 'search' && (
              <motion.div key="search" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 overflow-hidden">
                <SearchPage onBack={() => setView('chat')} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); }} chatSessions={chatSessions} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{opacity:0, y:20, x:'-50%'}} 
            animate={{opacity:1, y:0, x:'-50%'}} 
            exit={{opacity:0, y:20, x:'-50%'}} 
            className="fixed bottom-32 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[100] whitespace-nowrap border border-white/10"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
