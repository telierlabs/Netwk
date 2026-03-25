import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
// PERBAIKAN: Hapus satu '../' pada import di bawah ini
import { ChatSession } from '../types';
import { cn } from '../lib/utils';

interface SearchPageProps {
  chatSessions: ChatSession[];
  onBack: () => void;
  onSelectChat: (chatId: string) => void;
}

type Tab = 'semua' | 'kamu' | 'ai';

function highlight(text: string, query: string) {
  if (!query) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-[var(--ac)] text-[var(--at)] rounded-sm px-0.5 not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

export const SearchPage: React.FC<SearchPageProps> = ({ chatSessions, onBack, onSelectChat }) => {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('semua');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return chatSessions.flatMap(session =>
      session.messages
        .filter(m => {
          if (tab === 'kamu' && m.role !== 'user') return false;
          if (tab === 'ai' && m.role !== 'assistant') return false;
          return m.content.toLowerCase().includes(query.toLowerCase());
        })
        .map(m => ({ chatId: session.id, chatTitle: session.title, message: m }))
    );
  }, [query, tab, chatSessions]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'semua', label: 'Semua' },
    { id: 'kamu', label: 'Kamu' },
    { id: 'ai', label: 'Cylen AI' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* SEARCH BAR */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-[var(--mu)] hover:text-[var(--text)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-[var(--sf)] rounded-2xl px-4 py-3 border border-[var(--bd)]">
          <Search size={15} className="text-[var(--mu)] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Cari di percakapan..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] outline-none text-[var(--text)] placeholder:text-[var(--mu)]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-0 px-4 border-b border-[var(--bd)]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-all -mb-px",
              tab === t.id
                ? "border-[var(--ac)] text-[var(--text)]"
                : "border-transparent text-[var(--mu)] hover:text-[var(--text)]"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RESULTS */}
      <div className="flex-1 overflow-y-auto">
        {!query && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--mu)]">
            <Search size={36} strokeWidth={1.5} />
            <p className="text-sm">Ketik untuk mencari percakapan</p>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--mu)]">
            <p className="text-sm">Tidak ada hasil untuk <strong className="text-[var(--text)]">"{query}"</strong></p>
          </div>
        )}

        {results.length > 0 && (
          <div className="py-2">
            {/* result count */}
            <p className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--mu)]">
              {results.length} hasil ditemukan
            </p>
            {results.map((r, i) => (
              <button key={i} onClick={() => { onSelectChat(r.chatId); }}
                className="w-full px-4 py-3 text-left hover:bg-[var(--sf)] active:bg-[var(--bd)] transition-colors border-b border-[var(--bd)] last:border-0">
                {/* meta */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)]">
                    {r.message.role === 'user' ? 'Kamu' : 'Cylen AI'}
                  </span>
                  <span className="text-[var(--bd)]">·</span>
                  <span className="text-[10px] text-[var(--mu)] truncate max-w-[160px]">{r.chatTitle}</span>
                  <span className="text-[var(--bd)]">·</span>
                  <span className="text-[10px] font-mono text-[var(--mu)]">{r.message.timestamp.slice(0, 16)}</span>
                </div>
                {/* content with highlight */}
                <p className="text-[13.5px] leading-relaxed text-[var(--text)] line-clamp-2">
                  {highlight(r.message.content.slice(0, 200), query)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
