// ─────────────────────────────────────────────
// MEDIA BLOCKS — src/components/chat/components/media/MediaBlocks.tsx
// Menampilkan foto sumber, kartu video (bisa diputar di tempat), dan kartu link di DALAM jawaban,
// tepat setelah paragraf yang relevan. Cara kerjanya sama dengan pil sumber (citations.tsx):
//   1) ChatBubble / GroupChatBubble membungkus teks dengan <MediaProvider media={msg.media} text={...}>
//   2) MarkdownRenderer memasang plugin remarkMediaInserts → sisipkan <media-block> setelah blok yang dituju
//   3) <media-block> dirender oleh MediaBlockView
// Hanya aktif kalau teks yang dirender SAMA PERSIS dengan teks saat posisi media dihitung (jadi tidak ada
// media yang nyasar selama teks masih diketik). Warna seluruhnya dari variabel tema.
// ─────────────────────────────────────────────
import React, { createContext, memo, useContext, useMemo, useState } from 'react';
import type { LinkCard, MediaItem, PhotoItem, VideoItem } from '../../../../lib/media';
import { ChatChart } from './ChatChart';

interface MediaCtx { media: MediaItem[]; text: string }
export const MediaContext = createContext<MediaCtx | null>(null);

export const MediaProvider = ({ media, text, children }: { media?: MediaItem[]; text: string; children: React.ReactNode }) => {
  const value = useMemo<MediaCtx | null>(
    () => (Array.isArray(media) && media.length > 0 ? { media, text } : null),
    [media, text],
  );
  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

// ── Plugin remark: sisipkan <media-block> setelah blok tingkat-atas yang memuat posisi `after` ──
export function remarkMediaInserts(media: MediaItem[]) {
  return (tree: any) => {
    const kids: any[] = Array.isArray(tree.children) ? tree.children : [];
    if (kids.length === 0) return;

    const byChild = new Map<any, number[]>();
    const tail: number[] = [];
    media.forEach((m, i) => {
      if (m.after < 0) { tail.push(i); return; }
      const pos = Math.max(0, m.after - 1);
      const target = kids.find(k => k.position && k.position.start.offset <= pos && pos < k.position.end.offset);
      if (!target) { tail.push(i); return; }
      const arr = byChild.get(target) || [];
      arr.push(i);
      byChild.set(target, arr);
    });

    const make = (idx: number[]) => ({
      type: 'mediaBlock',
      data: { hName: 'media-block' },
      children: [{ type: 'text', value: idx.join(',') }],
    });

    const out: any[] = [];
    for (const k of kids) {
      out.push(k);
      const idx = byChild.get(k);
      if (idx) out.push(make(idx));
    }
    if (tail.length) out.push(make(tail));
    tree.children = out;
  };
}

// ── tampilan ──
const FADE = `@keyframes cy-media-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.cy-media { white-space: normal; font-family: inherit; }
.cy-media-in { animation: cy-media-in .35s ease both; }
.cy-media-row::-webkit-scrollbar { display: none; }
.cy-media a { text-decoration: none; }`;

const clamp = (lines: number): React.CSSProperties => ({
  display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden',
});

const PhotoCard = memo(({ it }: { it: PhotoItem }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <figure className="cy-media-in" style={{ margin: '12px 0 16px' }}>
      <a href={it.url} target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--sf)' }}>
        <img src={it.src} alt={it.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)}
          onLoad={e => {
            // gambar default portal (logo, kotak, kecil) bukan foto berita → disembunyikan; logo merek yang diminta user dikecualikan
            const im = e.currentTarget;
            if (!it.logo && im.naturalWidth > 0 && (im.naturalWidth < 300 || (!/wikimedia\.org/.test(it.src) && im.naturalWidth / Math.max(1, im.naturalHeight) < 1.2))) setOk(false);
          }}
          style={it.logo
            ? { display: 'block', width: '100%', aspectRatio: '16 / 9', maxHeight: 300, objectFit: 'contain', background: 'var(--sf)', padding: 12, boxSizing: 'border-box' }
            : { display: 'block', width: '100%', aspectRatio: '16 / 9', maxHeight: 380, objectFit: 'cover' }} />
      </a>
      <figcaption style={{ margin: '5px 2px 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--mu)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Foto: <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mu)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{it.site}</a>
        {it.title ? ` — ${it.title}` : ''}
      </figcaption>
    </figure>
  );
});
PhotoCard.displayName = 'PhotoCard';

