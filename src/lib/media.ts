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

export interface PhotoItem { t: 'photo'; after: number; src: string; title: string; site: string; url: string; logo?: boolean }
export interface VideoItem {
  t: 'video'; after: number; provider: 'youtube' | 'vimeo';
  id: string; thumb: string; title: string; channel?: string; url: string;
}
export interface LinkCard { title: string; url: string; image?: string; site: string; logo?: string }
export interface LinksItem { t: 'links'; after: number; items: LinkCard[] }
/** Grafik data asli (mis. kurs) — dipasang di dalam jawaban, bukan di akhir pesan. */
export interface ChartItem { t: 'chart'; after: number; spec: ChartSpec }
export type MediaItem = PhotoItem | VideoItem | LinksItem | ChartItem;

/** Artikel berita asli (judul + foto artikelnya sendiri) — dari GNews / RSS media besar. */
export interface NewsPhoto { title: string; url: string; image?: string; site: string; description?: string }

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
  domain: string; site: string; description: string; image?: string; logo?: string;
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
  const logo = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.domain)}&sz=64`;
  return s.items.slice(0, 4).map(it => ({ title: it.title, url: it.url, image: it.image, site: s.domain, logo }));
}

// ── berita asli & video asli ──
export async function fetchNewsPool(query: string): Promise<NewsPhoto[]> {
  const d = await fetchJson(`/api/web-tools?op=news&q=${encodeURIComponent(query.slice(0, 100))}`, undefined, 7000);
  const items = Array.isArray(d?.items) ? d.items : [];
  return items
    .filter((x: any) => x && typeof x.title === 'string' && typeof x.url === 'string')
    .map((x: any) => ({ title: x.title, url: x.url, image: typeof x.image === 'string' ? x.image : undefined, site: String(x.site || ''), description: x.description }));
}

export interface VideoHit { id: string; title: string; channel?: string; duration?: string }

export async function fetchVideos(query: string): Promise<VideoHit[]> {
  const d = await fetchJson(`/api/web-tools?op=videos&q=${encodeURIComponent(query.slice(0, 100))}`, undefined, 8000);
  return (Array.isArray(d?.items) ? d.items : []).filter((v: any) => v && /^[\w-]{11}$/.test(String(v.id)) && v.title).slice(0, 5);
}

export function videosContext(v: VideoHit[]): string {
  if (v.length === 0) return '';
  return '\n\n=== VIDEO YOUTUBE ASLI (hasil pencarian) ===\n' + v.map((x, i) =>
    `${i + 1}. ${x.title}${x.channel ? ` — ${x.channel}` : ''}${x.duration ? ` (${x.duration})` : ''}\nURL: https://www.youtube.com/watch?v=${x.id}`
  ).join('\n\n');
}

export function newsPoolContext(items: NewsPhoto[]): string {
  if (items.length === 0) return '';
  return '\n\n=== ARTIKEL BERITA ASLI (judul persis dari sumber) ===\n' + items.slice(0, 10).map((x, i) =>
    `${i + 1}. ${x.title} — ${x.site}${x.description ? `\n${x.description.slice(0, 160)}` : ''}\nURL: ${x.url}`
  ).join('\n\n');
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
const MAX_RESOLVE = 32;   // total link sumber yang diikuti per jawaban (dikirim bertahap, 8 per permintaan)

export interface Resolver {
  /** force = true → tidak dihitung ke batas total (dipakai untuk link video, supaya tidak pernah kehabisan jatah) */
  request: (urls: string[], force?: boolean) => void;
  settle: (ms: number) => Promise<void>;
  get: (url: string) => Resolved | null;
}

export function createResolver(): Resolver {
  const results = new Map<string, Resolved>();
  const seen = new Set<string>();
  const pending = new Set<Promise<void>>();
  let counted = 0;

  const send = (batch: string[]) => {
    const p: Promise<void> = fetchJson('/api/web-tools?op=resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ urls: batch }),
    }, 9000).then(d => {
      for (const it of (Array.isArray(d?.items) ? d.items : []) as Resolved[]) {
        if (it && typeof it.input === 'string') results.set(it.input, it);
      }
    }).catch(() => { /* diam: media hanya tambahan */ }).then(() => { pending.delete(p); });
    pending.add(p);
  };

  const request = (urls: string[], force = false) => {
    let fresh = Array.from(new Set(urls.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u) && !seen.has(u))));
    if (!force) fresh = fresh.slice(0, Math.max(0, MAX_RESOLVE - counted));
    if (fresh.length === 0) return;
    fresh.forEach(u => seen.add(u));
    if (!force) counted += fresh.length;
    for (let i = 0; i < fresh.length; i += 8) send(fresh.slice(i, i + 8));
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
  return Array.from(new Set((text.match(YT_RE) || []).map(u => u.replace(/[.,;]+$/, '')))).slice(0, 5);
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

const badImage = (src: string) => /logo|favicon|sprite|placeholder|default[-_]?(image|og)|\.svg(\?|$)|\.ico(\?|$)/i.test(src);

