// ─────────────────────────────────────────────
// MARKDOWN RENDERER + STREAMING TEXT
// src/components/chat/components/renderers/MarkdownRenderer.tsx
// ─────────────────────────────────────────────
import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { HtmlPreview } from './HtmlPreview';
import { MermaidDiagram, DiagramBlock } from '../diagrams/DiagramBlock';
import { CopyCard } from './CopyCard';
import { PresentationRenderer, DocumentRenderer } from './PresentationRenderer';
import { CodeBlock } from './CodeBlock';

const MD_STYLES = `
  @keyframes cursorBlink { 0%,100%{opacity:0.6} 50%{opacity:0} }
  @keyframes spinRing { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cylen-md { font-size:var(--chat-text-size,15px); line-height:1.78; color:var(--text,#141414); letter-spacing:0.01em; }
  .cylen-md h1 { font-size:1.45rem; font-weight:760; margin:1.5rem 0 0.6rem; line-height:1.25; letter-spacing:-0.025em; }
  .cylen-md h2 { font-size:1.14rem; font-weight:680; margin:1.2rem 0 0.4rem; letter-spacing:-0.014em; }
  .cylen-md h3 { font-size:1rem; font-weight:660; margin:0.95rem 0 0.3rem; }
  .cylen-md p { margin:0 0 0.85rem; }
  .cylen-md p:last-child { margin-bottom:0; }
  .cylen-md ul { list-style:none; padding-left:0; margin:0.3rem 0 0.85rem; }
  .cylen-md ol { list-style:none; counter-reset:cylen-ol; padding-left:0; margin:0.3rem 0 0.85rem; }
  .cylen-md ul>li { padding-left:1.25rem; position:relative; margin-bottom:0.45rem; line-height:1.7; }
  .cylen-md ul>li::before { content:''; position:absolute; left:2px; top:0.62em; width:5px; height:5px; border-radius:50%; background:var(--text,#141414); opacity:0.4; }
  .cylen-md ol>li { counter-increment:cylen-ol; padding-left:1.5rem; position:relative; margin-bottom:0.45rem; line-height:1.7; }
  .cylen-md ol>li::before { content:counter(cylen-ol) '.'; position:absolute; left:0; font-size:0.82em; font-weight:700; color:var(--mu,#909090); top:0.1em; }
  .cylen-md code:not(pre code) { background:var(--sf,#f7f5f1); color:var(--text,#141414); padding:0.1em 0.4em; border-radius:5px; font-family:'JetBrains Mono','Fira Code',monospace; font-size:0.83em; border:1px solid var(--bd,#e0ddd7); }
  .cylen-md blockquote { border-left:3px solid var(--bd,#e0ddd7); padding:0.5rem 0.9rem; margin:0.9rem 0; color:var(--mu,#909090); font-style:italic; background:var(--sf,#f7f5f1); border-radius:0 10px 10px 0; }
  .cylen-md hr { border:none; border-top:1px solid var(--bd,#e0ddd7); margin:1.2rem 0; opacity:0.4; }
  .cylen-md strong { font-weight:720; color:var(--text,#141414); }
  .cylen-md em { font-style:italic; color:var(--mu,#909090); }
  .cylen-md a { color:var(--text,#141414); text-decoration:underline; text-underline-offset:3px; text-decoration-color:var(--bd,#e0ddd7); }
  .cylen-md a:hover { text-decoration-color:var(--mu,#909090); }
  .cylen-md table { display:block; overflow-x:auto; border-collapse:collapse; width:max-content; max-width:100%; margin:1rem 0; border-radius:12px; border:1.5px solid var(--bd,#e0ddd7); font-size:13.5px; }
  .cylen-md thead tr { background:var(--sf,#f7f5f1); }
  .cylen-md th { padding:8px 14px; font-size:10.5px; font-weight:700; text-align:left; color:var(--mu,#909090); text-transform:uppercase; letter-spacing:0.07em; border-bottom:1.5px solid var(--bd,#e0ddd7); white-space:nowrap; }
  .cylen-md td { padding:8px 14px; color:var(--text,#141414); border-bottom:1px solid var(--bd,#e0ddd7); white-space:nowrap; }
  .cylen-md tbody tr:last-child td { border-bottom:none; }
  .cylen-md tbody tr:hover td { background:var(--sf,#f7f5f1); }
  .cylen-md .katex { font-size:1em; }
  .cylen-md .katex-display { margin:1.2rem 0; padding:0.8rem 1rem; background:var(--sf,#f7f5f1); border:1px solid var(--bd,#e0ddd7); border-radius:12px; overflow-x:auto; text-align:center; }
`;

