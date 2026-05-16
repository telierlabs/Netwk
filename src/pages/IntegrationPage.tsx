import React, { useState } from 'react';
import { ArrowLeft, RadioTower } from 'lucide-react';
import { cn } from '../lib/utils';

export const IntegrationPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => {
  const [active, setActive] = useState(true);
  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personal Intelligence</h1>
      </header>
      <div className="p-6 pt-6 flex flex-col gap-4">
        <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">Sambungkan Cylen dengan ekosistem lain.</p>
        <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)]/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)]"><RadioTower size={20} /></div>
            <div>
              <div className="font-bold text-[16px] text-[var(--text)]">TelierNews API</div>
              <div className="text-[12px] text-[var(--mu)] font-medium mt-0.5">Akses berita real-time</div>
            </div>
          </div>
          <button onClick={() => { setActive(!active); showToast(active ? 'TelierNews Nonaktif' : 'TelierNews Aktif'); }} className={cn("w-14 h-8 rounded-full transition-colors relative", active ? "bg-green-500" : "bg-[var(--bd)]")}>
            <div className={cn("w-6 h-6 bg-white rounded-full absolute top-1 transition-all", active ? "left-7" : "left-1")} />
          </button>
        </div>
      </div>
    </div>
  );
};
