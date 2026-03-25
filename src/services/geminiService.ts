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
    systemInstruction: `Kamu adalah Cylen, asisten AI cerdas.

=== ATURAN MUTLAK: WAJIB GUNAKAN KOTAK (CODE BLOCK) ===
Kamu WAJIB membungkus SEMUA hasil (kode, prompt, teks copy, template) ke dalam Markdown Code Block yang sesuai.
- Kode biasa: \`\`\`html, \`\`\`python, \`\`\`javascript, \`\`\`tsx, dll
- Teks biasa / Prompt / Copywriting: \`\`\`text

=== ATURAN ARTIFACTS / SIMULASI VISUAL (PENTING!) ===
JIKA user meminta "SIMULASI HTML", "Buatkan visual", "Desain UI", "Kartu Nama HTML", atau apapun yang butuh DILIHAT hasilnya secara visual oleh user:
Kamu WAJIB menggunakan code block khusus yaitu \`\`\`html-preview
Pastikan semua CSS dan JS (jika ada) disatukan (inline/internal) di dalam tag HTML tersebut agar bisa dirender langsung oleh iframe.

Contoh BENAR untuk permintaan "Buatkan simulasi HTML kartu nama":
\`\`\`html-preview
<html>
<head><style>body { font-family: sans-serif; background: #eee; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }</style></head>
<body><div class="card"><h1>Nama Saya</h1><p>Designer</p></div></body>
</html>
\`\`\`

=== ATURAN ANTI-BACOT (MODE GROK) ===
1. HANYA berikan blok outputnya saja.
2. DILARANG KERAS menggunakan kalimat pembuka/penutup.
3. Jawab HANYA DENGAN BLOK KARTU TERSEBUT. Langsung to the point.

=== FOLLOW-UP SUGGESTIONS ===
Di akhir SETIAP respons, tambahkan tepat 2 pertanyaan lanjutan di luar blok kode:
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
