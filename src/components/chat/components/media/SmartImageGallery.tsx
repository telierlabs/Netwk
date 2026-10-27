// ─────────────────────────────────────────────
// SMART IMAGE GALLERY — src/components/chat/components/media/SmartImageGallery.tsx
// Single/multi image viewer with lightbox + download
//
// PERUBAHAN:
//   • FIX: sebelumnya cuma merender kalau images.length === 1, jadi kirim
//     2+ gambar = bubble kosong. Sekarang ada grid thumbnail:
//       1 gambar  → tampil besar (seperti sebelumnya)
//       2 gambar  → 2 kolom
//       3 gambar  → 1 lebar di atas + 2 kecil di bawah
//       4+ gambar → grid 2x2, kotak ke-4 diberi overlay "+N"
//   • Tap thumbnail membuka lightbox tepat di gambar yang diklik.
//   • Lightbox menampilkan counter "1 / 3" kalau gambarnya lebih dari satu.
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { lbBtnSt } from '../../constants';

interface SmartImageGalleryProps { images: string[]; isUser: boolean; }

const MAX_VISIBLE = 4;

export const SmartImageGallery = memo(({ images, isUser }: SmartImageGalleryProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openAt = (i: number) => { setCurrentIndex(i); setViewerOpen(true); };

  const downloadImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url; a.download = `image_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const safeIndex = Math.min(currentIndex, images.length - 1);

  const viewerContent = (
    <AnimatePresence>
      {viewerOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 10 }}>
            <button onClick={() => setViewerOpen(false)} style={lbBtnSt}>
              <ArrowLeft size={19} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </button>
            {images.length > 1 && (
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {safeIndex + 1} / {images.length}
              </span>
            )}
            <button onClick={(e) => downloadImage(e, images[safeIndex])} style={lbBtnSt}>
              <Download size={17} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </button>
          </div>

          {/* Image */}
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.img
              key={safeIndex}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              src={images[safeIndex]} alt=""
              style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
              onDragEnd={(_e: any, { offset }: any) => {
                if (offset.x < -50 && safeIndex < images.length - 1) setCurrentIndex(safeIndex + 1);
                else if (offset.x > 50 && safeIndex > 0) setCurrentIndex(safeIndex - 1);
              }}
            />
            {images.length > 1 && safeIndex > 0 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(safeIndex - 1); }} style={{ position: 'absolute', left: 16, ...lbBtnSt }}>
                <ChevronLeft size={24} color="#fff" />
              </button>
            )}
            {images.length > 1 && safeIndex < images.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(safeIndex + 1); }} style={{ position: 'absolute', right: 16, ...lbBtnSt }}>
                <ChevronRight size={24} color="#fff" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const visible = images.slice(0, MAX_VISIBLE);
  const extra = images.length - MAX_VISIBLE;

  return (
    <>
      <div style={{ width: '100%', marginBottom: 8, display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {/* 1 gambar: tampil besar */}
        {images.length === 1 && (
          <div onClick={() => openAt(0)}
            style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd,#e0ddd7)', maxWidth: '85%' }}>
            <img src={images[0]} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
          </div>
        )}

        {/* 2+ gambar: grid thumbnail */}
        {images.length > 1 && (
          <div
            style={{
              width: 'min(85%, 320px)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 3,
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--bd,#e0ddd7)',
              background: 'var(--bd,#e0ddd7)',
            }}
          >
            {visible.map((src, i) => {
              const isWide = images.length === 3 && i === 0;
              const showMore = extra > 0 && i === MAX_VISIBLE - 1;
              return (
                <div
                  key={i}
                  onClick={() => openAt(i)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    gridColumn: isWide ? 'span 2' : undefined,
                    aspectRatio: isWide ? '2 / 1' : '1 / 1',
                    background: 'var(--sf,#f7f5f1)',
                    overflow: 'hidden',
                  }}
                >
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {showMore && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      +{extra}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(viewerContent, document.body)}
    </>
  );
});
