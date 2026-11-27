import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { usePageText } from '../lib/i18n';

const TEXT = {
  id: { back: 'Kembali', title: 'Kustomisasi Cylen', save: 'Simpan', saved: 'Tersimpan ✓', saveFail: 'Gagal menyimpan, coba lagi', instr: 'Instruksi', ph: 'Bagaimana Cylen harus bersikap? (contoh: “Selalu panggil aku Boss”)', note: 'Pengaturan disimpan ke akunmu dan dipakai Cylen di percakapan berikutnya.', chars: 'Karakteristik', warmth: 'Tingkat Kehangatan', cold: 'Dingin', normal: 'Normal', empathy: 'Empati', style: 'Gaya Bahasa', casual: 'Santai', formal: 'Baku', enth: 'Antusiasme', flat: 'Datar', eager: 'Semangat', len: 'Panjang Jawaban', short: 'Singkat', detail: 'Detail', reset: 'Atur ulang', tones: { Default: 'Default', Profesional: 'Profesional', Ramah: 'Ramah', Jujur: 'Jujur', Nyentrik: 'Nyentrik', Efisien: 'Efisien', Sinis: 'Sinis' } },
  en: { back: 'Back', title: 'Customize Cylen', save: 'Save', saved: 'Saved ✓', saveFail: 'Failed to save, try again', instr: 'Instructions', ph: 'How should Cylen behave? (example: “Always call me Boss”)', note: 'Settings are saved to your account and used by Cylen in your next conversations.', chars: 'Characteristics', warmth: 'Warmth', cold: 'Cold', normal: 'Normal', empathy: 'Empathetic', style: 'Language Style', casual: 'Casual', formal: 'Formal', enth: 'Enthusiasm', flat: 'Flat', eager: 'Eager', len: 'Answer Length', short: 'Short', detail: 'Detailed', reset: 'Reset', tones: { Default: 'Default', Profesional: 'Professional', Ramah: 'Friendly', Jujur: 'Candid', Nyentrik: 'Quirky', Efisien: 'Efficient', Sinis: 'Cynical' } },
};

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

// embedded = dipasang di dalam popup (mis. popup pengaturan Cylen Voice): tanpa header penuh, tanpa lapisan halaman sendiri.
export const AiSettings = ({ onBack, showToast, embedded = false }: { onBack: () => void; showToast?: (msg: string) => void; embedded?: boolean }) => {
  const { profile, updateProfile } = useProfile();
  const tx = usePageText('aiSettings', TEXT);

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
    if (!ok) { showToast?.(tx.saveFail); return; }
    dirty.current = false;

    // 2. Jembatan prompt ke geminiService ('cylen_temp_prompt') sekarang diurus otomatis oleh useProfile → lib/promptBridge.ts
    //    (digabung dengan instruksi Mode Anak kalau aktif).

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 1800);
  };

  const saveButton = (
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
      {isSaved ? tx.saved : tx.save}
    </button>
  );

  return (
    <div className={embedded ? 'flex flex-col' : 'absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-in fade-in duration-200'}>
      {embedded ? (
        /* --- MODE POPUP: cuma tombol Simpan (judul sudah ada di popup) --- */
        <div className="flex items-center justify-end pb-3 flex-shrink-0">
          {saveButton}
        </div>
      ) : (
        /* --- HEADER: kembali + judul + tombol Simpan (gaya "Customize Grok") --- */
        <header
          className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
        >
          <button onClick={onBack} aria-label={tx.back} className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="flex-1 min-w-0 text-[22px] font-semibold tracking-tight text-[var(--text)] truncate">{tx.title}</h1>
          {saveButton}
        </header>
      )}

      <div
        className={embedded ? '' : 'flex-1 min-h-0 overflow-y-auto'}
        style={embedded ? undefined : { scrollbarWidth: 'none', overscrollBehavior: 'contain' }}
      >
        <div className={cn('max-w-2xl mx-auto', embedded ? 'px-0 pt-0 pb-6' : 'px-4 pt-2 pb-12')}>

          {/* --- INSTRUKSI --- */}
          <div className="px-1 mb-3 text-[17px] font-semibold text-[var(--mu)]">{tx.instr}</div>
          <textarea
            value={customPrompt}
            onChange={(e) => touch(setCustomPrompt)(e.target.value)}
            placeholder={tx.ph}
            className={cn(
              "w-full resize-none rounded-[28px] bg-[var(--sf)] border border-[var(--bd)] px-5 py-4 text-[16px] leading-relaxed text-[var(--text)] outline-none focus:border-[var(--mu)] transition-colors placeholder:text-[var(--mu)]",
              embedded ? 'min-h-[140px]' : 'min-h-[200px]'
            )}
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
                {(tx.tones as Record<string, string>)[tn] || tn}
              </button>
            ))}
          </div>

          <p className="mt-6 px-1 text-[16px] leading-relaxed text-[var(--mu)]">
            {tx.note}
          </p>

          {/* --- KARAKTERISTIK --- */}
          <div className="px-1 mt-8 mb-3 text-[17px] font-semibold text-[var(--mu)]">{tx.chars}</div>
          <div className="rounded-[28px] bg-[var(--sf)] p-5 flex flex-col gap-6">
            <SegmentControl label={tx.warmth} left={tx.cold} center={tx.normal} right={tx.empathy} value={warmth} onChange={touch(setWarmth)} />
            <SegmentControl label={tx.style} left={tx.casual} center={tx.normal} right={tx.formal} value={formality} onChange={touch(setFormality)} />
            <SegmentControl label={tx.enth} left={tx.flat} center={tx.normal} right={tx.eager} value={enthusiasm} onChange={touch(setEnthusiasm)} />
            <SegmentControl label={tx.len} left={tx.short} center={tx.normal} right={tx.detail} value={length} onChange={touch(setLength)} />
          </div>

          <button
            onClick={handleReset}
            className="mt-6 mx-auto flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium text-[var(--mu)] active:bg-[var(--ib)] transition-colors"
          >
            <RotateCcw size={16} /> {tx.reset}
          </button>
        </div>
      </div>
    </div>
  );
};
