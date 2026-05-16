import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const UsagePage = ({ onBack }: { onBack: () => void }) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Penggunaan</h1>
    </header>
    <div className="p-6 pt-6 flex flex-col gap-4">
      <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">Statistik interaksi kamu dengan Cylen.</p>
      <div className="bg-[var(--sf)] p-6 rounded-[24px] border border-[var(--bd)]/30">
        <div className="text-[36px] font-black text-[var(--text)] tracking-tighter">1,402</div>
        <div className="text-[12px] font-bold text-[var(--mu)] uppercase tracking-widest mt-1">Pesan Terkirim (Bulan ini)</div>
      </div>
      <div className="bg-[var(--sf)] p-6 rounded-[24px] border border-[var(--bd)]/30 h-48 flex items-end justify-between px-8">
        {[40, 70, 45, 90, 60, 100, 30].map((h, i) => (
          <div key={i} className="w-6 bg-[var(--text)] rounded-t-md opacity-80" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="text-center text-xs text-[var(--mu)] font-bold mt-2">Grafik aktivitas 7 hari terakhir</p>
    </div>
  </div>
);
