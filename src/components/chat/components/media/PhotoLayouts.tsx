// ─────────────────────────────────────────────
// PHOTO LAYOUTS — src/components/chat/components/media/PhotoLayouts.tsx
// Tata letak foto yang bervariasi (bukan satu pola untuk semua), semuanya dengan rasio ASLI foto:
//   • single  : satu foto, lebar penuh (potret dibatasi tingginya, di tengah, tanpa pinggiran putih)
//   • duo     : dua foto sebaris, lebar masing-masing mengikuti rasio asli sehingga tinggi sama dan tidak ada yang terpotong
//   • collage : 1 foto besar + 2 foto bertumpuk, lencana jumlah foto di pojok (gaya ChatGPT)
//   • strip   : baris geser, tinggi tetap, lebar mengikuti rasio asli, nama di bawah tiap foto
// Foto yang diketuk membuka PhotoViewer (penampil di dalam aplikasi), BUKAN halaman sumber.
// Tautan "Foto: situs" di bawah blok tetap membuka sumbernya.
// ─────────────────────────────────────────────
import React, { memo, useMemo, useState } from 'react';
import { usePhotoViewer } from './PhotoViewer';
import type { ViewerPhoto } from './PhotoViewer';

export interface LayoutPhoto {
  src: string; title: string; site: string; url: string;
  label?: string; logo?: boolean; w?: number; h?: number;
}
export type LayoutKind = 'auto' | 'single' | 'duo' | 'collage' | 'strip';

const toViewer = (p: LayoutPhoto): ViewerPhoto => ({ src: p.src, title: p.label || p.title, site: p.site, url: p.url, logo: p.logo });
const MIN_OK_W = 60;

/** Foto + rasio aslinya (dari API kalau ada, kalau tidak dibaca saat gambar termuat). */
function useAspects(items: LayoutPhoto[]) {
  const [loaded, setLoaded] = useState<Record<string, number>>({});
  const [bad, setBad] = useState<Record<string, true>>({});
  const aspect = (p: LayoutPhoto) => (p.w && p.h ? p.w / p.h : loaded[p.src] || 1.35);
  const onLoad = (p: LayoutPhoto) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    if (im.naturalWidth > 0 && im.naturalWidth < MIN_OK_W) { setBad(b => ({ ...b, [p.src]: true })); return; }
    if (im.naturalWidth > 0 && !(p.w && p.h)) setLoaded(l => ({ ...l, [p.src]: im.naturalWidth / Math.max(1, im.naturalHeight) }));
  };
  const onError = (p: LayoutPhoto) => () => setBad(b => ({ ...b, [p.src]: true }));
  const ok = items.filter(p => !bad[p.src]);
  return { ok, aspect, onLoad, onError };
}

const tile: React.CSSProperties = {
  position: 'relative', display: 'block', padding: 0, border: '1px solid var(--bd)', background: 'var(--sf)',
  overflow: 'hidden', cursor: 'zoom-in', font: 'inherit', color: 'inherit',
};
const imgBase: React.CSSProperties = { display: 'block', width: '100%', height: '100%' };