// ── Markdown Renderer ─────────────────────────
export const MarkdownRenderer = memo(({ content }: { content: string }) => (
  <div className="cylen-md" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
    <style>{MD_STYLES}</style>
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-([\w-]+)/.exec(className || '');
          const lang = match ? match[1] : '';
          const raw = String(children).replace(/\n$/, '');
          if (inline) return <code className={className} {...props}>{children}</code>;
          if (lang === 'html-preview')        return <HtmlPreview content={raw} />;
          if (lang === 'mermaid')             return <MermaidDiagram content={raw} />;
          if (lang.startsWith('diagram-'))    return <DiagramBlock lang={lang} raw={raw} />;
          if (lang === 'copy-card')           return <CopyCard content={raw} />;
          if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
          if (lang === 'document-content')    return <DocumentRenderer content={raw} />;
          if (lang === 'suggestions')         return null;
          if ((lang === 'text' || lang === '') && !raw.includes('\n') && raw.trim().length <= 120)
            return <span style={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)' }}>{raw}</span>;
          return <CodeBlock lang={lang || 'text'} content={raw} />;
        },
      }}
    >
      {content}
    </Markdown>
  </div>
));

// ── Streaming Text ─────────────────────────────
interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

export const StreamingText = memo(({ content, isStreaming, onComplete }: StreamingTextProps) => {
  const [revealedLen, setRevealedLen]   = useState(0);
  const [isDone, setIsDone]             = useState(false);

  // Refs — tidak re-render saat berubah
  const targetRef    = useRef(content);
  const revealedRef  = useRef(0);
  const rafRef       = useRef<number | null>(null);
  const lastTimeRef  = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  const isStreamingRef = useRef(isStreaming);

  // Selalu sinkron ref ke prop terbaru
  onCompleteRef.current   = onComplete;
  isStreamingRef.current  = isStreaming;

  // ── Fungsi animasi berbasis rAF — mulus seperti TypeWriter pro ──
  const tick = useCallback((now: number) => {
    const MS_PER_CHAR = 12; // 1 karakter per 12ms ≈ ~83 char/detik — enak dibaca, tidak kesusu
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= MS_PER_CHAR) {
      lastTimeRef.current = now;

      const target = targetRef.current.length;
      const cur    = revealedRef.current;

      if (cur >= target) {
        // Semua karakter sudah tampil
        if (!isDone) {
          setIsDone(true);
          onCompleteRef.current?.();
        }
        return; // stop rAF
      }

      // Berapa karakter yang dimajukan per frame
      // Kalau teks panjang banget (>300 sisa), cepatkan sedikit biar tidak ketinggalan
      const remaining = target - cur;
      const step      = remaining > 300 ? 3 : remaining > 80 ? 2 : 1;
      const next      = Math.min(cur + step, target);

      revealedRef.current = next;
      setRevealedLen(next);

      // Kalau sudah di ujung, tandai selesai
      if (next >= target && isStreamingRef.current === false) {
        setIsDone(true);
        onCompleteRef.current?.();
        return;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []); // eslint-disable-line

  // ── Saat content baru datang dari API ──
  useEffect(() => {
    const newTarget = content;

    // Konten memendek (reset/edit) → langsung selesai
    if (newTarget.length < revealedRef.current) {
      revealedRef.current = newTarget.length;
      setRevealedLen(newTarget.length);
      targetRef.current = newTarget;
      return;
    }

    targetRef.current = newTarget;

    // Jika streaming sudah mati dan teks belum selesai ditampil → kejar langsung
    if (!isStreaming && revealedRef.current < newTarget.length) {
      revealedRef.current = newTarget.length;
      setRevealedLen(newTarget.length);
      setIsDone(true);
      onCompleteRef.current?.();
      return;
    }

    // Jika rAF belum jalan, mulai
    if (rafRef.current === null && revealedRef.current < newTarget.length) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [content, isStreaming, tick]);

  // ── Saat streaming selesai (isStreaming → false) ──
  useEffect(() => {
    if (!isStreaming) {
      // Tunggu rAF menyelesaikan sisa karakter secara natural
      // Kalau sudah di ujung → tandai done sekarang
      if (revealedRef.current >= targetRef.current.length) {
        setIsDone(true);
        onCompleteRef.current?.();
      }
      // Kalau belum, biarkan tick() menyelesaikannya dan memanggil onComplete sendiri
    }
  }, [isStreaming]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const showCursor = isStreaming && !isDone && revealedLen < content.length;

  return (
    <>
      <MarkdownRenderer content={content.slice(0, revealedLen)} />
      {showCursor && (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 2, height: '1.1em',
            background: 'var(--text)',
            borderRadius: 2,
            marginLeft: 4,
            verticalAlign: 'middle',
            opacity: 0.6,
            animation: 'cursorBlink 0.55s step-end infinite',
          }}
        />
      )}
    </>
  );
});
