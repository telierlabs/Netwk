// ─────────────────────────────────────────────
// api/resolve-sources.ts   ← letakkan di ROOT repo (folder `api`), BUKAN di dalam src/
//
// Fungsi serverless Vercel. Tugasnya: menerima link redirect sumber dari Gemini
// (vertexaisearch.cloud.google.com/grounding-api-redirect/...), mengikutinya sampai
// ke artikel aslinya, lalu mengambil judul + deskripsi (og:title / og:description).
//
// Kenapa harus di server: browser tidak boleh membaca hasil redirect / isi halaman
// situs lain (CORS), sedangkan Gemini cuma memberi nama domain, bukan judul artikel.
//
// Keamanan:
//   • hanya menerima link yang host-nya vertexaisearch.cloud.google.com
//   • tiap lompatan redirect divalidasi: harus https & host publik (bukan localhost / IP)
//   • isi halaman dibaca maksimal ~250 KB, semua request punya batas waktu
// ─────────────────────────────────────────────

const VERTEX_HOST = 'vertexaisearch.cloud.google.com';
const MAX_URLS = 12;
const MAX_HOPS = 5;
const MAX_BYTES = 250_000;
const TOTAL_BUDGET_MS = 8000;

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; CylenBot/1.0; +https://cylenai.com)',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'id,en;q=0.8',
};

interface Resolved {
  source: string;
  url: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  domain: string | null;
}

function isPublicHost(host: string): boolean {
  const h = host.toLowerCase();
  if (!h.includes('.')) return false;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false; // IPv4 literal
  if (h.includes(':') || h.startsWith('[')) return false; // IPv6 literal
  return true;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const clean = (s: string | null | undefined, max: number): string | null => {
  if (!s) return null;
  const t = decodeEntities(s).replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

// Ambil semua <meta ...> lalu baca atributnya satu-satu (tahan terhadap urutan atribut & tanda kutip)
function parseMetas(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const tags = html.match(/<meta\s[^>]*>/gi) || [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tag))) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? '';
    const key = (attrs['property'] || attrs['name'] || '').toLowerCase();
    if (key && attrs['content'] && !(key in out)) out[key] = attrs['content'];
  }
  return out;
}

async function readLimited(res: Response): Promise<string> {
  const body: any = res.body;
  if (!body || typeof body.getReader !== 'function') return (await res.text()).slice(0, MAX_BYTES);
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let html = '';
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break; // judul & meta ada di <head>, sisanya tidak perlu
  }
  try { await reader.cancel(); } catch { /* abaikan */ }
  return html;
}

async function resolveOne(raw: string): Promise<Resolved> {
  const empty: Resolved = { source: raw, url: null, title: null, description: null, image: null, domain: null };
  try {
    const first = new URL(raw);
    if (first.protocol !== 'https:' || first.hostname !== VERTEX_HOST) return empty;

    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let current = first.toString();
    let page: Response | null = null;

    // Ikuti redirect secara manual supaya tiap lompatan bisa divalidasi
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const left = deadline - Date.now();
      if (left <= 0) break;
      const r = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: HEADERS,
        signal: AbortSignal.timeout(Math.min(4000, left)),
      });
      if (r.status >= 300 && r.status < 400) {
        const loc = r.headers.get('location');
        if (!loc) break;
        const next = new URL(loc, current);
        if (next.protocol !== 'https:' || !isPublicHost(next.hostname)) break;
        current = next.toString();
        continue;
      }
      page = r;
      break;
    }

    const finalUrl = new URL(current);
    // Kalau masih di host redirect Google (tidak berhasil keluar) → anggap gagal
    if (finalUrl.hostname === VERTEX_HOST) return empty;

    let title: string | null = null;
    let description: string | null = null;
    let image: string | null = null;

    const type = page?.headers.get('content-type') || '';
    if (page && page.ok && /text\/html|application\/xhtml/i.test(type)) {
      const html = await readLimited(page);
      const metas = parseMetas(html);
      const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = clean(metas['og:title'] || metas['twitter:title'] || (titleTag ? titleTag[1] : ''), 180);
      description = clean(metas['og:description'] || metas['twitter:description'] || metas['description'], 220);

      // Gambar utama artikel (og:image) — hanya https supaya tidak diblokir browser (mixed content)
      const imgRaw = metas['og:image'] || metas['og:image:url'] || metas['twitter:image'] || metas['twitter:image:src'];
      if (imgRaw) {
        try {
          const abs = new URL(decodeEntities(imgRaw).trim(), finalUrl);
          if (abs.protocol === 'https:' && abs.toString().length <= 600) image = abs.toString();
        } catch { /* abaikan */ }
      }
    }

    return {
      source: raw,
      url: finalUrl.toString(),
      title,
      description,
      image,
      domain: finalUrl.hostname.replace(/^www\./i, ''),
    };
  } catch {
    return empty;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }

  const urls: string[] = Array.isArray(body?.urls)
    ? body.urls.filter((u: unknown) => typeof u === 'string').slice(0, MAX_URLS)
    : [];

  const results = await Promise.all(urls.map(resolveOne));

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ results });
}
