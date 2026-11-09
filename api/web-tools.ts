// ─────────────────────────────────────────────
// api/web-tools.ts   ← letakkan di ROOT repo (folder `api`), BUKAN di dalam src/
//
// SATU fungsi serverless Vercel untuk 3 keperluan (digabung supaya hemat jatah fungsi paket Hobby):
//
//   POST /api/web-tools?op=resolve   body: { urls: ["https://...", ...] }   (maks 8)
//        → { items: [{ input, url, site, title, image?, video?: {provider,id}, channel? }] }
//        Mengikuti redirect (termasuk link redirect Google Search), lalu mengambil gambar utama (og:image)
//        dan judul artikel. Link YouTube / Vimeo dikenali sebagai video (judul + thumbnail lewat oEmbed).
//
//   GET  /api/web-tools?op=site&domain=teliernews.com
//        → { domain, site, description, image, items: [{ title, url, image?, description?, date? }] }
//        Membaca RSS/Atom situs itu (atau halaman depannya) — untuk situs yang belum terindeks Google.
//
//   GET  /api/web-tools?op=fx&base=USD&quote=IDR&days=7
//        → { base, quote, source, points: [{ date, value }] }   data kurs asli (Frankfurter / kurs referensi ECB)
//
// Keamanan: semua URL keluar divalidasi (hanya http/https, port standar, bukan localhost / IP privat,
// tiap lompatan redirect dicek ulang), ukuran halaman dibatasi, ada timeout.
// ─────────────────────────────────────────────
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const UA = 'Mozilla/5.0 (compatible; CylenAI/1.0; +https://cylenai.com)';
const MAX_HTML = 350_000;
const MAX_HOPS = 5;

// ── validasi alamat (anti SSRF) ──
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:');
  }
  return true;
}

async function assertSafeUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
  if (u.port && u.port !== '80' && u.port !== '443') throw new Error('port');
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new Error('host');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('ip');
  } else {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some(a => isPrivateIp(a.address))) throw new Error('ip');
  }
  return u;
}

async function readLimited(res: Response, limit: number): Promise<string> {
  const reader = (res.body as any)?.getReader?.();
  if (!reader) return (await res.text()).slice(0, limit);
  const dec = new TextDecoder('utf-8', { fatal: false });
  let out = '';
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    out += dec.decode(value, { stream: true });
    if (size >= limit) { try { await reader.cancel(); } catch { /* abaikan */ } break; }
  }
  return out;
}

// fetch dengan redirect manual (tiap hop divalidasi)
async function safeGet(url: string, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5', timeoutMs = 4500) {
  let current = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const u = await assertSafeUrl(current);
    const res = await fetch(u.toString(), {
      redirect: 'manual',
      headers: { 'user-agent': UA, accept, 'accept-language': 'id,en;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location') as string, u).toString();
      continue;
    }
    return { res, finalUrl: u.toString() };
  }
  throw new Error('redirect');
}

