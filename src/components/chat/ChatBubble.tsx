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
  Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock, List, Palette, ArrowLeft, ZoomIn,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════
// LOADING DOTS
// ═══════════════════════════════════════════════════════════
const LoadingDots = () => (
  <>
    <style>{`
      @keyframes ldB { 0%,80%,100%{transform:scale(0.65);opacity:0.3} 40%{transform:scale(1);opacity:1} }
    `}</style>
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--text, #141414)', display: 'inline-block',
          animation: `ldB 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  </>
);

// ═══════════════════════════════════════════════════════════
// DIAGRAM LOADING STATE — spinner centered, no code flicker
// ═══════════════════════════════════════════════════════════
const DiagramLoading = () => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '36px 20px', gap: 14,
    background: 'var(--sf, #f7f5f1)',
    borderRadius: 16,
    minHeight: 120,
  }}>
    <style>{`
      @keyframes spinRing {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '2.5px solid var(--bd, #e0ddd7)',
      borderTopColor: 'var(--text, #141414)',
      animation: 'spinRing 0.75s linear infinite',
      flexShrink: 0,
    }} />
    <span style={{
      fontSize: 13, fontWeight: 500,
      color: 'var(--mu, #909090)',
      letterSpacing: '0.01em',
    }}>Membuat diagram...</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
// DIAGRAM ERROR STATE — simple, no code shown
// ═══════════════════════════════════════════════════════════
const DiagramError = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px',
    background: 'var(--sf, #f7f5f1)',
    borderRadius: 16,
    color: 'var(--mu, #909090)',
    fontSize: 13,
  }}>
    Gagal membuat diagram
  </div>
);

// ═══════════════════════════════════════════════════════════
// DOWNLOAD PNG — uses html-to-image approach via canvas
// ═══════════════════════════════════════════════════════════
const downloadDiagramAsPng = async (el: HTMLElement, title: string) => {
  try {
    // Dynamically import html-to-image if available, else fallback
    const mod = await import('html-to-image').catch(() => null);
    if (mod) {
      const dataUrl = await mod.toPng(el, { cacheBust: true, pixelRatio: 3, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
      a.href = dataUrl;
      a.click();
      return;
    }
    // Fallback: html2canvas global
    if (typeof (window as any).html2canvas !== 'undefined') {
      const canvas = await (window as any).html2canvas(el, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true });
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      return;
    }
    // Last fallback: SVG serializer for mermaid diagrams
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.svg';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Download diagram failed:', err);
  }
};

// ═══════════════════════════════════════════════════════════
// DIAGRAM LIGHTBOX — fullscreen, zoom/pan, download PNG
// ═══════════════════════════════════════════════════════════
interface DiagramLightboxProps {
  open: boolean;
  title: string;
  contentEl: HTMLElement | null;
  onClose: () => void;
}

