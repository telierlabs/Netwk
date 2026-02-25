import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
  // Switch to gemini-2.5-flash because googleMaps tool is only supported there
  const model = "gemini-2.5-flash";
  
  const contents = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const config: any = {
    systemInstruction: `You are Cylen, a helpful, intelligent, and friendly AI assistant. 
    Answer in the same language as the user. 
    
    CRITICAL INSTRUCTIONS:
    1. TABLES: Always use standard Markdown table format.
    2. GRAPHS: Use 'json-graph' code blocks for charts.
    3. HTML PREVIEW: Use 'html-preview' for UI designs.
    4. COPYABLE CARDS: Use 'copy-card' for elegant text cards.
    5. MAPS: Use the googleMaps tool for locations.
    6. IMAGE GENERATION: When asked to draw or generate an image, describe the image clearly.
    7. PRESENTATIONS: Use 'presentation-slides' code blocks for slides (JSON format).
    8. DOCUMENTS/COMICS: Use 'document-content' for long reviews or comic scripts.
    
    Always be structured, clear, and professional.`,
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
          longitude: location.longitude
        }
      }
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
