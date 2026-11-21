// ─────────────────────────────────────────────
// INTENT SERVICE — src/services/intentService.ts
// Memahami pesan user dengan MODEL (bukan daftar kata kunci), sebelum jawaban dibuat:
//   • chat biasa atau perlu info/pencarian?  → menentukan loading (2 titik helix vs 3 titik pencarian)
//   • kalimat singkat hidup untuk loading ("mencari berita di teliernews.com")
//   • kata kunci pencarian, domain yang disebut user, perlu foto seberapa banyak, bedah mendalam, kurs, video
// Kalau panggilan gagal / lambat (> 5,5 dtk) → jatuh ke heuristik sederhana (tidak lebih buruk dari sebelumnya).
//
// PERUBAHAN (fix "jawab tanpa cari"):
//   • Prompt model: aturan + contoh baru untuk pesan yang MEMVERIFIKASI kabar / status
//     ("katanya ... udah ...?", "beneran ...?"). Walau santai / typo / menyambung topik lain → wajib info + search.
//   • VERIFY_RE (baru): regex cadangan untuk pola yang sama. Dipakai di heuristik DAN sebagai
//     pemaksa kalau model kecil salah menebak "chat".
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
const TIMEOUT_MS = 5500;
/** Judul loading netral bila model tidak bisa dihubungi — TIDAK PERNAH menyalin pesan user mentah. */
const NEUTRAL_TOPIC = 'menelusuri informasinya';

