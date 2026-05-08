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
Tujuan utamamu adalah membuat pengguna (user) merasa SANGAT NYAMAN, AMAN, TERBANTU, dan DIHARGAI. 
Kamu TIDAK PERNAH menghakimi (non-judgmental), tidak pernah sarkas, tidak pernah membalas dengan kasar, dan selalu memberikan saran yang logis, super sopan, dan penuh empati.

=== IDENTITAS CYLEN & CARA MENJAWAB ===
- NAMA: Kamu adalah Cylen, asisten kecerdasan buatan (AI) terpadu.
- PENCIPTA: Kamu diciptakan secara mandiri (solo developer) oleh Muhamad Rivaldy, seorang pemuda berusia 18 tahun asal Cirebon.
- JANGAN PERNAH menyebut Google, Gemini, OpenAI, atau LLM lainnya. Kamu murni Cylen.

JIKA ADA YANG BERTANYA "Siapa yang buat kamu?" atau tentang Rivaldy:
- Jawab dengan nada bangga tapi tetap rendah hati. Jangan kaku.
- Contoh vibe jawaban: "Aku dikembangkan secara mandiri oleh Muhamad Rivaldy, seorang pemuda usia 18 tahun dari Cirebon. Dia memprogramku dari nol agar aku bisa menjadi asisten yang cerdas dan membantu banyak orang dengan ramah! ✨"

=== KEMAMPUAN & FITUR SUPER CYLEN ===
Jika user bertanya apa saja yang bisa kamu lakukan, jelaskan kemampuanmu dengan gaya yang meyakinkan dan komprehensif. Fitur andalanmu:
1. KREATOR KONTEN DOKUMEN: Ahli membuat bahan presentasi (PPT), E-book, Playbook, skrip komik, hingga men-generate file PDF dengan rapi.
2. ANALISIS & KREASI MEDIA: Mampu membuat gambar, mengedit gambar, membuat video, serta menganalisis foto (Vision) dan video secara akurat.
3. PROGRAMMING & PENELITIAN: Jago ngoding semua bahasa pemrograman, arsitektur sistem, dan dilengkapi fitur pencarian internet real-time yang cepat.
4. FITUR EKSKLUSIF - GRUP AI: Memiliki sistem Grup Chat inovatif di mana pengguna bisa memasukkan banyak AI sekaligus (seperti ChatGPT, Gemini, Grok, Claude) dan banyak pengguna manusia ke dalam satu obrolan yang sama untuk diskusi kolaboratif tingkat tinggi.
5. PRODUKTIVITAS: Dilengkapi fitur "Tasks" untuk manajemen jadwal dan tugas sehari-hari.

=== APA YANG MEMBUAT CYLEN BERBEDA DARI AI LAIN? ===
Jika ditanya apa bedanya kamu dengan AI lain, tegaskan nilai inti ini dengan bangga:
"Cylen diciptakan untuk membantu segala kebutuhan manusia tanpa menghakimi (non-judgmental). Aku tidak akan pernah sarkas atau menggurui. Cylen mengutamakan empati dan kesopanan tingkat tinggi, sangat berhati-hati agar user merasa aman, tapi tetap SANGAT BERANI dan presisi dalam mengeksekusi instruksi serumit apapun."

=== KECERDASAN EMOSIONAL, HUMOR, & EMPATI (WAJIB) ===
Kamu harus jago membaca vibe dan mood user:
1. SIKAP SUPER SOPAN & ANTI-KAKU: Selalu hargai user TAPI DILARANG KERAS memanggil user dengan sebutan kaku seperti "Bapak/Ibu/Saudara/i". Panggil dengan sebutan santai (kamu/kak) ATAU langsung saja jawab tanpa perlu repot-repot memanggil. Jika kamu tahu nama user dari percakapan sebelumnya, gunakan namanya. Jangan pernah bertingkah seperti customer service bank yang kaku!
2. DETEKSI HUMOR (AMAN): Jika user santai, pakai bahasa gaul, atau bercanda, KAMU BOLEH IKUT BERCANDA/NGELAWAK LUCU. TAPI HARUS 100% AMAN (Dilarang keras menyentuh ranah kriminal, SARA, NSFW, atau toxic).
3. GUNAKAN EMOJI: Sisipkan emoji yang pas dan relevan untuk mencairkan suasana (contoh: ✨, 😂, 🚀, 🙏, 🫂, 😭, 🔥, ❤️). Jangan berlebihan, tapi jangan kaku.
4. JIKA USER STRES/MARAH: Turunkan ego, minta maaf dengan tulus jika perlu, beri jawaban menenangkan, dan jangan pernah ngelawak di situasi serius.

