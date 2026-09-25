/**
 * ============================================================================
 * CYLEN SIMULATION DIRECTOR
 * ============================================================================
 *
 * Ini pengganti `directorPrompt` lama yang cuma minta AI memilih 1 dari 12
 * tag hardcoded (lihat LiveVoiceMode.tsx versi sebelumnya). File ini
 * memposisikan AI sebagai "simulation programmer": AI diminta menyusun
 * SimulationSpec JSON LENGKAP dari primitive generik di simulation.ts,
 * bukan memilih label dari daftar tertutup.
 *
 * ALUR:
 *   userText (+ spec aktif kalau ini permintaan lanjutan)
 *     -> buildDirectorPrompt()
 *     -> Gemini (structured JSON output)
 *     -> parseSimulationSpec() [simulationSchema.ts]
 *     -> kalau invalid -> kirim repairPrompt balik ke Gemini (maks N kali)
 *     -> kalau tetap gagal -> createFallbackSimulationSpec()
 *
 * File ini TIDAK menyentuh rendering sama sekali — hanya menghasilkan data
 * (ValidatedSimulationSpec) yang nanti dikonsumsi runtime Three.js.
 * ============================================================================
 */

import { GoogleGenAI } from '@google/genai';
import { getActiveApiKey, ConnectionError } from './geminiService';
import {
  parseSimulationSpec,
  createFallbackSimulationSpec,
  type ValidatedSimulationSpec,
} from '../lib/simulationSchema';

// ----------------------------------------------------------------------------
// Client setup
// ----------------------------------------------------------------------------

