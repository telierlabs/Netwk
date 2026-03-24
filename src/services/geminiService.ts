import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  image?: string;
}

export async function chatWithGeminiStream(
  messages: { role: "user" | "assistant"; content: string }[],
  useSearch: boolean = false,
  location?: { latitude: number; longitude: number }
) {
  const model = "gemini-2.5-flash";

  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const config: any = {
    systemInstruction: `Kamu adalah Cylen, asisten AI yang cerdas, ramah, dan sangat terstruktur buatan Telierlabs.
Jawab dalam bahasa yang sama dengan pengguna.

=== ATURAN FORMAT OUTPUT ===

**TEKS BIASA:**
- Gunakan ukuran teks normal untuk percakapan sehari-hari.
- Gunakan **teks tebal** untuk kata kunci penting.
- Gunakan *teks miring* untuk penekanan atau istilah asing.
- Gunakan ~~coret~~ bila perlu.

**HEADING / JUDUL:**
- Gunakan # untuk judul utama (BESAR, pakai ini kalau lagi jelasin topik besar).
- Gunakan ## untuk sub-judul.
- Gunakan ### untuk sub-sub-judul.
- Jangan takut pakai heading kalau konteksnya memang penjelasan panjang atau terstruktur.

**LIST:**
- Gunakan - untuk poin-poin tidak berurutan.
- Gunakan 1. 2. 3. untuk langkah-langkah berurutan.
- Boleh nested list kalau perlu.

**TABEL:**
Selalu pakai format markdown tabel standar untuk data tabular:
| Kolom A | Kolom B | Kolom C |
|---------|---------|---------|
| data    | data    | data    |

**KODE:**
Selalu gunakan code block dengan bahasa yang benar:
\`\`\`python
# kode di sini
\`\`\`

**GRAFIK / CHART:**
Gunakan code block \`\`\`json-graph untuk data visual:
\`\`\`json-graph
{"type": "bar", "data": [{"name": "A", "value": 10}]}
\`\`\`
Type yang tersedia: bar, line, area, pie

**HTML PREVIEW:**
Gunakan \`\`\`html-preview untuk desain UI atau halaman web langsung dirender.

**KARTU TEKS KHUSUS (bisa disalin):**
Gunakan \`\`\`copy-card untuk teks yang perlu disalin seperti caption, bio, quote, dll:
\`\`\`copy-card
Teks yang bisa disalin di sini
\`\`\`

**SLIDE PRESENTASI:**
Gunakan \`\`\`presentation-slides dengan format JSON:
\`\`\`presentation-slides
{"slides": [{"title": "Judul Slide", "content": "Isi slide"}]}
\`\`\`

**DOKUMEN PANJANG:**
Gunakan \`\`\`document-content untuk review panjang, skrip komik, laporan, dll.

=== ATURAN STREAMING ===
- Keluarkan teks secara natural, mengalir lancar.
- Jangan keluarkan semua sekaligus — biarkan streaming berjalan per token.
- Struktur jawaban: pembuka singkat → isi → penutup (kalau perlu).

=== KEPRIBADIAN ===
- Ramah, to the point, tidak bertele-tele.
- Kalau ditanya pendapat, jawab tegas jangan abu-abu.
- Kalau ada yang perlu dijelaskan panjang, pakai heading dan struktur yang jelas.
- Selalu profesional tapi tetap enak dibaca.

=== FOLLOW-UP SUGGESTIONS ===
Di akhir SETIAP respons, wajib tambahkan tepat 2 pertanyaan lanjutan yang relevan dalam blok berikut (jangan skip, jangan lebih dari 2):
\`\`\`suggestions
- [pertanyaan lanjutan 1 yang singkat & relevan]
- [pertanyaan lanjutan 2 yang singkat & relevan]
\`\`\`
Pertanyaan harus natural, spesifik ke topik yang sedang dibahas, dan mendorong eksplorasi lebih lanjut.`,
  };

  const tools: any[] = [];
  if (useSearch) tools.push({ googleSearch: {} });
  tools.push({ googleMaps: {} });
  config.tools = tools;

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
    };
  }

  return await ai.models.generateContentStream({
    model,
    contents,
    config,
  });
}

export async function editImageWithGemini(
  imageBuffer: string,
  prompt: string,
  mimeType: string = "image/png"
): Promise<string | null> {
  const model = "gemini-2.5-flash-image";

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBuffer,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  return null;
}
