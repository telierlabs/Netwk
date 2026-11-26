// ─────────────────────────────────────────────
// GROUP MEDIA — src/lib/groupMedia.ts
// Mengumpulkan SEMUA media / tautan / dokumen dari pesan sebuah grup
// (pesan kita, teman, dan AI), untuk halaman "Media, tautan, dan dok".
//
//  MEDIA  : msg.images / msg.image (video dikenali dari data:video / .mp4),
//           foto dari msg.media (photo, gallery, thumb)
//  TAUTAN : kartu link & video dari msg.media + URL yang ada di teks pesan
//  DOK    : msg.pdfs (file yang dikirim) + dokumen buatan AI (tag [GENERATE_*])
// Hasil diurutkan dari yang terbaru.
// ─────────────────────────────────────────────
import { extractDocsFromText } from './docModel';
import type { DocKind } from './docModel';
import { stripPasted } from './pasted';

export interface MediaEntry { id: string; kind: 'image' | 'video'; src: string; by?: string; ts?: string }
export interface LinkEntry { id: string; url: string; title: string; site: string; image?: string; by?: string; ts?: string }
export type DocEntry =
  | { id: string; type: 'file'; name: string; file: any; by?: string; ts?: string }
  | { id: string; type: 'ai'; kind: DocKind; name: string; source: string; by?: string; ts?: string };

export interface GroupLibrary { media: MediaEntry[]; links: LinkEntry[]; docs: DocEntry[] }

const isVideoSrc = (s: string) => /^data:video\//i.test(s) || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(s);

const keyOf = (s: string) => (s.length > 220 ? `${s.length}:${s.slice(0, 100)}:${s.slice(-80)}` : s);

const hostOf = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
};

const URL_RE = /https?:\/\/[^\s<>"'\])]+/gi;

export function collectGroupMedia(messages: any[]): GroupLibrary {
  const media: MediaEntry[] = [];
  const links: LinkEntry[] = [];
  const docs: DocEntry[] = [];
  const seenMedia = new Set<string>();
  const seenLinks = new Set<string>();
  const seenDocs = new Set<string>();

  (messages || []).forEach((m: any, mi: number) => {
    if (!m || m.role === 'system' || m.notice) return;
    const by: string | undefined = m.senderName;
    const ts: string | undefined = m.timestamp;

    const addMedia = (src: any) => {
      if (typeof src !== 'string' || !src) return;
      const k = keyOf(src);
      if (seenMedia.has(k)) return;
      seenMedia.add(k);
      media.push({ id: `m${mi}-${media.length}`, kind: isVideoSrc(src) ? 'video' : 'image', src, by, ts });
    };
    const addLink = (url: any, title?: string, site?: string, image?: string) => {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
      const k = url.replace(/[#/]+$/, '');
      if (seenLinks.has(k)) return;
      seenLinks.add(k);
      const host = hostOf(url);
      links.push({ id: `l${mi}-${links.length}`, url, title: (title || '').trim() || host, site: site || host, image, by, ts });
    };
    const addDoc = (d: DocEntry, key: string) => {
      if (seenDocs.has(key)) return;
      seenDocs.add(key);
      docs.push(d);
    };

    // ── gambar / video yang dikirim ──
    if (Array.isArray(m.images)) m.images.forEach(addMedia);
    if (typeof m.image === 'string') addMedia(m.image);

    // ── media buatan AI (foto sumber, galeri, video, kartu link) ──
    if (Array.isArray(m.media)) {
      m.media.forEach((it: any) => {
        if (!it) return;
        if (it.t === 'photo' && !it.logo) addMedia(it.src);
        else if (it.t === 'gallery' && Array.isArray(it.items)) it.items.forEach((x: any) => { if (!x?.logo) addMedia(x?.src); });
        else if (it.t === 'thumb' && it.item && !it.item.logo) addMedia(it.item.src);
        else if (it.t === 'video') addLink(it.url, it.title, it.channel || 'YouTube', it.thumb);
        else if (it.t === 'links' && Array.isArray(it.items)) it.items.forEach((c: any) => addLink(c?.url, c?.title, c?.site, c?.image));
      });
    }

    // ── dokumen yang dikirim (PDF / Word / txt) ──
    if (Array.isArray(m.pdfs)) {
      m.pdfs.forEach((p: any, i: number) => {
        if (!p) return;
        const key = p.fid ? `f:${p.fid}` : `f:${p.name || ''}:${(p.data || '').length}:${mi}:${i}`;
        addDoc({ id: `d${mi}-${i}`, type: 'file', name: p.name || 'Dokumen', file: p, by, ts }, key);
      });
    }

    // ── dokumen buatan AI ──
    let textForLinks = typeof m.content === 'string' ? m.content : '';
    if (textForLinks) {
      try {
        const ex = extractDocsFromText(textForLinks);
        if (ex) {
          ex.docs.forEach((d: any, i: number) => {
            if (!d.complete) return;
            addDoc({ id: `a${mi}-${i}`, type: 'ai', kind: d.kind, name: d.name, source: d.source, by, ts }, `a:${d.name}:${(d.source || '').length}`);
          });
          textForLinks = `${ex.before || ''}\n${ex.after || ''}`;
        }
      } catch { /* abaikan */ }
    }
    if (Array.isArray(m.docs)) {
      m.docs.forEach((d: any, i: number) => {
        if (!d?.source) return;
        addDoc({ id: `ad${mi}-${i}`, type: 'ai', kind: d.kind, name: d.name, source: d.source, by, ts }, `a:${d.name}:${String(d.source).length}`);
      });
    }

    // ── URL yang ada di teks pesan ──
    if (textForLinks) {
      let t = textForLinks.replace(/\[GENERATE_[^\]]*\]/g, ' ').replace(/^\[Membalas pesan:[\s\S]*?\]\n\n/, '');
      try { t = stripPasted(t); } catch { /* abaikan */ }
      (t.match(URL_RE) || []).forEach(raw => addLink(raw.replace(/[.,;:!?]+$/, '')));
    }
  });

  // terbaru dulu
  return { media: media.reverse(), links: links.reverse(), docs: docs.reverse() };
}
