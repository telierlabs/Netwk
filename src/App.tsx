import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useGroupChat } from './hooks/useGroupChat';
import { useSaved } from './hooks/useSaved';
import { useMemory } from './hooks/useMemory';
import { useSwipeSidebar } from './hooks/useSwipeSidebar';
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
import { Search, User as UserIcon, Settings, Bookmark, Users, ChevronsLeft, ChevronsRight, PenSquare, Clock, MoreHorizontal, Edit2, Pin, Trash2, Folder } from 'lucide-react';

// Gambar tulisan "CYLEN" — file yang sama persis dengan header versi mobile
// (src/components/layout/Header.tsx). Diwarnai otomatis ngikut tema lewat CSS mask.
const CYLEN_WORDMARK_SRC = '/104076-removebg-preview.png';

const THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#fff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#010101', '--sf':'#161616', '--bd':'rgba(255,255,255,.07)', '--text':'#f0f0f0', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#fff', '--at':'#0d0d0d', '--ib':'#222222' },
};

// Palet warna desktop asli (sedikit beda dari mobile, terutama dark mode)
const DESKTOP_THEME_VARS: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#000000', '--sf':'#1c1c1c', '--bd':'rgba(255,255,255,.07)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#ffffff', '--at':'#000000', '--ib':'#252525' },
};

// Dari AppMobile lama: warna bar status browser HP + color-scheme ikut tema
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

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return "Cylen";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

