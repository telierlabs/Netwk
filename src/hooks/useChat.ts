import { useState } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, generateImageWithGemini, editImageWithGemini, ConnectionError } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';

// Fungsi baru untuk meringkas query pencarian (Hilangkan kata tanya/fluff)
function summarizeSearchQuery(text: string): string {
  if (!text) return 'Data Aktual';
  
  // Regex untuk hapus kata pembuka/tanya
  const clean = text
    .replace(/^(siapa|apa|bagaimana|jelaskan|cari|tolong|carikan|siapakah|apakah|bagaimanakah|kapan|dimana|kenapa|mengapa|how|what|who|why|where|when|please|search for|find|tell me about)\s+/i, '')
    .trim();
  
  // Batasi panjang teks agar tetap rapi di UI
  return clean.length > 30 ? clean.slice(0, 30) + "..." : clean;
}

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

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'initial',
      title: 'Chat Baru',
      messages: [],
      date: formatTimestamp()
    }
  ]);
  const [activeChatId, setActiveChatId]   = useState<string>('initial');
  const [isSending, setIsSending]         = useState(false);
  const [isSearching, setIsSearching]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('auto');

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

  const sendMessage = async (
    inputText: string,
    attachedImage: string | null,
    attachedImages?: string[],
    attachedPdfs?: { data: string; name: string }[],
    directText?: string
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

    const currentMessages = [...messages, userMessage];
    updateChat(currentMessages, finalText);
    setIsSending(true);

    const needsSearch = /^(apa|cari|jelaskan|siapa|bagaimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|berita|news|terbaru|sekarang|harga|cuaca|jadwal|lokasi|tempat|restoran|dimana|near|location|place|restaurant)/i.test(finalText);
    
    // Gunakan fungsi ringkasan di sini
    if (needsSearch) { 
      setIsSearching(true); 
      setSearchQuery(summarizeSearchQuery(finalText)); 
    }

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch { }

    try {
      const chatMessages = currentMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const stream = await chatWithGeminiStream(chatMessages, needsSearch, location, images.length > 0 ? images : undefined, attachedPdfs && attachedPdfs.length > 0 ? attachedPdfs : undefined, chatMode);

      let fullText = '';
      let sources: { title: string; url: string }[] = [];
      let generatedImage = '';

      updateChat([...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), suggestions: [] }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';

        const parts = c.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }

        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const newSources = chunks.map(c => {
            if (c.web)  return { title: c.web.title  || 'Sumber',  url: c.web.uri  || '#' };
            if (c.maps) return { title: c.maps.title || 'Lokasi',  url: c.maps.uri || '#' };
            return null;
          }).filter((s): s is { title: string; url: string } => s !== null && s.url !== '#');
          const existingUrls = new Set(sources.map(s => s.url));
          newSources.forEach(s => { if (!existingUrls.has(s.url)) { sources.push(s); existingUrls.add(s.url); } });
        }

        const { clean: cleanSug, suggestions } = parseSuggestions(fullText);
        const { clean } = parseImageTag(cleanSug);
        const validSuggestions = Array.isArray(suggestions) ? suggestions.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

        setChatSessions(prev => prev.map(session =>
          session.id === activeChatId
            ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, content: clean, sources: sources.length > 0 ? sources : undefined, image: generatedImage || m.image, suggestions: validSuggestions } : m) }
            : session
        ));
      }

      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(fullText);
      const { generatePrompt, editPrompt } = parseImageTag(cleanFinal);
      const validFinalSuggestions = Array.isArray(finalSugg) ? finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

      setChatSessions(prev => prev.map(session =>
        session.id === activeChatId
          ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, suggestions: validFinalSuggestions } : m) }
          : session
      ));

      if (generatePrompt) {
        const genImg = await generateImageWithGemini(generatePrompt);
        if (genImg) {
          setChatSessions(prev => prev.map(session =>
            session.id === activeChatId ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, image: genImg } : m) } : session
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
            session.id === activeChatId ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, image: editedImg } : m) } : session
          ));
        }
      }

    } catch (error) {
      console.error(error);
      let errorType: 'offline' | 'timeout' | 'failed' = 'failed';
      if (error instanceof ConnectionError) errorType = error.type;
      else if (!navigator.onLine) errorType = 'offline';
      updateChat([...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), isConnectionError: true, connectionErrorType: errorType } as any]);
    } finally {
      setIsSending(false);
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;
    const withoutError = messages.slice(0, -1);
    const withoutLast  = withoutError.slice(0, -1);
    setChatSessions(prev => prev.map(session => session.id === activeChatId ? { ...session, messages: withoutLast } : session));
    setTimeout(() => { sendMessage(lastUserMsg.content, lastUserMsg.image || null, lastUserMsg.images); }, 100);
  };

  const createNewChat = (isTemp: boolean = false) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: isTemp ? 'Chat Sementara' : 'Chat Baru',
      messages: [],
      date: formatTimestamp(),
      isTemporary: isTemp
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newId);
    return newId;
  };

  return {
    chatSessions, activeChatId, setActiveChatId, messages,
    isSending, isSearching, searchQuery,
    sendMessage, createNewChat,
    togglePin, pinnedMessages,
    retryLastMessage, chatMode, setChatMode,
  };
}