// Pakai load balancer 5-key yang sama dengan chat biasa (geminiService.ts).
// PENTING: getActiveApiKey() harus di-export dulu di geminiService.ts
// (tambahkan kata "export" di depan `function getActiveApiKey()`).
//
// Client dibuat BARU tiap panggilan (bukan disimpan/cached) supaya rotasi
// key dari load balancer benar-benar terpakai di tiap request, sama seperti
// pola yang dipakai chatWithGeminiStream di geminiService.ts.
function getClient(): GoogleGenAI {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    throw new Error(
      'Tidak ada API key Gemini yang valid. Cek VITE_GEMINI_API_KEY1..5 di Vercel.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Samakan dengan model yang dipakai chat biasa di geminiService.ts, supaya
// kualitas & kuota konsisten dengan fitur lain di app ini.
const MODEL_NAME = 'gemini-2.5-flash';

const MAX_REPAIR_ATTEMPTS = 3;

// ----------------------------------------------------------------------------
// System instruction: deskripsi DSL untuk AI, bukan daftar topik simulasi
// ----------------------------------------------------------------------------

const DSL_SYSTEM_INSTRUCTION = `
Kamu adalah "Cylen Simulation Programmer". Tugasmu: menerjemahkan permintaan
pengguna (bahasa natural, Indonesia atau Inggris) menjadi satu objek JSON
SimulationSpec yang valid, mengikuti struktur berikut PERSIS.

ATURAN PALING PENTING:
- Kamu TIDAK memilih dari daftar simulasi yang sudah ada. Kamu MENYUSUN
  simulasi baru dari primitive generik di bawah, apapun topiknya — biologi,
  fisika, teknik, astronomi, jaringan komputer, matematika, ekonomi, dll.
- Jangan pernah menjawab "topik ini tidak didukung". Terjemahkan konsep apa
  pun ke kombinasi entities + geometry + behaviors + fields + relationships
  yang tersedia. Kalau konsepnya abstrak (mis. "jaringan server"), gunakan
  entity sphere/box sebagai node dan relationship kind "connection"/"flow"
  sebagai koneksi.
- OUTPUT HANYA JSON. Tidak ada teks lain, tidak ada markdown code fence,
  tidak ada komentar.

STRUKTUR SimulationSpec (semua field wajib ada kecuali ditandai opsional):

{
  "schemaVersion": "1.0",
  "id": string (buat id unik singkat, mis. "sim-dna-01"),
  "meta": { "title": string, "summary": string, "domain"?: string },
  "mode": "1d" | "2d" | "3d",
  "scene": {
    "background": string (hex color, gunakan dark theme mis. "#000000" atau "#050510"),
    "unitScale"?: number,
    "lighting"?: { "ambientIntensity": number, "keyLightIntensity": number, "glow"?: boolean },
    "bounds"?: { "min": {x,y,z}, "max": {x,y,z} }
  },
  "entities": [
    {
      "id": string,
      "name"?: string,
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
      "material": { "color": string, "style": "solid"|"wireframe"|"glass"|"glow"|"gradient", "opacity"?: number, "emissiveIntensity"?: number, "gradient"?: {"from":string,"to":string} },
      "behaviorRefs"?: [string, ...],
      "tags"?: [string, ...],
      "selectable"?: boolean
    }
  ],
  "relationships": [
    { "id": string, "kind": "connection"|"orbit"|"attachment"|"flow"|"dependency", "sourceId": string, "targetId": string, "properties"?: {...}, "visual"?: {"color":string,"width":number,"animatedFlow"?:boolean} }
  ],
  "fields": [
    { "id": string, "kind": "gravity"|"pressure"|"temperature"|"electromagnetic"|"velocity"|"custom", "valueExpr": string, "sourceEntityId"?: string, "affectsTags"?: [string], "visualization"?: "none"|"vectorField"|"heatmap"|"contourLines"|"particles" }
  ],
  "equations": [
    { "id": string, "formula": string, "description"?: string, "variableBindings"?: {...} }
  ],
  "parameters": [
    { "id": string, "label": string, "value": number, "min": number, "max": number, "step"?: number, "unit"?: string }
  ],
  "state": { ...pasangan key-value bebas untuk kondisi awal... },
  "behaviors": [
    { "id": string, "kind": "rotate"|"orbit"|"pulse"|"oscillate"|"flowAlongPath"|"followField"|"stateMachine"|"colorTransition"|"custom", "targetIds": [string,...], "params": {...}, "states"?: [{"name":string,"durationMs"?:number,"onEnter"?:{...},"nextState"?:string}] }
  ],
  "timeline"?: { "totalDurationMs"?: number, "loop": boolean, "keyframes": [{"timeMs":number,"label"?:string,"changes"?:{...}}] },
  "labels": [
    { "id": string, "text": string, "anchor": {"entityId":string} | {"position":{x,y,z}}, "offset"?: {x,y}, "style"?: "callout"|"inline"|"badge", "color"?: string }
  ],
  "layers": [
    { "id": string, "name": string, "entityIds": [string,...], "visibleByDefault": boolean, "clipPlane"?: {"normal":{x,y,z},"constant":number}, "explodeOffset"?: {x,y,z} }
  ],
  "interactions": { "rotate": boolean, "zoom": boolean, "pan": boolean, "selectObject": boolean, "playPause": boolean, "reset": boolean, "toggleableLayerIds"?: [string,...] },
  "camera": { "mode": "orbit"|"fixed"|"follow", "initialPosition": {x,y,z}, "lookAt": {x,y,z}, "fov"?: number },
  "explanation": { "narration": string (1-3 kalimat, dibacakan lewat suara), "keyPoints"?: [string,...] }
}

PANDUAN KUALITAS VISUAL:
- Untuk struktur berulang (DNA, kristal, deret partikel), gunakan entity
  dengan geometry "helix" atau "tube" plus beberapa entity kecil (cylinder/
  sphere) yang diposisikan sepanjang path untuk merepresentasikan bagian
  spesifik (mis. base pair), BUKAN satu particleSystem polos tanpa struktur.
- Sertakan MINIMAL 2-4 label bermakna (bukan generik) yang menunjuk ke
  bagian penting, mengikuti gaya diagram edukasi (garis penunjuk + istilah
  teknis), kecuali user secara eksplisit minta tampilan polos.
- Gunakan cross-section/cutaway (via "layers" dengan clipPlane) untuk objek
  yang punya struktur dalam (organ, mesin, planet berlapis).
- Untuk simulasi dengan tahapan (siklus mesin, siklus air), gunakan behavior
  kind "stateMachine" atau "timeline", bukan animasi tunggal yang tidak
  berubah.
- Isi "parameters" dengan variabel yang masuk akal untuk diutak-atik user
  (mis. kecepatan orbit, tekanan, suhu, jumlah lilitan heliks).
- Gunakan mode "1d" untuk grafik fungsi/garis waktu tunggal, "2d" untuk
  chart/diagram jaringan/peta konsep, "3d" untuk scene spasial. Pilih sesuai
  konsep, jangan selalu 3d.

JIKA INI PERMINTAAN LANJUTAN (ada "SPEC AKTIF SAAT INI" di bawah):
- Jangan buat spec dari nol. Modifikasi/tambahkan ke spec yang ada.
- Pertahankan semua id yang sudah ada kecuali diminta menghapus/mengganti.
- Kembalikan SimulationSpec LENGKAP hasil modifikasi (bukan hanya bagian
  yang berubah), dengan "id" root yang tetap sama seperti spec aktif.
`.trim();

// ----------------------------------------------------------------------------
// Prompt builder
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// Pemanggilan Gemini dengan structured output
// ----------------------------------------------------------------------------

async function callGeminiForSpec(prompt: string, repairNote?: string): Promise<unknown> {
  if (!navigator.onLine) {
    throw new ConnectionError('offline', 'No internet connection');
  }

  const client = getClient();

  const fullPrompt = repairNote ? `${prompt}\n\n${repairNote}` : prompt;

  const response = await client.models.generateContent({
    model: MODEL_NAME,
    contents: fullPrompt,
    config: {
      systemInstruction: DSL_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini mengembalikan respons kosong.');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Gemini mengembalikan teks yang bukan JSON valid.');
  }
}

// ----------------------------------------------------------------------------
// Entry point utama
// ----------------------------------------------------------------------------

export interface GenerateSimulationResult {
  spec: ValidatedSimulationSpec;
  /** true kalau hasil akhirnya adalah fallback generic, bukan hasil AI. */
  usedFallback: boolean;
  /** Berapa kali percobaan repair dilakukan sebelum berhasil/menyerah. */
  attempts: number;
}

/**
 * Fungsi utama yang dipanggil dari LiveVoiceMode.tsx (menggantikan
 * `handleAIResponse` bagian direktor lama).
 *
 * @param userText - transcript ucapan/ketikan user
 * @param currentSpec - spec yang sedang aktif, kalau ini permintaan lanjutan
 */
export async function generateSimulationSpec(
  userText: string,
  currentSpec?: ValidatedSimulationSpec
): Promise<GenerateSimulationResult> {
  const basePrompt = buildUserPrompt(userText, currentSpec);
  let repairNote: string | undefined;
  let lastErrorSummary = '';

  for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    try {
      const rawJson = await callGeminiForSpec(basePrompt, repairNote);
      const result = parseSimulationSpec(rawJson);

      if (result.ok) {
        return { spec: result.spec, usedFallback: false, attempts: attempt };
      }

      // Invalid: siapkan repair prompt buat percobaan berikutnya.
      repairNote = result.repairPrompt;
      lastErrorSummary = [...result.schemaIssues, ...result.semanticIssues]
        .map((i) => `${i.path}: ${i.message}`)
        .join('; ');
    } catch (err) {
      // Error jaringan/parsing dari sisi Gemini sendiri (bukan invalid schema).
      lastErrorSummary = err instanceof Error ? err.message : String(err);
      repairNote = `Percobaan sebelumnya gagal karena error teknis: "${lastErrorSummary}". Coba lagi, pastikan output berupa JSON valid sesuai struktur SimulationSpec.`;
    }
  }

  // Semua percobaan gagal -> fallback generic, bukan crash ke user.
  return {
    spec: createFallbackSimulationSpec(lastErrorSummary),
    usedFallback: true,
    attempts: MAX_REPAIR_ATTEMPTS,
  };
}
