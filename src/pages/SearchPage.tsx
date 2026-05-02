import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { ChatSession } from '../types';
import { cn } from '../lib/utils';

interface SearchPageProps {
  chatSessions: ChatSession[];
  onBack: () => void;
  onSelectChat: (chatId: string) => void;
}

// FIX: Format waktu persis kaya Grok (Jam -> Hari -> Tanggal Bulan)
const formatGrokDate = (dateString?: string | Date | number) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (diffDays <= 7) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()];
  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
};

export const SearchPage: React.FC<SearchPageProps> = ({ chatSessions, onBack, onSelectChat }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus pas halaman search dibuka
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    // Kalau kosong, tampilin semua riwayat kaya default Grok
    if (!query.trim()) return chatSessions;
    
    return chatSessions.filter(session => {
      const matchTitle = session.title.toLowerCase().includes(query.toLowerCase());
      const matchMessages = session.messages.some(m => m.content.toLowerCase().includes(query.toLowerCase()));
      return matchTitle || matchMessages;
    });
  }, [query, chatSessions]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] w-full">
      
      {/* AREA HASIL PENCARIAN & RIWAYAT */}
      <div className="flex-1 overflow-y-auto pt-6 pb-4" style={{scrollbarWidth:'none'}}>
        
        {query && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text)]/40">
            <Search size={36} strokeWidth={1.5} />
            <p className="text-[15px] font-medium">Tidak ada hasil untuk "{query}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-3">
            {results.map((session) => (
              <button 
                key={session.id} 
                onClick={() => onSelectChat(session.id)}
                className="w-full flex flex-col px-4 py-3.5 rounded-2xl transition-all active:scale-[0.96] text-left hover:bg-[var(--text)]/5"
              >
                {/* FIX: Teks judul gede (16px), tebel, dan clean */}
                <span className="text-[16px] font-bold text-[var(--text)] tracking-tight line-clamp-1">
                  {session.title}
                </span>
                {/* FIX: Tanggal/waktu simpel di bawahnya */}
                <span className="text-[13px] text-[var(--text)]/50 mt-1 font-medium">
                  {formatGrokDate((session as any).updatedAt || new Date())}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SEARCH BAR GROK STYLE DI BAWAH */}
      <div className="p-4 pt-2 flex items-center gap-3 flex-shrink-0 bg-[var(--bg)] border-t border-transparent z-20">
        {/* Tombol Back biar gak kejebak */}
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] transition-colors active:scale-90 rounded-full">
          <ArrowLeft size={24} strokeWidth={2.2} />
        </button>
        
        {/* Kolom Input */}
        <div className="flex-1 flex items-center gap-3 bg-[var(--text)]/5 hover:bg-[var(--text)]/10 rounded-2xl px-4 py-3.5 transition-all focus-within:bg-[var(--text)]/10">
          <Search size={20} className="text-[var(--text)]/60 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[16px] outline-none text-[var(--text)] placeholder:text-[var(--text)]/50 font-semibold tracking-wide"
          />
          {query && (
            <button 
              onClick={() => setQuery('')} 
              className="text-[var(--text)]/60 hover:text-[var(--text)] transition-colors p-1 -mr-1 rounded-full active:scale-90"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
