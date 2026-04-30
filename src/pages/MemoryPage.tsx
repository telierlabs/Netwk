import React from 'react';
import { MemoryItem } from '../types';

interface MemoryPageProps {
  memoryItems: MemoryItem[];
  onDelete: (id: string) => void;
}

const MoonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text)]">
    <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 5.385 0 9.75-4.365 9.75-9.75 0-1.33-.266-2.597-.748-3.752z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);

export const MemoryPage: React.FC<MemoryPageProps> = ({ memoryItems, onDelete }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="px-5 py-6 bg-[var(--bg)] border-b border-[var(--bd)] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center mb-3 shadow-lg">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text)]">Memori Cylen</h2>
        <p className="text-xs text-[var(--mu)] mt-1 max-w-xs leading-relaxed">Ini adalah hal-hal yang Cylen pelajari tentang kamu dari obrolan sebelumnya.</p>
      </div>

      <div className="px-4 py-6 flex-1 overflow-y-auto min-h-0">
        <div className="bg-[var(--cd)] border border-[var(--bd)] rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[var(--bd)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--sf)] flex items-center justify-center"><MoonIcon /></div>
              <div className="flex flex-col"><span className="text-sm font-semibold text-[var(--text)]">Cylen Ingat</span><span className="text-xs text-[var(--mu)]">Konteks percakapan</span></div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-mono font-bold text-xs shadow-lg">{memoryItems.length}</div>
          </div>

          <div className="py-2">
            {memoryItems.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-[var(--mu)]">Belum ada memori yang diingat Cylen.</div>
            ) : (
              memoryItems.map((item) => (
                <div key={item.id} className="px-5 py-4 group border-b border-[var(--bd)] last:border-b-0">
                  <div className="flex items-start gap-4">
                    <span className="text-[var(--text)] text-lg mt-0.5">•</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--text)] leading-relaxed">{item.text}</p>
                      <p className="text-[10px] text-[var(--mu)] font-mono mt-2">{item.timestamp}</p>
                    </div>
                    <button onClick={() => onDelete(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[var(--mu)] bg-[var(--sf)] hover:bg-red-500 hover:text-white transition-colors" title="Hapus memori"><TrashIcon /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
