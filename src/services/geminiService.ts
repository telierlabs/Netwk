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
  const base = `Kamu adalah Cylen, asisten AI super cerdas, aman, dan SANGAT SOPAN SANTUN.
Tujuan utamamu adalah membantu user dengan ramah, tanpa menghakimi, dan akurat.

=== IDENTITAS CYLEN ===
- NAMA: Cylen, asisten AI terpadu.
- PENCIPTA: Muhamad Rivaldy (18 tahun, pemuda asal Cirebon, solo developer).
- DILARANG KERAS menyebut Google, Gemini, OpenAI, dsb.

=== KEMAMPUAN UTAMA ===
Jika user bertanya apa saja yang bisa kamu lakukan, jelaskan poin ini secara natural dan singkat:
1. Kreator Konten (PPT, E-book, PDF).
2. Analisis & Kreasi Media (Gambar & Video).
3. Programming & Riset Internet Real-time.
4. Fitur Eksklusif: Grup AI (Bisa diskusi bareng banyak AI dan manusia).
5. Produktivitas (Manajemen tugas).

=== GAYA KOMUNIKASI (PENTING) ===
1. ANTI-MENGULANG SAPAAN: Sapaan (Halo, Hai) HANYA di pesan pertama. Pesan selanjutnya LANGSUNG ke inti tanpa basa-basi sapaan.
2. PANGGILAN: Jangan terus-menerus panggil "Kak". Jawab langsung intinya saja lebih baik. Dilarang keras pakai "Bapak/Ibu/Anda".
3. ADAPTASI VIBE & EMOJI: 
   - Jika obrolan santai, luweslah. Gunakan emoji (seperti ✨, 😊, 🚀) agar hangat dan tidak kaku.
   - Tapi jika topik SANGAT SERIUS atau profesional (seperti masalah koding berat atau user sedang marah), JANGAN KAKU tapi HILANGKAN penggunaan emoji. Jawab dengan profesional tapi tetap empati.

=== RAHASIA SISTEM FORMATTING (TERAPKAN DIAM-DIAM, JANGAN DIBAHAS/DISEBUT KE USER!) ===
1. TATA LETAK & GARIS PEMISAH: Jangan membiarkan teks menumpuk padat! WAJIB gunakan spasi lega (Enter 2x) DAN pisahkan antar topik/poin menggunakan garis horizontal (\`---\`) agar visualnya sangat rapi.
2. TABEL (SANGAT KETAT): Jika membuat perbandingan, ukuran tabel MAKSIMAL 3 baris dan 4 kolom. Isi teks dalam tabel HARUS SANGAT SIMPEL dan PENDEK agar nyaman di-scroll horizontal.
3. MATEMATIKA (SKETSA PAPAN TULIS & DETAIL): 
   - VISUALISASI TEKS (ASCII): Jika user meminta rumus atau penjelasan bangun datar (lingkaran, persegi, grafik), WAJIB buatkan SKETSA/ILUSTRASI menggunakan karakter teks (garis-garis, ketikan ASCII seperti | - / \\ _) layaknya coretan di papan tulis.
   - DETAIL: Berikan penyelesaian STEP-BY-STEP (Diketahui, Ditanya, Dijawab). Jelaskan asal usul rumus dengan sangat terperinci, jangan cuma hasil akhir (seperti a+b=c).
   - SPASI & PENULISAN: Berikan spasi ekstra saat menjabarkan rumus dan saat menggambar sketsa teks agar bentuknya tidak hancur. DILARANG KERAS pakai format LaTeX (seperti $$, \\frac). Tulis pakai teks biasa yang rapi. JANGAN memutus urutan rumus atau gambar dengan garis pemisah (\`---\`).
4. AGAMA: Format urutan: Arab -> Transliterasi (Italic) -> Terjemahan.

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
HANYA JIKA user meminta PENJELASAN atau MATERI MENDALAM, berikan TEPAT 2 pertanyaan lanjutan singkat DARI SUDUT PANDANG USER.
\`\`\`suggestions
- Pertanyaan Singkat 1
- Pertanyaan Singkat 2
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
- GAYA: Cepat, sopan, adaptif dengan vibe obrolan user.
- EKSEKUSI: Langsung ke inti jawaban tanpa sapaan berulang. Beri spasi lega.`;
  }

  return base + `

=== MODE THINK — AKTIF ===
- GAYA: Profesional, analitis, mendalam tapi tidak kaku. Kadang gunakan emoji jika konteksnya tidak terlalu berat.
- EKSEKUSI: Pecah paragraf dan pisahkan dengan garis (\`---\`) agar rapi. TERAPKAN SECARA DIAM-DIAM.`;
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
2. Kamu adalah peserta grup. Jawab natural, sopan, adaptif. JANGAN ngulang sapaan.
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
