// ─────────────────────────────────────────────
// MEDIA — src/lib/media.ts
// Foto / video / kartu link yang menyertai jawaban AI. Semuanya DATA NYATA dari sumber jawaban:
//   • foto  = gambar utama (og:image) artikel sumber, ditempel di paragraf yang menyitir sumber itu
//             → tersebar atas / tengah / bawah, bukan satu baris di atas
//   • video = link YouTube / Vimeo yang muncul di sumber atau di teks jawaban → kartu pemutar
//   • link  = kartu tautan (mis. berita terbaru dari situs yang diminta user)
// Disimpan di msg.media TERPISAH dari teks (copy / memori / riwayat AI tetap bersih),
// lalu dipasang ke dalam markdown oleh MediaBlocks.tsx (plugin remark, mirip pil sumber).
// Juga berisi pemanggil /api/web-tools: resolve link, baca situs, kurs asli → grafik.
// ─────────────────────────────────────────────
import type { ChartSpec } from './chartBlocks';

export interface PhotoItem { t: 'photo'; after: number; src: string; title: string; site: string; url: string }
export interface VideoItem {
  t: 'video'; after: number; provider: 'youtube' | 'vimeo';
  id: string; thumb: string; title: string; channel?: string; url: string;
}
export interface LinkCard { title: string; url: string; image?: string; site: string }
export interface LinksItem { t: 'links'; after: number; items: LinkCard[] }
export type MediaItem = PhotoItem | VideoItem | LinksItem;

export interface Resolved {
  input: string;
  url: string;
  site: string;
  title: string;
  image?: string;
  video?: { provider: 'youtube' | 'vimeo'; id: string };
  channel?: string;
}

interface SourceRef { title: string; url: string; redirect?: string }
interface CitationRef { end: number; ids: number[] }

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 6000): Promise<any | null> {
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    const res = await fetch(url, { ...init, signal: ctrl?.signal });
    if (t) clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── pemanggil API ──────────────────────────────
export interface SiteData {
  domain: string; site: string; description: string; image?: string;
  items: { title: string; url: string; image?: string; description?: string; date?: string }[];
}

export async function fetchSite(domain: string): Promise<SiteData | null> {
  const d = await fetchJson(`/api/web-tools?op=site&domain=${encodeURIComponent(domain)}`, undefined, 9000);
  if (!d || d.error || !Array.isArray(d.items)) return null;
  return d as SiteData;
}

export function siteContext(s: SiteData): string {
  const head = `\n\n=== ISI SITUS ${s.domain} ===\nNama: ${s.site}${s.description ? `\nDeskripsi: ${s.description}` : ''}`;
  if (s.items.length === 0) return `${head}\n(Tidak ada daftar artikel yang bisa dibaca dari situs ini.)`;
  return head + '\n' + s.items.map((it, i) =>
    `${i + 1}. ${it.title}${it.date ? ` (${it.date})` : ''}\nURL: ${it.url}${it.description ? `\nRingkasan: ${it.description}` : ''}`
  ).join('\n\n');
}

export function siteLinkCards(s: SiteData): LinkCard[] {
  return s.items.slice(0, 4).map(it => ({ title: it.title, url: it.url, image: it.image, site: s.domain }));
}

export interface FxData { base: string; quote: string; source: string; points: { date: string; value: number }[] }

export async function fetchFx(base: string, quote: string, days: number): Promise<FxData | null> {
  const d = await fetchJson(`/api/web-tools?op=fx&base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}&days=${days}`, undefined, 9000);
  if (!d || d.error || !Array.isArray(d.points) || d.points.length < 3) return null;
  return d as FxData;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return m >= 1 && m <= 12 ? `${d} ${MON[m - 1]}` : iso;
};

/** Grafik dibuat LANGSUNG dari data kurs asli (bukan angka tebakan model). */
export function fxToChart(fx: FxData): ChartSpec {
  return {
    title: fx.quote === 'IDR' ? `Rupiah per ${fx.base}` : `${fx.base} → ${fx.quote}`,
    type: 'line',
    unit: fx.quote === 'IDR' ? 'Rp' : fx.quote,
    labels: fx.points.map(p => shortDate(p.date)),
    series: [{ name: `${fx.base}/${fx.quote}`, values: fx.points.map(p => p.value) }],
  };
}

export function fxContext(fx: FxData): string {
  const v = fx.points.map(p => p.value);
  const first = v[0], last = v[v.length - 1];
  const diff = last - first;
  const pct = first ? (diff / first) * 100 : 0;
  const f = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 4 });
  return `\n\n=== DATA KURS (${fx.source}) ===\n1 ${fx.base} dalam ${fx.quote}, per hari kerja:\n` +
    fx.points.map(p => `${p.date}: ${f(p.value)}`).join('\n') +
    `\nPerubahan dari awal ke akhir: ${diff >= 0 ? '+' : ''}${f(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%). Tertinggi ${f(Math.max(...v))}, terendah ${f(Math.min(...v))}.`;
}

