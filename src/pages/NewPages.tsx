import React, { useState } from 'react';
import { ArrowLeft, Check, Download, ShieldCheck, KeyRound, Smartphone, RadioTower, RefreshCw } from 'lucide-react';
import { THEMES, FONTS } from '../constants';
import { cn } from '../lib/utils';

// ── 1. APPEARANCE PAGE ──
export const AppearancePage = ({ theme, setTheme, font, setFont, onBack, showToast }: any) => {
  const [textSize, setTextSize] = useState(15);
  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <div className="p-6 pb-2"><h2 className="text-xl font-bold text-[var(--text)]">Appearance</h2><p className="text-sm text-[var(--mu)] mt-1">Ubah tema, font, dan ukuran teks.</p></div>
      <div className="p-6 pt-4">
        <h3 className="text-sm font-bold text-[var(--mu)] mb-4">TEMA WARNA</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => { setTheme(t.id); showToast(`Tema ${t.name} diterapkan`); }} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border", theme === t.id ? "border-[var(--text)] bg-[var(--sf)] shadow-md" : "border-[var(--bd)] bg-transparent")}>
              <div className="w-full aspect-video rounded-xl flex items-center justify-center border border-[var(--bd)]" style={{ backgroundColor: t.bg }}><div className="w-1/3 h-1/3 rounded-full" style={{ backgroundColor: t.accent }}/></div>
              <span className="text-[12px] font-bold text-[var(--text)]">{t.name}</span>
            </button>
          ))}
        </div>
        <h3 className="text-sm font-bold text-[var(--mu)] mb-4">GAYA HURUF</h3>
        <div className="flex flex-col gap-2 mb-8">
          {FONTS.map(f => (
            <button key={f.id} onClick={() => { setFont(f.id); showToast(`Font ${f.name} diterapkan`); }} className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-all text-left", font === f.id ? "border-[var(--text)] bg-[var(--sf)] shadow-md" : "border-[var(--bd)] bg-transparent")}>
              <div className="text-[20px] font-bold w-6" style={{ fontFamily: f.family }}>Ag</div>
              <span className="flex-1 font-medium text-[15px]">{f.name}</span>
              {font === f.id && <Check size={18} />}
            </button>
          ))}
        </div>
        <h3 className="text-sm font-bold text-[var(--mu)] mb-4">UKURAN TEKS</h3>
        <div className="bg-[var(--sf)] p-5 rounded-2xl border border-[var(--bd)]">
          <input type="range" min="12" max="20" value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} className="w-full accent-[var(--text)]" />
          <div className="flex justify-between text-[12px] text-[var(--mu)] font-bold mt-3"><span>A (Kecil)</span><span>Standard</span><span>A (Besar)</span></div>
        </div>
      </div>
    </div>
  );
};

// ── 2. USAGE PAGE ──
export const UsagePage = ({ onBack }: any) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <div className="p-6 pb-2"><h2 className="text-xl font-bold text-[var(--text)]">Penggunaan</h2><p className="text-sm text-[var(--mu)] mt-1">Statistik interaksi kamu dengan Cylen.</p></div>
    <div className="p-6 pt-4 flex flex-col gap-4">
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
      <div className="p-6 pb-2"><h2 className="text-xl font-bold text-[var(--text)]">Personal Intelligence</h2><p className="text-sm text-[var(--mu)] mt-1">Sambungkan Cylen dengan ekosistem lain.</p></div>
      <div className="p-6 pt-4 flex flex-col gap-4">
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
    <div className="p-6 pb-2"><h2 className="text-xl font-bold text-[var(--text)]">Keamanan Akun</h2></div>
    <div className="p-6 pt-4 flex flex-col gap-3">
      <button onClick={() => showToast('Cek email untuk reset password')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)] rounded-[20px] text-left hover:opacity-80">
        <KeyRound size={20} className="text-[var(--text)]" /><div><div className="font-bold text-[15px]">Ubah Password</div><div className="text-xs text-[var(--mu)] mt-1">Reset kata sandi akun</div></div>
      </button>
      <button onClick={() => showToast('2FA Aktif')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)] rounded-[20px] text-left hover:opacity-80">
        <ShieldCheck size={20} className="text-green-500" /><div><div className="font-bold text-[15px]">Autentikasi 2 Faktor</div><div className="text-xs text-[var(--mu)] mt-1">Keamanan ekstra diaktifkan</div></div>
      </button>
    </div>
  </div>
);

// ── 5. EXPORT DATA PAGE ──
export const ExportDataPage = ({ onBack, showToast }: any) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <div className="p-6 pb-2"><h2 className="text-xl font-bold text-[var(--text)]">Ekspor Data</h2><p className="text-sm text-[var(--mu)] mt-1">Unduh semua riwayat obrolan dan preferensi.</p></div>
    <div className="p-6 pt-4 flex flex-col gap-4">
      <button onClick={() => showToast('Menyiapkan file ZIP...')} className="w-full flex items-center justify-center gap-3 bg-[var(--text)] text-[var(--bg)] p-4 rounded-full font-bold shadow-lg active:scale-95 transition-all">
        <Download size={18} /> Unduh Data Saya (ZIP)
      </button>
      <p className="text-[12px] text-[var(--mu)] text-center mt-2 leading-relaxed">Proses ekspor memakan waktu beberapa menit. Link unduhan akan dikirim via Email.</p>
    </div>
  </div>
);
