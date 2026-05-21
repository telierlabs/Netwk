// ─────────────────────────────────────────────
// DIAGRAM WRAPPER — src/components/chat/components/ui/DiagramWrapper.tsx
// Tap-to-fullscreen container for any diagram
// ─────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { DiagramLightbox } from './DiagramLightbox';
import type { DiagramWrapperProps } from '../../types';

export const DiagramWrapper = ({ title, children }: DiagramWrapperProps) => {
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
        <div ref={bodyRef} style={{ padding: '20px 16px 16px' }}>
          {children}
        </div>
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
