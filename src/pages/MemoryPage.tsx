import React from 'react';
import { MemoryItem } from '../types';
import { BrainCircuit, Trash2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface MemoryPageProps {
  memoryItems: MemoryItem[];
  onDelete: (id: string) => void;
}

export const MemoryPage: React.FC<MemoryPageProps> = ({ memoryItems, onDelete }) => {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden" style={{ minHeight: 0 }}>
      
      {/* Header Section */}
      <div className="px-6 py-8 flex flex-col items-center justify-center text-center flex-shrink-0">
        <div className="w-16 h-16 bg-[var(--text)] text-[var(--bg)] rounded-[20px] flex items-center justify-center mb-4 shadow-xl rotate-3 transition-transform hover:rotate-0">
          <BrainCircuit size={32} strokeWidth={1.5} />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--text)] tracking-tight">Memori Cylen</h2>
        <p className="text-[13px] text-[var(--mu)] mt-2 max-w-[260px] leading-relaxed">
          Konteks dan preferensi yang dipelajari Cylen dari percakapanmu.
        </p>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-[var(--sf)] border border-[var(--bd)] rounded-[24px] overflow-hidden shadow-sm">
            
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--bg)]/30">
              <span className="text-[13px] font-bold text-[var(--text)] uppercase tracking-widest">Data Tersimpan</span>
              <div className="h-7 px-3 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-bold text-[12px] shadow-sm">
                {memoryItems.length}
              </div>
            </div>

            {/* Card Body */}
            <div className="flex flex-col">
              {memoryItems.length === 0 ? (
                <div className="px-5 py-12 text-center flex flex-col items-center">
                  <BrainCircuit size={36} className="text-[var(--mu)] mb-3 opacity-50" />
                  <span className="text-[13px] font-medium text-[var(--mu)]">Belum ada memori yang dicatat.</span>
                </div>
              ) : (
                memoryItems.map((item, index) => (
                  <div key={item.id} className={cn(
                    "p-5 group flex gap-4 items-start transition-colors hover:bg-[var(--bd)]/50",
                    index !== memoryItems.length - 1 && "border-b border-[var(--bd)]"
                  )}>
                    <div className="w-2 h-2 rounded-full bg-[var(--text)] mt-2.5 flex-shrink-0 opacity-80" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[var(--text)] leading-relaxed">{item.text}</p>
                      <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-[var(--mu)] font-mono">
                        <Clock size={12} />
                        {item.timestamp}
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(item.id)} 
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[var(--mu)] bg-[var(--bg)] border border-[var(--bd)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-90" 
                      title="Hapus memori"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
