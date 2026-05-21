// ─────────────────────────────────────────────
// SMART IMAGE GALLERY — src/components/chat/components/media/SmartImageGallery.tsx
// Single/multi image viewer with lightbox + download
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { lbBtnSt } from '../../constants';

interface SmartImageGalleryProps { images: string[]; isUser: boolean; }

export const SmartImageGallery = memo(({ images, isUser }: SmartImageGalleryProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const downloadImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url; a.download = `image_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

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
            <button onClick={(e) => downloadImage(e, images[currentIndex])} style={lbBtnSt}>
              <Download size={17} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            </button>
          </div>

          {/* Image */}
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              src={images[currentIndex]} alt=""
              style={{ maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' }}
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
              onDragEnd={(_e: any, { offset }: any) => {
                if (offset.x < -50 && currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
                else if (offset.x > 50 && currentIndex > 0) setCurrentIndex(p => p - 1);
              }}
            />
            {images.length > 1 && currentIndex > 0 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(p => p - 1); }} style={{ position: 'absolute', left: 16, ...lbBtnSt }}>
                <ChevronLeft size={24} color="#fff" />
              </button>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <button onClick={e => { e.stopPropagation(); setCurrentIndex(p => p + 1); }} style={{ position: 'absolute', right: 16, ...lbBtnSt }}>
                <ChevronRight size={24} color="#fff" />
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
          <div onClick={() => { setCurrentIndex(0); setViewerOpen(true); }}
            style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd,#e0ddd7)', maxWidth: '85%' }}>
            <img src={images[0]} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
          </div>
        )}
      </div>
      {typeof document !== 'undefined' && createPortal(viewerContent, document.body)}
    </>
  );
});
