import React, { useState } from 'react';
import { X, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ReportPageProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ onBack, showToast }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return showToast('Tolong deskripsikan masalahnya dulu ya.');
    showToast('Laporan berhasil dikirim. Terima kasih!');
    setTimeout(() => onBack(), 1000);
  };

  return (
    <main className="flex-1 bg-[var(--bg)] relative z-[100] flex flex-col min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg)] sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95">
          <X size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[16px] font-bold text-[var(--text)] tracking-tight flex-1 text-center pr-2">Report a Problem</h1>
        <button 
          onClick={handleSubmit} 
          className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 rounded-full text-[14px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform"
        >
          Submit
        </button>
      </div>

      <div className="max-w-2xl w-full mx-auto pb-10 pt-4 px-4 flex flex-col gap-4">
        
        {/* DROPDOWN (UI Only) */}
        <button className="w-full flex items-center justify-between px-5 py-[18px] bg-[var(--sf)] hover:bg-[var(--bd)]/30 rounded-[20px] transition-colors border border-[var(--bd)]/50">
          <div className="flex items-center gap-3 text-[var(--text)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="text-[15px] font-medium">General feedback</span>
          </div>
          <ChevronDown size={18} className="text-[var(--mu)]" />
        </button>

        {/* TEXTAREA */}
        <div className="w-full h-[180px] bg-[var(--sf)] border border-[var(--text)]/20 rounded-[24px] overflow-hidden focus-within:border-[var(--text)]/50 transition-colors shadow-sm relative">
          <textarea 
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what went wrong"
            className="w-full h-full bg-transparent p-5 outline-none resize-none text-[15px] text-[var(--text)] placeholder:text-[var(--mu)]"
          />
        </div>

        {/* ATTACH BUTTON */}
        <button className="w-fit flex items-center gap-2 px-4 py-2 bg-[var(--sf)] hover:bg-[var(--bd)] rounded-full text-[14px] font-medium text-[var(--text)] transition-colors border border-[var(--bd)]/50">
          <ImageIcon size={16} />
          Attach images
        </button>

      </div>
    </main>
  );
};
