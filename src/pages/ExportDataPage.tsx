import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';

export const ExportDataPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Ekspor Data</h1>
    </header>
    <div className="p-6 pt-6 flex flex-col gap-4">
      <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">Unduh semua riwayat obrolan dan preferensi akun.</p>
      <button onClick={() => showToast('Menyiapkan file ZIP...')} className="w-full flex items-center justify-center gap-3 bg-[var(--text)] text-[var(--bg)] p-4 rounded-full font-bold shadow-lg active:scale-95 transition-all text-[15px]">
        <Download size={20} /> Unduh Data Saya (ZIP)
      </button>
      <p className="text-[12px] text-[var(--mu)] text-center mt-3 leading-relaxed px-4 font-medium">Proses ekspor memakan waktu beberapa menit. Link unduhan akan dikirim via Email.</p>
    </div>
  </div>
);
