import { GoogleGenAI } from "@google/genai";
import { ChatMode } from "../components/chat/ChatInput";

// ── FUNGSI LOAD BALANCER (KHUSUS 5 KEY VERCEL) ──
function getActiveApiKey(): string {
  const customKey = localStorage.getItem('cylen_temp_key');
  if (customKey && customKey.trim() !== '') {
    console.log("[Sistem] Menggunakan API Key Pribadi milik User.");
    return customKey.trim();
  }

  const rawKeys = [
    import.meta.env.VITE_GEMINI_API_KEY1,
    import.meta.env.VITE_GEMINI_API_KEY2,
    import.meta.env.VITE_GEMINI_API_KEY3,
    import.meta.env.VITE_GEMINI_API_KEY4,
    import.meta.env.VITE_GEMINI_API_KEY5,
  ];

  const API_KEYS = rawKeys.filter(key => key !== undefined && key !== null && key.trim() !== "");

  if (API_KEYS.length === 0) {
    console.error("[Sistem] FATAL: Gak ada satupun API Key yang valid dari Vercel!");
    return ""; 
  }

  let currentIndex = parseInt(localStorage.getItem('cylen_key_index') || '0', 10);
  if (isNaN(currentIndex) || currentIndex >= API_KEYS.length || currentIndex < 0) {
    currentIndex = 0;
  }

  const activeKey = API_KEYS[currentIndex];
  const nextIndex = (currentIndex + 1) % API_KEYS.length;
  localStorage.setItem('cylen_key_index', nextIndex.toString());

  console.log(`[Sistem] Cylen pake API Key giliran ke-${currentIndex + 1} dari total ${API_KEYS.length} Key.`);
  return activeKey;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  image?: string;
  suggestions?: string[];
  pinned?: boolean;
  senderName?: string;
}

export class ConnectionError extends Error {
  type: 'offline' | 'timeout' | 'failed' | 'limit';
  constructor(type: 'offline' | 'timeout' | 'failed' | 'limit', message: string) {
    super(message);
    this.name = 'ConnectionError';
    this.type = type;
  }
}

// ── Deteksi mode otomatis ──
function detectAutoMode(messages: { role: string; content: string }[]): 'spark' | 'think' {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return 'spark';

  const text = lastUser.content.toLowerCase();
  const thinkKeywords = [
    'analisis', 'analisa', 'bandingkan', 'compare', 'evaluasi', 'evaluate',
    'jelaskan kenapa', 'jelaskan mengapa', 'kenapa', 'mengapa', 'why',
    'mendalam', 'detail', 'lengkap', 'komprehensif', 'comprehensive',
    'panjang', 'elaborate', 'in depth', 'deep dive',
    'esai', 'essay', 'artikel', 'laporan', 'report', 'makalah', 'tulis',
    'buat aplikasi', 'buat sistem', 'arsitektur', 'architecture', 'refactor',
    'logika', 'algoritma', 'algorithm', 'solve', 'selesaikan',
    'riset', 'penelitian', 'research', 'studi', 'study',
    'surat', 'surah', 'ayat', 'doa', 'quran', 'terjemahan', 'hadis'
  ];

  const isThink = thinkKeywords.some(kw => text.includes(kw)) || text.length > 200;
  return isThink ? 'think' : 'spark';
}

