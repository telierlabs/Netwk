// ─────────────────────────────────────────────
// NOTICE ERROR CARD — src/components/chat/NoticeErrorCard.tsx
// Kartu gagal di chat grup: tampilannya sama dengan kartu gagal di chat pribadi.
// ─────────────────────────────────────────────
import React from 'react';

const COPY: Record<string, { title: string; text: string }> = {
  offline: { title: 'Connection Issue', text: 'Koneksimu lagi putus. Sambungkan internet, lalu tekan Retry.' },
  timeout: { title: 'Connection Issue', text: 'Koneksi terlalu lama merespons. Tekan Retry untuk kirim ulang.' },
  server: { title: 'Server AI Sedang Sibuk', text: 'Server AI sedang padat, bukan masalah internet kamu. Tekan Retry untuk kirim ulang.' },
  empty: { title: 'Jawaban Kosong', text: 'AI tidak mengeluarkan jawaban kali ini. Tekan Retry untuk kirim ulang.' },
  failed: { title: 'Pesan Gagal Diproses', text: 'Permintaan tidak bisa diproses. Tekan Retry untuk kirim ulang.' },
  limit: { title: 'Limit Habis Sementara', text: 'AI lagi kebanyakan permintaan. Tunggu sekitar satu menit, lalu tekan Retry.' },
};

export const NoticeErrorCard: React.FC<{ name: string; type?: string; detail?: string; onRetry?: () => void }> = ({ name, type, detail, onRetry }) => {
  const copy = COPY[type || 'failed'] || COPY.failed;
  return (
    <div className="w-full flex flex-col gap-1.5">
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{name}</span>
      <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 00-3.42 0z" />
          </svg>
          <span className="font-bold text-[15px] text-[var(--text)]">{copy.title}</span>
        </div>
        <p className="text-sm text-[var(--mu)] leading-relaxed">{copy.text}</p>
        {detail ? <p className="text-[11px] text-[var(--mu)] opacity-70 font-mono break-words">Kode: {detail}</p> : null}
        {onRetry && (
          <button onClick={onRetry} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
