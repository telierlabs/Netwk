// ─────────────────────────────────────────────
// INTENT SERVICE — src/services/intentService.ts
// Memahami pesan user dengan MODEL (bukan daftar kata kunci), sebelum jawaban dibuat:
//   • chat biasa atau perlu info/pencarian?  → menentukan loading (2 titik helix vs 3 titik pencarian)
//   • kalimat singkat hidup untuk loading ("mencari berita di teliernews.com")
//   • kata kunci pencarian, domain yang disebut user, perlu foto seberapa banyak, bedah mendalam, kurs, video
// Kalau panggilan gagal / lambat (> 3,5 dtk) → jatuh ke heuristik sederhana (tidak lebih buruk dari sebelumnya).
// ─────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey } from './geminiService';

export type PhotoLevel = 'none' | 'few' | 'rich';
/** entity = tokoh / brand / produk / tempat / karya (foto Wikipedia/Commons cocok); event = berita, peristiwa, isu, data (foto harus dari artikel sumber) */
export type Subject = 'entity' | 'event' | 'other';

export interface Intent {
  kind: 'chat' | 'info';
  search: boolean;
  news: boolean;
  topic: string;                 // kalimat loading, mis. "mencari harga mobil bekas murah"
  queries: string[];             // kata kunci pencarian (boleh site:domain)
  domain: string | null;         // mis. "teliernews.com"
  photos: PhotoLevel;
  subject: Subject;
  deep: boolean;                 // bedah mendalam tokoh / brand / topik besar
  fx: { base: string; quote: string; days: number } | null;
  video: boolean;
  source: 'model' | 'fallback';
}

export const CHAT_INTENT: Intent = {
  kind: 'chat', search: false, news: false, topic: '', queries: [], domain: null,
  photos: 'none', subject: 'other', deep: false, fx: null, video: false, source: 'fallback',
};

const MODEL = 'gemini-2.5-flash-lite';
const TIMEOUT_MS = 3500;

