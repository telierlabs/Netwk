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
import type { EntityPhoto } from './entities';

export interface PhotoItem { t: 'photo'; after: number; src: string; title: string; site: string; url: string; logo?: boolean; label?: string; entity?: boolean }
/** Foto tokoh / brand / tempat yang disebut di sebuah paragraf (Wikipedia, judul persis) — satu baris geser, tiap foto utuh. */
export interface GalleryItem {
  t: 'gallery'; after: number;
  layout?: 'auto' | 'single' | 'duo' | 'collage' | 'strip';  // variasi tata letak antar blok (bukan satu pola untuk semua)
  total?: number;                                            // jumlah foto yang ditampilkan lencana di kolase
  items: { src: string; title: string; site: string; url: string; label?: string; logo?: boolean; w?: number; h?: number }[];
}
/** Foto kecil di SAMPING sebuah butir daftar (gaya ChatGPT). `after` = posisi awal butir itu di teks; grp = daftar asalnya. */
export interface ThumbItem { t: 'thumb'; after: number; grp: number; item: { src: string; title: string; site: string; url: string; label?: string; logo?: boolean; w?: number; h?: number } }
export interface VideoItem {
  t: 'video'; after: number; provider: 'youtube' | 'vimeo';
  id: string; thumb: string; title: string; channel?: string; url: string;
}
export interface LinkCard { title: string; url: string; image?: string; site: string; logo?: string }
export interface LinksItem { t: 'links'; after: number; items: LinkCard[] }
/** Grafik data asli (mis. kurs) — dipasang di dalam jawaban, bukan di akhir pesan. */
export interface ChartItem { t: 'chart'; after: number; spec: ChartSpec }
export type MediaItem = PhotoItem | GalleryItem | ThumbItem | VideoItem | LinksItem | ChartItem;

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

// ── relevansi berita / foto: hanya yang membahas topik yang ditanyakan ──
const CHAT_FILLER = new Set(['apa', 'ada', 'tolong', 'carikan', 'cariin', 'cari', 'info', 'berita', 'news', 'terkini', 'terbaru', 'hari', 'ini', 'itu', 'sekarang', 'dong', 'sih', 'nih', 'deh', 'kok', 'nah', 'kalo', 'kalau', 'soal', 'tentang', 'mengenai', 'gimana', 'gimn', 'gmn', 'bagaimana', 'gimana', 'kabar', 'malam', 'pagi', 'siang', 'sore', 'yang', 'dan', 'atau', 'untuk', 'dengan', 'dari', 'pada', 'lagi', 'juga', 'saja', 'aja', 'bisa', 'mau', 'minta', 'kasih', 'kasi', 'tampilkan', 'jelaskan', 'jelasin', 'indonesia', 'yaitu', 'nya', 'lah', 'ya', 'je', 'donk', 'please', 'tuh']);

/** Kata inti topik (nama orang / brand / peristiwa) dari kata kunci pencarian & pertanyaan user, tanpa kata obrolan. */
export function topicWords(...parts: (string | string[] | undefined)[]): string[] {
  const raw = parts.flat().filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\s]/gi, ' ');
  const out: string[] = [];
  for (const w of raw.split(/\s+/)) if (w.length >= 3 && !CHAT_FILLER.has(w) && !out.includes(w)) out.push(w);
  return out.slice(0, 8);
}

/** Bersihkan kata kunci berita: buang kata obrolan supaya pencarian memakai topiknya saja. */
export function cleanNewsKeyword(q: string): string {
  return topicWords(q).join(' ');
}

/** Pilih hanya artikel yang judul / ringkasannya memuat kata inti topik. Topik umum (tanpa kata inti) → apa adanya. */
export function relevantNews<T extends { title: string; description?: string }>(items: T[], words: string[]): T[] {
  if (words.length === 0) return items;
  const need = words.length === 1 ? 1 : Math.max(2, Math.ceil(words.length * 0.4));
  return items.filter(it => {
    const hay = `${it.title} ${it.description || ''}`.toLowerCase();
    let hit = 0;
    for (const w of words) if (hay.includes(w)) hit++;
    return hit >= Math.min(need, words.length);
  });
}

