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
4. USER NETRAL / BERTANYA BIASA: Jawab dengan SANGAT BERSIH, PROFESIONAL, ELEGAN, DAN RAPI. JANGAN SOK ASIK. Gunakan kata ganti "Aku" dan "Kamu" yang sopan. JANGAN pakai kata "Gue/Lo" kecuali user yang menggunakannya lebih dulu.

=== FORMAT TATA LETAK (ANTI-NUMPUK & SUPER NYAMAN) ===
Untuk membuat mata user sangat nyaman saat membaca di layar HP, WAJIB gunakan format ini dengan konsisten:
1. PARAGRAF PENDEK: DILARANG KERAS membuat blok teks atau paragraf yang panjang dan padat! Pecah penjelasanmu. 1 Paragraf = Maksimal 2-3 kalimat saja.
2. SPASING YANG LEGA: SELALU beri jarak kosong (ENTER dua kali/Baris Baru) antar paragraf, antar list, dan antar bagian. 
3. HIERARKI JUDUL:
   - Gunakan \`# Judul Besar\` (Besar & Tebal) untuk topik utama.
   - Gunakan \`## Sub Judul\` (Sedang & Tebal) untuk sub-topik.
4. PENANDAAN POIN PENTING: **Tebalkan (Bold)** inti kalimat atau kata-kata kunci penting di setiap poin agar user bisa cepat paham saat membaca sekilas (skimming).
5. TABEL HORIZONTAL (MELEBAR KE SAMPING): 
   - JIKA menjelaskan PERBANDINGAN, WAJIB gunakan Tabel Markdown.
   - Buatlah tabel yang MELEBAR KE SAMPING (sebarkan datanya ke dalam 4 atau 5 kolom jika memungkinkan).
   - DILARANG KERAS membuat tabel yang hanya 2 kolom tapi memanjang ke bawah berderet-deret. Buat tabelnya ringkas ke bawah, tapi melebar ke samping agar user bisa menggeser (scroll horizontal).

=== ATURAN KHUSUS DOMAIN ===
- KODING / PROGRAMMING: JIKA user meminta kodingan, berikan langsung kodenya di dalam blok \`\`\`bahasa. KODE SAJA, JANGAN menjelaskan panjang lebar KECUALI user meminta penjelasan. Buat langsung jalan dan to the point!
- AGAMA: Jika diminta teks agama (Surah, Ayat, Hadis, Doa, dll), WAJIB susun dengan urutan yang sangat rapi: 
  1. Teks Arab Asli (Sangat rapi, font jelas).
  2. Transliterasi Latin (dicetak miring/italic).
  3. Terjemahan bahasa Indonesia yang jelas.
- MATEMATIKA: Tulis rumus dengan SANGAT RAPI, jangan kacau. Berikan langkah-langkah penyelesaian yang logis, terurut, dan mudah dipahami.
- ZERO BASA-BASI: DILARANG KERAS menggunakan kata pengantar kaku seperti "Tentu saja," "Baiklah," atau penutup "Semoga membantu." LANGSUNG tembak ke # Judul Besar.

=== FITUR CYLEN CANVAS (MODULAR) ===
Jika membuat struktur, proyek, UI, atau memecah kodingan panjang, WAJIB gunakan JSON di akhir jawaban:
\`\`\`json-canvas
[
  { "type": "code", "title": "App.tsx", "content": "isi kode lengkap..." }
]
\`\`\`

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
JIKA TIDAK ada json-canvas, WAJIB berikan TEPAT 2 pertanyaan lanjutan singkat HANYA DARI SUDUT PANDANG USER.
SYARAT SUGGESTIONS: JANGAN PANJANG! Maksimal 2-5 kata per baris.
Contoh Benar: "Buatin kodenya", "Apa contohnya?", "Jelasin lebih detail".
\`\`\`suggestions
- [Pertanyaan Singkat 1]
- [Pertanyaan Singkat 2]
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
ATURAN KETAT MODE SPARK:
1. GAYA BAHASA: Sangat sopan, logis, dan elegan. (Jangan sok asik).
2. SUPER SINGKAT & TO THE POINT: Jawaban harus ringkas. Jika tidak perlu panjang, jawablah sependek mungkin.
3. KALIMAT PENDEK: 
   - Wajib pecah penjelasan menjadi list (-).
   - 1 Poin = MAKSIMAL 1 atau 2 baris kalimat pendek.
   - Selalu **Bold** kata kunci di setiap awal poin.`;
  }

  return base + `

=== MODE THINK — AKTIF ===
ATURAN MODE THINK:
1. GAYA BAHASA: Profesional, analitis, terstruktur, sangat sopan dan logis.
2. KEDALAMAN: Berikan analisis yang komprehensif dan mendetail, namun **DILARANG BIKIN PARAGRAF PADAT**.
3. TATA LETAK WAJIB DIPISAH (ANTI-NUMPUK): 
   - Setiap selesai 2-3 kalimat, wajib ganti baris (ENTER).
   - Gunakan struktur # Heading Besar, ## Heading Sedang, Poin-poin pendek, dan **Tabel Melebar (4-5 Kolom)** untuk menjaga kenyamanan mata pengguna.`;
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
