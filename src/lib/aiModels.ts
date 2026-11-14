// ─────────────────────────────────────────────
// AI MODELS — src/lib/aiModels.ts
// Daftar model AI yang bisa di-@mention di grup + adapter penyedia (provider).
// Sekarang SEMUA model diarahkan ke Gemini (beberapa API key). Nanti tinggal
// isi `runwareStream` (lewat api/ai.ts di server) dan ubah RUNWARE_ENABLED = true.
// ─────────────────────────────────────────────
import type { GenerateContentResponse } from '@google/genai';
import { chatWithGeminiStream } from '../services/geminiService';

export type Provider = 'gemini' | 'runware';

export interface AiModelDef {
  id: string;
  names: string[];          // nama @mention yang cocok (huruf kecil, tanpa spasi)
  label: string;
  provider: Provider;
  model: string;            // id model di penyedia (Gemini sekarang, Runware nanti)
  geminiFallback: string;   // model Gemini yang dipakai selama penyedia aslinya belum tersambung
  strengths: string;        // keunggulan — masuk ke prompt supaya jawabannya khas
  role: string;             // peran bawaan kalau user tidak memberi tugas jelas
}

// Ubah ke true setelah api/ai.ts (Runware) siap.
export const RUNWARE_ENABLED = false;

export const AI_MODELS: AiModelDef[] = [
  { id: 'gemini', names: ['gemini', 'cylen'], label: 'Gemini', provider: 'gemini', model: 'gemini-2.5-flash', geminiFallback: 'gemini-2.5-flash',
    strengths: 'rapi menyusun dokumen, presentasi, tabel, dan rangkuman terstruktur; kuat di data terkini lewat pencarian Google',
    role: 'menyusun hasil akhir yang rapi dan siap pakai' },
  { id: 'grok', names: ['grok', 'xai'], label: 'Grok', provider: 'runware', model: 'xai:grok', geminiFallback: 'gemini-2.5-flash',
    strengths: 'riset cepat, informasi terkini, berita, dan opini yang lugas apa adanya',
    role: 'mencari dan merangkum informasi terkini' },
  { id: 'chatgpt', names: ['chatgpt', 'gpt', 'openai'], label: 'ChatGPT', provider: 'runware', model: 'openai:gpt', geminiFallback: 'gemini-2.5-flash',
    strengths: 'menulis materi, penjelasan runtut, struktur argumen, dan bahasa yang enak dibaca',
    role: 'menulis materi / naskah yang runtut' },
  { id: 'claude', names: ['claude', 'anthropic'], label: 'Claude', provider: 'runware', model: 'anthropic:claude', geminiFallback: 'gemini-2.5-flash',
    strengths: 'analisis mendalam, penalaran hati-hati, kode, dan tulisan panjang yang teliti',
    role: 'menganalisis dan menalar dengan teliti' },
  { id: 'deepseek', names: ['deepseek'], label: 'DeepSeek', provider: 'runware', model: 'deepseek:chat', geminiFallback: 'gemini-2.5-flash',
    strengths: 'penalaran logika, matematika, dan kode',
    role: 'memecahkan logika dan kode' },
];

/** Cari definisi model dari nama AI di grup (mis. "Grok", "ChatGPT", "Gemini"). */
export function resolveModel(aiName: string): AiModelDef {
  const n = (aiName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return AI_MODELS.find(m => m.names.some(x => n === x || n.includes(x))) || AI_MODELS[0];
}

// Penyedia Runware: belum tersambung → nanti panggil POST /api/ai (Edge, cek Firebase ID token, key di server)
// dan ubah hasilnya jadi async generator berbentuk GenerateContentResponse ({ text, candidates }).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function* runwareStream(_def: AiModelDef, _messages: any[]): AsyncGenerator<GenerateContentResponse> {
  throw new Error('Runware belum tersambung');
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const errType = (e: any): string => String(e?.type || '');
// Gagal yang masih wajar dicoba lagi (kuota per menit, server sibuk, timeout). Offline / key salah tidak.
const retryable = (e: any) => ['limit', 'server', 'timeout', 'failed'].includes(errType(e));

/** Kalimat gagal yang tenang untuk user: tanpa kode error, tanpa nada panik. */
export function friendlyAiError(name: string, e: any): string {
  const t = errType(e);
  if (t === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine))
    return `Koneksimu lagi putus, jadi ${name} belum bisa menjawab. Sambungkan internet, lalu kirim ulang pesannya.`;
  if (t === 'limit')
    return `${name} lagi kebanyakan permintaan, jadi perlu istirahat sebentar. Coba kirim ulang dalam satu menit ya.`;
  if (t === 'timeout')
    return `${name} butuh waktu terlalu lama untuk menjawab. Coba kirim ulang ya.`;
  if (e?.detail === 'NO_API_KEY')
    return `${name} belum bisa dipakai karena kunci AI-nya belum diatur.`;
  return `${name} belum bisa menjawab kali ini. Coba kirim ulang ya.`;
}

// Mencoba ulang otomatis (maksimal 3 kali, jeda bertambah) selama BELUM ada teks yang keluar.
// Kalau sudah ada teks yang tampil, error dilempar apa adanya supaya jawaban tidak dobel.
async function* withRetry(factory: () => Promise<AsyncGenerator<GenerateContentResponse>>): AsyncGenerator<GenerateContentResponse> {
  for (let attempt = 0; ; attempt++) {
    let got = false;
    try {
      const s = await factory();
      for await (const c of s) { got = true; yield c; }
      return;
    } catch (e) {
      if (got || attempt >= 2 || !retryable(e)) throw e;
      await wait(1800 * (attempt + 1));
    }
  }
}

/** Satu pintu untuk memanggil model mana pun. Bentuk keluarannya sama dengan chatWithGeminiStream. */
export async function streamAi(
  def: AiModelDef,
  messages: { role: 'user' | 'assistant'; content: string }[],
  useSearch: boolean,
  location?: { latitude: number; longitude: number },
): Promise<AsyncGenerator<GenerateContentResponse>> {
  return withRetry(() => {
    if (def.provider === 'runware' && RUNWARE_ENABLED) return Promise.resolve(runwareStream(def, messages));
    return chatWithGeminiStream(messages, useSearch, location, undefined, undefined, 'auto', undefined, def.geminiFallback);
  });
}
