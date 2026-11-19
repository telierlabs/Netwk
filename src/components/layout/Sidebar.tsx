import React, { useState, useRef, useMemo, useCallback, useEffect, memo, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValueEvent, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { ChevronDown, ChevronLeft, Search, User, Settings, Library, Users, ChevronsRight, Clock, MoreHorizontal, Edit2, Pin, Trash2, SquarePen, Folder, FolderInput, FolderMinus, FolderPlus, Archive, ArchiveRestore, Mail, MailOpen, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatSession } from '../../types';
import { useProfile } from '../../hooks/useProfile';
import type { Project } from '../../hooks/useProjects';

interface SidebarProps {
  isOpen: boolean;
  // 0 = tertutup, 1 = terbuka penuh. Dikendalikan useSwipeSidebar (ikut jari)
  progress: MotionValue<number>;
  onClose: () => void;
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewProject: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
  onViewTasks: () => void;
  onRenameChat?: (id: string, newTitle: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onClearAllChats?: () => void;
  onArchiveChat?: (id: string, archived: boolean) => void;
  onMarkChatRead?: (id: string, read: boolean) => void;
  // Daftar Project buatan user (dari useProjects), dipakai untuk pilihan "Move to Project".
  projects?: Project[];
  // Titik tiga → "Move to Project": projectId = project tujuan, null = keluarkan dari project.
  onMoveToProject?: (id: string, projectId: string | null) => void;
}

const formatSessionDate = (dateString?: string | Date | number) => {
  if (!dateString) return "BARU SAJA";

  if (typeof dateString === 'string') {
    return dateString;
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "BARU SAJA";

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

  const dayName = days[d.getDay()];
  const date = d.getDate().toString().padStart(2, '0');
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${dayName}, ${date} ${monthName} ${year} ${hours}:${minutes}`.toUpperCase();
};

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") {
    return session.title;
  }
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  if (!firstUserMsg) return session.title || "Chat Baru";
  return firstUserMsg.split(' ').slice(0, 4).join(' ');
};

// Menu fitur (gaya Grok): SATU blok yang dipotong-potong.
// Potongan paling atas & bawah bulat besar, potongan tengah hampir persegi, dipisah celah tipis 2px.
const NAV_BASE = "w-full flex items-center gap-4 bg-[var(--text)]/5 text-[var(--text)] px-5 py-4 transition-[transform,background-color] active:scale-[0.985] hover:bg-[var(--text)]/10 text-left";
const NAV_FIRST = cn(NAV_BASE, "rounded-t-[26px] rounded-b-[6px]");
const NAV_MID = cn(NAV_BASE, "rounded-[6px]");
const NAV_LAST = cn(NAV_BASE, "rounded-t-[6px] rounded-b-[26px]");

// Default kalau prop projects belum diisi (identitas tetap, jadi React.memo tidak render ulang sia-sia)
const NO_PROJECTS: Project[] = [];

// Tombol di dalam bottom sheet (titik tiga)
const SHEET_ITEM = "w-full flex items-center gap-[18px] h-[62px] px-6 text-[20px] font-medium text-left active:bg-[var(--text)]/10 transition-colors";

// Animasi singkat saat chat naik ke atas setelah di-pin (ringan: cuma transform + opacity)
const PIN_CSS = `
@keyframes cy-pin-in{from{opacity:.3;transform:translate3d(0,18px,0)}to{opacity:1;transform:translate3d(0,0,0)}}
.cy-pin-in{animation:cy-pin-in .32s cubic-bezier(.2,.8,.2,1)}
`;

// Status chat (diarsipkan / belum dibaca / masuk Project) disimpan di dokumen chat Firestore
// (field isArchived / isUnread / projectId), jadi ikut tersinkron ke semua perangkat.
// Perubahannya dikerjakan useChat lewat callback dari App.

// ── FILTER DAFTAR CHAT (menu panah di samping tulisan Conversations) ──
type FilterId = 'semua' | 'belum' | 'riset' | 'arsip' | 'automation';
const FILTERS: { id: FilterId; label: string; empty: string }[] = [
  { id: 'semua', label: 'Semua', empty: 'Belum ada riwayat obrolan.' },
  { id: 'belum', label: 'Belum dibaca', empty: 'Tidak ada obrolan yang belum dibaca.' },
  { id: 'riset', label: 'Riset mendalam', empty: 'Belum ada obrolan riset mendalam.' },
  { id: 'arsip', label: 'Diarsipkan', empty: 'Belum ada obrolan yang diarsipkan.' },
  { id: 'automation', label: 'Automation', empty: 'Belum ada obrolan dari automation.' },
];

// Jenis chat dibaca dari beberapa kemungkinan nama field. Kalau di datamu namanya lain, cukup tambah di sini.
const lc = (v: any) => String(v ?? '').toLowerCase();
const isResearchSession = (s: any): boolean =>
  !!(s?.isResearch || s?.isDeepResearch || s?.deepResearch) ||
  ['research', 'deep-research', 'deepresearch', 'deep_research', 'riset'].includes(lc(s?.mode ?? s?.type ?? s?.kind)) ||
  !!s?.messages?.some?.((m: any) => m?.isResearch || m?.deepResearch || lc(m?.mode) === 'research' || lc(m?.mode) === 'deep-research');
const isAutomationSession = (s: any): boolean =>
  !!(s?.fromTask || s?.isAutomation || s?.taskId || s?.automationId) ||
  ['automation', 'task', 'scheduled', 'schedule'].includes(lc(s?.source ?? s?.type ?? s?.kind));

// ── FIX LAG: tiap baris cuma berisi teks pendek (bukan seluruh isi chat),
// jadi baris bisa di-React.memo dan nggak ikut render ulang kalau datanya sama.
interface RowData {
  id: string;
  title: string;
  preview: string;
  dateLabel: string;
  pinned: boolean;
  pinning?: boolean; // true selama spinner pin tampil
  archived: boolean;
  unread: boolean;
  research: boolean;
  automation: boolean;
  projectId: string | null; // id Project tempat chat ini dimasukkan user (null = tidak di project mana pun)
}

const buildRows = (sessions: ChatSession[]): RowData[] =>
  [...sessions]
    .sort((a, b) => ((b as any).isPinned ? 1 : 0) - ((a as any).isPinned ? 1 : 0))
    .map((s) => {
      const last: any = s.messages?.[s.messages.length - 1];
      const raw = last?.content;
      return {
        id: s.id,
        title: getSmartTitle(s),
        // Dulu seluruh isi balasan AI dirender utuh (cuma dipotong CSS). Sekarang dipotong dulu di data.
        preview: typeof raw === 'string' ? raw.slice(0, 80) : '',
        dateLabel: formatSessionDate((s as any).date || (s as any).updatedAt),
        pinned: !!(s as any).isPinned,
        archived: !!(s as any).isArchived,
        unread: !!(s as any).isUnread,
        research: isResearchSession(s),
        automation: isAutomationSession(s),
        projectId: (s as any).projectId || null,
      };
    });

const matchFilter = (r: RowData, f: FilterId): boolean => {
  if (f === 'arsip') return r.archived;
  if (r.archived) return false; // chat yang diarsipkan hanya muncul di filter "Diarsipkan"
  if (f === 'belum') return r.unread;
  if (f === 'riset') return r.research;
  if (f === 'automation') return r.automation;
  return true;
};

// Menu titik tiga sekarang bottom sheet tunggal di SidebarImpl (bukan popup kecil per baris),
// jadi baris cukup memanggil onOpenMenu(row).
const SessionRow = memo(({ row, active, highlight, onSelect, onOpenMenu }: {
  row: RowData;
  active: boolean;
  highlight?: boolean;
  onSelect: (id: string) => void;
  onOpenMenu: (row: RowData) => void;
}) => (
  <div className={cn("relative group w-full", highlight && "cy-pin-in")}>
    <button
      onClick={() => onSelect(row.id)}
      // content-visibility: baris di luar layar nggak dihitung/digambar (daftar panjang jadi ringan)
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 92px' }}
      className={cn("w-full flex flex-col px-4 py-3.5 rounded-2xl transition-[transform,background-color] active:scale-[0.96] text-left relative", active ? "bg-[var(--text)]/10 shadow-sm" : "hover:bg-[var(--text)]/5")}
    >
      <div className="flex items-center justify-between w-full pr-6">
        <div className="flex items-center gap-2 overflow-hidden">
          {row.unread && <span className="w-2 h-2 rounded-full bg-[var(--text)] flex-shrink-0" aria-label="Belum dibaca" />}
          <span className={cn("text-[16px] truncate max-w-full", active || row.unread ? "font-bold text-[var(--text)]" : "font-semibold text-[var(--text)]")}>
            {row.title}
          </span>
          {row.pinning
            ? <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 border-[var(--text)]/20 border-t-[var(--text)]/80 animate-spin" />
            : row.pinned && <Pin size={12} className="text-[var(--text)]/60 flex-shrink-0" />}
          {row.projectId && <Folder size={12} className="text-[var(--text)]/60 flex-shrink-0" aria-label="Ada di Project" />}
        </div>
      </div>
      <span className="text-[13px] text-[var(--text)]/60 mt-1 line-clamp-1 leading-relaxed">
        {row.preview}
      </span>
      <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text)]/40 mt-2">
        {row.dateLabel}
      </span>
    </button>

    <button
      onClick={(e) => { e.stopPropagation(); onOpenMenu(row); }}
      className="absolute right-3 top-3.5 p-1.5 rounded-full text-[var(--text)]/50 bg-transparent hover:bg-[var(--text)]/10 hover:text-[var(--text)] transition-colors active:scale-90"
    >
      <MoreHorizontal size={18} />
    </button>
  </div>
));

interface ContentProps {
  rows: RowData[];
  activeChatId: string;
  customAvatar: string | null;
  customName: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewProject: () => void;
  onViewSearch: () => void;
  onClose: () => void;
  onNewChat: () => void;
  onViewTasks: () => void;
  onOpenMenu: (row: RowData) => void;
  highlightId: string | null;
}

const MobileSidebarContent = memo(({
  rows, activeChatId, customAvatar, customName, onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewProject,
  onViewSearch, onClose, onNewChat, onViewTasks, onOpenMenu, highlightId
}: ContentProps) => {
  const [filter, setFilter] = useState<FilterId>('semua');
  const [filterOpen, setFilterOpen] = useState(false);
  const counts = useMemo(() => {
    const c: Record<FilterId, number> = { semua: 0, belum: 0, riset: 0, arsip: 0, automation: 0 };
    for (const r of rows) (Object.keys(c) as FilterId[]).forEach((k) => { if (matchFilter(r, k)) c[k]++; });
    return c;
  }, [rows]);
  const visibleRows = useMemo(() => rows.filter((r) => matchFilter(r, filter)), [rows, filter]);
  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat yang baru di-pin naik ke atas → gulir daftar ke atas supaya kelihatan
  useEffect(() => {
    if (highlightId) scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [highlightId]);

  const selectChat = useCallback((id: string) => {
    onSelectChat(id);
    onClose();
  }, [onSelectChat, onClose]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      <style>{PIN_CSS}</style>
      <div className="px-6 pt-6 pb-2 flex items-center justify-between border-none">
        <button onClick={() => { onViewProfile(); onClose(); }} className="flex items-center gap-3 active:scale-95 transition-transform text-left">
          <div className="w-10 h-10 rounded-full bg-[var(--text)] flex items-center justify-center flex-shrink-0 shadow-lg border border-[var(--text)]/10 overflow-hidden">
            {customAvatar ? <img src={customAvatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={22} className="text-[var(--bg)]" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[18px] font-bold text-[var(--text)] tracking-tight leading-tight">{customName}</span>
          </div>
        </button>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--text)]/5 border border-[var(--text)]/10 flex items-center justify-center text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-90 transition-transform">
          <ChevronsRight size={22} strokeWidth={2} />
        </button>
      </div>

      {/* Menu fitur: SATU blok terpotong-potong (gaya Grok), celah antar potongan 2px */}
      <div className="px-3 mt-4 mb-3 flex flex-col gap-[2px]">
        <button onClick={() => { onViewTasks(); onClose(); }} className={NAV_FIRST}>
          <Clock size={22} strokeWidth={2.2} className="flex-shrink-0" />
          <span className="text-[16px] font-bold tracking-wide">Automations</span>
        </button>
        <button onClick={() => { onViewGroup(); onClose(); }} className={NAV_MID}>
          <Users size={22} strokeWidth={2.2} className="flex-shrink-0" />
          <span className="text-[16px] font-bold tracking-wide">Collaboration</span>
        </button>
        <button onClick={() => { onViewProject(); onClose(); }} className={NAV_MID}>
          <Folder size={22} strokeWidth={2.2} className="flex-shrink-0" />
          <span className="text-[16px] font-bold tracking-wide">Project</span>
        </button>
        <button onClick={() => { onViewSaved(); onClose(); }} className={NAV_LAST}>
          <Library size={22} strokeWidth={2.2} className="flex-shrink-0" />
          <span className="text-[16px] font-bold tracking-wide">Perpustakaan</span>
        </button>
      </div>

      <div ref={scrollRef} className="px-3 flex-1 overflow-y-auto min-h-0 pb-4" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>

        <div className="relative z-30 flex items-center justify-between px-4 mb-2 mt-2">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text)]/50">Conversations</span>
          <div className="flex items-center gap-1">
            {filter !== 'semua' && (
              <span className="text-[12px] font-bold text-[var(--text)]/70 bg-[var(--text)]/8 rounded-full px-2.5 py-1">{activeFilter.label}</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setFilterOpen(p => !p); }}
              aria-label="Filter obrolan"
              className="p-1.5 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-lg transition-colors active:scale-95"
            >
              <ChevronDown size={18} strokeWidth={2.5} className={cn("transition-transform duration-200", filterOpen ? "rotate-180" : "rotate-0")} />
            </button>
          </div>

          {filterOpen && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setFilterOpen(false)} />
              <div
                className="cy-filter-pop absolute right-2 top-full mt-1 w-[230px] rounded-[22px] p-1.5 text-[var(--text)] border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)]"
                style={{ background: 'color-mix(in srgb, var(--bg) 96%, var(--text))' }}
              >
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setFilter(f.id); setFilterOpen(false); }}
                    className={cn("w-full flex items-center gap-3 px-3.5 py-3 rounded-[16px] text-[15px] font-semibold text-left active:bg-[var(--text)]/10", filter === f.id && "bg-[var(--text)]/8")}
                  >
                    <span className="flex-1">{f.label}</span>
                    {f.id !== 'semua' && counts[f.id] > 0 && <span className="text-[12px] font-bold text-[var(--text)]/45">{counts[f.id]}</span>}
                    {filter === f.id && <Check size={17} strokeWidth={2.6} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Fade tipis tiap ganti filter (key = filter) */}
        <motion.div
          key={filter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-1"
        >
          {visibleRows.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--text)]/60 font-medium bg-[var(--text)]/5 rounded-2xl mx-2">{activeFilter.empty}</div>
          )}
          {visibleRows.map((row) => (
            <SessionRow
              key={row.id}
              row={row}
              active={activeChatId === row.id}
              highlight={highlightId === row.id}
              onSelect={selectChat}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </motion.div>
      </div>

      {/* Bar bawah: Search jadi pil penuh, Settings & Chat Baru jadi lingkaran (gaya Grok) */}
      <div className="px-4 pb-8 pt-2 flex items-center gap-2.5 flex-shrink-0 relative z-20">
        <button onClick={() => { onViewSearch(); onClose(); }} className="flex-1 flex items-center gap-3 h-[52px] bg-[var(--text)]/5 hover:bg-[var(--text)]/10 rounded-full px-5 transition-[transform,background-color] active:scale-[0.97] text-left">
          <Search size={20} className="text-[var(--text)]/60 flex-shrink-0" />
          <span className="text-[15px] text-[var(--text)]/70 font-bold">Search</span>
        </button>
        <button onClick={() => { onViewProfile(); onClose(); }} className="w-[52px] h-[52px] flex items-center justify-center flex-shrink-0 bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text)] transition-[transform,background-color] active:scale-90 rounded-full">
          <Settings size={26} strokeWidth={2.2} />
        </button>
        <button onClick={() => { onNewChat(); onClose(); }} className="w-[52px] h-[52px] flex items-center justify-center flex-shrink-0 bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text)] transition-[transform,background-color] active:scale-90 rounded-full">
          <SquarePen size={26} strokeWidth={2.2} />
        </button>
      </div>

    </div>
  );
});

// ── BOTTOM SHEET MENU TITIK TIGA (gaya Grok) ──
// Komponen TERPISAH dengan state sendiri: waktu dibuka, HANYA komponen kecil ini yang render ulang
// (Sidebar & daftar chat tidak ikut). Dipasang lewat portal ke <body> supaya lepas dari panel sidebar
// (transform/contain/blur) dan dari handler geser sidebar di App. Gerak pakai CSS transform di GPU.
interface SheetHandle { open: (row: RowData) => void }
interface SheetProps {
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin?: (id: string, wasPinned: boolean) => void;
  onMove: (id: string, projectId: string | null) => void;
  projects: Project[];
  onNewProject: () => void;
  onArchive: (id: string, archived: boolean) => void;
  onToggleRead: (id: string, unread: boolean) => void;
}

const SHEET_CSS = `
.cy-sheet-ov{position:fixed;inset:0;z-index:290;background:rgba(0,0,0,.5);opacity:0;visibility:hidden;pointer-events:none;will-change:opacity;transition:opacity .22s ease,visibility 0s linear .22s}
.cy-sheet-ov[data-open="true"]{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .22s ease,visibility 0s}
.cy-sheet{position:fixed;left:0;right:0;bottom:0;z-index:291;touch-action:none;will-change:transform;contain:layout paint;transform:translate3d(0,100%,0);visibility:hidden;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s linear .28s}
.cy-sheet[data-open="true"]{transform:translate3d(0,0,0);visibility:visible;pointer-events:auto;transition:transform .28s cubic-bezier(.2,.8,.2,1),visibility 0s}
`;

const ChatActionSheet = memo(forwardRef<SheetHandle, SheetProps>(({ onDelete, onRename, onPin, onMove, onArchive, onToggleRead, projects, onNewProject }, ref) => {
  const [row, setRow] = useState<RowData | null>(null);
  const [open, setOpen] = useState(false);
  // true = isi sheet berganti jadi daftar project (setelah tekan "Move to Project")
  const [picking, setPicking] = useState(false);
  const stopTouch = (e: React.TouchEvent) => e.stopPropagation(); // daftar project bisa di-scroll tanpa memicu tarik-untuk-tutup
  const sheetRef = useRef<HTMLDivElement>(null);
  const ovRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y0: number; t0: number; d: number } | null>(null);

  useImperativeHandle(ref, () => ({
    open: (r: RowData) => {
      // bersihkan sisa style hasil tarik (kalau sebelumnya ditutup dengan digeser)
      if (sheetRef.current) { sheetRef.current.style.transform = ''; sheetRef.current.style.transition = ''; }
      if (ovRef.current) { ovRef.current.style.opacity = ''; ovRef.current.style.transition = ''; }
      setRow(r);
      setPicking(false);
      setOpen(true);
    },
  }), []);

  const close = useCallback(() => setOpen(false), []);

  // Aksi dijalankan SETELAH sheet mulai turun, biar dialog/halaman baru nggak berebut frame dengan animasinya.
  const closeThen = useCallback((fn: () => void) => {
    setOpen(false);
    window.setTimeout(fn, 220);
  }, []);

  // Tarik ke bawah untuk menutup — langsung ubah style DOM (tanpa React render) biar ikut jari mulus.
  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // jangan sampai kebaca sebagai geser sidebar
    dragRef.current = { y0: e.touches[0].clientY, t0: performance.now(), d: 0 };
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
    if (ovRef.current) ovRef.current.style.transition = 'none';
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const st = dragRef.current;
    const el = sheetRef.current;
    if (!st || !el) return;
    const d = Math.max(0, e.touches[0].clientY - st.y0);
    st.d = d;
    el.style.transform = `translate3d(0,${d}px,0)`;
    if (ovRef.current) ovRef.current.style.opacity = String(Math.max(0, 1 - d / (el.offsetHeight || 300)));
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const st = dragRef.current;
    dragRef.current = null;
    if (!st) return;
    const el = sheetRef.current;
    const ov = ovRef.current;
    const velocity = st.d / Math.max(1, performance.now() - st.t0);
    if (st.d > 80 || velocity > 0.6) {
      // lanjut turun dari posisi jari, lalu tutup
      if (el) { el.style.transition = ''; el.style.transform = 'translate3d(0,100%,0)'; }
      if (ov) { ov.style.transition = ''; ov.style.opacity = '0'; }
      setOpen(false);
      window.setTimeout(() => {
        if (el) el.style.transform = '';
        if (ov) ov.style.opacity = '';
      }, 320);
    } else {
      // balik ke posisi terbuka (CSS yang menganimasikan)
      if (el) { el.style.transition = ''; el.style.transform = ''; }
      if (ov) { ov.style.transition = ''; ov.style.opacity = ''; }
    }
  };

  return createPortal(
    <>
      <style>{SHEET_CSS}</style>
      <div
        ref={ovRef}
        data-open={open}
        onClick={close}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="cy-sheet-ov"
      />
      <div
        ref={sheetRef}
        data-open={open}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className="cy-sheet rounded-t-[28px] pt-2.5 text-[var(--text)]"
        style={{
          background: 'color-mix(in srgb, var(--bg) 92%, var(--text))',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="w-9 h-1 rounded-full bg-[var(--text)]/30 mx-auto mt-0.5 mb-3" />
        {row && !picking && (
          <>
            <button onClick={() => closeThen(() => onDelete(row.id))} className={cn(SHEET_ITEM, "text-red-500")}>
              <Trash2 size={24} /> Delete
            </button>
            <button onClick={() => closeThen(() => onRename(row.id, row.title))} className={SHEET_ITEM}>
              <Edit2 size={24} /> Rename
            </button>
            <button onClick={() => closeThen(() => onPin?.(row.id, row.pinned))} className={SHEET_ITEM}>
              <Pin size={24} /> {row.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => setPicking(true)} className={SHEET_ITEM}>
              <FolderInput size={24} /> Move to Project
            </button>
            <button onClick={() => closeThen(() => onArchive(row.id, !row.archived))} className={SHEET_ITEM}>
              {row.archived ? <ArchiveRestore size={24} /> : <Archive size={24} />} {row.archived ? 'Keluarkan dari arsip' : 'Arsipkan'}
            </button>
            <button onClick={() => closeThen(() => onToggleRead(row.id, !row.unread))} className={SHEET_ITEM}>
              {row.unread ? <MailOpen size={24} /> : <Mail size={24} />} {row.unread ? 'Tandai sudah dibaca' : 'Tandai belum dibaca'}
            </button>
          </>
        )}
        {row && picking && (
          <>
            <button onClick={() => setPicking(false)} className="w-full flex items-center gap-3 h-[52px] px-5 text-[18px] font-bold text-left active:bg-[var(--text)]/10 transition-colors">
              <ChevronLeft size={24} /> Pilih Project
            </button>
            {projects.length === 0 && (
              <p className="px-6 pt-1 pb-3 text-[15px] leading-relaxed text-[var(--text)]/60">
                Belum ada project. Buat satu dulu, lalu pindahkan chat ini ke sana.
              </p>
            )}
            {projects.length > 0 && (
              <div
                className="max-h-[42vh] overflow-y-auto"
                style={{ touchAction: 'pan-y', overscrollBehavior: 'contain', scrollbarWidth: 'none' }}
                onTouchStart={stopTouch}
                onTouchMove={stopTouch}
                onTouchEnd={stopTouch}
              >
                {projects.map((p) => (
                  <button key={p.id} onClick={() => closeThen(() => onMove(row.id, p.id))} className={SHEET_ITEM}>
                    <Folder size={24} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{p.name}</span>
                    {row.projectId === p.id && <Check size={22} strokeWidth={2.6} className="flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            {row.projectId && (
              <button onClick={() => closeThen(() => onMove(row.id, null))} className={SHEET_ITEM}>
                <FolderMinus size={24} /> Keluarkan dari Project
              </button>
            )}
            <button onClick={() => closeThen(onNewProject)} className={SHEET_ITEM}>
              <FolderPlus size={24} /> Buat project baru
            </button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}));

// ── DIALOG HAPUS & UBAH NAMA (gaya Grok) ──
// Kartu gelap membulat, tombol berupa teks (Batal = warna teks, Hapus = merah) — tanpa tombol putih.
// Komponen terpisah + portal ke <body> + CSS transition (tanpa blur & tanpa mount/unmount),
// jadi dibuka/ditutupnya mulus dan Sidebar nggak ikut render ulang.
interface DialogHandle {
  openDelete: (id: string) => void;
  openRename: (id: string, title: string) => void;
}
interface DialogProps {
  onDelete?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
}

const DLG_BTN = "px-4 py-2.5 rounded-full text-[16px] font-semibold transition-colors active:bg-[var(--text)]/10";

const DIALOG_CSS = `
.cy-dlg-ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.55);opacity:0;visibility:hidden;pointer-events:none;will-change:opacity;transition:opacity .2s ease,visibility 0s linear .2s}
.cy-dlg-ov[data-open="true"]{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .2s ease,visibility 0s}
.cy-dlg{position:fixed;left:50%;top:44%;z-index:301;width:calc(100% - 48px);max-width:380px;opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(-50%,-50%,0) scale(.94);will-change:transform,opacity;transition:transform .2s cubic-bezier(.2,.8,.2,1),opacity .2s ease,visibility 0s linear .2s}
.cy-dlg[data-mode="rename"]{top:36%}
.cy-dlg[data-open="true"]{opacity:1;visibility:visible;pointer-events:auto;transform:translate3d(-50%,-50%,0) scale(1);transition:transform .22s cubic-bezier(.2,.8,.2,1),opacity .18s ease,visibility 0s}
`;

const ChatDialogs = memo(forwardRef<DialogHandle, DialogProps>(({ onDelete, onRename }, ref) => {
  const [mode, setMode] = useState<'delete' | 'rename'>('delete');
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openDelete: (chatId: string) => {
      setMode('delete');
      setId(chatId);
      setOpen(true);
    },
    openRename: (chatId: string, title: string) => {
      setMode('rename');
      setId(chatId);
      setInput(title);
      setOpen(true);
      window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 120);
    },
  }), []);

  const close = useCallback(() => {
    inputRef.current?.blur();
    setOpen(false);
  }, []);

  const confirmDelete = () => {
    if (id) onDelete?.(id);
    close();
  };
  const confirmRename = () => {
    if (id && input.trim()) onRename?.(id, input.trim());
    close();
  };

  return createPortal(
    <>
      <style>{DIALOG_CSS}</style>
      <div className="cy-dlg-ov" data-open={open} onClick={close} />
      <div
        role="dialog"
        data-open={open}
        data-mode={mode}
        className="cy-dlg rounded-[28px] p-6 text-[var(--text)]"
        style={{ background: 'color-mix(in srgb, var(--bg) 92%, var(--text))' }}
      >
        {mode === 'delete' ? (
          <>
            <h3 className="text-[20px] font-bold tracking-tight">Hapus Obrolan</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--text)]/60">
              Yakin mau hapus chat ini? Obrolan yang sudah dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={close} className={DLG_BTN}>Batal</button>
              <button onClick={confirmDelete} className={cn(DLG_BTN, "text-red-500")}>Hapus</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-[20px] font-bold tracking-tight">Ubah Nama</h3>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
              placeholder="Nama chat"
              className="mt-5 w-full bg-[var(--text)]/[0.06] rounded-t-lg border-b-2 border-[var(--text)] px-4 py-3.5 text-[16px] text-[var(--text)] outline-none placeholder:text-[var(--text)]/40"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={close} className={DLG_BTN}>Batal</button>
              <button onClick={confirmRename} className={DLG_BTN}>Simpan</button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}));

const SidebarImpl: React.FC<SidebarProps> = ({
  progress, onClose, chatSessions, activeChatId, onSelectChat,
  onViewProfile, onViewGroup, onViewSaved, onViewProject, onViewSearch, onNewChat, onViewTasks,
  onRenameChat, onPinChat, onDeleteChat, onMoveToProject, onArchiveChat, onMarkChatRead,
  projects = NO_PROJECTS
}) => {
  const dialogApi = useRef<DialogHandle>(null);
  // Bottom sheet titik tiga ada di komponen sendiri (ChatActionSheet); Sidebar cukup memanggil open().
  const sheetApi = useRef<SheetHandle>(null);

  // ── FIX LAG BUKA SIDEBAR ──
  // Dulu isi sidebar baru dibangun SETELAH animasi mulai (mounted=false → true), jadi frame-frame
  // pertama berat dan hamburger terasa nggak respon. Sekarang sidebar SELALU ada di DOM, cuma
  // disembunyikan lewat `visibility` yang dibaca langsung dari `progress` (tanpa React render).
  //
  // Supaya sidebar yang tertutup nggak ikut berat waktu AI lagi mengetik (streaming), data daftar
  // chat DIBEKUKAN selama tertutup dan baru diperbarui saat sidebar mulai dibuka.
  const [mounted, setMounted] = useState(() => progress.get() > 0.001);
  useMotionValueEvent(progress, 'change', (v) => {
    const m = v > 0.001;
    setMounted(prev => (prev === m ? prev : m));
  });
  const frozenSessions = useRef(chatSessions);
  if (mounted) frozenSessions.current = chatSessions;

  const baseRows = useMemo(() => buildRows(frozenSessions.current), [frozenSessions.current]);

  // ── PIN: spinner ringan dulu (~0,45 detik), lalu chat langsung naik ke atas (tanpa nunggu server).
  // pins[id] = { target: status pin yang dituju, applied: false → spinner, true → sudah pindah posisi }
  const [pins, setPins] = useState<Record<string, { target: boolean; applied: boolean }>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const keys = Object.keys(pins);
    if (!keys.length) return baseRows;
    const mapped = baseRows.map((r) => {
      const pin = pins[r.id];
      if (!pin) return r;
      // selama spinner: tahan di posisi lama; setelah itu: tampilkan status baru
      return pin.applied ? { ...r, pinned: pin.target, pinning: false } : { ...r, pinned: !pin.target, pinning: true };
    });
    const rank = (r: RowData) => {
      const pin = pins[r.id];
      if (r.pinned) return pin && pin.applied && pin.target ? 0 : 1; // yang baru di-pin paling atas
      return 2;
    };
    return mapped
      .map((r, i) => [r, i] as const)
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
      .map((x) => x[0]);
  }, [baseRows, pins]);

  // Data asli dari server sudah sama dengan tujuan → hapus override
  useEffect(() => {
    setPins((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(prev)) {
        const b = baseRows.find((r) => r.id === id);
        if (prev[id].applied && b && b.pinned === prev[id].target) { delete next[id]; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [baseRows]);

  const handlePin = useCallback((id: string, wasPinned: boolean) => {
    const target = !wasPinned;
    setPins((p) => ({ ...p, [id]: { target, applied: false } }));
    onPinChat?.(id); // kirim ke server sekarang, jangan nunggu animasi
    window.setTimeout(() => {
      setPins((p) => (p[id] ? { ...p, [id]: { ...p[id], applied: true } } : p));
      if (target) {
        setHighlightId(id);
        window.setTimeout(() => setHighlightId(null), 700);
      }
    }, 450);
    // jaring pengaman: kalau server nggak membalas, lepas override setelah 5 detik
    window.setTimeout(() => {
      setPins((p) => {
        if (!p[id]) return p;
        const n = { ...p };
        delete n[id];
        return n;
      });
    }, 5000);
  }, [onPinChat]);

  // Panel selebar layar: p=0 → x=-100%, p=1 → x=0
  const panelX = useTransform(progress, p => `${(p - 1) * 100}%`);
  const vis = useTransform(progress, p => (p > 0.001 ? 'visible' : 'hidden') as 'visible' | 'hidden');

  // ── PROFIL DARI STORE TUNGGAL (nama & foto selalu sinkron dengan ProfilePage) ──
  const { profile } = useProfile();
  const customAvatar = profile.avatar;
  const customName = profile.name || 'User';

  const handleArchive = useCallback((id: string, archived: boolean) => {
    onArchiveChat?.(id, archived);
  }, [onArchiveChat]);

  const handleToggleRead = useCallback((id: string, unread: boolean) => {
    onMarkChatRead?.(id, !unread);
  }, [onMarkChatRead]);

  // Membuka chat otomatis menandainya sudah dibaca (useChat tidak menulis apa-apa kalau memang sudah dibaca)
  const handleSelectChat = useCallback((id: string) => {
    onMarkChatRead?.(id, true);
    onSelectChat(id);
  }, [onSelectChat, onMarkChatRead]);

  const handleOpenMenu = useCallback((row: RowData) => {
    sheetApi.current?.open(row);
  }, []);

  // Masukkan / keluarkan chat dari Project. Sidebar tetap terbuka; tanda folder kecil di baris
  // chat langsung muncul / hilang, dan App menampilkan toast konfirmasi.
  const handleMove = useCallback((id: string, projectId: string | null) => {
    onMoveToProject?.(id, projectId);
  }, [onMoveToProject]);

  // Dialog hapus & ubah nama ada di komponen sendiri (ChatDialogs); Sidebar cukup memanggil open.
  const handleRequestRename = useCallback((id: string, currentTitle: string) => {
    dialogApi.current?.openRename(id, currentTitle);
  }, []);

  const handleRequestDelete = useCallback((id: string) => {
    dialogApi.current?.openDelete(id);
  }, []);

  return (
    <>
      {/* LAPISAN KACA (blur) — desain asli, STATIS: nggak ikut geser, cuma fade mengikuti progress.
          Blur diam di tempat (nggak dihitung ulang tiap frame), dan saat sidebar tertutup lapisan ini
          `visibility: hidden` jadi blur nggak dirender sama sekali. */}
      <motion.div
        key="sidebar-glass"
        style={{ opacity: progress, visibility: vis }}
        className="fixed inset-0 w-full h-[100dvh] z-[200] transform-gpu bg-[var(--bg)]/90 backdrop-blur-xl"
      />
      {/* PANEL ISI SIDEBAR — geser pakai transform doang. Posisinya ngikutin jari lewat `progress`. */}
      <motion.div
        key="sidebar-panel"
        style={{ x: panelX, visibility: vis, contain: 'layout paint' }}
        className="fixed inset-0 w-full h-[100dvh] z-[201] flex flex-col transform-gpu will-change-transform"
      >
        <MobileSidebarContent
          rows={rows}
          activeChatId={activeChatId}
          customAvatar={customAvatar}
          customName={customName}
          onSelectChat={handleSelectChat}
          onViewProfile={onViewProfile}
          onViewGroup={onViewGroup}
          onViewSaved={onViewSaved}
          onViewProject={onViewProject}
          onViewSearch={onViewSearch}
          onClose={onClose}
          onNewChat={onNewChat}
          onViewTasks={onViewTasks}
          onOpenMenu={handleOpenMenu}
          highlightId={highlightId}
        />
      </motion.div>

      {/* Bottom sheet titik tiga (komponen terpisah, dipasang ke <body> lewat portal) */}
      <ChatActionSheet ref={sheetApi} onDelete={handleRequestDelete} onRename={handleRequestRename} onPin={handlePin} onMove={handleMove} onArchive={handleArchive} onToggleRead={handleToggleRead} projects={projects} onNewProject={onViewProject} />

      {/* Dialog hapus & ubah nama (komponen terpisah, dipasang ke <body> lewat portal) */}
      <ChatDialogs ref={dialogApi} onDelete={onDeleteChat} onRename={onRenameChat} />
    </>
  );
};

// Dibungkus React.memo: callback dari App.tsx stabil, jadi sidebar nggak render ulang tiap kamu ngetik di chat.
export const Sidebar = React.memo(SidebarImpl);
