import React, { useState } from 'react';
import { ArrowLeft, Zap, ShieldCheck, Sparkles, SlidersHorizontal, Save, RotateCcw, MessageSquareText } from 'lucide-react';
import { cn } from '../lib/utils';

const TONES = ['Default', 'Profesional', 'Ramah', 'Jujur', 'Nyentrik', 'Efisien', 'Sinis'];

export const AiSettings = ({ onBack }: { onBack: () => void }) => {
  // State untuk UI
  const [tone, setTone] = useState('Default');
  const [warmth, setWarmth] = useState(2);      // 1: Dingin, 2: Normal, 3: Empati
  const [formality, setFormality] = useState(2); // 1: Santai/Gaul, 2: Normal, 3: Baku
  const [enthusiasm, setEnthusiasm] = useState(2); // 1: Datar, 2: Normal, 3: Semangat
  const [length, setLength] = useState(2);       // 1: Singkat, 2: Normal, 3: Detail
  
  const [customPrompt, setCustomPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleReset = () => {
    setTone('Default');
    setWarmth(2);
    setFormality(2);
    setEnthusiasm(2);
    setLength(2);
    setCustomPrompt('');
    setApiKey('');
  };

  const handleSave = () => {
    setIsSaved(true);
    // Animasi tombol tersimpan sebentar
    setTimeout(() => setIsSaved(false), 2000);
    
    // Nanti kalau sistemnya udah siap, kode nyimpen ke localStorage taruh di sini
    // localStorage.setItem('cylen_settings', JSON.stringify({ tone, warmth, formality ... }))
  };

  // Komponen Switcher 3 level bergaya iOS
  const SegmentControl = ({ label, left, center, right, value, onChange }: any) => (
    <div className="flex flex-col gap-2.5">
      <span className="text-[12px] font-bold text-[var(--text)] tracking-wide">{label}</span>
      <div className="flex bg-[var(--sf)] p-1 rounded-[14px] border border-[var(--bd)]">
        {[ { id: 1, text: left }, { id: 2, text: center }, { id: 3, text: right } ].map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 py-2 text-[12px] rounded-[10px] transition-all duration-200",
              value === item.id 
                ? "bg-[var(--bg)] text-[var(--text)] font-bold shadow-sm border border-[var(--bd)]" 
                : "text-[var(--mu)] font-medium hover:text-[var(--text)] border border-transparent"
            )}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col absolute inset-0 z-50 animate-in slide-in-from-right-4 duration-300">
      
      {/* HEADER (Sticky) */}
      <div className="sticky top-0 z-10 flex items-center px-4 py-4 border-b border-[var(--bd)] bg-[var(--bg)]/90 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--text)] hover:bg-[var(--sf)] rounded-full transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h2 className="flex-1 text-center font-bold text-[16px] text-[var(--text)] pr-8">Personalisasi Cylen</h2>
      </div>

      {/* BODY / KONTEN UTAMA */}
      <div className="flex-1 overflow-y-auto pb-28" style={{ scrollbarWidth: 'none' }}>
        <div className="p-5 flex flex-col gap-8 max-w-2xl mx-auto">

          {/* SECTION 1: NADA DASAR */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--ac)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">Nada Dasar</span>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[13px] font-semibold transition-all border",
                    tone === t 
                      ? "bg-[var(--ac)] text-[var(--at)] border-[var(--ac)] shadow-md" 
                      : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)] hover:border-[var(--mu)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-[var(--bd)]" />

          {/* SECTION 2: KARAKTERISTIK AI */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal size={18} className="text-[var(--ac)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">Karakteristik</span>
            </div>
            
            <SegmentControl label="Tingkat Kehangatan" left="Kaku/Dingin" center="Normal" right="Hangat/Empati" value={warmth} onChange={setWarmth} />
            <SegmentControl label="Gaya Bahasa" left="Santai/Gaul" center="Normal" right="Baku/Formal" value={formality} onChange={setFormality} />
            <SegmentControl label="Antusiasme" left="Cuek/Datar" center="Normal" right="Semangat" value={enthusiasm} onChange={setEnthusiasm} />
            <SegmentControl label="Panjang Jawaban" left="Sangat Singkat" center="Normal" right="Detail/Panjang" value={length} onChange={setLength} />
          </div>

          <div className="w-full h-px bg-[var(--bd)]" />

          {/* SECTION 3: INSTRUKSI MANUAL */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareText size={18} className="text-[var(--ac)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">Instruksi Tambahan</span>
            </div>
            <p className="text-[12px] text-[var(--mu)] leading-relaxed">
              Tulis instruksi spesifik jika pilihan di atas belum cukup (misal: "Selalu panggil aku Boss").
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Instruksi spesifik..."
              className="w-full bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--ac)] transition-all min-h-[120px] resize-none"
            />
          </div>

          <div className="w-full h-px bg-[var(--bd)]" />

          {/* SECTION 4: API KEY */}
          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--ac)]" />
              <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">Kunci Akses (API)</span>
            </div>
            <p className="text-[12px] text-[var(--mu)] leading-relaxed">
              Gunakan API Key Gemini kamu sendiri untuk melewati batas kuota harian Telierlabs.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--ac)] transition-all font-mono tracking-widest"
            />
          </div>

        </div>
      </div>

      {/* FOOTER (Sticky Action Buttons) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)] border-t border-[var(--bd)] flex items-center gap-3">
        <button 
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)] font-bold text-[14px] hover:bg-[var(--bd)] transition-colors active:scale-95"
        >
          <RotateCcw size={16} />
        </button>
        
        <button 
          onClick={handleSave}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[14px] transition-all active:scale-95",
            isSaved 
              ? "bg-green-500 text-white" 
              : "bg-[var(--ac)] text-[var(--at)] hover:opacity-90"
          )}
        >
          {isSaved ? (
            "Berhasil Disimpan!"
          ) : (
            <>
              <Save size={18} /> Simpan Pengaturan
            </>
          )}
        </button>
      </div>

    </div>
  );
};
