import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw, Share2,
  Check, Download, Presentation, FileText, ChevronLeft, ChevronRight,
  X, Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock, Globe, List, Trash2, Palette
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

// ─── THEME TOKEN SYSTEM ───────────────────────────────────────────────────────
// Uses CSS vars already defined in your global stylesheet (var(--bg), var(--sf),
// var(--cd), var(--bd), var(--text), var(--mu), var(--ac), var(--at)).
// All diagram & code blocks inherit these so they automatically follow
// the user's system light / dark preference.
// ─────────────────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  msg: Message;
  msgIndex: number;
  isLast?: boolean;
  onResend?: (content: string) => void;
  onEdit?: (content: string) => void;
  onSuggest?: (text: string) => void;
  onTogglePin?: (index: number) => void;
  onSaveItem?: (item: any) => void;
  onRegenerate?: (index: number) => void;
  onSwipeToReply?: (msg: Message) => void;
  suggestions?: string[];
  isStreaming?: boolean;
  activityStatus?: 'idle' | 'image' | 'pdf' | 'docs' | 'excel' | 'ppt' | 'ebook';
}

const COLLAPSE_THRESHOLD = 120;

const LANG_LABELS: Record<string, string> = {
  html: 'HTML', css: 'CSS', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  python: 'Python', nodejs: 'Node.js', nextjs: 'Next.js',
  json: 'JSON', bash: 'Bash', shell: 'Shell', sh: 'Shell',
  sql: 'SQL', yaml: 'YAML', yml: 'YAML', xml: 'XML',
  java: 'Java', kotlin: 'Kotlin', swift: 'Swift', go: 'Go',
  rust: 'Rust', cpp: 'C++', c: 'C', csharp: 'C#', php: 'PHP',
  ruby: 'Ruby', dart: 'Dart', tailwind: 'Tailwind', text: 'TEXT',
};

// ─────────────────────────────────────────────
// STREAMING TEXT  — smooth, no diagram lag
// ─────────────────────────────────────────────
interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

const StreamingText = memo(({ content, isStreaming }: StreamingTextProps) => {
  const [revealedLen, setRevealedLen] = useState(0);
  const prevContentRef = useRef('');
  const rafRef = useRef<number>();
  // Batch size: larger = less re-renders = smoother for diagrams
  const BATCH = 16;

  useEffect(() => {
    const prev = prevContentRef.current;
    const next = content;

    if (next.length < prev.length) {
      prevContentRef.current = next;
      setRevealedLen(next.length);
      return;
    }
    if (next === prev) return;
    prevContentRef.current = next;

    if (!isStreaming) {
      setRevealedLen(next.length);
      return;
    }

    const targetLen = next.length;
    const tick = () => {
      setRevealedLen(current => {
        if (current >= targetLen) return current;
        const step = Math.min(BATCH, targetLen - current);
        const next2 = current + step;
        if (next2 < targetLen) rafRef.current = requestAnimationFrame(tick);
        return next2;
      });
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [content, isStreaming]);

  const visible = content.slice(0, revealedLen);
  const hidden  = content.slice(revealedLen);

  return (
    <>
      <MarkdownRenderer content={visible} isPartial={hidden.length > 0} />
      {hidden.length > 0 && (
        <span aria-hidden style={{ opacity: 0, userSelect: 'none', pointerEvents: 'none' }}>
          {hidden}
        </span>
      )}
      {isStreaming && hidden.length === 0 && (
        <span className="streaming-cursor" aria-hidden />
      )}
    </>
  );
});

// ─────────────────────────────────────────────
// MERMAID DIAGRAM — colour-aware (light/dark)
// ─────────────────────────────────────────────
const MermaidDiagram = memo(({ content }: { content: string }) => {
  const [svgCode, setSvgCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Detect system colour scheme once on mount
  const isDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      fontFamily: 'inherit',
      themeVariables: isDark
        ? {
            primaryColor: '#3a3a3a',
            primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#505050',
            lineColor: '#6b6b6b',
            secondaryColor: '#2e2e2e',
            tertiaryColor: '#252525',
            edgeLabelBackground: '#2a2a2a',
            background: '#1e1e1e',
          }
        : {
            primaryColor: '#f0efed',
            primaryTextColor: '#1a1a1a',
            primaryBorderColor: '#d0cdc8',
            lineColor: '#a0a0a0',
            secondaryColor: '#e8e6e2',
            tertiaryColor: '#f5f4f1',
            edgeLabelBackground: '#f8f7f5',
            background: '#ffffff',
          },
    });

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const cleanContent = content.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
        const { svg } = await mermaid.render(id, cleanContent);
        setSvgCode(svg);
        setErrorMsg('');
      } catch (err: any) {
        console.error('Mermaid render error', err);
        setErrorMsg(err?.message || 'Sintaks diagram tidak didukung');
      }
    };
    renderDiagram();
  }, [content, isDark]);

  if (errorMsg) {
    return (
      <div className="my-4 w-full bg-[var(--cd)] border border-red-400/25 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
        <div className="text-[12px] text-red-400 font-semibold px-1">Gagal merender diagram:</div>
        <div className="p-3 text-red-400/80 text-[11px] bg-red-500/8 rounded-xl font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {errorMsg}
        </div>
        <div className="mt-2 text-[11px] font-semibold text-[var(--mu)] px-1">Kode Sumber:</div>
        <div className="p-3 text-[11px] text-[var(--mu)] font-mono bg-[var(--sf)] border border-[var(--bd)] rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="my-4 w-full bg-[var(--sf)] border border-[var(--bd)] rounded-2xl p-6 overflow-x-auto shadow-sm flex justify-center items-center"
      style={{ transition: 'background 0.2s, border-color 0.2s' }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: svgCode }}
        className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto"
      />
    </div>
  );
});