// ── parsing HTML ──
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)));
}
const stripTags = (s: string) => decodeEntities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function metaMap(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const head = html.slice(0, 200_000);
  const re = /<meta\s+([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head))) {
    const attrs: Record<string, string> = {};
    const are = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let a: RegExpExecArray | null;
    while ((a = are.exec(m[1]))) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? '';
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content && !(key in out)) out[key] = decodeEntities(attrs.content.trim());
  }
  return out;
}
function pageTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html.slice(0, 200_000));
  return m ? stripTags(m[1]) : '';
}
function absUrl(href: string | undefined, base: string): string | undefined {
  if (!href) return undefined;
  try {
    const u = new URL(href, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch { return undefined; }
}
const siteName = (host: string) => host.replace(/^www\./i, '').replace(/^m\./i, '');

// ── video ──
function youtubeId(u: URL): string | null {
  const h = u.hostname.replace(/^www\.|^m\./, '');
  if (h === 'youtu.be') return u.pathname.slice(1).split('/')[0] || null;
  if (h === 'youtube.com' || h === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = /^\/(shorts|embed|live|v)\/([\w-]{6,})/.exec(u.pathname);
    if (m) return m[2];
  }
  return null;
}
function vimeoId(u: URL): string | null {
  if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
  const m = /\/(\d{5,})/.exec(u.pathname);
  return m ? m[1] : null;
}

async function oembed(endpoint: string): Promise<any | null> {
  try {
    const res = await fetch(endpoint, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

interface Resolved {
  input: string;
  url: string;
  site: string;
  title: string;
  image?: string;
  video?: { provider: 'youtube' | 'vimeo'; id: string };
  channel?: string;
}

async function resolveOne(input: string): Promise<Resolved | null> {
  try {
    const { res, finalUrl } = await safeGet(input);
    const fu = new URL(finalUrl);
    const site = siteName(fu.hostname);

    const yt = youtubeId(fu);
    if (yt) {
      const o = await oembed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${yt}`)}`);
      return {
        input, url: `https://www.youtube.com/watch?v=${yt}`, site: 'youtube.com',
        title: String(o?.title || 'Video YouTube'), channel: o?.author_name ? String(o.author_name) : undefined,
        image: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, video: { provider: 'youtube', id: yt },
      };
    }
    const vm = vimeoId(fu);
    if (vm) {
      const o = await oembed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vm}`)}`);
      return {
        input, url: `https://vimeo.com/${vm}`, site: 'vimeo.com',
        title: String(o?.title || 'Video Vimeo'), channel: o?.author_name ? String(o.author_name) : undefined,
        image: o?.thumbnail_url ? String(o.thumbnail_url) : undefined, video: { provider: 'vimeo', id: vm },
      };
    }

    const ctype = String(res.headers.get('content-type') || '').toLowerCase();
    if (ctype.startsWith('image/')) return { input, url: finalUrl, site, title: site, image: finalUrl };
    if (!res.ok || !(ctype.includes('html') || ctype === '')) return { input, url: finalUrl, site, title: site };

    const html = await readLimited(res, MAX_HTML);
    const meta = metaMap(html);
    const image = absUrl(meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['twitter:image:src'], finalUrl);
    const title = meta['og:title'] || meta['twitter:title'] || pageTitle(html) || site;
    const canonical = absUrl(meta['og:url'], finalUrl);
    return {
      input,
      url: canonical && new URL(canonical).hostname.replace(/^www\./, '') === fu.hostname.replace(/^www\./, '') ? canonical : finalUrl,
      site: meta['og:site_name'] && meta['og:site_name'].length <= 30 ? siteName(fu.hostname) : site,
      title: title.slice(0, 200),
      image,
    };
  } catch {
    return null;
  }
}

// ── baca situs lewat RSS / Atom / halaman depan ──
function parseFeed(xml: string, base: string) {
  const items: { title: string; url: string; image?: string; description?: string; date?: string }[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks.slice(0, 12)) {
    const tag = (n: string) => {
      const m = new RegExp(`<${n}[^>]*>([\\s\\S]*?)<\\/${n}>`, 'i').exec(b);
      return m ? m[1] : '';
    };
    const title = stripTags(tag('title'));
    let link = stripTags(tag('link'));
    if (!link) {
      const m = /<link[^>]+href=["']([^"']+)["']/i.exec(b);
      if (m) link = m[1];
    }
    const url = absUrl(link, base);
    if (!title || !url) continue;

    const rawDesc = tag('description') || tag('summary') || tag('content:encoded') || tag('content');
    let image: string | undefined;
    const mc = /<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i.exec(b);
    const en = /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i.exec(b);
    if (mc) image = mc[1];
    else if (en && /image|jpe?g|png|webp/i.test(en[0])) image = en[1];
    else {
      const im = /<img[^>]+src=["']([^"']+)["']/i.exec(decodeEntities(rawDesc.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')));
      if (im) image = im[1];
    }
    const date = stripTags(tag('pubDate') || tag('published') || tag('updated') || tag('dc:date'));
    items.push({
      title: title.slice(0, 180),
      url,
      image: absUrl(image, base),
      description: stripTags(rawDesc).slice(0, 220) || undefined,
      date: date || undefined,
    });
    if (items.length >= 6) break;
  }
  return items;
}

async function opSite(domainRaw: string) {
  const domain = domainRaw.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) || domain.length > 80) {
    return { error: 'domain tidak valid' };
  }

  let base = `https://${domain}`;
  let html = '';
  let site = domain;
  let description = '';
  let image: string | undefined;
  const feedCandidates: string[] = [];

  for (const host of [`https://${domain}`, `https://www.${domain}`]) {
    try {
      const { res, finalUrl } = await safeGet(host);
      if (!res.ok) continue;
      html = await readLimited(res, MAX_HTML);
      base = finalUrl;
      const meta = metaMap(html);
      site = meta['og:site_name'] || pageTitle(html) || domain;
      description = meta['og:description'] || meta['description'] || '';
      image = absUrl(meta['og:image'] || meta['twitter:image'], finalUrl);
      const re = /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html))) {
        const h = /href=["']([^"']+)["']/i.exec(m[0]);
        const abs = absUrl(h?.[1] ? decodeEntities(h[1]) : undefined, finalUrl);
        if (abs) feedCandidates.push(abs);
      }
      break;
    } catch { /* coba host berikutnya */ }
  }

  for (const p of ['/feed', '/rss', '/rss.xml', '/feed.xml', '/index.xml', '/atom.xml', '/feeds/posts/default?alt=rss']) {
    const abs = absUrl(p, base);
    if (abs && !feedCandidates.includes(abs)) feedCandidates.push(abs);
  }

  let items: ReturnType<typeof parseFeed> = [];
  for (const f of feedCandidates.slice(0, 6)) {
    try {
      const { res, finalUrl } = await safeGet(f, 'application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.3', 3500);
      if (!res.ok) continue;
      const xml = await readLimited(res, 600_000);
      if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml.slice(0, 2000))) continue;
      items = parseFeed(xml, finalUrl);
      if (items.length > 0) break;
    } catch { /* kandidat berikutnya */ }
  }

  // Tanpa feed: ambil tautan artikel dari halaman depan (judul dari teks tautan)
  if (items.length === 0 && html) {
    const seen = new Set<string>();
    const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && items.length < 6) {
      const abs = absUrl(decodeEntities(m[1]), base);
      const text = stripTags(m[2]);
      if (!abs || text.length < 25 || text.length > 160) continue;
      const u = new URL(abs);
      if (u.hostname.replace(/^www\./, '') !== domain || u.pathname.length < 8 || seen.has(abs)) continue;
      seen.add(abs);
      items.push({ title: text, url: abs });
    }
  }

  return { domain, site: stripTags(site).slice(0, 80), description: stripTags(description).slice(0, 240), image, items };
}

