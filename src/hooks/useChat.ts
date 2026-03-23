import { useState } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, editImageWithGemini } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'initial',
      title: 'Chat Baru',
      messages: [
        {
          role: 'assistant' as const,
          content: 'Halo, saya Cylen AI. Ada yang bisa saya bantu hari ini?',
          timestamp: formatTimestamp(),
        }
      ],
      date: formatTimestamp()
    }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>('initial');
  const [isSending, setIsSending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
  const messages = activeSession.messages;

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

  const sendMessage = async (inputText: string, attachedImage: string | null, attachedImages?: string[]) => {
    const images = attachedImages && attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);
    if ((!inputText.trim() && images.length === 0) || isSending) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText,
      timestamp: formatTimestamp(),
      image: images[0] || undefined,
      images: images.length > 0 ? images : undefined,
    };

    const currentMessages = [...messages, userMessage];
    updateChat(currentMessages, inputText);

    setIsSending(true);
    const needsSearch = /^(apa|cari|jelaskan|siapa|bagaimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|berita|news|terbaru|sekarang|harga|cuaca|jadwal|lokasi|tempat|restoran|dimana|near|location|place|restaurant)/i.test(inputText);
    if (needsSearch) setIsSearching(true);

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (e) {
      console.warn("Geolocation failed", e);
    }

    try {
      const chatMessages = currentMessages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const stream = await chatWithGeminiStream(chatMessages, needsSearch, location);

      let fullText = "";
      let sources: { title: string; url: string }[] = [];
      let generatedImage = "";

      const initialAssistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: formatTimestamp(),
      };

      updateChat([...currentMessages, initialAssistantMessage]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || "";

        const parts = c.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
          }
        }

        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const newSources = chunks.map(c => {
            if (c.web) return { title: c.web.title || 'Sumber', url: c.web.uri || '#' };
            if (c.maps) return { title: c.maps.title || 'Lokasi', url: c.maps.uri || '#' };
            return null;
          }).filter((s): s is { title: string; url: string } => s !== null && s.url !== '#');
          const existingUrls = new Set(sources.map(s => s.url));
          newSources.forEach(s => { if (!existingUrls.has(s.url)) { sources.push(s); existingUrls.add(s.url); } });
        }

        setChatSessions(prev => prev.map(session =>
          session.id === activeChatId
            ? {
                ...session,
                messages: session.messages.map((m, idx) =>
                  idx === session.messages.length - 1
                    ? { ...m, content: fullText, sources: sources.length > 0 ? sources : undefined, image: generatedImage || m.image }
                    : m
                )
              }
            : session
        ));
      }
    } catch (error) {
      console.error(error);
      updateChat([...currentMessages, {
        role: 'assistant',
        content: "Maaf, gagal terhubung ke server.",
        timestamp: formatTimestamp(),
      }]);
    } finally {
      setIsSending(false);
      setIsSearching(false);
    }
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'Chat Baru',
      messages: [
        { role: 'assistant' as const, content: 'Halo, saya Cylen AI. Ada yang bisa saya bantu hari ini?', timestamp: formatTimestamp() }
      ],
      date: formatTimestamp()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(newId);
    return newId;
  };

  return { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, sendMessage, createNewChat };
}
