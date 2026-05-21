// ─────────────────────────────────────────────
// SUGGESTIONS ROW — src/components/chat/components/ui/SuggestionsRow.tsx
// Follow-up suggestion chips below AI messages
// ─────────────────────────────────────────────
import React from 'react';

interface SuggestionsRowProps {
  suggestions: string[];
  onSuggest?: (text: string) => void;
}

export const SuggestionsRow = ({ suggestions, onSuggest }: SuggestionsRowProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 26 }}>
    {suggestions.map((s, i) => (
      <button
        key={i}
        onClick={() => onSuggest?.(s)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, textAlign: 'left',
        }}
      >
        {/* Arrow icon */}
        <svg width="16" height="9" viewBox="0 0 16 9" fill="none"
          stroke="var(--bd,#e0ddd7)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M2 1 L2 3.5" />
          <path d="M2 3.5 Q2 7 6 7 L13 7" />
          <polyline points="10,5 13,7 10,9" />
        </svg>
        <span style={{ fontSize: 14.5, color: 'var(--mu,#909090)', lineHeight: 1.45 }}>{s}</span>
      </button>
    ))}
  </div>
);
