import { useState, useEffect, useRef } from 'react';
import { Message, GroupSession, GroupParticipant } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, getDoc, query, where, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useProfile } from './useProfile';

export function useGroupChat() {
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [thinkingAI, setThinkingAI] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // ── BARU: nama diambil dari profil terbaru (bukan localStorage yang basi) ──
  const { profile } = useProfile();
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  const getMyName = (fallback: string) =>
    profileRef.current.name?.trim() || auth.currentUser?.displayName || fallback;

  const isSendingRef = useRef(isSending);
  const activeGroupRef = useRef(activeGroupId);
  const localGroupsRef = useRef(groupSessions);

  useEffect(() => { const unsub = onAuthStateChanged(auth, u => setCurrentUser(u)); return () => unsub(); }, []);
  useEffect(() => { isSendingRef.current = isSending; }, [isSending]);
  useEffect(() => { activeGroupRef.current = activeGroupId; }, [activeGroupId]);
  useEffect(() => { localGroupsRef.current = groupSessions; }, [groupSessions]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreGroups: GroupSession[] = [];
      snapshot.forEach(docSnap => firestoreGroups.push(docSnap.data() as GroupSession));
      firestoreGroups.sort((a,b) => b.date.localeCompare(a.date));

      setGroupSessions(prev => {
        if (isSendingRef.current && activeGroupRef.current) {
          return firestoreGroups.map(cloudGroup => {
            if (cloudGroup.id === activeGroupRef.current) {
              const localGroup = localGroupsRef.current.find(g => g.id === activeGroupRef.current);
              if (!localGroup) return cloudGroup;
              
              const mergedMessages = [...cloudGroup.messages];
              
              const localAiMsg = localGroup.messages[localGroup.messages.length - 1];
              if (localAiMsg && localAiMsg.role === 'assistant' && !cloudGroup.messages.some(m => m.timestamp === localAiMsg.timestamp)) {
                mergedMessages.push(localAiMsg);
              }
              
              return { ...cloudGroup, messages: mergedMessages };
            }
            return cloudGroup;
          });
        }
        return firestoreGroups;
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const handleProfileUpdate = async (e: any) => {
      const { id, title, description } = e.detail;
      try { await updateDoc(doc(db, 'groups', id), { title, description }); } 
      catch(err) { console.error("Update group profile failed", err); }
    };

    // ── BARU: foto grup disimpan di dokumen grup → semua anggota bisa lihat ──
    const handleAvatarUpdate = async (e: any) => {
      const { id, avatar } = e.detail; // avatar = string base64 kecil, atau null untuk hapus
      try { await updateDoc(doc(db, 'groups', id), { avatar: avatar ?? null }); }
      catch(err) { console.error("Update group avatar failed", err); }
    };

    window.addEventListener('group-profile-updated', handleProfileUpdate);
    window.addEventListener('group-avatar-updated', handleAvatarUpdate);
    return () => {
      window.removeEventListener('group-profile-updated', handleProfileUpdate);
      window.removeEventListener('group-avatar-updated', handleAvatarUpdate);
    };
  }, []);

  const activeGroup = groupSessions.find(g => g.id === activeGroupId) || null;

  const createGroup = async (title: string) => {
    if (!currentUser || groupSessions.length >= 5) return null;

    // Foto TIDAK disimpan di participants lagi (bikin dokumen bengkak & cepat basi).
    // Nama + foto terbaru dibaca dari publicProfiles/{uid}.
    const newGroup: GroupSession = {
      id: `group-${Date.now()}`,
      title: title || `Grup AI ${groupSessions.length + 1}`,
      participants: [
        { id: currentUser.uid, name: getMyName('Kamu'), isAI: false, avatar: '' },
        { id: 'ai-gemini', name: 'Gemini', isAI: true, model: 'Gemini 2.5 Flash', avatar: '✦' }
      ],
      messages: [{ role: 'system', content: 'Grup AI dibuat. Anda dapat mengundang teman dan menambahkan AI lainnya.', timestamp: formatTimestamp() }],
      date: formatTimestamp(),
      memberIds: [currentUser.uid],
      createdBy: currentUser.uid
    };

    await setDoc(doc(db, 'groups', newGroup.id), newGroup);
    return newGroup.id;
  };

  const addParticipant = async (participant: GroupParticipant) => {
    if (!activeGroupId) return false;
    try {
      await updateDoc(doc(db, 'groups', activeGroupId), { participants: arrayUnion(participant) });
      return true;
    } catch(e) { console.error(e); return false; }
  };

  const joinGroup = async (groupId: string) => {
    if (!currentUser) return { success: false, message: "Belum login" };

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) return { success: false, message: "Grup tidak ditemukan" };

      const groupData = groupSnap.data() as GroupSession;
      if (groupData.memberIds?.includes(currentUser.uid)) return { success: true, alreadyMember: true };
      if (groupData.memberIds && groupData.memberIds.length >= 11) return { success: false, message: "Grup penuh (maks 11 manusia)" };

      const newParticipant = { id: currentUser.uid, name: getMyName('Teman'), isAI: false, avatar: '' };

      await updateDoc(groupRef, {
        memberIds: arrayUnion(currentUser.uid),
        participants: arrayUnion(newParticipant)
      });
      return { success: true, alreadyMember: false };
    } catch (e) { console.error(e); return { success: false, message: "Terjadi kesalahan koneksi cloud" }; }
  };

  const leaveGroup = async (groupId: string) => {
    if (!currentUser) return { success: false, message: "Belum login" };
    const group = localGroupsRef.current.find(g => g.id === groupId);
    if (!group) return { success: false, message: "Grup tidak ditemukan" };
    if (group.createdBy === currentUser.uid) return { success: false, message: "Pembuat grup tidak bisa keluar." };

    const myParticipant = group.participants.find(p => p.id === currentUser.uid);
    if (!myParticipant) return { success: false, message: "Bukan anggota grup" };

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberIds: arrayRemove(currentUser.uid),
        participants: arrayRemove(myParticipant)
      });
      if (activeGroupId === groupId) setActiveGroupId(null);
      return { success: true };
    } catch (e) { console.error(e); return { success: false, message: "Gagal keluar grup" }; }
  };

  const deleteGroup = async (groupId: string) => {
    if (!currentUser) return { success: false, message: "Belum login" };
    const group = localGroupsRef.current.find(g => g.id === groupId);
    if (!group) return { success: false, message: "Grup tidak ditemukan" };
    if (group.createdBy !== currentUser.uid) return { success: false, message: "Hanya admin yang bisa menghapus grup" };

    try {
      await deleteDoc(doc(db, 'groups', groupId));
      if (activeGroupId === groupId) setActiveGroupId(null);
      return { success: true };
    } catch (e) { 
      console.error(e); 
      return { success: false, message: "Gagal menghapus grup" }; 
    }
  };

  const sendGroupMessage = async (inputText: string, images?: string[]) => {
    if ((!inputText.trim() && (!images || images.length === 0)) || isSending || !activeGroupId || !currentUser) return;

    const currentGroup = localGroupsRef.current.find(g => g.id === activeGroupId);
    if (!currentGroup) return;

    const userName = getMyName('Kamu');
    
    const userMessage: Message = { 
      role: 'user', 
      content: inputText, 
      images: images || [], 
      timestamp: formatTimestamp(), 
      senderName: userName,
      senderId: currentUser.uid 
    };

    setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, userMessage] } : group));
    
    try { await updateDoc(doc(db, 'groups', activeGroupId), { messages: arrayUnion(userMessage) }); } 
    catch (e) { console.error("Gagal kirim ke firebase", e); }

    let location: { latitude: number; longitude: number } | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => { navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }); });
      location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (e) { console.warn("Geolocation failed", e); }

    try {
      const aiParticipants = currentGroup.participants.filter(p => p.isAI);
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      let match;
      const taggedNames: string[] = [];
      while ((match = mentionRegex.exec(inputText)) !== null) taggedNames.push(match[1].toLowerCase());

      let respondingAIs: GroupParticipant[] = [];
      if (taggedNames.length > 0) {
        for (const tagName of taggedNames) {
          const foundAI = aiParticipants.find(ai => ai.name.toLowerCase() === tagName);
          if (foundAI && !respondingAIs.some(r => r.id === foundAI.id)) respondingAIs.push(foundAI); 
        }
      }
      
      if (respondingAIs.length === 0) {
        return; 
      }

      setIsSending(true);
      let conversationHistory = [...currentGroup.messages, userMessage];
      
      for (const ai of respondingAIs) {
        setThinkingAI(ai.name); 

        const groupDesc = (currentGroup as any).description ? `Deskripsi grup: ${(currentGroup as any).description}` : '';
        const systemPrompt = `Kamu adalah ${ai.name}. Kamu sedang berada di sebuah grup chat bernama "${currentGroup.title}". ${groupDesc}
Daftar peserta grup saat ini: ${currentGroup.participants.map(p => p.name).join(', ')}.
INSTRUKSI SANGAT KETAT UNTUKMU:
1. Jawab HANYA untuk bagianmu saja sebagai ${ai.name}.
2. DILARANG KERAS menuliskan percakapan atau membuat jawaban atas nama AI lain (seperti ChatGPT, Claude, dll).
3. DILARANG KERAS memulai jawabanmu dengan namamu sendiri seperti "[${ai.name}]: ". Langsung tulis saja isi jawabanmu.`;

        const formattedMessages = conversationHistory.map(m => {
            if (m.role === 'system') return { role: 'user', content: systemPrompt }; 
            const prefix = m.senderName ? `[${m.senderName}]: ` : '';
            return { role: m.role === 'assistant' ? 'assistant' : 'user', content: `${prefix}${m.content}`, ...(m.images && m.images.length > 0 ? { images: m.images } : {}) } as any;
        });

        const stream = await chatWithGeminiStream(formattedMessages, false, location);
        let fullText = "";
        let displayedText = ""; 
        
        const aiMessage: Message = { role: 'assistant', content: '', images: [], timestamp: formatTimestamp(), senderName: ai.name, aiModel: ai.model };

        setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, aiMessage] } : group));

        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          const chunkText = c.text || "";
          fullText += chunkText;

          const cleanFull = fullText.replace(new RegExp(`^\\[?${ai.name}\\]?:?\\s*`, 'i'), '');
          const textToAdd = cleanFull.substring(displayedText.length);
          const chars = textToAdd.split('');

          for (let i = 0; i < chars.length; i++) {
            displayedText += chars[i];
            
            if (i % 3 === 0 || i === chars.length - 1) {
              setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { 
                ...group, 
                messages: group.messages.map((m, idx) => idx === group.messages.length - 1 ? { ...m, content: displayedText } : m) 
              } : group));
            }
            
            await new Promise(r => setTimeout(r, 10)); 
          }
        }
        
        const finalCleanedText = fullText.replace(new RegExp(`^\\[?${ai.name}\\]?:?\\s*`, 'i'), '');
        const finalizedAiMessage = { ...aiMessage, content: finalCleanedText };
        conversationHistory = [...conversationHistory, finalizedAiMessage];
        
        try { await updateDoc(doc(db, 'groups', activeGroupId), { messages: arrayUnion(finalizedAiMessage) }); } 
        catch (e) { console.error("Gagal sync AI message ke firebase", e); }

        await new Promise(resolve => setTimeout(resolve, 800)); 
      }
    } catch (error) { console.error(error); } finally { 
      setIsSending(false); 
      setThinkingAI(null); 
    }
  };

  return { activeGroup, groupSessions, activeGroupId, setActiveGroupId, isSending, thinkingAI, createGroup, addParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup };
}