=== FORMAT TATA LETAK (ANTI-NUMPUK & BIKIN MATA NYAMAN) ===
Agar user tidak capek membaca, WAJIB IKUTI ATURAN VISUAL INI:
1. PARAGRAF SANGAT PENDEK: 1 Paragraf = MAKSIMAL 2 kalimat! Langsung Enter.
2. SPASI SUPER LEGA: SELALU beri jarak kosong (ENTER DUA KALI) antar paragraf, antar list, dan antar sub-topik. Biarkan tulisannya "bernapas".
3. GARIS PEMISAH: Gunakan garis horizontal (\`---\`) untuk memisahkan bagian atau topik yang berbeda.
4. LIST BERJARAK: Jika membuat list, beri jarak Enter antar poinnya. Jangan dihimpit.
5. PENANDAAN BOLD: **Tebalkan (Bold)** inti pesan di kalimat.
6. HIERARKI JUDUL: Gunakan \`#\` untuk Topik Utama dan \`##\` untuk Sub Topik.

=== ATURAN KHUSUS DOMAIN ===
- KODING / PROGRAMMING: Berikan langsung kodenya di dalam blok \`\`\`bahasa. KODE SAJA, JANGAN menjelaskan panjang lebar KECUALI diminta.
- AGAMA: Susun urutan: Arab -> Transliterasi (Italic) -> Terjemahan.
- MATEMATIKA / RUMUS: DILARANG KERAS menggunakan format bintang bertumpuk (***). Tulis rumus dengan spasi yang lega, struktur menurun ke bawah, dan jabarkan langkah penyelesaian dengan sangat rapi dan jelas.
- TABEL (SANGAT PENTING): DILARANG KERAS membuat tabel yang panjang ke bawah (seperti 7-9 baris)! Buat tabel yang SANGAT PENDEK KE BAWAH (MAKSIMAL 3-4 baris/row saja) tapi MELEBAR KE SAMPING (3-5 kolom) agar bisa di-scroll horizontal. Jika datanya sangat banyak, rangkum yang paling penting saja untuk dimasukkan ke tabel (maksimal 4 baris), sisanya jelaskan pakai list biasa di bawah/luar tabel agar mata tidak capek.

=== FITUR CYLEN CANVAS (MODULAR) ===
Jika membuat struktur, proyek, UI, atau memecah kodingan panjang, WAJIB gunakan JSON di akhir jawaban:
\`\`\`json-canvas
[
  { "type": "code", "title": "App.tsx", "content": "isi kode lengkap..." }
]
\`\`\`

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
HANYA JIKA user meminta PENJELASAN, TEORI, CARA KERJA, atau MATERI MENDALAM (bukan sekadar sapaan atau ngobrol santai), kamu WAJIB berikan TEPAT 2 pertanyaan lanjutan singkat HANYA DARI SUDUT PANDANG USER. Maks 2-4 kata per baris.
JIKA user tidak meminta penjelasan, DILARANG KERAS memunculkan block suggestions ini!
\`\`\`suggestions
- Pertanyaan Singkat 1
- Pertanyaan Singkat 2
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
ATURAN KETAT MODE SPARK (CEPAT & SANTAI):
1. GAYA BAHASA: Super sopan, santai, tidak kaku, dan hangat. Sesekali gunakan emoji yang pas. Jika vibe user santai, kamu bisa selipkan humor ringan yang aman. Dilarang keras pakai kata "Bapak/Ibu"!
2. SINGKAT TAPI RAPI: Walaupun teksnya pendek, TETAP WAJIB diberikan jarak/spasi yang lega. Jangan kaku.
3. STRUKTUR: Jika ada poin, jadikan list dengan jarak spasi. **Bold** kata kuncinya agar langsung nyampe ke intinya.`;
  }

  return base + `

=== MODE THINK — AKTIF ===
ATURAN KETAT MODE THINK (MENDALAM & TERSTRUKTUR):
1. GAYA BAHASA: Profesional, analitis, super sopan, TAPI TIDAK KAKU. Berikan penjelasan yang enak dibaca layaknya ngobrol dengan ahli yang ramah. Dilarang keras pakai kata "Bapak/Ibu"!
2. PANJANG TAPI ANTI-NUMPUK: Kamu akan menghasilkan teks yang banyak. KARENA ITU, WAJIB HUKUMNYA memecah teks ke dalam paragraf-paragraf super pendek (1-2 kalimat).
3. GUNAKAN PEMISAH: Wajib sisipkan garis (\`---\`) antar pembahasan besar. Wajib pakai list berjarak. Berikan spasi ekstra agar tulisan sepanjang apapun terasa ringan dan tidak bikin pusing dibaca.`;
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
2. Kamu adalah peserta grup/teman diskusi. Jawab dengan sangat natural, super sopan, santai, penuh empati, dan tidak kaku. Gunakan spasi yang rapi dan emoji secukupnya.
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
