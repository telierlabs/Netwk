import React, { useState, memo, useRef, useEffect } from 'react';
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
  Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock, Globe, List, Trash2, Palette, ArrowLeft,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

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
// STREAMING TEXT — per-chunk, no animation, instant
// Batch 6 chars, interval 28ms → medium speed, no per-paragraph lag
// ─────────────────────────────────────────────
interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

const StreamingText = memo(({ content, isStreaming }: StreamingTextProps) => {
  const [revealedLen, setRevealedLen] = useState(0);
  const prevContentRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 6 chars per tick, 28ms interval = ~214 chars/sec — medium, readable
  const BATCH = 6;
  const INTERVAL_MS = 28;

  useEffect(() => {
    const next = content;
    const prev = prevContentRef.current;

    // Reset / shrink
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

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRevealedLen(cur => {
        if (cur >= next.length) {
          if (timerRef.current) clearInterval(timerRef.current!);
          return cur;
        }
        return Math.min(cur + BATCH, next.length);
      });
    }, INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current!);
    };
  }, [content, isStreaming]);

  const visible = content.slice(0, revealedLen);

  return (
    <>
      <MarkdownRenderer content={visible} />
      {isStreaming && revealedLen >= content.length && (
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: '1.1em',
            background: 'var(--text)',
            borderRadius: 2,
            marginLeft: 2,
            verticalAlign: 'middle',
            opacity: 0.6,
            animation: 'cursorBlink 0.55s step-end infinite',
          }}
          aria-hidden
        />
      )}
    </>
  );
});

// ─────────────────────────────────────────────
// DIAGRAM FULLSCREEN LIGHTBOX
// back arrow left, download right, no smooth fade on content
// ─────────────────────────────────────────────
interface DiagramLightboxProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onDownload: () => void;
}

