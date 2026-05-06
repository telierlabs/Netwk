import { useState } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, ConnectionError } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';
import { fetchRealtimeNews, NewsArticle } from '../services/newsService';

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

function parseImageTag(text: string): { clean: string; generatePrompt?: string; editPrompt?: string } {
  const genMatch  = text.match(/\[GENERATE_IMAGE:\s*(.*?)\]/s);
  const editMatch = text.match(/\[EDIT_IMAGE:\s*(.*?)\]/s);
  const clean = text
    .replace(/\[GENERATE_IMAGE:.*?\]/s, '')
    .replace(/\[EDIT_IMAGE:.*?\]/s, '')
    .trim();
  return {
    clean,
    generatePrompt: genMatch  ? genMatch[1].trim()  : undefined,
    editPrompt:     editMatch ? editMatch[1].trim() : undefined,
  };
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

function parseCanvasTags(text: string): { clean: string; canvasNodes?: any[] } {
  const match = text.match(/```json-canvas\n([\s\S]*?)```/);
  const clean = hideJsonCanvasWhileStreaming(text);
  let canvasNodes = undefined;
  if (match) {
    try { canvasNodes = JSON.parse(match[1]); }
    catch (e) { console.error("Gagal parse json-canvas", e); }
  }
  return { clean, canvasNodes };
}

function extractSearchKeyword(text: string): string {
  let keyword = text
    .replace(/^(tolong|dong|bisa|minta|cariin|kasih|info|update|cari tahu)\s+/gi, '')
    .replace(/\b(apa|ada|berita|news|terkini|terbaru|hari ini|sekarang|tentang|mengenai|soal)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (keyword.length < 3) {
    const words = text.split(/\s+/).filter(w =>
      w.length > 3 && !/^(apa|ada|tolong|dong|bisa|minta|info|berita|news|terkini|terbaru)$/i.test(w)
    );
    keyword = words.slice(0, 3).join(' ');
  }

  if (keyword.length < 3) keyword = 'indonesia terkini';
  return keyword;
}

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: 'initial', title: 'Chat Baru', messages: [], date: formatTimestamp() }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>('initial');
  const [isSending, setIsSending]       = useState(false);
  const [isSearching, setIsSearching]   = useState(false);
  const [webCount, setWebCount]         = useState(0);
  const [postCount, setPostCount]       = useState(0);
  const [chatMode, setChatMode]         = useState<ChatMode>('auto');
  const [isTemporary, setIsTemporary]   = useState(false);

  const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
  const messages      = activeSession.messages;

  const updateChat = (newMessages: Message[], inputText?: string) => {
    setChatSessions(prev => prev.map(session =>
      session.id === activeChatId
        ? {
            ...session,
            messages: newMessages,
            title: (session.messages.length === 1 && inputText)
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
    const images = attachedImages && attachedImages.length > 0
      ? attachedImages
      : (attachedImage ? [attachedImage] : []);

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

    // Simpan activeChatId sekarang — jangan baca closure nanti
    const currentChatId = activeChatId;

    updateChat(currentMessages, finalText);
    setIsSending(true);
    checkAndSetReminder(finalText, currentChatId);

    let injectedContext = '';
    let gnewsSources: { title: string; url: string; srcType: string }[] = [];
    let manualImage = '';
    let isGNewsSuccess = false;

    const isNewsQuery = /berita|news|terkini|terbaru|hari ini/i.test(finalText);

    // ── Step 1: GNews dulu ──
    if (isNewsQuery) {
      setIsSearching(true);
      try {
        const searchKeyword = extractSearchKeyword(finalText);
        console.log(`[GNews] Keyword: "${searchKeyword}"`);

        const articles: NewsArticle[] = await fetchRealtimeNews(searchKeyword);

        if (articles && articles.length > 0) {
          const validArticles = articles.filter(a => {
            try { return new URL(a.url).pathname.length > 5; }
            catch { return false; }
          });

          if (validArticles.length > 0) {
            gnewsSources = validArticles.map(a => ({
              title: a.title,
              url: a.url,
              srcType: 'web'
            }));

            injectedContext = `\n\n=== DATA BERITA REAL-TIME ===\n` +
              validArticles.map((a, i) =>
                `${i+1}. Judul: ${a.title}\nSumber: ${a.source.name}\nURL: ${a.url}\nDeskripsi: ${a.description}`
              ).join('\n\n') +
              `\n\nTugasmu: Rangkum berita di atas dengan gaya futuristik. JANGAN sebut "GNews". Ikuti format system prompt.`;

            if (validArticles[0]?.image) manualImage = validArticles[0].image;
            isGNewsSuccess = true;
            setWebCount(gnewsSources.length);
            console.log(`[GNews] Sukses! ${gnewsSources.length} artikel valid.`);
          }
        }
      } catch (e) {
        console.error("[GNews] Error:", e);
      }
    }

    // ── Step 2: Gemini search hanya kalau GNews gagal ──
    const needsGeminiSearch = !isGNewsSuccess && (
      isNewsQuery ||
      /^(apa|cari|jelaskan|siapa|bagaimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|harga|cuaca|jadwal|lokasi|tempat|restoran|dimana|near|location|place|restaurant)/i.test(finalText)
    );

    if (needsGeminiSearch) {
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
    } catch {}

    try {
      const chatMessages = currentMessages
        .filter(m => m.role !== 'system')
        .map((m, idx, arr) => {
          if (idx === arr.length - 1 && injectedContext) {
            return { role: m.role as 'user' | 'assistant', content: m.content + injectedContext };
          }
          return { role: m.role as 'user' | 'assistant', content: m.content };
        });

      const stream = await chatWithGeminiStream(
        chatMessages,
        needsGeminiSearch,
        location,
        images.length > 0 ? images : undefined,
        attachedPdfs && attachedPdfs.length > 0 ? attachedPdfs : undefined,
        chatMode
      );

      let fullText      = '';
      let generatedImage = manualImage;
      let localWebCount  = gnewsSources.length;
      let localPostCount = 0;

      // ── KUNCI: capture sources sebelum async apapun ──
      const persistentSources: { title: string; url: string; srcType: string }[] = [...gnewsSources];

      console.log('[DEBUG] persistentSources saat init:', persistentSources.length, persistentSources.map(s => s.url));

      // ── Init pesan assistant — setChatSessions langsung biar sources ga ilang ──
      setChatSessions(prev => prev.map(session =>
        session.id === currentChatId
          ? {
              ...session,
              messages: [...currentMessages, {
                role: 'assistant' as const,
                content: '',
                timestamp: formatTimestamp(),
                sources: persistentSources.length > 0 ? [...persistentSources] : undefined,
                suggestions: []
              }]
            }
          : session
      ));

      // ── Stream loop ──
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

        // Grounding chunks — HANYA kalau GNews gagal
        if (!isGNewsSuccess) {
          const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            const existingUrls = new Set(persistentSources.map(s => s.url));
            let changed = false;

            for (const ch of chunks) {
              if (ch.web) {
                let uri = ch.web.uri || '#';
                const title = ch.web.title || 'Referensi';

                if (uri.includes('google.com/url')) {
                  try {
                    const urlObj = new URL(uri);
                    const extracted = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
                    if (extracted) uri = extracted;
                  } catch {}
                }

                if (
                  uri === '#' ||
                  uri.includes('vertexaisearch') ||
                  uri.includes('google.com/search') ||
                  uri.includes('googleapis.com')
                ) continue;

                if (!existingUrls.has(uri)) {
                  const isPost = /x\.com|twitter\.com/i.test(uri);
                  persistentSources.push({ title, url: uri, srcType: isPost ? 'post' : 'web' });
                  existingUrls.add(uri);
                  if (isPost) localPostCount++;
                  else localWebCount++;
                  changed = true;
                }
              } else if (ch.maps) {
                const uri = ch.maps.uri || '#';
                if (uri !== '#' && !persistentSources.find(s => s.url === uri)) {
                  persistentSources.push({ title: ch.maps.title || 'Lokasi', url: uri, srcType: 'maps' });
                  changed = true;
                }
              }
            }

            if (changed) {
              setWebCount(localWebCount);
              setPostCount(localPostCount);
            }
          }
        }

        // Update pesan per chunk
        const streamClean = hideJsonCanvasWhileStreaming(fullText);
        const { clean: noSugg, suggestions } = parseSuggestions(streamClean);
        const validSuggestions = suggestions.filter(s => typeof s === 'string' && s.trim().length > 0);

        setChatSessions(prev => prev.map(session =>
          session.id === currentChatId
            ? {
                ...session,
                messages: session.messages.map((m, idx) =>
                  idx === session.messages.length - 1
                    ? {
                        ...m,
                        content: noSugg,
                        sources: persistentSources.length > 0 ? [...persistentSources] : undefined,
                        image: generatedImage || m.image,
                        suggestions: validSuggestions
                      }
                    : m
                )
              }
            : session
        ));
      }

      // ── Final update setelah stream selesai ──
      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(fullText);
      const { clean: cleanNoImg } = parseImageTag(cleanFinal);
      const { clean: finalCleanText, canvasNodes } = parseCanvasTags(cleanNoImg);
      const validFinalSuggestions = finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0);

      console.log('[DEBUG] persistentSources final:', persistentSources.length, persistentSources.map(s => s.url));

      setChatSessions(prev => prev.map(session =>
        session.id === currentChatId
          ? {
              ...session,
              messages: session.messages.map((m, idx) =>
                idx === session.messages.length - 1
                  ? {
                      ...m,
                      content: finalCleanText,
                      sources: persistentSources.length > 0 ? [...persistentSources] : undefined,
                      image: generatedImage || m.image,
                      suggestions: validFinalSuggestions
                    }
                  : m
              )
            }
          : session
      ));

      if (canvasNodes && Array.isArray(canvasNodes)) {
        window.dispatchEvent(new CustomEvent('cylen-canvas-update', { detail: canvasNodes }));
      }

    } catch (error) {
      console.error(error);
      let errorType: 'offline' | 'timeout' | 'failed' | 'limit' = 'failed';
      if (error instanceof ConnectionError) errorType = error.type;
      else if (!navigator.onLine) errorType = 'offline';

      setChatSessions(prev => prev.map(session =>
        session.id === currentChatId
          ? {
              ...session,
              messages: [...currentMessages, {
                role: 'assistant' as const,
                content: '',
                timestamp: formatTimestamp(),
                isConnectionError: true,
                connectionErrorType: errorType
              } as any]
            }
          : session
      ));
    } finally {
      setIsSending(false);
      setIsSearching(false);
      setWebCount(0);
      setPostCount(0);
    }
  };

  const retryLastMessage = (targetIndex?: number) => {
    const aiIndex = targetIndex !== undefined ? targetIndex : messages.length - 1;
    let userIndex = -1;
    for (let i = aiIndex; i >= 0; i--) {
      if (messages[i].role === 'user') { userIndex = i; break; }
    }
    if (userIndex === -1) return;

    const lastUserMsg = messages[userIndex];
    const newMessages = messages.slice(0, userIndex);

    setChatSessions(prev => prev.map(session =>
      session.id === activeChatId ? { ...session, messages: newMessages } : session
    ));

    sendMessage(lastUserMsg.content, lastUserMsg.image || null, lastUserMsg.images, undefined, undefined, newMessages);
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Chat Baru',
      messages: [],
      date: formatTimestamp(),
      isTemporary: false
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newId);
    setIsTemporary(false);
    return newId;
  };

  const createTempChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Chat Sementara',
      messages: [],
      date: formatTimestamp(),
      isTemporary: true
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newId);
    setIsTemporary(true);
    return newId;
  };

  return {
    chatSessions, activeChatId, setActiveChatId, messages,
    isSending, isSearching,
    webCount, postCount,
    sendMessage, createNewChat, createTempChat,
    togglePin, pinnedMessages,
    retryLastMessage, chatMode, setChatMode, isTemporary
  };
      }
