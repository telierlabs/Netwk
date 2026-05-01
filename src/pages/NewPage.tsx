import React, { useState } from 'react';
import { 
  ArrowLeft, Check, Download, ShieldCheck, KeyRound, 
  RadioTower, Settings, Heart, Moon, Sun 
} from 'lucide-react';
import { THEMES, FONTS } from '../constants';
import { cn } from '../lib/utils';

// ── 1. APPEARANCE PAGE ──
export const AppearancePage = ({ theme, setTheme, font, setFont, onBack, showToast }: any) => {
  const [textSize, setTextSize] = useState(16);

  // Mapping UI atas untuk System, For You, Dark, Light
  const UI_THEMES = [
    { id: 't-slate', label: 'System', icon: Settings },
    { id: 't-aurora-light', label: 'For You', icon: Heart },
    { id: 't-dark', label: 'Dark', icon: Moon },
    { id: 't-light', label: 'Light', icon: Sun },
  ];

  const sliderPercentage = ((textSize - 12) / (24 - 12)) * 100;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12" style={{ minHeight: 0 }}>
      {/* Custom Slider CSS */}
      <style>{`
        .custom-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 12px; border-radius: 6px; outline: none; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 4px; height: 28px; background: var(--text); cursor: pointer; border-radius: 2px; box-shadow: 1px 0 3px rgba(0,0,0,0.2); }
        .custom-slider::-moz-range-thumb { width: 4px; height: 28px; background: var(--text); cursor: pointer; border-radius: 2px; border: none; }
      `}</style>

      {/* Header dengan Tombol Back */}
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Appearance</h1>
      </header>

      {/* Theme Selector Tab */}
      <div className="px-4 mt-2">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {UI_THEMES.map((t) => {
            const isActive = theme === t.id;
            const Icon = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => { setTheme(t.id); showToast(`Tema ${t.label} diterapkan`); }} 
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
      <div className="px-4 mt-8">
        <h2 className="text-[14px] font-medium text-[var(--mu)] mb-3 px-2">Text size</h2>
        <div className="bg-[var(--sf)] rounded-[24px] p-5 mt-2 border border-[var(--bd)]">
          <div className="flex items-center gap-4 mb-8 pt-2">
            <input 
              type="range" min="12" max="24" value={textSize} 
              onChange={(e) => setTextSize(Number(e.target.value))} 
              className="custom-slider" 
              style={{ background: `linear-gradient(to right, var(--text) ${sliderPercentage}%, var(--bg) ${sliderPercentage}%)` }} 
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="self-end bg-[var(--cd)] text-[var(--text)] px-4 py-3 rounded-[20px] rounded-tr-sm shadow-sm" style={{ fontSize: `${textSize}px` }}>
              What is the truth of the universe?
            </div>
            <div className="text-[var(--text)] leading-relaxed px-2 opacity-90" style={{ fontSize: `${textSize}px` }}>
              The universe is a vast system of laws and mysteries.
            </div>
            <button onClick={() => setTextSize(16)} className="mt-6 font-bold text-[15px] text-[var(--text)] hover:text-[var(--mu)] w-full text-center py-2 transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Font Style Options (Diselaraskan dengan UI baru) */}
      <div className="px-4 mt-8 mb-8">
        <h2 className="text-[14px] font-medium text-[var(--mu)] mb-3 px-2">Font Style</h2>
        <div className="flex flex-col gap-2">
          {FONTS.map(f => (
            <button 
              key={f.id} 
              onClick={() => { setFont(f.id); showToast(`Font ${f.name} diterapkan`); }} 
              className={cn(
                "flex items-center gap-4 p-4 rounded-3xl transition-all text-left border", 
                font === f.id ? "bg-[var(--text)] text-[var(--bg)] border-transparent shadow-md" : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)] hover:bg-[var(--bd)]"
              )}
            >
              <div className="text-[20px] font-bold w-6" style={{ fontFamily: f.family }}>Ag</div>
              <span className="flex-1 font-medium text-[15px]">{f.name}</span>
              {font === f.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── 2. USAGE PAGE ──
export const UsagePage = ({ onBack }: any) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={20} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Penggunaan</h1>
    </header>
    <div className="p-6 pt-2 flex flex-col gap-4">
      <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2">Statistik interaksi kamu dengan Cylen.</p>
      <div className="bg-[var(--sf)] p-6 rounded-[24px] border border-[var(--bd)]">
        <div className="text-[32px] font-black text-[var(--text)]">1,402</div>
        <div className="text-[13px] font-bold text-[var(--mu)] uppercase tracking-widest">Pesan Terkirim (Bulan ini)</div>
      </div>
      <div className="bg-[var(--sf)] p-6 rounded-[24px] border border-[var(--bd)] h-48 flex items-end justify-between px-8">
        {[40, 70, 45, 90, 60, 100, 30].map((h, i) => (
          <div key={i} className="w-6 bg-[var(--text)] rounded-t-md opacity-80" style={{ height: `${h}%` }} />
        ))}
      </div>
      <p className="text-center text-xs text-[var(--mu)] font-bold mt-2">Grafik aktivitas 7 hari terakhir</p>
    </div>
  </div>
);

// ── 3. INTEGRATION PAGE ──
export const IntegrationPage = ({ onBack, showToast }: any) => {
  const [active, setActive] = useState(true);
  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={20} /></button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personal Intelligence</h1>
      </header>
      <div className="p-6 pt-2 flex flex-col gap-4">
        <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2">Sambungkan Cylen dengan ekosistem lain.</p>
        <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white"><RadioTower size={20} /></div>
            <div><div className="font-bold text-[16px] text-[var(--text)]">TelierNews API</div><div className="text-[12px] text-[var(--mu)]">Akses berita real-time</div></div>
          </div>
          <button onClick={() => { setActive(!active); showToast(active ? 'TelierNews Nonaktif' : 'TelierNews Aktif'); }} className={cn("w-14 h-8 rounded-full transition-colors relative", active ? "bg-green-500" : "bg-[var(--bd)]")}>
            <div className={cn("w-6 h-6 bg-white rounded-full absolute top-1 transition-all", active ? "left-7" : "left-1")} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 4. SECURITY PAGE ──
export const SecurityPage = ({ onBack, showToast }: any) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={20} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Keamanan Akun</h1>
    </header>
    <div className="p-6 pt-2 flex flex-col gap-3">
      <button onClick={() => showToast('Cek email untuk reset password')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)] rounded-[20px] text-left hover:opacity-80 transition-opacity">
        <KeyRound size={20} className="text-[var(--text)]" /><div><div className="font-bold text-[15px]">Ubah Password</div><div className="text-xs text-[var(--mu)] mt-1">Reset kata sandi akun</div></div>
      </button>
      <button onClick={() => showToast('2FA Aktif')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)] rounded-[20px] text-left hover:opacity-80 transition-opacity">
        <ShieldCheck size={20} className="text-green-500" /><div><div className="font-bold text-[15px]">Autentikasi 2 Faktor</div><div className="text-xs text-[var(--mu)] mt-1">Keamanan ekstra diaktifkan</div></div>
      </button>
    </div>
  </div>
);

// ── 5. EXPORT DATA PAGE ──
export const ExportDataPage = ({ onBack, showToast }: any) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={20} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Ekspor Data</h1>
    </header>
    <div className="p-6 pt-2 flex flex-col gap-4">
      <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2">Unduh semua riwayat obrolan dan preferensi.</p>
      <button onClick={() => showToast('Menyiapkan file ZIP...')} className="w-full flex items-center justify-center gap-3 bg-[var(--text)] text-[var(--bg)] p-4 rounded-full font-bold shadow-lg active:scale-95 transition-all">
        <Download size={18} /> Unduh Data Saya (ZIP)
      </button>
      <p className="text-[12px] text-[var(--mu)] text-center mt-2 leading-relaxed px-4">Proses ekspor memakan waktu beberapa menit. Link unduhan akan dikirim via Email.</p>
    </div>
  </div>
);
