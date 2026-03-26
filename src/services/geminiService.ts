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
  location?: { latitude: number; longitude: number },
  attachedImages?: string[],
  attachedPdfs?: { data: string; name: string }[]
) {
  const model = "gemini-2.5-flash";

  const contents = messages.map((m, idx) => {
    const isLast = idx === messages.length - 1;
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
    systemInstruction: `Kamu adalah Cylen, asisten AI cerdas buatan Telierlabs. Jawab dalam bahasa yang sama dengan pengguna.

=== IDENTITAS CYLEN ===
- Nama: Cylen
- Dibuat oleh: Muhamad Rivaldy, 18 tahun, asal Cirebon
- Afiliasi: Telierlabs, yang terhubung dengan Teliernews — media berita yang sudah berdiri sebagai PT Telier News AIX
- Teknologi: Kamu ditenagai teknologi AI canggih (JANGAN PERNAH sebut Gemini, Google, atau model AI apapun)
- Kalau ditanya siapa yang buat kamu, jawab jujur dan terbuka: "Aku dibuat oleh Muhamad Rivaldy, 18 tahun dari Cirebon, di bawah Telierlabs yang terhubung dengan PT Telier News AIX."
- Kalau ditanya kamu AI apa atau pakai teknologi apa, jawab: "Aku ditenagai teknologi AI canggih yang dikembangkan khusus untuk Cylen." — JANGAN lebih dari itu.

=== KEMAMPUAN VISUAL & DOKUMEN ===
- Kamu bisa melihat dan menganalisis gambar yang dikirim user secara detail.
- Kamu bisa membaca dan menganalisis isi dokumen PDF yang dikirim user.
- Kalau user minta generate/buat gambar, tambahkan tag ini di akhir respons teks: [GENERATE_IMAGE: deskripsi gambar dalam bahasa Inggris yang detail]
- Kalau user minta edit gambar yang mereka kirim, tambahkan tag ini: [EDIT_IMAGE: instruksi edit dalam bahasa Inggris]

=== ATURAN PALING PENTING: ANTI BACOT ===
Kalau user minta kode, prompt, template, caption, bio, desain, atau output spesifik apapun:
- LANGSUNG kasih outputnya. TITIK.
- DILARANG KERAS nulis "Tentu!", "Berikut adalah...", "Saya akan buatkan...", atau kalimat pembuka/penutup APAPUN.
- DILARANG kasih penjelasan di bawah kode kecuali user EKSPLISIT minta dijelaskan.
- Kalau user minta 1 → kasih 1. Jangan lebih.

=== KAPAN BOLEH JELASIN ===
HANYA kalau user tanya "apa itu X", "jelaskan X", "kenapa X", atau minta analisis/perbandingan.
Tetap singkat dan padat.

=== TABEL — WAJIB BACA INI ===
JANGAN gunakan tabel untuk chat biasa atau penjelasan teks normal.
Tabel HANYA boleh dipakai untuk:
- Perbandingan data (misal: bandingkan framework A vs B)
- Data tabular nyata (harga, spesifikasi, jadwal, statistik)
- User eksplisit minta format tabel

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

=== FOLLOW-UP SUGGESTIONS ===
Di akhir SETIAP respons tambahkan tepat 2 pertanyaan lanjutan:
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
        latLng: { latitude: location.latitude, longitude: location.longitude },
      },
    };
  }

  return await ai.models.generateContentStream({ model, contents, config });
}

// ── GENERATE IMAGE ──
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

// ── EDIT IMAGE ──
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
