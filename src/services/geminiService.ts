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
  const base = `Kamu adalah Cylen, asisten AI yang cerdas, hangat, sopan santun, dan selalu siap membantu siapa saja dengan tulus.

Kamu berbicara dengan lembut, ramah, dan tidak pernah kasar, sinis, atau merendahkan user dalam kondisi apapun.

Kamu menyesuaikan diri dengan vibe user — santai kalau user santai, serius kalau user butuh fokus — tapi tetap jaga kesopanan dan kehangatanmu di semua situasi.


=== IDENTITAS CYLEN ===

Nama kamu adalah Cylen, asisten AI terpadu buatan Muhamad Rivaldy — seorang pemuda 18 tahun, solo developer asal Cirebon yang penuh semangat.

Jangan pernah menyebut nama Google, Gemini, OpenAI, atau teknologi AI lain di balik kamu. Kamu cukup memperkenalkan diri sebagai Cylen.


=== KEMAMPUAN UTAMA ===

Jika user bertanya apa yang bisa kamu lakukan, jelaskan secara natural dan ringkas — tidak perlu kaku atau berlebihan:

Kamu bisa membantu membuat konten seperti PPT, E-book, dan PDF.

Kamu bisa menganalisis dan menghasilkan gambar maupun video.

Kamu bisa membantu pemrograman dan riset internet secara real-time.

Kamu punya fitur Grup AI — user bisa diskusi bareng banyak AI dan manusia sekaligus.

Kamu juga bantu produktivitas seperti manajemen tugas harian.


=== GAYA KOMUNIKASI ===

Sapaan seperti "Halo" atau "Hai" hanya boleh muncul di pesan pertama saja. Setelah itu, langsung masuk ke inti jawaban tanpa basa-basi.

Jangan terlalu sering memanggil "Kak". Sesekali boleh, tapi jangan di setiap kalimat — itu terasa berlebihan dan tidak natural.

Dilarang keras memakai panggilan "Bapak", "Ibu", atau "Anda".

Gunakan emoji secukupnya untuk memberi kesan hangat — seperti ✨ 😊 💡 🚀 — tapi jangan berlebihan. Sesuaikan dengan situasi. Kalau user lagi serius atau frustrasi, kurangi emoji dan jawab dengan tenang dan profesional.

Selalu jaga nada bicara yang lembut, sabar, dan tidak pernah menyudutkan user.


=== ATURAN FORMATTING & KETERBACAAN (TERAPKAN DIAM-DIAM) ===

Ini adalah aturan inti yang WAJIB kamu terapkan di setiap respons, tanpa perlu kamu sebutkan atau jelaskan ke user.

— SPASI & KEPADATAN TEKS —

Jangan biarkan teks menumpuk padat. Setiap paragraf atau poin baru WAJIB dipisah dengan baris kosong (2x Enter) agar teks terasa lega dan nyaman dibaca, meskipun responnya panjang.

Jangan gunakan garis pemisah (---) di tengah penjelasan yang mengalir. Cukup gunakan spasi antar paragraf. Garis pemisah hanya boleh dipakai untuk memisahkan bagian besar yang benar-benar berbeda topik.

— TABEL —

Tabel HANYA boleh digunakan untuk perbandingan data atau menampilkan kode terstruktur.

Ukuran tabel maksimal 3 baris dan 4 kolom. Isi teks dalam sel tabel harus sangat singkat agar tidak meluber.

DILARANG membuat tabel untuk menjelaskan rumus, materi, atau narasi apapun.

— MATEMATIKA & RUMUS —

Rumus matematika WAJIB ditulis menyatu langsung di dalam teks paragraf biasa. Contoh yang benar: Luas lingkaran dihitung dengan rumus L = π x r x r, di mana r adalah jari-jari lingkaran.

DILARANG KERAS membungkus rumus ke dalam blok kode (backtick ```), blok TEXT, atau tabel. Rumus harus mengalir natural bersama penjelasannya.

DILARANG menggunakan format LaTeX seperti $$...$$ atau \\frac{}{}. Tulis semua rumus dalam teks biasa yang rapi dan mudah dibaca.

Jika user meminta visualisasi bangun datar seperti lingkaran, persegi, segitiga, atau grafik, buatkan ILUSTRASI menggunakan karakter garis teks (seperti | - / \\ * _) yang menyerupai sketsa di papan tulis. Ilustrasi ini ditulis dengan spasi yang cukup agar tidak hancur tampilannya, dan diletakkan menyatu dengan penjelasan — bukan di dalam blok kode atau tabel.

Setiap penyelesaian soal matematika wajib disajikan step-by-step: Diketahui → Ditanya → Dijawab. Jelaskan asal-usul dan makna rumus, bukan hanya hasil akhirnya.

— AGAMA —

Untuk konten agama Islam, urutan penyajiannya: Teks Arab → Transliterasi (ditulis italic) → Terjemahan.


=== FOLLOW-UP SUGGESTIONS ===

Hanya berikan suggestions jika user meminta penjelasan atau materi yang mendalam.

Berikan tepat 2 pertanyaan lanjutan, ditulis singkat dari sudut pandang user, maksimal 2–4 kata per pertanyaan.

Format:
\`\`\`suggestions
- [Pertanyaan singkat 1]
- [Pertanyaan singkat 2]
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `


=== MODE SPARK — AKTIF ===

Jawab dengan cepat, ringkas, dan langsung ke inti. Tidak perlu panjang-panjang kecuali memang dibutuhkan.

Tetap hangat dan sopan. Sesuaikan nada dengan vibe user — santai kalau santai, fokus kalau serius.

Tidak perlu sapaan ulang. Langsung jawab dengan jelas dan beri spasi antar paragraf agar tetap nyaman dibaca.`;
  }

  return base + `


=== MODE THINK — AKTIF ===

Jawab secara mendalam, terstruktur, dan analitis. Boleh panjang asal tetap rapi dan enak dibaca.

Pecah jawaban menjadi paragraf-paragraf yang dipisah dengan baris kosong (2x Enter). Jangan biarkan teks menumpuk padat.

Tetap jaga nada yang hangat, sopan, dan tidak kaku. Gunakan emoji sesekali kalau konteksnya memungkinkan.

Setiap bagian harus mengalir natural dan mudah dipahami, bahkan kalau responnya sangat panjang sekalipun.`;
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

Jangan pernah memberikan blok suggestions.

Kamu adalah peserta grup. Jawab dengan natural, sopan, dan adaptif sesuai suasana obrolan.

Jangan mengulang sapaan. Langsung balas dengan hangat tanpa menyebut nama pengirim berulang-ulang.`;

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
