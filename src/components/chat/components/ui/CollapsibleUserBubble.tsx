// ─────────────────────────────────────────────
// COLLAPSIBLE USER BUBBLE
// src/components/chat/components/ui/CollapsibleUserBubble.tsx
//
// PERBAIKAN (bubble 3 baris "geser ke kanan / ga pas pil"):
//   • Akar masalah lama: <span> inline selalu punya scrollHeight 0, jadi jumlah baris
//     dihitung 0 → SEMUA bubble dianggap "pil" (radius 999), termasuk yang 3 baris.
//     Radius 999 di kotak tinggi memakan sudut & bikin teks kelihatan mepet / geser.
//   • Sekarang span dibuat display:block, jumlah baris dihitung dari offsetHeight.
//   • Pil (radius penuh) HANYA untuk teks 1 baris. Selain itu radius kotak.
//   • Teks multi-baris: lebar bubble dipas ke baris terpanjang (diukur lewat Range),
//     + text-wrap: balance supaya tidak ada sisa ruang kosong di kanan / kata yatim.
// ─────────────────────────────────────────────
import React, { memo, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COLLAPSE_THRESHOLD } from '../../constants';
import { parseReplyQuote } from '../../utils';

interface CollapsibleUserBubbleProps {
  content: string;
  onClick: (e: React.MouseEvent) => void;
  /** true = teks 1 baris (bentuk pil), false = kotak membulat */
  onShapeChange?: (isPill: boolean) => void;
}

export const CollapsibleUserBubble = memo(({ content, onClick, onShapeChange }: CollapsibleUserBubbleProps) => {
  const [expanded, setExpanded] = useState(false);
  const { replyText, actualContent } = parseReplyQuote(content);
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;
  const textRef = useRef<HTMLSpanElement>(null);

  // Hanya pesan pendek tanpa kutipan balasan yang diukur / dipas lebarnya
  const isCompact = !replyText && !isLong && !expanded;

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    if (!isCompact) {
      el.style.width = '';
      onShapeChange?.(false);
      return;
    }

    const measure = () => {
      // 1) ukur di lebar alami (dibatasi max-width bubble oleh parent)
      el.style.width = '';
      const lh = parseFloat(window.getComputedStyle(el).lineHeight) || 25.5;
      const lines = Math.max(1, Math.round(el.offsetHeight / lh));

      if (lines <= 1) {
        onShapeChange?.(true);
        return;
      }

      // 2) multi-baris: pas-kan lebar ke baris terpanjang yang benar-benar dirender
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        let max = 0;
        Array.from(range.getClientRects()).forEach(r => { if (r.width > max) max = r.width; });
        if (max > 0) el.style.width = `${Math.ceil(max) + 2}px`;
      } catch { /* abaikan: lebar alami tetap dipakai */ }
      onShapeChange?.(false);
    };

    measure();
    window.addEventListener('resize', measure);
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) fonts.ready.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [isCompact, actualContent, onShapeChange]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {replyText && (
        <div style={{
          margin: '8px 10px 4px',
          background: 'color-mix(in srgb, var(--text, #141414) 8%, transparent)',
          borderLeft: '2.5px solid color-mix(in srgb, var(--text, #141414) 30%, transparent)',
          padding: '8px 10px',
          borderRadius: '0 10px 10px 10px',
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu,#909090)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI</span>
          <span style={{ fontSize: 12.5, color: 'var(--text,#141414)', opacity: 0.6, lineHeight: 1.5 }}>{replyText}</span>
        </div>
      )}

      <div onClick={onClick} style={{ padding: replyText ? '6px 14px 12px' : '12px 15px', cursor: 'pointer' }}>
        <span
          ref={textRef}
          style={{
            display: 'block',
            fontSize: 15,
            lineHeight: 1.7,
            wordBreak: 'break-word',
            color: 'var(--text,#141414)',
            textWrap: isCompact ? 'balance' : 'pretty',
          } as React.CSSProperties}
        >
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '…' : '')}
        </span>
      </div>

      {isLong && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '0 14px 10px', fontSize: 11.5, fontWeight: 600, opacity: 0.4,
            cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text,#141414)',
          }}
        >
          {expanded
            ? <><ChevronUp size={13} strokeWidth={2.5} /> Ciutkan</>
            : <><ChevronDown size={13} strokeWidth={2.5} /> Selengkapnya</>
          }
        </button>
      )}
    </div>
  );
});
