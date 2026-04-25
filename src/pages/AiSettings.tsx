import React from 'react';
import { Zap, ShieldCheck } from 'lucide-react';

export const AiSettings = ({ onBack }: { onBack: () => void }) => {
  return (
    <main className="flex-1 overflow-y-auto pb-12" style={{ minHeight: 0 }}>
      <div className="max-w-2xl mx-auto px-4 mt-4 flex flex-col gap-8">
        
        {/* Kolom 1: Instruksi Respon */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--ac)]" />
            <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">Instruksi Respon</span>
          </div>
          <p className="text-[12px] text-[var(--mu)] leading-relaxed">
            Tuliskan bagaimana Cylen harus bersikap. Kamu bisa mengatur gaya bicara, panjang jawaban, atau peran spesifik Cylen di sini. (UI Only)
          </p>
          <textarea
            placeholder="Contoh: Selalu jawab dengan singkat, gunakan bahasa gaul..."
            className="w-full bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--ac)] transition-all min-h-[150px] resize-none"
          />
        </div>

        {/* Kolom 2: API Key */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[var(--ac)]" />
            <span className="font-bold text-[14px] text-[var(--text)] uppercase tracking-tight">API Key Pribadi</span>
          </div>
          <p className="text-[12px] text-[var(--mu)] leading-relaxed">
            Gunakan kunci akses kamu sendiri untuk melewati batas kuota harian. (UI Only)
          </p>
          <input
            type="password"
            placeholder="AIzaSy..."
            className="w-full bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-4 text-[14px] text-[var(--text)] outline-none focus:border-[var(--ac)] transition-all"
          />
        </div>

      </div>
    </main>
  );
};
