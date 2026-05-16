import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Heart, Moon, Sun, Settings, Palette, Sparkles } from 'lucide-react';
import { THEMES, FONTS } from '../constants';
import { cn } from '../lib/utils';

const THEME_PALETTES: Record<string, Record<string, string>> = {
  't-light': { '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.38)', '--cd':'#fff', '--ac':'#0a0a0a', '--at':'#fff', '--ib':'#f0f0f0' },
  't-dark':  { '--bg':'#111111', '--sf':'#1f1f1f', '--bd':'rgba(255,255,255,.07)', '--text':'#ffffff', '--mu':'rgba(255,255,255,.35)', '--cd':'#111111', '--ac':'#ffffff', '--at':'#000000', '--ib':'#252525' },
  't-cream': { '--bg':'#faf0e6', '--sf':'#fdf5e6', '--bd':'rgba(0,0,0,.06)', '--text':'#3f2a14', '--mu':'rgba(63,42,20,.5)', '--cd':'#fffaf0', '--ac':'#8b4513', '--at':'#fff', '--ib':'#f5ebd9' },
  't-grey':  { '--bg':'#2e3440', '--sf':'#3b4252', '--bd':'rgba(255,255,255,.05)', '--text':'#eceff4', '--mu':'#d8dee9', '--cd':'#2e3440', '--ac':'#88c0d0', '--at':'#2e3440', '--ib':'#434c5e' },
  't-blue':  { '--bg':'#0b1120', '--sf':'#111827', '--bd':'rgba(255,255,255,.06)', '--text':'#e2e8f0', '--mu':'#94a3b8', '--cd':'#0b1120', '--ac':'#38bdf8', '--at':'#0b1120', '--ib':'#1f2937' },
  't-mauve': { '--bg':'#1a1625', '--sf':'#2d253a', '--bd':'rgba(255,255,255,.06)', '--text':'#f3e8ff', '--mu':'#c084fc', '--cd':'#1a1625', '--ac':'#bd93f9', '--at':'#1a1625', '--ib':'#3c2f4d' },
};

const EXTRA_THEMES = [
  { id: 't-cream', name: 'Cream', icon: <Sparkles size={18} className="text-[#8b4513]" /> },
  { id: 't-grey', name: 'Abu Nordic', icon: <Palette size={18} className="text-[#88c0d0]" /> },
  { id: 't-blue', name: 'Deep Blue', icon: <Palette size={18} className="text-[#38bdf8]" /> },
  { id: 't-mauve', name: 'Mauve', icon: <Palette size={18} className="text-[#bd93f9]" /> },
];

const SIZES = [
  { id: 's-small', name: 'Kecil', value: 85, pxPreview: 13 },
  { id: 's-normal', name: 'Normal', value: 100, pxPreview: 15 },
  { id: 's-large', name: 'Besar', value: 115, pxPreview: 18 },
  { id: 's-huge', name: 'Sangat Besar', value: 130, pxPreview: 21 },
];

export const AppearancePage = ({ theme, setTheme, font, setFont, onBack, showToast }: any) => {
  const [sizeId, setSizeId] = useState<string>(() => localStorage.getItem('cylen_font_size_id') || 's-normal');

  const UI_THEMES = [
    { id: 'system', label: 'System', icon: Settings },
    { id: 't-cream', label: 'For You', icon: Heart }, 
    { id: 't-dark', label: 'Dark', icon: Moon },
    { id: 't-light', label: 'Light', icon: Sun },
  ];

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

  const applySize = (id: string) => {
    const selectedSize = SIZES.find(s => s.id === id) || SIZES[1];
    setSizeId(id);
    localStorage.setItem('cylen_font_size_id', id);
    document.documentElement.style.fontSize = `${selectedSize.value}%`;
  };

  const applyFont = (newFont: string) => {
    setFont(newFont);
    localStorage.setItem('cylen_font', newFont);
    const fontObj = FONTS.find(f => f.id === newFont || f.name === newFont);
    if (fontObj) document.documentElement.style.fontFamily = fontObj.family;
  };

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

      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] z-10 border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

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

      <div className="px-4 mt-6">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Warna Kustom</h2>
        <div className="grid grid-cols-2 gap-3">
          {EXTRA_THEMES.map(t => (
             <button 
               key={t.id} 
               onClick={() => { applyTheme(t.id); showToast(`Tema ${t.name} diterapkan`); }}
               className={cn(
                 "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
                 theme === t.id ? "bg-[var(--text)] text-[var(--bg)] border-transparent shadow-md" : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)]/30 hover:border-[var(--text)]/30"
               )}
             >
               <div className={cn("p-1.5 rounded-full bg-[var(--bg)] border border-[var(--bd)]", theme === t.id && "bg-[var(--bg)]/20 border-transparent")}>
                 {t.icon}
               </div>
               <span className="text-[14px] font-bold">{t.name}</span>
             </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-8">
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