const SYSTEM = `Kamu adalah pengklasifikasi pesan untuk asisten AI "Cylen". Baca pesan terakhir user (konteks percakapan hanya untuk memahami rujukan seperti "yang tadi"), lalu keluarkan SATU objek JSON saja, tanpa markdown dan tanpa penjelasan, dengan field:

- kind: "chat" kalau obrolan santai, sapaan, curhat, minta kode, matematika, terjemahan, menulis kreatif, minta dibuatkan file (pdf, docx, excel, ppt, gambar) atau hal yang tidak butuh pengetahuan faktual. "info" kalau user minta berita, mencari sesuatu, penjelasan faktual (apa itu, kenapa, siapa, bagaimana, jelaskan, bandingkan), harga, kurs, profil tokoh/brand/produk/tempat, review, rekomendasi.
- search: true kalau jawaban menyangkut DUNIA NYATA: berita, harga, kurs, tokoh, brand, perusahaan, produk (laptop, HP, mobil, dll), tempat, kejadian, kebijakan, statistik, rilis, atau mencari sebuah situs/video. Pertanyaan "siapa / apa itu / jelaskan / bagaimana kabar / bandingkan / rekomendasi" tentang hal nyata SELALU search=true (supaya jawaban punya sumber). false hanya untuk konsep umum yang stabil (matematika, logika, grammar), kode, terjemahan, menulis kreatif, dan obrolan.
- news: true kalau user minta berita / kabar terkini.
- topic: frasa SANGAT singkat (maks 7 kata), huruf kecil, bahasa Indonesia, diawali kata kerja (mencari / membahas / membandingkan / menelusuri / mengecek / meninjau) yang menggambarkan apa yang sedang kamu kerjakan untuk pesan itu, misalnya "mencari harga mobil bekas murah", "membahas data center di indonesia", "mencari berita di teliernews.com". Kosongkan ("") kalau kind chat.
- queries: 1 sampai 3 kata kunci pencarian Google yang bagus. Kalau user menyebut sebuah situs, sertakan satu kueri "site:domain topik" dan satu kueri biasa. Array kosong kalau search=false.
- domain: domain situs yang disebut atau dimaksud user (mis. "teliernews.com"), atau null. Catatan: "teliernews" = "teliernews.com". Kalau user hanya menyebut nama situs tanpa TLD dan kamu tidak yakin, isi null.
- photos: "none" | "few" | "rich". rich = bedah mendalam tokoh/brand/perusahaan/tempat/produk (banyak objek visual). few = penjelasan atau berita yang punya objek jelas untuk difoto. none = topik abstrak/teknis, angka, kurs, jawaban singkat, chat biasa.
- subject: "entity" kalau fokusnya sebuah tokoh, brand, perusahaan, produk, tempat, hewan, atau karya (foto objeknya enak dilihat). "event" kalau fokusnya berita, peristiwa, isu, kebijakan, kasus, data/statistik, atau penjelasan sebab-akibat. "other" untuk selain itu.
- deep: true kalau user minta bedah, analisis mendalam, profil lengkap, atau ulasan menyeluruh tentang tokoh, brand, perusahaan, atau topik besar.
- fx: objek {"base":"USD","quote":"IDR","days":7} kalau user menanyakan kurs / nilai tukar / pergerakan mata uang (days = jumlah hari, default 7; "rupiah" berarti quote IDR dan base USD kecuali disebut lain), selain itu null.
- video: true kalau user meminta video, tutorial video, atau YouTube. Untuk video, isi queries dengan kata kunci pencarian video yang bagus (tanpa kata "youtube").

Contoh: "cari mobil yang bagus murah" → {"kind":"info","search":true,"news":false,"topic":"mencari mobil bagus yang murah","queries":["rekomendasi mobil bekas murah dan bagus indonesia","harga mobil murah terbaik"],"domain":null,"photos":"few","subject":"entity","deep":false,"fx":null,"video":false}
Contoh: "jelasin taylor swift" → {"kind":"info","search":true,"news":false,"topic":"membahas taylor swift","queries":["taylor swift profil dan karier","taylor swift berita terbaru"],"domain":null,"photos":"rich","subject":"entity","deep":true,"fx":null,"video":false}
Contoh: "kenapa mbg dikritik" → {"kind":"info","search":true,"news":true,"topic":"menelusuri kritik terhadap program mbg","queries":["kritik program makan bergizi gratis","evaluasi mbg"],"domain":null,"photos":"few","subject":"event","deep":false,"fx":null,"video":false}
Contoh: "halo, lagi apa?" → {"kind":"chat","search":false,"news":false,"topic":"","queries":[],"domain":null,"photos":"none","subject":"other","deep":false,"fx":null,"video":false}`;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('intent-timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
function cleanDomain(d: any): string | null {
  if (typeof d !== 'string') return null;
  const x = d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  return x.length <= 80 && DOMAIN_RE.test(x) ? x : null;
}

function normalize(raw: any): Intent | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind === 'info' ? 'info' : 'chat';
  const domain = cleanDomain(raw.domain);
  const news = !!raw.news;
  const search = kind === 'info' && (!!raw.search || news || !!domain);
  const photos: PhotoLevel = raw.photos === 'rich' ? 'rich' : raw.photos === 'few' ? 'few' : 'none';

  let fx: Intent['fx'] = null;
  if (raw.fx && typeof raw.fx === 'object') {
    const base = String(raw.fx.base || '').toUpperCase();
    const quote = String(raw.fx.quote || '').toUpperCase();
    if (/^[A-Z]{3}$/.test(base) && /^[A-Z]{3}$/.test(quote) && base !== quote) {
      fx = { base, quote, days: Math.min(Math.max(Math.round(Number(raw.fx.days)) || 7, 5), 30) };
    }
  }

  const queries = (Array.isArray(raw.queries) ? raw.queries : [])
    .filter((q: any) => typeof q === 'string' && q.trim())
    .map((q: string) => q.trim().slice(0, 90))
    .slice(0, 3);

  const topic = typeof raw.topic === 'string' ? raw.topic.trim().replace(/\s+/g, ' ').slice(0, 70) : '';

  return {
    kind,
    search,
    news,
    topic: kind === 'info' ? topic : '',
    queries: search ? queries : [],
    domain,
    photos: kind === 'info' ? photos : 'none',
    subject: kind === 'info' ? (raw.subject === 'entity' ? 'entity' : raw.subject === 'event' || news ? 'event' : 'other') : 'other',
    deep: kind === 'info' && !!raw.deep,
    fx: kind === 'info' ? fx : null,
    video: kind === 'info' && !!raw.video,
    source: 'model',
  };
}