const CountBadge = ({ n }: { n: number }) => (
  <span style={{
    position: 'absolute', right: 8, bottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 9px', borderRadius: 999,
    background: 'rgba(0,0,0,.62)', color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', backdropFilter: 'blur(6px)',
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 17l-5-5-9 7" /></svg>
    {n}
  </span>
);

const Credit = ({ items }: { items: LayoutPhoto[] }) => {
  const seen = new Set<string>();
  const sites = items.filter(i => (seen.has(i.site) ? false : (seen.add(i.site), true))).slice(0, 4);
  if (sites.length === 0) return null;
  return (
    <div style={{ margin: '6px 2px 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--mu)' }}>
      Foto: {sites.map((s, i) => (
        <React.Fragment key={s.site}>
          {i > 0 && ', '}
          <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mu)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{s.site}</a>
        </React.Fragment>
      ))}
    </div>
  );
};

export const PhotoLayout = memo(({ items, layout = 'auto', total }: { items: LayoutPhoto[]; layout?: LayoutKind; total?: number }) => {
  const { open, node } = usePhotoViewer();
  const { ok, aspect, onLoad, onError } = useAspects(items);
  const vp = useMemo(() => ok.map(toViewer), [ok]);
  if (ok.length === 0) return null;

  const kind: LayoutKind = layout !== 'auto' && !(layout === 'collage' && ok.length < 3) && !(layout === 'duo' && ok.length !== 2) && !(layout === 'single' && ok.length !== 1)
    ? layout
    : ok.length === 1 ? 'single' : ok.length === 2 ? 'duo' : ok.length === 3 ? 'collage' : 'strip';
  const count = Math.max(total || 0, ok.length);

  const img = (p: LayoutPhoto, style: React.CSSProperties) => (
    <img src={p.src} alt={p.label || p.title} loading="lazy" referrerPolicy="no-referrer" draggable={false}
      onLoad={onLoad(p)} onError={onError(p)}
      style={{ ...imgBase, ...(p.logo ? { objectFit: 'contain', padding: 14, boxSizing: 'border-box' } : {}), ...style }} />
  );

  let body: React.ReactNode;
  if (kind === 'single') {
    const p = ok[0];
    const a = aspect(p);
    const portrait = a < 0.95;
    body = (
      <button type="button" onClick={() => open(vp, 0)} aria-label={`Buka foto: ${p.label || p.title}`}
        style={{ ...tile, borderRadius: 16, ...(portrait ? { width: `${Math.max(48, Math.min(72, a * 100))}%`, margin: '0 auto', aspectRatio: String(a) } : { width: '100%', aspectRatio: String(Math.max(a, 1.15)), maxHeight: 440 }) }}>
        {img(p, { objectFit: p.logo ? 'contain' : 'cover' })}
      </button>
    );
  } else if (kind === 'duo') {
    body = (
      <div style={{ display: 'flex', gap: 6, height: 216 }}>
        {ok.map((p, i) => (
          <button key={p.src} type="button" onClick={() => open(vp, i)} aria-label={`Buka foto: ${p.label || p.title}`}
            style={{ ...tile, flex: `${Math.min(Math.max(aspect(p), 0.55), 2)} 1 0`, minWidth: 0, borderRadius: i === 0 ? '16px 6px 6px 16px' : '6px 16px 16px 6px' }}>
            {img(p, { objectFit: p.logo ? 'contain' : 'cover' })}
          </button>
        ))}
      </div>
    );
  } else if (kind === 'collage') {
    const [a, b, c] = ok;
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, height: 236 }}>
        <button type="button" onClick={() => open(vp, 0)} aria-label={`Buka foto: ${a.label || a.title}`} style={{ ...tile, gridRow: '1 / 3', borderRadius: '16px 6px 6px 16px' }}>{img(a, { objectFit: a.logo ? 'contain' : 'cover' })}</button>
        <button type="button" onClick={() => open(vp, 1)} aria-label={`Buka foto: ${b.label || b.title}`} style={{ ...tile, borderRadius: '6px 16px 6px 6px' }}>{img(b, { objectFit: b.logo ? 'contain' : 'cover' })}</button>
        <button type="button" onClick={() => open(vp, 2)} aria-label={`Buka foto: ${c.label || c.title}`} style={{ ...tile, borderRadius: '6px 6px 16px 6px' }}>
          {img(c, { objectFit: c.logo ? 'contain' : 'cover' })}
          {count > 3 && <CountBadge n={count} />}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="cy-media-row" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollSnapType: 'x proximity', scrollbarWidth: 'none', alignItems: 'flex-start' }}>
        {ok.map((p, i) => {
          const a = Math.min(Math.max(aspect(p), 0.6), 2.1);
          const h = 176;
          return (
            <div key={p.src} style={{ flex: '0 0 auto', scrollSnapAlign: 'start', width: Math.round(h * a), maxWidth: '82%' }}>
              <button type="button" onClick={() => open(vp, i)} aria-label={`Buka foto: ${p.label || p.title}`}
                style={{ ...tile, width: '100%', height: h, borderRadius: 14 }}>
                {img(p, { objectFit: p.logo ? 'contain' : 'cover' })}
              </button>
              {(p.label || p.title) && <div style={{ margin: '5px 2px 0', fontSize: 11.5, fontWeight: 620, lineHeight: 1.35, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label || p.title}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="cy-media-in" style={{ margin: '12px 0 16px' }}>
      {body}
      <Credit items={ok} />
      {node}
    </div>
  );
});
PhotoLayout.displayName = 'PhotoLayout';
