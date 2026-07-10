// ─────────────────────────────────────────────
// COLLAPSIBLE USER BUBBLE
// src/components/chat/components/ui/CollapsibleUserBubble.tsx
// PERUBAHAN:
//   • Tambah onShapeChange: lapor ke parent apakah teks
//     saat ini "pendek" (≤2 baris, layak pill) atau "panjang" (kotak)
//   • Pengukuran pakai ResizeObserver di span teks asli
//     (akurat terhadap lebar layar & font asli, bukan tebak karakter)
// ─────────────────────────────────────────────
import React, { memo, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COLLAPSE_THRESHOLD } from '../../constants';
import { parseReplyQuote } from '../../utils';

interface CollapsibleUserBubbleProps {
  content: string;
  onClick: (e: React.MouseEvent) => void;
  onShapeChange?: (isPill: boolean) => void;
}

const MAX_PILL_LINES = 2;

export const CollapsibleUserBubble = memo(({ content, onClick, onShapeChange }: CollapsibleUserBubbleProps) => {
  const [expanded, setExpanded] = useState(false);
  const { replyText, actualContent } = parseReplyQuote(content);
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;
  const textRef = useRef<HTMLSpanElement>(null);

  // Kandidat pill hanya kalau: gak ada reply quote, teks belum "long"
  // (belum butuh collapse button), dan gak lagi expanded.
  const isPillCandidate = !replyText && !isLong && !expanded;

  useLayoutEffect(() => {
    if (!isPillCandidate) {
      onShapeChange?.(false);
      return;
    }

    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      const style = window.getComputedStyle(el);
      let lineHeightPx = parseFloat(style.lineHeight);
      if (!lineHeightPx || Number.isNaN(lineHeightPx)) {
        lineHeightPx = parseFloat(style.fontSize || '15') * 1.7;
      }
      const lines = Math.round(el.scrollHeight / lineHeightPx);
      onShapeChange?.(lines <= MAX_PILL_LINES);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPillCandidate, actualContent]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {replyText && (
        <div style={{
          margin: '8px 10px 4px',
          background: 'rgba(0,0,0,0.05)',
          borderLeft: '2.5px solid rgba(0,0,0,0.2)',
          padding: '8px 10px',
          borderRadius: '0 10px 10px 10px',
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(0,0,0,0.35)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI</span>
          <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.5)', lineHeight: 1.5 }}>{replyText}</span>
        </div>
      )}

      <div onClick={onClick} style={{ padding: replyText ? '6px 14px 12px' : '12px 14px', cursor: 'pointer' }}>
        <span ref={textRef} style={{ fontSize: 15, lineHeight: 1.7, wordBreak: 'break-word', color: 'var(--text,#141414)' }}>
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
