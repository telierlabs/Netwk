import React, { useState } from 'react';
import { ArrowLeft, Zap, ShieldCheck, Sparkles, SlidersHorizontal, Save, RotateCcw, MessageSquareText } from 'lucide-react';
import { cn } from '../lib/utils';

const TONES = ['Default', 'Profesional', 'Ramah', 'Jujur', 'Nyentrik', 'Efisien', 'Sinis'];

export const AiSettings = ({ onBack }: { onBack: () => void }) => {
  const [tone, setTone] = useState('Default');
  const [warmth, setWarmth] = useState(2);      // 1: Dingin, 2: Normal, 3: Empati
  const [formality, setFormality] = useState(2); // 1: Santai/Gaul, 2: Normal, 3: Baku
  const [enthusiasm, setEnthusiasm] = useState(2); // 1: Datar, 2: Normal, 3: Semangat
  const [length, setLength] = useState(2);       // 1: Singkat, 2: Normal, 3: Detail
  
  const [customPrompt, setCustomPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleReset = () => {
    setTone('Default'); setWarmth(2); setFormality(2); setEnthusiasm(2); setLength(2); setCustomPrompt(''); setApiKey('');
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    // localStorage.setItem('cylen_settings', JSON.stringify({ tone, warmth, formality ... }))
  };

  // Komponen Switcher 3 level (Pill Style)
  const SegmentControl = ({ label, left, center, right, value, onChange }: any) => (
    <div className="flex flex-col gap-3">
      <span className="text-[13px] font-bold text-[var(--mu)] tracking-wide ml-1">{label}</span>
      <div className="flex bg-[var(--bg)] p-1.5 rounded-[20px] border border-[var(--bd)] relative">
        {[ { id: 1, text: left }, { id: 2, text: center }, { id: 3, text: right } ].map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 py-2.5 text-[12px] rounded-[14px] transition-all duration-300 relative z-10",
              value === item.id 
                ? "bg-[var(--text)] text-[var(--bg)] font-bold shadow-md scale-[1.02]" 
                : "text-[var(--mu)] font-medium hover:text-[var(--text)]"
            )}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300 overflow-hidden">
      
      {/* HEADER */}
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 bg-[var(--bg)] border-b border-[var(--bd)]">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personalisasi Cylen</h1>
      </header>

      {/* BODY / KONTEN UTAMA */}
      <div className="flex-1 overflow-y-auto pb-32" style={{ scrollbarWidth: 'none' }}>
        <div className="p-4 flex flex-col gap-6 max-w-2xl mx-auto">

          {/* SECTION 1: NADA DASAR */}
          <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)]">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-[var(--text)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-widest">Nada Dasar</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300",
                    tone === t 
                      ? "bg-[var(--text)] text-[var(--bg)] shadow-md scale-105" 
                      : "bg-[var(--bg)] text-[var(--text)] border border-[var(--bd)] hover:bg-[var(--bd)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: KARAKTERISTIK AI */}
          <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)] flex flex-col gap-6">
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={18} className="text-[var(--text)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-widest">Karakteristik</span>
            </div>
            <SegmentControl label="Tingkat Kehangatan" left="Dingin" center="Normal" right="Empati" value={warmth} onChange={setWarmth} />
            <SegmentControl label="Gaya Bahasa" left="Santai" center="Normal" right="Baku" value={formality} onChange={setFormality} />
            <SegmentControl label="Antusiasme" left="Datar" center="Normal" right="Semangat" value={enthusiasm} onChange={setEnthusiasm} />
            <SegmentControl label="Panjang Jawaban" left="Singkat" center="Normal" right="Detail" value={length} onChange={setLength} />
          </div>

          {/* SECTION 3: INSTRUKSI MANUAL */}
          <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <MessageSquareText size={18} className="text-[var(--text)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-widest">Instruksi Spesifik</span>
            </div>
            <p className="text-[12px] text-[var(--mu)] leading-relaxed -mt-1">
              Tulis instruksi khusus jika pilihan di atas belum cukup (contoh: "Selalu panggil aku Boss").
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Masukkan instruksi tambahan di sini..."
              className="w-full bg-[var(--bg)] border border-[var(--bd)] rounded-[20px] px-5 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-all min-h-[120px] resize-none placeholder:text-[var(--mu)]"
            />
          </div>

          {/* SECTION 4: API KEY */}
          <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)] flex flex-col gap-4 mb-2">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <ShieldCheck size={18} className="text-[var(--text)]" />
                 <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-widest">API Key Private</span>
               </div>
               <Zap size={16} className="text-yellow-500" />
            </div>
            <p className="text-[12px] text-[var(--mu)] leading-relaxed -mt-1">
              Gunakan API Key Gemini (atau lainnya) milikmu sendiri untuk *bypass* batas kuota.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[var(--bg)] border border-[var(--bd)] rounded-[20px] px-5 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--text)] transition-all font-mono tracking-widest placeholder:text-[var(--mu)]"
            />
          </div>

        </div>
      </div>

      {/* FOOTER (Sticky Action Buttons) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)] border-t border-[var(--bd)] flex items-center gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleReset}
          className="flex items-center justify-center p-4 rounded-2xl bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)] hover:bg-[var(--bd)] transition-all active:scale-90"
        >
          <RotateCcw size={18} />
        </button>
        
        <button 
          onClick={handleSave}
          className={cn(
            "flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-[15px] transition-all active:scale-[0.98]",
            isSaved 
              ? "bg-green-500 text-white shadow-lg shadow-green-500/20" 
              : "bg-[var(--text)] text-[var(--bg)] shadow-lg hover:opacity-90"
          )}
        >
          {isSaved ? "Berhasil Disimpan!" : <><Save size={18} /> Simpan Konfigurasi</>}
        </button>
      </div>

    </div>
  );
};
