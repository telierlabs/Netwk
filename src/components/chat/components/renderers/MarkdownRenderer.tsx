// ─────────────────────────────────────────────
// MARKDOWN RENDERER + STREAMING TEXT
// src/components/chat/components/renderers/MarkdownRenderer.tsx
//
// PERUBAHAN dari versi lama:
//   • onComplete dipanggil dengan delay lebih besar (150ms) agar
//     action bar tidak muncul sebelum teks benar-benar selesai render
//   • completedRef direset dengan benar saat isStreaming kembali true
//   • ActiveParagraph: animasi fade lebih halus (0.25s bukan 0.18s)
//   • Cursor hanya muncul saat isStreaming === true (sudah benar di asli)
//   • BARU: blok ```image-search → <ImageStrip /> (foto publik di dalam jawaban)
// ─────────────────────────────────────────────
import React, { memo, useContext, useEffect, useMemo, useRef } from 'react';
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
import { CodeCardHost, CodeStreamCtx } from './CodeCard';
import { openFenceOffset, parseFenceMeta, splitKeepFences } from '../../../../lib/codeCards';
import { ImageStrip } from './ImageStrip';
import { CitationContext, CitePillView, remarkCitePills } from '../search/citations';
import { MediaContext, MediaBlockView, remarkMediaInserts } from '../media/MediaBlocks';

const MD_STYLES = `
  @keyframes cursorBlink { 0%,100%{opacity:0.6} 50%{opacity:0} }
  @keyframes chunkFadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cylen-md { font-size:var(--chat-text-size,15px); line-height:1.78; color:var(--text,#141414); letter-spacing:0.01em; min-width:0; max-width:100%; overflow-wrap:anywhere; word-break:break-word; }
  .cylen-md pre { max-width:100%; overflow-x:auto; }
  .cylen-md img, .cylen-md video, .cylen-md iframe { max-width:100%; }
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
  .cylen-md .katex { font-size:1em; overflow-wrap:normal; word-break:normal; }
  .cylen-md p .katex, .cylen-md li .katex { max-width:100%; }
  .cylen-md .katex-display { margin:1.2rem 0; padding:0.8rem 1rem; background:var(--sf,#f7f5f1); border:1px solid var(--bd,#e0ddd7); border-radius:12px; overflow-x:auto; text-align:center; }
  .cylen-chunk-new {
    animation: chunkFadeIn 0.25s ease-out both;
  }
`;

// ── Tanda `$` untuk mata uang ("US$1 triliun", "$800 miliar") jangan dibaca sebagai rumus ──
// `$` diganti 1 karakter pengganti (panjang teks TIDAK berubah, jadi posisi pil sumber / foto tetap pas),
// lalu dikembalikan ke `$` pada teks biasa setelah remark-math selesai. Blok kode & `kode` tidak disentuh.
const CUR = '\uE000';
const CODE_SPLIT = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g;
const CURRENCY_DOLLAR = /(^|[^\\$])\$(?=\d[\d.,]*(?:\s|[A-Za-z]{2,}|$|[)\].,;:!?%\-–/]))/g;
export function shieldCurrency(text: string): string {
  if (text.indexOf('$') === -1) return text;
  return text.split(CODE_SPLIT).map((part, i) => (i % 2 === 1 ? part : part.replace(CURRENCY_DOLLAR, (_m, pre) => pre + CUR))).join('');
}

/** Kembalikan `$` mata uang & render `**tebal**` yang gagal terbaca parser (mis. diapit tanda baca) di teks biasa. */
function remarkFixText() {
  const walk = (node: any) => {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'math' || node.type === 'inlineMath') return;
    const out: any[] = [];
    for (const ch of node.children) {
      if (ch.type === 'text' && typeof ch.value === 'string') {
        let v: string = ch.value.split(CUR).join('$');
        if (v.indexOf('**') !== -1 && node.type !== 'strong') {
          let last = 0; let m: RegExpExecArray | null; const re = /\*\*([^*\n][^*\n]*?)\*\*/g; let changed = false;
          while ((m = re.exec(v))) {
            changed = true;
            if (m.index > last) out.push({ type: 'text', value: v.slice(last, m.index) });
            out.push({ type: 'strong', children: [{ type: 'text', value: m[1] }] });
            last = m.index + m[0].length;
          }
          if (changed) { if (last < v.length) out.push({ type: 'text', value: v.slice(last) }); continue; }
        }
        out.push({ ...ch, value: v });
      } else { walk(ch); out.push(ch); }
    }
    node.children = out;
  };
  return (tree: any) => walk(tree);
}

// ── Shared markdown components config ──────────
const makeComponents = (contentRef: { current: string }) => ({
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
    if (lang === 'image-search')        return <ImageStrip query={raw} />;
    if (lang === 'suggestions')         return null;
    if ((lang === 'text' || lang === '') && !raw.includes('\n') && raw.trim().length <= 120)
      return <span style={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)' }}>{raw}</span>;
    // Blok kode biasa → kartu kode (loading >_ selagi AI masih menulis, lalu kartu yang bisa dibuka)
    const meta = parseFenceMeta((node as any)?.data?.meta ?? (node as any)?.properties?.metastring);
    const at = (node as any)?.position?.start?.offset;
    const isOpenBlock = typeof at === 'number' && openFenceOffset(contentRef.current) === at;
    return <CodeCardHost lang={lang || 'text'} raw={raw} meta={meta} isOpenBlock={isOpenBlock} />;
  },
});

