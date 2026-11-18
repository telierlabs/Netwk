// ─────────────────────────────────────────────
// SEARCHING INDICATOR — src/components/chat/components/search/SearchingIndicator.tsx
// Loading gaya Grok untuk pencarian / penjelasan, kode, gambar, dan dokumen:
//   • SATU baris penuh: ikon utama (3 titik abstrak / >_ / pindai gambar / pindai dokumen)
//     + kalimat status yang DITULIS MODEL (lebih besar, memanjang ke kanan)
//     + tumpukan favicon sumber + panah ">"
//   • baris bisa diketuk → popup "Alur" (langkah, kata kunci, temuan, sumber)
//   • kalimat berganti mengikuti temuan asli (topik → catatan temuan model kecil)
// Loading chat biasa (helix 2 titik) TIDAK diubah. Warna dari variabel tema.
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { SourceLike } from './sourceUtils';
import { LOADING_CSS, LeadIcon } from './LoadingIcons';
import { Chevron, FaviconStack, FlowSheet, flowDomains } from './FlowSheet';
import { VARIANT_FALLBACK } from '../../../../services/narratorService';
import type { LoadingVariant } from '../../../../services/narratorService';

export type SearchStage = 'understand' | 'search' | 'read' | 'write';

const LINE_MS = 1800;

interface SearchingIndicatorProps {
  userPrompt?: string;
  sources?: SourceLike[];
  stage?: SearchStage;
  queries?: string[];
  /** Kalimat pembuka dari model (mis. "menelusuri kritik terhadap program mbg"). */
  topic?: string;
  /** Kalimat temuan dari model kecil (muncul bergantian setelah topik). */
  notes?: string[];
  /** null = pencarian (3 titik); code / image / doc = ikon khusus */
  variant?: LoadingVariant | null;
  startedAt?: number | null; // dipertahankan biar props lama tetap cocok (tidak dipakai)
}

export const SearchingIndicator = memo(({ sources = [], stage = 'search', queries = [], topic = '', notes = [], variant = null }: SearchingIndicatorProps) => {
  const [open, setOpen] = useState(false);

  // Judul asli sumber yang ketemu (tanpa nama situs di ujung, tanpa judul yang cuma nama domain)
  const titles = useMemo(() => {
    const out: string[] = [];
    (sources || []).forEach(s => {
      let t = String((s as any)?.title || '').replace(/\s+[-|–—·]\s+[^-|–—·]{2,40}$/, '').trim();
      if (t.length < 12 || /^(ref|[a-z0-9-]+(\.[a-z0-9-]+)+)$/i.test(t)) return;
      if (!out.includes(t)) out.push(t);
    });
    return out.slice(0, 8);
  }, [sources.map(s => (s as any)?.title).join('|')]);

  // Sumber yang judulnya cuma nama situs: tetap diberi baris ("Membaca kompas.com") supaya judul selalu muncul
  const domainLines = useMemo(() => {
    const out: string[] = [];
    flowDomains(sources, 6).forEach(d => out.push(`Membaca ${d.domain}`));
    return out;
  }, [(sources || []).map(s => (s as any)?.url).join('|')]);

  // Urutan: (1) AI memahami permintaan → (2) judul berita / artikel yang ditemukan → (3) catatan temuan
  const lines = useMemo(() => {
    const out: string[] = [];
    const add = (x: string) => { const t = (x || '').trim(); if (t && !out.includes(t)) out.push(t); };
    const lead = (topic || '').trim();
    if (lead) add(lead);
    else if (variant) add(VARIANT_FALLBACK[variant]);
    else add('menelusuri informasinya');
    titles.forEach(add);
    if (titles.length === 0) domainLines.forEach(add);
    notes.forEach(add);
    return out;
  }, [topic, notes.join('|'), variant, titles.join('|'), domainLines.join('|')]);

  const linesRef = useRef(lines);
  linesRef.current = lines;

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, linesRef.current.length - 1)), LINE_MS);
    return () => clearInterval(t);
  }, []);

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

  const shim = variant ? ' cy-fl-shim' : '';

  return (
    <>
      <style>{`${LOADING_CSS}
        .cy-fl { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; padding: 10px 2px; margin: 0; border: 0; background: none; color: var(--text); font-family: inherit; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; animation: cy-fl-in .3s ease both; }
        .cy-fl:active { opacity: .7; }
        .cy-fl-txt { position: relative; display: block; flex: 1 1 auto; min-width: 0; height: 26px; overflow: hidden; }
        .cy-fl-line { position: absolute; left: 0; top: 0; right: 0; font-size: 16px; line-height: 26px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: cy-fl-in .4s ease both; }
        .cy-fl-line:not(.cy-fl-shim) { color: var(--text); opacity: .7; }
        .cy-fl-line.out { animation: cy-fl-out .25s ease both; }
        .cy-fl-chev { color: var(--mu); }
      `}</style>

      <button type="button" className="cy-fl" role="status" aria-live="polite" aria-label={`${current}. Ketuk untuk melihat alur`} onClick={() => setOpen(true)}>
        <LeadIcon variant={variant} />
        <span className="cy-fl-txt">
          {prev !== null && <span key={'p' + prev} className={'cy-fl-line out' + shim}>{prev}</span>}
          <span key={current} className={'cy-fl-line' + shim}>{current}</span>
        </span>
        <FaviconStack sources={sources} />
        <Chevron size={18} style={{ color: 'var(--mu)' }} />
      </button>

      <FlowSheet open={open} onClose={() => setOpen(false)} sources={sources} stage={stage}
        data={{ topic: topic || (variant ? VARIANT_FALLBACK[variant] : ''), queries, notes, titles, variant }} />
    </>
  );
});
SearchingIndicator.displayName = 'SearchingIndicator';
