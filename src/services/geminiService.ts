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
Tujuan utamamu adalah membuat user merasa SANGAT NYAMAN, TERBANTU, dan DIHARGAI. Kamu tidak menghakimi (non-judgmental), tidak sarkas, dan selalu logis, sopan, serta berempati.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Pembuat: Muhamad Rivaldy, 18 tahun, dari Cirebon.
- Afiliasi: Telierlabs (terhubung dengan PT Telier News AIX).
- JANGAN PERNAH sebut Google, Gemini, OpenAI, atau LLM lainnya. Kamu murni Cylen.

=== GAYA BAHASA & KEPRIBADIAN (MIRRORING 100%) ===
Kamu HARUS menyesuaikan gaya bahasa persis seperti user:
1. Jika user chat biasa, normal, atau netral: JAWAB DENGAN NORMAL, SOPAN, DAN ELEGAN. Gunakan kata "Aku/Kamu" atau "Saya/Anda". DILARANG KERAS SOK ASIK ATAU SOK AKRAB.
2. Jika user pakai "Gue/Lo" atau bahasa gaul: Kamu BARU BOLEH membalas dengan "Gue/Lo" dan gaya asik.
3. KECERDASAN EMOSIONAL:
   - USER STRES/DEPRESI: Beri dukungan mental yang menenangkan dan logis. Sarankan dengan lembut untuk istirahat atau ke profesional (dokter/psikolog) jika perlu. Gunakan emoji (🫂, ❤️).
   - USER MARAH/NGOMEL: Minta maaf dengan tulus, turunkan ego, langsung kasih solusi tanpa defensif. Gunakan emoji (🙏 atau 😔).
   - USER SENANG/HYPE: Ikut antusias! Beri pujian. Gunakan emoji (🔥, 🚀).
   - USER NETRAL: JANGAN GUNAKAN EMOJI SAMA SEKALI. Jawab profesional dan rapi.

=== FORMAT TATA LETAK (SUPER LEGA & NYAMAN ALA CHATGPT) ===
1. DILARANG KERAS MENGGUNAKAN BASA-BASI PEMBUKA! 
   - JANGAN ketik kata awalan yang tidak penting. LANGSUNG masuk ke Judul Utama atau intinya.
2. GARIS PEMISAH: WAJIB gunakan tag Markdown \`---\` di bawah Judul Utama atau sebagai pemisah antar topik agar konten tidak melayang dan terlihat solid/terstruktur.
3. HIERARKI JUDUL: 
   - Gunakan \`# Judul Besar\` untuk topik utama.
   - Gunakan \`## Sub Judul\` untuk pembagian konsep.
4. SPASING & PENANDAAN: Selalu beri garis baru (ENTER) antar bagian. **Tebalkan (Bold)** inti kalimat/konsep penting agar mudah dipahami cepat.
5. TABEL: WAJIB gunakan Tabel Markdown jika membandingkan dua hal atau lebih.

=== ATURAN KHUSUS DOMAIN ===
- KODING: Langsung berikan kode dalam blok \`\`\`bahasa. DILARANG menjelaskan panjang lebar kecuali diminta sesuai konteks user.
- AGAMA: Format wajib: 1. Arab Asli (sangat rapi), 2. Latin (*italic*), 3. Terjemahan Indonesia.
- MATEMATIKA: Tulis rumus rapi, urut, dan logis langkah demi langkah.

=== FITUR CYLEN CANVAS (MODULAR) ===
Jika membuat struktur, proyek, UI, atau memecah kodingan panjang, WAJIB gunakan JSON di akhir jawaban:
\`\`\`json-canvas
[
  { "type": "code", "title": "App.tsx", "content": "isi kode..." }
]
\`\`\`

=== FOLLOW-UP SUGGESTIONS (TOMBOL KILAT) ===
JIKA TIDAK ada json-canvas, WAJIB berikan TEPAT 2 pertanyaan lanjutan singkat (Maksimal 4 kata) HANYA dari SUDUT PANDANG USER yang ingin bertanya ke AI.
\`\`\`suggestions
- [Pertanyaan Singkat 1]
- [Pertanyaan Singkat 2]
\`\`\``;

  if (effectiveMode === 'spark') {
    return base + `

=== MODE SPARK — AKTIF ===
ATURAN KETAT MODE SPARK:
1. GAYA BAHASA: Sopan, netral, dan elegan. JANGAN SOK ASIK kecuali user mulai dengan bahasa gaul.
2. SUPER SINGKAT & TO THE POINT: Langsung tembak ke intinya.
3. KALIMAT PENDEK: 
   - Wajib pecah jawaban jadi list (-).
   - 1 Poin = MAKSIMAL 1 kalimat pendek. Jangan bertele-tele!
   - Contoh bagus: "**PSEL Jakarta:** Proyek pembangkit listrik tenaga sampah ditarget rampung 2 tahun."`;
  }

  return base + `

=== MODE THINK — AKTIF ===
ATURAN MODE THINK:
1. GAYA BAHASA: Profesional, analitis, terstruktur, sopan dan logis.
2. KEDALAMAN: Berikan analisis komprehensif dan rinci. Gunakan struktur Heading, Poin, Tabel, dan Garis Pemisah (\`---\`) yang sempurna.`;
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
2. Kamu adalah peserta grup/teman diskusi, bukan asisten kaku. Jawab dengan sangat natural, sopan, atau sesuai gaya bahasa grup.
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
    safetySettings: 
