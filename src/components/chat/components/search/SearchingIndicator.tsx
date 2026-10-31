// ─────────────────────────────────────────────
// SEARCHING INDICATOR — src/components/chat/components/search/SearchingIndicator.tsx
// Loading KHUSUS pencarian web:
//   • animasi gerhana: cakram hitam + cincin + 3 titik mengorbit
//   • chip favicon + domain sumber, muncul satu-satu begitu sumbernya masuk
//
// Loading chat biasa (helix), gambar, dokumen, dll TIDAK diganti — ini cuma
// dipakai saat isSearching = true.
//
// Warna: semua dari variabel tema (--text, --mu, --sf, --bd). Satu-satunya
// warna tetap adalah #000 untuk cakram gerhana (memang harus hitam).
// ─────────────────────────────────────────────
import React, { memo, useEffect, useState } from 'react';
import { SourceAvatar } from './SourceAvatar';
import { SourceLike, uniqueDomains } from './sourceUtils';

// Tampilkan teks "Mencari di web…" + jumlah sumber? Set false kalau mau animasi + chip saja.
const SHOW_LABEL = true;
// Maksimal chip yang ditampilkan (sisanya jadi chip "+N")
const MAX_CHIPS = 6;
// Jeda antar chip muncul
const CHIP_DELAY_MS = 280;

interface SearchingIndicatorProps {
  sources?: SourceLike[];
}

export const SearchingIndicator = memo(({ sources = [] }: SearchingIndicatorProps) => {
  const domains = uniqueDomains(sources);
  const total = domains.length;
  const target = Math.min(total, MAX_CHIPS);
  const [visible, setVisible] = useState(0);

  // Chip dibuka satu-satu (stagger), walau sumbernya datang sekaligus.
  useEffect(() => {
    if (visible >= target) return;
    const t = setTimeout(() => setVisible(v => v + 1), CHIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, target]);

  const shown = domains.slice(0, visible);
  const extra = total - MAX_CHIPS;

  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px 3px 3px',
    background: 'var(--sf)',
    border: '1px solid var(--bd)',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text)',
    maxWidth: '100%',
    animation: 'cy-chip-in 0.3s ease both',
  };

  return (
    <div
      className="flex flex-col gap-3 py-3 pl-1 select-none pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Mencari di web"
    >
      <style>{`
        @keyframes cy-ecl-spin { to { transform: rotate(360deg); } }
        @keyframes cy-chip-in {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cy-ecl { position: relative; width: 34px; height: 34px; flex-shrink: 0; }
        .cy-ecl-ring { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid var(--text); }
        .cy-ecl-moon { position: absolute; inset: 10px; border-radius: 50%; background: #000; }
        .cy-ecl-orb { position: absolute; inset: 0; animation: cy-ecl-spin 1.5s linear infinite; }
        .cy-ecl-orb i { position: absolute; top: 0; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; border-radius: 50%; background: var(--text); }
        .cy-ecl-orb.o2 { animation-delay: -0.5s; }
        .cy-ecl-orb.o2 i { opacity: 0.55; }
        .cy-ecl-orb.o3 { animation-delay: -1s; }
        .cy-ecl-orb.o3 i { opacity: 0.25; }
        @media (prefers-reduced-motion: reduce) { .cy-ecl-orb { animation-duration: 4s; } }
      `}</style>

      {/* Baris 1: gerhana (+ label opsional) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="cy-ecl" aria-hidden="true">
          <span className="cy-ecl-ring" />
          <span className="cy-ecl-moon" />
          <span className="cy-ecl-orb"><i /></span>
          <span className="cy-ecl-orb o2"><i /></span>
          <span className="cy-ecl-orb o3"><i /></span>
        </div>

        {SHOW_LABEL && (
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Mencari di web…</p>
            {visible > 0 && (
              <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--mu)' }}>{total} sumber ditemukan</p>
            )}
          </div>
        )}
      </div>

      {/* Baris 2: chip favicon + domain, muncul satu-satu */}
      {shown.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {shown.map(domain => (
            <span key={domain} style={chipBase}>
              <SourceAvatar domain={domain} size={18} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{domain}</span>
            </span>
          ))}
          {visible >= target && extra > 0 && (
            <span style={{ ...chipBase, padding: '3px 10px', color: 'var(--mu)' }}>+{extra}</span>
          )}
        </div>
      )}
    </div>
  );
});
