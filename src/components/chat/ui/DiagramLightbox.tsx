// ─────────────────────────────────────────────
// DIAGRAM LIGHTBOX — src/components/chat/components/ui/DiagramLightbox.tsx
// Fullscreen zoom/pan/download viewer for diagrams
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { lbBtnSt } from '../../constants';
import { downloadDiagramAsPng } from '../../utils';
import type { DiagramLightboxProps } from '../../types';

export const DiagramLightbox = ({ open, title, contentEl, onClose }: DiagramLightboxProps) => {
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
    try { await downloadDiagramAsPng(contentEl, title); }
    finally { setDownloading(false); }
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
            : <Download size={17} color="rgba(255,255,255,0.9)" strokeWidth={2} />}
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