const DiagramLightbox = ({ open, title, contentEl, onClose }: DiagramLightboxProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef  = useRef<HTMLDivElement>(null);
  const hintRef   = useRef<HTMLDivElement>(null);
  const sc = useRef(1), tx = useRef(0), ty = useRef(0);
  const dragging = useRef(false), startX = useRef(0), startY = useRef(0);
  const initDist = useRef(0), initSc = useRef(1);
  const initTx = useRef(0), initTy = useRef(0);
  const midX0 = useRef(0), midY0 = useRef(0);
  const pinching = useRef(false);
  const MIN = 0.3, MAX = 5;
  const [downloading, setDownloading] = useState(false);

  const applyT = () => {
    if (!innerRef.current) return;
    innerRef.current.style.transform = `translate(${tx.current}px,${ty.current}px) scale(${sc.current})`;
  };

  const center = useCallback(() => {
    if (!canvasRef.current || !innerRef.current) return;
    const cw = canvasRef.current.clientWidth, ch = canvasRef.current.clientHeight;
    const iw = innerRef.current.offsetWidth, ih = innerRef.current.offsetHeight;
    const fit = Math.min((cw - 56) / iw, (ch - 96) / ih, 1.4);
    sc.current = fit;
    tx.current = (cw - iw * fit) / 2;
    ty.current = (ch - ih * fit) / 2;
    applyT();
  }, []);

  useEffect(() => {
    if (!open || !innerRef.current || !contentEl) return;
    const clone = contentEl.cloneNode(true) as HTMLElement;
    clone.style.cssText = 'pointer-events:none;width:580px;max-width:580px;';
    innerRef.current.innerHTML = '';
    innerRef.current.appendChild(clone);
    innerRef.current.style.transformOrigin = '0 0';
    requestAnimationFrame(() => requestAnimationFrame(center));
    const t = setTimeout(() => { if (hintRef.current) hintRef.current.style.opacity = '0'; }, 3000);
    return () => clearTimeout(t);
  }, [open, contentEl, center]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      tx.current = e.clientX - startX.current;
      ty.current = e.clientY - startY.current;
      applyT();
    };
    const onUp = () => {
      dragging.current = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX - tx.current;
    startY.current = e.clientY - ty.current;
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const r = canvasRef.current!.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    const ns = Math.max(MIN, Math.min(MAX, sc.current * f));
    tx.current = cx - (cx - tx.current) * (ns / sc.current);
    ty.current = cy - (cy - ty.current) * (ns / sc.current);
    sc.current = ns; applyT();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.touches);
    if (t.length === 1) {
      pinching.current = false; dragging.current = true;
      startX.current = t[0].clientX - tx.current;
      startY.current = t[0].clientY - ty.current;
    } else if (t.length === 2) {
      dragging.current = false; pinching.current = true;
      initDist.current = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
      initSc.current = sc.current; initTx.current = tx.current; initTy.current = ty.current;
      midX0.current = (t[0].clientX + t[1].clientX) / 2;
      midY0.current = (t[0].clientY + t[1].clientY) / 2;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.touches);
    if (t.length === 1 && dragging.current && !pinching.current) {
      tx.current = t[0].clientX - startX.current;
      ty.current = t[0].clientY - startY.current; applyT();
    } else if (t.length === 2 && pinching.current) {
      const dist = Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
      const midX = (t[0].clientX + t[1].clientX) / 2, midY = (t[0].clientY + t[1].clientY) / 2;
      const r = canvasRef.current!.getBoundingClientRect();
      const cx = midX0.current - r.left, cy = midY0.current - r.top;
      const ns = Math.max(MIN, Math.min(MAX, initSc.current * (dist / initDist.current)));
      tx.current = cx - (cx - initTx.current) * (ns / initSc.current) + (midX - midX0.current);
      ty.current = cy - (cy - initTy.current) * (ns / initSc.current) + (midY - midY0.current);
      sc.current = ns; applyT();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinching.current = false;
    if (e.touches.length === 0) dragging.current = false;
    if (e.touches.length === 1) {
      dragging.current = true;
      startX.current = e.touches[0].clientX - tx.current;
      startY.current = e.touches[0].clientY - ty.current;
    }
  };

  const lastTap = useRef(0);
  const onTouchEndDbl = (e: React.TouchEvent) => {
    if (e.changedTouches.length !== 1) return;
    const now = Date.now();
    if (now - lastTap.current < 300) center();
    lastTap.current = now;
  };

  const handleDownload = async () => {
    if (!contentEl || downloading) return;
    setDownloading(true);
    try {
      await downloadDiagramAsPng(contentEl, title);
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(6,6,6,0.97)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 64, zIndex: 10,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        background: 'linear-gradient(to bottom, rgba(6,6,6,0.98), transparent)',
      }}>
        <button onClick={onClose} style={lbBtnSt}>
          <ArrowLeft size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />
        </button>
        <span style={{
          flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.6)',
          fontSize: 13.5, fontWeight: 500, letterSpacing: '0.1px', pointerEvents: 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</span>
        <button onClick={handleDownload} style={{ ...lbBtnSt, opacity: downloading ? 0.5 : 1 }} disabled={downloading}>
          {downloading
            ? <div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spinRing 0.75s linear infinite' }} />
            : <Download size={17} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          }
        </button>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, zIndex: 10,
        background: 'linear-gradient(to top, rgba(6,6,6,0.55), transparent)', pointerEvents: 'none',
      }} />

      {/* Hint */}
      <div ref={hintRef} style={{
        position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)',
        zIndex: 11, pointerEvents: 'none', whiteSpace: 'nowrap',
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 30, padding: '6px 16px',
        color: 'rgba(255,255,255,0.42)', fontSize: 11.5,
        transition: 'opacity 1.2s ease',
      }}>
        Cubit untuk zoom · Seret untuk geser · Ketuk 2× untuk reset
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={e => { onTouchEnd(e); onTouchEndDbl(e); }}
        onDblClick={center}
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          touchAction: 'none', userSelect: 'none', cursor: 'grab',
        }}
      >
        <div ref={innerRef} style={{
          position: 'absolute', transformOrigin: '0 0',
          background: '#ffffff', borderRadius: 20,
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          overflow: 'hidden', willChange: 'transform',
        }} />
      </div>
    </div>,
    document.body
  );
};

