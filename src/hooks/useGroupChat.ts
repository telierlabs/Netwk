import { useState, useEffect } from 'react';
import { Message, GroupSession, GroupParticipant } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

export function useGroupChat() {
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>(() => {
    const saved = localStorage.getItem('cylen_group_sessions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Gagal load group sessions:", e); }
    }
    return [
      {
        id: 'group-1',
        title: 'Diskusi AI Global',
        participants: [
          { id: 'user-1', name: 'Kamu', isAI: false, avatar: 'K' },
          { id: 'ai-gemini', name: 'Gemini', isAI: true, model: 'Gemini 2.5 Flash', avatar: '✦' }
        ],
        messages: [
          { role: 'system', content: 'Grup AI dibuat. Anda dapat mengundang teman dan menambahkan AI lainnya.', timestamp: formatTimestamp() }
        ],
        date: formatTimestamp()
      }
    ];
  });

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    localStorage.setItem('cylen_group_sessions', JSON.stringify(groupSessions));
  }, [groupSessions]);

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      const { id, title, description } = e.detail;
      setGroupSessions(prev => prev.map(g => g.id === id ? { ...g, title, description } : g));
    };
    window.addEventListener('group-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('group-profile-updated', handleProfileUpdate);
  }, []);

  const activeGroup = groupSessions.find(g => g.id === activeGroupId) || null;

  const createGroup = (title: string) => {
    if (groupSessions.length >= 5) return null;
    const newGroup: GroupSession = {
      id: `group-${Date.now()}`,
      title: title || `Grup AI ${groupSessions.length + 1}`,
      participants: [{ id: 'user-1', name: 'Kamu', isAI: false, avatar: 'K' }],
      messages: [{ role: 'system', content: 'Grup baru berhasil dibuat.', timestamp: formatTimestamp() }],
      date: formatTimestamp()
    };
    setGroupSessions(prev => [newGroup, ...prev]);
    return newGroup.id;
  };

  const addParticipant = (participant: GroupParticipant) => {
    if (!activeGroupId) return false;
    const group = groupSessions.find(g => g.id === activeGroupId);
    if (!group) return false;
    if (group.participants.length >= 11 && !participant.isAI) return false;
    
    setGroupSessions(prev => prev.map(g => g.id === activeGroupId ? { ...g, participants: [...g.participants, participant] } : g));
    return true;
  };

  const sendGroupMessage = async (inputText: string, images?: string[]) => {
    if ((!inputText.trim() && (!images || images.length === 0)) || isSending || !activeGroupId) return;

    const userMessage: Message = {
      role: 'user', content: inputText, images: images || [], timestamp: formatTimestamp(), senderName: 'Kamu'
    };

    setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, userMessage] } : group));
    setIsSending(true);

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }); });
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (e) { console.warn("Geolocation failed", e); }

    try {
      const currentGroup = groupSessions.find(g => g.id === activeGroupId);
      if (!currentGroup) return;

      // ── LOGIKA FILTER AI BERDASARKAN @ MENTION ──
      const aiParticipants = currentGroup.participants.filter(p => p.isAI);
      const textLower = inputText.toLowerCase();
      
      // Ngecek apakah user nge-tag AI tertentu pake @
      const mentionedAIs = aiParticipants.filter(ai => 
        textLower.includes(`@${ai.name.toLowerCase()}`)
      );

      // Kalau ada yang di-tag, HANYA mereka yang ngerespon. Kalau gak ada, SEMUA ngerespon.
      const respondingAIs = mentionedAIs.length > 0 ? mentionedAIs : aiParticipants;

      let conversationHistory = [...currentGroup.messages, userMessage];
      
      for (const ai of respondingAIs) {
        const groupDesc = (currentGroup as any).description ? `Deskripsi grup: ${(currentGroup as any).description}` : '';
        const systemPrompt = `Kamu sedang berada di sebuah grup chat bernama "${currentGroup.title}". ${groupDesc}
Daftar peserta: ${currentGroup.participants.map(p => p.name).join(', ')}. Ingat namamu adalah ${ai.name}. Berikan respon yang relevan.`;

        const formattedMessages = conversationHistory.map(m => {
            if (m.role === 'system') return { role: 'user', content: systemPrompt }; 
            const prefix = m.senderName ? `[${m.senderName}]: ` : '';
            return {
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: `${prefix}${m.content}`,
                ...(m.images && m.images.length > 0 ? { images: m.images } : {})
            } as any;
        });

        const stream = await chatWithGeminiStream(formattedMessages, false, location);

        let fullText = "";
        let sources: { title: string; url: string }[] = [];
        
        const aiMessage: Message = { role: 'assistant', content: '', images: [], timestamp: formatTimestamp(), senderName: ai.name, aiModel: ai.model };

        setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, aiMessage] } : group));

        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          fullText += c.text || "";
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

          setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: group.messages.map((m, idx) => idx === group.messages.length - 1 ? { ...m, content: fullText, sources: sources.length > 0 ? sources : undefined } : m) } : group));
        }
        
        const finalizedAiMessage = { ...aiMessage, content: fullText, sources: sources.length > 0 ? sources : undefined };
        conversationHistory = [...conversationHistory, finalizedAiMessage];
        await new Promise(resolve => setTimeout(resolve, 800)); // Jedain dikit biar AI balasnya gantian gak tabrakan
      }
    } catch (error) { console.error(error); } finally { setIsSending(false); }
  };

  return { activeGroup, groupSessions, activeGroupId, setActiveGroupId, isSending, createGroup, addParticipant, sendGroupMessage };
}
