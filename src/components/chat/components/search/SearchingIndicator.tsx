// ─────────────────────────────────────────────
// SEARCHING INDICATOR — src/components/chat/components/search/SearchingIndicator.tsx
// Loading KHUSUS pencarian web (berita, cari sesuatu, jelaskan sesuatu):
//   • 3 titik mengorbit abstrak (beda ukuran, beda jarak, beda kecepatan) — bukan spinner
//   • satu baris teks singkat yang berganti-ganti, dibuat dari data ASLI:
//       "memahami: <inti pertanyaan user>" → "mencari <kata kunci Gemini>" →
//       "membaca <domain sumber>" → "menyusun jawaban"
//     jadi tiap pertanyaan menghasilkan teks berbeda (bukan template mati).
//
// Loading chat biasa (helix 2 titik), dokumen, gambar, dll TIDAK diganti.
// Warna 100% dari variabel tema (--text, --mu). Hilang sendiri begitu teks jawaban masuk (diatur ChatPage).
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { SourceLike, uniqueDomains } from './sourceUtils';

export type SearchStage = 'understand' | 'search' | 'read' | 'write';

// Jeda ganti teks
const LINE_MS = 1500;

interface SearchingIndicatorProps {
  /** Pertanyaan user — dipakai buat baris "memahami: …" */
  userPrompt?: string;
  sources?: SourceLike[];
  stage?: SearchStage;
  queries?: string[];
  startedAt?: number | null; // dipertahankan biar props lama tetap cocok (tidak dipakai)
}

const FILL = /^(tolong|bisa|dong|cariin|carikan|cari|carilah|info|infokan|jelaskan|jelasin|apa|apakah|siapa|bagaimana|gimana|kenapa|mengapa|kapan|cara|yang|itu|ini|ada)\s+/i;

function coreOf(prompt: string): string {
  let c = (prompt || '').trim().replace(/[?!.]+$/, '');
  let p: string;
  while ((p = c.replace(FILL, '')) !== c && p) c = p;
  c = (c || (prompt || '').trim()).replace(/\s+/g, ' ');
  return c.length > 48 ? c.slice(0, 47).trimEnd() + '…' : c;
}

export const SearchingIndicator = memo(({ userPrompt = '', sources = [], stage = 'search', queries = [] }: SearchingIndicatorProps) => {
  const domains = uniqueDomains(sources);

  // Daftar kalimat — bertambah seiring data asli masuk
  const lines = useMemo(() => {
    const out: string[] = [];
    const core = coreOf(userPrompt);
    out.push(core ? `memahami: ${core}` : 'memahami pertanyaanmu');
    queries.slice(0, 4).forEach(q => {
      const t = q.trim();
      if (t) out.push(/^mencari\s/i.test(t) ? t : `mencari ${t}`);
    });
    if (domains.length > 0) {
      domains.slice(0, 3).forEach(d => out.push(`membaca ${d}`));
    }
    if (stage === 'write') out.push('menyusun jawaban');
    return out;
  }, [userPrompt, queries.join('|'), domains.slice(0, 3).join('|'), stage]);

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, linesRef.current.length - 1)), LINE_MS);
    return () => clearInterval(t);
  }, []);

  // Teks lama keluar halus saat teks baru masuk
  const current = lines[Math.min(idx, lines.length - 1)];
  const [prev, setPrev] = useState<string | null>(null);
  const lastShown = useRef(current);
  useEffect(() => {
    if (current === lastShown.current) return;
    setPrev(lastShown.current);
    lastShown.current = current;
    const t = setTimeout(() => setPrev(null), 300);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <div className="cy-ob" role="status" aria-live="polite" aria-label={current}>
      <style>{`
        @keyframes cy-ob-spin { to { transform: rotate(360deg); } }
        @keyframes cy-ob-radius { 0%,100% { transform: translateX(5px); } 50% { transform: translateX(18px); } }
        @keyframes cy-ob-size { 0%,100% { scale: .8; } 50% { scale: 1.2; } }
        @keyframes cy-ob-in { from { opacity: 0; transform: translateY(8px); filter: blur(3px); } to { opacity: 1; transform: none; filter: none; } }
        @keyframes cy-ob-out { to { opacity: 0; transform: translateY(-8px); filter: blur(3px); } }
        .cy-ob { display: flex; align-items: center; gap: 14px; padding: 12px 4px 12px 2px; user-select: none; pointer-events: none; animation: cy-ob-in .35s ease both; }
        .cy-ob-orb { position: relative; width: 44px; height: 44px; flex-shrink: 0; }
        .cy-ob-arm { position: absolute; inset: 0; animation: cy-ob-spin var(--d) linear infinite; animation-delay: var(--dl); }
        .cy-ob-dot { position: absolute; left: 50%; top: 50%; border-radius: 50%; background: var(--text);
          width: var(--s); height: var(--s); margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
          animation: cy-ob-radius var(--r) ease-in-out infinite, cy-ob-size var(--z) ease-in-out infinite; animation-delay: var(--dl); }
        .cy-ob-arm:nth-child(1) { --d: 1.6s; --r: 1.8s; --z: 1.5s; --s: 11px; --dl: 0s; }
        .cy-ob-arm:nth-child(2) { --d: 2.1s; --r: 2.2s; --z: 1.9s; --s: 8px; --dl: -.7s; }
        .cy-ob-arm:nth-child(3) { --d: 2.7s; --r: 1.6s; --z: 2.2s; --s: 6px; --dl: -1.5s; }
        .cy-ob-arm:nth-child(2) .cy-ob-dot { opacity: .65; }
        .cy-ob-arm:nth-child(3) .cy-ob-dot { opacity: .35; }
        .cy-ob-txt { position: relative; height: 22px; flex: 1; min-width: 0; overflow: hidden; }
        .cy-ob-line { position: absolute; left: 0; top: 0; right: 0; font-size: 14px; font-weight: 500; line-height: 22px; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: cy-ob-in .45s ease both; }
        .cy-ob-line.out { animation: cy-ob-out .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .cy-ob-arm { animation-duration: 8s; } .cy-ob-dot { animation: none; } }
      `}</style>

      <div className="cy-ob-orb" aria-hidden="true">
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
      </div>

      <div className="cy-ob-txt">
        {prev !== null && <div key={'p' + prev} className="cy-ob-line out">{prev}</div>}
        <div key={current} className="cy-ob-line">{current}</div>
      </div>
    </div>
  );
});
SearchingIndicator.displayName = 'SearchingIndicator';
