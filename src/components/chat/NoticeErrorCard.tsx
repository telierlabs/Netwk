// ─────────────────────────────────────────────
// NOTICE ERROR CARD — src/components/chat/NoticeErrorCard.tsx
// Kartu gagal di chat grup: tampilannya sama dengan kartu gagal di chat pribadi.
// ─────────────────────────────────────────────
import React from 'react';
import { usePageText } from '../../lib/i18n';
import { NOTICE_TEXT, NOTICE_NS } from '../../lib/noticeText';

export const NoticeErrorCard: React.FC<{ name: string; type?: string; detail?: string; onRetry?: () => void }> = ({ name, type, detail, onRetry }) => {
  const tx = usePageText(NOTICE_NS, NOTICE_TEXT);
  const COPY: Record<string, { title: string; text: string }> = {
    offline: { title: tx.offlineTitle, text: tx.offlineText },
    timeout: { title: tx.offlineTitle, text: tx.timeoutText },
    server: { title: tx.serverTitle, text: tx.serverText },
    empty: { title: tx.emptyTitle, text: tx.emptyText },
    failed: { title: tx.failedTitle, text: tx.failedText },
    limit: { title: tx.limitTitle, text: tx.limitText },
  };
  const copy = COPY[type || 'failed'] || COPY.failed;
  return (
    <div className="w-full flex flex-col gap-1.5">
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text)' }}>{name}</span>
      <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* FIX ikon: path lama terpotong (sisi kanan segitiga tidak tertutup), jadi bentuknya miring.
              Ini path segitiga peringatan yang lengkap. */}
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <span className="font-bold text-[15px] text-[var(--text)]">{copy.title}</span>
        </div>
        <p className="text-sm text-[var(--mu)] leading-relaxed">{copy.text}</p>
        {detail ? <p className="text-[11px] text-[var(--mu)] opacity-70 font-mono break-words">{tx.code}: {detail}</p> : null}
        {onRetry && (
          <button onClick={onRetry} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">
            {tx.retry}
          </button>
        )}
      </div>
    </div>
  );
};