/** Halaman depan / kategori portal (bukan artikel) — fotonya cuma screenshot / banner situs. */
export function homepageLike(url: string): boolean {
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length === 0) return true;
    if (segs.length === 1 && !/[-_]/.test(segs[0]) && !/\d/.test(segs[0]) && segs[0].length <= 14) return true; // /nasional, /bisnis
    return /^\/(tag|topik|topic|category|kategori|indeks|index|search|cari)\b/i.test(u.pathname) && segs.length <= 2;
  } catch { return true; }
}

/** Kunci gambar: nama file tanpa ukuran, supaya gambar yang sama beda resolusi dianggap satu. */
function imgKey(src: string): string {
  try {
    const u = new URL(src);
    const file = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || u.pathname);
    return (u.hostname.replace(/^www\./, '') + '|' + file.replace(/^\d+px-/, '').replace(/[-_]?\d{2,4}x\d{2,4}/, '').replace(/\.[a-z0-9]+$/i, '')).toLowerCase();
  } catch { return src.toLowerCase(); }
}

const STOP = new Set(['yang', 'dan', 'untuk', 'dengan', 'dari', 'pada', 'akan', 'oleh', 'dalam', 'juga', 'bagi', 'atau', 'saat', 'telah', 'sudah', 'sedang', 'adalah', 'tersebut', 'ini', 'itu', 'para', 'serta', 'hingga', 'agar', 'bisa', 'ke', 'di']);
const tokens = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w)));

/** Seberapa cocok sebuah paragraf dengan judul artikel (0–1, berdasarkan kata judul yang muncul di paragraf). */
function titleMatch(blockText: string, title: string): number {
  const bt = tokens(blockText);
  const tt = Array.from(tokens(title));
  if (tt.length < 2) return 0;
  let hit = 0;
  for (const w of tt) if (bt.has(w)) hit++;
  const ratio = hit / tt.length;
  return hit >= 3 || (hit >= 2 && ratio >= 0.4) ? ratio : 0;
}

const isWiki = (site: string) => /wikipedia\.org|wikimedia\.org|wikipedia$/i.test(site);

export interface BuildMediaOpts {
  text: string;
  citations: CitationRef[];
  sources: SourceRef[];
  resolver: Resolver;
  photoCap: number;       // 0 = tanpa foto sumber
  videoCap?: number;      // default 5
  links?: LinkCard[];     // kartu link (ditaruh di akhir jawaban)
  newsPool?: NewsPhoto[]; // artikel berita asli (judul + foto) → dipasang di paragraf yang membahasnya
  chart?: ChartSpec | null; // grafik data asli → dipasang di awal jawaban
  allowWiki?: boolean;    // foto halaman Wikipedia boleh dipakai (hanya untuk tokoh / brand / tempat, bukan berita)
  brandHints?: string[];  // kata dari pesan user (mis. "cylen") → situs dengan nama itu boleh menampilkan logo / gambar mereknya
  videoHits?: VideoHit[]; // hasil pencarian YouTube asli → selalu dibuat kartu (di awal)
}

const hostCore = (site: string) => site.replace(/^www\./, '').split('.')[0].toLowerCase();

