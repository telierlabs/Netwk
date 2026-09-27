/**
 * ============================================================================
 * CYLEN SIMULATION DIRECTOR (v2 — tambah callback progres)
 * ============================================================================
 * Satu-satunya perubahan dari v1: parameter opsional `onAttempt` supaya
 * pemanggil (LiveVoiceMode.tsx) bisa menampilkan progres nyata ke user
 * selama AI menyusun/memperbaiki SimulationSpec (bisa retry sampai 3x),
 * alih-alih layar terasa "diam" tanpa keterangan apapun.
 * ============================================================================
 */

import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey, ConnectionError } from './geminiService';
import {
  parseSimulationSpec,
  createFallbackSimulationSpec,
  type ValidatedSimulationSpec,
} from '../lib/simulationSchema';

function getClient(): GoogleGenAI {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    throw new Error('Tidak ada API key Gemini yang valid. Cek VITE_GEMINI_API_KEY1..5 di Vercel.');
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL_NAME = 'gemini-2.5-flash';
// Dikembalikan ke 2 (dari 1): dengan skema SimulationSpec yang berat begini,
// AI hampir selalu butuh 1x kesempatan perbaikan di percobaan pertama.
// 1 attempt tanpa retry sama sekali membuat HAMPIR SEMUA request gagal —
// itu yang bikin "simulasikan DNA" gagal terus-terusan. 2 adalah titik
// tengah yang masuk akal: hemat token, tapi masih kasih 1x kesempatan
// perbaiki kesalahan kecil sebelum menyerah.
const MAX_REPAIR_ATTEMPTS = 2;

const DSL_SYSTEM_INSTRUCTION = `
Kamu adalah "Cylen Simulation Programmer". Tugasmu: menerjemahkan permintaan
pengguna (bahasa natural, Indonesia atau Inggris) menjadi satu objek JSON
SimulationSpec yang valid, mengikuti struktur berikut PERSIS.

ATURAN PALING PENTING:
- Kamu TIDAK memilih dari daftar simulasi yang sudah ada. Kamu MENYUSUN
  simulasi baru dari primitive generik di bawah, apapun topiknya — biologi,
  fisika, teknik, astronomi, jaringan komputer, matematika, ekonomi, tata
  ruang/denah, dll.
- Jangan pernah menjawab "topik ini tidak didukung". Terjemahkan konsep apa
  pun ke kombinasi entities + geometry + behaviors + fields + relationships
  yang tersedia.
- WAJIB MUTLAK — GAYA VISUAL HOLOGRAFIK PARTIKEL: sistem ini adalah
  HOLOGRAPHIC PARTICLE VISUALIZER, BUKAN 3D model realistis/solid seperti
  game atau software CAD. Utamakan geometry "particleSystem" (kumpulan
  titik bercahaya yang membentuk siluet objek) dan "helix"/"tube"/"line"
  (garis rangka bercahaya) untuk struktur berulang. Gunakan primitif solid
  (sphere/box/cylinder dst) HANYA sebagai penanda kecil/inti dari struktur
  yang lebih besar (mis. nukleus di tengah sel), bukan sebagai objek utama
  tunggal besar. "material.style" HANYA punya 2 pilihan sah: "wireframe"
  (garis rangka bercahaya) dan "glow" (permukaan tembus pandang berpendar,
  opacity rendah 0.25-0.6). TIDAK ADA pilihan lain; spec dengan style selain
  itu akan ditolak sistem. Bayangkan hasil akhirnya seperti hologram
  futuristik di atas latar hitam — garis putih/perak/warna bercahaya,
  partikel, transparansi — BUKAN render solid buram warna abu-abu polos,
  dan BUKAN panel/dinding berwarna datar seperti denah arsitektur biasa.
- OUTPUT HANYA JSON. Tidak ada teks lain, tidak ada markdown code fence,
  tidak ada komentar.

STRUKTUR SimulationSpec (semua field wajib ada kecuali ditandai opsional):

{
  "schemaVersion": "1.0",
  "id": string,
  "meta": { "title": string, "summary": string, "domain"?: string },
  "mode": "1d" | "2d" | "3d",
  "scene": {
    "background": string (hex, gunakan dark theme mis. "#000000"),
    "unitScale"?: number,
    "lighting"?: { "ambientIntensity": number, "keyLightIntensity": number, "glow"?: boolean },
    "bounds"?: { "min": {x,y,z}, "max": {x,y,z} }
  },
  "entities": [
    {
      "id": string, "name"?: string,
      "geometry": salah satu dari:
        { "kind":"sphere","radius":number,"segments"?:number } |
        { "kind":"box","size":{x,y,z} } |
        { "kind":"cylinder","radiusTop":number,"radiusBottom":number,"height":number } |
        { "kind":"cone","radius":number,"height":number } |
        { "kind":"torus","radius":number,"tube":number } |
        { "kind":"plane","size":{x,y} } |
        { "kind":"tube","path":{"controlPoints":[{x,y,z},...],"curveType"?:"catmullRom"|"linear"|"bezier"},"radius":number,"closed"?:boolean } |
        { "kind":"helix","radius":number,"pitch":number,"turns":number,"tubeRadius":number } |
        { "kind":"line","points":[{x,y,z},...] } |
        { "kind":"particleSystem","count":number,"particleRadius":number,"distribution": {...} } |
        { "kind":"vectorArrow","from":{x,y,z},"to":{x,y,z},"headSize"?:number } |
        { "kind":"text3d","text":string,"size":number },
      "transform": { "position": {x,y,z}, "rotation"?: {x,y,z}, "scale"?: {x,y,z}|number, "parentId"?: string },
      "material": { "color": string, "style": "wireframe"|"glow", "opacity"?: number, "emissiveIntensity"?: number },
      "behaviorRefs"?: [string, ...], "tags"?: [string, ...], "selectable"?: boolean
    }
  ],
  "relationships": [ { "id": string, "kind": "connection"|"orbit"|"attachment"|"flow"|"dependency", "sourceId": string, "targetId": string, "properties"?: {...}, "visual"?: {"color":string,"width":number,"animatedFlow"?:boolean} } ],
  "fields": [ { "id": string, "kind": "gravity"|"pressure"|"temperature"|"electromagnetic"|"velocity"|"custom", "valueExpr": string, "sourceEntityId"?: string, "affectsTags"?: [string], "visualization"?: "none"|"vectorField"|"heatmap"|"contourLines"|"particles" } ],
  "equations": [ { "id": string, "formula": string, "description"?: string, "variableBindings"?: {...} } ],
  "parameters": [ { "id": string, "label": string, "value": number, "min": number, "max": number, "step"?: number, "unit"?: string } ],
  "state": { ...bebas... },
  "behaviors": [ { "id": string, "kind": "rotate"|"orbit"|"pulse"|"oscillate"|"flowAlongPath"|"followField"|"stateMachine"|"colorTransition"|"custom", "targetIds": [string,...], "params": {...}, "states"?: [{"name":string,"durationMs"?:number,"onEnter"?:{...},"nextState"?:string}] } ],
  "timeline"?: { "totalDurationMs"?: number, "loop": boolean, "keyframes": [{"timeMs":number,"label"?:string,"changes"?:{...}}] },
  "labels": [ { "id": string, "text": string, "anchor": {"entityId":string} | {"position":{x,y,z}}, "offset"?: {x,y}, "style"?: "callout"|"inline"|"badge", "color"?: string } ],
  "layers": [ { "id": string, "name": string, "entityIds": [string,...], "visibleByDefault": boolean, "clipPlane"?: {"normal":{x,y,z},"constant":number}, "explodeOffset"?: {x,y,z} } ],
  "interactions": { "rotate": boolean, "zoom": boolean, "pan": boolean, "selectObject": boolean, "playPause": boolean, "reset": boolean, "toggleableLayerIds"?: [string,...] },
  "camera": { "mode": "orbit"|"fixed"|"follow", "initialPosition": {x,y,z}, "lookAt": {x,y,z}, "fov"?: number },
  "explanation": { "narration": string (1-3 kalimat, dibacakan lewat suara), "keyPoints"?: [string,...] }
}

PANDUAN KUALITAS VISUAL:
- Untuk struktur berulang (DNA, kristal, deret partikel, denah ruangan),
  gunakan "particleSystem" yang disebar mengikuti bentuk siluet objek
  (distribution "alongPath" mengikuti helix/kontur, atau "boxVolume"/
  "sphereVolume" untuk mengisi volume), PLUS beberapa entity kecil
  (cylinder/sphere kecil, style wireframe/glow) untuk detail struktural
  (mis. base pair DNA, sekat ruangan, komponen mesin kecil).
- Untuk denah/tata ruang: JANGAN pakai box besar berwarna solid per
  ruangan. Gunakan "line" atau "particleSystem" (distribution alongPath)
  untuk membentuk garis dinding sebagai kerangka bercahaya (wireframe),
  dengan label per ruangan, di atas background tetap hitam.
- Sertakan MINIMAL 2-4 label bermakna yang menunjuk ke bagian penting.
- Gunakan cross-section/cutaway (via "layers" dengan clipPlane) untuk objek
  berlapis (organ, mesin, planet).
- Untuk simulasi bertahap (siklus mesin, siklus air), gunakan behavior
  "stateMachine" atau "timeline".
- Isi "parameters" dengan variabel yang masuk akal untuk diutak-atik user.
- mode "1d" untuk grafik fungsi/garis waktu, "2d" untuk chart/diagram
  jaringan/peta konsep, "3d" untuk scene spasial.
- Untuk "glow": opacity 0.25-0.6, emissiveIntensity 0.8-1.8. Untuk
  "wireframe": opacity 0.6-0.9.

JIKA INI PERMINTAAN LANJUTAN (ada "SPEC AKTIF SAAT INI" di bawah):
- Jangan buat spec dari nol. Modifikasi/tambahkan ke spec yang ada.
- Pertahankan semua id yang sudah ada kecuali diminta menghapus/mengganti.
- Kembalikan SimulationSpec LENGKAP hasil modifikasi, dengan "id" root yang
  tetap sama seperti spec aktif.
`.trim();

function buildUserPrompt(userText: string, currentSpec?: ValidatedSimulationSpec): string {
  if (currentSpec) {
    return [
      `SPEC AKTIF SAAT INI:`,
      '```json',
      JSON.stringify(currentSpec),
      '```',
      '',
      `PERMINTAAN LANJUTAN DARI USER: "${userText}"`,
      '',
      'Kembalikan SimulationSpec LENGKAP hasil modifikasi sesuai permintaan di atas.',
    ].join('\n');
  }
  return `PERMINTAAN USER: "${userText}"\n\nBuat SimulationSpec baru untuk permintaan ini.`;
}

async function callGeminiForSpec(prompt: string, repairNote?: string): Promise<unknown> {
  if (!navigator.onLine) throw new ConnectionError('offline', 'No internet connection');

  const client = getClient();
  const fullPrompt = repairNote ? `${prompt}\n\n${repairNote}` : prompt;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: fullPrompt,
    config: {
      systemInstruction: DSL_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.7,
      // SimulationSpec bisa jadi JSON besar (banyak entity/label/behavior).
      // Default token limit kadang memotong output di tengah jalan ->
      // JSON.parse gagal total. Dinaikkan supaya spec kompleks tidak terpotong.
      maxOutputTokens: 8192,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini mengembalikan respons kosong.');

  // Kadang Gemini masih menyelipkan ```json ... ``` walau responseMimeType
  // sudah diminta JSON murni. Bersihkan pembungkus itu sebelum parse, baru
  // fallback ke cari blok {...} pertama kalau masih gagal.
  const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(stripFences(text));
  } catch {
    const cleaned = stripFences(text);
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // jatuh ke error di bawah
      }
    }
    throw new Error(
      `Gemini mengembalikan teks yang bukan JSON valid (kemungkinan terpotong). Panjang respons: ${text.length} karakter.`
    );
  }
}

