// ─────────────────────────────────────────────
// ENTITAS — src/lib/entities.ts
// Foto tokoh / perusahaan / brand / produk / tempat yang DISEBUT di dalam jawaban.
//   1) nama entitas diambil dari teks jawaban (model kecil + cadangan huruf kapital)
//   2) /api/web-tools?op=entities mencocokkan nama ke halaman Wikipedia dengan JUDUL PERSIS (redirect diikuti)
//   3) buildMedia (media.ts) memasang fotonya di paragraf yang pertama kali menyebut nama itu
// Tidak ada pencarian longgar → tidak ada foto nyasar (presiden lain, "Halaman Utama", dll).
// ─────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey } from './../services/geminiService';

export interface EntityPhoto {
  name: string;            // nama yang dicari (judul Wikipedia)
  title: string;           // judul halaman hasil
  src: string; url: string; site: string;
  desc?: string;
  kind: 'person' | 'org' | 'place' | 'other';
  logo: boolean;
  aliases: string[];       // tulisan di jawaban yang menandakan entitas ini disebut
}

const PERSON_DESC = /\b(businessman|businesswoman|entrepreneur|investor|executive|chief|ceo|cfo|cto|founder|co-founder|engineer|scientist|politician|president|prime minister|minister|actor|actress|singer|rapper|musician|footballer|player|athlete|journalist|author|writer|philanthropist|physicist|economist|born|lahir|pengusaha|politikus|aktor|aktris|penyanyi|pemain|atlet|ilmuwan|pendiri|pemimpin|tokoh|presiden|menteri)\b/i;
const PLACE_DESC = /\b(city|town|district|island|province|region|mountain|lake|river|airport|stadium|museum|building|tower|park|kota|kabupaten|pulau|gunung|danau|bandara|stadion|gedung|menara)\b/i;
const ORG_DESC = /\b(company|corporation|manufacturer|brand|platform|business|startup|firm|organization|organisation|conglomerate|retailer|bank|university|agency|app|software|service|perusahaan|merek|produsen|organisasi|universitas|layanan|aplikasi)\b/i;

export function entityKind(desc: string): EntityPhoto['kind'] {
  if (PERSON_DESC.test(desc)) return 'person';
  if (ORG_DESC.test(desc)) return 'org';
  if (PLACE_DESC.test(desc)) return 'place';
  return 'other';
}

