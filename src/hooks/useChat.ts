import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, generateImageWithGemini, editImageWithGemini, ConnectionError, extractMemoryFromChat } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';
import { fetchRealtimeNews } from '../services/newsService';
import { trackMessageSent } from '../pages/UsagePage';
import { jsPDF } from 'jspdf'; // <-- IMPORT BARU BUAT BIKIN PDF

function parseSuggestions(text: string): { clean: string; suggestions: string[] } {
  const match = text.match(/```suggestions\n([\s\S]*?)```/);
  if (!match) return { clean: text, suggestions: [] };
  const suggestions = match[1]
    .split('\n')
    .map(s => s.replace(/^[-*]\s*/, '').trim())
    .filter(s => s.length > 0)
    .slice(0, 2);
  const clean = text.replace(/```suggestions\n[\s\S]*?```/, '').trimEnd();
  return { clean, suggestions };
}

function hideJsonCanvasWhileStreaming(text: string): string {
  const idx = text.indexOf('```json-canvas');
  if (idx !== -1) return text.substring(0, idx).trim();
  if (text.endsWith('```') || text.endsWith('```json') || text.endsWith('```json-') || text.endsWith('```json-canva')) {
    const lastIdx = text.lastIndexOf('```');
    if (lastIdx !== -1) return text.substring(0, lastIdx).trim();
  }
  return text;
}

