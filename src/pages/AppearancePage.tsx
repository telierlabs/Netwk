import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Heart, Moon, Sun, Settings } from 'lucide-react';
import { FONTS } from '../constants';
import { cn } from '../lib/utils';

// ─── DEFINISI PALET WARNA TEMA YANG NYAMAN DI MATA ───
const THEME_PALETTES: Record<string, Record<string, string>> = {
  // 1. Light: Putih bersih, abu-abu terang minimalis
  't-light': { 
    '--bg':'#ffffff', '--sf':'#f5f5f5', '--bd':'rgba(0,0,0,.08)', 
    '--text':'#0a0a0a', '--mu':'rgba(0,0,0,.4)', '--cd':'#ffffff', 
    '--ac':'#0a0a0a', '--at':'#ffffff', '--ib':'#f0f0f0' 
  },
  
  // 2. Dark: Abu-abu gelap Onyx/Charcoal (bukan hitam pekat mati), adem di mata
  't-dark': { 
    '--bg':'#121212', '--sf':'#1e1e1e', '--bd':'rgba(255,255,255,.08)', 
    '--text':'#e5e5e5', '--mu':'rgba(255,255,255,.45)', '--cd':'#1a1a1a', 
    '--ac':'#ffffff', '--at':'#000000', '--ib':'#2a2a2a' 
  },
  
  // 3. For You: Mode Cream / Sepia hangat (Beda jauh dari Light, cocok buat baca malam)
  't-foryou': { 
    '--bg':'#fbf8f0', '--sf':'#f1eae0', '--bd':'rgba(90,80,70,.12)', 
    '--text':'#433422', '--mu':'rgba(67,52,34,.55)', '--cd':'#ffffff', 
    '--ac':'#8b6f54', '--at':'#ffffff', '--ib':'#e5dcce' 
  }
};

export const AppearancePage = ({ theme, setTheme, font, setFont, onBack, showToast }: any) => {
  // Ambil ukuran font kontinu (default 16px)
  const [textSize, setTextSize] = useState<number>(() => Number(localStorage.getItem('cylen_text_size')) || 16);

  // Mapping 4 Tombol Tema Utama di Atas
  const UI_THEMES = [
    { id: 'system', label: 'System', icon: Settings },
    { id: 't-foryou', label: 'For You', icon: Heart }, 
    { id: 't-dark', label: 'Dark', icon: Moon },
    { id: 't-light', label: 'Light', icon: Sun },
  ];

  // ─── LOGIKA APPLY TEMA REALTIME ───
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

  // ─── LOGIKA SINKRONISASI UKURAN FONT (ANTI-LAG) ───
  useEffect(() => {
    // 1. Ubah ukuran font aplikasi secara realtime (16px dianggap 100% normal)
    document.documentElement.style.fontSize = `${(textSize / 16) * 100}%`;

    // 2. Jeda penyimpanan ke localStorage agar aktivitas seret/drag slider bener-bener licin
    const timeoutId = setTimeout(() => {
      localStorage.setItem('cylen_text_size', String(textSize));
      // Fallback id untuk kecocokan kode lama jika dibutuhkan
      let legacyId = 's-normal';
      if (textSize < 15) legacyId = 's-small';
      else if (textSize > 21) legacyId = 's-huge';
      else if (textSize > 17) legacyId = 's-large';
      localStorage.setItem('cylen_font_size_id', legacyId);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [textSize]);

  // Logic Apply Font Style
  const applyFont = (newFont: string) => {
    setFont(newFont);
    localStorage.setItem('cylen_font', newFont);
    const fontObj = FONTS.find(f => f.id === newFont || f.name === newFont);
    if (fontObj) document.documentElement.style.fontFamily = fontObj.family;
  };

  // Listener untuk perubahan tema sistem otomatis
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Kalkulasi persentase slider untuk background hitam/putih dinamis
  const sliderPercentage = ((textSize - 12) / (24 - 12)) * 100;

  // Label nama ukuran dinamis berdasarkan pixel slider
  const getSizeLabel = (size: number) => {
    if (size <= 14) return 'Kecil';
    if (size <= 18) return 'Normal';
    if (size <= 21) return 'Besar';
    return 'Sangat Besar';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      
      {/* CSS Override Slider Bawaan Biar Minimalis Elegan */}
      <style>{`
        .custom-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; border-radius: 999px; outline: none; transition: background 0.1s ease; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 6px; height: 24px; background: var(--text); cursor: pointer; border-radius: 999px; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: transform 0.1s ease; }
        .custom-slider::-webkit-slider-thumb:active { transform: scaleY(1.2); }
        .custom-slider::-moz-range-thumb { width: 6px; height: 24px; background: var(--text); cursor: pointer; border-radius: 999px; border: none; }
      `}</style>

      {/* Header */}
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] z-10 border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

      {/* Theme Selector Tab (4 Tombol Bersih Sesuai Desain Awal Lu) */}
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

      {/* Text Size Slider & Preview Panel (Sekarang Licin 100%) */}
      <div className="px-4 mt-8">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Text size</h2>
        <div className="bg-[var(--sf)] rounded-[24px] p-5 border border-[var(--bd)]/50">
          
          {/* Indikator Atas Slider */}
          <div className="flex justify-between items-center px-1 mb-4 text-[var(--text)]/60 font-bold text-[13px]">
            <span>A</span>
            <span className="text-[14px] bg-[var(--text)]/5 px-3 py-1 rounded-full text-[var(--text)]">
              {getSizeLabel(textSize)} ({textSize}px)
            </span>
            <span className="text-[18px]">A</span>
          </div>

          {/* Input Range Licin */}
          <div className="flex items-center gap-4 mb-8 pt-2">
            <input 
              type="range" 
              min="12" 
              max="24" 
              step="1"
              value={textSize} 
              onChange={(e) => setTextSize(Number(e.target.value))} 
              className="custom-slider cursor-pointer" 
              style={{ background: `linear-gradient(to right, var(--text) ${sliderPercentage}%, var(--bd) ${sliderPercentage}%)` }} 
            />
          </div>

          {/* Kotak Preview Dinamis */}
          <div className="flex flex-col gap-4">
            <div className="self-end bg-[var(--cd)] text-[var(--text)] px-4 py-3 rounded-[20px] rounded-tr-sm shadow-sm transition-all duration-150 border border-[var(--bd)]/30" style={{ fontSize: `${textSize}px` }}>
              What is the truth of the universe?
            </div>
            <div className="text-[var(--text)] leading-relaxed px-2 opacity-90 transition-all duration-150" style={{ fontSize: `${textSize}px` }}>
              The universe is a vast system of laws and mysteries.
            </div>
            <button onClick={() => setTextSize(16)} className="mt-6 font-bold text-[14px] text-[var(--text)] hover:opacity-70 w-full text-center py-2 transition-opacity">
              Reset ke Default
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
