import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
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
  't-cream': { '--bg':'#f8f4ed', '--sf':'#ede8df', '--bd':'rgba(0,0,0,.07)', '--text':'#2a1f0e', '--mu':'rgba(42,31,14,.42)', '--cd':'#fff', '--ac':'#2a1f0e', '--at':'#f8f4ed', '--ib':'#e0d8c8' },
  't-dusk':  { '--bg':'#12101f', '--sf':'#1d1a2e', '--bd':'rgba(255,255,255,.06)', '--text':'#ddd8f5', '--mu':'rgba(221,216,245,.38)', '--cd':'#181526', '--ac':'#9d7fea', '--at':'#12101f', '--ib':'#252140' },
  't-forest':{ '--bg':'#f0f4ee', '--sf':'#e2ead8', '--bd':'rgba(0,0,0,.07)', '--text':'#162216', '--mu':'rgba(22,34,22,.42)', '--cd':'#fff', '--ac':'#162216', '--at':'#f0f4ee', '--ib':'#d4dece' },
  't-slate': { '--bg':'#f0f2f5', '--sf':'#e4e8ee', '--bd':'rgba(0,0,0,.08)', '--text':'#1a2132', '--mu':'rgba(26,33,50,.42)', '--cd':'#fff', '--ac':'#1a2132', '--at':'#f0f2f5', '--ib':'#dde2ea' },
};

export default function AppMobile() {
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('t-light');
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // 🔥 STATUS CANVAS GLOBAL 
  const [isCanvasActive, setIsCanvasActive] = useState(false);

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

    if (msgLower.includes('ganti') || msgLower.includes('ubah') || msgLower.includes('jadikan')) {
      if (msgLower.includes('gelap') || msgLower.includes('hitam') || msgLower.includes('item') || msgLower.includes('dark')) {
        setTheme('t-dark'); showToast('Tema Gelap diaktifkan!');
      } 
      else if (msgLower.includes('terang') || msgLower.includes('putih') || msgLower.includes('light')) {
        setTheme('t-light'); showToast('Tema Terang diaktifkan!');
      } 
      else if (msgLower.includes('hijau') || msgLower.includes('hutan') || msgLower.includes('forest')) {
        setTheme('t-forest'); showToast('Tema Forest diaktifkan!');
      } 
      else if (msgLower.includes('ungu') || msgLower.includes('malam') || msgLower.includes('dusk')) {
        setTheme('t-dusk'); showToast('Tema Dusk diaktifkan!');
      }
      else if (msgLower.includes('krim') || msgLower.includes('cream') || msgLower.includes('kuning')) {
        setTheme('t-cream'); showToast('Tema Cream diaktifkan!');
      }
      else if (msgLower.includes('abu') || msgLower.includes('slate')) {
        setTheme('t-slate'); showToast('Tema Slate diaktifkan!');
      }

      if (msgLower.includes('font') || msgLower.includes('huruf')) {
        if (msgLower.includes('modern') || msgLower.includes('biasa')) {
          setFont('Modern'); showToast('Font Modern diterapkan!');
        } else if (msgLower.includes('koding') || msgLower.includes('hacker') || msgLower.includes('mono')) {
          setFont('Mono'); showToast('Font Hacker diterapkan!');
        } else if (msgLower.includes('buku') || msgLower.includes('klasik') || msgLower.includes('serif')) {
          setFont('Serif'); showToast('Font Klasik diterapkan!');
        } else if (msgLower.includes('robot') || msgLower.includes('techy')) {
          setFont('Techy'); showToast('Font Robot diterapkan!');
        }
      }
    }

    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    
    if (!directText) {
      setInputText('');
      setAttachedImage(null);
    }
  };

  const handleNewChat = () => {
    createNewChat();
    setView('chat');
    setIsSidebarOpen(false);
    showToast('Memulai chat baru');
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';

  return (
    <div
      className={cn('app transition-colors duration-350', theme)}
      style={{ fontFamily: currentFontFamily, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); }}
        onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }}
        onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }}
        onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }}
        onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }}
        onNewChat={handleNewChat}
      />

      {view !== 'search' && (
        <Header
          view={view as any}
          onMenuClick={() => setIsSidebarOpen(true)}
          onBackClick={() => {
            if (view === 'group-chat') setView('group-list');
            else if (view === 'memory' || view === 'ai-settings') setView('profile');
            else setView('chat');
          }}
          onNewChatClick={handleNewChat}
          isCanvasActive={isCanvasActive} // 🔥 SAMBUNGIN PROP KE HEADER
        />
      )}

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
            mode={chatMode}
            onModeChange={setChatMode}
            // 🔥 SAMBUNGIN KE CHAT PAGE AGAR BISA TERUSKAN KE CHATINPUT
            isCanvasActive={isCanvasActive}
            onOpenCanvas={() => setIsCanvasActive(true)}
          />
        )}
        {view === 'profile' && (
          <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont}
            showToast={showToast} 
            onViewMemory={() => setView('memory')} 
            onViewAiSettings={() => setView('ai-settings')}
          />
        )}
        {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} />}
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

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{opacity:0,y:20,x:'-50%'}} animate={{opacity:1,y:0,x:'-50%'}} exit={{opacity:0,y:20,x:'-50%'}}
            className="fixed bottom-24 left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 py-2.5 rounded-full text-sm font-medium shadow-2xl z-[100] whitespace-nowrap">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