export function buildMedia(o: BuildMediaOpts): MediaItem[] {
  const media: MediaItem[] = [];
  const text = o.text || '';
  const blocks = splitBlocks(text);

  // Tentukan posisi awal (setelah paragraf pertama/intro) supaya video & grafik muncul di BAGIAN ATAS / AWAL
  const firstBlockEnd = blocks[0]?.end ?? 0;

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

  // ── 1. VIDEO: DIAMBIL DI AWAL (setelah intro pertama) agar langsung muncul di atas ──
  const videoCap = o.videoCap ?? 5;
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
    if (!r || !r.video) continue; 
    addVideo({
      t: 'video', after: firstBlockEnd, provider: 'youtube', id,
      thumb: r.image || `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){id}/hqdefault.jpg`,
      title: r.title, channel: r.channel, url: `[https://www.youtube.com/watch?v=$](https://www.youtube.com/watch?v=$){id}`,
    });
  }
  o.sources.forEach((s, id) => {
    const r = o.resolver.get(sourceKey(s));
    if (!r?.video) return;
    addVideo({
      t: 'video', after: firstBlockEnd, provider: r.video.provider, id: r.video.id,
      thumb: r.image || (r.video.provider === 'youtube' ? `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){r.video.id}/hqdefault.jpg` : ''),
      title: r.title, channel: r.channel, url: r.url,
    });
  });
  // hasil pencarian YouTube asli: dipasang sebagai kartu di bagian awal
  for (const h of o.videoHits || []) {
    if (videos.length >= videoCap || seenVideo.has(h.id)) continue;
    seenVideo.add(h.id);
    videos.push({
      t: 'video', after: firstBlockEnd, provider: 'youtube', id: h.id, thumb: `[https://i.ytimg.com/vi/$](https://i.ytimg.com/vi/$){h.id}/hqdefault.jpg`,
      title: h.title, channel: h.channel, url: `[https://www.youtube.com/watch?v=$](https://www.youtube.com/watch?v=$){h.id}`,
    });
  }
  // Masukkan video ke urutan PALING ATAS media
  media.push(...videos);

  // ── 2. GRAFIK DATA ASLI (Kurs): Langsung di awal setelah video ──
  if (o.chart) {
    media.push({ t: 'chart', after: firstBlockEnd, spec: o.chart });
  }

  // ── 3. FOTO: satu per paragraf, disebar rata (atas / tengah / bawah), tanpa gambar kembar ──
  if (o.photoCap > 0) {
    const hints = (o.brandHints || []).map(h => h.toLowerCase()).filter(h => h.length >= 4);
    const isBrandSite = (site: string) => {
      const core = hostCore(site);
      return core.length >= 4 && hints.some(h => core.includes(h) || h.includes(core));
    };
    const usable = (img: string | undefined, url: string, site: string): { ok: boolean; logo: boolean } => {
      if (!img || homepageLike(url) && !isBrandSite(site)) return { ok: false, logo: false };
      const bad = badImage(img);
      if (bad) return isBrandSite(site) && !/\.ico(\?|$)|favicon/i.test(img) ? { ok: true, logo: true } : { ok: false, logo: false };
      return { ok: true, logo: false };
    };

    const usedKeys = new Set<string>();
    const cands: { pos: number; photo: PhotoItem }[] = [];
    const filled = new Set<number>();

    blocks.forEach((b, bi) => {
      if (b.skip) return;
      const btxt = text.slice(b.start, b.end);

      let photo: PhotoItem | null = null;
      for (const id of idsByBlock.get(bi) || []) {
        const s = o.sources[id];
        const r = s ? o.resolver.get(sourceKey(s)) : null;
        if (!r || r.video) continue;
        const u = usable(r.image, r.url, r.site);
        if (!u.ok || (!o.allowWiki && isWiki(r.site)) || usedKeys.has(imgKey(r.image as string))) continue;
        photo = { t: 'photo', after: b.end, src: r.image as string, title: r.title, site: r.site, url: r.url, ...(u.logo ? { logo: true } : {}) };
        break;
      }

      if (!photo && o.newsPool) {
        let best: { it: NewsPhoto; score: number } | null = null;
        for (const it of o.newsPool) {
          if (!it.image || badImage(it.image) || homepageLike(it.url) || usedKeys.has(imgKey(it.image))) continue;
          const sc = titleMatch(btxt, it.title);
          if (sc > 0 && (!best || sc > best.score)) best = { it, score: sc };
        }
        if (best) photo = { t: 'photo', after: b.end, src: best.it.image as string, title: best.it.title, site: best.it.site, url: best.it.url };
      }

      if (photo) { usedKeys.add(imgKey(photo.src)); cands.push({ pos: b.end, photo }); filled.add(bi); }
    });

    const leftovers: PhotoItem[] = [];
    o.sources.forEach(s => {
      const r = o.resolver.get(sourceKey(s));
      if (!r || r.video) return;
      const u = usable(r.image, r.url, r.site);
      if (!u.ok || (!o.allowWiki && isWiki(r.site)) || usedKeys.has(imgKey(r.image as string))) return;
      usedKeys.add(imgKey(r.image as string));
      leftovers.push({ t: 'photo', after: 0, src: r.image as string, title: r.title, site: r.site, url: r.url, ...(u.logo ? { logo: true } : {}) });
    });
    for (const it of o.newsPool || []) {
      if (!it.image || badImage(it.image) || homepageLike(it.url) || usedKeys.has(imgKey(it.image))) continue;
      usedKeys.add(imgKey(it.image));
      leftovers.push({ t: 'photo', after: 0, src: it.image, title: it.title, site: it.site, url: it.url });
    }
    const gaps = blocks.map((b, i) => ({ b, i })).filter(x => !x.b.skip && !filled.has(x.i));
    const k = Math.min(leftovers.length, gaps.length, Math.max(0, o.photoCap - cands.length));
    for (let j = 0; j < k; j++) {
      const g = gaps[k === 1 ? 0 : Math.round((j * (gaps.length - 1)) / (k - 1))];
      cands.push({ pos: g.b.end, photo: { ...leftovers[j], after: g.b.end } });
    }
    cands.sort((a, b) => a.pos - b.pos);

    const n = Math.min(o.photoCap, cands.length);
    const chosen = new Set<number>();
    for (let i = 0; i < n; i++) chosen.add(n === 1 ? 0 : Math.round((i * (cands.length - 1)) / (n - 1)));
    Array.from(chosen).sort((a, b) => a - b).forEach(i => {
      if (cands[i]?.photo) media.push(cands[i].photo);
    });
  }

  if (o.links && o.links.length > 0) media.push({ t: 'links', after: -1, items: o.links.slice(0, 4) });

  return media;
}

/** Banyak foto sumber yang boleh dipasang menurut tingkat intent. */
export const photoCapFor = (level: 'none' | 'few' | 'rich') => (level === 'rich' ? 8 : level === 'few' ? 6 : 0);