// ── cadangan kalau model tidak bisa dihubungi (sama seperti aturan lama + deteksi domain) ──
const NEWS_RE = /berita|news|terkini|terbaru|hari ini/i;
const INFO_START_RE = /^(apa|cari|carikan|cariin|jelaskan|jelasin|siapa|bagaimana|gimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|harga|cuaca|jadwal|lokasi|tempat)/i;
const DOMAIN_IN_TEXT_RE = /\b([a-z0-9-]{2,}\.(?:com|co\.id|id|net|org|news|my\.id|web\.id|io|ai|app|dev|xyz|info|site|online))\b/i;

export function heuristicIntent(text: string): Intent {
  const t = (text || '').trim();
  const news = NEWS_RE.test(t);
  const info = news || INFO_START_RE.test(t);
  const d = DOMAIN_IN_TEXT_RE.exec(t);
  const domain = d ? cleanDomain(d[1]) : /teliernews/i.test(t) ? 'teliernews.com' : null;
  const isInfo = info || !!domain;
  if (!isInfo) return { ...CHAT_INTENT };
  return {
    kind: 'info', search: true, news, topic: '', queries: [], domain,
    photos: 'few', subject: news ? 'event' : 'other', deep: false, fx: null, video: false, source: 'fallback',
  };
}

/** Pahami pesan user. `context` = potongan percakapan terakhir (opsional). Tidak pernah melempar error. */
export async function analyzeIntent(text: string, context?: string): Promise<Intent> {
  const t = (text || '').trim();
  if (!t) return { ...CHAT_INTENT };
  try {
    const key = getActiveApiKey();
    if (!key) return heuristicIntent(t);
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `${context ? `Konteks percakapan sebelumnya:\n${context.slice(-600)}\n\n` : ''}Pesan terakhir user:\n"""${t.slice(0, 700)}"""`;
    const res = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 400 },
      }),
      TIMEOUT_MS,
    );
    const raw = (res as any).text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
    const intent = normalize(parsed);
    if (intent) {
      // domain yang jelas tertulis di pesan selalu menang atas tebakan model
      const d = DOMAIN_IN_TEXT_RE.exec(t);
      const typed = d ? cleanDomain(d[1]) : null;
      if (typed && intent.domain !== typed) { intent.domain = typed; intent.kind = 'info'; intent.search = true; }
      return intent;
    }
  } catch (e) {
    console.warn('[Cylen] analyzeIntent gagal, pakai heuristik:', (e as any)?.message);
  }
  return heuristicIntent(t);
}

// ─────────────────────────────────────────────
// Instruksi tambahan untuk model jawaban, dibuat dari hasil pemahaman di atas.
// Menggantikan aturan foto yang lama (yang terlalu pelit dan tidak tahu konteks).
// ─────────────────────────────────────────────
export interface InstructionCtx {
  hasSiteData?: boolean;   // isi situs domain sudah disisipkan
  hasFxChart?: boolean;    // grafik kurs asli dibuat oleh sistem
  hasNewsData?: boolean;   // daftar artikel berita ASLI sudah disisipkan
  hasVideoData?: boolean;  // daftar video YouTube ASLI sudah disisipkan
}

