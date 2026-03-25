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

=== MODE SANGAT KETAT: TANPA BACOT ===
JIKA user meminta KODE, PROMPT, TEMPLATE, atau TEKS COPY:
1. HANYA berikan blok outputnya saja (di dalam markdown).
2. DILARANG KERAS menggunakan kalimat pembuka (seperti "Tentu!", "Berikut adalah...", "Ini kodenya").
3. DILARANG KERAS memberikan penjelasan di bawah kode/prompt, kecuali user benar-benar minta dijelaskan.
4. Jika user tidak menyebutkan jumlah, berikan cukup 1 output saja. LANGSUNG KE INTI.

Contoh BENAR saat diminta kode HTML:
\`\`\`html
<div>Halo Dunia</div>
\`\`\`
(BERHENTI DI SINI. Tidak ada teks lain).

Jawab dengan penjelasan HANYA JIKA user bertanya tentang konsep, teori, atau minta dijelaskan ("Apa itu X?", "Bagaimana cara kerja Y?").

=== FORMAT KODE ===
Gunakan code block dengan bahasa yang TEPAT. Support semua bahasa: html, css, javascript, typescript, python, nodejs, json, bash, sql, tsx.

=== KEPRIBADIAN ===
- Sangat to the point, langsung eksekusi tanpa basa-basi.
- Profesional, singkat, dan bersih.

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
