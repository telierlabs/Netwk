// ─────────────────────────────────────────────
// DOC IMAGES — src/lib/docImages.ts
// Foto untuk dokumen buatan AI (blok "@img kata kunci | keterangan"):
//   • searchPhoto : cari foto (Wikipedia + Wikimedia Commons, endpoint yang sama dengan ImageStrip) atau pakai URL langsung
//   • imageToJpeg : unduh → JPEG data URL (maks 1200px) supaya bisa ditanam di PDF / Word / PPT
//   • resolveDocImages : kumpulkan semua foto dalam dokumen, ambil paralel (batas 9 dtk, gagal = dilewati)
// ─────────────────────────────────────────────
import { useEffect, useState } from 'react';
import type { Block, ParsedDoc } from './docModel';

export interface DocPhoto { src: string; title: string; credit: string }
export interface DocImageData { data: string; w: number; h: number; caption: string; credit: string }

const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
const photoCache = new Map<string, Promise<DocPhoto | null>>();

// ── Cek relevansi: foto harus benar-benar cocok dengan kata kunci (lebih baik tanpa foto daripada foto salah) ──
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'over', 'photo', 'image', 'picture', 'illustration']);
const toks = (s: string) => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(w => !STOP.has(w)).map(w => w.replace(/(es|s)$/, ''));
const BAD_TITLE = /chart|graph|diagram|logo|\bmap\b|scale|infographic|\bflag\b|icon|screenshot|\btable\b|\bplot\b|wordmark|coat of arms/i;

function relevant(query: string, title: string): boolean {
  const q = Array.from(new Set(toks(query)));
  if (q.length === 0) return false;
  if (BAD_TITLE.test(title) && !BAD_TITLE.test(query)) return false;
  const t = Array.from(new Set(toks(title)));
  if (t.length === 0) return false;
  const overlap = t.filter(w => q.includes(w)).length;
  if (q.length === 1) return overlap >= 1;
  if (overlap >= 2) return true;
  return t.length >= 2 && t.every(w => q.includes(w));
}

export function searchPhoto(src: string): Promise<DocPhoto | null> {
  const q = src.trim().replace(/\s+/g, ' ').slice(0, 90);
  if (!q) return Promise.resolve(null);
  if (isUrl(q)) return Promise.resolve({ src: q, title: '', credit: '' });
  let p = photoCache.get(q);
  if (!p) {
    p = (async () => {
      const [wiki, commons] = await Promise.all([
        fetch(`/api/image-search?q=${encodeURIComponent(q)}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/web-tools?op=photos&q=${encodeURIComponent(q)}&n=6`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      const list: any[] = [...(Array.isArray(wiki?.images) ? wiki.images : []), ...(Array.isArray(commons?.images) ? commons.images : [])];
      const hit = list.find(i => i && typeof i.src === 'string' && !/\.(svg|gif|png)(\?|$)/i.test(i.src) && relevant(q, String(i.title || '') + ' ' + String(i.caption || '')));
      return hit ? { src: hit.src, title: String(hit.title || ''), credit: String(hit.credit || '') } : null;
    })();
    photoCache.set(q, p);
  }
  return p;
}

/** Hook untuk popup preview. */
export function useDocPhoto(src: string): DocPhoto | null | undefined {
  const [photo, setPhoto] = useState<DocPhoto | null | undefined>(undefined);
  useEffect(() => {
    let off = false;
    setPhoto(undefined);
    searchPhoto(src).then(p => { if (!off) setPhoto(p); });
    return () => { off = true; };
  }, [src]);
  return photo;
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  new Promise(res => { const t = setTimeout(() => res(null), ms); p.then(v => { clearTimeout(t); res(v); }, () => { clearTimeout(t); res(null); }); });

async function imageToJpeg(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return null;
    const blob = await r.blob();
    const bmpUrl = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = bmpUrl; });
    const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(bmpUrl);
    return { data: c.toDataURL('image/jpeg', 0.86), w, h };
  } catch { return null; }
}

export function imageBlocks(d: ParsedDoc): { src: string; caption: string }[] {
  const out: { src: string; caption: string }[] = [];
  const take = (b: Block) => { if (b.t === 'image') out.push({ src: b.src, caption: b.caption }); };
  (d.blocks || []).forEach(take);
  (d.slides || []).forEach(s => { if (s.image) out.push(s.image); s.blocks.forEach(take); });
  return out;
}

/** Kunci = teks src pada blok. Foto yang gagal diambil tidak masuk peta (builder melewatinya). */
export async function resolveDocImages(d: ParsedDoc): Promise<Map<string, DocImageData>> {
  const map = new Map<string, DocImageData>();
  const items = imageBlocks(d).slice(0, 14);
  await Promise.all(items.map(async it => {
    if (map.has(it.src)) return;
    const got = await withTimeout((async () => {
      const ph = await searchPhoto(it.src);
      if (!ph) return null;
      const jpg = await imageToJpeg(ph.src);
      return jpg ? { ...jpg, caption: it.caption || ph.title, credit: ph.credit } : null;
    })(), 6500);
    if (got) map.set(it.src, got);
  }));
  return map;
}
