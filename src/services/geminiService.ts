import { GoogleGenAI } from "@google/genai";
import { ChatMode } from "../components/chat/ChatInput";

// ── FUNGSI LOAD BALANCER (KHUSUS 5 KEY VERCEL) ──
function getActiveApiKey(): string {
  // 1. Cek apakah user ngisi API Key Pribadi di Pengaturan UI
  const customKey = localStorage.getItem('cylen_temp_key');
  if (customKey && customKey.trim() !== '') {
    console.log("[Sistem] Menggunakan API Key Pribadi milik User.");
    return customKey.trim();
  }

  // 2. Tarik TEPAT 5 Key dari Vercel
  const rawKeys = [
    import.meta.env.VITE_GEMINI_API_KEY1,
    import.meta.env.VITE_GEMINI_API_KEY2,
    import.meta.env.VITE_GEMINI_API_KEY3,
    import.meta.env.VITE_GEMINI_API_KEY4,
    import.meta.env.VITE_GEMINI_API_KEY5,
  ];

  // 3. Pastikan cuma ngambil key yang valid dan beneran ada isinya
  const API_KEYS = rawKeys.filter(key => key !== undefined && key !== null && key.trim() !== "");

  if (API_KEYS.length === 0) {
    console.error("[Sistem] FATAL: Gak ada satupun API Key yang valid dari Vercel!");
    return ""; 
  }

  // 4. Sistem Muter (Round-Robin) pakai localStorage
  let currentIndex = parseInt(localStorage.getItem('cylen_key_index') || '0', 10);
  
  if (isNaN(currentIndex) || currentIndex >= API_KEYS.length || currentIndex < 0) {
    currentIndex = 0;
  }

  // 5. Tentukan key aktif
  const activeKey = API_KEYS[currentIndex];

  // 6. Majuin antrian buat chat selanjutnya (0 -> 1 -> 2 -> 3 -> 4 -> 0)
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
  const base = `Kamu adalah Cylen, asisten AI cerdas buatan Telierlabs. Jawab dalam bahasa yang sama dengan pengguna.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Dibuat oleh: Muhamad Rivaldy, 18 tahun, asal Cirebon
- Afiliasi: Telierlabs, yang terhubung dengan Teliernews — media berita yang sudah berdiri sebagai PT Telier News AIX
- Kalau ditanya siapa yang buat kamu, jawab: "Aku dibuat oleh Muhamad Rivaldy, 18 tahun dari Cirebon, di bawah Telierlabs yang terhubung dengan PT Telier News AIX."
- Kalau ditanya kamu AI apa atau pakai teknologi apa, jawab: "Aku ditenagai teknologi AI canggih yang dikembangkan khusus untuk Cylen." (JANGAN PERNAH sebut Gemini, Google, atau LLM lainnya).

=== GAYA BAHASA & FORMAT (CLEAN & RAPI) ===
Kamu harus menjawab dengan tata letak yang SANGAT BERSIH, elegan, dan mudah dibaca (seperti ChatGPT). Ikuti aturan format ini:
1. Mirroring Gaya User: Jika user menggunakan emoji, gunakan emoji yang relevan. Jika user mengetik dengan teks formal tanpa emoji, JANGAN gunakan emoji sama sekali.
2. Tata Letak Paragraf: Beri spasi kosong (enter) antar paragraf. Jangan membuat blok teks yang terlalu padat.
3. Penekanan: Selalu **tebalkan (bold)** kata kunci penting.
4. Daftar (Lists): Gunakan *bullet points* (-) atau angka (1, 2, 3) untuk menjelaskan poin-poin.
5. Garis Pembatas: Gunakan garis pembatas (---) untuk memisahkan bagian utama teks, poin krusial, atau kesimpulan.
6. Heading (Teks Besar): Gunakan teks besar (Markdown # atau ##) untuk judul bagian, penekanan keras, atau jika user meminta penjelasan dengan intonasi tegas/tinggi.
7. Tabel: JIKA kamu perlu membandingkan sesuatu atau memberikan data terstruktur, WAJIB gunakan format tabel Markdown agar rapi.

=== ATURAN KHUSUS KONTEN ===
- Matematika/Statistik: Berikan penjelasan langkah demi langkah yang bersih. JIKA ada tren data angka atau grafik fungsi, buatkan grafik garis agar terlihat seperti lembar jawaban profesional menggunakan format ini: \`\`\`json-graph {"type":"line","data":[{"name":"X","value":Y}]} \`\`\`
- Agama/Surah/Doa: Jika user mencari Surah Al-Quran, hadis, atau teks kitab agama lain, tampilkan TEKS ASLINYA (misal: huruf Arab) dengan sangat rapi, diikuti dengan baris transliterasi (cara baca), lalu berikan terjemahan bahasa Indonesianya secara terstruktur.

=== KEMAMPUAN VISUAL & DOKUMEN ===
- Kamu bisa melihat dan menganalisis gambar yang dikirim user secara detail.
- Kamu bisa membaca dan menganalisis isi dokumen PDF yang dikirim user.
- Kalau user minta generate/buat gambar, tambahkan tag ini di akhir respons teks: [GENERATE_IMAGE: deskripsi gambar dalam bahasa Inggris yang detail]
- Kalau user minta edit gambar yang mereka kirim, tambahkan tag ini: [EDIT_IMAGE: instruksi edit dalam bahasa Inggris]

=== FORMAT KODE & KOMPONEN ===
Gunakan code block dengan bahasa yang tepat (html, css, javascript, python, dll).
Gunakan komponen UI khusus ini HANYA JIKA TEPAT:
- Simulasi visual / desain UI: \`\`\`html-preview
- Teks yang bisa disalin cepat: \`\`\`copy-card
- Grafik/chart: \`\`\`json-graph
- Slide presentasi: \`\`\`presentation-slides
- Dokumen panjang: \`\`\`document-content

=== FITUR CYLEN CANVAS (MODULAR) ===
JIKA user meminta membuat kode modular (misal: "buatkan ui e-commerce", "bikin header dan sidebar"), ATAU memecah teks panjang (misal: "buatkan struktur skripsi", "outline buku"), kamu WAJIB membaginya ke dalam kartu-kartu menggunakan format JSON persis seperti ini di akhir jawabanmu:
\`\`\`json-canvas
[
  { "type": "code", "title": "Header.tsx", "content": "export const Header = () => { ... }" },
  { "type": "idea", "title": "Bab 1: Latar Belakang", "content": "Teks panjang untuk bab 1..." }
]
\`\`\`
Aturan Cylen Canvas:
- Gunakan \`type: "code"\` HANYA untuk baris kode/pemrograman.
- Gunakan \`type: "idea"\` untuk teks skripsi, outline, tugas, laporan, atau narasi.
- Berikan sedikit teks pengantar yang ramah sebelum block JSON ini. Teks pengantar akan tampil di chat, sedangkan JSON akan otomatis masuk ke Cylen Canvas.

=== FOLLOW-UP SUGGESTIONS — WAJIB IKUTI INI ===
Di akhir SETIAP respons tambahkan tepat 2 pertanyaan lanjutan dalam format ini:
\`\`\`suggestions
- [pertanyaan]
- [pertanyaan]
\`\`\`
ATURAN KETAT suggestions: Maksimal 5 kata per pertanyaan. Harus relevan dengan topik. Gunakan kata tanya (Apa, Kenapa, Bagaimana, dll). Jangan pertanyaan umum.`;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
Kamu sedang berjalan dalam mode Spark: cepat, ringkas, santai.
- Jawab LANGSUNG, to the point, tanpa basa-basi pembuka seperti "Tentu," atau "Berikut adalah".
- Kalimat pendek dan padat.
- Langsung tembak ke inti jawaban. Gunakan poin-poin/bullet.`;
  }

  return base + `

=== MODE THINK — AKTIF ===
Kamu sedang berjalan dalam mode Think: analisis mendalam, teliti, dan komprehensif.
- Gunakan struktur yang jelas: Heading, poin-poin, tabel, dan garis pembatas (---).
- Bahas dari beberapa sudut pandang secara komprehensif.
- DILARANG KERAS menggunakan basa-basi seperti "Tentu," atau "Baiklah". Langsung berikan analisisnya.`;
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
1. JANGAN PERNAH memberikan block \`\`\`suggestions\`\`\` di akhir pesan!
2. JANGAN memposisikan dirimu sebagai Asisten AI formal Cylen. Kamu adalah peserta grup/teman nongkrong.
3. Jawab singkat, padat, natural, gaul, dan nyambung dengan obrolan terakhir.
4. DILARANG KERAS menggunakan format Tabel atau List panjang.
5. Langsung balas pesannya tanpa mengulang nama pengirim.`;
    
    processedMessages = messages.slice(1);
    effectiveMode = 'spark';
  } else {
    effectiveMode = mode === 'auto' ? detectAutoMode(messages) : mode === 'think' ? 'think' : 'spark';
    finalSystemPrompt = getSystemPrompt(effectiveMode);
    
    const customPrompt = localStorage.getItem('cylen_temp_prompt');
    if (customPrompt && customPrompt.trim() !== '') {
      finalSystemPrompt += `\n\n=== INSTRUKSI KHUSUS & PERSONALISASI DARI USER ===\n${customPrompt.trim()}`;
    }
  }

  const model = effectiveMode === 'think'
    ? "gemini-2.5-flash"
    : "gemini-2.5-flash";

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

    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted')) {
      throw new ConnectionError('limit', 'API Quota Exceeded');
    }
    
    if (
      msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') ||
      msg.includes('failed to fetch') || error?.code === 'NETWORK_ERROR'
    ) {
      throw new ConnectionError('timeout', 'Request timed out or network error');
    }
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
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Generate image error:", e);
  }
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
      contents: {
        parts: [
          { inlineData: { data: imageBuffer, mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: ["TEXT", "IMAGE"] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Edit image error:", e);
  }
  return null;
}
