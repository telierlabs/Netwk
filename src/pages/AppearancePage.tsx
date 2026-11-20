import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Heart, Moon, Sun, Settings } from 'lucide-react';
import { FONTS } from '../constants';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
// Palet warna satu sumber (sama dengan App.tsx & useProfile.ts). Dulu halaman ini punya salinan palet sendiri.
import { paintTheme } from '../lib/themePalettes';

export const AppearancePage = ({ onBack, showToast, setTheme }: any) => {
  const { profile, updateProfile } = useProfile();

  const [localTextSize, setLocalTextSize] = useState<number>(16);

  useEffect(() => {
    if (profile.textSize) {
      setLocalTextSize(profile.textSize);
    }
  }, [profile.textSize]);

  // ── Terapkan tema tersimpan saat halaman dibuka / berubah ──
  useEffect(() => {
    if (profile.theme) paintTheme(profile.theme);
  }, [profile.theme]);

  // ── Mode "System": ikut berubah saat HP ganti dark/light ──
  useEffect(() => {
    if (profile.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => paintTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [profile.theme]);

  // ── Font awal: diterapkan saat load ──
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

  const applyTheme = async (id: string) => {
    paintTheme(id);
    // Sinkronkan ke state tema di App.tsx (status bar, color-scheme, dll ikut benar)
    if (setTheme) {
      setTheme(id === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 't-dark' : 't-light')
        : id);
    }
    await updateProfile({ theme: id });
    localStorage.setItem('cylen_theme', id);
    showToast('Tema diterapkan');
  };

  useEffect(() => {
    document.documentElement.style.fontSize = `${(localTextSize / 16) * 100}%`;
    const timeoutId = setTimeout(() => {
      if (profile.textSize !== localTextSize) {
        updateProfile({ textSize: localTextSize });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [localTextSize]);

  const applyFont = async (newFont: string) => {
    const fontObj = FONTS.find(f => f.name === newFont);
    if (fontObj) {
      // 1. Variabel CSS global
      document.documentElement.style.setProperty('--font-primary', fontObj.family);
      // 2. Inline style body (spesifisitas tertinggi)
      document.body.style.fontFamily = fontObj.family;
      // 3. Simpan ke profil (Firestore)
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

      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] z-10 border-b border-[var(--bd)]">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

      <div className="px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {UI_THEMES.map((t) => {
            const isActive = profile.theme === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => applyTheme(t.id)} className="flex flex-col items-center gap-2 flex-shrink-0 flex-1 min-w-[76px]">
                <div className={cn(
                  "w-full h-[48px] rounded-3xl flex items-center justify-center transition-all duration-300",
                  isActive ? "bg-[var(--ac)] text-[var(--at)] shadow-md scale-105" : "bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)] hover:bg-[var(--ib)]"
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn("text-[13px] mt-1 transition-colors", isActive ? "font-bold text-[var(--text)]" : "font-medium text-[var(--mu)]")}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mt-8">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)] mb-3 px-2">Text size</h2>
        <div className="bg-[var(--sf)] rounded-[24px] p-5 border border-[var(--bd)]">
          <div className="flex justify-between items-center px-1 mb-4 text-[var(--mu)] font-bold text-[13px]">
            <span>A</span>
            <span className="text-[14px] bg-[var(--ib)] px-3 py-1 rounded-full text-[var(--text)]">{getSizeLabel(localTextSize)} ({localTextSize}px)</span>
            <span className="text-[18px]">A</span>
          </div>

          <div className="flex items-center gap-4 mb-8 pt-2">
            <input
              type="range" min="12" max="24" step="1" value={localTextSize}
              onChange={(e) => setLocalTextSize(Number(e.target.value))}
              className="custom-slider cursor-pointer"
              style={{ background: `linear-gradient(to right, var(--ac) ${sliderPercentage}%, var(--ib) ${sliderPercentage}%)` }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="self-end bg-[var(--cd)] text-[var(--text)] px-4 py-3 rounded-[20px] rounded-tr-sm shadow-sm transition-all duration-150 border border-[var(--bd)]" style={{ fontSize: `${localTextSize}px` }}>What is the truth of the universe?</div>
            <div className="text-[var(--text)] leading-relaxed px-2 opacity-90 transition-all duration-150" style={{ fontSize: `${localTextSize}px` }}>The universe is a vast system of laws and mysteries.</div>
            <button onClick={() => setLocalTextSize(16)} className="mt-6 font-bold text-[14px] text-[var(--text)] hover:opacity-70 w-full text-center py-2 transition-opacity">Reset ke Default</button>
          </div>
        </div>
      </div>

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
                  isActive
                    ? "bg-[var(--ac)] text-[var(--at)] border-transparent shadow-md"
                    : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)] hover:bg-[var(--ib)]"
                )}
              >
                <div className="text-[20px] font-bold w-6" style={{ fontFamily: f.family }}>Ag</div>
                <span className="flex-1 font-medium text-[15px]">{f.name}</span>
                {isActive && <Check size={18} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
