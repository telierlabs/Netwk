import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, generateImageWithGemini, editImageWithGemini, ConnectionError } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';
import { fetchRealtimeNews } from '../services/newsService';

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

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'initial',
      title: 'Chat Baru',
      messages: [],
      date: formatTimestamp()
    }
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

    checkAndSetReminder(finalText, activeChatId);

    let injectedContext = '';
    let manualSources: { title: string; url: string; srcType: string }[] = [];
    let manualImage = '';
    
    const isNewsQuery = /berita|news|terkini|terbaru|hari ini/i.test(finalText);
    let isGNewsSuccess = false; 

    if (isNewsQuery) {
      setIsSearching(true);
      try {
        // 🔥 FIX FATAL GUA DI SINI CEO! 🔥
        // Ekstrak topik aslinya. Kalau user ngetik "cariin berita terkini soal Prabowo", kita ambil "Prabowo"-nya aja.
        let searchKeyword = finalText.toLowerCase().replace(/(tolong|cariin|cari|info|berita|news|terkini|terbaru|hari ini|sekarang|dong)/gi, '').trim();
        
        // Kalau user CUMA ngetik "berita hari ini" (kosong), kita kasih keyword default biar GNews gak buta!
        if (searchKeyword === '') {
            searchKeyword = 'indonesia OR nasional OR trending'; 
        }

        const articles = await fetchRealtimeNews(searchKeyword);
        if (articles && articles.length > 0) {
          injectedContext = `\n\n=== DATA BERITA REAL-TIME ===\n` + 
            articles.map((a: any, i: number) => `${i+1}. Judul: ${a.title}\nSumber: ${a.source.name}\nDeskripsi: ${a.description}`).join('\n\n') +
            `\n\nTugasmu: Rangkum berita di atas dengan gaya bahasamu. WAJIB patuhi format yang ada di system prompt. JANGAN SEBUTKAN "Berdasarkan data GNews".`;
          
          manualSources = articles.map((a: any) => {
            let finalUrl = a.url;
            if (finalUrl.includes('news.google.com') || finalUrl.includes('news.yahoo.com')) {
               let cleanDomain = a.source.name.toLowerCase().replace(/[^a-z0-9.]/g, '');
               if (!cleanDomain.includes('.')) cleanDomain += '.com';
               finalUrl = `https://${cleanDomain}`;
            }
            return { title: a.source.name, url: finalUrl, srcType: 'web' };
          });
          
          if (articles[0].image) {
            manualImage = articles[0].image;
          }
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
        chatMode
      );

      let fullText       = '';
      let sources: { title: string; url: string; srcType: string }[] = [...manualSources];
      let generatedImage = manualImage;
      let localWebCount  = manualSources.length;
      let localPostCount = 0;

      if (isNewsQuery && isGNewsSuccess) {
        setWebCount(localWebCount);
      }

      updateChat([...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), suggestions: [] }]);

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
              
              if (url.includes('vertexaisearch') || url.includes('googleusercontent') || url.includes('google.com')) {
                 const titleParts = title.split(/[-|]/);
                 const lastPart = titleParts[titleParts.length - 1].trim().toLowerCase();
                 
                 let cleanDomain = lastPart.replace(/[^a-z0-9.]/g, '');
                 if (!cleanDomain.includes('.')) {
                     cleanDomain += '.com';
                 }
                 url = `https://${cleanDomain}`;
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
              const isPost = /x\.com|twitter\.com/i.test(s.url);
              if (isPost) localPostCount++;
              else localWebCount++;
              changed = true;
            }
          });

          if (changed) {
            setWebCount(localWebCount);
            setPostCount(localPostCount);
          }
        }

        const streamClean = hideJsonCanvasWhileStreaming(fullText);
        const { clean: noSugg, suggestions } = parseSuggestions(streamClean);

        const validSuggestions = Array.isArray(suggestions)
          ? suggestions.filter(s => typeof s === 'string' && s.trim().length > 0)
          : [];

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

      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(fullText);
      const { clean: cleanNoImg, generatePrompt, editPrompt } = parseImageTag(cleanFinal);
      const { clean: finalCleanText, canvasNodes } = parseCanvasTags(cleanNoImg);

      const validFinalSuggestions = Array.isArray(finalSugg)
        ? finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0)
        : [];

      setChatSessions(prev => prev.map(session =>
        session.id === activeChatId
          ? {
              ...session,
              messages: session.messages.map((m, idx) =>
                idx === session.messages.length - 1 ? { ...m, content: finalCleanText, suggestions: validFinalSuggestions } : m
              )
            }
          : session
      ));

      if (canvasNodes && Array.isArray(canvasNodes)) {
        window.dispatchEvent(new CustomEvent('cylen-canvas-update', { detail: canvasNodes }));
      }

      if (generatePrompt) {
        const genImg = await generateImageWithGemini(generatePrompt);
        if (genImg) {
          setChatSessions(prev => prev.map(session =>
            session.id === activeChatId
              ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, image: genImg } : m) }
              : session
          ));
        }
      }

      if (editPrompt && images.length > 0) {
        const [meta, imgData] = images[0].split(',');
        const mimeMatch = meta.match(/data:(.*?);base64/);
        const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const editedImg = await editImageWithGemini(imgData, editPrompt, mimeType);
        if (editedImg) {
          setChatSessions(prev => prev.map(session =>
            session.id === activeChatId
              ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, image: editedImg } : m) }
              : session
          ));
        }
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

    sendMessage(
      lastUserMsg.content, 
      lastUserMsg.image || null, 
      lastUserMsg.images, 
      undefined, 
      undefined, 
      newMessages
    );
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
