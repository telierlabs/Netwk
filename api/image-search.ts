// ─────────────────────────────────────────────
// api/image-search.ts   ← letakkan di ROOT repo (folder `api`), BUKAN di dalam src/
//
// Fungsi serverless Vercel: cari foto publik untuk topik tertentu.
//   GET /api/image-search?q=harimau%20sumatra&n=6
//   → { images: [{ src, title, pageUrl, credit }] }
//
// Sumber: gambar utama artikel Wikipedia (id + en) lewat API resmi Wikimedia.
//   • gratis, tanpa API key
//   • hanya gambar berlisensi bebas (default API pageimages)
//   • hasil di-cache CDN Vercel 1 hari, jadi pencarian yang sama tidak memanggil fungsi lagi
// ─────────────────────────────────────────────

const UA = 'CylenAI/1.0 (https://cylenai.com) image-search';
const PER_LANG = 5;

interface Img {
  src: string;
  title: string;
  pageUrl: string;
  credit: string;
}

async function fromWikipedia(lang: 'id' | 'en', q: string): Promise<Img[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: q,
    gsrlimit: String(PER_LANG),
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '800',
    pilimit: String(PER_LANG),
  });

  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(4500),
  });
  if (!res.ok) return [];

  const data: any = await res.json();
  const pages: any[] = Array.isArray(data?.query?.pages) ? data.query.pages : [];

  return pages
    .filter(p => p?.thumbnail?.source)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    .map(p => ({
      src: String(p.thumbnail.source),
      title: String(p.title || ''),
      pageUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(p.title || '').replace(/ /g, '_'))}`,
      credit: 'Wikipedia',
    }));
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const q = String(req.query?.q || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const n = Math.min(Math.max(parseInt(String(req.query?.n || '6'), 10) || 6, 1), 8);

  if (q.length < 2) {
    res.status(400).json({ error: 'Query terlalu pendek' });
    return;
  }

  try {
    const [id, en] = await Promise.allSettled([fromWikipedia('id', q), fromWikipedia('en', q)]);
    const merged: Img[] = [
      ...(id.status === 'fulfilled' ? id.value : []),
      ...(en.status === 'fulfilled' ? en.value : []),
    ];

    // Buang duplikat (gambar yang sama muncul di id & en)
    const seen = new Set<string>();
    const images: Img[] = [];
    for (const img of merged) {
      const key = img.src.split('/').slice(-1)[0].replace(/^\d+px-/, '');
      if (seen.has(key)) continue;
      seen.add(key);
      images.push(img);
      if (images.length >= n) break;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ images });
  } catch {
    res.status(200).json({ images: [] });
  }
}
