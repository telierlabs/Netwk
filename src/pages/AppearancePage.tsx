import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Heart, Moon, Sun, Settings } from 'lucide-react';
import { FONTS } from '../constants';
import { cn } from '../lib/utils';

// ─── DEFINISI PALET WARNA TEMA YANG SUDAH DIBENARKAN ───
const THEME_PALETTES: Record<string, Record<string, string>> = {
  // 1. Light: Putih bersih, abu-abu terang.
  't-light': { 
    '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', 
    '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.4)', '--cd':'#ffffff', 
    '--ac':'#0a0a0a', '--at':'#ffffff', '--ib':'#f0f0f0' 
  },
  
  // 2. Dark: Abu-abu gelap (bukan hitam pekat), nyaman di mata.
  't-dark': { 
    '--bg':'#121212', '--sf':'#1e1e1e', '--bd':'rgba(255,255,255,.08)', 
    '--text':'#e5e5e5', '--mu':'rgba(255,255,255,.45)', '--cd':'#1a1a1a', 
    '--ac':'#ffffff', '--at':'#000000', '--ib':'#2a2a2a' 
  },
  
  // 3. For You: Mode hangat / Cream Sepia (Beda jauh dari Light)
  't-foryou': { 
    '--bg':'#fcfaf5', '--sf':'#f2efe6', '--bd':'rgba(100,90,80,.12)', 
    '--text':'#4a3f35', '--mu':'rgba(74,63,53,.55)', '--cd':'#ffffff', 
    '--ac':'#8b6f54', '--at':'#ffffff', '--ib':'#e6e1d3' 
  }
};

const SIZES = [
  { id: 's-small', name: 'Kecil', value: 85, pxPreview: 13 },
  { id: 's-normal', name: 'Normal', value: 100, pxPreview: 15 },
  { id: 's-large', name: 'Besar', value: 115, pxPreview: 18 },
  { id: 's-huge', name: 'Sangat Besar', value: 130, pxPreview: 21 },
];

export const AppearancePage = ({ theme, setTheme, font, setFont, onBack, showToast }: any) => {
  const [sizeId, setSizeId] = useState<string>(() => localStorage.getItem('cylen_font_size_id') || 's-normal');

  // Mapping UI atas untuk System, For You, Dark, Light
  const UI_THEMES = [
    { id: 'system', label: 'System', icon: Settings },
    { id: 't-foryou', label: 'For You', icon: Heart }, 
    { id: 't-dark', label: 'Dark', icon: Moon },
    { id: 't-light', label: 'Light', icon: Sun },
  ];

  // Logic Apply Theme Realtime
  const applyTheme = (id: string) => {
    setTheme(id);
    localStorage.setItem('cylen_theme', id);
    
    let varsToApply = THEME_PALETTES['t-light'];
    
    if (id === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      varsToApply = THEME_PALETTES[isDarkMode ? 't-dark' : 't-light'];
    } else if (THEME_PALETTES[id]) {
      varsToApply = THEME_PALETTES[id];
    }

    const root = document.documentElement;
    Object.entries(varsToApply).forEach(([key, val]) => root.style.setProperty(key, val));
    root.className = id === 'system' ? '' : id;
  };

  // Logic Apply Text Size Realtime
  const applySize = (id: string) => {
    const selectedSize = SIZES.find(s => s.id === id) || SIZES[1];
    setSizeId(id);
    localStorage.setItem('cylen_font_size_id', id);
    document.documentElement.style.fontSize = `${selectedSize.value}%`;
  };

  // Logic Apply Font Realtime
  const applyFont = (newFont: string) => {
    setFont(newFont);
    localStorage.setItem('cylen_font', newFont);
    const fontObj = FONTS.find(f => f.id === newFont || f.name === newFont);
    if (fontObj) document.documentElement.style.fontFamily = fontObj.family;
  };

  // Update System Theme listener
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const currentSizeIndex = SIZES.findIndex(s => s.id === sizeId);
  const sliderPercentage = (currentSizeIndex / (SIZES.length - 1)) * 100;
  const currentPxPreview = SIZES[currentSizeIndex]?.pxPreview || 15;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      <style>{`
        .custom-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 12px; border-radius: 6px; outline: none; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 4px; height: 28px; background: var(--text); cursor: pointer; border-radius: 2px; box-shadow: 1px 0 3px rgba(0,0,0,0.2); }
        .custom-slider::-moz-range-thumb { width: 4px; height: 28px; background: var(--text); cursor: pointer; border-radius: 2px; border: none; }
      `}</style>

      {/* Header */}
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] z-10 border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

      {/* Theme Selector Tab (Hanya 4 Utama) */}
      <div className="px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {UI_THEMES.map((t) => {
            const isActive = theme === t.id;
            const Icon = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => { applyTheme(t.id); showToast(`Tema ${t.label} diterapkan`); }} 
                className="flex flex-col items-center gap-2 flex-shrink-0 flex-1 min-w-[76px]"
              >
                <div className={cn(
                  "w-full h-[48px] rounded-3xl flex items-center justify-center transition-all duration-300", 
                  isActive ? "bg-[var(--text)] text-[var(--bg)] shadow-md scale-105" : "bg-[var(--sf)] text-[var(--text)] hover:bg-[var(--bd)]"
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[13px] mt-1 transition-colors", 
                  isActive ? "font-bold text-[var(--text)]" : "font-medium text-[var(--mu)]"
                )}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Size Slider & Preview */}
      <div className="px-4 mt-10">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Text size</h2>
        <div className="bg-[var(--sf)] rounded-[24px] p-5 border border-[var(--bd)]/50">
          <div className="flex items-center gap-4 mb-8 pt-2">
            <input 
              type="range" min="0" max={SIZES.length - 1} value={currentSizeIndex} 
              onChange={(e) => applySize(SIZES[Number(e.target.value)].id)} 
              className="custom-slider" 
              style={{ background: `linear-gradient(to right, var(--text) ${sliderPercentage}%, var(--bd) ${sliderPercentage}%)` }} 
            />
          </div>
          <div className="flex flex-col gap-4 transition-all duration-300">
            <div className="self-end bg-[var(--cd)] text-[var(--text)] px-4 py-3 rounded-[20px] rounded-tr-sm shadow-sm transition-all duration-300" style={{ fontSize: `${currentPxPreview}px` }}>
              What is the truth of the universe?
            </div>
            <div className="text-[var(--text)] leading-relaxed px-2 opacity-90 transition-all duration-300" style={{ fontSize: `${currentPxPreview}px` }}>
              The universe is a vast system of laws and mysteries.
            </div>
            <button onClick={() => applySize('s-normal')} className="mt-6 font-bold text-[15px] text-[var(--text)] hover:text-[var(--mu)] w-full text-center py-2 transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Font Style Options */}
      <div className="px-4 mt-8 mb-8">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Font Style</h2>
        <div className="flex flex-col gap-2">
          {FONTS.map(f => (
            <button 
              key={f.id} 
              onClick={() => { applyFont(f.name); showToast(`Font ${f.name} diterapkan`); }} 
              className={cn(
                "flex items-center gap-4 p-4 rounded-3xl transition-all text-left border", 
                font === f.name ? "bg-[var(--text)] text-[var(--bg)] border-transparent shadow-md" : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)]/20 hover:border-[var(--text)]/20"
              )}
            >
              <div className="text-[20px] font-bold w-6" style={{ fontFamily: f.family }}>Ag</div>
              <span className="flex-1 font-medium text-[15px]">{f.name}</span>
              {font === f.name && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