// ── kurs asli ──
const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function opFx(baseRaw: string, quoteRaw: string, daysRaw: number) {
  const base = baseRaw.toUpperCase();
  const quote = quoteRaw.toUpperCase();
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) return { error: 'pasangan mata uang tidak valid' };
  const days = Math.min(Math.max(Math.round(daysRaw) || 7, 3), 30);
  const from = new Date(Date.now() - Math.ceil(days * 1.7 + 4) * 86400_000);
  const headers = { 'user-agent': UA, accept: 'application/json' };
  let points: { date: string; value: number }[] = [];

  // v2: [{ date, base, quote, rate }]
  try {
    const r = await fetch(`https://api.frankfurter.dev/v2/rates?from=${ymd(from)}&base=${base}&quotes=${quote}`, { headers, signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const data: any = await r.json();
      if (Array.isArray(data)) {
        points = data
          .filter((x: any) => x && typeof x.date === 'string' && Number.isFinite(Number(x.rate)))
          .map((x: any) => ({ date: x.date, value: Number(x.rate) }));
      }
    }
  } catch { /* coba v1 */ }

  // v1: { rates: { "2025-01-02": { IDR: 16200 } } }
  if (points.length === 0) {
    try {
      const r = await fetch(`https://api.frankfurter.dev/v1/${ymd(from)}..?base=${base}&symbols=${quote}`, { headers, signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const data: any = await r.json();
        const rates = data?.rates && typeof data.rates === 'object' ? data.rates : {};
        points = Object.keys(rates)
          .map(d => ({ date: d, value: Number(rates[d]?.[quote]) }))
          .filter(p => Number.isFinite(p.value));
      }
    } catch { /* menyerah */ }
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  points = points.slice(-days);
  if (points.length < 3) return { error: 'data kurs tidak tersedia' };
  return { base, quote, source: 'Frankfurter (kurs referensi ECB)', points };
}

// ── handler ──
export default async function handler(req: any, res: any) {
  const op = String(req.query?.op || '');
  try {
    if (op === 'resolve') {
      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
      const urls: string[] = (Array.isArray(body?.urls) ? body.urls : [])
        .filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u) && u.length < 1500)
        .slice(0, 8);
      const settled = await Promise.all(urls.map(u => resolveOne(u)));
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ items: settled.filter(Boolean) });
      return;
    }

    if (op === 'site') {
      const out: any = await opSite(String(req.query?.domain || ''));
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
      res.status(out?.error ? 400 : 200).json(out);
      return;
    }

    if (op === 'fx') {
      const out: any = await opFx(String(req.query?.base || 'USD'), String(req.query?.quote || 'IDR'), parseInt(String(req.query?.days || '7'), 10));
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=21600');
      res.status(out?.error ? 502 : 200).json(out);
      return;
    }

    res.status(400).json({ error: 'op tidak dikenal' });
  } catch {
    res.status(200).json({ items: [], error: 'gagal' });
  }
}
