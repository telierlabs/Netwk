// ─────────────────────────────────────────────
// IMAGE STRIP — src/components/chat/components/renderers/ImageStrip.tsx
// Dirender dari blok ```image-search ... ``` di jawaban AI (lihat MarkdownRenderer).
// Isi blok = kata kunci foto. Komponen ini minta foto ke /api/image-search lalu
// menampilkannya pakai SmartImageGallery (baris geser + lightbox) + keterangan sumber.
//   • kalau foto tidak ketemu / gagal → tidak menampilkan apa-apa (tidak ada kotak kosong)
//   • kueri ditunda 600ms (debounce) supaya tidak menembak API saat kata kuncinya masih diketik
//   • hasil di-cache di memori
//   • 🔧 BARU: foto baru diminta saat strip-nya mendekati layar (IntersectionObserver),
//     jadi jawaban panjang dengan beberapa foto tidak memuat semuanya sekaligus (halaman lebih ringan)
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { SmartImageGallery } from '../media/SmartImageGallery';

interface ApiImage {
  src: string;
  title: string;
  pageUrl: string;
  credit: string;
}

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
        // Utama: foto beragam dari Wikimedia Commons (tidak itu-itu saja). Cadangan: gambar utama artikel Wikipedia.
        let list: ApiImage[] = [];
        try {
          const r1 = await fetch(`/api/web-tools?op=photos&q=${encodeURIComponent(q)}&n=6`);
          if (r1.ok) { const d1 = await r1.json(); list = Array.isArray(d1?.images) ? d1.images : []; }
        } catch { /* coba cadangan */ }
        if (list.length < 2) {
          const res = await fetch(`/api/image-search?q=${encodeURIComponent(q)}`);
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          list = Array.isArray(data?.images) ? data.images : [];
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

  const srcs = useMemo(() => (images || []).map(i => i.src), [images]);

  if (q.length < 2 || failed) return null;
  if (images && images.length === 0) return null;

  // Wrapper: blok kode markdown biasanya monospace + pre → dinormalkan di sini
  const wrap: React.CSSProperties = { margin: '10px 0 14px', whiteSpace: 'normal', fontFamily: 'inherit' };

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

  // Keterangan sumber: judul artikel Wikipedia sebagai link (atribusi)
  const seen = new Set<string>();
  const credits = images.filter(i => (seen.has(i.pageUrl) ? false : (seen.add(i.pageUrl), true))).slice(0, 3);

  return (
    <div style={wrap}>
      <SmartImageGallery images={srcs} isUser={false} />
      <p style={{ margin: '2px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--mu)' }}>
        Foto: {credits[0]?.credit || 'Wikipedia'} —{' '}
        {credits.map((c, i) => (
          <React.Fragment key={c.pageUrl}>
            {i > 0 && ', '}
            <a
              href={c.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--mu)', textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {c.title}
            </a>
          </React.Fragment>
        ))}
      </p>
    </div>
  );
});
