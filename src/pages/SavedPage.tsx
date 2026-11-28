import React, { useState } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, LayoutGrid, Bookmark, Paperclip, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { SavedItem, SavedItemType } from '../types';
import { usePageText, useT } from '../lib/i18n';

const TEXT = {
  id: {
    title: 'Perpustakaan', search: 'Cari yang tersimpan...', empty: 'Belum ada yang tersimpan', emptyHint: 'Simpan pesan atau hasil AI dari chat', today: 'Hari ini', yesterday: 'Kemarin',
    tab: { semua: 'Semua', teks: 'Teks', kode: 'Kode', gambar: 'Gambar', video: 'Video', dokumen: 'Dokumen' },
    filter: 'Filter', source: 'Sumber', show: 'Lihat {n} item',
    src: { semua: 'Semua', manual: 'Favorit', upload: 'Terkirim' },
    srcHint: { semua: 'Favorit dan lampiran terkirim', manual: 'Disimpan manual dari chat', upload: 'Foto, video, dokumen, dan kode yang kamu kirim' },
  },
  en: {
    title: 'Library', search: 'Search saved items...', empty: 'Nothing saved yet', emptyHint: 'Save messages or AI results from chat', today: 'Today', yesterday: 'Yesterday',
    tab: { semua: 'All', teks: 'Text', kode: 'Code', gambar: 'Images', video: 'Video', dokumen: 'Documents' },
    filter: 'Filter', source: 'Source', show: 'Show {n} items',
    src: { semua: 'All', manual: 'Favorites', upload: 'Sent' },
    srcHint: { semua: 'Favorites and sent attachments', manual: 'Saved manually from chat', upload: 'Photos, videos, documents and code you sent' },
  },
};
type SvTx = typeof TEXT.id;

interface SavedPageProps {
  savedItems: SavedItem[];
  onDelete: (id: string) => void;
  onOpenChat?: (chatId: string) => void;
  onBack?: () => void;
}

type Tab = 'semua' | SavedItemType;
type Source = 'semua' | 'manual' | 'upload';

const SOURCES: Source[] = ['semua', 'manual', 'upload'];
const SRC_ICON: Record<Source, React.ReactNode> = {
  semua: <LayoutGrid size={20} strokeWidth={1.8} />,
  manual: <Bookmark size={20} strokeWidth={1.8} />,
  upload: <Paperclip size={20} strokeWidth={1.8} />,
};

// Item lama (belum punya field source) dianggap Favorit
const srcOf = (item: SavedItem): 'manual' | 'upload' => ((item as any).source === 'upload' ? 'upload' : 'manual');

// Kurva yang sama dengan lapisan halaman & bottom sheet titik tiga di App.tsx
const EASE = 'cubic-bezier(.32,.72,0,1)';