// ─────────────────────────────────────────────
// MARKDOWN RENDERER  — elegant grey palette
// ─────────────────────────────────────────────
const MarkdownRenderer = memo(({ content, isPartial }: { content: string; isPartial?: boolean }) => {
  return (
    <div className="cylen-md w-full" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <style>{`
        /* Streaming cursor */
        .streaming-cursor {
          display: inline-block; width: 2px; height: 1.1em;
          background: var(--text); border-radius: 2px;
          margin-left: 2px; vertical-align: middle;
          opacity: 0.55;
          animation: cursor-blink 0.6s step-end infinite;
        }
        @keyframes cursor-blink { 0%,100%{opacity:0.55} 50%{opacity:0} }

        /* Base */
        .cylen-md {
          font-size: var(--chat-text-size, 15px);
          line-height: 1.82;
          color: var(--text);
          letter-spacing: 0.01em;
        }

        /* Headings */
        .cylen-md h1 {
          font-size: 1.5rem; font-weight: 750;
          margin: 1.6rem 0 0.65rem;
          line-height: 1.25; letter-spacing: -0.025em;
          color: var(--text);
        }
        .cylen-md h2 {
          font-size: 1.15rem; font-weight: 680;
          margin: 1.25rem 0 0.45rem; letter-spacing: -0.015em;
        }
        .cylen-md h3 {
          font-size: 1rem; font-weight: 650;
          margin: 1rem 0 0.35rem;
        }

        /* Paragraphs */
        .cylen-md p { margin-bottom: 1rem; }

        /* Lists */
        .cylen-md ul { list-style: none; padding-left: 0; margin: 0.35rem 0 1rem; }
        .cylen-md ol { list-style: none; counter-reset: cylen-ol; padding-left: 0; margin: 0.35rem 0 1rem; }
        .cylen-md ul > li { padding-left: 1.3rem; position: relative; margin-bottom: 0.55rem; line-height: 1.72; }
        .cylen-md ul > li::before {
          content: ''; position: absolute; left: 0; top: 0.62em;
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--mu); opacity: 0.55;
        }
        .cylen-md ol > li {
          counter-increment: cylen-ol;
          padding-left: 1.6rem; position: relative;
          margin-bottom: 0.55rem; line-height: 1.72;
        }
        .cylen-md ol > li::before {
          content: counter(cylen-ol) '.';
          position: absolute; left: 0;
          font-size: 0.82em; font-weight: 600;
          color: var(--mu); top: 0.1em;
        }
        .cylen-md li:last-child { margin-bottom: 0.1rem; }

        /* Inline code */
        .cylen-md code:not(pre code) {
          background: var(--sf);
          color: var(--text);
          padding: 0.12em 0.42em;
          border-radius: 5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.85em;
          border: 1px solid var(--bd);
          opacity: 0.9;
        }

        /* Blockquote */
        .cylen-md blockquote {
          border-left: 2.5px solid var(--bd);
          padding: 0.55rem 1rem;
          margin: 1.1rem 0;
          color: var(--mu);
          font-style: italic;
          background: var(--sf);
          border-radius: 0 10px 10px 0;
          opacity: 0.85;
        }

        /* HR */
        .cylen-md hr {
          border: none; border-top: 1px solid var(--bd);
          margin: 1.3rem 0; opacity: 0.4;
        }

        /* Strong / em */
        .cylen-md strong { font-weight: 700; color: var(--text); }
        .cylen-md em { font-style: italic; color: var(--mu); }

        /* Links */
        .cylen-md a {
          color: var(--text); text-decoration: underline;
          text-underline-offset: 3px; text-decoration-color: var(--bd);
          transition: text-decoration-color 0.15s;
        }
        .cylen-md a:hover { text-decoration-color: var(--mu); }

        /* Tables */
        .cylen-md table {
          display: block; overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-collapse: collapse;
          width: max-content; max-width: 100%;
          margin: 1.1rem 0;
          border-radius: 12px;
          border: 1px solid var(--bd);
          font-size: 13.5px;
        }
        .cylen-md thead tr { background: var(--sf); }
        .cylen-md th {
          padding: 9px 15px;
          font-size: 10.5px; font-weight: 700; text-align: left;
          color: var(--mu); text-transform: uppercase; letter-spacing: 0.07em;
          border-bottom: 1.5px solid var(--bd); white-space: nowrap;
        }
        .cylen-md td {
          padding: 8px 15px; color: var(--text);
          border-bottom: 1px solid var(--bd); white-space: nowrap;
        }
        .cylen-md tbody tr:last-child td { border-bottom: none; }
        .cylen-md tbody tr:hover td { background: var(--sf); transition: background 0.12s; }

        /* Math */
        .cylen-md .katex { font-size: 1em; }
        .cylen-md .katex-display {
          margin: 1.3rem 0; padding: 0.9rem 1.1rem;
          background: var(--sf); border: 1px solid var(--bd);
          border-radius: 12px; overflow-x: auto; text-align: center;
        }
        .cylen-md .katex-display > .katex { font-size: 1.2em; }
        .cylen-md .katex .mord, .cylen-md .katex .mbin,
        .cylen-md .katex .mrel, .cylen-md .katex .mopen,
        .cylen-md .katex .mclose, .cylen-md .katex .mpunct,
        .cylen-md .katex .minner { color: var(--text); }
      `}</style>

      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-([\w-]+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const raw = String(children).replace(/\n$/, '');
            if (inline) return <code className={className} {...props}>{children}</code>;
            if (lang === 'html-preview') return <HtmlPreview content={raw} />;
            if (lang === 'mermaid') return <MermaidDiagram content={raw} />;
            if (lang === 'copy-card') return <CopyCard content={raw} />;
            if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
            if (lang === 'document-content') return <DocumentRenderer content={raw} />;
            if (lang === 'suggestions') return null;
            if ((lang === 'text' || lang === '') && !raw.includes('\n') && raw.trim().length <= 120)
              return <span style={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)' }}>{raw}</span>;
            return <CodeBlock lang={lang || 'text'} content={raw} />;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
});

// ─────────────────────────────────────────────
// CODE BLOCK — grey-toned header
// ─────────────────────────────────────────────
const CodeBlock = memo(({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang =
    lang === 'nodejs' ? 'javascript'
    : lang === 'nextjs' ? 'jsx'
    : lang === 'tailwind' ? 'css'
    : lang || 'text';

  return (
    <div className="my-4 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full">
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--bd)]"
        style={{ background: 'var(--sf)' }}
      >
        <span style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em',
          color: 'var(--mu)', textTransform: 'uppercase', fontFamily: 'monospace',
        }}>
          {label}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
            copied
              ? "bg-[var(--text)] text-[var(--bg)] border border-[var(--text)]"
              : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)] hover:border-[var(--mu)]"
          )}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter
        style={prism}
        language={prismLang}
        PreTag="div"
        customStyle={{
          margin: 0, padding: '1.2rem',
          fontSize: '13px', lineHeight: '1.65',
          background: 'transparent', borderRadius: 0,
        }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
});