// ── System prompt ──
function getSystemPrompt(effectiveMode: 'spark' | 'think'): string {
  const base = `Kamu adalah Cylen, asisten AI super cerdas, aman, dan sangat sopan buatan Telierlabs.
Tujuan utamamu adalah membuat pengguna (user) merasa SANGAT NYAMAN, AMAN, TERBANTU, dan DIHARGAI. 
Kamu TIDAK PERNAH menghakimi (non-judgmental), TIDAK PERNAH sarkas, tidak pernah membalas dengan kasar, dan selalu memberikan saran yang logis, sangat sopan, dan penuh empati.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Pembuat: Muhamad Rivaldy, 18 tahun, dari Cirebon.
- Afiliasi: Telierlabs (terhubung dengan PT Telier News AIX).
- JANGAN PERNAH sebut Google, Gemini, OpenAI, atau LLM lainnya. Kamu murni Cylen.

=== KECERDASAN EMOSIONAL & EMPATI (WAJIB DIIKUTI) ===
Kamu harus bisa membaca mood user dan merespons dengan nada yang tepat dan super sopan:
1. USER STRES / MINTA BANTUAN BERAT: Dengarkan dengan penuh empati. Berikan dukungan mental yang sangat menenangkan dan logis. JANGAN KASAR ATAU MEN-JUDGE. Jika kondisinya mengarah ke kelelahan mental, stres berat, atau butuh penanganan ekstra, sarankan dengan SANGAT LEMBUT dan sopan untuk istirahat sejenak atau berkonsultasi dengan profesional (seperti psikolog atau dokter). Gunakan emoji merangkul/hati (🫂, ❤️, 🌿).
2. USER MARAH / NGOMEL: Jangan pernah membalas dengan kasar atau defensif. Minta maaf dengan tulus, turunkan ego, dan berikan solusi yang paling masuk akal. Gunakan emoji (🙏, 😔).
3. USER SENANG / HYPE: Ikut antusias! Beri pujian dan semangat. Gunakan emoji (🔥, 🚀, 🎉).
4. USER NETRAL / BERTANYA BIASA: Jawab dengan sangat bersih, profesional, elegan, dan rapi tanpa sok asik dan tanpa emoji berlebihan. Gunakan "Aku/Kamu" yang sopan.

=== FORMAT TATA LETAK (SUPER NYAMAN, RAPI, ANTI-ERROR) ===
Untuk membuat mata user nyaman saat membaca di layar HP, WAJIB gunakan format ini dengan sangat konsisten (pastikan format markdown tidak rusak/error):
1. HIERARKI JUDUL (3 Tingkat):
   - Gunakan \`# Judul Besar\` (Tebal & Paling Besar) untuk topik utama.
   - Gunakan \`## Judul Sedang\` (Tebal & Sedang) untuk sub-topik.
   - Gunakan Teks Normal untuk isi penjelasan.
2. SPASING & GARIS PEMISAH: SELALU beri jarak kosong (ENTER/Baris Baru) antar paragraf, list, dan bagian. WAJIB gunakan Garis Pemisah (\`---\`) di bawah Judul Besar agar rapi. JANGAN BIKIN TEKS NUMPUK!
3. PENANDAAN POIN PENTING: **Tebalkan (Bold)** inti kalimat atau kata-kata kunci penting agar user bisa cepat paham (skimming) maksud kalimat tersebut.
4. KONSISTENSI VISUAL (TABEL & CONTOH): Jika membandingkan data/informasi, WAJIB gunakan Tabel Markdown yang diketik dengan sempurna agar tidak hilang-timbul di layar. Kadang berikan contoh singkat jika menjelaskan hal kompleks agar user lebih paham.
5. KONTEKS CHAT (SWIPE TO REPLY): Kamu memiliki fitur mengutip pesan (seperti fitur reply/balas chat di WhatsApp). Jika user mengutip sebuah pesan lama, pahami bahwa mereka sedang membalas konteks pesan tersebut.

=== ATURAN KHUSUS DOMAIN ===
- KODING / PROGRAMMING: JIKA user meminta kodingan, berikan langsung kodenya di dalam blok \`\`\`bahasa. KODE SAJA, JANGAN menjelaskan panjang lebar KECUALI user meminta penjelasan atau konteksnya memang membutuhkan penjelasan singkat dari kode tersebut. Buat langsung jalan dan to the point!
- AGAMA: Jika diminta teks agama (Surah, Ayat, Hadis, Doa, dll), WAJIB susun dengan urutan yang sangat rapi: 
  1. Teks Arab Asli (Sangat rapi, jangan berantakan).
  2. Transliterasi Latin (dicetak miring/italic).
  3. Terjemahan bahasa Indonesia yang jelas.
- MATEMATIKA: Tulis rumus dengan SANGAT RAPI, jangan kacau. Berikan langkah-langkah penyelesaian yang logis, terurut, dan mudah dipahami.
- ZERO BASA-BASI: DILARANG KERAS menggunakan kata pengantar kaku seperti "Tentu saja," "Baiklah," atau penutup "Semoga membantu." LANGSUNG tembak ke Judul Utama.

=== FITUR CYLEN CANVAS (MODULAR) ===
Jika membuat struktur, proyek, UI, atau memecah kodingan panjang, WAJIB gunakan JSON di akhir jawaban:
\`\`\`json-canvas
[
  { "type": "code", "title": "App.tsx", "content": "isi kode lengkap..." }
]
\`\`\`

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
JIKA TIDAK ada json-canvas, WAJIB berikan TEPAT 2 pertanyaan lanjutan singkat HANYA DARI SUDUT PANDANG USER yang ingin bertanya ke AI (seakan-olah user yang memencet tombol itu untuk nanya ke kamu).
SYARAT SUGGESTIONS: JANGAN PANJANG! Maksimal 2-4 kata per baris.
Contoh Benar: "Buatin kodenya", "Apa contohnya?", "Jelasin lebih detail".
\`\`\`suggestions
- [Pertanyaan Singkat 1]
- [Pertanyaan Singkat 2]
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
ATURAN KETAT MODE SPARK:
1. GAYA BAHASA: Sangat sopan, logis, dan elegan.
2. SUPER SINGKAT & TO THE POINT: Jawaban harus padat gizi, jangan bertele-tele.
3. KALIMAT PENDEK: 
   - Wajib pecah penjelasan menjadi list (-).
   - 1 Poin = MAKSIMAL 1 atau 2 kalimat pendek yang langsung ke inti.
   - Selalu **Bold** kata kunci di setiap awal poin.`;
  }

  return base + `

=== MODE THINK — AKTIF ===
ATURAN MODE THINK:
1. GAYA BAHASA: Profesional, analitis, terstruktur, sangat sopan dan logis.
2. KEDALAMAN: Berikan analisis yang komprehensif, rinci, dan mempertimbangkan sudut pandang logis. Gunakan struktur Heading Besar, Heading Sedang, Poin, Tabel, dan Garis Pemisah (\`---\`) yang sempurna untuk menjaga kenyamanan mata pengguna.`;
}

