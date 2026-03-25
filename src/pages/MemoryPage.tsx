import React from 'react';
import { MemoryItem } from '../types';

interface MemoryPageProps {
  memoryItems: MemoryItem[];
  onDelete: (id: string) => void;
}

export const MemoryPage: React.FC<MemoryPageProps> = ({ memoryItems, onDelete }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* HEADER / INFO BANNER */}
      <div className="px-5 py-6 bg-[var(--bg)] border-b border-[var(--bd)] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 bg-[var(--ac)] text-[var(--at)] rounded-full flex items-center justify-center mb-3 shadow-lg">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[var(--text)]">Memori Cylen</h2>
        <p className="text-xs text-[var(--mu)] mt-1 max-w-xs leading-relaxed">
          Ini adalah hal-hal yang Cylen pelajari tentang kamu dari obrolan sebelumnya agar bisa memberikan respon yang lebih personal.
        </p>
      </div>

      {/* CONTENT LIST */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 min-h-0">
        {memoryItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-10 text-center">
            <div className="w-16 h-16 bg-[var(--sf)] rounded-2xl flex items-center justify-center">
               <svg width="28" height="28" fill="none" stroke="var(--mu)" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text)]">Belum ada memori</p>
              <p className="text-xs text-[var(--mu)] mt-1">Cylen akan otomatis mengingat fakta penting saat kalian ngobrol.</p>
            </div>
          </div>
        ) : (
          memoryItems.map(item => (
            <div key={item.id} className="flex items-start gap-3 bg-[var(--cd)] rounded-2xl p-4 shadow-sm" style={{ border: '1px solid var(--bd)' }}>
              <div className="w-10 h-10 rounded-xl bg-[var(--sf)] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" fill="none" stroke="var(--ac)" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[14px] font-medium text-[var(--text)] leading-relaxed">{item.text}</p>
                <p className="text-[10px] text-[var(--mu)] font-mono mt-2">{item.timestamp}</p>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[var(--mu)] bg-[var(--sf)] hover:bg-red-100 hover:text-red-500 transition-colors"
                title="Hapus memori"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