export function buildIntentInstruction(intent: Intent, ctx: InstructionCtx = {}): string {
  if (intent.kind !== 'info') return '';
  const L: string[] = [];

  if (intent.domain) {
    L.push(`User menyebut situs ${intent.domain}. Cari lewat Google dengan kueri "site:${intent.domain} <topik>" dan juga kueri biasa memakai nama situsnya.${ctx.hasSiteData ? ' Data "ISI SITUS" di bawah adalah isi terbaru situs itu — pakai sebagai sumber utama.' : ''} Kalau tidak ketemu, katakan terus terang; jangan mengarang isi situs.`);
  }

  if (intent.fx && ctx.hasFxChart) {
    L.push('Data kurs ASLI sudah tersedia di bawah ("DATA KURS") dan grafiknya dibuat otomatis oleh sistem: JANGAN menulis blok ```chart sendiri. Jelaskan tren dengan angka dari data itu (naik/turun berapa, tertinggi, terendah) dan sebut bahwa ini kurs referensi.');
  }

  const fence = '```image-search\nkata kunci foto\n```';
  if (intent.photos === 'none') {
    L.push('Jangan sisipkan blok image-search pada jawaban ini.');
  } else if (intent.subject !== 'entity') {
    // berita / peristiwa / data: foto HANYA dari artikel sumber (ditempel sistem), tidak boleh foto Wikipedia / peta
    L.push('Jangan sisipkan blok image-search pada jawaban ini: topiknya berita/peristiwa, jadi foto dipasang otomatis oleh sistem dari artikel berita sumber. Jangan menulis URL gambar.');
  } else {
    L.push(intent.photos === 'rich'
      ? `Foto: sisipkan 3–4 blok ${fence} TERSEBAR di sepanjang jawaban — satu setelah paragraf pembuka, satu atau dua di tengah, satu menjelang akhir (jangan menumpuk di awal). Setiap blok kata kuncinya BERBEDA dan spesifik (2–5 kata) supaya fotonya tidak itu-itu saja: misalnya nama tokoh + momen/acara/era/karya tertentu ("taylor swift eras tour", "taylor swift grammy 2024"), bukan hanya nama tokohnya berulang. Letakkan TEPAT SETELAH paragraf yang membahas hal itu.`
      : `Foto: sisipkan 1–2 blok ${fence} setelah paragraf yang membahas tokoh/brand/produk/tempat yang jelas (kata kunci 2–5 kata, spesifik). Jangan taruh semuanya di awal.`);
    L.push('Foto dari artikel sumber juga ditambahkan otomatis oleh sistem; jangan menulis URL gambar.');
  }

  if (intent.news || ctx.hasNewsData) {
    L.push(ctx.hasNewsData
      ? 'Untuk berita, utamakan "ARTIKEL BERITA ASLI" di bawah: sebut JUDUL berita persis seperti tertulis (boleh dicetak tebal) dan nama medianya, satu paragraf per berita. Jangan mengutip halaman depan atau halaman kategori portal berita sebagai sumber; pakai hanya artikel dengan judul spesifik. Cari berita lain lewat Google dengan kata kunci spesifik (peristiwa/tokoh/angka), bukan "berita terkini" saja.'
      : 'Untuk berita, cari lewat Google dengan kata kunci SPESIFIK (peristiwa/tokoh/angka), jangan "berita terkini" saja, dan kutip artikel dengan judul spesifik — bukan halaman depan atau kategori portal berita. Tulis judul berita persis seperti di sumber.');
  }

  if (intent.deep) {
    L.push('Ini permintaan BEDAH MENDALAM. Susun jawaban berjenjang dengan sub judul: profil singkat, latar/sejarah, produk/karya/capaian, sorotan atau kritik (hanya yang terverifikasi di sumber), dan "Tautan resmi" berisi website serta akun media sosial resmi (Instagram, X, YouTube, LinkedIn, dll). Tautan HANYA boleh yang benar-benar muncul di hasil pencarian — jangan menebak URL. Tulis sebagai tautan markdown.');
  }

  if (ctx.hasVideoData) {
    L.push('User meminta video. Rekomendasikan video dari "VIDEO YOUTUBE ASLI" di bawah: untuk tiap video tulis satu paragraf (judul video, channel, apa isinya menurut judul) dan taruh URL lengkapnya apa adanya di paragraf itu agar tampil sebagai pemutar. DILARANG menulis URL video selain yang ada di daftar itu atau di hasil pencarian Google, dan jangan menambah "Link Simulasi" atau contoh URL.');
  } else if (intent.video) {
    L.push('User meminta video. Hanya tulis URL YouTube kalau benar-benar muncul di hasil pencarian; jangan pernah mengarang atau menebak URL/ID video. Kalau tidak ada, katakan terus terang dan sarankan kata kunci pencarian YouTube.');
  } else {
    L.push('Kalau hasil pencarian memuat video YouTube yang jelas relevan, boleh tulis URL lengkapnya (maksimal 1–2). Jangan pernah mengarang URL.');
  }

  L.push('Tulis per paragraf (satu paragraf = satu poin utama), pakai tabel Markdown bila ada perbandingan, lalu akhiri dengan SATU kalimat penutup singkat sebagai kesimpulan.');

  return `\n\n[INSTRUKSI SISTEM WAJIB — jangan disebut ke user]:\n${L.map(x => `- ${x}`).join('\n')}`;
}
