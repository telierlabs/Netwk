import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, startTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from './lib/utils';
import { useChat } from './hooks/useChat';
import { useProjects } from './hooks/useProjects';
import { THEME_PALETTES } from './lib/themePalettes';
import { useGroupChat } from './hooks/useGroupChat';
// ── BARU: makeImageThumb, classifyFileName, hashText, UploadInput dipakai auto-save lampiran ke Perpustakaan
import { useSaved, makeImageThumb, classifyFileName, hashText, type UploadInput } from './hooks/useSaved';
// ── BARU: kartu tempelan (cy-paste) dibaca supaya kode yang ditempel user ikut masuk Perpustakaan
import { splitPasted, hasPasted } from './lib/pasted';
import { useMemory } from './hooks/useMemory';
// ── BARU: profil user (nama & foto) buat sidebar desktop
// ── freezeProfile / unfreezeProfile: dipakai saat hapus akun
import { useProfile, freezeProfile, unfreezeProfile } from './hooks/useProfile';
import { useSwipeSidebar } from './hooks/useSwipeSidebar';
import { Sidebar, SIDEBAR_NS, SIDEBAR_TEXT } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ZoomOverlay } from './components/chat/ZoomOverlay';
import { SubscriptionModal } from './components/paywall/SubscriptionModal';
// ── BARU: kartu pil promo langganan (desktop, pojok kanan bawah)
import { PromoPill } from './components/paywall/PromoPill';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
// ── BARU: halaman Edit Profile (nama, tahun lahir, email) ──
import { EditProfilePage } from './pages/EditProfilePage';
// ── BARU: halaman Notifikasi & Izin (notif, lokasi, mikrofon, kamera) ──
import { PermissionsPage } from './pages/PermissionsPage';
import { GroupChatPage } from './pages/GroupChatPage';
import { GroupListPage } from './pages/GroupListPage';
import { GroupProfilePage } from './pages/GroupProfilePage';
import { SavedPage } from './pages/SavedPage';
import { ProjectPage } from './pages/ProjectPage';
import { SearchPage } from './pages/SearchPage';
import { MemoryPage } from './pages/MemoryPage';
import { AiSettings } from './pages/AiSettings';
import { LanguagePage } from './pages/LanguagePage';
import { VoicePage } from './pages/VoicePage';
import { KidsModePage } from './pages/KidsModePage';
import { TasksPage } from './pages/TasksPage'; 
import { HapticsPage } from './pages/HapticsPage'; 
import { ReportPage } from './pages/ReportPage';
import { AppearancePage } from './pages/AppearancePage';
import { UsagePage } from './pages/UsagePage';
import { IntegrationPage } from './pages/IntegrationPage';
// ── BARU: halaman gabungan Data & Privasi (menggantikan SecurityPage + ExportDataPage) ──
import { DataPrivacyPage } from './pages/DataPrivacyPage';
import { LoginPage } from './pages/LoginPage';
import { isPublicLandingPath } from './lib/landingRoutes';
// ← BARU: tombol ganti tema light/dark untuk landing page (+ CSS variable-nya)
import { LandingThemeToggle } from './features/landing/landingTheme';
import { InvitePage } from './pages/InvitePage';
// ← BARU: subscribeToSigningIn; reauthForDelete + logout dipakai hapus akun
import { subscribeToAuthChanges, subscribeToSigningIn, reauthForDelete, logout } from './services/authService';
import { auth } from './lib/firebase';
import { User } from 'firebase/auth';
import { Theme, Font, View } from './types';
import { FONTS } from './constants';
import { useT, usePageText } from './lib/i18n';
import { APP_NS, APP_TEXT } from './lib/appText';
import { initSmoothKeyboard } from './lib/keyboard';
import { Search, User as UserIcon, Settings, Library, Users, ChevronsLeft, ChevronsRight, PenSquare, Clock, MoreHorizontal, Edit2, Pin, Trash2, Folder, FolderMinus, Check } from 'lucide-react';

// Gambar tulisan "CYLEN" — file yang sama persis dengan header versi mobile
// (src/components/layout/Header.tsx). Diwarnai otomatis ngikut tema lewat CSS mask.
const CYLEN_WORDMARK_SRC = '/104076-removebg-preview.png';