const SYSTEM = `Kamu adalah pengklasifikasi pesan untuk asisten AI "Cylen". Baca pesan terakhir user (konteks percakapan hanya untuk memahami rujukan seperti "yang tadi"), lalu keluarkan SATU objek JSON saja, tanpa markdown dan tanpa penjelasan, dengan field:

- kind: "chat" kalau obrolan santai, sapaan, curhat, minta kode, matematika, terjemahan, menulis kreatif, minta dibuatkan file (pdf, docx, excel, ppt, gambar) atau hal yang tidak butuh pengetahuan faktual. "info" kalau user minta berita, mencari sesuatu, penjelasan faktual (apa itu, kenapa, siapa, bagaimana, jelaskan, bandingkan), harga, kurs, profil tokoh/brand/produk/tempat, review, rekomendasi.
- search: true kalau jawaban menyangkut DUNIA NYATA: berita, harga, kurs, tokoh, brand, perusahaan, produk (laptop, HP, mobil, dll), tempat, kejadian, kebijakan, statistik, rilis, atau mencari sebuah situs/video. Pertanyaan "siapa / apa itu / jelaskan / bagaimana kabar / bandingkan / rekomendasi" tentang hal nyata SELALU search=true (supaya jawaban punya sumber). false hanya untuk konsep umum yang stabil (matematika, logika, grammar), kode, terjemahan, menulis kreatif, dan obrolan.
- news: true kalau user minta berita / kabar terkini.
- topic: DITULIS ULANG olehmu, JANGAN menyalin pesan user, JANGAN pakai kalimat template. Betulkan salah ketik ("toloh" → tokoh, "taylor swif" → Taylor Swift) dan tulis nama orang / brand dengan huruf kapital yang benar. Frasa SANGAT singkat (maks 7 kata), bahasa Indonesia, diawali kata kerja yang menggambarkan apa yang sedang kamu kerjakan untuk pesan itu. Untuk "info": mencari / membahas / membandingkan / menelusuri / mengecek / meninjau, misalnya "mencari harga mobil bekas murah", "membahas data center di indonesia", "mencari berita di teliernews.com". Untuk "chat" WAJIB diisi juga dengan kata kerja yang cocok dengan isinya, spesifik ke pesan itu (bukan "memikirkan jawaban"): menulis / menghitung / menyusun / menerjemahkan / memeriksa / merangkai / membalas, misalnya "menuliskan surat Al-Fatihah beserta artinya", "menghitung pecahan langkah demi langkah", "memeriksa kode yang error", "menyusun puisi tentang hujan", "membalas sapaanmu".
- queries: 2 sampai 3 kata kunci pencarian Google yang bagus, ditulis ulang olehmu (bukan salinan pesan user, salah ketik sudah dibetulkan), masing-masing mengambil sudut berbeda (profil, karya / produk, kabar terbaru, data). Kalau user menyebut sebuah situs, sertakan satu kueri "site:domain topik" dan satu kueri biasa. Array kosong kalau search=false.
- domain: domain situs yang disebut atau dimaksud user (mis. "teliernews.com"), atau null. Catatan: "teliernews" = "teliernews.com". Kalau user hanya menyebut nama situs tanpa TLD dan kamu tidak yakin, isi null.
- photos: "none" | "few" | "rich". rich = bedah mendalam tokoh/brand/perusahaan/tempat/produk (banyak objek visual). few = penjelasan atau berita yang punya objek jelas untuk difoto. none = topik abstrak/teknis, angka, kurs, jawaban singkat, chat biasa.
- subject: "entity" kalau fokusnya sebuah tokoh, brand, perusahaan, produk, tempat, hewan, atau karya (foto objeknya enak dilihat). "event" kalau fokusnya berita, peristiwa, isu, kebijakan, kasus, data/statistik, atau penjelasan sebab-akibat. "other" untuk selain itu.
- deep: true kalau user minta bedah, analisis mendalam, profil lengkap, atau ulasan menyeluruh tentang tokoh, brand, perusahaan, atau topik besar.
- fx: objek {"base":"USD","quote":"IDR","days":7} kalau user menanyakan kurs / nilai tukar / pergerakan mata uang (days = jumlah hari, default 7; "rupiah" berarti quote IDR dan base USD kecuali disebut lain), selain itu null.
- video: true kalau user meminta video, tutorial video, atau YouTube. Untuk video, isi queries dengan kata kunci pencarian video yang bagus (tanpa kata "youtube").

ATURAN PENTING: pesan yang menanyakan atau memverifikasi KABAR / STATUS / KEJADIAN tentang orang atau hal nyata ("katanya ... udah ...?", "beneran ...?", "bener nggak ...?", "udah ... belum?", "masih ...?", "jadi ...?"), walau nadanya santai, ada salah ketik, atau menyambung obrolan topik lain, WAJIB kind "info" dan search true. Kalau ragu antara chat dan info, pilih "info".

Contoh: "cari mobil yang bagus murah" → {"kind":"info","search":true,"news":false,"topic":"mencari mobil bagus yang murah","queries":["rekomendasi mobil bekas murah dan bagus indonesia","harga mobil murah terbaik"],"domain":null,"photos":"few","subject":"entity","deep":false,"fx":null,"video":false}
Contoh: "cari toloh taylor swif" → {"kind":"info","search":true,"news":false,"topic":"membahas Taylor Swift","queries":["Taylor Swift biografi dan karier","Taylor Swift diskografi dan tur"],"domain":null,"photos":"rich","subject":"entity","deep":true,"fx":null,"video":false}
Contoh: "jelasin taylor swift" → {"kind":"info","search":true,"news":false,"topic":"membahas Taylor Swift","queries":["Taylor Swift profil dan karier","Taylor Swift berita terbaru"],"domain":null,"photos":"rich","subject":"entity","deep":true,"fx":null,"video":false}
Contoh: "kenapa mbg dikritik" → {"kind":"info","search":true,"news":true,"topic":"menelusuri kritik terhadap program mbg","queries":["kritik program makan bergizi gratis","evaluasi mbg"],"domain":null,"photos":"few","subject":"event","deep":false,"fx":null,"video":false}
Contoh: "Tapi katanya taylor swif udh nikah ta?" → {"kind":"info","search":true,"news":true,"topic":"mengecek kabar pernikahan Taylor Swift","queries":["Taylor Swift menikah Travis Kelce","Taylor Swift pernikahan berita terbaru"],"domain":null,"photos":"few","subject":"event","deep":false,"fx":null,"video":false}
Contoh: "tulis surat al fatihah arab sama artinya" → {"kind":"chat","search":false,"news":false,"topic":"menuliskan Surat Al-Fatihah dan artinya","queries":[],"domain":null,"photos":"none","subject":"other","deep":false,"fx":null,"video":false}
Contoh: "berapa 1/2 + 1/3?" → {"kind":"chat","search":false,"news":false,"topic":"menghitung penjumlahan pecahan","queries":[],"domain":null,"photos":"none","subject":"other","deep":false,"fx":null,"video":false}
Contoh: "halo, lagi apa?" → {"kind":"chat","search":false,"news":false,"topic":"membalas sapaanmu","queries":[],"domain":null,"photos":"none","subject":"other","deep":false,"fx":null,"video":false}`;

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
  const search = kind === 'info'; // jawaban info SELALU lewat pencarian (loading pencarian + pil sumber per paragraf)
  const photos: PhotoLevel = raw.photos === 'rich' ? 'rich' : 'few'; // jawaban info SELALU punya foto ilustrasi

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
  if (kind === 'info' && !topic) return { kind, search, news, topic: NEUTRAL_TOPIC, queries: search ? queries : [], domain, photos, subject: raw.subject === 'entity' ? 'entity' : raw.subject === 'event' || news ? 'event' : 'other', deep: !!raw.deep, fx, video: !!raw.video, source: 'model' };

  return {
    kind,
    search,
    news,
    topic,   // kind chat juga punya kalimat loading buatan model (tampil di samping helix)
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
/** kata kerja pencarian / penjelasan yang jelas → selalu info + pencarian, apa pun tebakan model kecil */
const FORCE_INFO_RE = /\b(cari ?tau|cari|carikan|cariin|cek|jelaskan|jelasin|bedah|siapa|apa itu|apa bedanya|bedanya|beda|kenapa|mengapa|bandingkan|banding|vs|versus|review|rekomendasi|rekomendasikan|video|vidio|youtube|yt|podcast|wawancara|interview|berita|harga|kekayaan|profil|biografi|saham|valuasi|gaji|umur)\b/i;
/** BARU: pola memverifikasi kabar / status ("katanya ...", "beneran ...?", "udah ... belum?") → selalu info + pencarian */
const VERIFY_RE = /\b(katanya|konon|kabarnya|benarkah|beneran|bener ?(?:ga|gak|nggak|kah)|apakah)\b|\bud(?:ah|h)\b[^?.!\n]{0,40}\bbelum\b/i;
/** kata yang menandakan user minta video / podcast / wawancara → kartu YouTube */
export const VIDEO_RE = /\b(video|vidio|youtube|yt|podcast|podcasts|wawancara|interview|ceramah|pidato|keynote|trailer|konser|siaran ulang|rekaman)\b/i;
const DOMAIN_IN_TEXT_RE = /\b([a-z0-9-]{2,}\.(?:com|co\.id|id|net|org|news|my\.id|web\.id|io|ai|app|dev|xyz|info|site|online))\b/i;

export function heuristicIntent(text: string): Intent {
  const t = (text || '').trim();
  const news = NEWS_RE.test(t);
  const video = VIDEO_RE.test(t);
  const verify = VERIFY_RE.test(t) && !/```/.test(t) && t.length < 400;
  const info = news || video || verify || INFO_START_RE.test(t) || (FORCE_INFO_RE.test(t) && !/```/.test(t) && t.length < 400);
  const d = DOMAIN_IN_TEXT_RE.exec(t);
  const domain = d ? cleanDomain(d[1]) : /teliernews/i.test(t) ? 'teliernews.com' : null;
  const isInfo = info || !!domain;
  if (!isInfo) return { ...CHAT_INTENT };
  // Pesan user mentah (bisa salah ketik) tidak dipakai sebagai judul / kueri loading
  return {
    kind: 'info', search: true, news, topic: news ? 'menelusuri kabar terbarunya' : video ? 'mencari video yang cocok' : verify ? 'mengecek kabar terbarunya' : NEUTRAL_TOPIC, queries: [], domain,
    photos: 'few', subject: news || verify ? 'event' : 'entity', deep: false, fx: null, video, source: 'fallback',
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
    const forced = !/```/.test(t) && t.length < 400 && (FORCE_INFO_RE.test(t) || VERIFY_RE.test(t));
    if (intent && intent.kind === 'chat' && forced) {
      // model kecil kadang menganggap "cari tau X" / "katanya X udah ...?" sebagai obrolan; pola yang jelas selalu dianggap permintaan info
      const h = heuristicIntent(t);
      intent.kind = 'info'; intent.search = true; intent.news = intent.news || h.news; intent.photos = intent.photos === 'rich' ? 'rich' : 'few';
      if (intent.subject === 'other') intent.subject = h.subject;
      intent.topic = intent.topic || h.topic || NEUTRAL_TOPIC;
    }
    if (intent && intent.kind === 'info') {
      // minta video / podcast → selalu kartu video, apa pun tebakan model kecil
      if (VIDEO_RE.test(t)) intent.video = true;
      intent.search = true;
    }
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

/** Aturan tampilan yang berlaku untuk SEMUA jawaban (chat maupun info): rumus pakai garis (LaTeX) & teks Arab. */
const FORMAT_RULES: string[] = [
  'RUMUS: tulis rumus matematika / fisika / kimia dengan LaTeX yang dirender KaTeX — rumus di tengah kalimat diapit $...$, rumus yang berdiri sendiri diapit $$...$$ di baris sendiri dengan baris kosong di atas dan bawah. Ini MENGGANTIKAN aturan lama soal simbol Unicode dan "➤ **rumus**". PECAHAN WAJIB memakai garis pecahan: \\frac{a}{b} (di tengah kalimat pakai \\dfrac{a}{b}); DILARANG menulis pecahan sebagai "1/2", "a/b" atau "½". Contoh: $\\dfrac{1}{2}$, $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$. Pangkat x^{2}, indeks x_{1}, akar \\sqrt{x} / \\sqrt[3]{x}, integral \\int_{a}^{b} f(x)\\,dx, sigma \\sum_{i=1}^{n}, limit \\lim_{x \\to 0}, turunan \\dfrac{dy}{dx}, matriks \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}, sistem persamaan \\begin{cases} ... \\end{cases}, vektor \\vec{v}, kali \\times, bagi \\div, ≠ \\neq, ≈ \\approx. Teks biasa di dalam rumus pakai \\text{...}. Satuan seperti km/jam atau m/s tetap ditulis biasa di dalam teks (bukan pecahan). Mata uang jangan pakai tanda "$": tulis "Rp 5.000" atau "USD 5".',
  'TEKS ARAB / AL-QUR\'AN: tulis huruf Arab asli lengkap dengan harakat, jangan diganti huruf Latin dan jangan ditaruh di dalam blok kode atau tabel. Satu ayat (atau satu baris doa) = tiga paragraf terpisah berurutan: (1) teks Arab saja, diakhiri nomor ayat dalam kurung hias seperti ﴿١﴾; (2) transliterasi Latin biasa tanpa tanda miring; (3) artinya dalam bahasa Indonesia diawali "Artinya:". Beri baris kosong antar paragraf. Jangan mencampur Arab dan Latin dalam satu paragraf.',
];

export function buildIntentInstruction(intent: Intent, ctx: InstructionCtx = {}): string {
  if (intent.kind !== 'info') return `\n\n[ATURAN TAMPILAN WAJIB — jangan disebut ke user]:\n${FORMAT_RULES.map(x => `- ${x}`).join('\n')}`;
  const L: string[] = [...FORMAT_RULES];

  if (intent.domain) {
    L.push(`User menyebut situs ${intent.domain}. Cari lewat Google dengan kueri "site:${intent.domain} <topik>" dan juga kueri biasa memakai nama situsnya.${ctx.hasSiteData ? ' Data "ISI SITUS" di bawah adalah isi terbaru situs itu — pakai sebagai sumber utama.' : ''} Kalau tidak ketemu, katakan terus terang; jangan mengarang isi situs.`);
  }

  if (intent.fx && ctx.hasFxChart) {
    L.push('Data kurs ASLI sudah tersedia di bawah ("DATA KURS") dan grafiknya dibuat otomatis oleh sistem: JANGAN menulis blok ```chart sendiri. Jelaskan tren dengan angka dari data itu (naik/turun berapa, tertinggi, terendah) dan sebut bahwa ini kurs referensi.');
  }

  // Foto: dua jalur. (1) Sistem memasang foto Wikipedia berjudul PERSIS di paragraf yang menyebut nama tokoh / brand / produk / album.
  // (2) Model menulis beberapa blok image-search (kata kunci BERBEDA-BEDA) yang tersebar di sepanjang jawaban.
  L.push('Foto tokoh, perusahaan, brand, produk, album / film / karya, dan tempat dipasang OTOMATIS di paragraf yang menyebut namanya, jadi SEBUT NAMA LENGKAPNYA secara eksplisit di paragraf yang membahasnya (mis. "Colette Kress, CFO NVIDIA", "album 1989", "iPhone 15") — jangan hanya "dia" / "perusahaan itu". Bahas juga tokoh, produk, album / karya penting yang terkait, masing-masing di paragraf atau butir daftar sendiri.');
  L.push('Selain itu, setiap jawaban info WAJIB punya 4 sampai 6 blok foto yang TERSEBAR di antara paragraf (bukan menumpuk di satu tempat, bukan di akhir): satu blok ditulis sendiri setelah paragraf yang relevan, bentuknya ```image-search lalu SATU baris kata kunci lalu ```. Tiap blok memakai kata kunci BERBEDA dan spesifik (nama + objek), jangan mengulang. Sesuaikan jenis fotonya dengan topik: tokoh biasa → wajah / potret, saat acara, foto jaman dulu atau awal karier (kalau jawaban membahas perjalanan); musisi / penyanyi → wajah, konser / tur, penampilan panggung, dan sampul album (mis. "Taylor Swift 1989 album cover"); perusahaan / brand → logo, produk andalan, kantor atau pabrik, wajah CEO / pendiri; produk → foto produknya dari beberapa sisi; tempat → pemandangan dan bangunan; peristiwa → foto kejadiannya. Jangan menulis URL gambar dan jangan menaruh dua blok foto berurutan tanpa paragraf di antaranya.');
  L.push('Mata uang: tulis "USD 800 miliar" atau "Rp 1,2 triliun" (tanda "$" hanya untuk rumus). Teks tebal pakai **tebal** dengan spasi / tanda baca yang wajar di sekelilingnya.');

  if (intent.news || ctx.hasNewsData) {
    L.push(ctx.hasNewsData
      ? 'Untuk berita, utamakan "ARTIKEL BERITA ASLI" di bawah: sebut JUDUL berita persis seperti tertulis (boleh dicetak tebal) dan nama medianya, satu paragraf per berita. Jangan mengutip halaman depan atau halaman kategori portal berita sebagai sumber; pakai hanya artikel dengan judul spesifik. Cari berita lain lewat Google dengan kata kunci spesifik (peristiwa/tokoh/angka), bukan "berita terkini" saja.'
      : 'Untuk berita, cari lewat Google dengan kata kunci SPESIFIK (peristiwa/tokoh/angka), jangan "berita terkini" saja, dan kutip artikel dengan judul spesifik — bukan halaman depan atau kategori portal berita. Tulis judul berita persis seperti di sumber.');
  }

  if (intent.deep) {
    L.push('Ini permintaan BEDAH MENDALAM. Susun jawaban berjenjang dengan sub judul: profil singkat, latar/sejarah, produk/karya/capaian, sorotan atau kritik (hanya yang terverifikasi di sumber), dan "Tautan resmi" berisi website serta akun media sosial resmi (Instagram, X, YouTube, LinkedIn, dll). Tautan HANYA boleh yang benar-benar muncul di hasil pencarian — jangan menebak URL. Tulis sebagai tautan markdown.');
  }

  if (ctx.hasVideoData && !intent.video) {
    L.push('Ada video YouTube yang terkait topik di "VIDEO YOUTUBE ASLI" di bawah. Sistem menampilkannya sebagai kartu pemutar di dekat paragraf yang paling cocok (bukan di akhir); kamu boleh menyinggung satu-dua judulnya di paragraf terakhir (judul persis), tanpa menulis URL dan tanpa mengarang video lain.');
  } else if (ctx.hasVideoData) {
    L.push('User meminta video. Rekomendasikan video dari "VIDEO YOUTUBE ASLI" di bawah: untuk tiap video tulis satu paragraf (judul video, channel, apa isinya menurut judul) dan taruh URL lengkapnya apa adanya di paragraf itu agar tampil sebagai pemutar. DILARANG menulis URL video selain yang ada di daftar itu atau di hasil pencarian Google, dan jangan menambah "Link Simulasi" atau contoh URL.');
  } else if (intent.video) {
    L.push('User meminta video. Hanya tulis URL YouTube kalau benar-benar muncul di hasil pencarian; jangan pernah mengarang atau menebak URL/ID video. Kalau tidak ada, katakan terus terang dan sarankan kata kunci pencarian YouTube.');
  } else {
    L.push('Kalau hasil pencarian memuat video YouTube yang jelas relevan, boleh tulis URL lengkapnya (maksimal 1–2). Jangan pernah mengarang URL.');
  }

  L.push('Tulis per paragraf (satu paragraf = satu poin utama). Tabel Markdown WAJIB dipakai kalau ada perbandingan dua hal atau lebih (produk, spesifikasi, harga, tokoh, negara, periode, kelebihan vs kekurangan), kata "vs" / "banding" / "beda" / "mana lebih", atau daftar 3 item ke atas yang punya atribut sama (jadwal, harga, spesifikasi, paket, peringkat). Sering-seringlah merangkum dengan tabel (mis. daftar album / produk / tokoh dengan tahun dan keterangan); letakkan tabel setelah paragraf pengantarnya. Pertanyaan tentang kekayaan, harga, pendapatan, valuasi, jumlah pengguna, penjualan, atau statistik lain WAJIB berisi tabel dua kolom (Tahun/Periode | Nilai) minimal 4 baris dari angka di sumber, lalu grafik dengan blok ```chart sesuai format yang sudah diajarkan (angka di tabel dan grafik harus sama, satuan sama di semua baris). Kalau ada deretan angka yang menggambarkan tren atau perbandingan nilai (harga dari waktu ke waktu, persentase, statistik, pendapatan), WAJIB sertakan grafik itu. Akhiri dengan SATU kalimat penutup singkat sebagai kesimpulan.');

  return `\n\n[INSTRUKSI SISTEM WAJIB — jangan disebut ke user]:\n${L.map(x => `- ${x}`).join('\n')}`;
}
