// ─────────────────────────────────────────────
// SOURCES SHEET — src/components/chat/components/search/SourcesSheet.tsx
// SourcesButton: pill "N sumber" (avatar bertumpuk) di bawah jawaban AI.
// Klik → popup dari bawah (bottom sheet) berisi KARTU sumber:
//     [judul artikel]
//     [cuplikan deskripsi]
//     [ikon] domain                                   [↗]
//   • kartu diklik → langsung buka artikelnya (tab baru)
//   • judul + deskripsi diambil dari /api/resolve-sources saat popup dibuka
//     (sementara menunggu, kartu menampilkan domain + placeholder)
//   • tutup: tap backdrop, tombol X, tombol Esc, atau geser handle ke bawah
//   • warna seluruhnya dari variabel tema (--bg, --cd, --sf, --bd, --text, --mu)
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { ChevronUp, ExternalLink, X } from 'lucide-react';
import { SourceAvatar } from './SourceAvatar';
import { SourceLike, getSourceDomain, looksLikeDomain, uniqueDomains } from './sourceUtils';
import { ResolvedSource, getCachedSource, resolveSources } from './resolveSources';

// ── Satu kartu sumber ─────────────────────────
const SourceCard = ({
  src,
  resolved,
  loading,
}: {
  src: SourceLike;
  resolved?: ResolvedSource;
  loading: boolean;
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const domain = resolved?.domain || getSourceDomain(src);
  const titleFromSrc = src.title && !looksLikeDomain(src.title) ? src.title : '';
  const title = resolved?.title || titleFromSrc || domain;
  const hasRealTitle = title !== domain;
  const description = resolved?.description || '';
  const image = !imgFailed && resolved?.image ? resolved.image : '';
  // Prioritas link: artikel asli → link redirect Gemini (langsung ke artikel) → pencarian Google
  const href = resolved?.url || src.redirect || src.url || '';
  const isPending = loading && !!src.redirect && !resolved;
  const isSearchLink = /google\.[a-z.]+\/search/i.test(href);
  const footerLabel = hasRealTitle ? domain : isSearchLink ? 'Buka lewat pencarian Google' : 'Buka sumber';

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 18,
    background: 'var(--sf)',
    border: '1px solid var(--bd)',
    textDecoration: 'none',
    color: 'var(--text)',
  };

  const content = (
    <>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.4,
            color: 'var(--text)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </p>

        {description ? (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--mu)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {description}
          </p>
        ) : isPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0' }}>
            <div className="cy-sk" style={{ height: 10, width: '92%', borderRadius: 5 }} />
            <div className="cy-sk" style={{ height: 10, width: '64%', borderRadius: 5 }} />
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <SourceAvatar domain={domain} size={18} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--mu)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {footerLabel}
          </span>
          {href && <ExternalLink size={14} color="var(--mu)" style={{ flexShrink: 0 }} />}
        </div>
      </div>

      {/* Gambar utama artikel (og:image) */}
      {image && (
        <img
          src={image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{
            width: 84,
            height: 84,
            objectFit: 'cover',
            borderRadius: 12,
            flexShrink: 0,
            background: 'var(--bd)',
          }}
        />
      )}
    </>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={cardStyle}>
      {content}
    </a>
  ) : (
    <div style={cardStyle}>{content}</div>
  );
};

// ── Sheet ─────────────────────────────────────
export const SheetPanel = ({
  sources: allSources,
  onClose,
  onlyIndices,
}: {
  sources: SourceLike[];
  onClose: () => void;
  /** Kalau diisi (dari pil per paragraf), awalnya cuma tampilkan sumber-sumber ini + tombol "Lihat semua". */
  onlyIndices?: number[];
}) => {
  const [showAll, setShowAll] = useState(!onlyIndices || onlyIndices.length === 0);
  const sources = useMemo(
    () => (showAll || !onlyIndices ? allSources : (onlyIndices.map(i => allSources[i]).filter(Boolean) as SourceLike[])),
    [allSources, onlyIndices, showAll],
  );
  const controls = useDragControls();
  const [resolved, setResolved] = useState<Record<string, ResolvedSource>>({});
  const [loading, setLoading] = useState(false);
  // 🔧 BARU: kerjaan berat (render 10 kartu, ambil favicon, fetch judul) ditunda sampai animasi buka selesai,
  // supaya popup meluncur mulus walau halaman di belakangnya berat (banyak foto).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Ambil judul + deskripsi artikel saat popup dibuka (yang sudah pernah diambil langsung dari cache)
  useEffect(() => {
    if (!ready) return;
    const raws = sources.map(s => s.redirect).filter(Boolean) as string[];
    if (raws.length === 0) return;

    const initial: Record<string, ResolvedSource> = {};
    raws.forEach(u => {
      const c = getCachedSource(u);
      if (c) initial[u] = c;
    });
    setResolved(initial);
    if (raws.every(u => initial[u])) return;

    let cancelled = false;
    setLoading(true);
    resolveSources(raws)
      .then(r => { if (!cancelled) setResolved(r); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sources, ready]);

  // Sebelum animasi selesai cuma 4 kartu pertama; sisanya menyusul
  const visibleSources = ready ? sources : sources.slice(0, 4);

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
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        onAnimationComplete={() => setReady(true)}
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
          maxHeight: '88dvh',
          minHeight: '60dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cd)',
          borderTop: '1px solid var(--bd)',
          borderRadius: '24px 24px 0 0',
          willChange: 'transform',
        }}
      >
        <style>{`
          @keyframes cy-sk-pulse { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.28; } }
          .cy-sk { background: var(--mu); animation: cy-sk-pulse 1.2s ease-in-out infinite; }
        `}</style>

        {/* Area geser: handle + judul */}
        <div
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: 'none', cursor: 'grab', flexShrink: 0, padding: '10px 16px 8px' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--mu)', opacity: 0.5, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
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

        {/* Daftar kartu sumber */}
        <div
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            padding: '4px 16px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {visibleSources.map((src, i) => (
            <SourceCard
              key={i}
              src={src}
              resolved={src.redirect ? resolved[src.redirect] : undefined}
              loading={loading}
            />
          ))}
          {!showAll && allSources.length > sources.length && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                marginTop: 2,
                padding: '12px 16px',
                borderRadius: 14,
                border: '1px solid var(--bd)',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Lihat semua {allSources.length} sumber
            </button>
          )}
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
