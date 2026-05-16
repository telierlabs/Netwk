import React from 'react';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

export const SecurityPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => (
  <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
    <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Keamanan Akun</h1>
    </header>
    <div className="p-6 pt-6 flex flex-col gap-3">
      <button onClick={() => showToast('Cek email untuk reset password')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)]/30 rounded-[20px] text-left hover:opacity-80 transition-opacity active:scale-[0.98]">
        <KeyRound size={22} className="text-[var(--text)]" />
        <div>
          <div className="font-bold text-[15px] text-[var(--text)]">Ubah Password</div>
          <div className="text-xs text-[var(--mu)] mt-1 font-medium">Reset kata sandi akun</div>
        </div>
      </button>
      <button onClick={() => showToast('2FA sudah aktif')} className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)]/30 rounded-[20px] text-left hover:opacity-80 transition-opacity active:scale-[0.98]">
        <ShieldCheck size={22} className="text-green-500" />
        <div>
          <div className="font-bold text-[15px] text-[var(--text)]">Autentikasi 2 Faktor</div>
          <div className="text-xs text-[var(--mu)] mt-1 font-medium">Keamanan ekstra diaktifkan</div>
        </div>
      </button>
    </div>
  </div>
);