const PlayIcon = () => (
  <span aria-hidden="true" style={{
    position: 'absolute', left: '50%', top: '50%', width: 58, height: 58, marginLeft: -29, marginTop: -29, borderRadius: '50%',
    background: 'rgba(0,0,0,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 18px rgba(0,0,0,.35)', backdropFilter: 'blur(2px)',
  }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
  </span>
);

const VideoCard = memo(({ it, flat }: { it: VideoItem; flat?: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [thumbOk, setThumbOk] = useState(true);
  const embed = it.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${it.id}?autoplay=1&rel=0&playsinline=1`
    : `https://player.vimeo.com/video/${it.id}?autoplay=1`;
  const label = it.provider === 'youtube' ? 'YouTube' : 'Vimeo';

  return (
    <div className={flat ? undefined : 'cy-media-in'} style={{ margin: flat ? 0 : '12px 0 16px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--sf)' }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
        {playing ? (
          <iframe
            src={embed}
            title={it.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label={`Putar video: ${it.title}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, border: 0, background: 'none', cursor: 'pointer' }}>
            {thumbOk && it.thumb && (
              <img src={it.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setThumbOk(false)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <PlayIcon />
          </button>
        )}
      </div>
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ ...clamp(2), fontSize: 14, fontWeight: 650, lineHeight: 1.4, color: 'var(--text)' }}>{it.title}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: 'var(--mu)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {it.channel && <span>{it.channel} ·</span>}
          <a href={it.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mu)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Buka di {label}</a>
        </div>
      </div>
    </div>
  );
});
VideoCard.displayName = 'VideoCard';

const LinkCardView = memo(({ c }: { c: LinkCard }) => {
  const [imgOk, setImgOk] = useState(!!c.image);
  const [logoOk, setLogoOk] = useState(!!c.logo);
  return (
    <a href={c.url} target="_blank" rel="noopener noreferrer"
      style={{ flexShrink: 0, width: 232, scrollSnapAlign: 'start', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--sf)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>
      {imgOk && c.image && (
        <img src={c.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImgOk(false)}
          style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
      )}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
          {logoOk && c.logo && (
            <img src={c.logo} alt="" width={16} height={16} loading="lazy" referrerPolicy="no-referrer" onError={() => setLogoOk(false)}
              style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.site}</span>
        </div>
        <div style={{ ...clamp(3), fontSize: 13.5, fontWeight: 620, lineHeight: 1.4 }}>{c.title}</div>
      </div>
    </a>
  );
});
LinkCardView.displayName = 'LinkCardView';

const LinksRow = memo(({ items }: { items: LinkCard[] }) => (
  <div className="cy-media-in cy-media-row" style={{ margin: '12px 0 16px', display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x proximity', scrollbarWidth: 'none' }}>
    {items.map((c, i) => <LinkCardView key={c.url + i} c={c} />)}
  </div>
));
LinksRow.displayName = 'LinksRow';

export const MediaBlockView = ({ children }: { children?: React.ReactNode }) => {
  const ctx = useContext(MediaContext);
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
  const idx = raw.split(',').map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
  if (!ctx || idx.length === 0) return null;
  const vids = idx.filter(i => ctx.media[i]?.t === 'video');
  const carousel = vids.length >= 2; // beberapa video di satu tempat → baris geser (tidak memanjang ke bawah)
  return (
    <div className="cy-media">
      <style>{FADE}</style>
      {carousel && (
        <div className="cy-media-in cy-media-row" style={{ margin: '12px 0 16px', display: 'flex', gap: 10, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', alignItems: 'flex-start' }}>
          {vids.map(i => (
            <div key={i} style={{ flex: '0 0 86%', maxWidth: 420, scrollSnapAlign: 'start' }}>
              <VideoCard it={ctx.media[i] as VideoItem} flat />
            </div>
          ))}
        </div>
      )}
      {idx.map(i => {
        const m = ctx.media[i];
        if (!m) return null;
        if (m.t === 'photo') return <PhotoCard key={i} it={m} />;
        if (m.t === 'video') return carousel ? null : <VideoCard key={i} it={m} />;
        if (m.t === 'links') return <LinksRow key={i} items={m.items} />;
        if (m.t === 'chart') return <div key={i} className="cy-media-in" style={{ margin: '12px 0 16px' }}><ChatChart spec={m.spec} /></div>;
        return null;
      })}
    </div>
  );
};
