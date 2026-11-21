// ─────────────────────────────────────────────
// SMART IMAGE GALLERY — src/components/chat/components/media/SmartImageGallery.tsx
// Single/multi image viewer with lightbox + download
//
// PERUBAHAN:
//   • FIX: sebelumnya cuma merender kalau images.length === 1, jadi kirim
//     2+ gambar = bubble kosong.
//   • Sekarang 2+ gambar tampil sebagai BARIS HORIZONTAL yang bisa digeser:
//     rasio asli dipertahankan (tidak di-crop jadi kotak ala collage
//     WhatsApp) dan memakai lebar penuh bubble.
//   • Tap gambar membuka lightbox tepat di gambar yang diklik.
//   • Lightbox menampilkan counter "1 / 3" kalau gambarnya lebih dari satu.
//   • BARU: lightbox memakai PhotoViewer bersama — pindah foto HANYA dengan geser jari (tanpa tombol < >), ketuk dua kali = zoom.
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { PhotoViewerWithDownload } from './PhotoViewer';

interface SmartImageGalleryProps { images: string[]; isUser: boolean; }

// Tinggi tiap gambar di baris geser (lebar menyesuaikan rasio asli)
const ROW_IMAGE_HEIGHT = 240;

export const SmartImageGallery = memo(({ images, isUser }: SmartImageGalleryProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const openAt = (i: number) => { setCurrentIndex(i); setViewerOpen(true); };

  const safeIndex = Math.min(currentIndex, images.length - 1);

  const viewerContent = viewerOpen ? (
    <PhotoViewerWithDownload
      photos={images.map(src => ({ src }))}
      index={safeIndex}
      onIndex={setCurrentIndex}
      onClose={() => setViewerOpen(false)}
      onDownload={p => { const a = document.createElement('a'); a.href = p.src; a.download = `image_${Date.now()}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
    />
  ) : null;

  return (
    <>
      <style>{`.cylen-img-row::-webkit-scrollbar { display: none; }`}</style>

      <div style={{ width: '100%', marginBottom: 8, display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {/* 1 gambar: tampil besar */}
        {images.length === 1 && (
          <div onClick={() => openAt(0)}
            style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--bd,#e0ddd7)', maxWidth: '85%' }}>
            <img src={images[0]} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', display: 'block' }} />
          </div>
        )}

        {/* 2+ gambar: baris horizontal, bisa digeser, rasio asli */}
        {images.length > 1 && (
          <div
            className="cylen-img-row"
            style={{
              maxWidth: '100%',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollSnapType: 'x proximity',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                onClick={() => openAt(i)}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  borderRadius: 16,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid var(--bd,#e0ddd7)',
                  background: 'var(--sf,#f7f5f1)',
                }}
              >
                <img
                  src={src}
                  alt=""
                  style={{
                    height: ROW_IMAGE_HEIGHT,
                    width: 'auto',
                    maxWidth: '78vw',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {viewerContent}
    </>
  );
});