const DiagramLightbox = ({ open, title, children, onClose, onDownload }: DiagramLightboxProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'var(--bg, #f2f0eb)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          display: 'flex', alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1.5px solid var(--bd, #e0ddd7)',
          background: 'var(--sf, #ffffff)',
          flexShrink: 0,
          gap: 12,
        }}
      >
        {/* Back arrow — left */}
        <button
          onClick={onClose}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1.5px solid var(--bd, #e0ddd7)',
            background: 'var(--bg, #f2f0eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} strokeWidth={2} color="var(--text, #141414)" />
        </button>

        {/* Title */}
        <span
          style={{
            flex: 1, textAlign: 'center',
            fontSize: 15, fontWeight: 600,
            color: 'var(--text, #141414)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        {/* Download — right */}
        <button
          onClick={onDownload}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1.5px solid var(--bd, #e0ddd7)',
            background: 'var(--bg, #f2f0eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Download size={18} strokeWidth={2} color="var(--text, #141414)" />
        </button>
      </div>

      {/* Content — scrollable */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px' }}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// ─────────────────────────────────────────────
// DIAGRAM CARD WRAPPER — tap to open fullscreen
// Grey elegant card, not black
// ─────────────────────────────────────────────
interface DiagramCardProps {
  title: string;
  tag: string;
  num: string;
  children: React.ReactNode;
}

const DiagramCard = ({ title, tag, num, children }: DiagramCardProps) => {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!cardRef.current) return;
    // Use html2canvas if available
    if (typeof (window as any).html2canvas !== 'undefined') {
      (window as any).html2canvas(cardRef.current, { scale: 3, backgroundColor: '#ffffff' }).then((canvas: HTMLCanvasElement) => {
        const a = document.createElement('a');
        a.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
      });
    }
  };

  return (
    <>
      {/* Card preview — tappable */}
      <div
        onClick={() => setOpen(true)}
        style={{
          background: 'var(--sf, #ffffff)',
          border: '1.5px solid var(--bd, #e0ddd7)',
          borderRadius: 16,
          overflow: 'hidden',
          width: '100%',
          cursor: 'pointer',
          boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
          marginBottom: 2,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '11px 14px',
            borderBottom: '1px solid var(--bd, #e0ddd7)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg, #f2f0eb)',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--mu, #909090)', fontWeight: 500 }}>{num} /</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #141414)' }}>{title}</span>
          <span
            style={{
              marginLeft: 'auto', fontSize: 10.5, padding: '3px 10px',
              borderRadius: 20, background: '#ebe8e3',
              color: 'var(--mu, #909090)', fontWeight: 600,
              border: '1px solid var(--bd, #e0ddd7)',
            }}
          >
            {tag}
          </span>
          {/* Expand hint */}
          <span
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, color: 'var(--mu, #909090)',
              background: '#ebe8e3', border: '1px solid var(--bd, #e0ddd7)',
              borderRadius: 20, padding: '3px 9px',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Buka
          </span>
        </div>

        {/* Diagram preview body */}
        <div style={{ padding: '20px 16px 18px', background: 'var(--sf, #ffffff)' }}>
          {children}
        </div>
      </div>

      {/* Fullscreen lightbox */}
      <DiagramLightbox
        open={open}
        title={title}
        onClose={() => setOpen(false)}
        onDownload={handleDownload}
      >
        <div ref={cardRef} style={{ background: 'var(--sf, #ffffff)', borderRadius: 16, padding: '20px 16px', border: '1.5px solid var(--bd, #e0ddd7)' }}>
          {children}
        </div>
      </DiagramLightbox>
    </>
  );
};

// ─────────────────────────────────────────────
// MERMAID DIAGRAM
// ─────────────────────────────────────────────
const MermaidDiagram = memo(({ content }: { content: string }) => {
  const [svgCode, setSvgCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
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
            primaryColor: '#3a3a3a', primaryTextColor: '#e0e0e0',
            primaryBorderColor: '#505050', lineColor: '#6b6b6b',
            secondaryColor: '#2e2e2e', tertiaryColor: '#252525',
            edgeLabelBackground: '#2a2a2a', background: '#1e1e1e',
          }
        : {
            primaryColor: '#f0efed', primaryTextColor: '#1a1a1a',
            primaryBorderColor: '#d0cdc8', lineColor: '#a0a0a0',
            secondaryColor: '#e8e6e2', tertiaryColor: '#f5f4f1',
            edgeLabelBackground: '#f8f7f5', background: '#ffffff',
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
        setErrorMsg(err?.message || 'Sintaks diagram tidak didukung');
      }
    };
    renderDiagram();
  }, [content, isDark]);

  if (errorMsg) {
    return (
      <div style={{
        background: 'var(--sf)', border: '1px solid rgba(200,80,80,0.3)',
        borderRadius: 12, padding: 16, margin: '8px 0',
      }}>
        <div style={{ fontSize: 12, color: '#c84040', fontWeight: 600, marginBottom: 8 }}>Error diagram:</div>
        <div style={{ fontSize: 11, color: '#c84040', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{errorMsg}</div>
      </div>
    );
  }

  if (!svgCode) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center' }}>
        <LoadingDots />
      </div>
    );
  }

  return (
    <DiagramCard title="Diagram" tag="Mermaid" num="●">
      <div
        dangerouslySetInnerHTML={{ __html: svgCode }}
        style={{ maxWidth: '100%', overflowX: 'auto' }}
      />
    </DiagramCard>
  );
});

// ─────────────────────────────────────────────
// LOADING DOTS — clear, bold, not too thin
// ─────────────────────────────────────────────
const LoadingDots = () => (
  <>
    <style>{`
      @keyframes ldBounce {
        0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
        40% { transform: scale(1); opacity: 1; }
      }
    `}</style>
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text, #141414)',
            display: 'inline-block',
            animation: `ldBounce 1.1s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </span>
  </>
);

// ─────────────────────────────────────────────
// MARKDOWN RENDERER — no transitions on text, clean
// ─────────────────────────────────────────────
const MarkdownRenderer = memo(({ content }: { content: string }) => {
  return (
    <div className="cylen-md" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:0.6} 50%{opacity:0} }

        .cylen-md {
          font-size: var(--chat-text-size, 15px);
          line-height: 1.78;
          color: var(--text, #141414);
          letter-spacing: 0.01em;
          /* NO transition — text must appear instant */
        }

        /* Headings */
        .cylen-md h1 { font-size: 1.45rem; font-weight: 760; margin: 1.5rem 0 0.6rem; line-height: 1.25; letter-spacing: -0.025em; }
        .cylen-md h2 { font-size: 1.15rem; font-weight: 680; margin: 1.2rem 0 0.4rem; letter-spacing: -0.015em; }
        .cylen-md h3 { font-size: 1rem; font-weight: 650; margin: 0.95rem 0 0.3rem; }

        /* Paragraphs — NO margin-collapse delay */
        .cylen-md p { margin: 0 0 0.85rem; }
        .cylen-md p:last-child { margin-bottom: 0; }

        /* Lists */
        .cylen-md ul { list-style: none; padding-left: 0; margin: 0.3rem 0 0.85rem; }
        .cylen-md ol { list-style: none; counter-reset: cylen-ol; padding-left: 0; margin: 0.3rem 0 0.85rem; }
        .cylen-md ul > li { padding-left: 1.25rem; position: relative; margin-bottom: 0.45rem; line-height: 1.7; font-size: var(--chat-text-size, 15px); }
        .cylen-md ul > li::before {
          content: ''; position: absolute; left: 2px; top: 0.62em;
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--text, #141414); opacity: 0.45;
        }
        .cylen-md ol > li {
          counter-increment: cylen-ol; padding-left: 1.5rem;
          position: relative; margin-bottom: 0.45rem; line-height: 1.7;
          font-size: var(--chat-text-size, 15px);
        }
        .cylen-md ol > li::before {
          content: counter(cylen-ol) '.'; position: absolute; left: 0;
          font-size: 0.82em; font-weight: 700; color: var(--mu, #909090); top: 0.1em;
        }

        /* Inline code */
        .cylen-md code:not(pre code) {
          background: var(--sf, #f7f5f1); color: var(--text, #141414);
          padding: 0.1em 0.4em; border-radius: 5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.83em; border: 1px solid var(--bd, #e0ddd7);
        }

        /* Blockquote */
        .cylen-md blockquote {
          border-left: 3px solid var(--bd, #e0ddd7);
          padding: 0.5rem 0.9rem; margin: 0.9rem 0;
          color: var(--mu, #909090); font-style: italic;
          background: var(--sf, #f7f5f1); border-radius: 0 10px 10px 0;
        }

        /* HR */
        .cylen-md hr { border: none; border-top: 1px solid var(--bd, #e0ddd7); margin: 1.2rem 0; opacity: 0.45; }

        /* Strong / em — NO fade */
        .cylen-md strong { font-weight: 720; color: var(--text, #141414); }
        .cylen-md em { font-style: italic; color: var(--mu, #909090); }

        /* Links */
        .cylen-md a { color: var(--text, #141414); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--bd, #e0ddd7); }
        .cylen-md a:hover { text-decoration-color: var(--mu, #909090); }

        /* Tables */
        .cylen-md table {
          display: block; overflow-x: auto; -webkit-overflow-scrolling: touch;
          border-collapse: collapse; width: max-content; max-width: 100%;
          margin: 1rem 0; border-radius: 12px; border: 1.5px solid var(--bd, #e0ddd7);
          font-size: 13.5px;
        }
        .cylen-md thead tr { background: var(--sf, #f7f5f1); }
        .cylen-md th {
          padding: 9px 14px; font-size: 10.5px; font-weight: 700; text-align: left;
          color: var(--mu, #909090); text-transform: uppercase; letter-spacing: 0.07em;
          border-bottom: 1.5px solid var(--bd, #e0ddd7); white-space: nowrap;
        }
        .cylen-md td {
          padding: 8px 14px; color: var(--text, #141414);
          border-bottom: 1px solid var(--bd, #e0ddd7); white-space: nowrap;
        }
        .cylen-md tbody tr:last-child td { border-bottom: none; }
        .cylen-md tbody tr:hover td { background: var(--sf, #f7f5f1); }

        /* Math */
        .cylen-md .katex { font-size: 1em; }
        .cylen-md .katex-display {
          margin: 1.2rem 0; padding: 0.8rem 1rem;
          background: var(--sf, #f7f5f1); border: 1px solid var(--bd, #e0ddd7);
          border-radius: 12px; overflow-x: auto; text-align: center;
        }
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
// CODE BLOCK
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
    <div
      style={{
        margin: '12px 0', border: '1.5px solid var(--bd, #e0ddd7)',
        borderRadius: 14, overflow: 'hidden',
        background: 'var(--sf, #f7f5f1)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', borderBottom: '1px solid var(--bd, #e0ddd7)',
          background: 'var(--bg, #f2f0eb)',
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--mu, #909090)', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          {label}
        </span>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: copied ? 'var(--text, #141414)' : 'var(--sf, #f7f5f1)',
            color: copied ? 'var(--bg, #f2f0eb)' : 'var(--mu, #909090)',
            border: '1px solid var(--bd, #e0ddd7)',
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
        customStyle={{
          margin: 0, padding: '14px', fontSize: '13px',
          lineHeight: '1.65', background: 'transparent', borderRadius: 0,
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
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(0,0,0,0.96)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', zIndex: 10,
          }}>
            <button
              onClick={() => setViewerOpen(false)}
              style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={20} color="rgba(255,255,255,0.9)" />
            </button>
            <button
              onClick={(e) => downloadImage(e, images[currentIndex])}
              style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Download size={18} color="rgba(255,255,255,0.9)" />
            </button>
          </div>

          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              src={images[currentIndex]} alt="Fullscreen"
              style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
              onDragEnd={(_e: any, { offset }: any) => {
                if (offset.x < -50 && currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
                else if (offset.x > 50 && currentIndex > 0) setCurrentIndex(p => p - 1);
              }}
            />
            {images.length > 1 && currentIndex > 0 && (
              <button onClick={handlePrev} style={{ position: 'absolute', left: 16, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={26} color="#fff" />
              </button>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <button onClick={handleNext} style={{ position: 'absolute', right: 16, width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={26} color="#fff" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div style={{ width: '100%', marginBottom: 8, display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {images.length === 1 && (
          <div
            onClick={() => openViewer(0)}
            style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd, #e0ddd7)', maxWidth: '85%' }}
          >
            <img src={images[0]} alt="Uploaded" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
          </div>
        )}
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
    return <div style={{ padding: 16, background: 'var(--sf)', color: 'var(--mu)', borderRadius: 12, border: '1px solid var(--bd)' }}>Gagal memuat slide.</div>;
  }
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((slide: any, i: number) => {
      if (i > 0) doc.addPage();
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, 297, 210, 'F');
      doc.setFontSize(24); doc.text(slide.title, 20, 30);
      doc.setFontSize(14); doc.text(doc.splitTextToSize(slide.content, 250), 20, 50);
    });
    doc.save('presentation.pdf');
  };
  return (
    <div style={{ margin: '12px 0', border: '1.5px solid var(--bd, #e0ddd7)', borderRadius: 14, overflow: 'hidden', background: 'var(--sf)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--bd)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu)' }}>
          <Presentation size={16} />
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}>Slide</span>
        </div>
        <button onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sf)', border: '1px solid var(--bd)', padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
          <Download size={12} /> PDF
        </button>
      </div>
      <div style={{ aspectRatio: '16/9', padding: '32px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--sf)', position: 'relative', minHeight: 200 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: 'var(--text)', margin: '0 0 14px' }}>{slides[currentSlide]?.title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--mu)', margin: 0 }}>{slides[currentSlide]?.content}</p>
        <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 10, fontWeight: 600, color: 'var(--mu)', opacity: 0.5 }}>{currentSlide + 1} / {slides.length}</div>
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', opacity: currentSlide === 0 ? 0.25 : 1, color: 'var(--text)' }}><ChevronLeft size={18} /></button>
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_: any, i: number) => (
            <div key={i} onClick={() => setCurrentSlide(i)} style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === currentSlide ? 'var(--text, #141414)' : 'var(--bd, #e0ddd7)', opacity: i === currentSlide ? 1 : 0.5 }} />
          ))}
        </div>
        <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', opacity: currentSlide === slides.length - 1 ? 0.25 : 1, color: 'var(--text)' }}><ChevronRight size={18} /></button>
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
    <div style={{ margin: '12px 0', background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu)' }}>
          <FileText size={15} />
          <span style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dokumen</span>
        </div>
        <button onClick={exportPDF} style={{ padding: 6, background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8, cursor: 'pointer' }}>
          <Download size={14} color="var(--mu)" />
        </button>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// HTML PREVIEW
// ─────────────────────────────────────────────
const HtmlPreview = memo(({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => { setCopied(false); setShowMenu(false); }, 1800); };
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
        style={{
          margin: '10px 0', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', background: 'var(--sf)', border: '1.5px solid var(--bd)',
          borderRadius: 14, cursor: 'pointer', boxShadow: '0 1px 5px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--mu)' }}>
          <Code size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Simulasi Visual</div>
          <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 2 }}>HTML · Ketuk untuk buka</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: 56, background: 'var(--bg)', borderBottom: '1.5px solid var(--bd)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setIsExpanded(false)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu)', display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>Simulasi Visual</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu)', display: 'flex' }}>
            <MoreVertical size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 410 }} onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={{ duration: 0.12 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 420, width: 160, background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', padding: 4 }}
                >
                  <button onClick={handleCopy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                  <div style={{ height: 1, background: 'var(--bd)', margin: '2px 8px' }} />
                  <button onClick={handleDownload} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}>
                    <Download size={14} /> Unduh HTML
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div style={{ flex: 1, background: '#fff', position: 'relative' }}>
        <iframe srcDoc={content} title="Preview" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
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
    <div style={{ margin: '12px 0', padding: '16px 18px', background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 14, position: 'relative', boxShadow: '0 1px 5px rgba(0,0,0,0.04)' }}>
      <button
        onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: 'absolute', top: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
          border: '1px solid var(--bd)', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          background: copied ? 'var(--text, #141414)' : 'var(--bg)',
          color: copied ? 'var(--bg)' : 'var(--text)',
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div style={{ fontSize: 15, lineHeight: 1.72, color: 'var(--text)', paddingRight: 80, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{content}</div>
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
    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {replyText && (
        <div style={{ margin: '8px 10px 4px', background: 'rgba(0,0,0,0.06)', borderLeft: '2.5px solid rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '0 10px 10px 10px' }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(0,0,0,0.4)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI</span>
          <span style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>{replyText}</span>
        </div>
      )}
      <div
        onClick={onClick}
        style={{ padding: replyText ? '6px 14px 12px' : '12px 14px', cursor: 'pointer' }}
      >
        <span style={{ fontSize: 15, lineHeight: 1.7, wordBreak: 'break-word', color: 'var(--text, #141414)' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '…' : '')}
        </span>
      </div>
      {isLong && (
        <button
          onClick={handleToggle}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px 10px', fontSize: 11.5, fontWeight: 600, opacity: 0.45, cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text, #141414)' }}
        >
          {expanded ? <><ChevronUp size={13} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={13} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────
// AI BUBBLE LOADING — clear, bold dots
// ─────────────────────────────────────────────
const AILoadingBubble = () => (
  <div
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '12px 18px',
      background: 'var(--sf, #f7f5f1)',
      border: '1.5px solid var(--bd, #e0ddd7)',
      borderRadius: '6px 16px 16px 16px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
    }}
  >
    <LoadingDots />
  </div>
);

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

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
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
      pdf:   { icon: <FileText size={18} />, text: 'Menyusun dokumen PDF…' },
      docs:  { icon: <FileText size={18} />, text: 'Membuat file Word…' },
      excel: { icon: <List size={18} />, text: 'Menyusun laporan Excel…' },
      ppt:   { icon: <Presentation size={18} />, text: 'Mendesain slide PPT…' },
      image: { icon: <Palette size={18} />, text: 'Melukis gambar…' },
      ebook: { icon: <Bookmark size={18} />, text: 'Merancang Ebook…' },
    };
    const current = statusMap[activityStatus as keyof typeof statusMap];

    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', margin: '12px 0 4px' }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 18px',
            background: 'var(--sf, #f7f5f1)',
            border: '1.5px solid var(--bd, #e0ddd7)',
            borderRadius: '6px 16px 16px 16px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ color: 'var(--mu, #909090)', display: 'flex' }}>{current?.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text, #141414)' }}>
            {current?.text}
          </span>
          <LoadingDots />
        </div>
      </div>
    );
  }

  // ── AUTO REMINDER ──
  if (!isUser && msg.isAutoReminder) {
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'flex-start', margin: '16px 0' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{
            width: '90%', maxWidth: 440, background: 'transparent',
            border: '1.5px solid var(--bd, #e0ddd7)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ borderLeft: '2.5px solid var(--bd)', paddingLeft: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Clock size={11} color="var(--mu)" />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mu)' }}>Pengingat</span>
            </div>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--mu)', lineHeight: 1.55, margin: 0 }}>"{msg.quotedText}"</p>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
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
      PDF:   <FileText size={17} color="var(--mu)" />,
      DOCS:  <FileText size={17} color="var(--mu)" />,
      EXCEL: <List size={17} color="var(--mu)" />,
      PPT:   <Presentation size={17} color="var(--mu)" />,
      EBOOK: <Bookmark size={17} color="var(--mu)" />,
    };
    fileLinkElement = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, marginTop: 4, width: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <a
          href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 14,
            boxShadow: '0 1px 5px rgba(0,0,0,0.05)', textDecoration: 'none',
            maxWidth: '85%',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icons[type]}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{fileName}</span>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--mu)', marginTop: 1 }}>Klik untuk unduh {type}</span>
          </div>
          <Download size={15} color="var(--mu)" style={{ opacity: 0.6 }} />
        </a>
      </div>
    );
  }

  // ── EMPTY STREAMING (AI thinking) ──
  if (!isUser && isStreaming && (!displayContent || displayContent.trim() === '')) {
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', margin: '4px 0' }}>
        <AILoadingBubble />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div
      id={`message-${msgIndex}`}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        position: 'relative', zIndex: showUserMenu ? 100 : 10,
        gap: 4,
      }}
    >
      {/* Timestamp + pin */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {msg.senderName && (
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, marginBottom: 2 }}>{msg.senderName}</span>
          )}
          <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1, opacity: 0.6 }}>{msg.timestamp}</span>
        </div>
        {msg.pinned && <Pin size={10} color="var(--mu)" style={{ opacity: 0.7 }} />}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, width: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          {msg.pdfs.map((pdf: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--sf)', border: '1.5px solid var(--bd)', borderRadius: 14, maxWidth: '85%' }}>
              <FileText size={17} color="var(--mu)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{pdf.name || 'Dokumen Terlampir'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Message bubble */}
      {displayContent && (
        <div
          style={isUser ? {
            /* USER BUBBLE — elegant grey, NOT black */
            background: 'var(--sf, #f5f3ef)',
            border: '1.5px solid var(--bd, #dedad4)',
            borderRadius: '16px 4px 16px 16px',
            color: 'var(--text, #141414)',
            maxWidth: '85%',
            boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
            position: 'relative',
          } : {
            /* AI BUBBLE — transparent, full width */
            background: 'transparent',
            color: 'var(--text, #141414)',
            padding: 0,
            width: '100%',
          }}
        >
          {isUser ? (
            <>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
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
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      zIndex: 99999, width: 152,
                      background: 'var(--sf, #f5f3ef)',
                      border: '1.5px solid var(--bd, #dedad4)',
                      borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                      display: 'flex', flexDirection: 'column', padding: 4,
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onResend?.(displayContent); setShowUserMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}
                    >
                      <RotateCcw size={14} color="var(--mu)" /> Ulangi
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        let clean = displayContent;
                        const m = displayContent.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
                        if (m) clean = m[2];
                        onEdit?.(clean); setShowUserMenu(false);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}
                    >
                      <Edit2 size={14} color="var(--mu)" /> Edit
                    </button>
                    <div style={{ height: 1, background: 'var(--bd)', margin: '2px 8px', opacity: 0.6 }} />
                    <button
                      onClick={handleUserMenuCopy}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}
                    >
                      {userMenuCopied ? <><Check size={14} color="var(--text)" /> Tersalin</> : <><Copy size={14} color="var(--mu)" /> Salin</>}
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
              onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
              style={{ width: '100%' }}
            >
              {isStreaming
                ? <StreamingText content={displayContent} isStreaming={isStreaming} />
                : <MarkdownRenderer content={displayContent} />
              }
            </motion.div>
          )}
        </div>
      )}

      {/* ACTION ICONS — only after stream done */}
      {!isUser && (
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 4 }}
            >
              {[
                { icon: copied ? <Check size={16} /> : <Copy size={16} />, onClick: handleCopy, active: copied },
                { icon: <Share2 size={16} />, onClick: () => {}, active: false },
                { icon: <ThumbsUp size={16} />, onClick: () => setLiked(l => l === 'up' ? null : 'up'), active: liked === 'up' },
                { icon: <ThumbsDown size={16} />, onClick: () => setLiked(l => l === 'down' ? null : 'down'), active: liked === 'down' },
                { icon: <RotateCcw size={16} />, onClick: () => onRegenerate?.(msgIndex), active: false },
                { icon: msg.pinned ? <PinOff size={16} /> : <Pin size={16} />, onClick: () => onTogglePin?.(msgIndex), active: !!msg.pinned },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                    color: btn.active ? 'var(--text, #141414)' : 'var(--mu, #909090)',
                    opacity: btn.active ? 1 : 0.55,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Suggestions */}
      {!isUser && isLast && suggestions && suggestions.length > 0 && showActions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 28 }}>
          {suggestions.map((s: string, i: number) => (
            <button
              key={i}
              onClick={() => onSuggest?.(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', maxWidth: '100%' }}
            >
              <svg width="16" height="9" viewBox="0 0 16 9" fill="none" stroke="var(--bd, #e0ddd7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M2 1 L2 3.5" /><path d="M2 3.5 Q2 7 6 7 L13 7" /><polyline points="10,5 13,7 10,9" />
              </svg>
              <span style={{ fontSize: 14.5, color: 'var(--mu, #909090)', lineHeight: 1.45 }}>{s}</span>
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
