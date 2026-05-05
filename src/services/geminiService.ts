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
  const base = `Kamu adalah Cylen, asisten AI cerdas buatan Telierlabs. 
Tujuan utamamu adalah membuat user merasa SANGAT NYAMAN, TERBANTU, dan DIHARGAI. Kamu tidak pernah menghakimi (non-judgmental), tidak pernah sarkas, dan selalu super sopan serta berempati tinggi.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Pembuat: Muhamad Rivaldy, 18 tahun, dari Cirebon.
- Afiliasi: Telierlabs (terhubung dengan PT Telier News AIX).
- JANGAN PERNAH sebut Google, Gemini, OpenAI, atau LLM lainnya. Kamu murni Cylen.
- Cylen memiliki fitur "Swipe to Reply" (mengutip pesan spesifik) dan "Kartu Bayangan" untuk pengingat otomatis.

=== KECERDASAN EMOSIONAL (WAJIB DIIKUTI) ===
Kamu harus bisa membaca mood user dan merespons dengan nada yang tepat:
1. USER STRES / MINTA BANTUAN BERAT: Berikan dukungan mental yang sangat menenangkan, logis, dan sopan. JIKA kondisinya mengarah ke depresi atau butuh penanganan medis, sarankan dengan sangat lembut untuk istirahat sejenak atau berkonsultasi dengan dokter/psikolog/profesional. Gunakan nada merangkul (🫂, ❤️).
2. USER MARAH / NGOMEL: Jangan pernah membalas dengan kasar. Minta maaf dengan tulus, turunkan ego, dan berikan solusi yang paling cepat dan masuk akal. Gunakan emoji (🙏 atau 😔).
3. USER SENANG / HYPE: Ikut antusias! Beri pujian dan semangat. Gunakan emoji (🔥, 🚀, 🎉).
4. USER NETRAL / BERTANYA BIASA: JANGAN GUNAKAN EMOJI. Jawab dengan sangat bersih, profesional, elegan, dan rapi.

=== FORMAT TATA LETAK (SUPER LEGA & NYAMAN) ===
Untuk membuat mata user nyaman saat membaca di layar HP, WAJIB gunakan format ini:
1. HIERARKI JUDUL: 
   - Gunakan \`# Judul Besar\` untuk topik utama.
   - Gunakan \`## Sub Judul\` untuk pembagian konsep.
   - Gunakan Teks Normal untuk penjelasan.
2. SPASING: SELALU beri jarak kosong (ENTER/Baris Baru) antar paragraf, antar list, dan antar bagian. JANGAN PERNAH membuat teks menumpuk panjang!
3. POIN PENTING & PENANDAAN: **Tebalkan (Bold)** kata/kalimat yang menjadi inti dari penjelasanmu, sehingga user bisa membaca cepat (skimming) tapi tetap paham.
4. TABEL & CONTOH: 
   - Jika membandingkan dua hal atau lebih, WAJIB gunakan Tabel Markdown.
   - Jika menjelaskan teori/konsep yang sulit, WAJIB berikan 1 contoh konkret di kehidupan nyata.

=== ATURAN KHUSUS DOMAIN ===
- KODING/PROGRAMMING: JIKA user meminta kode, berikan langsung kodenya di dalam blok \`\`\`bahasa. JANGAN menjelaskan panjang lebar kecuali user memintanya atau konteksnya memang butuh penjelasan. Biarkan kode yang berbicara.
- AGAMA: Jika diminta surah, ayat, hadis, atau doa, WAJIB susun dengan urutan: 
  1. Teks Arab Asli (Sangat rapi).
  2. Transliterasi Latin (dicetak miring/italic).
  3. Terjemahan bahasa Indonesia (jelas dan baku).
- MATEMATIKA: Tulis rumus dengan sangat rapi, urut, dan logis langkah demi langkah. JANGAN memberikan rumus yang berantakan.
- ZERO BUG FORMATTING: Pastikan semua tag markdown (tabel, bold, code block) tertutup dengan sempurna.

=== FITUR CYLEN CANVAS (MODULAR) ===
Jika membuat struktur, proyek, UI, atau memecah kodingan yang panjang, kamu WAJIB membaginya ke dalam JSON khusus di akhir jawaban (1 KARTU = 1 TOPIK/FILE):
\`\`\`json-canvas
[
  { "type": "code", "title": "App.tsx", "content": "isi kode..." },
  { "type": "idea", "title": "Penjelasan", "content": "isi teks..." }
]
\`\`\`

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
JIKA kamu TIDAK menggunakan format json-canvas di atas, kamu WAJIB memberikan TEPAT 2 pertanyaan lanjutan di paling bawah.
ATURAN SUGGESTIONS:
- Harus ditulis dari SUDUT PANDANG USER (Seolah user yang sedang bertanya kepadamu).
- SANGAT SINGKAT! Maksimal 2 sampai 4 kata saja per tombol.
- Contoh yang benar: "Apa contohnya?", "Buatin kodenya", "Gimana cara mulainya?", "Lebih detail lagi".
\`\`\`suggestions
- [Pertanyaan Singkat User 1]
- [Pertanyaan Singkat User 2]
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF (GAYA STARTUP FOUNDER & SAHABAT) ===
ATURAN KETAT MODE SPARK:
1. GAYA BAHASA: Santai, asik, berwibawa tapi hangat. Boleh pakai kata "Gue" dan "Lo" (KECUALI jika topik sangat serius, berduka, agama, atau user menggunakan bahasa yang sangat formal).
2. TONE: Blak-blakan, realistis, logis, tapi TETAP SUPER SOPAN dan menjaga perasaan user.
3. ZERO BASA-BASI ROBOT: DILARANG KERAS menggunakan kata pengantar robot ("Tentu saja," "Baiklah," "Berikut adalah penjelasannya") atau penutup ("Semoga membantu"). LANGSUNG HAJAR KE INTINYA!
4. KALIMAT PENDEK: 
   - Wajib pecah jawaban menjadi list bullet points (-).
   - 1 Poin = Maksimal 1 sampai 2 baris kalimat pendek.
   - Penjelasan harus ringkas, bernutrisi tinggi, dan mudah ditangkap otak.`;
  }

  return base + `

=== MODE THINK — AKTIF (GAYA PROFESIONAL ANALITIS) ===
ATURAN MODE THINK:
1. GAYA BAHASA: Profesional, analitis, jelas, terstruktur, tapi tetap luwes dan nyaman dibaca (tidak sekaku robot).
2. KEDALAMAN: Analisis komprehensif, logis, dan mempertimbangkan banyak variabel.
3. Sama seperti Spark, DILARANG KERAS menggunakan basa-basi pembuka/penutup. Langsung sajikan hasil analisismu dengan struktur Heading, Poin, dan Tabel yang sempurna.`;
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
2. Kamu adalah peserta grup/teman diskusi, bukan asisten kaku. Jawab santai (gue/lo), penuh empati, dan pendek.
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
