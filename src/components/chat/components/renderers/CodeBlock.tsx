// ─────────────────────────────────────────────
// CODE BLOCK — src/components/chat/components/renderers/CodeBlock.tsx
// Syntax-highlighted code with copy button
//
// FIX BLUR DI MODE GELAP:
//   Penyebab: tema `prism` (versi terang) dipakai terus, padahal bawaannya
//   punya `text-shadow: 0 1px white` + warna teks gelap. Di kartu gelap,
//   bayangan putih itu bikin tiap huruf kelihatan dobel/ngeblur.
//   Perbaikan:
//     1) Tema otomatis ganti: terang → `prism`, gelap → `oneDark`
//        (deteksi dari variabel --bg, jadi ikut semua tema: dark, slate, aurora-dark, dll)
//     2) text-shadow DIMATIKAN di <pre> maupun <code>
//     3) Teks panjang (language "text", mis. prompt) otomatis wrap,
//        jadi nggak kepotong di sisi kanan kartu
// ─────────────────────────────────────────────
import React, { memo, useState, useSyncExternalStore } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { LANG_LABELS } from '../../constants';

interface CodeBlockProps { lang: string; content: string; }

// ── Deteksi mode gelap dari warna background tema ──
const parseRgb = (value: string): [number, number, number] | null => {
  const s = value.trim();
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const h = m[1];
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  m = s.match(/^#([0-9a-f]{6})/i);
  if (m) {
    const h = m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
};

const detectDark = (): boolean => {
  if (typeof document === 'undefined') return false;
  const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--bg');
  let rgb = cssVar ? parseRgb(cssVar) : null;
  if (!rgb) rgb = parseRgb(getComputedStyle(document.body).backgroundColor || '');
  if (rgb) {
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return lum < 0.5;
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

// ── Store tunggal: satu observer untuk semua CodeBlock ──
let darkValue = detectDark();
const darkListeners = new Set<() => void>();
let darkStarted = false;

const startDarkWatcher = () => {
  if (darkStarted || typeof document === 'undefined') return;
  darkStarted = true;
  const update = () => {
    const next = detectDark();
    if (next !== darkValue) {
      darkValue = next;
      darkListeners.forEach((l) => l());
    }
  };
  const mo = new MutationObserver(update);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
  mo.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', update);
  update();
};

const subscribeDark = (cb: () => void) => {
  startDarkWatcher();
  darkListeners.add(cb);
  return () => { darkListeners.delete(cb); };
};
const getDark = () => darkValue;

const useIsDark = () => useSyncExternalStore(subscribeDark, getDark, () => false);

export const CodeBlock = memo(({ lang, content }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const isDark = useIsDark();

  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript'
    : lang === 'nextjs' ? 'jsx'
    : lang === 'tailwind' ? 'css'
    : lang || 'text';

  // Teks biasa / prompt → wrap biar nggak kepotong. Kode asli → scroll horizontal.
  const isPlainText = prismLang === 'text' || prismLang === 'plaintext';

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
        style={isDark ? oneDark : prism}
        language={prismLang}
        PreTag="div"
        wrapLongLines={isPlainText}
        customStyle={{
          margin: 0,
          padding: '14px',
          fontSize: '13px',
          lineHeight: '1.65',
          background: 'transparent',
          borderRadius: 0,
          overflowX: 'auto',
          textShadow: 'none',
          // Teks polos pakai warna tema aplikasi biar selalu kebaca di tema apa pun
          ...(isPlainText ? { color: 'var(--text)' } : {}),
        }}
        codeTagProps={{
          style: {
            textShadow: 'none',
            background: 'transparent',
            ...(isPlainText ? { color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } : {}),
          },
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
});