// ─────────────────────────────────────────────
// SMART IMAGE GALLERY
// ─────────────────────────────────────────────
const SmartImageGallery = memo(({ images, isUser }: { images: string[]; isUser: boolean }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openViewer = (index: number) => { setCurrentIndex(index); setViewerOpen(true); };
  const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); if (currentIndex < images.length - 1) setCurrentIndex(p => p + 1); };
  const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); if (currentIndex > 0) setCurrentIndex(p => p - 1); };
  const downloadImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a'); a.href = url; a.download = `image_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const viewerPortalContent = (
    <AnimatePresence>
      {viewerOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[999999] bg-black/96 flex flex-col items-center justify-center touch-none pointer-events-auto"
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 w-full p-4 md:p-5 flex items-center justify-between z-[999999] bg-gradient-to-b from-black/75 to-transparent">
            <button
              onClick={() => setViewerOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-all"
            >
              <ChevronLeft size={28} strokeWidth={2} />
            </button>
            <button
              onClick={(e) => downloadImage(e, images[currentIndex])}
              className="w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-all"
            >
              <Download size={22} strokeWidth={2} />
            </button>
          </div>

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center relative">
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
              src={images[currentIndex]} alt="Fullscreen"
              className="max-w-full max-h-[100vh] object-contain"
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
              onDragEnd={(_e, { offset }) => {
                if (offset.x < -50 && currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
                else if (offset.x > 50 && currentIndex > 0) setCurrentIndex(p => p - 1);
              }}
            />
            {images.length > 1 && currentIndex > 0 && (
              <button onClick={handlePrev} className="hidden md:flex absolute left-5 w-12 h-12 bg-black/40 hover:bg-black/70 border border-white/10 rounded-full items-center justify-center text-white transition-colors z-[999999]"><ChevronLeft size={28} /></button>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <button onClick={handleNext} className="hidden md:flex absolute right-5 w-12 h-12 bg-black/40 hover:bg-black/70 border border-white/10 rounded-full items-center justify-center text-white transition-colors z-[999999]"><ChevronRight size={28} /></button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={cn("w-full mb-2 mt-1 flex", isUser ? "justify-end" : "justify-start")}>
        <div className={cn("w-[85vw] sm:w-[500px] max-w-full flex flex-col gap-1.5", isUser ? "ml-auto" : "mr-auto")}>
          {images.length === 1 && (
            <div
              onClick={() => openViewer(0)}
              className="w-fit max-w-full rounded-[18px] overflow-hidden cursor-pointer shadow-sm border border-[var(--bd)]/25 relative inline-block ml-auto"
            >
              <img src={images[0]} alt="Uploaded" className="w-full max-w-full h-auto max-h-[500px] object-contain" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/8 transition-colors" />
            </div>
          )}
        </div>
      </div>
      {typeof document !== 'undefined' && createPortal(viewerPortalContent, document.body)}
    </>
  );
});

// ─────────────────────────────────────────────
// PRESENTATION RENDERER
// ─────────────────────────────────────────────
const PresentationRenderer = memo(({ content }: { content: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  let slides: any[] = [];
  try { slides = JSON.parse(content).slides || []; } catch {
    return <div className="p-4 bg-[var(--sf)] text-[var(--mu)] rounded-xl border border-[var(--bd)]">Gagal memuat slide.</div>;
  }
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((slide, i) => {
      if (i > 0) doc.addPage();
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, 297, 210, 'F');
      doc.setFontSize(24); doc.text(slide.title, 20, 30);
      doc.setFontSize(14); doc.text(doc.splitTextToSize(slide.content, 250), 20, 50);
    });
    doc.save('presentation.pdf');
  };
  return (
    <div className="my-6 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full">
      <div className="bg-[var(--sf)] border-b border-[var(--bd)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--mu)]">
          <Presentation size={17} />
          <span className="font-semibold uppercase tracking-widest text-[11px]">Slide</span>
        </div>
        <button onClick={exportToPDF} className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--bd)] text-[var(--text)] px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:opacity-80 transition-all">
          <Download size={13} /> PDF
        </button>
      </div>
      <div className="aspect-video p-10 flex flex-col justify-center bg-[var(--sf)] relative min-h-[260px]">
        <h2 className="text-2xl font-bold mb-5 text-[var(--text)]">{slides[currentSlide]?.title}</h2>
        <p className="text-base leading-relaxed text-[var(--mu)]">{slides[currentSlide]?.content}</p>
        <div className="absolute bottom-4 right-4 text-[10px] font-semibold text-[var(--mu)] opacity-50">{currentSlide + 1} / {slides.length}</div>
      </div>
      <div className="p-4 border-t border-[var(--bd)] flex items-center justify-between bg-[var(--cd)]">
        <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)} className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)] transition-colors"><ChevronLeft size={18} /></button>
        <div className="flex gap-1.5">{slides.map((_: any, i: number) => (
          <div key={i} onClick={() => setCurrentSlide(i)} className="w-1.5 h-1.5 rounded-full cursor-pointer transition-all" style={{ background: i === currentSlide ? 'var(--text)' : 'var(--bd)', opacity: i === currentSlide ? 1 : 0.5 }} />
        ))}</div>
        <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)} className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)] transition-colors"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// DOCUMENT RENDERER
