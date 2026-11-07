// ─────────────────────────────────────────────
// SEARCHING INDICATOR — src/components/chat/components/search/SearchingIndicator.tsx
// Loading KHUSUS pencarian web (berita, cari sesuatu, jelaskan sesuatu):
//   • 3 titik kecil bergerak cepat & abstrak (gerak acak, bukan muter/spinner)
//   • satu baris teks singkat yang berganti-ganti, dibuat dari data ASLI:
//       "memahami: <inti pertanyaan user>" → "mencari <kata kunci Gemini>" →
//       "membaca <domain sumber>" → "menyusun jawaban"
//     (baris pencarian dapat ikon kaca pembesar) — jadi tiap pertanyaan menghasilkan teks berbeda (bukan template mati).
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

  const isSearchLine = /^(mencari|membaca)\s/i.test(current);

  return (
    <div className="cy-ob" role="status" aria-live="polite" aria-label={current}>
      <style>{`
        @keyframes cy-ob-x1 { from { transform: translateX(-7px); } to { transform: translateX(7px); } }
        @keyframes cy-ob-y1 { from { transform: translateY(5px); } to { transform: translateY(-6px); } }
        @keyframes cy-ob-sc { from { scale: .6; } to { scale: 1.15; } }
        @keyframes cy-ob-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes cy-ob-out { to { opacity: 0; transform: translateY(-6px); } }
        @keyframes cy-ob-ico { from { opacity: 0; scale: .5; } to { opacity: .7; scale: 1; } }
        .cy-ob { display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; padding: 10px 2px; user-select: none; pointer-events: none; animation: cy-ob-in .3s ease both; }
        .cy-ob-orb { position: relative; width: 22px; height: 22px; flex-shrink: 0; }
        .cy-ob-arm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; animation: cy-ob-y1 var(--ty) ease-in-out infinite alternate; animation-delay: var(--dl); }
        .cy-ob-dot { position: absolute; border-radius: 50%; background: var(--text); width: var(--s); height: var(--s); left: calc(var(--s) / -2); top: calc(var(--s) / -2);
          animation: cy-ob-x1 var(--tx) ease-in-out infinite alternate, cy-ob-sc var(--tz) ease-in-out infinite alternate; animation-delay: var(--dl); }
        .cy-ob-arm:nth-child(1) { --ty: .62s; --tx: .47s; --tz: .55s; --s: 5px; --dl: 0s; }
        .cy-ob-arm:nth-child(2) { --ty: .43s; --tx: .71s; --tz: .4s; --s: 4px; --dl: -.2s; }
        .cy-ob-arm:nth-child(3) { --ty: .8s; --tx: .39s; --tz: .66s; --s: 3.5px; --dl: -.4s; }
        .cy-ob-arm:nth-child(2) .cy-ob-dot { opacity: .65; }
        .cy-ob-arm:nth-child(3) .cy-ob-dot { opacity: .4; }
        .cy-ob-txt { position: relative; display: block; flex: 1 1 auto; min-width: 0; height: 22px; overflow: hidden; }
        .cy-ob-line { position: absolute; left: 0; top: 0; right: 0; display: flex; align-items: center; gap: 7px; font-size: 14px; line-height: 22px; color: var(--text);
          white-space: nowrap; animation: cy-ob-in .4s ease both; }
        .cy-ob-line > span { overflow: hidden; text-overflow: ellipsis; opacity: .62; }
        .cy-ob-line.out { animation: cy-ob-out .25s ease both; }
        .cy-ob-ico { flex-shrink: 0; opacity: .7; animation: cy-ob-ico .3s ease both; }
        @media (prefers-reduced-motion: reduce) { .cy-ob-arm, .cy-ob-dot { animation-duration: 2s; } }
      `}</style>

      <div className="cy-ob-orb" aria-hidden="true">
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
        <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
      </div>

      <div className="cy-ob-txt">
        {prev !== null && <div key={'p' + prev} className="cy-ob-line out"><span>{prev}</span></div>}
        <div key={current} className="cy-ob-line">
          {isSearchLine && (
            <svg className="cy-ob-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
          )}
          <span>{current}</span>
        </div>
      </div>
    </div>
  );
});
SearchingIndicator.displayName = 'SearchingIndicator';