const lbBtnSt: React.CSSProperties = {
  width: 40, height: 40,
  background: 'rgba(255,255,255,0.09)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '50%', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

// ═══════════════════════════════════════════════════════════
// DIAGRAM WRAPPER — tap = fullscreen, no header labels
// ═══════════════════════════════════════════════════════════
interface DiagramWrapperProps {
  title: string;
  children: React.ReactNode;
}

const DiagramWrapper = ({ title, children }: DiagramWrapperProps) => {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  const handleOpen = () => {
    setContentEl(bodyRef.current);
    setOpen(true);
  };

  return (
    <>
      <div
        onClick={handleOpen}
        style={{
          background: 'var(--sf, #f7f5f1)',
          border: '1.5px solid var(--bd, #e0ddd7)',
          borderRadius: 18,
          overflow: 'hidden',
          width: '100%',
          cursor: 'pointer',
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          userSelect: 'none',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform = '';
          el.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)';
        }}
      >
        {/* Diagram body — NO header, just the diagram */}
        <div ref={bodyRef} style={{ padding: '20px 16px 16px' }}>
          {children}
        </div>

        {/* Minimal footer hint */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--bd, #e0ddd7)',
          background: 'var(--bg, #f2f0eb)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <ZoomIn size={11} color="var(--mu, #909090)" />
            <span style={{ fontSize: 10.5, color: 'var(--mu, #909090)' }}>
              Ketuk untuk zoom & unduh
            </span>
          </div>
        </div>
      </div>

      <DiagramLightbox
        open={open}
        title={title}
        contentEl={contentEl}
        onClose={() => setOpen(false)}
      />
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// DIAGRAM RENDERERS
// ═══════════════════════════════════════════════════════════

// ── MINDMAP — radial/hub layout ──
interface MindmapBranch { label: string; children: string[]; }
interface MindmapData { title: string; center: string; branches: MindmapBranch[]; num?: string; }

const MindmapDiagram = ({ data }: { data: MindmapData }) => {
  const cols = Math.min(data.branches.length, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      {/* Center node */}
      <div style={{
        background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
        padding: '10px 24px', borderRadius: 32,
        fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}>{data.center}</div>

      {/* Connector */}
      <svg width="100%" height="24" style={{ overflow: 'visible', flexShrink: 0 }}>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--bd,#e0ddd7)" strokeWidth="1.5" />
      </svg>

      {/* Branch grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10, width: '100%',
      }}>
        {data.branches.map((b, bi) => (
          <div key={bi} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
            {/* Branch header */}
            <div style={{
              background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
              padding: '7px 10px', borderRadius: 10,
              fontSize: 12, fontWeight: 700, textAlign: 'center',
            }}>{b.label}</div>
            {/* Leaf nodes */}
            {b.children.map((c, ci) => (
              <div key={ci} style={{
                background: 'var(--bg, #f2f0eb)', color: 'var(--text, #141414)',
                border: '1.5px solid var(--bd, #e0ddd7)',
                padding: '7px 10px', borderRadius: 9,
                fontSize: 11.5, textAlign: 'center', lineHeight: 1.4,
                wordBreak: 'break-word',
              }}>{c}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── FLOW — branching layout, not straight column ──
interface FlowNode {
  id: string; label: string; sub?: string;
  role?: 'start' | 'end';
}
interface FlowRow { nodes: FlowNode[]; }
interface FlowData { title: string; rows: FlowRow[]; num?: string; }

const FlowDiagram = ({ data }: { data: FlowData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
    {data.rows.map((row, ri) => (
      <React.Fragment key={ri}>
        {/* Node row — auto-cols so they spread */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: row.nodes.length === 1 ? '1fr' : `repeat(${row.nodes.length}, 1fr)`,
          gap: 8, width: '100%',
        }}>
          {row.nodes.map((node, ni) => {
            const isDark = node.role === 'start' || node.role === 'end';
            return (
              <div key={ni} style={{
                background: isDark ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
                color: isDark ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
                border: isDark ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
                borderRadius: 11,
                padding: '10px 12px',
                textAlign: 'center',
                boxShadow: isDark ? '0 3px 12px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 650, lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}>{node.label}</div>
                {node.sub && (
                  <div style={{
                    fontSize: 11, opacity: 0.6, marginTop: 3,
                    lineHeight: 1.35, wordBreak: 'break-word',
                  }}>{node.sub}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Arrow between rows */}
        {ri < data.rows.length - 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 28, flexShrink: 0,
          }}>
            <svg width="14" height="20" viewBox="0 0 14 20">
              <line x1="7" y1="0" x2="7" y2="13" stroke="var(--bd,#d0cdc8)" strokeWidth="1.5" />
              <polygon points="7,20 2,12 12,12" fill="var(--bd,#d0cdc8)" />
            </svg>
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── TIMELINE — elegant vertical line ──
interface TimelineItem {
  phase: string; title: string; tags: string[]; empty?: boolean;
}
interface TimelineData { title: string; items: TimelineItem[]; num?: string; }

const TimelineDiagram = ({ data }: { data: TimelineData }) => (
  <div style={{ position: 'relative', paddingLeft: 28 }}>
    {/* Vertical line */}
    <div style={{
      position: 'absolute', left: 9, top: 8, bottom: 8,
      width: 2, background: 'var(--bd, #e0ddd7)', borderRadius: 2,
    }} />
    {data.items.map((item, i) => (
      <div key={i} style={{ position: 'relative', paddingBottom: i < data.items.length - 1 ? 20 : 0 }}>
        {/* Dot */}
        <div style={{
          position: 'absolute', left: -21, top: 4,
          width: 16, height: 16, borderRadius: '50%', boxSizing: 'border-box',
          background: item.empty ? 'var(--sf, #f7f5f1)' : 'var(--text, #141414)',
          border: item.empty ? '2px solid var(--bd, #e0ddd7)' : '3px solid var(--sf, #f7f5f1)',
          boxShadow: item.empty ? 'none' : '0 0 0 1.5px var(--text,#141414)',
        }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--mu, #909090)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
        }}>{item.phase}</div>
        <div style={{
          fontSize: 14, fontWeight: 650, color: 'var(--text, #141414)', marginBottom: 6,
          lineHeight: 1.3,
        }}>{item.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {item.tags.map((tag, ti) => (
            <span key={ti} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              border: '1px solid var(--bd, #e0ddd7)',
              color: 'var(--mu, #909090)',
              background: 'var(--bg, #f2f0eb)',
            }}>{tag}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── RADIAL — concentric ring diagram ──
interface RadialRing { label: string; items: string[]; }
interface RadialData { title: string; center: string; rings: RadialRing[]; num?: string; }

const RadialDiagram = ({ data }: { data: RadialData }) => {
  const ringColors = [
    'var(--text, #141414)',
    '#3a3a3a', '#5a5a5a', '#8a8a8a',
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Center */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, textAlign: 'center',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>{data.center}</div>

      {/* Rings as rows */}
      {data.rings.map((ring, ri) => (
        <div key={ri} style={{ width: '100%' }}>
          {/* Ring label */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--mu, #909090)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            textAlign: 'center', marginBottom: 6,
          }}>{ri + 1}. {ring.label}</div>
          {/* Items in ring */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {ring.items.map((item, ii) => (
              <div key={ii} style={{
                background: ri === 0 ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
                color: ri === 0 ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
                border: ri === 0 ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
                borderRadius: 9, padding: '7px 13px',
                fontSize: 12, fontWeight: 550,
                wordBreak: 'break-word', textAlign: 'center',
              }}>{item}</div>
            ))}
          </div>
          {ri < data.rings.length - 1 && (
            <div style={{ height: 1, background: 'var(--bd, #e0ddd7)', margin: '10px 0 0', opacity: 0.5 }} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── COMPARISON — two-column compare table ──
interface CompareCol { label: string; items: string[]; }
interface CompareData { title: string; columns: CompareCol[]; num?: string; }

const CompareDiagram = ({ data }: { data: CompareData }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.columns.length, 2)}, 1fr)`, gap: 10 }}>
    {data.columns.map((col, ci) => (
      <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          background: ci === 0 ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
          color: ci === 0 ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
          border: ci === 0 ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
          padding: '8px 12px', borderRadius: 10,
          fontSize: 12.5, fontWeight: 700, textAlign: 'center',
        }}>{col.label}</div>
        {col.items.map((item, ii) => (
          <div key={ii} style={{
            background: 'var(--bg, #f2f0eb)', color: 'var(--text, #141414)',
            border: '1.5px solid var(--bd, #e0ddd7)',
            padding: '7px 10px', borderRadius: 9,
            fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word',
          }}>{item}</div>
        ))}
      </div>
    ))}
  </div>
);

// ── CYCLE — circular flow ──
interface CycleData { title: string; steps: { label: string; sub?: string }[]; num?: string; }

const CycleDiagram = ({ data }: { data: CycleData }) => {
  const n = data.steps.length;
  const angleStep = (2 * Math.PI) / n;
  const cx = 120, cy = 120, r = 80;
  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', minHeight: 200 }}>
      <svg
        viewBox="0 0 240 240"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        {/* Ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bd,#e0ddd7)" strokeWidth="1.5" strokeDasharray="6 4" />
        {/* Center */}
        <circle cx={cx} cy={cy} r={22} fill="var(--text,#141414)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">CYCLE</text>

        {data.steps.map((step, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const nx = cx + r * Math.cos(angle);
          const ny = cy + r * Math.sin(angle);
          const lx = cx + (r + 36) * Math.cos(angle);
          const ly = cy + (r + 36) * Math.sin(angle);

          return (
            <g key={i}>
              {/* Dot on ring */}
              <circle cx={nx} cy={ny} r={5} fill="var(--text,#141414)" />
              {/* Label box */}
              <foreignObject x={lx - 32} y={ly - 16} width={64} height={36}>
                <div
                  style={{
                    background: 'var(--bg, #f2f0eb)',
                    border: '1.5px solid var(--bd, #e0ddd7)',
                    borderRadius: 8,
                    padding: '4px 6px',
                    fontSize: 10,
                    fontWeight: 650,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                    color: 'var(--text, #141414)',
                  }}
                >
                  {step.label}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Arrows */}
        {data.steps.map((_, i) => {
          const a1 = angleStep * i - Math.PI / 2 + 0.25;
          const a2 = angleStep * (i + 1) - Math.PI / 2 - 0.25;
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
          const mx = cx + r * Math.cos((a1 + a2) / 2), my = cy + r * Math.sin((a1 + a2) / 2);
          return (
            <path key={i} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none" stroke="var(--bd,#d0cdc8)" strokeWidth="1.2"
              markerEnd="url(#arr)" />
          );
        })}
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="var(--bd,#d0cdc8)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DIAGRAM BLOCK PARSER
// parses ```diagram-flow / diagram-mindmap / etc
// shows loading until parse done, error if fail
// NEVER shows raw code
// ═══════════════════════════════════════════════════════════
const DiagramBlock = memo(({ lang, raw }: { lang: string; raw: string }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [node, setNode] = useState<React.ReactNode>(null);
  const type = lang.replace('diagram-', '');

  useEffect(() => {
    setState('loading');
    // Small delay so we render loading spinner first (prevents flicker)
    const t = setTimeout(() => {
      try {
        const data = JSON.parse(raw);
        let rendered: React.ReactNode = null;
        switch (type) {
          case 'mindmap':
            rendered = (
              <DiagramWrapper title={data.title || 'Mind Map'}>
                <MindmapDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          case 'flow':
            rendered = (
              <DiagramWrapper title={data.title || 'Flow'}>
                <FlowDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          case 'timeline':
            rendered = (
              <DiagramWrapper title={data.title || 'Timeline'}>
                <TimelineDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          case 'radial':
            rendered = (
              <DiagramWrapper title={data.title || 'Radial'}>
                <RadialDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          case 'compare':
            rendered = (
              <DiagramWrapper title={data.title || 'Perbandingan'}>
                <CompareDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          case 'cycle':
            rendered = (
              <DiagramWrapper title={data.title || 'Siklus'}>
                <CycleDiagram data={data} />
              </DiagramWrapper>
            );
            break;
          default:
            setState('error');
            return;
        }
        setNode(rendered);
        setState('ok');
      } catch {
        setState('error');
      }
    }, 80);
    return () => clearTimeout(t);
  }, [raw, type]);

  if (state === 'loading') return <DiagramLoading />;
  if (state === 'error')   return <DiagramError />;
  return <>{node}</>;
});

// ═══════════════════════════════════════════════════════════
// MERMAID — silent error, no code dump, loading spinner
// ═══════════════════════════════════════════════════════════
const MermaidDiagram = memo(({ content }: { content: string }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [svgCode, setSvgCode] = useState('');
  const mountedRef = useRef(true);
  const isDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  useEffect(() => {
    mountedRef.current = true;
    setState('loading');
    setSvgCode('');

    const render = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'neutral',
          fontFamily: 'inherit',
          themeVariables: isDark
            ? { primaryColor: '#3a3a3a', primaryTextColor: '#e0e0e0', primaryBorderColor: '#505050', lineColor: '#6b6b6b', secondaryColor: '#2e2e2e', background: '#1e1e1e' }
            : { primaryColor: '#f0efed', primaryTextColor: '#1a1a1a', primaryBorderColor: '#d0cdc8', lineColor: '#a0a0a0', secondaryColor: '#e8e6e2', background: '#ffffff' },
        });
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const clean = content.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
        const { svg } = await mermaid.render(id, clean);
        if (!mountedRef.current) return;
        setSvgCode(svg);
        setState('ok');
      } catch {
        if (mountedRef.current) setState('error');
      }
    };
    render();
    return () => { mountedRef.current = false; };
  }, [content, isDark]);

  if (state === 'loading') return <DiagramLoading />;
  if (state === 'error')   return <DiagramError />;

  return (
    <DiagramWrapper title="Diagram">
      <div
        dangerouslySetInnerHTML={{ __html: svgCode }}
        style={{ maxWidth: '100%', overflowX: 'auto' }}
      />
    </DiagramWrapper>
  );
});

// ═══════════════════════════════════════════════════════════
// STREAMING TEXT
// ═══════════════════════════════════════════════════════════
interface StreamingTextProps { content: string; isStreaming: boolean; }

const StreamingText = memo(({ content, isStreaming }: StreamingTextProps) => {
  const [revealedLen, setRevealedLen] = useState(0);
  const prevRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BATCH = 6, MS = 28;

  useEffect(() => {
    const next = content;
    const prev = prevRef.current;
    if (next.length < prev.length) { prevRef.current = next; setRevealedLen(next.length); return; }
    if (next === prev) return;
    prevRef.current = next;
    if (!isStreaming) { setRevealedLen(next.length); return; }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRevealedLen(cur => {
        if (cur >= next.length) { clearInterval(timerRef.current!); return cur; }
        return Math.min(cur + BATCH, next.length);
      });
    }, MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [content, isStreaming]);

  return (
    <>
      <MarkdownRenderer content={content.slice(0, revealedLen)} />
      {isStreaming && revealedLen >= content.length && (
        <span aria-hidden style={{
          display: 'inline-block', width: 2, height: '1.1em',
          background: 'var(--text)', borderRadius: 2,
          marginLeft: 2, verticalAlign: 'middle', opacity: 0.6,
          animation: 'cursorBlink 0.55s step-end infinite',
        }} />
      )}
    </>
  );
});

// ═══════════════════════════════════════════════════════════
// MARKDOWN RENDERER
// ═══════════════════════════════════════════════════════════
const MarkdownRenderer = memo(({ content }: { content: string }) => (
  <div className="cylen-md" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
    <style>{`
      @keyframes cursorBlink { 0%,100%{opacity:0.6} 50%{opacity:0} }
      @keyframes spinRing { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
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
          // Mermaid — loading spinner, no flicker
          if (lang === 'mermaid') return <MermaidDiagram content={raw} />;
          // Custom diagram types — loading spinner, no code shown
          if (lang.startsWith('diagram-')) return <DiagramBlock lang={lang} raw={raw} />;
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
));

// ═══════════════════════════════════════════════════════════
// CODE BLOCK
// ═══════════════════════════════════════════════════════════
const CodeBlock = memo(({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript' : lang === 'nextjs' ? 'jsx' : lang === 'tailwind' ? 'css' : lang || 'text';
  return (
    <div style={{ margin: '12px 0', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, overflow: 'hidden', background: 'var(--sf,#f7f5f1)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--bd,#e0ddd7)', background: 'var(--bg,#f2f0eb)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--mu,#909090)', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: copied ? 'var(--text,#141414)' : 'var(--sf,#f7f5f1)', color: copied ? 'var(--bg,#f2f0eb)' : 'var(--mu,#909090)', border: '1px solid var(--bd,#e0ddd7)' }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter style={prism} language={prismLang} PreTag="div" customStyle={{ margin: 0, padding: '14px', fontSize: '13px', lineHeight: '1.65', background: 'transparent', borderRadius: 0 }}>
        {content}
      </SyntaxHighlighter>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// SMART IMAGE GALLERY
// ═══════════════════════════════════════════════════════════
const SmartImageGallery = memo(({ images, isUser }: { images: string[]; isUser: boolean }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const downloadImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a'); a.href = url; a.download = `image_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const viewerContent = (
    <AnimatePresence>
      {viewerOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10 }}>
            <button onClick={() => setViewerOpen(false)} style={{ ...lbBtnSt }}>
              <ArrowLeft size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </button>
            <button onClick={(e) => downloadImage(e, images[currentIndex])} style={{ ...lbBtnSt }}>
              <Download size={17} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </button>
          </div>
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.img key={currentIndex} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              src={images[currentIndex]} alt="" style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
              onDragEnd={(_e: any, { offset }: any) => {
                if (offset.x < -50 && currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
                else if (offset.x > 50 && currentIndex > 0) setCurrentIndex(p => p - 1);
              }}
            />
            {images.length > 1 && currentIndex > 0 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(p => p - 1); }} style={{ position: 'absolute', left: 16, ...lbBtnSt }}><ChevronLeft size={24} color="#fff" /></button>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(p => p + 1); }} style={{ position: 'absolute', right: 16, ...lbBtnSt }}><ChevronRight size={24} color="#fff" /></button>
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
          <div onClick={() => { setCurrentIndex(0); setViewerOpen(true); }} style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd,#e0ddd7)', maxWidth: '85%' }}>
            <img src={images[0]} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
          </div>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(viewerContent, document.body)}
    </>
  );
});

// ═══════════════════════════════════════════════════════════
// PRESENTATION RENDERER
// ═══════════════════════════════════════════════════════════
const PresentationRenderer = memo(({ content }: { content: string }) => {
  const [cur, setCur] = useState(0);
  let slides: any[] = [];
  try { slides = JSON.parse(content).slides || []; } catch { return null; }
  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((s: any, i: number) => { if (i > 0) doc.addPage(); doc.setFontSize(24); doc.text(s.title, 20, 30); doc.setFontSize(14); doc.text(doc.splitTextToSize(s.content, 250), 20, 50); });
    doc.save('presentation.pdf');
  };
  return (
    <div style={{ margin: '12px 0', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, overflow: 'hidden', background: 'var(--sf,#f7f5f1)' }}>
      <div style={{ background: 'var(--bg,#f2f0eb)', borderBottom: '1px solid var(--bd,#e0ddd7)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu,#909090)' }}><Presentation size={16} /><span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}>Slide</span></div>
        <button onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sf,#f7f5f1)', border: '1px solid var(--bd,#e0ddd7)', padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text,#141414)' }}><Download size={12} /> PDF</button>
      </div>
      <div style={{ aspectRatio: '16/9', padding: '32px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--sf,#f7f5f1)', position: 'relative', minHeight: 200 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, color: 'var(--text,#141414)', margin: '0 0 14px' }}>{slides[cur]?.title}</h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--mu,#909090)', margin: 0 }}>{slides[cur]?.content}</p>
        <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 10, fontWeight: 600, color: 'var(--mu,#909090)', opacity: 0.5 }}>{cur + 1} / {slides.length}</div>
      </div>
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bd,#e0ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg,#f2f0eb)' }}>
        <button disabled={cur === 0} onClick={() => setCur(s => s - 1)} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', opacity: cur === 0 ? 0.2 : 1, color: 'var(--text,#141414)' }}><ChevronLeft size={18} /></button>
        <div style={{ display: 'flex', gap: 6 }}>{slides.map((_: any, i: number) => <div key={i} onClick={() => setCur(i)} style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', background: i === cur ? 'var(--text,#141414)' : 'var(--bd,#e0ddd7)', opacity: i === cur ? 1 : 0.5 }} />)}</div>
        <button disabled={cur === slides.length - 1} onClick={() => setCur(s => s + 1)} style={{ padding: 6, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', opacity: cur === slides.length - 1 ? 0.2 : 1, color: 'var(--text,#141414)' }}><ChevronRight size={18} /></button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// DOCUMENT RENDERER
// ═══════════════════════════════════════════════════════════
const DocumentRenderer = memo(({ content }: { content: string }) => {
  const exportPDF = () => { const doc = new jsPDF(); doc.text(doc.splitTextToSize(content, 170), 20, 20); doc.save('document.pdf'); };
  return (
    <div style={{ margin: '12px 0', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bd,#e0ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg,#f2f0eb)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu,#909090)' }}><FileText size={15} /><span style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dokumen</span></div>
        <button onClick={exportPDF} style={{ padding: 6, background: 'var(--sf,#f7f5f1)', border: '1px solid var(--bd,#e0ddd7)', borderRadius: 8, cursor: 'pointer' }}><Download size={14} color="var(--mu,#909090)" /></button>
      </div>
      <div style={{ padding: '20px 24px' }}><Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown></div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// HTML PREVIEW
// ═══════════════════════════════════════════════════════════
const HtmlPreview = memo(({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => { setCopied(false); setShowMenu(false); }, 1800); };
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'simulasi.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setShowMenu(false);
  };

  if (!expanded) return (
    <div onClick={() => setExpanded(true)} style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, cursor: 'pointer' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg,#f2f0eb)', border: '1px solid var(--bd,#e0ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mu,#909090)' }}><Code size={18} /></div>
      <div><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text,#141414)' }}>Simulasi Visual</div><div style={{ fontSize: 11.5, color: 'var(--mu,#909090)', marginTop: 2 }}>HTML · Ketuk untuk buka</div></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg,#f2f0eb)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', height: 56, background: 'var(--bg,#f2f0eb)', borderBottom: '1.5px solid var(--bd,#e0ddd7)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setExpanded(false)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu,#909090)', display: 'flex' }}><ChevronLeft size={22} /></button>
          <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text,#141414)' }}>Simulasi Visual</span>
        </div>
        <div style={{ position: 'relative', display: 'flex' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu,#909090)', display: 'flex' }}><MoreVertical size={18} /></button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 410 }} onClick={() => setShowMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={{ duration: 0.12 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 420, width: 160, background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', padding: 4 }}>
                  <button onClick={handleCopy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text,#141414)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                  <div style={{ height: 1, background: 'var(--bd,#e0ddd7)', margin: '2px 8px' }} />
                  <button onClick={handleDownload} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text,#141414)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}><Download size={14} /> Unduh HTML</button>
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

// ═══════════════════════════════════════════════════════════
// COPY CARD
// ═══════════════════════════════════════════════════════════
const CopyCard = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ margin: '12px 0', padding: '16px 18px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, position: 'relative' }}>
      <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', border: '1px solid var(--bd,#e0ddd7)', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: copied ? 'var(--text,#141414)' : 'var(--bg,#f2f0eb)', color: copied ? 'var(--bg,#f2f0eb)' : 'var(--text,#141414)' }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div style={{ fontSize: 15, lineHeight: 1.72, color: 'var(--text,#141414)', paddingRight: 80, fontWeight: 500, whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// COLLAPSIBLE USER BUBBLE
// ═══════════════════════════════════════════════════════════
const CollapsibleUserBubble = memo(({ content, onClick }: { content: string; onClick: (e: React.MouseEvent) => void }) => {
  const [expanded, setExpanded] = useState(false);
  let replyText = null, actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {replyText && (
        <div style={{ margin: '8px 10px 4px', background: 'rgba(0,0,0,0.05)', borderLeft: '2.5px solid rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '0 10px 10px 10px' }}>
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
        <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 14px 10px', fontSize: 11.5, fontWeight: 600, opacity: 0.4, cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text,#141414)' }}>
          {expanded ? <><ChevronUp size={13} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={13} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════
// MAIN CHAT BUBBLE
// ═══════════════════════════════════════════════════════════
const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({
  msg, msgIndex, isLast, onResend, onEdit, onSuggest,
  onTogglePin, onSaveItem, onRegenerate, onSwipeToReply, suggestions,
  isStreaming = false, activityStatus = 'idle',
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuCopied, setUserMenuCopied] = useState(false);
  const showActions = !isStreaming;
  const isUser = msg.role === 'user';

  useEffect(() => {
    const handler = () => setShowUserMenu(false);
    if (showUserMenu) { document.addEventListener('mousedown', handler); document.addEventListener('touchstart', handler); }
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [showUserMenu]);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let t = msg.content;
    const m = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (m) t = m[2];
    navigator.clipboard.writeText(t);
    setUserMenuCopied(true); setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500);
  };

  // Activity status
  if (!isUser && isLast && activityStatus !== 'idle') {
    const MAP = {
      pdf: { icon: <FileText size={17} />, text: 'Menyusun PDF…' },
      docs: { icon: <FileText size={17} />, text: 'Membuat Word…' },
      excel: { icon: <List size={17} />, text: 'Menyusun Excel…' },
      ppt: { icon: <Presentation size={17} />, text: 'Mendesain slide…' },
      image: { icon: <Palette size={17} />, text: 'Melukis gambar…' },
      ebook: { icon: <Bookmark size={17} />, text: 'Merancang Ebook…' },
    };
    const cur = MAP[activityStatus as keyof typeof MAP];
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', alignItems: 'flex-start', width: '100%', margin: '10px 0 4px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: '6px 16px 16px 16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <span style={{ color: 'var(--mu,#909090)', display: 'flex' }}>{cur?.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text,#141414)' }}>{cur?.text}</span>
          <LoadingDots />
        </div>
      </div>
    );
  }

  // Auto reminder
  if (!isUser && msg.isAutoReminder) {
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'flex-start', margin: '16px 0' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ width: '90%', maxWidth: 440, border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 20, padding: 20 }}>
          <div style={{ borderLeft: '2.5px solid var(--bd,#e0ddd7)', paddingLeft: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Clock size={11} color="var(--mu,#909090)" />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mu,#909090)' }}>Pengingat</span>
            </div>
            <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--mu,#909090)', lineHeight: 1.55, margin: 0 }}>"{msg.quotedText}"</p>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text,#141414)', lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
        </motion.div>
      </div>
    );
  }

  // File link
  let displayContent = msg.content || '';
  let fileLinkElement: React.ReactNode = null;
  const fileMatch = displayContent.match(/^\[(PDF|DOCS|EXCEL|PPT|EBOOK)_FILE: "(.*?)"\]\((.*?)\)\n\n([\s\S]*)$/);
  if (fileMatch) {
    const [_, type, fileName, fileUrl, rest] = fileMatch;
    displayContent = rest;
    const icons: any = { PDF: <FileText size={17} color="var(--mu,#909090)" />, DOCS: <FileText size={17} color="var(--mu,#909090)" />, EXCEL: <List size={17} color="var(--mu,#909090)" />, PPT: <Presentation size={17} color="var(--mu,#909090)" />, EBOOK: <Bookmark size={17} color="var(--mu,#909090)" /> };
    fileLinkElement = (
      <div style={{ display: 'flex', marginBottom: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
        <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, textDecoration: 'none', maxWidth: '85%' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg,#f2f0eb)', border: '1px solid var(--bd,#e0ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icons[type]}</div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{fileName}</span>
            <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--mu,#909090)', marginTop: 1 }}>Klik untuk unduh {type}</span>
          </div>
          <Download size={15} color="var(--mu,#909090)" style={{ opacity: 0.6, marginLeft: 'auto' }} />
        </a>
      </div>
    );
  }

  // Empty streaming — loading dots only
  if (!isUser && isStreaming && (!displayContent || displayContent.trim() === '')) {
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', alignItems: 'flex-start', width: '100%', margin: '4px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 18px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: '6px 16px 16px 16px' }}>
          <LoadingDots />
        </div>
      </div>
    );
  }

  const actionBtns = [
    { icon: copied ? <Check size={19} strokeWidth={2.5} /> : <Copy size={19} strokeWidth={2} />, onClick: handleCopy, active: copied },
    { icon: <Share2 size={19} strokeWidth={2} />, onClick: () => {}, active: false },
    { icon: <ThumbsUp size={19} strokeWidth={liked === 'up' ? 2.5 : 2} />, onClick: () => setLiked(l => l === 'up' ? null : 'up'), active: liked === 'up' },
    { icon: <ThumbsDown size={19} strokeWidth={liked === 'down' ? 2.5 : 2} />, onClick: () => setLiked(l => l === 'down' ? null : 'down'), active: liked === 'down' },
    { icon: <RotateCcw size={19} strokeWidth={2} />, onClick: () => onRegenerate?.(msgIndex), active: false },
    { icon: msg.pinned ? <PinOff size={19} strokeWidth={2} /> : <Pin size={19} strokeWidth={2} />, onClick: () => onTogglePin?.(msgIndex), active: !!msg.pinned },
  ];

  return (
    <div
      id={`message-${msgIndex}`}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        position: 'relative', zIndex: showUserMenu ? 100 : 10, gap: 4,
      }}
    >
      {/* Timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        {msg.senderName && <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text,#141414)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{msg.senderName}</span>}
        <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: 'var(--mu,#909090)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>{msg.timestamp}</span>
        {msg.pinned && <Pin size={10} color="var(--mu,#909090)" style={{ opacity: 0.7 }} />}
      </div>

      {fileLinkElement}

      {((msg.images && msg.images.length > 0) || msg.image) && (
        <SmartImageGallery images={msg.images?.length ? msg.images : [msg.image!]} isUser={isUser} />
      )}

      {msg.pdfs && msg.pdfs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, width: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          {msg.pdfs.map((pdf: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, maxWidth: '85%' }}>
              <FileText size={17} color="var(--mu,#909090)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{pdf.name || 'Dokumen Terlampir'}</span>
            </div>
          ))}
        </div>
      )}

      {displayContent && (
        <div style={isUser ? {
          background: 'var(--sf, #f5f3ef)',
          border: '1.5px solid var(--bd, #dedad4)',
          borderRadius: '16px 4px 16px 16px',
          color: 'var(--text, #141414)',
          maxWidth: '85%',
          boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
          position: 'relative' as const,
        } : {
          background: 'transparent',
          color: 'var(--text, #141414)',
          padding: 0, width: '100%',
        }}>
          {isUser ? (
            <>
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}>
                <CollapsibleUserBubble content={displayContent} onClick={e => { e.stopPropagation(); setShowUserMenu(true); }} />
              </motion.div>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={{ duration: 0.12 }}
                    style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 99999, width: 152, background: 'var(--sf,#f5f3ef)', border: '1.5px solid var(--bd,#dedad4)', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', padding: 4 }}>
                    <button onClick={e => { e.stopPropagation(); onResend?.(displayContent); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}>
                      <RotateCcw size={14} color="var(--mu,#909090)" /> Ulangi
                    </button>
                    <button onClick={e => { e.stopPropagation(); let c = displayContent; const m = displayContent.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/); if (m) c = m[2]; onEdit?.(c); setShowUserMenu(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}>
                      <Edit2 size={14} color="var(--mu,#909090)" /> Edit
                    </button>
                    <div style={{ height: 1, background: 'var(--bd,#dedad4)', margin: '2px 8px', opacity: 0.6 }} />
                    <button onClick={handleUserMenuCopy} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text,#141414)', fontSize: 13, fontWeight: 500 }}>
                      {userMenuCopied ? <><Check size={14} color="var(--text,#141414)" /> Tersalin</> : <><Copy size={14} color="var(--mu,#909090)" /> Salin</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }} style={{ width: '100%' }}>
              {isStreaming
                ? <StreamingText content={displayContent} isStreaming={isStreaming} />
                : <MarkdownRenderer content={displayContent} />
              }
            </motion.div>
          )}
        </div>
      )}

      {/* Action icons */}
      {!isUser && (
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 5 }}
            >
              {actionBtns.map((btn, i) => (
                <button key={i} onClick={btn.onClick} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  display: 'flex', alignItems: 'center',
                  color: 'var(--text, #141414)',
                  opacity: btn.active ? 1 : 0.38,
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = btn.active ? '1' : '0.38')}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 26 }}>
          {suggestions.map((s: string, i: number) => (
            <button key={i} onClick={() => onSuggest?.(s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
              <svg width="16" height="9" viewBox="0 0 16 9" fill="none" stroke="var(--bd,#e0ddd7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M2 1 L2 3.5" /><path d="M2 3.5 Q2 7 6 7 L13 7" /><polyline points="10,5 13,7 10,9" />
              </svg>
              <span style={{ fontSize: 14.5, color: 'var(--mu,#909090)', lineHeight: 1.45 }}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatBubble = memo(ChatBubbleComponent, (prev, next) =>
  prev.msg.content === next.msg.content &&
  prev.msg.pinned === next.msg.pinned &&
  prev.isLast === next.isLast &&
  prev.isStreaming === next.isStreaming &&
  prev.activityStatus === next.activityStatus
);
