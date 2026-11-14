import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { ChevronDown, Search, User, Settings, Library, Users, ChevronsRight, Clock, MoreHorizontal, Edit2, Pin, Trash2, SquarePen, Folder, FolderInput } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatSession } from '../../types';
import { useProfile } from '../../hooks/useProfile';

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
  // Opsional: kalau nanti ada fitur pindah chat ke project, sambungkan di sini.
  // Kalau tidak diisi, tombol "Move to Project" membuka halaman Project.
  onMoveToProject?: (id: string) => void;
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

// Tombol di dalam bottom sheet (titik tiga)
const SHEET_ITEM = "w-full flex items-center gap-[18px] h-[62px] px-6 text-[20px] font-medium text-left active:bg-[var(--text)]/10 transition-colors";

// ── FIX LAG: tiap baris cuma berisi teks pendek (bukan seluruh isi chat),
// jadi baris bisa di-React.memo dan nggak ikut render ulang kalau datanya sama.
interface RowData {
  id: string;
  title: string;
  preview: string;
  dateLabel: string;
  pinned: boolean;
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
      };
    });

// Menu titik tiga sekarang bottom sheet tunggal di SidebarImpl (bukan popup kecil per baris),
// jadi baris cukup memanggil onOpenMenu(row).
const SessionRow = memo(({ row, active, onSelect, onOpenMenu }: {
  row: RowData;
  active: boolean;
  onSelect: (id: string) => void;
  onOpenMenu: (row: RowData) => void;
}) => (
  <div className="relative group w-full">
    <button
      onClick={() => onSelect(row.id)}
      // content-visibility: baris di luar layar nggak dihitung/digambar (daftar panjang jadi ringan)
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 92px' }}
      className={cn("w-full flex flex-col px-4 py-3.5 rounded-2xl transition-[transform,background-color] active:scale-[0.96] text-left relative", active ? "bg-[var(--text)]/10 shadow-sm" : "hover:bg-[var(--text)]/5")}
    >
      <div className="flex items-center justify-between w-full pr-6">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={cn("text-[16px] truncate max-w-full", active ? "font-bold text-[var(--text)]" : "font-semibold text-[var(--text)]")}>
            {row.title}
          </span>
          {row.pinned && <Pin size={12} className="text-[var(--text)]/60 flex-shrink-0" />}
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
}

const MobileSidebarContent = memo(({
  rows, activeChatId, customAvatar, customName, onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewProject,
  onViewSearch, onClose, onNewChat, onViewTasks, onOpenMenu
}: ContentProps) => {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  const selectChat = useCallback((id: string) => {
    onSelectChat(id);
    onClose();
  }, [onSelectChat, onClose]);

  return (
    <div className="flex flex-col h-full bg-transparent">
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

      <div className="px-3 flex-1 overflow-y-auto min-h-0 pb-4" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>

        <div className="flex items-center justify-between px-4 mb-2 mt-2">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text)]/50">Conversations</span>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setIsHistoryCollapsed(p => !p); }}
              className="p-1.5 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-lg transition-colors active:scale-95"
            >
              <ChevronDown size={18} strokeWidth={2.5} className={cn("transition-transform duration-200", isHistoryCollapsed ? "rotate-90" : "rotate-0")} />
            </button>
          </div>
        </div>

        {/* FIX LAG: dulu daftar ini dianimasikan tingginya (0 → auto) tiap sidebar dibuka.
            Sekarang cuma fade tipis saat tombol panah ditekan; buka sidebar tidak memicu animasi apa pun. */}
        {!isHistoryCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-1"
          >
            {rows.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text)]/60 font-medium bg-[var(--text)]/5 rounded-2xl mx-2">Belum ada riwayat obrolan.</div>
            )}
            {rows.map((row) => (
              <SessionRow
                key={row.id}
                row={row}
                active={activeChatId === row.id}
                onSelect={selectChat}
                onOpenMenu={onOpenMenu}
              />
            ))}
          </motion.div>
        )}
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

