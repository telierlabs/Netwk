import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const IntegrationPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => {
  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personal Intelligence</h1>
      </header>
      <div className="p-6 pt-6 flex flex-col gap-4">
        <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">Sambungkan Cylen dengan ekosistem lain.</p>
        
        {/* KOSONG TOTAL - SIAP DIISI LIST INTEGRASI ASLI NANTI */}

      </div>
    </div>
  );
};