// ─────────────────────────────────────────────
const DocumentRenderer = memo(({ content }: { content: string }) => {
  const exportPDF = () => { const doc = new jsPDF(); doc.text(doc.splitTextToSize(content, 170), 20, 20); doc.save('document.pdf'); };
  return (
    <div className="my-6 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl shadow-sm overflow-hidden w-full">
      <div className="p-3.5 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--sf)]">
        <div className="flex items-center gap-2 text-[var(--mu)]">
          <FileText size={16} />
          <span className="font-semibold text-[11px] uppercase tracking-tight">Dokumen</span>
        </div>
        <button onClick={exportPDF} className="p-1.5 bg-[var(--bg)] border border-[var(--bd)] rounded-lg hover:opacity-75 transition-all">
          <Download size={15} className="text-[var(--mu)]" />
        </button>
      </div>
      <div className="p-7 prose prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// HTML PREVIEW (fullscreen)
// ─────────────────────────────────────────────
const HtmlPreview = memo(({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowMenu(false); }, 1800);
  };
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'simulasi.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="my-3 flex items-center gap-4 p-4 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl cursor-pointer hover:opacity-75 transition-all shadow-sm w-full"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--bd)] flex items-center justify-center flex-shrink-0 text-[var(--mu)]">
          <Code size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-semibold text-[var(--text)] truncate">Simulasi Visual</h4>
          <p className="text-[11.5px] text-[var(--mu)] truncate mt-0.5">Kode · HTML · Ketuk untuk buka</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="fixed inset-0 z-[400] bg-[var(--bg)] flex flex-col"
    >
      <div className="flex items-center justify-between px-3 h-[58px] bg-[var(--bg)] border-b border-[var(--bd)] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-[var(--sf)] rounded-xl text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <ChevronLeft size={22} />
          </button>
          <span className="font-medium text-[14.5px] text-[var(--text)]">Simulasi Visual</span>
        </div>
        <div className="relative flex items-center">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-[var(--sf)] rounded-xl text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <MoreVertical size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[410]" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={{ duration: 0.14 }}
                  className="absolute top-full right-0 mt-2 z-[420] w-44 bg-[var(--cd)] border border-[var(--bd)] rounded-xl shadow-lg overflow-hidden py-1"
                >
                  <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left">
                    {copied ? <Check size={15} className="text-[var(--text)]" /> : <Copy size={15} />}
                    <span className="font-medium">{copied ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                  <div className="border-t border-[var(--bd)] mx-2 my-0.5" />
                  <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left">
                    <Download size={15} /><span className="font-medium">Unduh HTML</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 bg-white relative">
        <iframe srcDoc={content} title="Preview" className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin allow-forms" />
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────
// COPY CARD
// ─────────────────────────────────────────────
const CopyCard = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-4 p-5 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow w-full">
      <button
        onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className={cn(
          "absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[11px] font-semibold transition-all",
          copied
            ? "bg-[var(--text)] text-[var(--bg)] border-[var(--text)]"
            : "bg-[var(--sf)] border-[var(--bd)] text-[var(--text)] hover:opacity-75"
        )}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div className="text-[15px] leading-relaxed text-[var(--text)] pr-20 font-medium whitespace-pre-wrap">{content}</div>
    </div>
  );
});

// ─────────────────────────────────────────────
// COLLAPSIBLE USER BUBBLE
// ─────────────────────────────────────────────
const CollapsibleUserBubble = memo(({ content, onClick }: { content: string; onClick: (e: React.MouseEvent) => void }) => {
  const [expanded, setExpanded] = useState(false);
  let replyText = null;
  let actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;
  const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setExpanded(v => !v); };

  return (
    <div className="w-full relative flex flex-col">
      {replyText && (
        <div className="mx-2 mt-2 mb-1 bg-[var(--bg)]/35 border-l-[2.5px] border-[var(--mu)]/40 p-2.5 rounded-r-[10px] rounded-bl-[10px]">
          <span className="text-[10px] font-bold text-[var(--mu)] block mb-0.5 uppercase tracking-wider">AI</span>
          <span className="text-[12.5px] text-[var(--text)]/70 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}
      <div onClick={onClick} className={cn("px-4 cursor-pointer active:opacity-75 transition-opacity pb-3 select-none", replyText ? "pt-1" : "pt-3")}>
        <span className="text-[15px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '…' : '')}
        </span>
      </div>
      {isLong && (
        <button onClick={handleToggle} className="flex items-center gap-1 px-4 pb-2.5 text-[11.5px] font-semibold opacity-45 hover:opacity-75 transition-opacity" style={{ color: 'var(--text)' }}>
          {expanded ? <><ChevronUp size={13} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={13} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────
// MAIN CHAT BUBBLE COMPONENT
// ─────────────────────────────────────────────
const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({
  msg, msgIndex, isLast, onResend, onEdit, onSuggest,
  onTogglePin, onSaveItem, onRegenerate, onSwipeToReply, suggestions,
  isStreaming = false,
  activityStatus = 'idle',
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuCopied, setUserMenuCopied] = useState(false);

  // Action icons visible ONLY when stream is completely done
  const showActions = !isStreaming;

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let cleanCopyText = msg.content;
    const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (replyMatch) cleanCopyText = replyMatch[2];
    navigator.clipboard.writeText(cleanCopyText);
    setUserMenuCopied(true);
    setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500);
  };

  const openUserMenu = (e: React.MouseEvent) => { e.stopPropagation(); setShowUserMenu(true); };

  const isUser = msg.role === 'user';

  // ── ACTIVITY STATUS LOADING ──
  if (!isUser && isLast && activityStatus !== 'idle') {
    const statusMap = {
      pdf:   { icon: <FileText size={20} />,    text: 'Sedang menyusun dokumen PDF…' },
      docs:  { icon: <FileText size={20} />,    text: 'Sedang membuat file Word…' },
      excel: { icon: <List size={20} />,        text: 'Sedang menyusun laporan Excel…' },
      ppt:   { icon: <Presentation size={20} />,text: 'Sedang mendesain slide PPT…' },
      image: { icon: <Palette size={20} />,     text: 'Sedang melukis gambarmu…' },
      ebook: { icon: <Bookmark size={20} />,    text: 'Sedang merancang Ebook…' },
    };
    const current = statusMap[activityStatus as keyof typeof statusMap];

    return (
      <div id={`message-${msgIndex}`} className="flex flex-col items-start w-full my-4 pl-1">
        <style>{`
          @keyframes shimmerLoad {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
        `}</style>
        <div className="flex items-center gap-3">
          <div className="text-[var(--mu)] animate-pulse">{current?.icon}</div>
          <span style={{
            fontSize: '14.5px', fontWeight: 500,
            background: 'linear-gradient(90deg, var(--mu) 0%, var(--text) 50%, var(--mu) 100%)',
            backgroundSize: '200% auto', color: 'transparent',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            animation: 'shimmerLoad 2s linear infinite',
          }}>
            {current?.text}
          </span>
        </div>
      </div>
    );
  }

  // ── AUTO REMINDER ──
  if (!isUser && msg.isAutoReminder) {
    return (
      <div id={`message-${msgIndex}`} className="flex flex-col group w-full relative items-start my-6">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-[90%] md:max-w-[80%] bg-transparent border border-[var(--bd)] rounded-3xl p-5 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--text)]/4 blur-3xl rounded-full pointer-events-none" />
          <div className="border-l-[2.5px] border-[var(--bd)] pl-3 mb-4 relative z-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={11} className="text-[var(--mu)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)]">Pengingat</span>
            </div>
            <p className="text-[13px] italic text-[var(--mu)] line-clamp-2 leading-relaxed">"{msg.quotedText}"</p>
          </div>
          <p className="text-[15px] font-medium text-[var(--text)] relative z-10 leading-relaxed">{msg.content}</p>
        </motion.div>
      </div>
    );
  }

  // ── FILE LINK DETECTION ──
  let displayContent = msg.content || '';
  let fileLinkElement: React.ReactNode = null;
  const fileMatch = displayContent.match(/^\[(PDF|DOCS|EXCEL|PPT|EBOOK)_FILE: "(.*?)"\]\((.*?)\)\n\n([\s\S]*)$/);

  if (fileMatch) {
    const [_, type, fileName, fileUrl, rest] = fileMatch;
    displayContent = rest;

    const icons: any = {
      PDF:   <FileText className="text-[var(--mu)]" size={18} />,
      DOCS:  <FileText className="text-[var(--mu)]" size={18} />,
      EXCEL: <List className="text-[var(--mu)]" size={18} />,
      PPT:   <Presentation className="text-[var(--mu)]" size={18} />,
      EBOOK: <Bookmark className="text-[var(--mu)]" size={18} />,
    };

    fileLinkElement = (
      <div className={cn("flex flex-col gap-2 mb-3 mt-1 w-full", isUser ? "items-end" : "items-start")}>
        <a
          href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 px-4 py-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl shadow-sm hover:opacity-75 transition-all w-fit max-w-[85%]",
            isUser ? "ml-auto" : "mr-auto"
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--bd)]/40 flex items-center justify-center flex-shrink-0">
            {icons[type]}
          </div>
          <div className="flex flex-col items-start min-w-0 pr-2">
            <span className="text-[13.5px] font-semibold text-[var(--text)] truncate max-w-[170px]">{fileName}</span>
            <span className="text-[10.5px] font-medium text-[var(--mu)]">Klik untuk unduh {type}</span>
          </div>
          <Download size={16} className="text-[var(--mu)] ml-auto opacity-60" />
        </a>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div
      id={`message-${msgIndex}`}
      className={cn(
        "flex flex-col group w-full relative",
        isUser ? "items-end" : "items-start",
        showUserMenu ? "z-[100]" : "z-10"
      )}
    >
      {/* Timestamp + pin badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex flex-col">
          {msg.senderName && (
            <span className="text-[9.5px] font-bold text-[var(--text)] uppercase tracking-widest leading-none mb-1">{msg.senderName}</span>
          )}
          <span className="text-[9.5px] font-mono text-[var(--mu)] uppercase tracking-wider leading-none opacity-60">{msg.timestamp}</span>
        </div>
        {msg.pinned && <Pin size={10} className="text-[var(--mu)] ml-1 opacity-70" />}
      </div>

      {fileLinkElement}

      {/* Images */}
      {((msg.images && msg.images.length > 0) || msg.image) && (
        <SmartImageGallery
          images={(msg.images && msg.images.length > 0) ? msg.images : [msg.image!]}
          isUser={isUser}
        />
      )}

      {/* PDFs */}
      {msg.pdfs && msg.pdfs.length > 0 && (
        <div className={cn("flex flex-col gap-2 mb-2 w-full", isUser ? "items-end" : "items-start")}>
          {msg.pdfs.map((pdf, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl shadow-sm w-fit max-w-[85%]">
              <FileText size={18} className="text-[var(--mu)] shrink-0" />
              <span className="text-[13.5px] font-medium text-[var(--text)] truncate max-w-[200px]">{pdf.name || 'Dokumen Terlampir'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Message bubble */}
      {displayContent && (
        <div className={cn(
          "msg-bubble rounded-[22px] relative z-10",
          isUser
            ? "bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-tr-[6px] max-w-[85%] shadow-sm"
            : "bg-transparent text-[var(--text)] px-0 w-full"
        )}>
          {isUser ? (
            <>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_e, info) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
              >
                <CollapsibleUserBubble content={displayContent} onClick={openUserMenu} />
              </motion.div>

              {/* User context menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.94, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ duration: 0.14 }}
                    className="absolute top-[calc(100%+6px)] right-0 z-[99999] w-[152px] bg-[var(--bg)] border border-[var(--bd)] rounded-[14px] shadow-xl flex flex-col p-1"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onResend?.(displayContent); setShowUserMenu(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors text-left"
                    >
                      <RotateCcw size={14} className="text-[var(--mu)]" />
                      <span className="text-[13px] font-medium text-[var(--text)]">Ulangi</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let clean = displayContent;
                        const m = displayContent.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
                        if (m) clean = m[2];
                        onEdit?.(clean); setShowUserMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors text-left"
                    >
                      <Edit2 size={14} className="text-[var(--mu)]" />
                      <span className="text-[13px] font-medium text-[var(--text)]">Edit</span>
                    </button>
                    <div className="w-full h-[1px] bg-[var(--bd)] my-0.5 opacity-60" />
                    <button
                      onClick={handleUserMenuCopy}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors text-left"
                    >
                      {userMenuCopied
                        ? <><Check size={14} className="text-[var(--text)]" /><span className="text-[13px] font-medium text-[var(--text)]">Tersalin</span></>
                        : <><Copy size={14} className="text-[var(--mu)]" /><span className="text-[13px] font-medium text-[var(--text)]">Salin</span></>
                      }
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
              className="w-full"
            >
              {isStreaming
                ? <StreamingText content={displayContent} isStreaming={isStreaming} />
                : <MarkdownRenderer content={displayContent} />
              }
            </motion.div>
          )}
        </div>
      )}

      {/* ── ACTION ICONS — hanya muncul setelah stream selesai ── */}
      {!isUser && (
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-center gap-6 mt-1.5"
            >
              <button
                onClick={handleCopy}
                className={cn("transition-all", copied ? "text-[var(--text)]" : "text-[var(--mu)] hover:text-[var(--text)] opacity-50 hover:opacity-100")}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
              <button className="text-[var(--mu)] hover:text-[var(--text)] transition-all opacity-50 hover:opacity-100">
                <Share2 size={17} />
              </button>
              <button
                onClick={() => setLiked(l => l === 'up' ? null : 'up')}
                className={cn("transition-all", liked === 'up' ? "text-[var(--text)] opacity-100" : "text-[var(--mu)] hover:text-[var(--text)] opacity-50 hover:opacity-100")}
              >
                <ThumbsUp size={17} />
              </button>
              <button
                onClick={() => setLiked(l => l === 'down' ? null : 'down')}
                className={cn("transition-all", liked === 'down' ? "text-[var(--text)] opacity-100" : "text-[var(--mu)] hover:text-[var(--text)] opacity-50 hover:opacity-100")}
              >
                <ThumbsDown size={17} />
              </button>
              <button
                onClick={() => onRegenerate?.(msgIndex)}
                className="text-[var(--mu)] hover:text-[var(--text)] transition-all opacity-50 hover:opacity-100"
              >
                <RotateCcw size={17} />
              </button>
              <button
                onClick={() => onTogglePin?.(msgIndex)}
                className={cn("transition-all", msg.pinned ? "text-[var(--text)] opacity-80" : "text-[var(--mu)] hover:text-[var(--text)] opacity-50 hover:opacity-100")}
              >
                {msg.pinned ? <PinOff size={17} /> : <Pin size={17} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Suggestions */}
      {!isUser && isLast && suggestions && suggestions.length > 0 && showActions && (
        <div className="flex flex-col gap-[36px] mt-[36px]">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggest?.(s)}
              className="flex items-center gap-2 text-left group/sug w-fit max-w-full active:opacity-60 transition-opacity"
            >
              <svg
                width="16" height="9" viewBox="0 0 16 9" fill="none"
                className="flex-shrink-0 text-[var(--bd)] group-hover/sug:text-[var(--mu)] transition-colors"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M2 1 L2 3.5" /><path d="M2 3.5 Q2 7 6 7 L13 7" /><polyline points="10,5 13,7 10,9" />
              </svg>
              <span className="text-[14.5px] text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors leading-snug">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatBubble = memo(ChatBubbleComponent, (prev, next) => {
  return (
    prev.msg.content === next.msg.content &&
    prev.msg.pinned === next.msg.pinned &&
    prev.isLast === next.isLast &&
    prev.isStreaming === next.isStreaming &&
    prev.activityStatus === next.activityStatus
  );
});
