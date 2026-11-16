import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useT } from '../lib/i18n';
import {
  GmailIcon, GoogleCalendarIcon, GoogleDriveIcon, CanvaIcon, GitHubIcon, NotionIcon, YouTubeIcon,
} from '../components/integrations/BrandIcons';

// ─────────────────────────────────────────────
// DATA KONEKTOR — mau nambah? cukup tambah satu baris di sini (atau bikin section baru).
// Logo baru: tambah komponennya di components/integrations/BrandIcons.tsx
// ─────────────────────────────────────────────
interface Connector {
  id: string;
  name: string;
  Icon: React.FC<{ size?: number }>;
}
interface Section {
  key: string; // dipakai buat ambil judul section dari PAGE_TEXT
  items: Connector[];
}

const SECTIONS: Section[] = [
  {
    key: 'featured',
    items: [
      { id: 'gmail', name: 'Gmail', Icon: GmailIcon },
      { id: 'gcalendar', name: 'Google Calendar', Icon: GoogleCalendarIcon },
      { id: 'gdrive', name: 'Google Drive', Icon: GoogleDriveIcon },
      { id: 'canva', name: 'Canva', Icon: CanvaIcon },
      { id: 'github', name: 'GitHub', Icon: GitHubIcon },
      { id: 'notion', name: 'Notion', Icon: NotionIcon },
      { id: 'youtube', name: 'YouTube', Icon: YouTubeIcon },
    ],
  },
];

// Teks lokal (sama polanya dengan ProfilePage, jadi nggak perlu ubah file i18n)
interface PageText {
  title: string; back: string; desc: string; search: string; clear: string;
  featured: string; empty: string; emptyHint: string;
  connecting: (name: string) => string; disconnected: (name: string) => string;
}
const PAGE_TEXT: Record<string, PageText> = {
  id: {
    title: 'Konektor', back: 'Kembali',
    desc: 'Konektor memungkinkan Cylen memakai alat dan sumber data eksternal.',
    search: 'Cari konektor...', clear: 'Hapus',
    featured: 'Unggulan', empty: 'Konektor tidak ditemukan', emptyHint: 'Coba kata kunci lain.',
    connecting: (n) => `Membuka autentikasi ${n}...`,
    disconnected: (n) => `${n} terputus.`,
  },
  en: {
    title: 'Connectors', back: 'Back',
    desc: 'Connectors let Cylen use external tools and data sources.',
    search: 'Search connectors...', clear: 'Clear',
    featured: 'Featured', empty: 'No connectors found', emptyHint: 'Try a different keyword.',
    connecting: (n) => `Opening ${n} authentication...`,
    disconnected: (n) => `${n} disconnected.`,
  },
};

// Daftar = satu blok terpotong-potong (sama persis dengan NavBlock di ProfilePage):
// potongan atas & bawah bulat besar, tengah hampir persegi, celah 2px.
const ROW_BASE =
  'w-full flex items-center gap-4 bg-[var(--text)]/5 px-5 py-4 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--text)]/10';
const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';

export const IntegrationPage = ({ onBack, showToast }: { onBack: () => void; showToast: (msg: string) => void }) => {
  const { lang } = useT();
  const tx = PAGE_TEXT[lang] || PAGE_TEXT.id;

  const [query, setQuery] = useState('');
  // State sementara buat ngetes Connect → Connected. Nanti diganti status asli dari backend.
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const handleToggle = (c: Connector) => {
    const wasOn = !!connected[c.id];
    setConnected((prev) => ({ ...prev, [c.id]: !wasOn }));
    showToast(wasOn ? tx.disconnected(c.name) : tx.connecting(c.name));
    // TODO: logika OAuth / PAT per konektor taruh di sini (pakai c.id buat bedain: 'github', 'gmail', dst.)
  };

  const q = query.trim().toLowerCase();
  const visibleSections = useMemo(
    () =>
      SECTIONS
        .map((s) => ({ ...s, items: q ? s.items.filter((c) => c.name.toLowerCase().includes(q)) : s.items }))
        .filter((s) => s.items.length > 0),
    [q],
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
      {/* --- HEADER --- */}
      <header
        className="flex items-center gap-4 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={onBack}
          aria-label={tx.back}
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--text)]/10 transition-colors"
        >
          <ArrowLeft size={26} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{tx.title}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-1 pb-10">
          <p className="px-4 text-[16px] leading-snug text-[var(--mu)]">{tx.desc}</p>

          {/* --- PENCARIAN --- */}
          <div className="mx-3 mt-4 h-[52px] rounded-full bg-[var(--text)]/5 focus-within:bg-[var(--text)]/10 transition-colors flex items-center gap-3 pl-4 pr-2">
            <Search size={20} className="text-[var(--mu)] flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx.search}
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[var(--text)] placeholder:text-[var(--mu)]"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label={tx.clear}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--mu)] active:bg-[var(--text)]/10 transition-colors flex-shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* --- DAFTAR KONEKTOR --- */}
          {visibleSections.map((section) => (
            <div key={section.key}>
              <div className="px-6 mt-6 mb-2 text-[16px] font-medium text-[var(--mu)]">
                {(tx as any)[section.key] ?? section.key}
              </div>
              <div className="mx-3 flex flex-col gap-[2px]">
                {section.items.map((c, i) => {
                  const on = !!connected[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleToggle(c)}
                      aria-pressed={on}
                      className={cn(ROW_BASE, blockRadius(i, section.items.length))}
                    >
                      {/* text-[var(--text)] → logo GitHub (currentColor) ikut tema */}
                      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[var(--text)]">
                        <c.Icon size={28} />
                      </div>
                      <span className="flex-1 min-w-0 text-[18px] font-medium truncate">{c.name}</span>
                      {on ? (
                        <span className="flex items-center gap-1.5 text-[15px] font-medium text-[var(--text)] flex-shrink-0">
                          <Check size={16} strokeWidth={2.5} />
                          Connected
                        </span>
                      ) : (
                        <span className="text-[15px] font-medium text-[var(--text)]/55 flex-shrink-0">Connect</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* --- HASIL KOSONG --- */}
          {visibleSections.length === 0 && (
            <div className="px-6 pt-20 flex flex-col items-center text-center gap-1">
              <span className="text-[18px] font-medium text-[var(--text)]">{tx.empty}</span>
              <span className="text-[15px] text-[var(--mu)]">{tx.emptyHint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
