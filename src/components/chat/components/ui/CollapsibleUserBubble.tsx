// ─────────────────────────────────────────────
// COLLAPSIBLE USER BUBBLE
// src/components/chat/components/ui/CollapsibleUserBubble.tsx
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COLLAPSE_THRESHOLD } from '../../constants';
import { parseReplyQuote } from '../../utils';

interface CollapsibleUserBubbleProps {
  content: string;
  onClick: (e: React.MouseEvent) => void;
}

export const CollapsibleUserBubble = memo(({ content, onClick }: CollapsibleUserBubbleProps) => {
  const [expanded, setExpanded] = useState(false);
  const { replyText, actualContent } = parseReplyQuote(content);
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;

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
        <span style={{ fontSize: 15, lineHeight: 1.7, wordBreak: 'break-word', color: 'var(--text,#141414)' }}>
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