const SidebarImpl: React.FC<SidebarProps> = ({
  progress, onClose, chatSessions, activeChatId, onSelectChat,
  onViewProfile, onViewGroup, onViewSaved, onViewProject, onViewSearch, onNewChat, onViewTasks,
  onRenameChat, onPinChat, onDeleteChat, onMoveToProject
}) => {
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  // Baris yang menu titik tiganya sedang terbuka (bottom sheet). null = sheet tertutup.
  const [sheetRow, setSheetRow] = useState<RowData | null>(null);

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
  const rows = useMemo(() => buildRows(frozenSessions.current), [frozenSessions.current]);

  // Panel selebar layar: p=0 → x=-100%, p=1 → x=0
  const panelX = useTransform(progress, p => `${(p - 1) * 100}%`);
  const vis = useTransform(progress, p => (p > 0.001 ? 'visible' : 'hidden') as 'visible' | 'hidden');

  // ── PROFIL DARI STORE TUNGGAL (nama & foto selalu sinkron dengan ProfilePage) ──
  const { profile } = useProfile();
  const customAvatar = profile.avatar;
  const customName = profile.name || 'User';

  const handleOpenMenu = useCallback((row: RowData) => {
    setSheetRow(row);
  }, []);

  const closeSheet = useCallback(() => setSheetRow(null), []);

  const handleRequestRename = useCallback((id: string, currentTitle: string) => {
    setRenameChatId(id);
    setRenameInput(currentTitle);
  }, []);

  const handleConfirmRename = () => {
    if (renameChatId && renameInput.trim()) {
      onRenameChat?.(renameChatId, renameInput.trim());
    }
    setRenameChatId(null);
  };

  const handleRequestDelete = useCallback((id: string) => {
    setDeleteChatId(id);
  }, []);

  const handleConfirmDelete = () => {
    if (deleteChatId) {
      onDeleteChat?.(deleteChatId);
    }
    setDeleteChatId(null);
  };

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
          onSelectChat={onSelectChat}
          onViewProfile={onViewProfile}
          onViewGroup={onViewGroup}
          onViewSaved={onViewSaved}
          onViewProject={onViewProject}
          onViewSearch={onViewSearch}
          onClose={onClose}
          onNewChat={onNewChat}
          onViewTasks={onViewTasks}
          onOpenMenu={handleOpenMenu}
        />
      </motion.div>

      {/* BOTTOM SHEET menu titik tiga (gaya Grok): Delete, Rename, Pin, Move to Project.
          Ditutup dengan tap area gelap atau tarik ke bawah. */}
      <AnimatePresence>
        {sheetRow && (
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSheet}
            className="fixed inset-0 z-[290] bg-black/50"
          />
        )}
        {sheetRow && (
          <motion.div
            key="sheet-panel"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) closeSheet();
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed left-0 right-0 bottom-0 mx-auto max-w-[480px] z-[291] rounded-t-[28px] pt-2.5 text-[var(--text)] shadow-2xl"
            style={{
              background: 'color-mix(in srgb, var(--bg) 92%, var(--text))',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--text)]/30 mx-auto mt-0.5 mb-3" />

            <button
              onClick={() => { handleRequestDelete(sheetRow.id); closeSheet(); }}
              className={cn(SHEET_ITEM, "text-red-500")}
            >
              <Trash2 size={24} /> Delete
            </button>
            <button
              onClick={() => { handleRequestRename(sheetRow.id, sheetRow.title); closeSheet(); }}
              className={SHEET_ITEM}
            >
              <Edit2 size={24} /> Rename
            </button>
            <button
              onClick={() => { onPinChat?.(sheetRow.id); closeSheet(); }}
              className={SHEET_ITEM}
            >
              <Pin size={24} /> {sheetRow.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => {
                if (onMoveToProject) {
                  onMoveToProject(sheetRow.id);
                } else {
                  onViewProject();
                  onClose();
                }
                closeSheet();
              }}
              className={SHEET_ITEM}
            >
              <FolderInput size={24} /> Move to Project
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameChatId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-[340px] bg-[var(--bg)]/85 backdrop-blur-2xl border border-[var(--text)]/15 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <h3 className="text-[var(--text)] font-bold text-[18px] tracking-tight">Ubah Nama Chat</h3>
              <input
                autoFocus
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                className="w-full bg-[var(--text)]/5 border border-[var(--text)]/20 rounded-xl px-4 py-3 text-[14px] text-[var(--text)] outline-none focus:border-[var(--text)]/50 transition-colors"
                placeholder="Masukkan nama chat baru..."
              />
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setRenameChatId(null)}
                  className="px-5 py-2.5 text-[14px] font-semibold text-[var(--text)]/70 hover:bg-[var(--text)]/10 rounded-xl transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmRename}
                  className="px-5 py-2.5 text-[14px] font-bold bg-[var(--text)] text-[var(--bg)] rounded-xl hover:opacity-90 transition-opacity shadow-lg active:scale-95"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteChatId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-[340px] bg-[var(--bg)]/85 backdrop-blur-2xl border border-[var(--text)]/15 rounded-2xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <h3 className="text-[var(--text)] font-bold text-[18px] tracking-tight">Hapus Obrolan</h3>
              <p className="text-[14px] text-[var(--text)]/70 leading-relaxed">
                Yakin mau hapus chat ini? Obrolan yang sudah dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setDeleteChatId(null)}
                  className="px-5 py-2.5 text-[14px] font-semibold text-[var(--text)]/70 hover:bg-[var(--text)]/10 rounded-xl transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 text-[14px] font-bold bg-[var(--text)] text-[var(--bg)] rounded-xl hover:opacity-90 transition-colors shadow-lg active:scale-95"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Dibungkus React.memo: callback dari App.tsx stabil, jadi sidebar nggak render ulang tiap kamu ngetik di chat.
export const Sidebar = React.memo(SidebarImpl);
