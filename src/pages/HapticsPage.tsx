import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface HapticsPageProps {
  onBack: () => void;
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button 
    onClick={onChange} 
    className={cn("w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300", checked ? "bg-[var(--text)]" : "bg-[var(--bd)]")}
  >
    <div className={cn("w-5 h-5 bg-[var(--bg)] rounded-full shadow-md transform transition-transform duration-300", checked ? "translate-x-5" : "translate-x-0")} />
  </button>
);

export const HapticsPage: React.FC<HapticsPageProps> = ({ onBack }) => {
  const [mainHaptic, setMainHaptic] = useState(true);
  const [pressHaptic, setPressHaptic] = useState(true);
  const [aiHaptic, setAiHaptic] = useState(true);

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-[100] flex flex-col min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--bd)]/20 bg-[var(--bg)] sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Haptics</h1>
      </div>

      <div className="max-w-2xl w-full mx-auto pb-10 pt-4 px-4">
        
        {/* MAIN TOGGLE */}
        <div className="bg-[var(--sf)] rounded-[24px] overflow-hidden border border-[var(--bd)]/50 mb-6">
          <div className="w-full flex items-center justify-between px-5 py-[18px]">
            <div className="flex items-center gap-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-[var(--text)] opacity-80">
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <path d="M2 10h1" /><path d="M2 14h1" /><path d="M21 10h1" /><path d="M21 14h1" />
              </svg>
              <span className="text-[16px] font-medium text-[var(--text)]">Haptics</span>
            </div>
            <Toggle checked={mainHaptic} onChange={() => setMainHaptic(!mainHaptic)} />
          </div>
        </div>

        {mainHaptic && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-[14px] font-medium text-[var(--mu)] mb-3 px-2">
              When is haptic needed
            </div>
            
            <div className="bg-[var(--sf)] rounded-[24px] flex flex-col overflow-hidden border border-[var(--bd)]/50">
              <div className="w-full flex items-center justify-between px-5 py-[18px] border-b border-[var(--bd)]">
                <span className="text-[16px] font-medium text-[var(--text)]">Pressing buttons</span>
                <Toggle checked={pressHaptic} onChange={() => setPressHaptic(!pressHaptic)} />
              </div>
              <div className="w-full flex items-center justify-between px-5 py-[18px]">
                <span className="text-[16px] font-medium text-[var(--text)]">Cylen is responding</span>
                <Toggle checked={aiHaptic} onChange={() => setAiHaptic(!aiHaptic)} />
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};
