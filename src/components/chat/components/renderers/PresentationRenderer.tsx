// ─────────────────────────────────────────────
// PRESENTATION & DOCUMENT RENDERERS
// src/components/chat/components/renderers/PresentationRenderer.tsx
// PresentationRenderer · DocumentRenderer
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import { Presentation, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ── Presentation Slides ───────────────────────
export const PresentationRenderer = memo(({ content }: { content: string }) => {
  const [cur, setCur] = useState(0);
  let slides: any[] = [];
  try { slides = JSON.parse(content).slides || []; } catch { return null; }

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((s: any, i: number) => {
      if (i > 0) doc.addPage();
      doc.setFontSize(24); doc.text(s.title, 20, 30);
      doc.setFontSize(14); doc.text(doc.splitTextToSize(s.content, 250), 20, 50);
    });
    doc.save('presentation.pdf');
  };

  return (
    <div style={{
      margin: '12px 0',
      border: '1.5px solid var(--bd,#e0ddd7)',
      borderRadius: 16, overflow: 'hidden',
      background: 'var(--sf,#f7f5f1)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      animation: 'card-appear 0.35s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <style>{`
        @keyframes card-appear {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'var(--bg,#f2f0eb)',
        borderBottom: '1px solid var(--bd,#e0ddd7)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu,#909090)' }}>
          <Presentation size={15} />
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}>
            Presentasi · {slides.length} slide
          </span>
        </div>
        <button onClick={exportPDF} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--sf,#f7f5f1)',
          border: '1px solid var(--bd,#e0ddd7)',
          padding: '5px 12px', borderRadius: 10,
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          color: 'var(--text,#141414)',
          transition: 'all 0.15s',
        }}>
          <Download size={12} /> Unduh PDF
        </button>
      </div>

      {/* Slide body */}
      <div style={{
        aspectRatio: '16/9',
        padding: '32px 36px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: 'var(--sf,#f7f5f1)',
        position: 'relative', minHeight: 200,
      }}>
        <div style={{
          position: 'absolute', top: 12, left: 16,
          fontSize: 9.5, fontWeight: 700, color: 'var(--mu,#909090)',
          textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5,
        }}>
          Slide {cur + 1}
        </div>
        <h2 style={{
          fontSize: 20, fontWeight: 760, color: 'var(--text,#141414)',
          margin: '0 0 12px', lineHeight: 1.3, letterSpacing: '-0.015em',
        }}>
          {slides[cur]?.title}
        </h2>
        <p style={{
          fontSize: 14, lineHeight: 1.75,
          color: 'var(--mu,#909090)', margin: 0,
        }}>
          {slides[cur]?.content}
        </p>
        <div style={{
          position: 'absolute', bottom: 12, right: 16,
          fontSize: 10, fontWeight: 600,
          color: 'var(--mu,#909090)', opacity: 0.4,
        }}>
          {cur + 1} / {slides.length}
        </div>
      </div>

      {/* Footer navigation */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--bd,#e0ddd7)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg,#f2f0eb)',
      }}>
        <button
          disabled={cur === 0}
          onClick={() => setCur(s => s - 1)}
          style={{
            padding: 7, borderRadius: 10, border: 'none',
            background: cur === 0 ? 'transparent' : 'var(--sf,#f7f5f1)',
            cursor: cur === 0 ? 'default' : 'pointer',
            opacity: cur === 0 ? 0.2 : 1,
            color: 'var(--text,#141414)',
            transition: 'all 0.15s',
          }}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_: any, i: number) => (
            <div
              key={i}
              onClick={() => setCur(i)}
              style={{
                width: i === cur ? 16 : 6,
                height: 6, borderRadius: 3,
                cursor: 'pointer',
                background: i === cur ? 'var(--text,#141414)' : 'var(--bd,#e0ddd7)',
                opacity: i === cur ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>

        <button
          disabled={cur === slides.length - 1}
          onClick={() => setCur(s => s + 1)}
          style={{
            padding: 7, borderRadius: 10, border: 'none',
            background: cur === slides.length - 1 ? 'transparent' : 'var(--sf,#f7f5f1)',
            cursor: cur === slides.length - 1 ? 'default' : 'pointer',
            opacity: cur === slides.length - 1 ? 0.2 : 1,
            color: 'var(--text,#141414)',
            transition: 'all 0.15s',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
});

// ── Document Renderer ─────────────────────────
export const DocumentRenderer = memo(({ content }: { content: string }) => {
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(content, 170), 20, 20);
    doc.save('document.pdf');
  };

  return (
    <div style={{
      margin: '12px 0',
      background: 'var(--sf,#f7f5f1)',
      border: '1.5px solid var(--bd,#e0ddd7)',
      borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      animation: 'card-appear 0.35s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <style>{`
        @keyframes card-appear {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--bd,#e0ddd7)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg,#f2f0eb)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu,#909090)' }}>
          <FileText size={15} />
          <span style={{ fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dokumen</span>
        </div>
        <button
          onClick={exportPDF}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px',
            background: 'var(--sf,#f7f5f1)',
            border: '1px solid var(--bd,#e0ddd7)',
            borderRadius: 10, cursor: 'pointer',
            fontSize: 11, fontWeight: 700,
            color: 'var(--text,#141414)',
          }}
        >
          <Download size={12} /> Unduh PDF
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px' }}>
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
});