// ── Sidebar desktop (desain asli desktop, bisa collapse) ──
const DesktopSidebar: React.FC<any> = ({ collapsed, onToggle, view, onViewProfile, onViewGroup, onViewSaved, onViewProject, onViewSearch, onViewTasks, onNewChat, chatSessions, activeChatId, onSelectChat, onRenameChat, onPinChat, onDeleteChat }) => {
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
        <NavBtn icon={<Clock size={17}/>} label="Automations" onClick={onViewTasks} active={view==='tasks'}/>
        <NavBtn icon={<Users size={17}/>} label="Collaboration" onClick={onViewGroup} active={view==='group-list'||view==='group-chat'||view==='group-profile'}/>
        <NavBtn icon={<Folder size={17}/>} label="Project" onClick={onViewProject} active={view==='project'}/>
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

// ── Penentu mobile/desktop: RUMUS SAMA PERSIS dengan src/main.tsx (isMobileDevice) ──
// Jadi tampilan di dalam App selalu sejalan dengan App mana yang dipilih main.tsx.
const isMobileDevice = (): boolean => {
  const touchScreen = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return [touchScreen, smallScreen, mobileUA].filter(Boolean).length >= 2;
};
const useIsDesktop = () => {
  const [isDesktop] = useState(() => typeof window !== 'undefined' && !isMobileDevice());
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
        <div className="flex items-center gap-5 mb-8">
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 100, height: 100, objectFit: 'contain' }} />
          {/* Wordmark gambar: diwarnai pakai CSS mask biar otomatis ngikut tema (putih di dark, hitam di light) */}
          <div
            role="img"
            aria-label="Cylen"
            style={{
              width: 340,
              height: 78,
              backgroundColor: 'var(--text)',
              WebkitMaskImage: `url(${CYLEN_WORDMARK_SRC})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'left center',
              maskImage: `url(${CYLEN_WORDMARK_SRC})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'left center',
            }}
          />
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
  const [theme, setTheme] = useState<Theme>(() =>
    // HP: ikut mode gelap/terang sistem (sama seperti AppMobile lama). Desktop: tetap terang.
    isMobileDevice() && window.matchMedia('(prefers-color-scheme: dark)').matches ? 't-dark' : 't-light'
  );
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const isDesktop = useIsDesktop();
  const { t } = useT(); // bahasa ikut profile.lang

  // 🔧 BARU: searchSources = daftar sumber pencarian yang sedang masuk (buat loading pencarian)
  const { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, webCount, postCount, searchSources, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession } = useChat();
  // ← thinkingAI ditambahin biar animasi "AI SEDANG BERPIKIR..." muncul di chat grup
  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, thinkingAI, createGroup, addParticipant, removeParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup } = useGroupChat();
  
  // ── HOOK PERPUSTAKAAN (USE SAVED) ──
  const { savedItems, saveItem, deleteItem } = useSaved();
  
  const { memoryItems, deleteMemory } = useMemory();

  useEffect(() => {
    const palette = isDesktop ? DESKTOP_THEME_VARS : THEME_VARS;
    const vars = palette[theme] || palette['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    if (isDesktop) {
      document.body.style.backgroundColor = vars['--bg'];
    } else {
      applyThemeToDOM(vars['--bg'], theme === 't-dark');
    }
    document.body.style.color = vars['--text'];
  }, [theme, isDesktop]);

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
    messages, isSending, isSearching, webCount, postCount, searchSources, activityStatus,
    inputText, setInputText, onSend: handleSendMessage, attachedImage, setAttachedImage,
    onTogglePin: togglePin, pinnedMessages,
    onSaveItem: (text: string) => { saveItem(text, activeChatId); showToast(t('toastSaved')); },
    onRetry: retryLastMessage, mode: chatMode, onModeChange: setChatMode,
    isCanvasActive, onOpenCanvas: () => setIsCanvasActive(true), onCloseCanvas: () => setIsCanvasActive(false),
    onUpgradeClick: () => setIsSubscriptionOpen(true), isTemporary,
  };

  // Geser kanan di layar chat (HP) = buka sidebar; geser kiri saat sidebar terbuka = tutup
  const swipeHandlers = useSwipeSidebar({
    enabled: !isDesktop && !isZoomOpen && !isSubscriptionOpen && (isSidebarOpen || (view === 'chat' && !isCanvasActive)),
    isOpen: isSidebarOpen,
    onOpen: () => setIsSidebarOpen(true),
    onClose: () => setIsSidebarOpen(false),
  });

  if (isAuthLoading || (user && isRouting)) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: '#ffffff' }} />;
  }

  // 👇 Langsung render LoginPage kalau user belom login
  if (!user) return <LoginPage />;

  // Halaman yang punya tombol kembali sendiri, jadi Header bawaan disembunyikan
  const hideHeaderViews = ['search', 'tasks', 'project', 'group-profile', 'haptics', 'report', 'appearance', 'usage', 'integrations', 'security', 'export'];

  return (
    <div className={cn("app transition-colors duration-300", theme)} style={isDesktop
      ? { fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }
      : { fontFamily: currentFontFamily, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100dvh', display: 'flex', overflow: 'clip', backgroundColor: 'var(--bg)', overscrollBehaviorX: 'none' }} {...swipeHandlers}>
      {!isDesktop && <style>{`html, body, #root { background-color: var(--bg) !important; margin: 0 !important; padding: 0 !important; }`}</style>}
      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || "Diskusi AI"} participants={activeGroup?.participants || []} />
      {isDesktop ? (
        <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} view={view} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id: string) => { setActiveChatId(id); setView('chat'); setIsCanvasActive(false); }} onViewProfile={() => setView('profile')} onViewGroup={() => setView('group-list')} onViewSaved={() => setView('saved')} onViewProject={() => setView('project')} onViewSearch={() => setView('search')} onViewTasks={() => setView('tasks')} onNewChat={handleNewChat} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      ) : (
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id) => { setActiveChatId(id); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); }} onViewProfile={() => { setView('profile'); setIsSidebarOpen(false); }} onViewGroup={() => { setView('group-list'); setIsSidebarOpen(false); }} onViewSaved={() => { setView('saved'); setIsSidebarOpen(false); }} onViewProject={() => { setView('project'); setIsSidebarOpen(false); }} onViewSearch={() => { setView('search'); setIsSidebarOpen(false); }} onNewChat={handleNewChat} onViewTasks={() => { setView('tasks'); setIsSidebarOpen(false); }} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatSession} />
      )}
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
            {view === 'memory' && <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} onBack={isDesktop ? undefined : () => setView('profile')} />}
            {view === 'ai-settings' && <AiSettings onBack={() => setView('profile')} showToast={showToast} />}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {toast && (<motion.div initial={{opacity:0, y:20, x:'-50%'}} animate={{opacity:1, y:0, x:'-50%'}} exit={{opacity:0, y:20, x:'-50%'}} transition={{ duration: 0.2, ease: "easeOut" }} className={cn('fixed left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 rounded-full z-[100] whitespace-nowrap', isDesktop ? 'bottom-8 py-2.5 text-sm font-medium shadow-2xl' : 'bottom-32 py-3 text-[14px] font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-white/10')}>{toast}</motion.div>)}
      </AnimatePresence>
      {!isDesktop && (<div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'env(safe-area-inset-bottom, 0px)', backgroundColor: 'var(--bg)', zIndex: 200, pointerEvents: 'none' }} />)}
    </div>
  );
}