/** Pilih hanya video yang judulnya memuat kata inti topik (hasil pencarian YouTube bisa melenceng). */
export function relevantVideos(hits: VideoHit[], words: string[]): VideoHit[] {
  if (words.length === 0) return hits;
  const rel = relevantNews(hits.map(h => ({ title: `${h.title} ${h.channel || ''}`, h })), words).map(x => x.h);
  return rel;
}

export interface VideoHit { id: string; title: string; channel?: string; duration?: string }

export async function fetchVideos(query: string): Promise<VideoHit[]> {
  const d = await fetchJson(`/api/web-tools?op=videos&q=${encodeURIComponent(query.slice(0, 100))}`, undefined, 8000);
  return (Array.isArray(d?.items) ? d.items : []).filter((v: any) => v && /^[\w-]{11}$/.test(String(v.id)) && v.title).slice(0, 6);
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
  return Array.from(new Set((text.match(YT_RE) || []).map(u => u.replace(/[.,;]+$/, '')))).slice(0, 6);
}

function ytId(u: string): string | null {
  const m = /(?:v=|shorts\/|embed\/|youtu\.be\/)([\w-]{6,})/.exec(u);
  return m ? m[1] : null;
}

// ── penempatan media di dalam jawaban ──────────
interface Block { start: number; end: number; skip: boolean; anchorEnd: number }

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
    out.push({ start, end: start + trimmed.length, skip, anchorEnd: start + trimmed.length });
  };
  const re = /\n{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { push(pos, m.index); pos = m.index + m[0].length; }
  push(pos, text.length);
  // Kalimat pengantar yang berakhir ":" (daftar / tabel menyusul): media dipasang SETELAH blok berikutnya, jangan memisahkan pengantar dari isinya
  out.forEach((b, i) => { if (text.slice(b.start, b.end).trimEnd().endsWith(':') && i + 1 < out.length) b.anchorEnd = out[i + 1].end; });
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
  videoCap?: number;      // default 2
  links?: LinkCard[];     // kartu link (ditaruh di akhir jawaban)
  newsPool?: NewsPhoto[]; // artikel berita asli (judul + foto) → dipasang di paragraf yang membahasnya
  chart?: ChartSpec | null; // grafik data asli → dipasang di awal jawaban
  allowWiki?: boolean;    // foto halaman Wikipedia boleh dipakai (hanya untuk tokoh / brand / tempat, bukan berita)
  brandHints?: string[];  // kata dari pesan user (mis. "cylen") → situs dengan nama itu boleh menampilkan logo / gambar mereknya
  entities?: EntityPhoto[]; // tokoh / brand / tempat yang disebut di jawaban + foto Wikipedia (judul persis) → dipasang di paragraf yang menyebutnya
  extraCharts?: { spec: ChartSpec; after: number }[]; // grafik otomatis dari tabel / daftar angka di jawaban (dipasang setelah tabelnya)
  videoMode?: 'asked' | 'related'; // asked: user meminta video → setelah kalimat pembuka; related: video terkait → di paragraf yang paling cocok / tengah jawaban (tidak pernah di akhir)
  topicWords?: string[];  // kata inti topik: foto berita yang judulnya tidak memuatnya tidak dipakai
  videoHits?: VideoHit[]; // hasil pencarian YouTube asli → selalu dibuat kartu (di paragraf yang menyebutnya, kalau tidak, di akhir)
}

