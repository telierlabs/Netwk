import { useState, useEffect, useRef } from 'react';
import { Message, GroupSession, GroupParticipant, AiPolicy } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, arrayUnion, getDoc, query, where, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useProfile } from './useProfile';
import { fetchRealtimeNews } from '../services/newsService';
import { parseChartBlocks, hideChartWhileStreaming } from '../lib/chartBlocks';
import { buildCitations, hideImageSearchWhileStreaming } from '../lib/searchShared';
import { groupSearch } from '../lib/groupSearchStore';
import { tryCreateReminder } from '../lib/reminderIntent';
import type { ChartSpec } from '../lib/chartBlocks';
import { analyzeIntent, buildIntentInstruction, CHAT_INTENT } from '../services/intentService';
import type { Intent } from '../services/intentService';
import { createResolver, buildMedia, photoCapFor, videoUrlsInText, fetchSite, siteContext, siteLinkCards, fetchFx, fxContext, fxToChart, sourceKey, fetchNewsPool, fetchVideos, videosContext, newsPoolContext } from '../lib/media';
import type { LinkCard, NewsPhoto, VideoHit } from '../lib/media';

// Sumber pencarian yang disimpan di pesan (ringkas biar dokumen grup di Firestore tidak bengkak)
type GroupSource = { title: string; url: string; srcType?: string; redirect?: string };

