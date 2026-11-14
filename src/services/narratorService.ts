// ─────────────────────────────────────────────
// NARRATOR SERVICE — src/services/narratorService.ts
// Kalimat status loading yang DITULIS MODEL KECIL (bukan template, bukan salinan teks user):
//   • narrateStart    → satu kalimat pembuka untuk loading kode / gambar / dokumen
//   • narrateFindings → 2–3 kalimat pendek tentang apa yang baru ditemukan, dari judul sumber ASLI
// Selalu aman: gagal / lambat → mengembalikan kosong, UI tetap jalan dengan teks cadangan.
// ─────────────────────────────────────────────
import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey } from './geminiService';

export type LoadingVariant = 'code' | 'image' | 'doc';

const MODEL = 'gemini-2.5-flash-lite';

const CODE_RE = /```|\b(bug|error|eror|debug|kode|kodingan|coding|koding|script|skrip|fungsi|function|python|javascript|typescript|react|html|css|sql|stack ?trace|syntax|compile|refactor)\b/i;

/** Jenis loading khusus (kode / gambar / dokumen) — null untuk chat biasa & pencarian. */
export function detectVariant(text: string, hasImages: boolean, hasPdfs: boolean): LoadingVariant | null {
  if (hasPdfs) return 'doc';
  if (hasImages) return 'image';
  return CODE_RE.test(text || '') ? 'code' : null;
}

export const VARIANT_FALLBACK: Record<LoadingVariant, string> = {
  code: 'menganalisis kodenya',
  image: 'mengamati gambarnya',
  doc: 'membaca dokumennya',
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('narrator-timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function ask(system: string, prompt: string, timeoutMs: number): Promise<string> {
  const key = getActiveApiKey();
  if (!key) return '';
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { systemInstruction: system, temperature: 0.7, maxOutputTokens: 220, responseMimeType: 'application/json' },
    }),
    timeoutMs,
  );
  return String((res as any).text ?? res.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

const clean = (s: any): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').replace(/^["'\-•\s]+|["'\s.]+$/g, '').trim() : '');

const START_SYS = `Kamu menulis SATU kalimat status untuk layar loading asisten AI, sambil asisten bekerja. Kalimat menjelaskan apa yang sedang kamu kerjakan untuk permintaan user, berdasarkan isi permintaan itu. Aturan: bahasa Indonesia santai, huruf awal kecil, maksimal 9 kata, diawali kata kerja (misalnya menelusuri, mengecek, membongkar, mengamati, membaca), jangan menyalin kalimat user mentah-mentah, jangan memakai tanda kutip. Keluarkan JSON: {"text":"..."}`;

export async function narrateStart(prompt: string, variant: LoadingVariant): Promise<string> {
  try {
    const kind = variant === 'code' ? 'user minta bantuan soal kode / bug' : variant === 'image' ? 'user mengirim gambar untuk dianalisis' : 'user mengirim dokumen untuk dibaca';
    const raw = await ask(START_SYS, `Jenis: ${kind}\nPermintaan user:\n"""${(prompt || '').slice(0, 500)}"""`, 2800);
    const out = clean(JSON.parse(raw.replace(/```json|```/g, '').trim())?.text);
    return out.length >= 4 && out.length <= 80 ? out : '';
  } catch { return ''; }
}

const FIND_SYS = `Kamu menulis kalimat status untuk layar loading asisten AI yang sedang riset di internet. Diberikan pertanyaan user dan judul-judul sumber yang BARU DITEMUKAN. Tulis 2 sampai 3 kalimat status berurutan, masing-masing menceritakan satu temuan menarik dari judul itu (apa isinya, bukan "menemukan berita ..."). Aturan: bahasa Indonesia santai, huruf awal kecil, maksimal 12 kata per kalimat, variasikan kata kerja / bentuk kalimat, jangan menyalin judul mentah, jangan menambah fakta di luar judul, tanpa tanda kutip. Keluarkan JSON: {"lines":["...","..."]}`;

export async function narrateFindings(prompt: string, titles: string[]): Promise<string[]> {
  const t = titles.map(x => (x || '').trim()).filter(Boolean).slice(0, 8);
  if (t.length < 2) return [];
  try {
    const raw = await ask(FIND_SYS, `Pertanyaan user:\n"""${(prompt || '').slice(0, 300)}"""\n\nJudul sumber:\n${t.map((x, i) => `${i + 1}. ${x.slice(0, 140)}`).join('\n')}`, 3500);
    const arr = JSON.parse(raw.replace(/```json|```/g, '').trim())?.lines;
    return (Array.isArray(arr) ? arr : []).map(clean).filter(s => s.length >= 8 && s.length <= 110).slice(0, 3);
  } catch { return []; }
}

const DOC_SYS = `Kamu menulis SATU kalimat status singkat untuk layar loading asisten AI yang akan membuat dokumen untuk user. Kalimat menjelaskan apa yang akan kamu rancang, berdasarkan isi permintaan (topik nyata, bukan kalimat umum). Aturan: bahasa Indonesia santai, huruf awal kecil, maksimal 8 kata, diawali kata kerja (misalnya merancang, menyusun, merangkai, memetakan), jangan menyalin kalimat user mentah-mentah, tanpa tanda kutip. Keluarkan JSON: {"text":"..."}`;

export async function narrateDocStart(prompt: string, kindLabel: string): Promise<string> {
  try {
    const raw = await ask(DOC_SYS, `Jenis dokumen: ${kindLabel}\nPermintaan user:\n"""${(prompt || '').slice(0, 500)}"""`, 2800);
    const out = clean(JSON.parse(raw.replace(/```json|```/g, '').trim())?.text);
    return out.length >= 4 && out.length <= 70 ? out : '';
  } catch { return ''; }
}

const TASK_SYS = `Kamu menulis SATU kalimat status untuk layar loading di chat grup, tentang apa yang akan dikerjakan satu asisten AI. Diberikan nama AI dan tugasnya. Aturan: bahasa Indonesia santai, huruf awal kecil, maksimal 8 kata, diawali kata kerja (mencari, menyusun, merangkai, menulis, merancang, menelusuri), sebut topik nyatanya, jangan menyalin tugas mentah-mentah, tanpa nama AI, tanpa tanda kutip. Keluarkan JSON: {"text":"..."}`;

export async function narrateTaskStart(aiName: string, task: string): Promise<string> {
  try {
    const raw = await ask(TASK_SYS, `AI: ${aiName}\nTugas:\n"""${(task || '').slice(0, 400)}"""`, 2800);
    const out = clean(JSON.parse(raw.replace(/```json|```/g, '').trim())?.text);
    return out.length >= 4 && out.length <= 70 ? out : '';
  } catch { return ''; }
}