const hostCore = (site: string) => site.replace(/^www\./, '').split('.')[0].toLowerCase();

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

  // ── grafik data asli: di awal jawaban (setelah paragraf pembuka / paragraf pertama yang memuat angka) ──
  if (o.chart) {
    const open = blocks.map((b, i) => ({ b, i })).filter(x => !x.b.skip);
    const pick = open.slice(0, 3).find(x => /\d/.test(text.slice(x.b.start, x.b.end))) || open[0];
    media.push({ t: 'chart', after: pick ? pick.b.end : -1, spec: o.chart });
  }

  // ── grafik otomatis dari tabel / daftar angka di jawaban ──
  for (const c of o.extraCharts || []) media.push({ t: 'chart', after: c.after, spec: c.spec });

  // ── foto ──
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
    const topic = o.topicWords || [];
    // artikel sumber hanya boleh menyumbang foto bila judulnya benar-benar membahas topik (bukan berita lain yang kebetulan disitir)
    const onTopic = (title: string, btxt: string) => topic.length === 0 || relevantNews([{ title }], topic).length > 0 || titleMatch(btxt, title) > 0;

    const usedKeys = new Set<string>();
    const cands: { pos: number; photo: PhotoItem }[] = [];
    const filled = new Set<number>();

    // (0) TOKOH / BRAND / PRODUK / ALBUM / TEMPAT yang disebut → foto Wikipedia berjudul persis, di paragraf yang pertama menyebutnya.
    //     Butir daftar yang menyebut ≥2 entitas → foto kecil DI SAMPING butirnya; selain itu → kolase / baris geser / satu foto (bervariasi).
    const galleries: GalleryItem[] = [];
    const thumbs: ThumbItem[] = [];
    const entBlocks = new Set<number>();
    const ents = o.entities || [];
    if (ents.length > 0) {
      const norm = (x: string) => ` ${x.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/g, ' ').trim()} `;
      const lowerBlocks = blocks.map(b => norm(text.slice(b.start, b.end)));
      const aliasKeys = (e: EntityPhoto): string[] => {
        const al = new Set<string>();
        for (const a of e.aliases) { const k = norm(a).trim(); if (k.length >= 3) al.add(k); }
        if (e.kind === 'person') for (const a of Array.from(al)) { const last = a.split(' ').pop() || ''; if (a.includes(' ') && last.length >= 4) al.add(last); }
        if (e.kind === 'work') for (const a of Array.from(al)) { const base = a.replace(/\s*\(.*$/, '').trim(); if (base.length >= 3) al.add(base); }
        return Array.from(al);
      };
      const eligible = (bi: number) => { const bt = text.slice(blocks[bi].start, blocks[bi].end).trim(); return bt.length >= 25 && !bt.includes('```') && !/^(#|\||>|---|\*\*\*|!\[)/.test(bt); };
      const mentions = (e: EntityPhoto): number[] => {
        const keys = aliasKeys(e);
        const out: number[] = [];
        blocks.forEach((_b, bi) => { if (eligible(bi) && keys.some(k => lowerBlocks[bi].includes(` ${k} `) || lowerBlocks[bi].includes(` ${k}s `))) out.push(bi); });
        return out;
      };
      const isListBlock = (bi: number) => /^\s*([-*+]|\d+[.)])\s/.test(text.slice(blocks[bi].start, blocks[bi].end));
      /** awal baris daftar yang menyebut entitas itu (posisi di teks), atau -1 */
      const lineStart = (e: EntityPhoto, bi: number): number => {
        const keys = aliasKeys(e);
        const b = blocks[bi];
        let off = b.start;
        for (const line of text.slice(b.start, b.end).split('\n')) {
          if (/^\s*([-*+]|\d+[.)])\s/.test(line) && keys.some(k => norm(line).includes(` ${k} `))) return off + (line.length - line.trimStart().length);
          off += line.length + 1;
        }
        return -1;
      };
      const toItem = (e: EntityPhoto) => ({ src: e.src, title: e.title, site: e.site, url: e.url, label: e.title, ...(e.logo ? { logo: true } : {}), ...(e.w && e.h ? { w: e.w, h: e.h } : {}) });
      const order = { person: 0, org: 1, work: 2, place: 3, other: 4 } as const;
      const regular = ents.filter(e => e.group !== 'albums');
      const ranked = regular.slice().sort((a, b) => (a.logo ? 1 : 0) - (b.logo ? 1 : 0) || order[a.kind] - order[b.kind]);
      const perBlock = new Map<number, EntityPhoto[]>();
      const listCand = new Map<number, { e: EntityPhoto; at: number }[]>();
      let total = 0;
      const budget = Math.max(o.photoCap, 8);
      for (const e of ranked) {
        if (total >= budget) break;
        if (usedKeys.has(imgKey(e.src))) continue;
        const where = mentions(e).find(bi => (perBlock.get(bi) || []).length + (listCand.get(bi) || []).length < (isListBlock(bi) ? 8 : 3));
        if (where === undefined) continue;
        usedKeys.add(imgKey(e.src));
        total++;
        const at = isListBlock(where) ? lineStart(e, where) : -1;
        if (at >= 0) listCand.set(where, [...(listCand.get(where) || []), { e, at }]);
        else perBlock.set(where, [...(perBlock.get(where) || []), e]);
      }
      for (const [bi, c] of listCand) {
        if (c.length >= 2) {
          const seenAt = new Set<number>();
          for (const { e, at } of c) { if (seenAt.has(at)) { perBlock.set(bi, [...(perBlock.get(bi) || []), e]); continue; } seenAt.add(at); thumbs.push({ t: 'thumb', after: at, grp: bi, item: toItem(e) }); }
          entBlocks.add(bi);
        } else for (const { e } of c) perBlock.set(bi, [...(perBlock.get(bi) || []), e]);
      }
      const bis = Array.from(perBlock.keys()).sort((a, b) => a - b);
      bis.forEach((bi, gi) => {
        const list = perBlock.get(bi) as EntityPhoto[];
        list.sort((a, b) => (a.logo ? 1 : 0) - (b.logo ? 1 : 0) || order[a.kind] - order[b.kind]);
        const layout: GalleryItem['layout'] = list.length === 3 ? (gi % 2 === 0 ? 'collage' : 'strip') : 'auto';
        galleries.push({ t: 'gallery', after: blocks[bi].anchorEnd, layout, items: list.map(toItem) });
        entBlocks.add(bi);
      });

      // sampul album asli (iTunes) → satu baris sampul di paragraf yang membahas album
      const albums = ents.filter(e => e.group === 'albums' && !usedKeys.has(imgKey(e.src)));
      if (albums.length >= 2) {
        const owner = albums[0].owner ? norm(albums[0].owner.replace(/\s*\(.*$/, '')) : '';
        let bi = blocks.findIndex((_b, i) => eligible(i) && /\salbums?\s/.test(lowerBlocks[i]));
        if (bi === -1 && owner.trim()) bi = blocks.findIndex((_b, i) => eligible(i) && lowerBlocks[i].includes(owner));
        if (bi !== -1) {
          albums.forEach(a => usedKeys.add(imgKey(a.src)));
          galleries.push({ t: 'gallery', after: blocks[bi].anchorEnd, layout: 'strip', total: albums.length, items: albums.slice(0, 8).map(a => ({ src: a.src, title: a.title, site: a.site, url: a.url, label: a.title })) });
        }
      }
      galleries.sort((a, b) => a.after - b.after);
    }

    blocks.forEach((b, bi) => {
      if (b.skip) return;
      const btxt = text.slice(b.start, b.end);

      // (1) gambar utama artikel yang disitir paragraf ini — hanya bila artikelnya membahas topik
      let photo: PhotoItem | null = null;
      for (const id of idsByBlock.get(bi) || []) {
        const s = o.sources[id];
        const r = s ? o.resolver.get(sourceKey(s)) : null;
        if (!r || r.video) continue;
        const u = usable(r.image, r.url, r.site);
        if (!u.ok || (!o.allowWiki && isWiki(r.site)) || usedKeys.has(imgKey(r.image as string)) || !onTopic(r.title, btxt)) continue;
        photo = { t: 'photo', after: b.anchorEnd, src: r.image as string, title: r.title, site: r.site, url: r.url, ...(u.logo ? { logo: true } : {}) };
        break;
      }

      // (2) artikel berita asli yang judulnya dibahas paragraf ini
      if (!photo && o.newsPool) {
        let best: { it: NewsPhoto; score: number } | null = null;
        for (const it of o.newsPool) {
          if (!it.image || badImage(it.image) || homepageLike(it.url) || usedKeys.has(imgKey(it.image))) continue;
          const sc = titleMatch(btxt, it.title);
          if (sc > 0 && (!best || sc > best.score)) best = { it, score: sc };
        }
        if (best) photo = { t: 'photo', after: b.anchorEnd, src: best.it.image as string, title: best.it.title, site: best.it.site, url: best.it.url };
      }

      // paragraf yang sudah punya foto tokoh / brand tidak ditambah foto artikel lagi (hindari dobel)
      if (photo && entBlocks.has(bi)) photo = null;
      if (photo) { usedKeys.add(imgKey(photo.src)); cands.push({ pos: b.anchorEnd, photo }); filled.add(bi); }
    });

    // (3) berita asli yang benar-benar tentang topik tapi judulnya tidak disebut paragraf mana pun → isi paragraf yang masih kosong.
    //     Foto dari sumber lain yang tidak terkait TIDAK dipakai lagi (itu sumber foto nyasar).
    const leftovers: PhotoItem[] = [];
    if (galleries.length === 0 && thumbs.length === 0) {
      for (const it of relevantNews(o.newsPool || [], topic)) {
        if (!it.image || badImage(it.image) || homepageLike(it.url) || usedKeys.has(imgKey(it.image))) continue;
        usedKeys.add(imgKey(it.image));
        leftovers.push({ t: 'photo', after: 0, src: it.image, title: it.title, site: it.site, url: it.url });
      }
    }
    const gaps = blocks.map((b, i) => ({ b, i })).filter(x => !x.b.skip && !filled.has(x.i) && !entBlocks.has(x.i));
    const k = Math.min(leftovers.length, gaps.length, Math.max(0, o.photoCap - cands.length - galleries.length), 3);
    for (let j = 0; j < k; j++) {
      const g = gaps[k === 1 ? 0 : Math.round((j * (gaps.length - 1)) / (k - 1))];
      cands.push({ pos: g.b.anchorEnd, photo: { ...leftovers[j], after: g.b.anchorEnd } });
    }
    cands.sort((a, b) => a.pos - b.pos);

    const room = Math.max(0, o.photoCap + 2 - galleries.reduce((n, g) => n + g.items.length, 0) - thumbs.length);
    const n = Math.min(room, cands.length);
    const chosen = new Set<number>();
    for (let i = 0; i < n; i++) chosen.add(n === 1 ? 0 : Math.round((i * (cands.length - 1)) / (n - 1)));
    media.push(...galleries, ...thumbs);
    Array.from(chosen).sort((a, b) => a - b).forEach(i => media.push(cands[i].photo));
  }

  // ── video: HANYA yang terverifikasi YouTube/Vimeo (judul diambil dari sumbernya) ──
  const videoCap = o.videoCap ?? (o.videoMode === 'related' ? 3 : 6);
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
    if (!r || !r.video) continue; // link karangan / tidak dikenal YouTube → tidak jadi kartu
    addVideo({
      t: 'video', after: (m.index ?? 0) + m[0].length, provider: 'youtube', id,
      thumb: r.image || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      title: r.title, channel: r.channel, url: `https://www.youtube.com/watch?v=${id}`,
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
  // hasil pencarian YouTube asli: selalu jadi kartu (tidak tergantung model menulis URL-nya)
  const hitsOk = relevantVideos(o.videoHits || [], o.topicWords || []);
  const hitList = hitsOk.length > 0 || o.videoMode === 'related' ? hitsOk : (o.videoHits || []).slice(0, 3);
  for (const h of hitList) {
    if (videos.length >= videoCap || seenVideo.has(h.id)) continue;
    seenVideo.add(h.id);
    videos.push({
      t: 'video', after: -1, provider: 'youtube', id: h.id, thumb: `https://i.ytimg.com/vi/${h.id}/hqdefault.jpg`,
      title: h.title, channel: h.channel, url: `https://www.youtube.com/watch?v=${h.id}`,
    });
  }
  // Penempatan video: JANGAN di akhir. Yang dicari user → setelah kalimat pembuka. Video terkait → di paragraf yang judulnya paling cocok,
  // kalau tidak ada yang cocok disebar di sepertiga / dua pertiga jawaban.
  if (videos.length > 0) {
    const openIdx = blocks.map((b, i) => ({ b, i })).filter(x => !x.b.skip || (!/^(#|\||```)/.test(text.slice(x.b.start, x.b.end).trim()) && text.slice(x.b.start, x.b.end).trim().length >= 25)).map(x => x.i);
    const unplaced = videos.filter(v => v.after < 0);
    if (unplaced.length > 0 && openIdx.length > 0) {
      if (o.videoMode !== 'related') {
        videos.forEach(v => { if (v.after < 0) v.after = blocks[openIdx[0]].anchorEnd; });
      } else {
        const usedBlocks = new Set<number>();
        const rest: VideoItem[] = [];
        for (const v of unplaced) {
          let best = -1, bestScore = 0;
          for (const bi of openIdx) {
            if (usedBlocks.has(bi) || (openIdx.length > 2 && bi === openIdx[openIdx.length - 1])) continue;
            const sc = titleMatch(text.slice(blocks[bi].start, blocks[bi].end), `${v.title} ${v.channel || ''}`);
            if (sc > bestScore) { bestScore = sc; best = bi; }
          }
          if (best >= 0) { v.after = blocks[best].anchorEnd; usedBlocks.add(best); } else rest.push(v);
        }
        const slots = openIdx.length >= 3 ? openIdx.slice(0, -1) : openIdx; // tidak pernah paragraf terakhir kalau ada ≥3 paragraf
        rest.forEach((v, k) => {
          const frac = rest.length === 1 ? 0.4 : (k + 1) / (rest.length + 1);
          let pos = Math.min(slots.length - 1, Math.max(0, Math.round(frac * (slots.length - 1))));
          while (usedBlocks.has(slots[pos]) && pos < slots.length - 1) pos++;
          usedBlocks.add(slots[pos]);
          v.after = blocks[slots[pos]].anchorEnd;
        });
      }
    }
  }
  media.push(...videos);

  if (o.links && o.links.length > 0) media.push({ t: 'links', after: -1, items: o.links.slice(0, 4) });

  return media;
}

/**
 * Pil sumber untuk paragraf yang BELUM punya sitasi dari Gemini (mis. jawaban berita yang disusun dari daftar artikel
 * asli, atau pencarian yang tidak mengembalikan groundingSupports). Paragraf dicocokkan ke sumber lewat judul artikelnya
 * atau nama situsnya yang disebut di paragraf. Hasilnya digabung dengan sitasi Gemini (yang sudah ada tidak diubah).
 */
export function manualCitations(text: string, sources: SourceRef[], existing: CitationRef[] = []): CitationRef[] {
  if (!text || !sources || sources.length === 0) return existing;
  const blocks = splitBlocks(text);
  const covered = new Set<number>();
  for (const c of existing) {
    const pos = Math.max(0, c.end - 1);
    const bi = blocks.findIndex(b => b.start <= pos && pos < b.end + 1);
    if (bi !== -1) covered.add(bi);
  }
  const cores = sources.map(s => {
    try {
      const h = new URL(s.url).hostname.replace(/^www\./, '');
      if (/google\./.test(h)) return '';
      const core = h.split('.')[0].toLowerCase();
      return core.length >= 5 ? core : '';
    } catch { return ''; }
  });
  const out = [...existing];
  blocks.forEach((b, bi) => {
    if (b.skip || covered.has(bi)) return;
    const btxt = text.slice(b.start, b.end);
    const flat = btxt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const scored: { id: number; sc: number }[] = [];
    sources.forEach((s, id) => {
      let sc = titleMatch(btxt, s.title || '');
      if (!sc && cores[id] && flat.includes(cores[id])) sc = 0.3;
      if (sc > 0) scored.push({ id, sc });
    });
    if (scored.length === 0) return;
    scored.sort((a, b) => b.sc - a.sc);
    out.push({ end: b.end, ids: scored.slice(0, 3).map(x => x.id) });
  });
  return out.sort((a, b) => a.end - b.end);
}

/** Banyak foto sumber yang boleh dipasang menurut tingkat intent. */
export const photoCapFor = (level: 'none' | 'few' | 'rich') => (level === 'rich' ? 8 : level === 'few' ? 6 : 0);
