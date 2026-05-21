// ─────────────────────────────────────────────
// CODE BLOCK — src/components/chat/components/renderers/CodeBlock.tsx
// Syntax-highlighted code with copy button
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { LANG_LABELS } from '../../constants';

interface CodeBlockProps { lang: string; content: string; }

export const CodeBlock = memo(({ lang, content }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript'
    : lang === 'nextjs' ? 'jsx'
    : lang === 'tailwind' ? 'css'
    : lang || 'text';

  return (
    <div style={{
      margin: '12px 0',
      border: '1.5px solid var(--bd,#e0ddd7)',
      borderRadius: 14, overflow: 'hidden',
      background: 'var(--sf,#f7f5f1)',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderBottom: '1px solid var(--bd,#e0ddd7)',
        background: 'var(--bg,#f2f0eb)',
      }}>
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em',
          color: 'var(--mu,#909090)', textTransform: 'uppercase', fontFamily: 'monospace',
        }}>{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: copied ? 'var(--text,#141414)' : 'var(--sf,#f7f5f1)',
            color: copied ? 'var(--bg,#f2f0eb)' : 'var(--mu,#909090)',
            border: '1px solid var(--bd,#e0ddd7)',
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter
        style={prism}
        language={prismLang}
        PreTag="div"
        customStyle={{ margin: 0, padding: '14px', fontSize: '13px', lineHeight: '1.65', background: 'transparent', borderRadius: 0 }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
});
