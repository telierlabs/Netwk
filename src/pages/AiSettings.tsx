import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';

const TONES = ['Default', 'Profesional', 'Ramah', 'Jujur', 'Nyentrik', 'Efisien', 'Sinis'];

// Dipindah ke lib/personalityPrompt.ts — di-export ulang di sini supaya import lama tetap berfungsi.
export { buildPersonalityPrompt } from '../lib/personalityPrompt';
export type { PersonalitySettings } from '../lib/personalityPrompt';
import type { PersonalitySettings } from '../lib/personalityPrompt';

// ── SENGAJA DI LUAR komponen utama (dulu di dalam → ke-mount ulang tiap render) ──
// Jalur segmen = --ib (lebih gelap dari kartu --sf), segmen aktif = warna aksen.
const SegmentControl = ({ label, left, center, right, value, onChange }: {
  label: string; left: string; center: string; right: string; value: number; onChange: (v: number) => void;
}) => (
  <div className="flex flex-col gap-2.5">
    <span className="text-[15px] font-medium text-[var(--text)] ml-1">{label}</span>
    <div className="flex bg-[var(--ib)] p-1 rounded-full">
      {[{ id: 1, text: left }, { id: 2, text: center }, { id: 3, text: right }].map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 py-2.5 text-[13px] rounded-full transition-colors duration-200",
            value === item.id ? "bg-[var(--ac)] text-[var(--at)] font-semibold" : "text-[var(--mu)] font-medium"
          )}
        >
          {item.text}
        </button>
      ))}
    </div>
  </div>
);

export const AiSettings = ({ onBack, showToast }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const { profile, updateProfile } = useProfile();

  const [tone, setTone]             = useState('Default');
  const [warmth, setWarmth]         = useState(2);
  const [formality, setFormality]   = useState(2);
  const [enthusiasm, setEnthusiasm] = useState(2);
  const [length, setLength]         = useState(2);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSaved, setIsSaved]       = useState(false);
  const [isSaving, setIsSaving]     = useState(false);

  // FIX: dulu form di-reset dari Firestore tiap kali ada snapshot baru (mis. hitungan pemakaian naik),
  // jadi ketikan yang belum disimpan bisa hilang. Sekarang cuma disinkronkan selama user belum mengubah apa-apa.
  const dirty = useRef(false);
  const touch = <T,>(setter: (v: T) => void) => (v: T) => { dirty.current = true; setter(v); };

  useEffect(() => {
    if (dirty.current || !profile.personality) return;
    setTone(profile.personality.tone);
    setWarmth(profile.personality.warmth);
    setFormality(profile.personality.formality);
    setEnthusiasm(profile.personality.enthusiasm);
    setLength(profile.personality.length);
    setCustomPrompt(profile.personality.customPrompt);
  }, [profile.personality]);

  const handleReset = () => {
    dirty.current = true;
    setTone('Default'); setWarmth(2); setFormality(2); setEnthusiasm(2); setLength(2); setCustomPrompt('');
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const settings: PersonalitySettings = { tone, warmth, formality, enthusiasm, length, customPrompt };

    // 1. Simpan ke FIRESTORE
    const ok = await updateProfile({ personality: settings });
    setIsSaving(false);
    if (!ok) { showToast?.('Gagal menyimpan, coba lagi'); return; }
    dirty.current = false;

    // 2. Jembatan prompt ke geminiService ('cylen_temp_prompt') sekarang diurus otomatis oleh useProfile → lib/promptBridge.ts
    //    (digabung dengan instruksi Mode Anak kalau aktif).

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1800);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-in fade-in duration-200">
      {/* --- HEADER: kembali + judul + tombol Simpan (gaya "Customize Grok") --- */}
      <header
        className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button onClick={onBack} aria-label="Kembali" className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="flex-1 min-w-0 text-[22px] font-semibold tracking-tight text-[var(--text)] truncate">Kustomisasi Cylen</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "h-11 px-6 rounded-full text-[16px] font-semibold transition-[transform,background-color] active:scale-95",
            // Tersimpan = warna permukaan, normal = warna aksen (tidak hijau, ikut tema)
            isSaved ? "bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)]" : "bg-[var(--ac)] text-[var(--at)]",
            isSaving && "opacity-60"
          )}
        >
          {isSaved ? 'Tersimpan ✓' : 'Simpan'}
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="px-4 pt-2 pb-12 max-w-2xl mx-auto">

          {/* --- INSTRUKSI --- */}
          <div className="px-1 mb-3 text-[17px] font-semibold text-[var(--mu)]">Instruksi</div>
          <textarea
            value={customPrompt}
            onChange={(e) => touch(setCustomPrompt)(e.target.value)}
            placeholder="Bagaimana Cylen harus bersikap? (contoh: &quot;Selalu panggil aku Boss&quot;)"
            className="w-full min-h-[200px] resize-none rounded-[28px] bg-[var(--sf)] border border-[var(--bd)] px-5 py-4 text-[16px] leading-relaxed text-[var(--text)] outline-none focus:border-[var(--mu)] transition-colors placeholder:text-[var(--mu)]"
          />

          {/* --- NADA DASAR (chip) --- */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            {TONES.map((tn) => (
              <button
                key={tn}
                onClick={() => touch(setTone)(tn)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-[16px] border transition-colors",
                  tone === tn
                    ? "bg-[var(--ac)] text-[var(--at)] border-transparent font-semibold"
                    : "bg-[var(--sf)] text-[var(--text)] border-[var(--bd)] active:bg-[var(--ib)]"
                )}
              >
                {tn}
              </button>
            ))}
          </div>

          <p className="mt-6 px-1 text-[16px] leading-relaxed text-[var(--mu)]">
            Pengaturan disimpan ke akunmu dan dipakai Cylen di percakapan berikutnya.
          </p>

          {/* --- KARAKTERISTIK --- */}
          <div className="px-1 mt-8 mb-3 text-[17px] font-semibold text-[var(--mu)]">Karakteristik</div>
          <div className="rounded-[28px] bg-[var(--sf)] p-5 flex flex-col gap-6">
            <SegmentControl label="Tingkat Kehangatan" left="Dingin" center="Normal" right="Empati" value={warmth} onChange={touch(setWarmth)} />
            <SegmentControl label="Gaya Bahasa" left="Santai" center="Normal" right="Baku" value={formality} onChange={touch(setFormality)} />
            <SegmentControl label="Antusiasme" left="Datar" center="Normal" right="Semangat" value={enthusiasm} onChange={touch(setEnthusiasm)} />
            <SegmentControl label="Panjang Jawaban" left="Singkat" center="Normal" right="Detail" value={length} onChange={touch(setLength)} />
          </div>

          <button
            onClick={handleReset}
            className="mt-6 mx-auto flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium text-[var(--mu)] active:bg-[var(--ib)] transition-colors"
          >
            <RotateCcw size={16} /> Atur ulang
          </button>
        </div>
      </div>
    </div>
  );
};