// ── FUNGSI BARU: Sembunyikan tag rahasia saat AI lagi ngetik (streaming) ──
function hideTagsWhileStreaming(text: string): string {
  let t = hideJsonCanvasWhileStreaming(text);
  t = t.replace(/\[GENERATE_IMAGE:[\s\S]*?(\]|$)/g, '');
  t = t.replace(/\[GENERATE_PDF:[\s\S]*?(\[\/GENERATE_PDF\]|$)/g, '');
  return t.trim();
}

function parseCanvasTags(text: string): { clean: string; canvasNodes?: any[] } {
  const match = text.match(/```json-canvas\n([\s\S]*?)```/);
  let clean = hideJsonCanvasWhileStreaming(text);
  let canvasNodes = undefined;
  if (match) {
    try {
      canvasNodes = JSON.parse(match[1]);
    } catch (e) {
      console.error("Gagal parse json-canvas", e);
    }
  }
  return { clean, canvasNodes };
}

function loadMemoryItems(): { id: string; text: string; timestamp: string; rawDate: number }[] {
  try {
    const saved = localStorage.getItem('cylen_memory_items');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Gagal load memory:", e);
  }
  return [];
}

function saveMemoryItems(items: { id: string; text: string; timestamp: string; rawDate: number }[]) {
  try {
    localStorage.setItem('cylen_memory_items', JSON.stringify(items));
  } catch (e) {
    console.error("Gagal save memory:", e);
  }
}

function formatMemoryTimestamp(): string {
  const now = new Date();
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function buildMemoryContext(): string {
  const items = loadMemoryItems();
  if (items.length === 0) return '';
  return items.map(item => `- ${item.text}`).join('\n');
}

async function autoSaveMemory(messages: { role: string; content: string }[]): Promise<void> {
  try {
    const existing = loadMemoryItems();
    const existingTexts = existing.map(i => i.text);
    const newFacts = await extractMemoryFromChat(messages, existingTexts);

    if (newFacts.length === 0) return;

    const timestamp = formatMemoryTimestamp();
    const newItems = newFacts.map(text => ({
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      timestamp,
      rawDate: Date.now(),
    }));

    const updated = [...newItems, ...existing];
    saveMemoryItems(updated);
    console.log(`[Memory] ✅ ${newFacts.length} fakta baru disimpan diam-diam.`);
  } catch (e) {
    console.error("[Memory] Gagal auto-save memory:", e);
  }
}

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'initial',
      title: 'Chat Baru',
      messages: [],
      date: formatTimestamp(),
      isTemporary: false
    }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>('initial');
  const [isSending, setIsSending]       = useState(false);
  const [isSearching, setIsSearching]   = useState(false);
  const [webCount, setWebCount]         = useState(0);
  const [postCount, setPostCount]       = useState(0);
  const [chatMode, setChatMode]         = useState<ChatMode>('auto');
  
  // ── STATE BARU BUAT STATUS ANIMASI GENERATE GAMBAR/PDF ──
  const [activityStatus, setActivityStatus] = useState<'idle' | 'image' | 'pdf'>('idle');

  const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
  const messages      = activeSession.messages;
  const isTemporary   = activeSession.isTemporary || false;

  const updateChat = (newMessages: Message[], inputText?: string) => {
    setChatSessions(prev => prev.map(session =>
      session.id === activeChatId
        ? {
            ...session,
            messages: newMessages,
            title: (session.messages.length === 1 && inputText && !session.isTemporary)
              ? inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '')
              : session.title
          }
        : session
    ));
  };

  const togglePin = (msgIndex: number) => {
    setChatSessions(prev => prev.map(session =>
      session.id === activeChatId
        ? { ...session, messages: session.messages.map((m, i) => i === msgIndex ? { ...m, pinned: !m.pinned } : m) }
        : session
    ));
  };

  const pinnedMessages = messages.filter(m => m.pinned);

  const checkAndSetReminder = (text: string, currentChatId: string) => {
    if (/ingetin|ingatkan|nanti jam|ingat|inget/i.test(text)) {
      setTimeout(() => {
        setChatSessions(prev => prev.map(session => {
          if (session.id === currentChatId) {
            const reminderMsg: Message = {
              role: 'assistant',
              content: `Halo CEO! Sistem mendeteksi rencana Anda sebelumnya. Apakah agenda ini sudah selesai?`,
              timestamp: formatTimestamp(),
              isAutoReminder: true,
              quotedText: text
            };
            return { ...session, messages: [...session.messages, reminderMsg] };
          }
          return session;
        }));
      }, 10000); 
    }
  };

  const sendMessage = async (
    inputText: string,
    attachedImage: string | null,
    attachedImages?: string[],
    attachedPdfs?: { data: string; name: string }[],
    directText?: string,
    baseMessages?: Message[]
  ) => {
    const finalText = directText !== undefined ? directText : inputText;
    const images = attachedImages && attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);

    if ((!finalText.trim() && images.length === 0 && (!attachedPdfs || attachedPdfs.length === 0)) || isSending) return;

    const userMessage: Message = {
      role: 'user',
      content: finalText,
      timestamp: formatTimestamp(),
      image: images[0] || undefined,
      images: images.length > 0 ? images : undefined,
    };

    const targetMessages = baseMessages || messages;
    const currentMessages = [...targetMessages, userMessage];
    
    updateChat(currentMessages, finalText);
    setIsSending(true);
    setActivityStatus('idle'); // Reset animasi

    trackMessageSent();
    checkAndSetReminder(finalText, activeChatId);

    let injectedContext = '';
    
    // ── INSTRUKSI RAHASIA KE AI BUAT FITUR GAMBAR & PDF ──
    const specialFeaturesInstruction = `\n\n[INSTRUKSI SISTEM WAJIB]:
Jika user meminta buatkan gambar, WAJIB tuliskan perintah ini persis di akhir jawabanmu:
[GENERATE_IMAGE: <tulis prompt gambar dalam bahasa inggris yang super detail dan visual>]

Jika user meminta dibuatkan file PDF (surat, rangkuman, laporan, dll), WAJIB bungkus isinya dengan format ini:
[GENERATE_PDF: Judul Dokumen.pdf]
Tulis seluruh isi dokumen selengkap mungkin di sini...
[/GENERATE_PDF]`;

    injectedContext += specialFeaturesInstruction;

    let manualSources: { title: string; url: string; srcType: string }[] = [];
    let manualImage = '';
    
    const isNewsQuery = /berita|news|terkini|terbaru|hari ini/i.test(finalText);
    let isGNewsSuccess = false; 

    if (isNewsQuery) {
      setIsSearching(true);
      try {
        let searchKeyword = finalText.toLowerCase().replace(/(apa|ada|tolong|cariin|cari|info|berita|news|terkini|terbaru|hari ini|sekarang|dong)/gi, '').trim();
        if (searchKeyword === '') searchKeyword = 'indonesia OR nasional OR trending'; 

        const articles = await fetchRealtimeNews(searchKeyword);
        if (articles && articles.length > 0) {
          injectedContext += `\n\n=== DATA BERITA REAL-TIME ===\n` + 
            articles.map((a: any, i: number) => `${i+1}. Judul: ${a.title}\nSumber: ${a.source.name}\nDeskripsi: ${a.description}`).join('\n\n') +
            `\n\nTugasmu: Rangkum berita di atas. JANGAN SEBUTKAN "Berdasarkan data GNews".`;
          
          manualSources = articles.map((a: any) => ({ title: a.title, url: a.url, srcType: 'web' }));
          if (articles[0].image) manualImage = articles[0].image;
          isGNewsSuccess = true; 
        }
      } catch (e) { 
        console.error("Gagal narik GNews", e); 
      }
    }

    const needsSearch = (!isGNewsSuccess && isNewsQuery) || /^(apa|cari|jelaskan|siapa|bagaimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|harga|cuaca|jadwal|lokasi|tempat|restoran|dimana|near|location|place|restaurant)/i.test(finalText);

    if (needsSearch && !isSearching) {
      setIsSearching(true);
      setWebCount(0);
      setPostCount(0);
    }

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch { }

    const memoryContext = buildMemoryContext();

    try {
      const chatMessages = currentMessages
        .filter(m => m.role !== 'system')
        .map((m, idx, arr) => {
           if (idx === arr.length - 1 && injectedContext) {
               return { role: m.role as 'user'|'assistant', content: m.content + injectedContext };
           }
           return { role: m.role as 'user' | 'assistant', content: m.content };
        });

      const stream = await chatWithGeminiStream(
        chatMessages, needsSearch, location,
        images.length > 0 ? images : undefined,
        attachedPdfs && attachedPdfs.length > 0 ? attachedPdfs : undefined,
        chatMode,
        memoryContext
      );

      let fullText       = '';
      let sources: { title: string; url: string; srcType: string }[] = [...manualSources];
      let generatedImage = manualImage;
      let localWebCount  = manualSources.length;
      let localPostCount = 0;

      if (isNewsQuery && isGNewsSuccess) setWebCount(localWebCount);

      updateChat([...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), suggestions: [] }]);

      // ── BACA STREAMING (Hiding tag PDF/Image biar nggak bocor ke layar user) ──
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';

        const parts = c.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && !generatedImage) {
              generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }

        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const newSources = chunks.map(ch => {
            if (ch.web) {
              let title = ch.web.title || 'Referensi';
              let url = ch.web.uri || '#'; 
              if (url.includes('vertexaisearch') || url.includes('googleusercontent')) {
                 url = `https://www.google.com/search?q=${encodeURIComponent(title.split(/[-|]/)[0].trim())}`;
              }
              return { title, url, srcType: 'web' };
            }
            if (ch.maps) return { title: ch.maps.title || 'Lokasi', url: ch.maps.uri || '#', srcType: 'maps' };
            return null;
          }).filter((s): s is { title: string; url: string; srcType: string } => s !== null && s.url !== '#');

          const existingUrls = new Set(sources.map(s => s.url));
          let changed = false;
          newSources.forEach(s => {
            if (!existingUrls.has(s.url)) {
              sources.push(s);
              existingUrls.add(s.url);
              if (/x\.com|twitter\.com/i.test(s.url)) localPostCount++;
              else localWebCount++;
              changed = true;
            }
          });

          if (changed) {
            setWebCount(localWebCount);
            setPostCount(localPostCount);
          }
        }

        const streamClean = hideTagsWhileStreaming(fullText);
        const { clean: noSugg, suggestions } = parseSuggestions(streamClean);
        const validSuggestions = Array.isArray(suggestions) ? suggestions.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

        setChatSessions(prev => prev.map(session =>
          session.id === activeChatId
            ? {
                ...session,
                messages: session.messages.map((m, idx) =>
                  idx === session.messages.length - 1
                    ? { ...m, content: noSugg, sources: sources.length > 0 ? sources : undefined, image: generatedImage || m.image, suggestions: validSuggestions }
                    : m
                )
              }
            : session
        ));
      }

      // ── SETELAH STREAMING SELESAI: EKSEKUSI PEMBUATAN PDF & GAMBAR ──
      let finalRawText = fullText;
      let generatedPdfInfo: { name: string, dataUrl: string } | null = null;
      let finalGeneratedImage = generatedImage;

      // 1. Cek & Bikin Gambar
      const imgMatch = finalRawText.match(/\[GENERATE_IMAGE:\s*(.*?)\]/s);
      if (imgMatch) {
        finalRawText = finalRawText.replace(imgMatch[0], ''); // Hapus tag
        setActivityStatus('image'); // Trigger animasi UI
        
        const imgData = await generateImageWithGemini(imgMatch[1]);
        if (imgData) finalGeneratedImage = imgData;
      }

      // 2. Cek & Bikin PDF (pakai jsPDF di latar belakang)
      const pdfMatch = finalRawText.match(/\[GENERATE_PDF:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_PDF\]|$)/s);
      if (pdfMatch) {
        finalRawText = finalRawText.replace(pdfMatch[0], ''); // Hapus tag
        setActivityStatus('pdf'); // Trigger animasi UI
        
        try {
          // Kasih delay 1.5 detik biar user bisa nikmatin UI animasi "Sedang menyusun PDF..."
          await new Promise(r => setTimeout(r, 1500));
          
          const title = pdfMatch[1].trim();
          const content = pdfMatch[2].trim();
          const doc = new jsPDF();
          
          // Styling PDF Sederhana
          doc.setFontSize(16);
          doc.text(title, 20, 20);
          doc.setFontSize(12);
          const lines = doc.splitTextToSize(content, 170);
          doc.text(lines, 20, 30);
          
          const pdfBase64 = doc.output('datauristring');
          generatedPdfInfo = { name: title.endsWith('.pdf') ? title : title + '.pdf', dataUrl: pdfBase64 };
        } catch (e) {
          console.error("Gagal bikin PDF:", e);
        }
      }

      // Wrap up final text
      let streamCleanFinal = hideTagsWhileStreaming(finalRawText);
      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(streamCleanFinal);
      let { clean: finalCleanText, canvasNodes } = parseCanvasTags(cleanFinal);

      // Kalau ada PDF, tempelkan syntax khusus biar dibaca sama ChatBubble.tsx
      if (generatedPdfInfo) {
        finalCleanText = `[PDF Terlampir: "${generatedPdfInfo.name}"](${generatedPdfInfo.dataUrl})\n\n` + finalCleanText;
      }

      const validFinalSuggestions = Array.isArray(finalSugg) ? finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

      setChatSessions(prev => prev.map(session =>
        session.id === activeChatId
          ? {
              ...session,
              messages: session.messages.map((m, idx) =>
                idx === session.messages.length - 1 ? { ...m, content: finalCleanText, suggestions: validFinalSuggestions, image: finalGeneratedImage } : m
              )
            }
          : session
      ));

      if (canvasNodes && Array.isArray(canvasNodes)) {
        window.dispatchEvent(new CustomEvent('cylen-canvas-update', { detail: canvasNodes }));
      }

      if (!isTemporary) {
        const finalMessages = [
          ...currentMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'assistant' as const, content: finalCleanText }
        ];
        autoSaveMemory(finalMessages).catch(() => {});
      }

    } catch (error) {
      console.error(error);
      let errorType: 'offline' | 'timeout' | 'failed' | 'limit' = 'failed';
      if (error instanceof ConnectionError) errorType = error.type;
      else if (!navigator.onLine) errorType = 'offline';
      
      updateChat([...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), isConnectionError: true, connectionErrorType: errorType } as any]);
    } finally {
      setIsSending(false);
      setIsSearching(false);
      setActivityStatus('idle'); // Balik normal
      setWebCount(0);
      setPostCount(0);
    }
  };

  const retryLastMessage = (targetIndex?: number) => {
    const aiIndex = targetIndex !== undefined ? targetIndex : messages.length - 1;
    let userIndex = -1;
    for (let i = aiIndex; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userIndex = i;
        break;
      }
    }
    if (userIndex === -1) return;

    const lastUserMsg = messages[userIndex];
    const newMessages = messages.slice(0, userIndex);

    setChatSessions(prev => prev.map(session =>
      session.id === activeChatId ? { ...session, messages: newMessages } : session
    ));

    sendMessage(lastUserMsg.content, lastUserMsg.image || null, lastUserMsg.images, undefined, undefined, newMessages);
  };

  const createNewChat = (isGhostMode: boolean = false) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: isGhostMode ? 'Private Chat' : 'Chat Baru',
      messages: [],
      date: formatTimestamp(),
      isTemporary: isGhostMode
    };
    
    setChatSessions(prev => {
        const filtered = prev.filter(s => !s.isTemporary);
        return [newSession, ...filtered];
    });
    
    setActiveChatId(newId);
    return newId;
  };

  const renameChatSession = (id: string, newTitle: string) => {
    setChatSessions(prev => prev.map(session => session.id === id ? { ...session, title: newTitle } : session));
  };

  const pinChatSession = (id: string) => {
    setChatSessions(prev => prev.map(session => session.id === id ? { ...session, isPinned: !(session as any).isPinned } : session));
  };

  const deleteChatSession = (id: string) => {
    setChatSessions(prev => {
      const filtered = prev.filter(session => session.id !== id);
      if (filtered.length === 0) {
        const newId = Date.now().toString();
        setActiveChatId(newId);
        return [{ id: newId, title: 'Chat Baru', messages: [], date: formatTimestamp(), isTemporary: false }];
      }
      if (id === activeChatId) setActiveChatId(filtered[0].id);
      return filtered;
    });
  };

  return {
    chatSessions, activeChatId, setActiveChatId, messages,
    isSending, isSearching, webCount, postCount,
    activityStatus, // <-- DITAMBAHKAN BIAR UI BISA BACA STATUS
    sendMessage, createNewChat,
    togglePin, pinnedMessages,
    retryLastMessage, chatMode, setChatMode, isTemporary,
    renameChatSession, pinChatSession, deleteChatSession
  };
}