// Logo bulan sabit. File PNG-nya putih, jadi kalau dipasang pakai <img> bakal HILANG di tema terang
// (Light / For You). Di sini dipakai sebagai CSS mask: bentuknya dari PNG, warnanya dari var(--text),
// jadi otomatis putih di Dark, hitam di Light, cokelat tua di For You.
const CYLEN_LOGO_SRC = '/82374-removebg-preview.png';
const CylenLogoMark: React.FC<{ size: number }> = ({ size }) => (
  <div
    role="img"
    aria-label="Cylen"
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      backgroundColor: 'var(--text)',
      WebkitMaskImage: `url(${CYLEN_LOGO_SRC})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url(${CYLEN_LOGO_SRC})`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

// Kunci penyimpanan kode undangan grup (biar nggak hilang setelah login)
const PENDING_INVITE_KEY = 'cylen_pending_invite';

// Teks panjang yang ditempel (kartu "Konten yang ditempel" jenis teks) ikut masuk Perpustakaan?
// false = cuma kode tempelan yang disimpan (disarankan, biar Perpustakaan tidak penuh).
const SAVE_PASTED_TEXT = false;

// ── LAPISAN HALAMAN ──
// Semua halaman (Profil, Project, Perpustakaan, Automations, Collaboration, Search, sub-halaman Profil, dst.)
// dipasang sebagai lapisan penuh di atas chat: NAIK DARI BAWAH saat dibuka dan TURUN lagi saat ditutup
// (kurva & gerak seperti bottom sheet titik tiga). Chat dan sidebar tidak disentuh, jadi menutup halaman
// langsung kembali ke apa yang ada di bawahnya: sidebar kalau dibuka dari sidebar, chat kalau tidak.
// Hanya transform + opacity (GPU), jadi ringan di HP.
const PAGE_LAYER_CSS = `
.cy-layer{position:absolute;inset:0;display:flex;flex-direction:column;background:var(--bg);transform:translate3d(0,100%,0);visibility:hidden;pointer-events:none;will-change:transform;backface-visibility:hidden;transition:transform .3s cubic-bezier(.32,.72,0,1),visibility 0s linear .3s}
.cy-layer[data-open="true"]{transform:translate3d(0,0,0);visibility:visible;pointer-events:auto;transition:transform .36s cubic-bezier(.32,.72,0,1),visibility 0s}
.cy-scrim{position:absolute;inset:0;z-index:205;background:#000;opacity:0;pointer-events:none;transition:opacity .3s cubic-bezier(.32,.72,0,1)}
.cy-scrim[data-on="true"]{opacity:.45;transition-duration:.36s}
@media (prefers-reduced-motion:reduce){.cy-layer,.cy-scrim{transition-duration:.01s!important}}
`;

// Halaman yang dibuka DI ATAS halaman lain (induknya tetap terlihat di bawah saat ditutup).
// Halaman yang tidak terdaftar di sini langsung berada di atas chat.
const LAYER_PARENT: Record<string, string> = {
  'group-chat': 'group-list',
  'group-profile': 'group-chat',
  'edit-profile': 'profile', permissions: 'profile', appearance: 'profile', usage: 'profile', integrations: 'profile',
  data: 'profile', haptics: 'profile', report: 'profile', memory: 'profile',
  'ai-settings': 'profile', language: 'profile', voice: 'profile', kids: 'profile',
};
// Daftar lapisan yang terbuka untuk sebuah view, dari bawah ke atas. 'chat' = tidak ada lapisan.
const chainOf = (v: string): string[] => {
  const out: string[] = [];
  let cur: string | undefined = v;
  while (cur && cur !== 'chat' && !out.includes(cur)) { out.unshift(cur); cur = LAYER_PARENT[cur]; }
  return out;
};

// Satu lapisan halaman. Dipasang saat dibuka, dianimasikan naik, lalu saat ditutup dianimasikan turun
// dan baru dilepas (kecuali keepAlive, mis. Profil, yang tetap hidup di belakang).
const PageLayer: React.FC<{ open: boolean; z: number; keepAlive?: boolean; children: React.ReactNode }> = ({ open, z, keepAlive, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const zRef = useRef(z);
  if (open) zRef.current = z; // z-index dikunci selama animasi keluar, jadi nggak loncat di bawah lapisan lain
  const [retain, setRetain] = useState(open);

  useEffect(() => {
    if (open) { setRetain(true); return; }
    if (keepAlive) return;
    const id = window.setTimeout(() => setRetain(false), 450); // setelah animasi turun selesai
    return () => window.clearTimeout(id);
  }, [open, keepAlive]);

  // Animasi digerakkan lewat atribut DOM (bukan state React) supaya mulai di frame yang sama dengan pemasangan.
  // Baca offsetHeight dulu: memaksa browser menghitung posisi awal (di bawah layar) sebelum diganti ke posisi terbuka.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) { void el.offsetHeight; el.dataset.open = 'true'; }
    else el.dataset.open = 'false';
  }, [open]);

  if (!open && !retain && !keepAlive) return null;
  return <div ref={ref} className="cy-layer" style={{ zIndex: zRef.current }}>{children}</div>;
};

// ── PALET: satu sumber di src/lib/themePalettes.ts (dipakai juga oleh useProfile & AppearancePage) ──
// Dulu ada salinan palet di sini, di useProfile.ts, dan di AppearancePage.tsx. Salinan LAMA di useProfile
// menimpa palet baru setiap profil selesai dimuat, itu penyebab warna awal salah.
const THEME_VARS = THEME_PALETTES;

// Desktop memakai palet yang sama dengan mobile
const DESKTOP_THEME_VARS = THEME_VARS;