// ── nama dari jawaban: cadangan tanpa model (huruf kapital berurutan) ──
const NOT_ENTITY = new Set(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu', 'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember', 'january', 'february', 'march', 'may', 'june', 'july', 'august', 'october', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'indonesia', 'amerika', 'serikat', 'tabel', 'sumber', 'ringkasan', 'kesimpulan', 'catatan', 'selain', 'namun', 'dengan', 'untuk', 'pada', 'dari', 'yang', 'ini', 'itu', 'tahun', 'bulan', 'hari', 'pada', 'menurut', 'berdasarkan', 'sebagai', 'jadi', 'tetapi', 'sementara', 'karena', 'kemudian', 'selanjutnya', 'pertama', 'kedua', 'ketiga', 'ceo', 'cfo', 'cto', 'coo', 'usd', 'idr', 'ai', 'pdb', 'dpr', 'ipo', 'etf', 'faq', 'nb', 'tips', 'wib', 'wita', 'wit', 'rp', 'us', 'as', 'uk', 'eu', 'un', 'tv', 'hp', 'pc', 'di', 'ke', 'ya', 'the', 'and', 'for', 'with', 'from', 'president', 'presiden', 'menteri', 'bapak', 'ibu', 'pak', 'bu', 'dr', 'prof', 'tentang', 'profil', 'latar', 'belakang', 'sorotan', 'kritik', 'tautan', 'resmi', 'video', 'foto', 'berikut', 'perbedaan', 'kelebihan', 'kekurangan', 'harga', 'fitur', 'kekayaan', 'bersih', 'total', 'estimasi']);

export function heuristicEntities(text: string, max = 24): string[] {
  const plain = (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^\s*\|.*$/gm, ' ')
    .replace(/[*_#>]/g, ' ');
  const tokRe = /[A-Z][\p{L}0-9&'’-]*(?:[ \t]+(?:(?:de|van|von|bin|al|el|da|dos|du|la|le)[ \t]+)?[A-Z][\p{L}0-9&'’-]*){0,3}/gu;
  const scored: { name: string; idx: number; multi: boolean }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = tokRe.exec(plain))) {
    let name = m[0].replace(/[.'’-]+$/g, '').replace(/\s+/g, ' ').trim();
    const words = name.split(' ');
    while (words.length > 0 && NOT_ENTITY.has(words[0].toLowerCase())) words.shift();
    while (words.length > 0 && NOT_ENTITY.has(words[words.length - 1].toLowerCase())) words.pop();
    name = words.join(' ');
    if (name.length < 3) continue;
    const multi = words.length >= 2;
    // kata tunggal di awal kalimat hanya kata biasa berhuruf kapital → buang kecuali pendek-kapital semua (NVIDIA) atau campuran (OpenAI)
    const before = plain.slice(Math.max(0, m.index - 2), m.index);
    const sentenceStart = m.index === 0 || /[.!?:\n]\s*$/.test(before);
    if (!multi && sentenceStart && !/^[A-Z0-9]{3,}$/.test(name) && !/[a-z][A-Z]/.test(name)) continue;
    const k = name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    scored.push({ name, idx: m.index, multi });
  }
  // nama berkata banyak (tokoh / brand) lebih dulu, lalu urutan kemunculan
  scored.sort((a, b) => (a.multi === b.multi ? a.idx - b.idx : a.multi ? -1 : 1));
  return scored.slice(0, max).map(x => x.name);
}

// ── nama dari jawaban: model kecil (lebih tepat: tahu mana tokoh / brand, memberi judul Wikipedia yang benar) ──
const MODEL = 'gemini-2.5-flash-lite';
export interface ModelEntity { surface: string; wiki: string }

export async function modelEntities(text: string, question: string, timeoutMs = 3000): Promise<ModelEntity[]> {
  try {
    const key = getActiveApiKey();
    if (!key || !text) return [];
    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Pertanyaan user: ${question.slice(0, 200)}\n\nJawaban:\n"""${text.slice(0, 5000)}"""`;
    const call = ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: 'Dari jawaban, daftar sampai 10 entitas yang DISEBUT dan punya halaman Wikipedia: tokoh (orang), perusahaan, brand, produk, tempat, organisasi. Urut dari yang pertama muncul. Keluarkan JSON array saja: [{"surface":"tulisan persis di jawaban","wiki":"judul halaman Wikipedia Inggris yang tepat"}]. Contoh: [{"surface":"Colette Kress","wiki":"Colette Kress"},{"surface":"NVIDIA","wiki":"Nvidia"}]. Jangan sertakan negara, tanggal, jabatan, istilah umum, atau nama yang tidak kamu yakini judul Wikipedia-nya. Tokoh yang tidak punya halaman Wikipedia jangan dimasukkan.',
        responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 500,
      },
    });
    const res: any = await Promise.race([call, new Promise((_r, rej) => setTimeout(() => rej(new Error('ent-timeout')), timeoutMs))]);
    const raw = res?.text ?? res?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const arr = JSON.parse(String(raw).replace(/```json|```/g, '').trim());
    return (Array.isArray(arr) ? arr : [])
      .filter((x: any) => x && typeof x.surface === 'string' && typeof x.wiki === 'string' && x.wiki.trim().length >= 2)
      .map((x: any) => ({ surface: x.surface.trim().slice(0, 60), wiki: x.wiki.trim().slice(0, 70) }))
      .slice(0, 10);
  } catch { return []; }
}

async function lookup(names: string[]): Promise<any[]> {
  if (names.length === 0) return [];
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
    const res = await fetch(`/api/web-tools?op=entities&names=${encodeURIComponent(names.join('|'))}`, { signal: ctrl?.signal });
    if (t) clearTimeout(t);
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d?.items) ? d.items : [];
  } catch { return []; }
}

/**
 * Entitas yang disebut di jawaban + foto Wikipedia-nya (judul persis). `seed` = nama tambahan yang sudah pasti relevan
 * (mis. topik pertanyaan). Tidak pernah melempar error; hasil kosong = tidak ada foto (lebih baik daripada foto salah).
 */
export async function fetchAnswerEntities(text: string, question: string, seed: string[] = []): Promise<EntityPhoto[]> {
  const [fromModel] = await Promise.all([modelEntities(text, question)]);
  const names: string[] = [];
  const aliasOf = new Map<string, string[]>();
  const add = (wiki: string, alias?: string) => {
    const k = wiki.toLowerCase();
    if (!aliasOf.has(k)) { aliasOf.set(k, []); names.push(wiki); }
    const al = aliasOf.get(k)!;
    for (const a of [alias, wiki]) if (a && a.length >= 3 && !al.some(x => x.toLowerCase() === a.toLowerCase())) al.push(a);
  };
  const trusted = new Set<string>();
  for (const e of fromModel) { add(e.wiki, e.surface); trusted.add(e.wiki.toLowerCase()); }
  for (const n of heuristicEntities(text)) if (names.length < 28) add(n);
  for (const n of seed) if (n.trim().length >= 3 && names.length < 30) add(n.trim());

  const items = await lookup(names);
  const out: EntityPhoto[] = [];
  const seenTitle = new Set<string>();
  for (const it of items) {
    if (!it?.src || !it?.title) continue;
    const key = String(it.title).toLowerCase();
    if (seenTitle.has(key)) continue;
    seenTitle.add(key);
    const kind = entityKind(String(it.desc || ''));
    // nama tebakan huruf-kapital (bukan dari model) hanya dipakai kalau halamannya jelas tokoh / perusahaan / tempat
    if (!trusted.has(String(it.name).toLowerCase()) && kind === 'other') continue;
    const aliases = Array.from(new Set([...(aliasOf.get(String(it.name).toLowerCase()) || [String(it.name)]), String(it.title)]));
    out.push({
      name: String(it.name), title: String(it.title), src: String(it.src), url: String(it.url), site: String(it.site || 'wikipedia.org'),
      desc: it.desc ? String(it.desc) : undefined, kind, logo: !!it.logo, aliases,
    });
  }
  return out;
}
