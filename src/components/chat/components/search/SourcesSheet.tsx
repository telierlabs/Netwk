// ─────────────────────────────────────────────
// SOURCES SHEET — src/components/chat/components/search/SourcesSheet.tsx
// SourcesButton: pill "N sumber" (avatar bertumpuk) di bawah jawaban AI.
// Klik → popup dari bawah (bottom sheet) berisi daftar sumber yang bisa diklik.
//   • tutup: tap backdrop, tombol X, tombol Esc, atau geser handle ke bawah
//   • warna seluruhnya dari variabel tema (--bg, --cd, --sf, --bd, --text, --mu)
// ─────────────────────────────────────────────
import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { ChevronUp, ExternalLink, X } from 'lucide-react';
import { SourceAvatar } from './SourceAvatar';
import { SourceLike, getSourceView, uniqueDomains } from './sourceUtils';

// ── Sheet ─────────────────────────────────────
const SheetPanel = ({ sources, onClose }: { sources: SourceLike[]; onClose: () => void }) => {
  const controls = useDragControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        key="sources-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 999998, background: 'rgba(0,0,0,0.5)' }}
      />

      <motion.div
        key="sources-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Sumber"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 34, stiffness: 340 }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_e: any, info: any) => {
          if (info.offset.y > 90 || info.velocity.y > 500) onClose();
        }}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          maxHeight: '75dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cd)',
          borderTop: '1px solid var(--bd)',
          borderRadius: '24px 24px 0 0',
        }}
      >
        {/* Area geser: handle + judul */}
        <div
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: 'none', cursor: 'grab', flexShrink: 0, padding: '10px 16px 6px' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--mu)', opacity: 0.5, margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Sumber{' '}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--mu)' }}>{sources.length}</span>
            </p>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onClose}
              aria-label="Tutup"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--sf)',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Daftar sumber */}
        <div
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '0 16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {sources.map((src, i) => {
            const v = getSourceView(src);
            const rowStyle: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--bd)',
              textDecoration: 'none',
              color: 'var(--text)',
            };
            const content = (
              <>
                <SourceAvatar domain={v.domain} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      color: 'var(--text)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {v.title}
                  </p>
                  {v.subtitle && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 12,
                        color: 'var(--mu)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.subtitle}
                    </p>
                  )}
                </div>
                {src.url && <ExternalLink size={16} color="var(--mu)" style={{ flexShrink: 0 }} />}
              </>
            );

            return src.url ? (
              <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" style={rowStyle}>
                {content}
              </a>
            ) : (
              <div key={i} style={rowStyle}>{content}</div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};

// ── Tombol di bawah jawaban ───────────────────
export const SourcesButton = memo(({ sources }: { sources?: SourceLike[] }) => {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const stack = uniqueDomains(sources).slice(0, 3);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Lihat ${sources.length} sumber`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '5px 12px 5px 6px',
          borderRadius: 999,
          border: '1px solid var(--bd)',
          background: 'var(--sf)',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex' }}>
          {stack.map((d, i) => (
            <span key={d} style={{ marginLeft: i === 0 ? 0 : -6, display: 'inline-flex' }}>
              <SourceAvatar domain={d} size={20} ringColor="var(--sf)" />
            </span>
          ))}
        </span>
        <span>{sources.length} sumber</span>
        <ChevronUp size={15} color="var(--mu)" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && <SheetPanel sources={sources} onClose={() => setOpen(false)} />}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
});
