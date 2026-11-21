// ─────────────────────────────────────────────
// PHOTO VIEWER — src/components/chat/components/media/PhotoViewer.tsx
// Penampil foto layar penuh DI DALAM aplikasi (foto yang diketuk tidak lagi membuka situs sumber):
//   • geser kiri / kanan dengan jari untuk pindah foto — TANPA tombol panah < >
//   • ketuk dua kali = zoom, saat zoom foto bisa digeser ke segala arah
//   • tarik ke bawah = tutup; tombol kembali di kiri atas; Esc / panah keyboard di desktop
//   • keterangan di bawah: judul foto + tautan "Foto: situs ↗" (hanya tautan ini yang membuka situs sumber)
// Dipakai oleh foto di jawaban AI (MediaBlocks, ImageStrip) dan foto kiriman user (SmartImageGallery).
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Download } from 'lucide-react';

export interface ViewerPhoto {
  src: string;
  title?: string;
  label?: string;
  site?: string;
  url?: string;      // halaman sumber (hanya dibuka lewat tautan keterangan)
  logo?: boolean;
}

const btn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 20, border: 'none', background: 'rgba(255,255,255,0.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)',
};

interface ViewerProps {
  photos: ViewerPhoto[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDownload?: (p: ViewerPhoto) => void;
}

const Viewer = ({ photos, index, onIndex, onClose, onDownload }: ViewerProps) => {
  const [zoom, setZoom] = useState(false);
  const safe = Math.min(Math.max(index, 0), photos.length - 1);
  const p = photos[safe];
  const lastTap = useRef(0);
  const dir = useRef(0);

  const go = useCallback((d: number) => {
    const n = safe + d;
    if (n < 0 || n >= photos.length) return;
    dir.current = d;
    setZoom(false);
    onIndex(n);
  }, [safe, photos.length, onIndex]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, onClose]);

  if (!p) return null;
  const caption = p.label || p.title || '';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#000', display: 'flex', flexDirection: 'column', touchAction: 'none' }}
    >
      {/* Atas: kembali · penghitung · unduh */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10, background: 'linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,0))' }}>
        <button type="button" onClick={onClose} style={btn} aria-label="Tutup">
          <ArrowLeft size={19} color="rgba(255,255,255,0.92)" strokeWidth={2} />
        </button>
        {photos.length > 1 && (
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{safe + 1} / {photos.length}</span>
        )}
        {onDownload
          ? <button type="button" onClick={() => onDownload(p)} style={btn} aria-label="Unduh"><Download size={17} color="rgba(255,255,255,0.92)" strokeWidth={2} /></button>
          : <span style={{ width: 40 }} />}
      </div>

      {/* Foto: geser kiri / kanan; ketuk dua kali = zoom */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence initial={false} custom={dir.current} mode="popLayout">
          <motion.img
            key={safe + '|' + p.src}
            src={p.src} alt={caption} referrerPolicy="no-referrer" draggable={false}
            custom={dir.current}
            initial={{ opacity: 0, x: dir.current * 60 }}
            animate={{ opacity: 1, x: 0, scale: zoom ? 2.2 : 1 }}
            exit={{ opacity: 0, x: dir.current * -60 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag dragSnapToOrigin={!zoom} dragElastic={zoom ? 0.05 : 0.35}
            dragConstraints={zoom ? { left: -400, right: 400, top: -500, bottom: 500 } : { left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={(_e: any, { offset }: any) => {
              if (zoom) return;
              if (Math.abs(offset.x) > 55 && Math.abs(offset.x) > Math.abs(offset.y)) go(offset.x < 0 ? 1 : -1);
              else if (offset.y > 110) onClose();
            }}
            onClick={() => {
              const now = Date.now();
              if (now - lastTap.current < 300) setZoom(z => !z);
              lastTap.current = now;
            }}
            style={{
              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: zoom ? 'grab' : 'zoom-in', userSelect: 'none',
              ...(p.logo ? { background: '#fff', padding: 18, boxSizing: 'border-box', borderRadius: 12, maxWidth: '92%' } : {}),
            }}
          />
        </AnimatePresence>
      </div>

      {/* Bawah: judul + tautan sumber */}
      {(caption || p.site) && (
        <div style={{ padding: '12px 18px calc(18px + env(safe-area-inset-bottom, 0px))', color: '#fff', background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,.65))' }}>
          {caption && <div style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{caption}</div>}
          {p.site && (p.url
            ? <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 3, fontSize: 12.5, color: 'rgba(255,255,255,0.72)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Foto: {p.site} ↗</a>
            : <span style={{ display: 'inline-block', marginTop: 3, fontSize: 12.5, color: 'rgba(255,255,255,0.72)' }}>Foto: {p.site}</span>)}
        </div>
      )}
    </motion.div>
  );
};

/** Pakai: const { open, node } = usePhotoViewer(); … onClick={() => open(photos, i)} … lalu render {node} di komponen. */
export function usePhotoViewer() {
  const [state, setState] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null);
  const open = useCallback((photos: ViewerPhoto[], index = 0) => { if (photos.length > 0) setState({ photos, index }); }, []);
  const close = useCallback(() => setState(null), []);
  const node = typeof document !== 'undefined'
    ? createPortal(
        <AnimatePresence>
          {state && <Viewer key="viewer" photos={state.photos} index={state.index} onIndex={i => setState(s => (s ? { ...s, index: i } : s))} onClose={close} />}
        </AnimatePresence>,
        document.body,
      )
    : null;
  return { open, node };
}

/** Versi dengan tombol unduh (foto kiriman user). */
export const PhotoViewerWithDownload = ({ photos, index, onIndex, onClose, onDownload }: ViewerProps) =>
  typeof document === 'undefined' ? null : createPortal(
    <AnimatePresence>
      <Viewer key="viewer" photos={photos} index={index} onIndex={onIndex} onClose={onClose} onDownload={onDownload} />
    </AnimatePresence>,
    document.body,
  );