const TAB_BASE: { id: Tab; icon: React.ReactNode }[] = [
  { id: 'semua', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'teks', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h10"/></svg> },
  { id: 'kode', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" d="M10 20l4-16M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg> },
  { id: 'gambar', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" d="M21 15l-5-5L5 21"/></svg> },
  { id: 'video', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" d="M15 10l4.553-2.169A1 1 0 0121 8.763v6.474a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg> },
  { id: 'dokumen', icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
];

const TrashIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

const CardIcon = ({ type }: { type: SavedItemType }) => {
  if (type === 'kode') return (
    <div className="w-10 h-10 rounded-xl bg-[#1a1b26] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" fill="none" stroke="#7dcfff" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M10 20l4-16M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>
    </div>
  );
  if (type === 'video') return (
    <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M15 10l4.553-2.169A1 1 0 0121 8.763v6.474a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
    </div>
  );
  if (type === 'gambar') return (
    <div className="w-10 h-10 rounded-xl bg-[var(--sf)] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" fill="none" stroke="var(--mu)" viewBox="0 0 24 24" strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" d="M21 15l-5-5L5 21"/></svg>
    </div>
  );
  if (type === 'dokumen') return (
    <div className="w-10 h-10 rounded-xl bg-[var(--sf)] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" fill="none" stroke="var(--mu)" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    </div>
  );
  return (
    <div className="w-10 h-10 rounded-xl bg-[var(--sf)] flex items-center justify-center flex-shrink-0">
      <svg width="18" height="18" fill="none" stroke="var(--mu)" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
    </div>
  );
};

function groupByDate(items: SavedItem[], tx: SvTx, lang: string) {
  const groups: { label: string; items: SavedItem[] }[] = [];
  const map = new Map<string, SavedItem[]>();

  items.forEach(item => {
    const d = new Date(item.rawDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = tx.today;
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = tx.yesterday;
    } else {
      if (lang === 'id') {
        const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        label = `${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
      } else {
        try { label = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
        catch { label = d.toDateString(); }
      }
    }

    if (!map.has(label)) { map.set(label, []); groups.push({ label, items: [] }); }
    map.get(label)!.push(item);
  });

  groups.forEach(g => { g.items = map.get(g.label)!; });
  return groups;
}

export const SavedPage: React.FC<SavedPageProps> = ({ savedItems, onDelete, onOpenChat, onBack }) => {
  const tx = usePageText('saved', TEXT);
  const { lang } = useT();
  const TABS = TAB_BASE.map(x => ({ ...x, label: (tx.tab as Record<string, string>)[x.id] }));
  const [activeTab, setActiveTab] = useState<Tab>('semua');
  const [source, setSource] = useState<Source>('semua');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 150));
    onDelete(id);
    setDeletingId(null);
  };

  const filtered = savedItems.filter(item => {
    const matchTab = activeTab === 'semua' || item.type === activeTab;
    const matchSource = source === 'semua' || srcOf(item) === source;
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.preview.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSource && matchSearch;
  });

  const groups = groupByDate(filtered, tx, lang);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, backgroundColor: 'var(--bg)', position: 'relative' }}>

      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--bd)]/15 sticky top-0 z-20 bg-[var(--bg)]">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95 shrink-0">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-semibold text-[var(--text)]">{tx.title}</h1>
        </div>
      </div>

      <div className="flex flex-col bg-[var(--bg)] z-10 shrink-0 border-b border-[var(--bd)]/15">
        <div className="px-4 py-3 flex items-center gap-2.5">
          {/* Kolom pencarian bentuk pil */}
          <label className="flex-1 min-w-0 flex items-center gap-2.5 h-[46px] px-4 rounded-full bg-[var(--sf)]/60 border border-transparent focus-within:border-[var(--bd)]/30 focus-within:bg-[var(--sf)] transition-colors">
            <Search size={16} strokeWidth={2} className="text-[var(--mu)] shrink-0" />
            <input
              type="text"
              placeholder={tx.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-[14px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]"
            />
          </label>

          {/* Tombol filter: buka popup dari bawah */}
          <button
            onClick={() => setSheetOpen(true)}
            aria-label={tx.filter}
            className={cn(
              "w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90",
              source !== 'semua'
                ? "bg-[var(--text)] text-[var(--bg)]"
                : "bg-[var(--sf)]/60 text-[var(--text)] hover:bg-[var(--sf)]"
            )}
          >
            <SlidersHorizontal size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-all active:scale-95",
                activeTab === tab.id
                  ? "bg-[var(--text)] text-[var(--bg)] shadow-md"
                  : "bg-[var(--sf)]/60 text-[var(--text)]/60 hover:bg-[var(--sf)] hover:text-[var(--text)]"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20 text-center">
            <div className="w-16 h-16 bg-[var(--sf)] rounded-2xl flex items-center justify-center">
              <svg width="28" height="28" fill="none" stroke="var(--mu)" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
            </div>
            <div>
              <p className="text-[15px] font-bold text-[var(--text)]">{tx.empty}</p>
              <p className="text-[13px] text-[var(--mu)] mt-1">{tx.emptyHint}</p>
            </div>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-1">{group.label}</div>

              {(activeTab === 'semua' || activeTab === 'gambar') && group.items.some(i => i.type === 'gambar') && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {group.items.filter(i => i.type === 'gambar').map(item => (
                    <div
                      key={item.id}
                      onClick={() => item.chatId && onOpenChat?.(item.chatId)}
                      className="bg-[var(--sf)]/30 rounded-[20px] overflow-hidden relative cursor-pointer border border-[var(--bd)]/15 shadow-sm"
                      style={{
                        opacity: deletingId === item.id ? 0 : 1,
                        transform: deletingId === item.id ? 'scale(0.96)' : 'scale(1)',
                        transition: 'opacity 0.15s ease, transform 0.15s ease',
                      }}
                    >
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-10 text-white bg-black/40 backdrop-blur-md hover:bg-red-500 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                      <div className="w-full h-32 bg-[var(--sf)] flex items-center justify-center">
                        {item.image
                          ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          : <svg width="32" height="32" fill="none" stroke="var(--bd)" viewBox="0 0 24 24" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" d="M21 15l-5-5L5 21"/></svg>
                        }
                      </div>
                      <div className="p-3">
                        <p className="text-[13px] font-semibold text-[var(--text)] truncate">{item.title}</p>
                        <p className="text-[10px] text-[var(--mu)] font-mono mt-1 opacity-70">{item.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {group.items.filter(i => i.type !== 'gambar').map(item => (
                  <div
                    key={item.id}
                    onClick={() => item.chatId && onOpenChat?.(item.chatId)}
                    className="flex items-start gap-3.5 bg-[var(--sf)]/30 rounded-[20px] p-4 cursor-pointer hover:bg-[var(--sf)]/60 transition-colors border border-[var(--bd)]/15 shadow-sm"
                    style={{
                      opacity: deletingId === item.id ? 0 : 1,
                      transform: deletingId === item.id ? 'scale(0.97)' : 'scale(1)',
                      transition: 'opacity 0.15s ease, transform 0.15s ease',
                    }}
                  >
                    <CardIcon type={item.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--text)] truncate pr-4">{item.title}</p>
                      <p className={cn(
                        "text-[12px] text-[var(--mu)] mt-1 line-clamp-2 leading-relaxed",
                        item.type === 'kode' && "font-mono text-[11px]"
                      )}>{item.preview}</p>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                          item.type === 'kode' ? "bg-[#1a1b26] text-[#7dcfff]" :
                          item.type === 'video' ? "bg-[#1a1a1a] text-white" :
                          "bg-[var(--text)]/10 text-[var(--text)]/60"
                        )}>
                          {item.language || (tx.tab as Record<string, string>)[item.type] || item.type}
                        </span>
                        <span className="text-[10px] text-[var(--mu)] font-mono ml-auto opacity-70">{item.timestamp}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--mu)] bg-transparent hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Popup filter dari bawah. Selalu terpasang & digerakkan transform (GPU), jadi buka/tutup mulus tanpa render ulang ── */}
      <div
        aria-hidden={!sheetOpen}
        onClick={() => setSheetOpen(false)}
        style={{
          position: 'absolute', inset: 0, zIndex: 40, backgroundColor: '#000',
          opacity: sheetOpen ? 0.5 : 0,
          pointerEvents: sheetOpen ? 'auto' : 'none',
          transition: `opacity .3s ${EASE}`,
        }}
      />
      <div
        role="dialog"
        aria-label={tx.filter}
        className="bg-[var(--bg)] border-t border-[var(--bd)]/40 rounded-t-[28px] px-4 pt-2.5"
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41,
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          transform: sheetOpen ? 'translate3d(0,0,0)' : 'translate3d(0,100%,0)',
          visibility: sheetOpen ? 'visible' : 'hidden',
          willChange: 'transform',
          transition: sheetOpen
            ? `transform .36s ${EASE}, visibility 0s`
            : `transform .3s ${EASE}, visibility 0s linear .3s`,
        }}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--bd)] mx-auto mb-4" />
        <h3 className="text-[17px] font-semibold text-[var(--text)] px-1 pb-4">{tx.filter}</h3>

        <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--mu)] px-1 mb-2.5">{tx.source}</div>
        <div className="flex flex-col gap-2">
          {SOURCES.map(s => {
            const on = source === s;
            return (
              <button
                key={s}
                onClick={() => setSource(s)}
                className={cn(
                  "w-full flex items-center gap-3.5 p-3.5 rounded-[18px] text-left border transition-all duration-200 active:scale-[0.98]",
                  on ? "bg-[var(--sf)] border-[var(--text)]" : "bg-[var(--sf)]/30 border-[var(--bd)]/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200",
                  on ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--sf)] text-[var(--mu)]"
                )}>
                  {SRC_ICON[s]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[var(--text)]">{tx.src[s]}</p>
                  <p className="text-[12px] text-[var(--mu)] mt-0.5">{tx.srcHint[s]}</p>
                </div>
                <div className={cn(
                  "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200",
                  on ? "bg-[var(--text)] border-[var(--text)] text-[var(--bg)]" : "border-[var(--bd)]"
                )}>
                  <Check size={13} strokeWidth={3.5} style={{ opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(.5)', transition: 'all .2s' }} />
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setSheetOpen(false)}
          className="w-full h-[50px] mt-4 rounded-full bg-[var(--text)] text-[var(--bg)] text-[14.5px] font-bold active:scale-[0.98] transition-transform"
        >
          {tx.show.replace('{n}', String(filtered.length))}
        </button>
      </div>
    </div>
  );
};