// ── Markdown Renderer ─────────────────────────
export const MarkdownRenderer = memo(({ content }: { content: string }) => {
  // 🔧 BARU: pil sumber per paragraf. Aktif hanya kalau ChatBubble menyediakan CitationContext
  // DAN teksnya persis sama dengan teks yang dipakai saat menghitung posisi sitasi.
  const cite = useContext(CitationContext);
  const pillsOn = !!cite && cite.text === content && cite.citations.length > 0;

  // 🔧 BARU: foto / video / kartu link di dalam jawaban (aturan sama: teks harus persis sama dengan saat posisi dihitung)
  const mctx = useContext(MediaContext);
  const mediaOn = !!mctx && mctx.text === content && mctx.media.length > 0;

  const remarkPlugins = useMemo<any[]>(() => {
    const p: any[] = [remarkGfm, remarkMath, remarkFixText];
    if (pillsOn) p.push([remarkCitePills, cite!.citations]);
    if (mediaOn) p.push([remarkMediaInserts, mctx!.media]);
    return p;
  }, [pillsOn, cite?.citations, mediaOn, mctx?.media]);
  const contentRef = useRef(content);
  contentRef.current = content;
  const safeContent = useMemo(() => shieldCurrency(content), [content]);
  const components = useMemo<any>(
    () => ({
      ...makeComponents(contentRef),
      ...(pillsOn ? { 'cite-pill': CitePillView } : {}),
      ...(mediaOn ? { 'media-block': MediaBlockView } : {}),
    }),
    [pillsOn, mediaOn],
  );

  return (
    <div className="cylen-md" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <style>{MD_STYLES}</style>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {safeContent}
      </Markdown>
    </div>
  );
});

// ── Split content into visual "paragraphs" for fade-in ──
export function splitIntoParagraphs(text: string): string[] {
  return splitKeepFences(text); // blok kode tidak terpotong meski berisi baris kosong
}

// ── Streaming Text ─────────────────────────────
// Render konten LANGSUNG saat datang (tidak ada typewriter delay),
// dengan fade-in halus pada paragraf yang baru muncul.
// onComplete dipanggil hanya setelah isStreaming benar-benar false.

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

export const StreamingText = memo(({ content, isStreaming, onComplete }: StreamingTextProps) => {
  const seenParagraphsRef = useRef<number>(0);
  const prevContentRef    = useRef<string>('');
  const onCompleteRef     = useRef(onComplete);
  // ── FIX: completedRef direset setiap kali streaming dimulai ulang ──
  const completedRef      = useRef(false);

  onCompleteRef.current = onComplete;

  const paragraphs     = splitIntoParagraphs(content);
  const newFromIndex   = seenParagraphsRef.current;

  useEffect(() => {
    prevContentRef.current = content;
    if (paragraphs.length > 1) {
      seenParagraphsRef.current = paragraphs.length - 1;
    }
  });

  useEffect(() => {
    // ── FIX: reset saat streaming dimulai ──
    if (isStreaming) {
      completedRef.current = false;
      return;
    }
    // Streaming selesai — tunggu lebih lama agar render terakhir selesai
    // sebelum action bar muncul
    if (!completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => {
        onCompleteRef.current?.();
      }, 150); // ── naik dari 80ms → 150ms ──
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  const showCursor = isStreaming;

  return (
    <StreamingContainer
      content={content}
      isStreaming={isStreaming}
      showCursor={showCursor}
      newFromIndex={newFromIndex}
      paragraphCount={paragraphs.length}
    />
  );
});

// ── Internal streaming container ────────────────
interface StreamingContainerProps {
  content: string;
  isStreaming: boolean;
  showCursor: boolean;
  newFromIndex: number;
  paragraphCount: number;
}

const StreamingContainer = memo(({
  content, isStreaming, showCursor,
}: StreamingContainerProps) => {
  const paragraphs   = splitIntoParagraphs(content);
  const hasMultiple  = paragraphs.length > 1;

  if (!hasMultiple) {
    return (
      <CodeStreamCtx.Provider value={isStreaming}>
        <div key="single" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          <style>{MD_STYLES}</style>
          <div className="cylen-chunk-new">
            <MarkdownRenderer content={content} />
          </div>
          {showCursor && <InlineCursor />}
        </div>
      </CodeStreamCtx.Provider>
    );
  }

  const settledContent = paragraphs.slice(0, paragraphs.length - 1).join('\n\n');
  const activeContent  = paragraphs[paragraphs.length - 1];

  return (
    <CodeStreamCtx.Provider value={isStreaming}>
      <div style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        <style>{MD_STYLES}</style>
        {/* Settled paragraphs — tidak re-render saat paragraf baru muncul */}
        <SettledContent content={settledContent} />
        {/* Active last paragraph — fade-in halus setiap kali paragraf baru */}
        <ActiveParagraph
          key={`active-${paragraphs.length}`}
          content={activeContent}
          isStreaming={isStreaming}
          showCursor={showCursor}
        />
      </div>
    </CodeStreamCtx.Provider>
  );
});

// ── Settled content — di-memo ketat ──
const SettledContent = memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (prev, next) => prev.content === next.content,
);

// ── Active paragraph ──
interface ActiveParagraphProps {
  content: string;
  isStreaming: boolean;
  showCursor: boolean;
}

const ActiveParagraph = memo(({ content, isStreaming, showCursor }: ActiveParagraphProps) => (
  <div className={isStreaming ? 'cylen-chunk-new' : ''} style={{ display: 'inline' }}>
    <MarkdownRenderer content={content} />
    {showCursor && <InlineCursor />}
  </div>
));

// ── Blinking cursor ──
const InlineCursor = () => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: 2,
      height: '1.1em',
      background: 'var(--text)',
      borderRadius: 2,
      marginLeft: 3,
      verticalAlign: 'middle',
      opacity: 0.6,
      animation: 'cursorBlink 0.55s step-end infinite',
    }}
  />
);