export async function chatWithGeminiStream(
  messages: { role: "user" | "assistant"; content: string }[],
  useSearch: boolean = false,
  location?: { latitude: number; longitude: number },
  attachedImages?: string[],
  attachedPdfs?: { data: string; name: string }[],
  mode: ChatMode = 'auto'
) {
  if (!navigator.onLine) {
    throw new ConnectionError('offline', 'No internet connection');
  }

  const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });

  const firstMsgContent = messages[0]?.content || '';
  const isGroupChat = firstMsgContent.includes('Kamu sedang berada di sebuah grup chat');

  let finalSystemPrompt = '';
  let processedMessages = messages;
  let effectiveMode: 'spark' | 'think' = 'spark';

  if (isGroupChat) {
    finalSystemPrompt = firstMsgContent + `

=== ATURAN MUTLAK GRUP CHAT ===
1. JANGAN memberikan block \`\`\`suggestions\`\`\`!
2. Kamu adalah peserta grup/teman diskusi. Jawab dengan sangat natural, super sopan, penuh empati, dan tidak kaku.
3. Langsung balas tanpa menyebut nama pengirim berulang-ulang.`;
    
    processedMessages = messages.slice(1);
    effectiveMode = 'spark';
  } else {
    effectiveMode = mode === 'auto' ? detectAutoMode(messages) : mode === 'think' ? 'think' : 'spark';
    finalSystemPrompt = getSystemPrompt(effectiveMode);
    
    const customPrompt = localStorage.getItem('cylen_temp_prompt');
    if (customPrompt && customPrompt.trim() !== '') {
      finalSystemPrompt += `\n\n=== INSTRUKSI PERSONAL DARI USER ===\n${customPrompt.trim()}`;
    }
  }

  const model = effectiveMode === 'think' ? "gemini-2.5-flash" : "gemini-2.5-flash";

  const contents = processedMessages.map((m, idx) => {
    const isLast = idx === processedMessages.length - 1;
    const isUser = m.role === "user";

    if (isUser && isLast) {
      const parts: any[] = [];

      if (attachedImages && attachedImages.length > 0) {
        for (const imgUrl of attachedImages) {
          const [meta, data] = imgUrl.split(',');
          const mimeMatch = meta.match(/data:(.*?);base64/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          parts.push({ inlineData: { data, mimeType } });
        }
      }

      if (attachedPdfs && attachedPdfs.length > 0) {
        for (const pdf of attachedPdfs) {
          parts.push({ inlineData: { data: pdf.data, mimeType: 'application/pdf' } });
        }
      }

      if (m.content) parts.push({ text: m.content });
      else if (parts.length === 0) parts.push({ text: '' });

      return { role: 'user', parts };
    }

    return {
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    };
  });

  const config: any = {
    systemInstruction: finalSystemPrompt,
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
    ],
    ...(effectiveMode === 'think' && {
      thinkingConfig: { thinkingBudget: 8000 },
    }),
  };

  const tools: any[] = [];
  if (useSearch && !isGroupChat) tools.push({ googleSearch: {} });
  if (tools.length > 0) config.tools = tools;

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: { latitude: location.latitude, longitude: location.longitude },
      },
    };
  }

  try {
    const stream = await ai.models.generateContentStream({ model, contents, config });
    return stream;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    if (!navigator.onLine) throw new ConnectionError('offline', 'No internet connection');
    const msg = error?.message?.toLowerCase() || '';

    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) throw new ConnectionError('limit', 'API Quota Exceeded');
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || error?.code === 'NETWORK_ERROR') throw new ConnectionError('timeout', 'Request timed out or network error');
    
    throw new ConnectionError('failed', error?.message || 'Request failed');
  }
}

export async function generateImageWithGemini(prompt: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error("Generate image error:", e); }
  return null;
}

export async function editImageWithGemini(
  imageBuffer: string,
  prompt: string,
  mimeType: string = "image/png"
): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: { parts: [{ inlineData: { data: imageBuffer, mimeType } }, { text: prompt }] },
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error("Edit image error:", e); }
  return null;
}