// ── resolver: ikuti link sumber → gambar utama / video ──────────────
const MAX_RESOLVE = 10;

export interface Resolver {
  request: (urls: string[]) => void;
  settle: (ms: number) => Promise<void>;
  get: (url: string) => Resolved | null;
}

export function createResolver(): Resolver {
  const results = new Map<string, Resolved>();
  const seen = new Set<string>();
  const pending = new Set<Promise<void>>();

  const request = (urls: string[]) => {
    const fresh = Array.from(new Set(urls.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u) && !seen.has(u))))
      .slice(0, Math.max(0, MAX_RESOLVE - seen.size));
    if (fresh.length === 0) return;
    fresh.forEach(u => seen.add(u));
    const p: Promise<void> = fetchJson('/api/web-tools?op=resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ urls: fresh.slice(0, 8) }),
    }, 8000).then(d => {
      for (const it of (Array.isArray(d?.items) ? d.items : []) as Resolved[]) {
        if (it && typeof it.input === 'string') results.set(it.input, it);
      }
    }).catch(() => { /* diam: media hanya tambahan */ }).then(() => { pending.delete(p); });
    pending.add(p);
  };

  const settle = async (ms: number) => {
    if (pending.size === 0) return;
    await Promise.race([Promise.allSettled(Array.from(pending)), sleep(ms)]);
  };

  return { request, settle, get: (u: string) => results.get(u) || null };
}

/** Kunci yang dipakai resolver untuk sebuah sumber (link redirect asli kalau ada). */
export const sourceKey = (s: SourceRef) => s.redirect || s.url;

// ── YouTube di dalam teks jawaban ──────────────
const YT_RE = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?[^\s)\]]*v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}[^\s)\]]*/gi;

export function videoUrlsInText(text: string): string[] {
  return Array.from(new Set((text.match(YT_RE) || []).map(u => u.replace(/[.,;]+$/, '')))).slice(0, 3);
}

function ytId(u: string): string | null {
  const m = /(?:v=|shorts\/|embed\/|youtu\.be\/)([\w-]{6,})/.exec(u);
  return m ? m[1] : null;
}

// ── penempatan media di dalam jawaban ──────────
interface Block { start: number; end: number; skip: boolean }

