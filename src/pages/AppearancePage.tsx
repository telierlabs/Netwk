import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Heart, Moon, Sun, Settings } from 'lucide-react';
import { FONTS } from '../constants';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';

const THEME_PALETTES: Record<string, Record<string, string>> = {
  't-light': { 
    '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', 
    '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.4)', '--cd':'#ffffff', 
    '--ac':'#0a0a0a', '--at':'#ffffff', '--ib':'#f0f0f0' 
  },
  't-dark': { 
    '--bg':'#121212', '--sf':'#1e1e1e', '--bd':'rgba(255,255,255,.08)', 
    '--text':'#e5e5e5', '--mu':'rgba(255,255,255,.45)', '--cd':'#1a1a1a', 
    '--ac':'#ffffff', '--at':'#000000', '--ib':'#2a2a2a' 
  },
  't-foryou': { 
    '--bg':'#fbf8f0', '--sf':'#f1eae0', '--bd':'rgba(90,80,70,.12)', 
    '--text':'#433422', '--mu':'rgba(67,52,34,.55)', '--cd':'#ffffff', 
    '--ac':'#8b6f54', '--at':'#ffffff', '--ib':'#e5dcce' 
  }
};

export const AppearancePage = ({ onBack, showToast }: any) => {
  const { profile, updateProfile } = useProfile();
  
  // State lokal buat ukuran font biar slider licin
  const [localTextSize, setLocalTextSize] = useState<number>(16);

  // Sync state lokal ukuran font dari Firestore
  useEffect(() => {
    if (profile.textSize) {
      setLocalTextSize(profile.textSize);
    }
  }, [profile.textSize]);

  // Sync font awal dari Firestore ke UI
  useEffect(() => {
    if (profile.font) {
      const fontObj = FONTS.find(f => f.name === profile.font);
      if (fontObj) {
        document.documentElement.style.setProperty('--font-primary', fontObj.family);
        document.body.style.fontFamily = fontObj.family;
      }
    }
  }, [profile.font]);

  const UI_THEMES = [
    { id: 'system', label: 'System', icon: Settings },
    { id: 't-foryou', label: 'For You', icon: Heart }, 
    { id: 't-dark', label: 'Dark', icon: Moon },
    { id: 't-light', label: 'Light', icon: Sun },
  ];

  // ── 1. LOGIKA APPLY TEMA ──
  const applyTheme = async (id: string) => {
    let varsToApply = THEME_PALETTES['t-light'];
    
    if (id === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      varsToApply = THEME_PALETTES[isDarkMode ? 't-dark' : 't-light'];
    } else if (THEME_PALETTES[id]) {
      varsToApply = THEME_PALETTES[id];
    }

    const root = document.documentElement;
    Object.entries(varsToApply).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
    
    root.className = id === 'system' ? '' : id;
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', varsToApply['--bg']);
    }

    await updateProfile({ theme: id });
    localStorage.setItem('cylen_theme', id); 
    showToast(`Tema diterapkan`);
  };

  // ── 2. LOGIKA UKURAN FONT ──
  useEffect(() => {
    document.documentElement.style.fontSize = `${(localTextSize / 16) * 100}%`;
    const timeoutId = setTimeout(() => {
      if (profile.textSize !== localTextSize) {
        updateProfile({ textSize: localTextSize });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localTextSize]);

  // ── 3. LOGIKA APPLY FONT (DIPERBAIKI) ──
  const applyFont = async (newFont: string) => {
    const fontObj = FONTS.find(f => f.name === newFont);
    if (fontObj) {
      // Ubah langsung gaya font di seluruh body aplikasi
      document.documentElement.style.setProperty('--font-primary', fontObj.family);
      document.body.style.fontFamily = fontObj.family;
      
      // Update data di Cloud
      await updateProfile({ font: newFont });
      showToast(`Font ${newFont} diterapkan`);
    }
  };

  const sliderPercentage = ((localTextSize - 12) / (24 - 12)) * 100;
  
  const getSizeLabel = (size: number) => {
    if (size <= 14) return 'Kecil';
    if (size <= 18) return 'Normal';
    if (size <= 21) return 'Besar';
    return 'Sangat Besar';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      <style>{`
        .custom-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; transition: background 0.1s ease; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 6px; height: 24px; background: var(--text); cursor: pointer; border-radius: 999px; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: transform 0.1s ease; }
        .custom-slider::-webkit-slider-thumb:active { transform: scaleY(1.2); }
        .custom-slider::-moz-range-thumb { width: 6px; height: 24px; background: var(--text); cursor: pointer; border-radius: 999px; border: none; }
      `}</style>

      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] z-10 border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

      {/* Theme Selector */}
      <div className="px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {UI_THEMES.map((t) => {
            const isActive = profile.theme === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => applyTheme(t.id)} className="flex flex-col items-center gap-2 flex-shrink-0 flex-1 min-w-[76px]">
                <div className={cn("w-full h-[48px] rounded-3xl flex items-center justify-center transition-all duration-300", isActive ? "bg-[var(--text)] text-[var(--bg)] shadow-md scale-105" : "bg-[var(--sf)] text-[var(--text)] hover:bg-[var(--bd)]")}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-[13px] mt-1 transition-colors", isActive ? "font-bold text-[var(--text)]" : "font-medium text-[var(--mu)]")}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Size Slider */}
      <div className="px-4 mt-8">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Text size</h2>
        <div className="bg-[var(--sf)] rounded-[24px] p-5 border border-[var(--bd)]/50">
          <div className="flex justify-between items-center px-1 mb-4 text-[var(--text)]/60 font-bold text-[13px]">
            <span>A</span>
            <span className="text-[14px] bg-[var(--text)]/5 px-3 py-1 rounded-full text-[var(--text)]">{getSizeLabel(localTextSize)} ({localTextSize}px)</span>
            <span className="text-[18px]">A</span>
          </div>

          <div className="flex items-center gap-4 mb-8 pt-2">
            <input type="range" min="12" max="24" step="1" value={localTextSize} onChange={(e) => setLocalTextSize(Number(e.target.value))} className="custom-slider cursor-pointer" style={{ background: `linear-gradient(to right, var(--text) ${sliderPercentage}%, var(--bd) ${sliderPercentage}%)` }} />
          </div>

          <div className="flex flex-col gap-4">
            <div className="self-end bg-[var(--cd)] text-[var(--text)] px-4 py-3 rounded-[20px] rounded-tr-sm shadow-sm transition-all duration-150 border border-[var(--bd)]/30" style={{ fontSize: `${localTextSize}px` }}>What is the truth of the universe?</div>
            <div className="text-[var(--text)] leading-relaxed px-2 opacity-90 transition-all duration-150" style={{ fontSize: `${localTextSize}px` }}>The universe is a vast system of laws and mysteries.</div>
            <button onClick={() => setLocalTextSize(16)} className="mt-6 font-bold text-[14px] text-[var(--text)] hover:opacity-70 w-full text-center py-2 transition-opacity">Reset ke Default</button>
          </div>
        </div>
      </div>

      {/* Font Style Options */}
      <div className="px-4 mt-8 mb-8">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Font Style</h2>
        <div className="flex flex-col gap-2">
          {FONTS.map(f => {
            const isActive = profile.font === f.name;
            return (
              <button 
                key={f.id} 
                onClick={() => applyFont(f.name)} 
                className={cn(
                  "flex items-center gap-4 p-4 rounded-3xl transition-all text-left border", 
                  isActive ? "bg-[var(--text)] text-[var(--bg)] border-transparent shadow-md" : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)]/20 hover:border-[var(--text)]/20"
                )}
              >
                <div className="text-[20px] font-bold w-6" style={{ fontFamily: f.family }}>Ag</div>
                <span className="flex-1 font-medium text-[15px]" style={{ fontFamily: f.family }}>{f.name}</span>
                {isActive && <Check size={18} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