// ── FIX: update meta yang sudah ada (bukan hapus + bikin ulang tiap ganti tema).
// Hapus-bikin-ulang bikin bar status browser HP berkedip.
function setMeta(name: string, content: string) {
  const all = Array.from(document.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`));
  let el = all[0];
  all.slice(1).forEach(extra => extra.remove());
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.removeAttribute('media'); // meta theme-color versi index.html biasanya pakai media=prefers-color-scheme
  el.content = content;
}

// Dari AppMobile lama: warna bar status browser HP + color-scheme ikut tema
function applyThemeToDOM(bg: string, isDark: boolean) {
  setMeta('theme-color', bg);
  setMeta('color-scheme', isDark ? 'dark' : 'light');
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
}

// ── FIX LAG: bikin callback yang identitasnya STABIL tapi selalu manggil versi terbaru.
// Dipakai supaya ChatPage (yang berat: render semua pesan/markdown) nggak ikut re-render
// tiap kali sidebar dibuka / halaman pindah / toast muncul.
function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return "Cylen";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

// ── Sidebar desktop (desain asli desktop, bisa collapse) ──
const DesktopSidebar: React.FC<any> = ({ collapsed, onToggle, view, onViewProfile, onViewGroup, onViewSaved, onViewProject, onViewSearch, onViewTasks, onNewChat, chatSessions, activeChatId, onSelectChat, onRenameChat, onPinChat, onDeleteChat, onMoveToProject, projects }) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const sx = usePageText(SIDEBAR_NS, SIDEBAR_TEXT);
  const ax = usePageText(APP_NS, APP_TEXT);
  // Profil dari store tunggal (nama & foto selalu sinkron dengan ProfilePage)
  const { profile } = useProfile();
  const customAvatar = profile.avatar;
  const customName = profile.name || 'User';
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
          <CylenLogoMark size={38} />
        </button>
        {!collapsed && <span className="font-bold text-[15px] tracking-tight text-[var(--text)] flex-1">Cylen</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors flex-shrink-0" title={collapsed ? ax.expand : ax.collapse}>
          {collapsed ? <ChevronsRight size={17}/> : <ChevronsLeft size={17}/>}
        </button>
      </div>
      <div className={cn('px-2 mb-2', collapsed && 'flex justify-center')}>
        <button onClick={onNewChat} title={sx.newChat} className={cn('flex items-center gap-2 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}>
          <PenSquare size={16} className="flex-shrink-0"/>
          {!collapsed && <span className="text-[13.5px] font-medium">{sx.newChat}</span>}
        </button>
      </div>
      <div className="px-2 flex flex-col">
        <NavBtn icon={<Search size={17}/>} label={sx.search} onClick={onViewSearch} active={view==='search'}/>
        <NavBtn icon={<Clock size={17}/>} label={sx.automations} onClick={onViewTasks} active={view==='tasks'}/>
        <NavBtn icon={<Users size={17}/>} label={sx.collaboration} onClick={onViewGroup} active={view==='group-list'||view==='group-chat'||view==='group-profile'}/>
        <NavBtn icon={<Folder size={17}/>} label={sx.project} onClick={onViewProject} active={view==='project'}/>
        <NavBtn icon={<Library size={17}/>} label={sx.library} onClick={onViewSaved} active={view==='saved'}/>
      </div>
      <div className="mx-3 my-3 border-t border-[var(--bd)]"/>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0" style={{scrollbarWidth:'none'}}>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-1 mt-1">{sx.conversations}</div>
          {filtered.map((session:any) => (
            <div key={session.id} className="relative group">
              <button onClick={() => onSelectChat(session.id)} className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors text-left', activeChatId === session.id ? 'bg-[var(--sf)]' : 'hover:bg-[var(--sf)]')}>
                <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', activeChatId === session.id ? 'bg-[var(--ac)]' : 'bg-[var(--bd)]')}/>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-[var(--text)] truncate flex-1">{getSmartTitle(session)}</p>
                    {session.isPinned && <Pin size={10} className="text-[var(--text)]/60 flex-shrink-0" />}
                    {session.projectId && <Folder size={10} className="text-[var(--text)]/60 flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-[var(--mu)] truncate mt-0.5">{session.messages[session.messages.length-1]?.content?.slice(0,40) || ax.startChat}...</p>
                </div>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }} className={cn("absolute right-2 top-2 p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 transition-all active:scale-90", openMenuId === session.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                <MoreHorizontal size={14} />
              </button>
              <AnimatePresence>
                {openMenuId === session.id && (
                  <motion.div initial={{opacity:0, y:-5, scale:0.95}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, scale:0.95}} transition={{duration:0.1}} className="absolute right-0 top-9 w-48 bg-[var(--bg)] border border-[var(--bd)] rounded-xl shadow-2xl z-[100] py-1 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); const newTitle = prompt(ax.newName, getSmartTitle(session)); if (newTitle?.trim()) onRenameChat?.(session.id, newTitle.trim()); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Edit2 size={13} /> {sx.rename}</button>
                    <button onClick={(e) => { e.stopPropagation(); onPinChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Pin size={13} /> {session.isPinned ? sx.unpin : sx.pin}</button>
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--mu)]">{sx.project}</div>
                    <div className="max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                      {(projects || []).map((p: any) => (
                        <button key={p.id} onClick={(e) => { e.stopPropagation(); onMoveToProject?.(session.id, p.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
                          <Folder size={13} className="flex-shrink-0" />
                          <span className="flex-1 truncate text-left">{p.name}</span>
                          {session.projectId === p.id && <Check size={13} className="flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                    {(projects || []).length === 0 && (
                      <button onClick={(e) => { e.stopPropagation(); onViewProject?.(); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><Folder size={13} /> {sx.newProject}</button>
                    )}
                    {session.projectId && (
                      <button onClick={(e) => { e.stopPropagation(); onMoveToProject?.(session.id, null); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><FolderMinus size={13} /> {sx.removeFromProject}</button>
                    )}
                    <div className="h-[1px] w-full bg-[var(--bd)] my-1" />
                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm(sx.dlgDeleteBody)) onDeleteChat?.(session.id); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /> {sx.del}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
      {collapsed && <div className="flex-1"/>}
      <div className={cn('px-2 pb-4 flex-shrink-0', collapsed && 'flex justify-center')}>
        <button onClick={onViewProfile} title={ax.profileSettings} className={cn('flex items-center gap-3 p-3 rounded-xl text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)] transition-colors', collapsed ? 'justify-center w-10 h-10' : 'w-full px-3')}>
          {/* Foto & nama dari profil user (sama seperti sidebar HP). Kalau belum ada foto → ikon orang. */}
          <div className="w-7 h-7 rounded-full bg-[var(--ac)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {customAvatar
              ? <img src={customAvatar} alt="Profil" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              : <UserIcon size={13} className="text-[var(--at)]"/>}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text)] truncate">{customName}</div>
                <div className="text-[11px] text-[var(--mu)] truncate">{ax.profileSettings}</div>
              </div>
              <Settings size={13} className="text-[var(--mu)] flex-shrink-0"/>
            </>
          )}
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
          <CylenLogoMark size={100} />
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

// ── FIX LAG: versi memo. Selama props-nya nggak berubah, halaman chat nggak di-render ulang ──
const MemoChatPage = React.memo(ChatPage as React.ComponentType<any>);
const MemoDesktopChatView = React.memo(DesktopChatView);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRouting, setIsRouting] = useState(true);
  // ← BARU: true selama proses login Google berjalan (popup kebuka sampai user masuk)
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [view, setView] = useState<View | string>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // 1) Pilihan tema yang tersimpan (sama dengan yang dibaca index.html sebelum layar pertama digambar),
    //    jadi dari loading sampai antarmuka chat warnanya konsisten.
    try {
      const saved = localStorage.getItem('cylen_theme');
      if (saved === 'system') return (systemDark ? 't-dark' : 't-light') as Theme;
      if (saved && THEME_VARS[saved]) return saved as Theme;
    } catch {}
    // 2) Belum pernah memilih: HP ikut mode gelap/terang sistem, desktop tetap terang.
    return (isMobileDevice() && systemDark ? 't-dark' : 't-light') as Theme;
  });
  const [font, setFont] = useState<Font>('Modern');
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false); 
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const isDesktop = useIsDesktop();
  // HP: keyboard naik bareng kolom ketik (lihat lib/keyboard.ts)
  useEffect(() => { if (isDesktop) return; return initSmoothKeyboard(); }, [isDesktop]);
  const { t } = useT(); // bahasa ikut profile.lang
  const ax = usePageText(APP_NS, APP_TEXT);

  // ── BARU: halaman Profil di-keep-alive (tetap hidup di belakang) supaya buka/tutup instan & mulus.
  // profileOpened: sekali pernah dibuka → selalu terpasang. profileWarm: dipasang diam-diam 2,5 detik
  // setelah app jalan, jadi buka pertama kali pun sudah instan.
  const profileOpened = useRef(false);
  if (chainOf(view).includes('profile')) profileOpened.current = true;
  const [profileWarm, setProfileWarm] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setProfileWarm(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  // Token undangan: ditangkap dari URL /join/<id>, disimpan biar nggak hilang setelah login
  const [pendingInvite, setPendingInvite] = useState<string | null>(() => {
    try {
      const path = window.location.pathname;
      if (path.startsWith('/join/')) {
        const id = decodeURIComponent(path.split('/join/')[1].split('/')[0] || '');
        if (id) {
          localStorage.setItem(PENDING_INVITE_KEY, id);
          window.history.replaceState({}, '', '/');
          return id;
        }
      }
      return localStorage.getItem(PENDING_INVITE_KEY);
    } catch { return null; }
  });

  // ✅ BARU: daftar Project buatan user (nama + instruksi). Dikirim ke useChat supaya instruksinya ikut ke AI.
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  // 🔧 BARU: searchSources = daftar sumber pencarian yang sedang masuk (buat loading pencarian)
  // ✅ BARU: setChatProject = masukkan / keluarkan chat dari halaman Project (dipilih user lewat titik tiga)
  const { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, webCount, postCount, searchSources, searchStage, searchQueries, searchTopic, searchStartedAt, searchNotes, loadingVariant, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession, archiveChatSession, markChatRead, setChatProject } = useChat(projects);
  // ← thinkingAI ditambahin biar animasi "AI SEDANG BERPIKIR..." muncul di chat grup
  const { activeGroup, groupSessions, setActiveGroupId, isSending: isGroupSending, thinkingAI, createGroup, addParticipant, removeParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup } = useGroupChat();
  // Simpan grup terakhir supaya halaman grup tidak kosong sesaat selama animasi turun (mis. setelah keluar / hapus grup)
  const lastGroupRef = useRef<typeof activeGroup>(activeGroup);
  if (activeGroup) lastGroupRef.current = activeGroup;
  const groupForLayer = activeGroup || lastGroupRef.current;
  
  // ── HOOK PERPUSTAKAAN (USE SAVED) ──
  // ← BARU: saveUploads = simpan lampiran yang dikirim user (otomatis) ke Perpustakaan
  const { savedItems, saveItem, saveUploads, deleteItem } = useSaved();
  
  // ← BARU: clearMemory dipakai tombol "Hapus semua memori" di halaman Data & Privasi
  const { memoryItems, deleteMemory, clearMemory } = useMemory();

  // ── BARU: terapkan tema tersimpan (profile.theme) saat app dibuka & saat berubah,
  // supaya pilihan For You / Dark tidak balik ke default setelah refresh.
  const { profile: themeProfile } = useProfile();
  useEffect(() => {
    const saved = themeProfile.theme;
    if (!saved) return;
    // Simpan juga ke localStorage supaya index.html bisa memasang warna yang benar saat web dibuka
    try { localStorage.setItem('cylen_theme', saved); } catch {}
    if (saved !== 'system') { setTheme(saved as Theme); return; }
    // Mode System: ikut berubah saat HP ganti gelap/terang
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme((mq.matches ? 't-dark' : 't-light') as Theme);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeProfile.theme]);

  // ── FIX KEDIP WARNA: pakai useLayoutEffect (bukan useEffect) supaya variabel warna
  // (--bg, --text, dst.) sudah terpasang SEBELUM frame pertama digambar.
  // Sebelumnya: frame pertama tanpa --bg (putih/transparan), baru setelah itu diwarnai,
  // dan karena root punya `transition-colors` jadinya kelihatan fade putih→abu→hitam.
  useLayoutEffect(() => {
    const palette = isDesktop ? DESKTOP_THEME_VARS : THEME_VARS;
    const vars = palette[theme] || palette['t-light'];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    if (isDesktop) {
      root.style.colorScheme = theme === 't-dark' ? 'dark' : 'light';
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

  // ← BARU: dengerin status "lagi proses login" dari authService
  useEffect(() => subscribeToSigningIn(setIsSigningIn), []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // ── Undangan grup: kode dari link /join/<id> sudah ditangkap di state pendingInvite.
  // Gabungnya sendiri lewat halaman InvitePage (bukan otomatis).
  useEffect(() => {
    if (!isAuthLoading && user) setIsRouting(false);
  }, [isAuthLoading, user]);

  const clearInvite = () => {
    try { localStorage.removeItem(PENDING_INVITE_KEY); } catch {}
    setPendingInvite(null);
  };

  const handleJoinInvite = async (groupId: string) => {
    const result = await joinGroup(groupId);
    if (result.success) {
      setActiveGroupId(groupId);
      setView('group-chat');
      clearInvite();
      showToast((result as any).alreadyMember ? ax.welcomeBack : ax.joined);
    }
    return result;
  };

  // ── Panggil /api/delete-account (server) untuk hapus yang tidak bisa dikerjakan client:
  // lampiran besar di subkoleksi files dan file grup. Melempar error kalau gagal.
  const callApi = async (body: Record<string, any>) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('not-signed-in');
    const r = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('api-failed');
  };

  // Hapus SATU obrolan: layar langsung bersih, lalu server membersihkan foto / dokumen lampirannya.
  // Obrolan Private (tidak pernah disimpan) tidak perlu ke server.
  const deleteChatFully = (id: string) => {
    const target: any = chatSessions.find(s => s.id === id);
    deleteChatSession(id);
    if (target?.isTemporary) return;
    callApi({ mode: 'chat', chatId: id }).catch(e => console.error('Gagal bersihkan lampiran obrolan', e));
  };

  // Setelah keluar/hapus grup, halaman profil grup sudah nggak punya activeGroup (jadi layar kosong),
  // makanya langsung balik ke daftar grup kalau berhasil.
  const handleLeaveGroup = async (id: string) => {
    const res = await leaveGroup(id);
    if (res.success) setView('group-list');
    return res;
  };
  const handleDeleteGroup = async (id: string) => {
    let res: { success: boolean; message?: string };
    try {
      await callApi({ mode: 'group', groupId: id });
      setActiveGroupId(null);
      res = { success: true };
    } catch {
      res = await deleteGroup(id); // cadangan kalau server tidak terjangkau (lampiran grup bisa nyisa)
    }
    if (res.success) setView('group-list');
    return res;
  };

  // ── BARU: lampiran yang dikirim user (foto, video, dokumen, file kode, dan kode yang ditempel jadi kartu)
  // otomatis masuk Perpustakaan. Jalan di belakang layar lewat setTimeout, jadi pesan terkirim dulu
  // & chat tidak tertahan. Private Chat tidak disimpan. Foto disimpan sebagai thumbnail kecil, bukan aslinya.
  const autoSaveUploads = (
    images?: string[],
    pdfs?: { data: string; name: string }[],
    text?: string,
    includeAttached = false,
  ) => {
    if (isTemporary) return;
    const imgs = [
      ...(includeAttached && attachedImage && !(images || []).includes(attachedImage) ? [attachedImage] : []),
      ...(images || []),
    ];
    // Kartu "Konten yang ditempel" (```cy-paste) di dalam teks pesan
    const pasted = text && hasPasted(text)
      ? splitPasted(text).blocks.filter(b => b.kind === 'code' || SAVE_PASTED_TEXT)
      : [];
    if (!imgs.length && !(pdfs && pdfs.length) && !pasted.length) return;
    const chatId = activeChatId;
    window.setTimeout(async () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      const stamp = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
      const list: UploadInput[] = [];
      for (let i = 0; i < imgs.length; i++) {
        const src = imgs[i];
        const n = imgs.length > 1 ? `-${i + 1}` : '';
        if (typeof src === 'string' && src.startsWith('data:video')) {
          list.push({ type: 'video', title: `video-${stamp}${n}.mp4`, preview: '' });
        } else {
          list.push({ type: 'gambar', title: `foto-${stamp}${n}.jpg`, preview: '', image: await makeImageThumb(src) });
        }
      }
      (pdfs || []).forEach(f => {
        const c = classifyFileName(f.name);
        list.push({ type: c.type, title: f.name, preview: c.language, language: c.language });
      });
      pasted.forEach(b => {
        const compact = b.text.replace(/\s+/g, ' ').trim();
        const prev = compact.length > 100 ? compact.slice(0, 100).trimEnd() + '...' : compact;
        const key = `paste-${hashText(b.text)}`;
        if (b.kind === 'code') {
          list.push({ type: 'kode', title: 'Snippet Kode', preview: prev, language: (b.lang || 'code').toUpperCase(), key });
        } else {
          list.push({ type: 'teks', title: compact.split(' ').slice(0, 5).join(' ') || 'Teks', preview: prev, key });
        }
      });
      saveUploads(list, chatId);
    }, 0);
  };

  const handleSendMessage = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    const textToSend = directText ?? inputText;
    const msgLower = textToSend.toLowerCase();
    if (msgLower.includes('ganti') || msgLower.includes('ubah')) {
      if (msgLower.includes('gelap') || msgLower.includes('hitam')) { setTheme('t-dark'); showToast(t('toastDark')); } 
      else if (msgLower.includes('terang') || msgLower.includes('putih')) { setTheme('t-light'); showToast(t('toastLight')); } 
    }
    sendMessage(textToSend, attachedImage, images, pdfs, directText);
    autoSaveUploads(images, pdfs, textToSend, !directText);
    if (!directText) { setInputText(''); setAttachedImage(null); }
  };

  const handleNewChat = () => { createNewChat(false); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false); showToast(t('toastNewChat')); };
  const handleToggleGhostMode = () => { if (isTemporary) createNewChat(false); else { createNewChat(true); showToast(t('toastGhost')); } setView('chat'); };
  const handleBackClick = () => {
    switch (view) {
      case 'group-chat': setView('group-list'); break;
      case 'group-profile': setView('group-chat'); break;
      case 'memory': case 'ai-settings': case 'haptics': case 'report':
      case 'appearance': case 'usage': case 'integrations': case 'data': case 'language': case 'voice': case 'kids':
      case 'edit-profile': // ← BARU
      case 'permissions': // ← BARU
        setView('profile'); break;
      default: setView('chat'); break;
    }
  };

  const currentFontFamily = FONTS.find(f => f.id === font)?.family || 'Inter, sans-serif';
  const isEmptyChat = messages.length === 0 || (messages.length === 1 && messages[0]?.role === 'assistant');
  const activeChat = chatSessions.find(s => s.id === activeChatId); 
  // Private Chat: judulnya ikut bahasa yang dipilih (bukan teks tersimpan)
  const chatTitle = isTemporary ? ax.privTitle : getSmartTitle(activeChat);

  // ── FIX LAG: semua callback chat dibikin stabil (identitas tetap, isi selalu terbaru) ──
  const stableSend       = useStableCallback(handleSendMessage);
  const stableSaveItem   = useStableCallback((text: string) => { saveItem(text, activeChatId); showToast(t('toastSaved')); });
  const stableTogglePin  = useStableCallback((...a: any[]) => (togglePin as any)(...a));
  const stableRetry      = useStableCallback((...a: any[]) => (retryLastMessage as any)(...a));
  const stableModeChange = useStableCallback((...a: any[]) => (setChatMode as any)(...a));
  const openCanvas       = useCallback(() => setIsCanvasActive(true), []);
  const closeCanvas      = useCallback(() => setIsCanvasActive(false), []);
  const openSubscription = useCallback(() => setIsSubscriptionOpen(true), []);

  // ── FIX LAG KETIK/SIDEBAR: callback Sidebar dibikin stabil, supaya Sidebar (React.memo)
  // nggak ikut re-render tiap kali kamu ngetik di kolom chat (inputText hidup di App).
  //
  // ── FIX LAG PINDAH HALAMAN: sidebar ditutup DULU (update mendesak, animasinya langsung jalan),
  // sedangkan pindah halaman / ganti chat dibungkus startTransition (update tidak mendesak).
  // ── Halaman dibuka DI ATAS sidebar: sidebar sengaja dibiarkan terbuka di bawahnya, jadi saat halaman
  // ditutup (turun ke bawah) kamu kembali ke sidebar, bukan loncat ke chat. Cara buka/tutup sidebar-nya sendiri tidak diubah.
  // Komponen Sidebar memanggil onViewX() lalu onClose() berurutan; flag singkat ini membuat onClose() itu diabaikan sekali.
  const keepSidebar = useRef(false);
  const sbClose = useCallback(() => {
    if (keepSidebar.current) { keepSidebar.current = false; return; }
    setIsSidebarOpen(false);
  }, []);
  const goPage = (v: string) => {
    keepSidebar.current = true;
    window.setTimeout(() => { keepSidebar.current = false; }, 0);
    startTransition(() => setView(v));
  };
  // Dari dalam halaman → buka sebuah chat: sidebar ikut menutup (animasinya jalan bareng halaman yang turun)
  const openChatFromPage = (chatId: string) => {
    // kartu Perpustakaan / hasil cari yang obrolan aslinya sudah dihapus: jangan buka chat kosong
    if (!chatSessions.some(s => s.id === chatId)) {
      showToast(themeProfile.lang === 'en' ? 'The original chat was deleted' : 'Obrolan aslinya sudah dihapus');
      return;
    }
    setActiveChatId(chatId); setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false);
  };

  const sbSelectChat    = useStableCallback((id: string) => { setIsSidebarOpen(false); startTransition(() => { setActiveChatId(id); setView('chat'); setIsCanvasActive(false); }); });
  const sbViewProfile   = useStableCallback(() => goPage('profile'));
  const sbViewGroup     = useStableCallback(() => goPage('group-list'));
  const sbViewSaved     = useStableCallback(() => goPage('saved'));
  const sbViewProject   = useStableCallback(() => goPage('project'));
  const sbViewSearch    = useStableCallback(() => goPage('search'));
  const sbViewTasks     = useStableCallback(() => goPage('tasks'));
  const sbNewChat       = useStableCallback(() => handleNewChat());
  const sbRenameChat    = useStableCallback((id: string, title: string) => (renameChatSession as any)(id, title));
  const sbPinChat       = useStableCallback((id: string) => (pinChatSession as any)(id));
  const sbDeleteChat    = useStableCallback((id: string) => deleteChatFully(id));
  // ✅ BARU: titik tiga → "Move to Project" / "Keluarkan dari Project".
  // Sekarang BENAR-BENAR memasukkan chat itu ke Project (disimpan ke Firestore lewat useChat),
  // bukan cuma membuka halaman Project. Sidebar tetap terbuka; toast muncul sebagai konfirmasi.
  // Private Chat tidak disimpan ke server, jadi tidak bisa dimasukkan ke Project.
  const sbMoveToProject = useStableCallback((id: string, projectId: string | null) => {
    const target: any = chatSessions.find(s => s.id === id);
    if (projectId && target?.isTemporary) { showToast(ax.privNoProject); return; }
    if ((target?.projectId || null) === projectId) return; // sudah di project itu
    setChatProject(id, projectId);
    const name = projects.find(p => p.id === projectId)?.name;
    showToast(projectId ? ax.movedTo.split('{n}').join(name || ax.projWord) : ax.removedFromProject);
  });
  // ✅ BARU: hapus project → chat di dalamnya DIKELUARKAN (tidak ikut terhapus), lalu project dihapus
  const handleDeleteProject = async (id: string) => {
    chatSessions.forEach(s => { if ((s as any).projectId === id) setChatProject(s.id, null); });
    await deleteProject(id);
    showToast(ax.projectDeleted);
  };
  // ✅ BARU: tombol "Chat baru di project ini" di halaman detail project
  const handleNewChatInProject = (projectId: string) => {
    const newId = createNewChat(false);
    setChatProject(newId, projectId);
    setView('chat'); setIsSidebarOpen(false); setIsCanvasActive(false); setIsZoomOpen(false);
  };
  // ← "Hapus semua obrolan" dari halaman Data & Privasi: server menghapus obrolan (+ lampirannya), Perpustakaan,
  // jadwal Automations, dan Collaboration. Daftar di layar (Perpustakaan / Automations / grup) ikut kosong otomatis.
  const handleDeleteAllChats = async () => {
    const ids = chatSessions.map(s => s.id);
    await callApi({ mode: 'history' });
    setActiveGroupId(null);
    ids.forEach(id => deleteChatSession(id));   // bersihkan daftar obrolan di layar; sisa satu chat kosong
  };
  // ← BARU: "Hapus akun" dari halaman Data & Privasi.
  // Alur: login Google ulang (akun harus sama) → server menghapus semua data + akunnya → keluar ke halaman login.
  const handleDeleteAccount = async () => {
    const token = await reauthForDelete();
    freezeProfile(); // cegah profil dibuat ulang selagi data dihapus
    try {
      const r = await fetch('/api/delete-account', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('delete-failed');
    } catch (e) {
      unfreezeProfile();
      throw e;
    }
    const uid = auth.currentUser?.uid;
    try {
      if (uid) {
        localStorage.removeItem(`cylen_profile_${uid}`);
        localStorage.removeItem(`cylen_profile_avatar_${uid}`);
      }
    } catch {}
    await logout().catch(() => {});
    window.location.replace('/');
  };
  // BARU: arsipkan & tandai dibaca / belum dibaca (disimpan ke Firestore lewat useChat)
  const sbArchiveChat   = useStableCallback((id: string, archived: boolean) => archiveChatSession(id, archived));
  const sbMarkChatRead  = useStableCallback((id: string, read: boolean) => markChatRead(id, read));

  // Props chat dipakai bareng oleh tampilan mobile dan desktop.
  // useMemo: objek ini cuma dibikin ulang kalau datanya beneran berubah —
  // buka sidebar / pindah halaman / toast TIDAK mengubahnya, jadi ChatPage nggak re-render.
  const chatProps = useMemo(() => ({
    messages, isSending, isSearching, webCount, postCount, searchSources, searchStage, searchQueries, searchTopic, searchStartedAt, searchNotes, loadingVariant, activityStatus,
    inputText, setInputText, onSend: stableSend, attachedImage, setAttachedImage,
    onTogglePin: stableTogglePin, pinnedMessages,
    onSaveItem: stableSaveItem,
    onRetry: stableRetry, mode: chatMode, onModeChange: stableModeChange,
    isCanvasActive, onOpenCanvas: openCanvas, onCloseCanvas: closeCanvas,
    onUpgradeClick: openSubscription, isTemporary,
  }), [messages, isSending, isSearching, webCount, postCount, searchSources, searchStage, searchQueries, searchTopic, searchStartedAt, searchNotes, loadingVariant, activityStatus, inputText, attachedImage, pinnedMessages, chatMode, isCanvasActive, isTemporary, stableSend, stableTogglePin, stableSaveItem, stableRetry, stableModeChange, openCanvas, closeCanvas, openSubscription]);

  // Sidebar HP ngikutin jari: geser kanan di layar chat = sidebar keluar sesuai jari, geser kiri saat terbuka = ikut menutup.
  // `swipe.progress` (0..1) dibaca langsung oleh <Sidebar>; selama jari bergerak tidak ada React re-render.
  const swipe = useSwipeSidebar({
    enabled: !isDesktop && !isZoomOpen && !isSubscriptionOpen && view === 'chat' && (isSidebarOpen || !isCanvasActive), // mati selama ada halaman di atas sidebar/chat
    isOpen: isSidebarOpen,
    onOpen: () => setIsSidebarOpen(true),
    onClose: () => setIsSidebarOpen(false),
  });

  // ── FIX KEDIP PUTIH: dulu hardcode '#ffffff' → bikin flash putih tiap buka web di dark mode.
  // Sekarang ikut warna tema (var(--bg) sudah terpasang oleh useLayoutEffect di atas).
  if (isAuthLoading) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }} />;
  }

  // Ada undangan tertunda → tampilkan halaman undangan (belum login pun bisa)
  if (pendingInvite) {
    return <InvitePage groupId={pendingInvite} user={user} onJoin={handleJoinInvite} onDismiss={clearInvite} />;
  }

  if (user && isRouting) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }} />;
  }

  // ← BARU: lagi proses login & user belum masuk → tahan layar kosong ber-warna tema,
  // supaya landing page nggak kedip sebentar sebelum antarmuka chat muncul.
  if (!user && isSigningIn) {
    return <div style={{ height: '100dvh', width: '100vw', backgroundColor: 'var(--bg)' }} />;
  }

  // 👇 Langsung render LoginPage kalau user belom login
  // (juga untuk user yang sudah login tapi membuka link publik seperti /privacy-policy dari menu Profil)
  // ← BARU: ada tombol ganti tema light/dark (default ikut mode HP)
  if (!user || isPublicLandingPath()) {
    return (
      <>
        <LandingThemeToggle />
        <LoginPage loggedIn={!!user} />
      </>
    );
  }

  // Halaman yang punya tombol kembali sendiri, jadi Header bawaan disembunyikan
  // (BARU: 'profile' ikut — halaman Profil sekarang punya header sendiri dengan tombol X)
  const hideHeaderViews = ['search', 'tasks', 'project', 'group-profile', 'haptics', 'report', 'appearance', 'usage', 'integrations', 'data', 'profile', 'language', 'voice', 'kids', 'edit-profile', 'permissions', 'ai-settings'];

  // Lapisan yang sedang terbuka (dari bawah ke atas) dan pembuat lapisannya.
  // Halaman yang dulu memakai Header bawaan (Perpustakaan, daftar/chat grup, Memori) membawa Header-nya ke dalam lapisan.
  const chain = chainOf(view);
  const layer = (id: string, node: React.ReactNode, keepAlive = false) => (
    <PageLayer key={id} open={chain.includes(id)} z={210 + Math.max(0, chain.indexOf(id))} keepAlive={keepAlive}>
      {!isDesktop && !hideHeaderViews.includes(id) && (
        <Header view={id as any} onMenuClick={() => setIsSidebarOpen(true)} onBackClick={handleBackClick} onNewChatClick={handleNewChat} onToggleGhostMode={handleToggleGhostMode} isCanvasActive={isCanvasActive} onZoomClick={() => setIsZoomOpen(true)} isEmptyChat={isEmptyChat} isTemporary={isTemporary} activeChatTitle={chatTitle} />
      )}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{node}</div>
    </PageLayer>
  );

  return (
    // FIX: `transition-colors duration-300` dihapus dari root (penyebab fade warna pas pertama buka)
    <div className={cn("app", theme)} data-sidebar-open={isSidebarOpen} style={isDesktop
      ? { fontFamily: currentFontFamily, height: '100dvh', display: 'flex', overflow: 'hidden' }
      : { fontFamily: currentFontFamily, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100dvh', display: 'flex', overflow: 'clip', backgroundColor: 'var(--bg)', overscrollBehaviorX: 'none' }} {...swipe.handlers}>
      {!isDesktop && <style>{`html, body, #root { background-color: var(--bg) !important; margin: 0 !important; padding: 0 !important; }`}</style>}
      <style>{PAGE_LAYER_CSS}</style>
      <SubscriptionModal isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />
      {/* ── BARU: kartu pil promo, cuma di desktop & layar chat. Klik → buka halaman langganan ── */}
      {isDesktop && view === 'chat' && !isSubscriptionOpen && (
        <PromoPill onClick={() => setIsSubscriptionOpen(true)} />
      )}
      <ZoomOverlay isOpen={isZoomOpen} onClose={() => setIsZoomOpen(false)} groupName={activeGroup?.title || ax.aiDiscussion} participants={activeGroup?.participants || []} />
      {isDesktop ? (
        <DesktopSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} view={view} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={(id: string) => { setActiveChatId(id); setView('chat'); setIsCanvasActive(false); }} onViewProfile={() => setView('profile')} onViewGroup={() => setView('group-list')} onViewSaved={() => setView('saved')} onViewProject={() => setView('project')} onViewSearch={() => setView('search')} onViewTasks={() => setView('tasks')} onNewChat={handleNewChat} onRenameChat={renameChatSession} onPinChat={pinChatSession} onDeleteChat={deleteChatFully} onMoveToProject={sbMoveToProject} projects={projects} />
      ) : (
      <Sidebar isOpen={isSidebarOpen} progress={swipe.progress} onClose={sbClose} chatSessions={chatSessions} activeChatId={activeChatId} onSelectChat={sbSelectChat} onViewProfile={sbViewProfile} onViewGroup={sbViewGroup} onViewSaved={sbViewSaved} onViewProject={sbViewProject} onViewSearch={sbViewSearch} onNewChat={sbNewChat} onViewTasks={sbViewTasks} onRenameChat={sbRenameChat} onPinChat={sbPinChat} onDeleteChat={sbDeleteChat} onMoveToProject={sbMoveToProject} onArchiveChat={sbArchiveChat} onMarkChatRead={sbMarkChatRead} projects={projects} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* Header chat selalu terpasang; halaman lain menutupinya sebagai lapisan, jadi tidak ada loncatan layout saat halaman dibuka / ditutup */}
        {!isDesktop && (
          <Header view={'chat' as any} onMenuClick={() => setIsSidebarOpen(true)} onBackClick={handleBackClick} onNewChatClick={handleNewChat} onToggleGhostMode={handleToggleGhostMode} isCanvasActive={isCanvasActive} onZoomClick={() => setIsZoomOpen(true)} isEmptyChat={isEmptyChat} isTemporary={isTemporary} activeChatTitle={chatTitle} />
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {isDesktop && !isEmptyChat && (
            <div className="absolute top-4 left-6 z-10 pointer-events-none">
              <span className="font-bold text-[var(--text)] opacity-50 tracking-tight text-[18px]">{chatTitle}</span>
            </div>
          )}
          {isDesktop && isEmptyChat && (
            <div className={cn("flex-shrink-0 flex items-center justify-end px-4 py-2 transition-all border-b border-transparent z-10", isTemporary ? "bg-[var(--text)]/[0.02]" : "")}>
              <button onClick={handleToggleGhostMode} title={isTemporary ? ax.exitGhost : ax.ghostMode} className="p-2 rounded-xl transition-all active:scale-95 text-[var(--text)]/40 hover:bg-[var(--text)]/10 hover:text-[var(--text)] outline-none">
                {isTemporary ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]"><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/><path d="M9 10h.01" stroke="var(--bg)" strokeWidth="3"/><path d="M15 10h.01" stroke="var(--bg)" strokeWidth="3"/></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>)}
              </button>
            </div>
          )}
          {/* Chat SELALU tampil & tidak pernah di-display:none lagi. Dulu chat disembunyikan waktu halaman lain terbuka,
              lalu dihitung ulang tata letaknya sekaligus saat balik → itu yang bikin macet. Sekarang halaman cuma menutupinya. */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isDesktop ? <MemoDesktopChatView {...chatProps} /> : <MemoChatPage {...chatProps} />}
          </div>
        </div>

        {/* ── LAPISAN HALAMAN: naik dari bawah saat dibuka, turun saat ditutup (urutan = urutan tumpukan) ── */}
        <div className="cy-scrim" data-on={chain.length > 0} />
        {layer('tasks', <TasksPage onClose={() => setView('chat')} />)}
        {(profileWarm || profileOpened.current) && layer('profile', <ProfilePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} showToast={showToast} onBack={() => setView('chat')} onViewLanguage={() => setView('language')} onViewVoice={() => setView('voice')} onViewKids={() => setView('kids')} onViewMemory={() => setView('memory')} onViewAiSettings={() => setView('ai-settings')} onViewHaptics={() => setView('haptics')} onViewReport={() => setView('report')} onUpgradeClick={() => setIsSubscriptionOpen(true)} onViewAppearance={() => setView('appearance')} onViewUsage={() => setView('usage')} onViewIntegrations={() => setView('integrations')} onViewData={() => setView('data')} onViewEditProfile={() => setView('edit-profile')} onViewPermissions={() => setView('permissions')} />, true)}
        {/* onOpenProfile: ikon "i" di kartu pratinjau grup → langsung ke profil grup */}
        {layer('group-list', <GroupListPage groups={groupSessions} onSelectGroup={(id) => { setActiveGroupId(id); setView('group-chat'); }} onOpenProfile={(id) => { setActiveGroupId(id); setView('group-profile'); }} onCreateGroup={createGroup} onBack={() => setView('chat')} />)}
        {layer('group-chat', groupForLayer ? <GroupChatPage activeGroup={groupForLayer} isSending={isGroupSending} thinkingAI={thinkingAI} onSendMessage={sendGroupMessage} onAddParticipant={addParticipant} onRemoveParticipant={removeParticipant} showToast={showToast} onBack={() => setView('group-list')} onNavigateProfile={() => setView('group-profile')} /> : null)}
        {layer('group-profile', groupForLayer ? <GroupProfilePage activeGroup={groupForLayer} showToast={showToast} onBack={() => setView('group-chat')} onLeaveGroup={handleLeaveGroup} onDeleteGroup={handleDeleteGroup} /> : null)}
        {layer('edit-profile', <EditProfilePage onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('permissions', <PermissionsPage onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('appearance', <AppearancePage theme={theme} setTheme={setTheme} font={font} setFont={setFont} onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('usage', <UsagePage onBack={() => setView('profile')} />)}
        {layer('integrations', <IntegrationPage onBack={() => setView('profile')} showToast={showToast} />)}
        {/* ← BARU: halaman gabungan Data & Privasi (ekspor, hapus obrolan, hapus memori, hapus akun) */}
        {layer('data', <DataPrivacyPage onBack={() => setView('profile')} showToast={showToast} onDeleteAllChats={handleDeleteAllChats} onDeleteAllMemory={clearMemory} onDeleteAccount={handleDeleteAccount} />)}
        {layer('haptics', <HapticsPage onBack={() => setView('profile')} />)}
        {layer('report', <ReportPage onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('saved', <SavedPage savedItems={savedItems} onDelete={deleteItem} onOpenChat={openChatFromPage} onBack={() => setView('chat')} />)}
        {/* Project hanya berisi chat yang dimasukkan user lewat titik tiga. Tombol "Keluarkan" ada di tiap kartu. */}
        {layer('project', <ProjectPage projects={projects} chatSessions={chatSessions} onCreateProject={createProject} onUpdateProject={updateProject} onDeleteProject={handleDeleteProject} onOpenChat={openChatFromPage} onRemoveFromProject={(chatId) => { setChatProject(chatId, null); showToast(ax.removedFromProject); }} onNewChatInProject={handleNewChatInProject} onBack={() => setView('chat')} />)}
        {layer('search', <SearchPage onBack={() => setView('chat')} onSelectChat={openChatFromPage} chatSessions={chatSessions} />)}
        {layer('memory', <MemoryPage memoryItems={memoryItems} onDelete={deleteMemory} onBack={isDesktop ? undefined : () => setView('profile')} />)}
        {layer('ai-settings', <AiSettings onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('language', <LanguagePage onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('voice', <VoicePage onBack={() => setView('profile')} showToast={showToast} />)}
        {layer('kids', <KidsModePage onBack={() => setView('profile')} showToast={showToast} />)}
      </div>
      <AnimatePresence>
        {/* ✅ z-index toast dinaikkan (100 → 400) supaya toast tetap kelihatan di atas sidebar (z-200/201) */}
        {toast && (<motion.div initial={{opacity:0, y:20, x:'-50%'}} animate={{opacity:1, y:0, x:'-50%'}} exit={{opacity:0, y:20, x:'-50%'}} transition={{ duration: 0.2, ease: "easeOut" }} className={cn('fixed left-1/2 bg-[var(--ac)] text-[var(--at)] px-6 rounded-full z-[400] whitespace-nowrap', isDesktop ? 'bottom-8 py-2.5 text-sm font-medium shadow-2xl' : 'bottom-32 py-3 text-[14px] font-bold shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-white/10')}>{toast}</motion.div>)}
      </AnimatePresence>
      {!isDesktop && (<div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 'env(safe-area-inset-bottom, 0px)', backgroundColor: 'var(--bg)', zIndex: 200, pointerEvents: 'none' }} />)}
    </div>
  );
}
