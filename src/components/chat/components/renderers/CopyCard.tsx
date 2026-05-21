// ─────────────────────────────────────────────
// COPY CARD — src/components/chat/components/renderers/CopyCard.tsx
// Styled card with one-tap copy button
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyCard = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{
      margin: '12px 0', padding: '16px 18px',
      background: 'var(--sf,#f7f5f1)',
      border: '1.5px solid var(--bd,#e0ddd7)',
      borderRadius: 14, position: 'relative',
    }}>
      <button
        onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', border: '1px solid var(--bd,#e0ddd7)',
          borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          background: copied ? 'var(--text,#141414)' : 'var(--bg,#f2f0eb)',
          color: copied ? 'var(--bg,#f2f0eb)' : 'var(--text,#141414)',
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div style={{
        fontSize: 15, lineHeight: 1.72, color: 'var(--text,#141414)',
        paddingRight: 80, fontWeight: 500, whiteSpace: 'pre-wrap',
      }}>{content}</div>
    </div>
  );
});