// ── Aturan pengelolaan AI ──
// 'admin'   → cuma pembuat yang boleh tambah / keluarkan AI (bawaan, juga untuk Collaboration lama)
// 'members' → semua anggota boleh
const getAiPolicy = (g: GroupSession): AiPolicy => (g.aiPolicy === 'members' ? 'members' : 'admin');
const canManageAI = (g: GroupSession, uid?: string | null) =>
  !!uid && (g.createdBy === uid || getAiPolicy(g) === 'members');

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
  // Catat Collaboration mana yang info undangannya sudah disinkron (biar nggak nulis berulang)
  const inviteSyncedRef = useRef<Set<string>>(new Set());

  // Keluarkan AI dari Collaboration yang sedang aktif. Boleh kalau admin, atau kalau mode "Setiap anggota".
  // Pakai ref (bukan props) supaya bisa dipanggil dari mana saja, termasuk lewat event.
  const removeAIFromActiveGroup = async (
    participantId: string,
    name?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const groupId = activeGroupRef.current;
    const uid = auth.currentUser?.uid;
    if (!groupId || !uid) return { success: false, message: 'Collaboration tidak ditemukan' };

    const group = localGroupsRef.current.find(g => g.id === groupId);
    if (!group) return { success: false, message: 'Collaboration tidak ditemukan' };
    if (!canManageAI(group, uid)) return { success: false, message: 'Hanya admin yang bisa mengeluarkan AI' };

    const isTarget = (p: GroupParticipant) =>
      p.isAI && (p.id === participantId || (!!name && p.name === name));
    if (!group.participants.some(isTarget)) return { success: false, message: 'AI ini sudah tidak ada di Collaboration' };

    try {
      // Baca dokumen terbaru lalu tulis ulang daftar participants tanpa AI itu
      // (lebih aman daripada arrayRemove yang butuh objek persis sama)
      const ref = doc(db, 'groups', groupId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return { success: false, message: 'Collaboration tidak ditemukan' };
      const current = (snap.data().participants || []) as GroupParticipant[];
      await updateDoc(ref, { participants: current.filter(p => !isTarget(p)) });
      return { success: true };
    } catch (e) {
      console.error('Gagal keluarkan AI', e);
      return { success: false, message: 'Gagal mengeluarkan AI, coba lagi' };
    }
  };

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

      // Sinkron info undangan publik (nama, pembuat, foto, deskripsi) — otomatis juga buat grup lama
      firestoreGroups.forEach(g => {
        if (g.createdBy === currentUser.uid && !inviteSyncedRef.current.has(g.id)) {
          inviteSyncedRef.current.add(g.id);
          const me = g.participants.find(p => p.id === currentUser.uid);
          setDoc(
            doc(db, 'groupInvites', g.id),
            {
              title: g.title,
              creatorName: me?.name || getMyName('Kamu'),
              createdBy: g.createdBy,
              description: g.description ?? '',
              avatar: g.avatar ?? null,
            },
            { merge: true }
          ).catch(() => {});
        }
      });

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
      try {
        await updateDoc(doc(db, 'groups', id), { title, description });
        setDoc(
          doc(db, 'groupInvites', id),
          { title, description: description ?? '', createdBy: auth.currentUser?.uid },
          { merge: true }
        ).catch(() => {});
      } 
      catch(err) { console.error("Update group profile failed", err); }
    };

    // ── BARU: foto grup disimpan di dokumen grup → semua anggota bisa lihat ──
    const handleAvatarUpdate = async (e: any) => {
      const { id, avatar } = e.detail; // avatar = string base64 kecil, atau null untuk hapus
      try {
        await updateDoc(doc(db, 'groups', id), { avatar: avatar ?? null });
        setDoc(
          doc(db, 'groupInvites', id),
          { avatar: avatar ?? null, createdBy: auth.currentUser?.uid },
          { merge: true }
        ).catch(() => {});
      }
      catch(err) { console.error("Update group avatar failed", err); }
    };

    // ── BARU: sampul lebar di halaman profil Collaboration ──
    const handleCoverUpdate = async (e: any) => {
      const { id, cover } = e.detail; // cover = string base64 (kompres), atau null untuk hapus
      try { await updateDoc(doc(db, 'groups', id), { cover: cover ?? null }); }
      catch(err) { console.error("Update group cover failed", err); }
    };

    // Popup Kelola AI memanggil ini lewat event; hasilnya dikirim balik lewat callback `done`
    const handleRemoveAI = async (e: any) => {
      const { participantId, name, done } = e.detail || {};
      const res = await removeAIFromActiveGroup(participantId, name);
      done?.(res);
    };

    // Admin mengganti aturan pengelolaan AI ('admin' / 'members')
    const handleAiPolicy = async (e: any) => {
      const { id, aiPolicy, done } = e.detail || {};
      const group = localGroupsRef.current.find(g => g.id === id);
      if (!group || group.createdBy !== auth.currentUser?.uid) {
        done?.({ success: false, message: 'Hanya admin yang bisa mengubah ini' });
        return;
      }
      if (aiPolicy !== 'admin' && aiPolicy !== 'members') {
        done?.({ success: false, message: 'Pilihan tidak valid' });
        return;
      }
      try {
        await updateDoc(doc(db, 'groups', id), { aiPolicy });
        done?.({ success: true });
      } catch (err) {
        console.error('Update aiPolicy failed', err);
        done?.({ success: false, message: 'Gagal memperbarui, coba lagi' });
      }
    };

    window.addEventListener('group-profile-updated', handleProfileUpdate);
    window.addEventListener('group-avatar-updated', handleAvatarUpdate);
    window.addEventListener('group-cover-updated', handleCoverUpdate);
    window.addEventListener('group-ai-remove', handleRemoveAI);
    window.addEventListener('group-ai-policy-updated', handleAiPolicy);
    return () => {
      window.removeEventListener('group-profile-updated', handleProfileUpdate);
      window.removeEventListener('group-avatar-updated', handleAvatarUpdate);
      window.removeEventListener('group-cover-updated', handleCoverUpdate);
      window.removeEventListener('group-ai-remove', handleRemoveAI);
      window.removeEventListener('group-ai-policy-updated', handleAiPolicy);
    };
  }, []);

  const activeGroup = groupSessions.find(g => g.id === activeGroupId) || null;

  const createGroup = async (
    title: string,
    options?: { description?: string; aiPolicy?: AiPolicy }
  ) => {
    if (!currentUser || groupSessions.length >= 5) return null;

    const description = options?.description?.trim() || '';
    const aiPolicy: AiPolicy = options?.aiPolicy === 'members' ? 'members' : 'admin';

    // Foto TIDAK disimpan di participants lagi (bikin dokumen bengkak & cepat basi).
    // Nama + foto terbaru dibaca dari publicProfiles/{uid}.
    const newGroup: GroupSession = {
      // ID acak supaya nggak bisa ditebak orang
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      title: title || `Collaboration ${groupSessions.length + 1}`,
      description,
      avatar: null,
      cover: null,
      aiPolicy,
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
    // Info publik buat halaman undangan (nama, pembuat, tanpa pesan)
    await setDoc(doc(db, 'groupInvites', newGroup.id), {
      title: newGroup.title,
      creatorName: getMyName('Kamu'),
      createdBy: currentUser.uid,
      description,
      avatar: null,
    }).catch(() => {});
    return newGroup.id;
  };

  const addParticipant = async (participant: GroupParticipant) => {
    if (!activeGroupId) return false;
    const group = localGroupsRef.current.find(g => g.id === activeGroupId);
    if (!group || !canManageAI(group, auth.currentUser?.uid)) return false;
    if (group.participants.some(p => p.isAI && p.id === participant.id)) return true; // sudah ada
    try {
      await updateDoc(doc(db, 'groups', activeGroupId), { participants: arrayUnion(participant) });
      return true;
    } catch(e) { console.error(e); return false; }
  };

  const removeParticipant = async (participantId: string) => {
    const res = await removeAIFromActiveGroup(participantId);
    return res.success;
  };

  const joinGroup = async (groupId: string) => {
    if (!currentUser) return { success: false, message: "Belum login" };

    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) return { success: false, message: "Collaboration tidak ditemukan" };

      const groupData = groupSnap.data() as GroupSession;
      if (groupData.memberIds?.includes(currentUser.uid)) return { success: true, alreadyMember: true };
      if (groupData.memberIds && groupData.memberIds.length >= 11) return { success: false, message: "Collaboration penuh (maks 11 anggota)" };

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
    if (!group) return { success: false, message: "Collaboration tidak ditemukan" };
    if (group.createdBy === currentUser.uid) return { success: false, message: "Pembuat tidak bisa keluar." };

    const myParticipant = group.participants.find(p => p.id === currentUser.uid);
    if (!myParticipant) return { success: false, message: "Bukan anggota Collaboration" };

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        memberIds: arrayRemove(currentUser.uid),
        participants: arrayRemove(myParticipant)
      });
      if (activeGroupId === groupId) setActiveGroupId(null);
      return { success: true };
    } catch (e) { console.error(e); return { success: false, message: "Gagal keluar" }; }
  };

  const deleteGroup = async (groupId: string) => {
    if (!currentUser) return { success: false, message: "Belum login" };
    const group = localGroupsRef.current.find(g => g.id === groupId);
    if (!group) return { success: false, message: "Collaboration tidak ditemukan" };
    if (group.createdBy !== currentUser.uid) return { success: false, message: "Hanya admin yang bisa menghapus" };

    try {
      await deleteDoc(doc(db, 'groups', groupId));
      deleteDoc(doc(db, 'groupInvites', groupId)).catch(() => {});
      if (activeGroupId === groupId) setActiveGroupId(null);
      return { success: true };
    } catch (e) { 
      console.error(e); 
      return { success: false, message: "Gagal menghapus" }; 
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

      // Pengingat lewat @AI di grup → otomatis jadi Automation untuk si pengirim
      if (!(images && images.length > 0)) {
        const plainText = inputText.replace(/@[a-zA-Z0-9_]+/g, '').replace(/\s+/g, ' ').trim();
        const rem = await tryCreateReminder(plainText);
        if (rem.handled) {
          const ai0 = respondingAIs[0];
          const remMsg: Message = { role: 'assistant', content: rem.reply || 'Siap, sudah kujadwalkan.', images: [], timestamp: formatTimestamp(), senderName: ai0.name, aiModel: ai0.model };
          setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, remMsg] } : group));
          try { await updateDoc(doc(db, 'groups', activeGroupId), { messages: arrayUnion(remMsg) }); } catch (e) { console.error(e); }
          return;
        }
      }

      setIsSending(true);
      let conversationHistory = [...currentGroup.messages, userMessage];

      // Siapa yang menanggung pemakaian AI: admin (mode "Hanya admin") atau yang menyebut AI (mode "Setiap anggota").
      // Untuk sekarang cuma dicatat di tiap jawaban AI, belum ada penagihan.
      const chargedTo =
        getAiPolicy(currentGroup) === 'admin'
          ? (currentGroup.createdBy || currentUser.uid)
          : currentUser.uid;

      // ── PEMAHAMAN PESAN: sama dengan chat pribadi (model menilai chat biasa vs pencarian / penjelasan) ──
      const plain = inputText.replace(/@[a-zA-Z0-9_]+/g, '').replace(/\s+/g, ' ').trim();
      let newsContext = '';
      let manualSources: GroupSource[] = [];
      let newsQueries: string[] = [];
      let isGNewsSuccess = false;
      let fxChart: ChartSpec | null = null;
      let siteCards: LinkCard[] = [];
      let newsPool: NewsPhoto[] = [];
      let videoHits: VideoHit[] = [];
      const gid = activeGroupId;
      const startAi = respondingAIs[0].name;

      // Selagi pesan dipahami, loading chat biasa (helix 2 titik) tampil dulu
      setThinkingAI(startAi);

      const hasImages = !!(images && images.length > 0);
      const recentContext = conversationHistory.slice(-5, -1)
        .filter(m => m.role !== 'system')
        .map(m => `${m.senderName || (m.role === 'assistant' ? 'AI' : 'User')}: ${(m.content || '').slice(0, 200)}`)
        .join('\n');
      const intent: Intent = hasImages ? { ...CHAT_INTENT } : await analyzeIntent(plain, recentContext);

      if (intent.kind === 'info') {
        // helix berganti ke label nama AI + 3 titik + kalimat hidup
        groupSearch.set({ groupId: gid, ai: startAi, prompt: plain, topic: intent.topic, stage: 'search', queries: intent.queries.slice(0, 3), sources: [] });
      }

      const isNewsQuery = intent.news && !intent.domain;

      const [siteData, fxData, vids] = await Promise.all([
        intent.domain ? fetchSite(intent.domain) : Promise.resolve(null),
        intent.fx ? fetchFx(intent.fx.base, intent.fx.quote, intent.fx.days) : Promise.resolve(null),
        intent.video ? fetchVideos(intent.queries[0] || plain.slice(0, 80)) : Promise.resolve([] as VideoHit[]),
      ]);
      if (vids.length > 0) { videoHits = vids; newsContext += videosContext(vids); }
      if (siteData && siteData.items.length > 0) {
        newsContext += siteContext(siteData);
        manualSources = [...manualSources, ...siteData.items.map(it => ({ title: it.title, url: it.url, srcType: 'web' }))];
        siteCards = siteLinkCards(siteData);
        groupSearch.patch({ sources: manualSources.map(x => ({ title: x.title, url: x.url })) });
        groupSearch.bump('read');
      }
      if (fxData) {
        newsContext += fxContext(fxData);
        fxChart = fxToChart(fxData); // grafik dari data kurs asli
      }

      if (isNewsQuery) {
        const modelQuery = intent.queries.find(q => !/^site:/i.test(q));
        let kw = (modelQuery || plain).toLowerCase().replace(/\b(apa|ada|tolong|carikan|cari kan|cariin|cari|info|berita|news|terkini|terbaru|hari ini|sekarang|dong|indonesia)\b/gi, ' ').replace(/\s+/g, ' ').trim();
        newsQueries = [kw === '' ? 'berita terkini Indonesia' : `berita ${kw}`];
        if (intent.queries.length === 0) groupSearch.patch({ queries: newsQueries });
        try {
          // GNews + RSS media besar bersamaan: dua-duanya artikel asli (judul + foto artikelnya sendiri)
          const [articles, rss] = await Promise.all([
            fetchRealtimeNews(kw || 'indonesia OR nasional OR trending').catch(() => [] as any[]),
            fetchNewsPool(kw).catch(() => [] as NewsPhoto[]),
          ]);
          const seenUrl = new Set<string>();
          const pool: NewsPhoto[] = [];
          for (const a of (articles || []) as any[]) {
            if (!a?.url || seenUrl.has(a.url)) continue;
            seenUrl.add(a.url);
            pool.push({ title: a.title, url: a.url, image: a.image || undefined, site: a.source?.name || '', description: a.description });
          }
          for (const r of rss) { if (!seenUrl.has(r.url)) { seenUrl.add(r.url); pool.push(r); } }
          if (pool.length > 0) {
            newsPool = pool;
            newsContext += newsPoolContext(pool);
            manualSources = [...manualSources, ...pool.slice(0, 10).map(a => ({ title: a.title, url: a.url, srcType: 'web' }))];
            isGNewsSuccess = true;
            groupSearch.patch({ sources: manualSources.map(x => ({ title: x.title, url: x.url })) });
            groupSearch.bump('read');
          }
        } catch (e) { console.error(e); }
      }

      // Instruksi dinamis (foto tersebar, bedah mendalam, tautan resmi, video, domain, kurs) — kosong untuk chat biasa
      const intentInstruction = buildIntentInstruction(intent, { hasSiteData: !!siteData && siteData.items.length > 0, hasFxChart: !!fxChart, hasNewsData: newsPool.length > 0, hasVideoData: videoHits.length > 0 });
      const needsSearch = intent.search;

      for (const ai of respondingAIs) {
        setThinkingAI(ai.name);
        if (intent.kind === 'info') {
          groupSearch.set({
            groupId: gid, ai: ai.name, prompt: plain, topic: intent.topic,
            stage: manualSources.length > 0 ? 'read' : 'search',
            queries: intent.queries.length > 0 ? intent.queries.slice(0, 3) : (newsQueries.length > 0 ? newsQueries : (plain ? [plain.slice(0, 60)] : [])),
            sources: manualSources.map(x => ({ title: x.title, url: x.url })),
          });
        } else {
          groupSearch.set(null);
        }

        const groupDesc = currentGroup.description ? `Deskripsi grup: ${currentGroup.description}` : '';
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

        // Tambahan untuk pesan user terakhir: data nyata (berita / situs / kurs) + instruksi dari pemahaman pesan
        for (let k = formattedMessages.length - 1; k >= 0; k--) {
          if (formattedMessages[k].role === 'user' && conversationHistory[k]?.role !== 'system') {
            formattedMessages[k] = { ...formattedMessages[k], content: formattedMessages[k].content + newsContext + intentInstruction };
            break;
          }
        }

        const stream = await chatWithGeminiStream(formattedMessages, needsSearch, location);
        let fullText = "";
        let displayedText = ""; 

        // ── data sumber / sitasi (sama seperti useChat) ──
        const sources: GroupSource[] = [...manualSources];
        const uriToIndex = new Map<string, number>();
        let lastSupports: any[] = [];
        let lastChunkList: any[] = [];
        let lastQueriesKey = '';
        const resolver = createResolver(); // ikuti link sumber → gambar utama / video, selagi jawaban diketik
        
        const aiMessage: Message = { role: 'assistant', content: '', images: [], timestamp: formatTimestamp(), senderName: ai.name, aiModel: ai.model, chargedTo };

        setGroupSessions(prev => prev.map(group => group.id === activeGroupId ? { ...group, messages: [...group.messages, aiMessage] } : group));

        const updateAiLocal = (patch: Partial<Message>) =>
          setGroupSessions(prev => prev.map(group => group.id === gid ? {
            ...group,
            messages: group.messages.map(m => (m.role === 'assistant' && m.timestamp === aiMessage.timestamp && m.senderName === ai.name) ? { ...m, ...patch } : m),
          } : group));
        const stripName = (t: string) => t.replace(new RegExp(`^\\[?${ai.name}\\]?:?\\s*`, 'i'), '');

        // ── Efek ngetik: timer terpisah dari stream (sama seperti chat pribadi) ──
        // Teks mengalir halus mengejar antrean, dan setelah stream selesai sisanya dikuras cepat.
        let typeTarget = '';
        let streamDone = false;
        let lastTick = performance.now();
        let budget = 0;
        const typer = setInterval(() => {
          const now = performance.now();
          const dt = Math.min(now - lastTick, 1000);
          lastTick = now;
          if (displayedText.length > typeTarget.length) displayedText = typeTarget;
          const backlog = typeTarget.length - displayedText.length;
          if (backlog <= 0) return;
          const cps = streamDone ? Math.max(backlog / 0.35, 150) : Math.min(Math.max(backlog / 1.2, 40), 2000);
          budget += cps * (dt / 1000);
          const n = Math.floor(budget);
          if (n < 1) return;
          budget -= n;
          displayedText = typeTarget.slice(0, displayedText.length + n);
          updateAiLocal({ content: displayedText });
        }, 50);

        try {
          for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            fullText += c.text || "";

            // Data pencarian dari Gemini → kartu loading + sitasi
            const gm: any = c.candidates?.[0]?.groundingMetadata;
            if (gm?.groundingChunks?.length) lastChunkList = gm.groundingChunks;
            if (gm?.groundingSupports?.length) lastSupports = gm.groundingSupports;
            if (Array.isArray(gm?.webSearchQueries) && gm.webSearchQueries.length > 0) {
              const qs: string[] = gm.webSearchQueries.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 4);
              const key = qs.join('|');
              if (qs.length > 0 && key !== lastQueriesKey) { lastQueriesKey = key; groupSearch.patch({ queries: qs }); }
            }
            const chunks = gm?.groundingChunks;
            if (chunks) {
              const existingUrls = new Set(sources.map(x => x.url));
              chunks.forEach((ch: any) => {
                const uri = ch.web?.uri || '';
                if (ch.web && uri && !uriToIndex.has(uri) && !existingUrls.has(uri)) {
                  let url = uri;
                  const isRedirect = uri.includes('vertexaisearch');
                  if (isRedirect) url = `https://www.google.com/search?q=${encodeURIComponent(ch.web.title?.split(/[-|]/)[0].trim() || '')}`;
                  sources.push({ title: ch.web.title || 'Ref', url, srcType: 'web', ...(isRedirect ? { redirect: uri } : {}) });
                  existingUrls.add(url);
                  uriToIndex.set(uri, sources.length - 1);
                }
              });
              groupSearch.patch({ sources: sources.map(x => ({ title: x.title, url: x.url })) });
              groupSearch.bump('read');
              resolver.request(sources.slice(manualSources.length).map(sourceKey));
            }
            groupSearch.bump('write');

            // Blok grafik & foto yang belum selesai disembunyikan dulu
            typeTarget = hideImageSearchWhileStreaming(hideChartWhileStreaming(stripName(fullText)));
          }
          streamDone = true;
          // tunggu sisa antrean selesai diketik (maksimal 15 detik)
          const t0 = Date.now();
          while (displayedText.length < typeTarget.length && Date.now() - t0 < 15000) {
            await new Promise(r => setTimeout(r, 40));
          }
        } finally {
          clearInterval(typer);
        }
        
        // ── Teks final: grafik diambil dari teks SEBELUM sitasi dihitung (posisi pil tetap pas) ──
        const { clean: finalCleanText, charts } = parseChartBlocks(stripName(fullText));
        const citations = sources.length > 0 && lastSupports.length > 0
          ? buildCitations(finalCleanText, lastSupports, lastChunkList, uriToIndex)
          : [];

        // 🖼️ Foto / video / kartu link dari sumber jawaban (tersebar per paragraf yang menyitir sumbernya)
        resolver.request(videoUrlsInText(finalCleanText), true);
        await resolver.settle(2200);
        const media = buildMedia({ text: finalCleanText, citations, sources, resolver, photoCap: photoCapFor(intent.photos), links: siteCards, newsPool, chart: fxChart, allowWiki: true, videoHits, brandHints: plain.toLowerCase().match(/[a-z0-9]{4,}/g) || [] });
        const finalCharts: ChartSpec[] = fxChart ? [] : charts; // grafik kurs asli ikut di dalam media (awal jawaban)

        // JSON round-trip: buang field undefined (Firestore menolak undefined)
        const finalizedAiMessage = JSON.parse(JSON.stringify({
          ...aiMessage,
          content: finalCleanText,
          ...(sources.length > 0 ? { sources } : {}),
          ...(citations.length > 0 ? { citations } : {}),
          ...(finalCharts.length > 0 ? { charts: finalCharts } : {}),
          ...(media.length > 0 ? { media } : {}),
        })) as Message;

        updateAiLocal(finalizedAiMessage);
        conversationHistory = [...conversationHistory, finalizedAiMessage];
        
        try { await updateDoc(doc(db, 'groups', activeGroupId), { messages: arrayUnion(finalizedAiMessage) }); } 
        catch (e) { console.error("Gagal sync AI message ke firebase", e); }

        await new Promise(resolve => setTimeout(resolve, 800)); 
      }
    } catch (error) { console.error(error); } finally { 
      setIsSending(false); 
      setThinkingAI(null); 
      groupSearch.set(null);
    }
  };

  return { activeGroup, groupSessions, activeGroupId, setActiveGroupId, isSending, thinkingAI, createGroup, addParticipant, removeParticipant, sendGroupMessage, joinGroup, leaveGroup, deleteGroup };
}