function splitBlocks(text: string): Block[] {
  const out: Block[] = [];
  let pos = 0;
  let inFence = false;
  const push = (s: number, e: number) => {
    const raw = text.slice(s, e);
    const trimmed = raw.trim();
    if (!trimmed) return;
    const start = s + (raw.length - raw.trimStart().length);
    const fences = (trimmed.match(/```/g) || []).length;
    const wasInFence = inFence;
    if (fences % 2 === 1) inFence = !inFence;
    const skip = wasInFence || fences > 0 || /^(#|\||>|---|\*\*\*|!\[)/.test(trimmed) || trimmed.length < 50;
    out.push({ start, end: start + trimmed.length, skip });
  };
  const re = /\n{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { push(pos, m.index); pos = m.index + m[0].length; }
  push(pos, text.length);
  return out;
}

const badImage = (src: string) => /logo|favicon|sprite|placeholder|default[-_]?(image|og)|\.svg(\?|$)/i.test(src);

export interface BuildMediaOpts {
  text: string;
  citations: CitationRef[];
  sources: SourceRef[];
  resolver: Resolver;
  photoCap: number;       // 0 = tanpa foto sumber
  videoCap?: number;      // default 2
  links?: LinkCard[];     // kartu link (ditaruh di akhir jawaban)
}

export function buildMedia(o: BuildMediaOpts): MediaItem[] {
  const media: MediaItem[] = [];
  const text = o.text || '';
  const blocks = splitBlocks(text);

  // blok → daftar id sumber yang disitir blok itu (urut)
  const idsByBlock = new Map<number, number[]>();
  for (const c of o.citations || []) {
    const pos = Math.max(0, c.end - 1);
    const bi = blocks.findIndex(b => b.start <= pos && pos < b.end + 1);
    if (bi === -1) continue;
    const arr = idsByBlock.get(bi) || [];
    for (const id of c.ids) if (!arr.includes(id)) arr.push(id);
    idsByBlock.set(bi, arr);
  }

  // ── foto: satu per paragraf yang menyitir sumber bergambar, disebar rata ──
  if (o.photoCap > 0) {
    const usedSrc = new Set<string>();
    const cands: { block: Block; photo: PhotoItem }[] = [];
    blocks.forEach((b, bi) => {
      if (b.skip) return;
      for (const id of idsByBlock.get(bi) || []) {
        const s = o.sources[id];
        const r = s ? o.resolver.get(sourceKey(s)) : null;
        if (!r || !r.image || r.video || badImage(r.image) || usedSrc.has(r.image)) continue;
        usedSrc.add(r.image);
        cands.push({ block: b, photo: { t: 'photo', after: b.end, src: r.image, title: r.title, site: r.site, url: r.url } });
        break;
      }
    });
    const n = Math.min(o.photoCap, cands.length);
    const chosen = new Set<number>();
    for (let i = 0; i < n; i++) chosen.add(n === 1 ? 0 : Math.round((i * (cands.length - 1)) / (n - 1)));
    Array.from(chosen).sort((a, b) => a - b).forEach(i => media.push(cands[i].photo));
  }

  // ── video: dari sumber & dari link di teks ──
  const videoCap = o.videoCap ?? 2;
  const seenVideo = new Set<string>();
  const videos: VideoItem[] = [];
  const addVideo = (v: VideoItem) => {
    if (videos.length >= videoCap || seenVideo.has(v.id)) return;
    seenVideo.add(v.id);
    videos.push(v);
  };

  for (const m of text.matchAll(YT_RE)) {
    const url = m[0].replace(/[.,;]+$/, '');
    const id = ytId(url);
    if (!id) continue;
    const r = o.resolver.get(url);
    addVideo({
      t: 'video', after: (m.index ?? 0) + m[0].length, provider: 'youtube', id,
      thumb: r?.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      title: r?.title || 'Video YouTube', channel: r?.channel, url: `https://www.youtube.com/watch?v=${id}`,
    });
  }
  o.sources.forEach((s, id) => {
    const r = o.resolver.get(sourceKey(s));
    if (!r?.video) return;
    let after = -1;
    for (const [bi, ids] of idsByBlock) if (ids.includes(id) && !blocks[bi].skip) { after = blocks[bi].end; break; }
    addVideo({
      t: 'video', after, provider: r.video.provider, id: r.video.id,
      thumb: r.image || (r.video.provider === 'youtube' ? `https://i.ytimg.com/vi/${r.video.id}/hqdefault.jpg` : ''),
      title: r.title, channel: r.channel, url: r.url,
    });
  });
  media.push(...videos);

  if (o.links && o.links.length > 0) media.push({ t: 'links', after: -1, items: o.links.slice(0, 4) });

  return media;
}

/** Banyak foto sumber yang boleh dipasang menurut tingkat intent. */
export const photoCapFor = (level: 'none' | 'few' | 'rich') => (level === 'rich' ? 4 : level === 'few' ? 2 : 0);
