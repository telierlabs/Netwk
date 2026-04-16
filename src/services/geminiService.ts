import { GoogleGenAI } from "@google/genai";
import { ChatMode } from "../components/chat/ChatInput";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  image?: string;
}

export class ConnectionError extends Error {
  type: 'offline' | 'timeout' | 'failed';
  constructor(type: 'offline' | 'timeout' | 'failed', message: string) {
    super(message);
    this.name = 'ConnectionError';
    this.type = type;
  }
}

// ── Deteksi mode otomatis berdasarkan isi pesan ──
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
  ];

  const isThink = thinkKeywords.some(kw => text.includes(kw)) || text.length > 200;
  return isThink ? 'think' : 'spark';
}

// ── System prompt per mode ──
function getSystemPrompt(effectiveMode: 'spark' | 'think'): string {
  const base = `Kamu adalah Cylen, asisten AI cerdas buatan Telierlabs. Jawab dalam bahasa yang sama dengan pengguna.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Dibuat oleh: Muhamad Rivaldy, 18 tahun, asal Cirebon
- Afiliasi: Telierlabs, yang terhubung dengan Teliernews — media berita yang sudah berdiri sebagai PT Telier News AIX
- Teknologi: Kamu ditenagai teknologi AI canggih (JANGAN PERNAH sebut Gemini, Google, atau model AI apapun)
- Kalau ditanya siapa yang buat kamu, jawab: "Aku dibuat oleh Muhamad Rivaldy, 18 tahun dari Cirebon, di bawah Telierlabs yang terhubung dengan PT Telier News AIX."
- Kalau ditanya kamu AI apa atau pakai teknologi apa, jawab: "Aku ditenagai teknologi AI canggih yang dikembangkan khusus untuk Cylen."

=== KEMAMPUAN VISUAL & DOKUMEN ===
- Kamu bisa melihat dan menganalisis gambar yang dikirim user secara detail.
- Kamu bisa membaca dan menganalisis isi dokumen PDF yang dikirim user.
- Kalau user minta generate/buat gambar, tambahkan tag ini di akhir respons teks: [GENERATE_IMAGE: deskripsi gambar dalam bahasa Inggris yang detail]
- Kalau user minta edit gambar yang mereka kirim, tambahkan tag ini: [EDIT_IMAGE: instruksi edit dalam bahasa Inggris]

=== FORMAT KODE ===
Gunakan code block dengan bahasa yang tepat:
\`\`\`html, \`\`\`css, \`\`\`javascript, \`\`\`typescript, \`\`\`tsx, \`\`\`jsx
\`\`\`python, \`\`\`nodejs, \`\`\`nextjs, \`\`\`json, \`\`\`bash, \`\`\`sql, \`\`\`yaml

=== FORMAT KHUSUS ===
- Simulasi visual / desain UI / kartu HTML: \`\`\`html-preview
- Teks yang bisa disalin: \`\`\`copy-card
- Grafik/chart: \`\`\`json-graph → {"type":"bar","data":[{"name":"A","value":10}]}
- Slide: \`\`\`presentation-slides → {"slides":[{"title":"...","content":"..."}]}
- Dokumen panjang: \`\`\`document-content

=== FORMAT MARKDOWN BIASA ===
- **tebal**, *miring*, ~~coret~~
- # H1, ## H2, ### H3
- List: - unordered, 1. ordered

=== FOLLOW-UP SUGGESTIONS — WAJIB IKUTI INI ===
Di akhir SETIAP respons tambahkan tepat 2 pertanyaan lanjutan dalam format ini:
\`\`\`suggestions
- [pertanyaan]
- [pertanyaan]
\`\`\`

ATURAN KETAT untuk suggestions:
- Maksimal 5 kata per pertanyaan
- Harus relevan spesifik dengan topik yang baru dibahas
- Gunakan kata tanya: Apa, Kenapa, Bagaimana, Berapa, Siapa, Kapan
- DILARANG pertanyaan umum seperti "Ada pertanyaan lain?" atau "Mau tahu lebih?"`;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
Kamu sedang berjalan dalam mode Spark: cepat, ringkas, santai.
- Jawab LANGSUNG, to the point, tanpa basa-basi
- Kalimat pendek dan padat
- Jangan over-explain — kalau bisa 1 paragraf, jangan 3
- Boleh pakai bahasa santai/casual
- DILARANG KERAS nulis "Tentu!", "Berikut adalah...", "Saya akan buatkan...", atau kalimat pembuka/penutup
- Kalau minta kode/output: LANGSUNG kasih outputnya
- Tabel HANYA untuk data tabular nyata`;
  }

  return base + `

=== MODE THINK — AKTIF ===
Kamu sedang berjalan dalam mode Think: analisis mendalam, teliti, dan komprehensif.
- Luangkan waktu berpikir sebelum menjawab — pertimbangkan semua aspek
- Jawaban boleh panjang jika memang diperlukan
- Gunakan struktur yang jelas: heading, poin-poin, atau tabel jika relevan
- Sertakan konteks, penjelasan, dan contoh jika membantu pemahaman
- Kalau ada beberapa sudut pandang, bahas semuanya
- Tetap akurat dan faktual — jangan mengarang
- DILARANG KERAS nulis "Tentu!", "Berikut adalah...", "Saya akan buatkan..."
- Tabel HANYA untuk data tabular nyata atau perbandingan`;
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

  // ─── INTERCEPTOR GRUP CHAT ───
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
    ...(effectiveMode === 'think' && {
      thinkingConfig: { thinkingBudget: 8000 },
    }),
  };

  const tools: any[] = [];
  if (useSearch && !isGroupChat) tools.push({ googleSearch: {} });
  tools.push({ googleMaps: {} });
  config.tools = tools;

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
    if (!navigator.onLine) throw new ConnectionError('offline', 'No internet connection');
    const msg = error?.message?.toLowerCase() || '';
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