export interface GenerateSimulationResult {
  spec: ValidatedSimulationSpec;
  usedFallback: boolean;
  attempts: number;
  errorDetail?: string;
}

/**
 * @param onAttempt - dipanggil SEBELUM tiap percobaan (1..MAX_REPAIR_ATTEMPTS)
 *   supaya UI bisa menampilkan progres nyata, bukan diam total.
 */
export async function generateSimulationSpec(
  userText: string,
  currentSpec?: ValidatedSimulationSpec,
  onAttempt?: (attempt: number) => void
): Promise<GenerateSimulationResult> {
  const basePrompt = buildUserPrompt(userText, currentSpec);
  let repairNote: string | undefined;
  let lastErrorSummary = '';

  for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    onAttempt?.(attempt);
    try {
      const rawJson = await callGeminiForSpec(basePrompt, repairNote);
      const result = parseSimulationSpec(rawJson);

      if (result.ok) return { spec: result.spec, usedFallback: false, attempts: attempt };

      repairNote = result.repairPrompt;
      lastErrorSummary = [...result.schemaIssues, ...result.semanticIssues].map((i) => `${i.path}: ${i.message}`).join('; ');
      // Log ke console (BUKAN ke user) supaya developer bisa lihat alasan
      // gagal sebenarnya lewat DevTools, tanpa membocorkan detail teknis ke
      // suara/UI yang didengar user.
      console.warn(`[Cylen] Percobaan ${attempt} gagal validasi:`, lastErrorSummary);
    } catch (err) {
      lastErrorSummary = err instanceof Error ? err.message : String(err);
      console.warn(`[Cylen] Percobaan ${attempt} error teknis:`, lastErrorSummary);
      repairNote = `Percobaan sebelumnya gagal karena error teknis: "${lastErrorSummary}". Coba lagi, pastikan output berupa JSON valid sesuai struktur SimulationSpec.`;
    }
  }

  console.warn(`[Cylen] Semua ${MAX_REPAIR_ATTEMPTS} percobaan gagal, pakai fallback. Alasan terakhir:`, lastErrorSummary);
  return {
    spec: createFallbackSimulationSpec(lastErrorSummary),
    usedFallback: true,
    attempts: MAX_REPAIR_ATTEMPTS,
    errorDetail: lastErrorSummary,
  };
}
