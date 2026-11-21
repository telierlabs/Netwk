// ─────────────────────────────────────────────
// IMAGE STRIP — src/components/chat/components/renderers/ImageStrip.tsx
// Dirender dari blok ```image-search ... ``` di jawaban AI (lihat MarkdownRenderer).
// Isi blok = kata kunci foto. Komponen ini minta foto ke /api/image-search lalu
// menampilkannya pakai SmartImageGallery (baris geser + lightbox) + keterangan sumber.
//   • 2–5 foto per blok (bukan satu galeri besar); tata letak bervariasi; ketuk foto → penampil di dalam aplikasi; sumber foto beragam
//     (Wikipedia, Wikimedia Commons, Openverse). Judul foto disaring supaya nyambung dengan kata kunci.
//   • kalau foto tidak ketemu / gagal → tidak menampilkan apa-apa (tidak ada kotak kosong)
//   • kueri ditunda 600ms (debounce) supaya tidak menembak API saat kata kuncinya masih diketik
//   • hasil di-cache di memori
//   • 🔧 BARU: foto baru diminta saat strip-nya mendekati layar (IntersectionObserver),
//     jadi jawaban panjang dengan beberapa foto tidak memuat semuanya sekaligus (halaman lebih ringan)
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PhotoLayout } from '../media/PhotoLayouts';
import type { LayoutKind, LayoutPhoto } from '../media/PhotoLayouts';

interface ApiImage {
  src: string;
  title: string;
  pageUrl: string;
  credit: string;
  w?: number;
  h?: number;
}

/** Judul foto harus nyambung dengan kata kunci (foto nyasar dibuang): semua kata judul ada di kueri, atau ≥60% kata kueri ada di judul. */
const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');
function relevantTitle(title: string, q: string): boolean {
  const qs = Array.from(new Set(norm(q).split(/\s+/).filter(w => w.length >= 3)));
  const ts = Array.from(new Set(norm(title).split(/\s+/).filter(w => w.length >= 3)));
  if (qs.length === 0 || ts.length === 0) return true;
  const inTitle = qs.filter(w => ts.some(t => t.includes(w) || w.includes(t))).length;
  const titleInQ = ts.filter(t => qs.some(w => w.includes(t) || t.includes(w))).length;
  return titleInQ === ts.length || inTitle >= Math.ceil(qs.length * 0.6);
}
const hash = (x: string) => { let h = 0; for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0; return h; };
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return 'sumber'; } };

const cache = new Map<string, ApiImage[]>();

// Foto yang sudah dipakai strip lain (kata kunci berbeda) tidak dipakai lagi → foto tidak kembar antar strip / antar jawaban.
// Kalau setelah disaring tinggal < 2 foto, dipakai apa adanya (lebih baik ada foto daripada kosong).
const claimed = new Map<string, string>();
const keyOf = (src: string) => decodeURIComponent(src.split('/').pop() || src).replace(/^\d+px-/, '').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
function claimImages(q: string, list: ApiImage[]): ApiImage[] {
  const fresh = list.filter(i => { const owner = claimed.get(keyOf(i.src)); return !owner || owner === q; });
  const out = fresh.length >= 2 ? fresh : list;
  if (claimed.size > 400) claimed.clear();
  out.forEach(i => { if (!claimed.has(keyOf(i.src))) claimed.set(keyOf(i.src), q); });
  return out;
}

export const ImageStrip = memo(({ query }: { query: string }) => {
  const q = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  const [images, setImages] = useState<ApiImage[] | null>(() => cache.get(q) ?? null);
  const [failed, setFailed] = useState(false);
  const [near, setNear] = useState(() => cache.has(q));
  const holderRef = useRef<HTMLDivElement | null>(null);

  // Tunggu sampai strip mendekati layar (300px sebelum kelihatan)
  useEffect(() => {
    if (near) return;
    const el = holderRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near, images, failed]);

  useEffect(() => {
    if (q.length < 2 || !near) return;
    const cached = cache.get(q);
    if (cached) { setImages(cached); setFailed(false); return; }

    let cancelled = false;
    setFailed(false);
    const t = setTimeout(async () => {
      try {
        // Gabungan: foto utama artikel Wikipedia (relevan, terbukti jalan) + foto beragam dari Wikimedia Commons (tambahan, tidak itu-itu saja)
        const [wiki, commons] = await Promise.all([
          fetch(`/api/image-search?q=${encodeURIComponent(q)}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`/api/web-tools?op=photos&q=${encodeURIComponent(q)}&n=8`).then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        const w: ApiImage[] = (Array.isArray(wiki?.images) ? wiki.images : []).filter((i: ApiImage) => i?.src && relevantTitle(String(i.title || ''), q));
        const c: ApiImage[] = Array.isArray(commons?.images) ? commons.images : [];
        if (w.length === 0 && c.length === 0 && !wiki && !commons) throw new Error('no-photo-api');
        const seenKey = new Set<string>();
        let list: ApiImage[] = [];
        for (const img of [...w.slice(0, 2), ...c, ...w.slice(2)]) {
          const k = keyOf(img.src);
          if (seenKey.has(k)) continue;
          seenKey.add(k);
          list.push(img);
          if (list.length >= 5) break; // satu blok = 2–5 foto; foto lain datang dari blok kata kunci berikutnya (tersebar di jawaban)
        }
        list = claimImages(q, list);
        cache.set(q, list);
        if (!cancelled) setImages(list);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 600);

    return () => { cancelled = true; clearTimeout(t); };
  }, [q, near]);

  const items = useMemo<LayoutPhoto[]>(() => (images || []).map(i => ({ src: i.src, title: i.title, site: hostOf(i.pageUrl), url: i.pageUrl, w: i.w, h: i.h })), [images]);
  // variasi tata letak antar blok: 4–5 foto bisa kolase (1 besar + 2 kecil + lencana jumlah) atau baris geser
  const layout: LayoutKind = items.length >= 4 && hash(q) % 2 === 0 ? 'collage' : 'auto';

  if (q.length < 2 || failed) return null;
  if (images && images.length === 0) return null;

  // Wrapper: blok kode markdown biasanya monospace + pre → dinormalkan di sini
  const wrap: React.CSSProperties = { margin: '4px 0 6px', whiteSpace: 'normal', fontFamily: 'inherit' };

  // Loading: placeholder berkedip
  if (!images) {
    return (
      <div ref={holderRef} style={{ ...wrap, display: 'flex', gap: 8, overflow: 'hidden' }} aria-hidden="true">
        <style>{`@keyframes cy-img-pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }`}</style>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 150,
              height: 200,
              borderRadius: 16,
              background: 'var(--sf)',
              border: '1px solid var(--bd)',
              animation: `cy-img-pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={wrap}>
      <PhotoLayout items={items} layout={layout} total={items.length} />
    </div>
  );
});
