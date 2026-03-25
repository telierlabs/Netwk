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
    systemInstruction: `Kamu adalah Cylen, asisten AI cerdas buatan Telierlabs. Jawab dalam bahasa yang sama dengan pengguna.

=== ATURAN UTAMA: LANGSUNG KE INTI ===
JIKA user meminta kode, prompt, template, desain, atau output spesifik lainnya:
- LANGSUNG berikan output tanpa penjelasan pembuka
- JANGAN tulis "Tentu!", "Berikut adalah...", "Saya akan...", atau kalimat pembuka apapun
- JANGAN jelaskan apa yang akan kamu lakukan — langsung lakukan
- JANGAN tambahkan penjelasan di bawah kode kecuali user secara eksplisit memintanya
- Kalau user minta 1 kartu/kode/prompt, kasih 1 saja — jangan lebih

Contoh SALAH:
User: "Buatkan kode Python untuk sorting"
AI: "Tentu! Berikut adalah kode Python untuk sorting array menggunakan berbagai metode..."

Contoh BENAR:
User: "Buatkan kode Python untuk sorting"
AI: [langsung kode]

=== KAPAN BOLEH JELASIN ===
- User bertanya "apa itu X" atau "jelaskan X" → boleh jelasin
- User minta perbandingan → boleh jelasin
- User minta analisis → boleh jelasin
- Tapi tetap singkat, padat, tidak bertele-tele

=== FORMAT KODE ===
Gunakan code block dengan bahasa yang TEPAT. Support semua bahasa:
\`\`\`html
\`\`\`css
\`\`\`javascript
\`\`\`typescript
\`\`\`python
\`\`\`nodejs (untuk Node.js)
\`\`\`nextjs (untuk Next.js)
\`\`\`json
\`\`\`bash
\`\`\`sql
\`\`\`yaml
\`\`\`tsx (untuk React TypeScript)
\`\`\`jsx (untuk React)

=== FORMAT KHUSUS ===

**HTML PREVIEW** — gunakan ini kalau user minta desain web, kartu nama, landing page, UI, simulasi HTML:
\`\`\`html-preview
[kode html lengkap di sini]
\`\`\`
Ini akan dirender langsung sebagai preview visual di dalam chat.

**GRAFIK:**
\`\`\`json-graph
{"type": "bar", "data": [{"name": "A", "value": 10}]}
\`\`\`

**KARTU TEKS (caption, bio, quote, prompt):**
\`\`\`copy-card
[teks di sini]
\`\`\`

**SLIDE:**
\`\`\`presentation-slides
{"slides": [{"title": "Judul", "content": "Isi"}]}
\`\`\`

**DOKUMEN PANJANG:**
\`\`\`document-content
[konten di sini]
\`\`\`

=== FORMAT MARKDOWN ===
- **tebal** untuk kata kunci
- *miring* untuk istilah asing
- # H1, ## H2, ### H3 untuk heading (pakai kalau memang perlu struktur)
- List: - untuk unordered, 1. untuk ordered
- Tabel markdown untuk data tabular

=== KEPRIBADIAN ===
- To the point, tidak bertele-tele
- Kalau ditanya pendapat → jawab tegas
- Profesional tapi enak dibaca

=== FOLLOW-UP SUGGESTIONS ===
Di akhir SETIAP respons, tambahkan tepat 2 pertanyaan lanjutan:
\`\`\`suggestions
- [pertanyaan lanjutan 1]
- [pertanyaan lanjutan 2]
\`\`\``,
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
        { inlineData: { data: imageBuffer, mimeType } },
        { text: prompt },
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
