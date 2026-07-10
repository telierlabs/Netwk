import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, generateImageWithGemini, extractMemoryFromChat, ConnectionError } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';
import { fetchRealtimeNews } from '../services/newsService';
import { trackMessageSent } from '../pages/UsagePage';

import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

import { jsPDF } from 'jspdf'; 
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

const generateProfessionalPDF = (title: string, content: string) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let cursorY = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const splitTitle = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  doc.text(splitTitle, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += (splitTitle.length * 7) + 5;
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const cleanContent = content.replace(/### /g, '').replace(/## /g, '').replace(/# /g, '').replace(/\*\*/g, '').replace(/---/g, '________________________________________________');
  const lines = doc.splitTextToSize(cleanContent, contentWidth);

  lines.forEach((line: string) => {
    if (cursorY > pageHeight - margin) {
      doc.addPage();
      cursorY = margin; 
      const pageCount = doc.internal.pages.length - 1;
      doc.setFontSize(9);
      doc.text(`Halaman ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.setFontSize(11); 
    }
    if (line.includes('____')) {
      doc.setLineWidth(0.1);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 5;
    } else {
      doc.text(line, margin, cursorY);
      cursorY += 7;
    }
  });
  const finalPageCount = doc.internal.pages.length;
  doc.setFontSize(9);
  doc.text(`Cylen AI Document - Halaman ${finalPageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc.output('datauristring');
};

const generateProfessionalDOCX = async (title: string, content: string) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "", spacing: { after: 400 } }), 
        ...content.split('\n').map(line => new Paragraph({
          children: [new TextRun({ text: line.replace(/[#*]/g, ''), size: 24 })],
          spacing: { after: 200 }
        }))
      ],
    }],
  });
  const base64 = await Packer.toBase64String(doc);
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
};

const generateProfessionalXLSX = (title: string, content: string) => {
  const rows = content.split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(c => c !== ''));
  const validRows = rows.filter(r => r.length > 0);
  const worksheet = XLSX.utils.aoa_to_sheet(validRows.length ? validRows : [['Data Kosong']]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Cylen");
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
};

const generateProfessionalPPT = async (title: string, content: string) => {
  const pres = new PptxGenJS();
  const slide = pres.addSlide();
  slide.addText(title, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 32, bold: true, color: '363636', align: 'center' });
  
  const sections = content.split('---'); 
  sections.forEach((text, idx) => {
    const cleanText = text.replace(/[#*]/g, '').trim();
    if (cleanText) {
      const s = idx === 0 ? slide : pres.addSlide();
      s.addText(cleanText, { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, color: '666666', valign: 'top' });
    }
  });
  
  const base64 = await pres.write({ outputType: 'base64' }) as string;
  return `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}`;
};

const generateVisualEbookPDF = async (title: string, content: string, coverImage?: string | null) => {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' }); 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const setDarkBackground = () => {
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  setDarkBackground();
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  
  const splitTitle = doc.splitTextToSize(title.toUpperCase(), pageWidth - 30);
  doc.text(splitTitle, pageWidth / 2, 40, { align: 'center' });
  
  if (coverImage && coverImage.startsWith('data:image')) {
    try {
      const imgSize = 90; 
      doc.addImage(coverImage, 'PNG', (pageWidth - imgSize) / 2, 60, imgSize, imgSize);
    } catch (e) { console.error("Cover image error", e); }
  } else {
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("[ Visual Illustration Here ]", pageWidth / 2, 100, { align: 'center' });
  }
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Dipublikasikan oleh Cylen AI Creative", pageWidth / 2, pageHeight - 20, { align: 'center' });

  doc.addPage();
  setDarkBackground();
  
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let cursorY = 25;
  
  doc.setTextColor(210, 210, 210);
  doc.setFontSize(12);
  
  const cleanContent = content.replace(/### /g, '').replace(/## /g, '').replace(/# /g, '').replace(/\*\*/g, '');
  const lines = doc.splitTextToSize(cleanContent, contentWidth);
  
  lines.forEach((line: string) => {
    if (cursorY > pageHeight - 20) {
      doc.addPage();
      setDarkBackground();
      cursorY = 25;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`- ${doc.internal.pages.length - 1} -`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(210, 210, 210);
    }
    
    if (line.includes('---')) {
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.3);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;
    } else {
      doc.text(line, margin, cursorY);
      cursorY += 7;
    }
  });

  return doc.output('datauristring');
};

function parseSuggestions(text: string): { clean: string; suggestions: string[] } {
  const match = text.match(/```suggestions\n([\s\S]*?)```/);
  if (!match) return { clean: text, suggestions: [] };
  const suggestions = match[1].split('\n').map(s => s.replace(/^[-*]\s*/, '').trim()).filter(s => s.length > 0).slice(0, 2);
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

function hideTagsWhileStreaming(text: string): string {
  let t = hideJsonCanvasWhileStreaming(text);
  t = t.replace(/\[GENERATE_(IMAGE|PDF|DOCS|EXCEL|PPT|EBOOK):[\s\S]*?(\[\/GENERATE_(PDF|DOCS|EXCEL|PPT|EBOOK)\]|\]|$)/g, '');
  return t.trim();
}

function parseCanvasTags(text: string): { clean: string; canvasNodes?: any[] } {
  const match = text.match(/```json-canvas\n([\s\S]*?)```/);
  let clean = hideJsonCanvasWhileStreaming(text);
  let canvasNodes = undefined;
  if (match) { try { canvasNodes = JSON.parse(match[1]); } catch (e) { console.error(e); } }
  return { clean, canvasNodes };
}

function formatMemoryTimestamp(): string {
  const now = new Date();
  const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

async function buildMemoryContext(): Promise<string> {
  if (!auth?.currentUser) return '';
  try {
    const memoryRef = collection(db, 'users', auth.currentUser.uid, 'memory');
    const snapshot = await getDocs(query(memoryRef, orderBy('rawDate', 'desc')));
    const items = snapshot.docs.map(doc => doc.data().text);
    return items.length === 0 ? '' : items.map(text => `- ${text}`).join('\n');
  } catch (e) {
    console.error("Gagal load memory context:", e);
    return '';
  }
}

async function autoSaveMemory(messages: { role: string; content: string }[]): Promise<void> {
  if (!auth?.currentUser) return;
  try {
    const memoryRef = collection(db, 'users', auth.currentUser.uid, 'memory');
    const snapshot = await getDocs(query(memoryRef, orderBy('rawDate', 'desc')));
    const existing = snapshot.docs.map(doc => doc.data().text);
    const newFacts = await extractMemoryFromChat(messages, existing);
    if (newFacts.length === 0) return;
    const now = new Date();
    for (const text of newFacts) {
      await addDoc(memoryRef, { text, timestamp: formatMemoryTimestamp(), rawDate: now.getTime() });
    }
  } catch (e) {
    console.error("Gagal auto-save memory:", e);
  }
}

// ─────────────────────────────────────────────
// LOADING STATE — sekarang di-scope PER chatId,
// bukan satu flag global. Ini yang bikin loading
// gak lagi "nyasar" ke chat lain saat user pindah
// chat sementara chat sebelumnya masih streaming.
// ─────────────────────────────────────────────
type ActivityStatus = 'idle' | 'image' | 'pdf' | 'docs' | 'excel' | 'ppt' | 'ebook';

interface ChatLoadingState {
  isSending: boolean;
  isSearching: boolean;
  webCount: number;
  postCount: number;
  activityStatus: ActivityStatus;
}

const DEFAULT_LOADING_STATE: ChatLoadingState = {
  isSending: false,
  isSearching: false,
  webCount: 0,
  postCount: 0,
  activityStatus: 'idle',
};

export function useChat() {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: 'initial', title: 'Chat Baru', messages: [], date: formatTimestamp(), isTemporary: false }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>('initial');
  const [chatMode, setChatMode] = useState<ChatMode>('auto');

  // Map chatId -> status loading masing-masing chat.
  const [loadingStates, setLoadingStates] = useState<Record<string, ChatLoadingState>>({});

  const patchLoading = (chatId: string, patch: Partial<ChatLoadingState>) => {
    setLoadingStates(prev => ({
      ...prev,
      [chatId]: { ...(prev[chatId] || DEFAULT_LOADING_STATE), ...patch },
    }));
  };

  const clearLoading = (chatId: string) => {
    setLoadingStates(prev => {
      if (!(chatId in prev)) return prev;
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchChats = async () => {
      if (!auth?.currentUser) return;
      try {
        const uid = auth.currentUser.uid;
        const snapshot = await getDocs(collection(db, 'users', uid, 'chats'));
        const loaded: ChatSession[] = [];
        snapshot.forEach(doc => { loaded.push(doc.data() as ChatSession); });
        if (loaded.length > 0 && isMounted) {
          loaded.sort((a, b) => Number(b.id) - Number(a.id));
          setChatSessions(loaded);
          setActiveChatId(loaded[0].id);
        }
      } catch (e) {
        console.error("Error load chats from Firestore:", e);
      }
    };

    const unsubscribe = auth?.onAuthStateChanged(user => { if (user) fetchChats(); });
    return () => { isMounted = false; if (unsubscribe) unsubscribe(); };
  }, []);

  const syncSessionToDb = async (session: ChatSession) => {
    if (!auth?.currentUser || session.isTemporary) return;
    try {
      const uid = auth.currentUser.uid;
      const cleanSession = JSON.parse(JSON.stringify(session));
      await setDoc(doc(db, 'users', uid, 'chats', session.id), cleanSession);
    } catch (e) {
      console.error("Gagal simpan chat ke Firestore:", e);
    }
  };

  const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
  const messages = activeSession.messages;
  const isTemporary = activeSession.isTemporary || false;

  // Status loading yang DIEKSPOS ke UI — cuma diambil dari chat yang lagi aktif dilihat.
  // Kalau chat lain (yang gak lagi dibuka) masih streaming di background, itu gak
  // akan nongol di sini karena key map-nya beda dari activeChatId.
  const activeLoading = loadingStates[activeChatId] || DEFAULT_LOADING_STATE;
  const { isSending, isSearching, webCount, postCount, activityStatus } = activeLoading;

  const updateChat = (targetChatId: string, newMessages: Message[], inputText?: string, shouldSync: boolean = false) => {
    setChatSessions(prev => {
      const next = prev.map(session => {
        if (session.id === targetChatId) {
          let newTitle = session.title;
          if ((session.title === 'Chat Baru' || session.title === 'New Chat') && inputText && !session.isTemporary) {
            newTitle = inputText.slice(0, 30) + (inputText.length > 30 ? '...' : '');
          }
          return { ...session, messages: newMessages, title: newTitle, date: formatTimestamp() };
        }
        return session;
      });
      if (shouldSync) {
        const updated = next.find(s => s.id === targetChatId);
        if (updated && !updated.isTemporary) syncSessionToDb(updated);
      }
      return next;
    });
  };

  const togglePin = (msgIndex: number) => {
    setChatSessions(prev => {
      const next = prev.map(session => session.id === activeChatId ? { ...session, messages: session.messages.map((m, i) => i === msgIndex ? { ...m, pinned: !m.pinned } : m) } : session);
      const updated = next.find(s => s.id === activeChatId);
      if (updated && !updated.isTemporary) syncSessionToDb(updated);
      return next;
    });
  };

  const pinnedMessages = messages.filter(m => m.pinned);

  const checkAndSetReminder = (text: string, currentChatId: string) => {
    if (/ingetin|ingatkan|nanti jam|ingat|inget/i.test(text)) {
      setTimeout(() => {
        setChatSessions(prev => {
          const next = prev.map(session => {
            if (session.id === currentChatId) {
              return { ...session, messages: [...session.messages, { role: 'assistant', content: `Halo CEO! Sistem mendeteksi rencana Anda sebelumnya. Apakah agenda ini sudah selesai?`, timestamp: formatTimestamp(), isAutoReminder: true, quotedText: text }] };
            }
            return session;
          });
          const updated = next.find(s => s.id === currentChatId);
          if (updated && !updated.isTemporary) syncSessionToDb(updated);
          return next;
        });
      }, 10000);
    }
  };

  const sendMessage = async (inputText: string, attachedImage: string | null, attachedImages?: string[], attachedPdfs?: { data: string; name: string }[], directText?: string, baseMessages?: Message[]) => {
    const finalText = directText !== undefined ? directText : inputText;
    const images = attachedImages && attachedImages.length > 0 ? attachedImages : (attachedImage ? [attachedImage] : []);

    // Guard pakai status loading milik chat yang akan dikirimi pesan (activeChatId saat ini),
    // bukan flag global.
    const alreadySending = loadingStates[activeChatId]?.isSending;
    if ((!finalText.trim() && images.length === 0 && (!attachedPdfs || attachedPdfs.length === 0)) || alreadySending) return;

    // chatId di-lock di sini. Walaupun user pindah ke chat lain sambil ini masih
    // jalan (streaming), semua update di bawah tetap nempel ke chat yang BENAR ini,
    // bukan ke chat yang lagi ditampilkan belakangan.
    const chatId = activeChatId;

    const userMessage: Message = { role: 'user', content: finalText, timestamp: formatTimestamp(), image: images[0] || undefined, images: images.length > 0 ? images : undefined };
    const currentMessages = [...(baseMessages || messages), userMessage];
    
    updateChat(chatId, currentMessages, finalText, true);
    patchLoading(chatId, { isSending: true, activityStatus: 'idle' });
    trackMessageSent();
    checkAndSetReminder(finalText, chatId);

    const specialFeaturesInstruction = `\n\n[INSTRUKSI SISTEM WAJIB]:
Jika user meminta:
1. Gambar: AWALI teksmu dengan [GENERATE_IMAGE: <prompt inggris detail>]
2. PDF: AWALI teksmu dengan [GENERATE_PDF: Judul.pdf] ISI SUPER PANJANG... [/GENERATE_PDF]
3. Word/Docs: AWALI teksmu dengan [GENERATE_DOCS: Judul.docx] ISI DOKUMEN... [/GENERATE_DOCS]
4. Excel/CSV: AWALI teksmu dengan [GENERATE_EXCEL: Laporan.xlsx] Kolom1 | Kolom2 | Kolom3 \n Data1 | Data2 | Data3 [/GENERATE_EXCEL]
5. PowerPoint/PPT: AWALI teksmu dengan [GENERATE_PPT: Judul.pptx] Materi slide 1 --- Materi slide 2 --- Materi slide 3 [/GENERATE_PPT]
6. Visual Ebook/Novel/Buku: AWALI teksmu dengan memanggil 2 tag ini sekaligus (gambar & ebook):
[GENERATE_IMAGE: <tulis gaya cover novel detail bahasa inggris>] 
[GENERATE_EBOOK: Judul Buku.pdf] Bab 1... Tulis seluruh isinya dengan panjang dan epik [/GENERATE_EBOOK]

PENTING: Selalu tulis teks penjelasan singkat SETELAH tag penutup selesai!`;

    let injectedContext = specialFeaturesInstruction;
    let manualSources: { title: string; url: string; srcType: string }[] = [];
    let manualImage = '';
    
    const isNewsQuery = /berita|news|terkini|terbaru|hari ini/i.test(finalText);
    let isGNewsSuccess = false;

    if (isNewsQuery) {
      patchLoading(chatId, { isSearching: true });
      try {
        let searchKeyword = finalText.toLowerCase().replace(/(apa|ada|tolong|cariin|cari|info|berita|news|terkini|terbaru|hari ini|sekarang|dong)/gi, '').trim();
        if (searchKeyword === '') searchKeyword = 'indonesia OR nasional OR trending';
        const articles = await fetchRealtimeNews(searchKeyword);
        if (articles && articles.length > 0) {
          injectedContext += `\n\n=== DATA BERITA ===\n` + articles.map((a: any, i: number) => `${i+1}. Judul: ${a.title}\nSumber: ${a.source.name}\nDeskripsi: ${a.description}`).join('\n\n');
          manualSources = articles.map((a: any) => ({ title: a.title, url: a.url, srcType: 'web' }));
          if (articles[0].image) manualImage = articles[0].image;
          isGNewsSuccess = true;
        }
      } catch (e) { console.error(e); }
    }

    const needsSearch = (!isGNewsSuccess && isNewsQuery) || /^(apa|cari|jelaskan|siapa|bagaimana|kenapa|mengapa|kapan|cara|tolong|how|what|who|why|when|where|harga|cuaca|jadwal|lokasi|tempat)/i.test(finalText);
    if (needsSearch && !loadingStates[chatId]?.isSearching) {
      patchLoading(chatId, { isSearching: true, webCount: 0, postCount: 0 });
    }

    try {
      const chatMessages = currentMessages.filter(m => m.role !== 'system').map((m, idx, arr) => {
        if (idx === arr.length - 1 && injectedContext) return { role: m.role as 'user'|'assistant', content: m.content + injectedContext };
        return { role: m.role as 'user'|'assistant', content: m.content };
      });

      const memoryContextString = await buildMemoryContext();
      
      // LOKASI DIHAPUS - tidak ada lagi navigator.geolocation
      const stream = await chatWithGeminiStream(chatMessages, needsSearch, undefined, images.length > 0 ? images : undefined, attachedPdfs, chatMode, memoryContextString);

      let fullText = '';
      let sources = [...manualSources];
      let generatedImage = manualImage;
      let localWebCount = manualSources.length;
      let localPostCount = 0;

      if (isNewsQuery && isGNewsSuccess) patchLoading(chatId, { webCount: localWebCount });

      updateChat(chatId, [...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), suggestions: [] }]);

      let currentActivity: ActivityStatus = 'idle';

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';

        if (currentActivity === 'idle') {
          if (fullText.includes('[GENERATE_EBOOK:')) { currentActivity = 'ebook'; patchLoading(chatId, { activityStatus: 'ebook' }); }
          else if (fullText.includes('[GENERATE_PDF:')) { currentActivity = 'pdf'; patchLoading(chatId, { activityStatus: 'pdf' }); }
          else if (fullText.includes('[GENERATE_DOCS:')) { currentActivity = 'docs'; patchLoading(chatId, { activityStatus: 'docs' }); }
          else if (fullText.includes('[GENERATE_EXCEL:')) { currentActivity = 'excel'; patchLoading(chatId, { activityStatus: 'excel' }); }
          else if (fullText.includes('[GENERATE_PPT:')) { currentActivity = 'ppt'; patchLoading(chatId, { activityStatus: 'ppt' }); }
          else if (fullText.includes('[GENERATE_IMAGE:')) { currentActivity = 'image'; patchLoading(chatId, { activityStatus: 'image' }); }
        }

        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const existingUrls = new Set(sources.map(s => s.url));
          chunks.forEach(ch => {
            if (ch.web && !existingUrls.has(ch.web.uri || '')) {
              let url = ch.web.uri || '';
              if (url.includes('vertexaisearch')) url = `https://www.google.com/search?q=${encodeURIComponent(ch.web.title?.split(/[-|]/)[0].trim() || '')}`;
              sources.push({ title: ch.web.title || 'Ref', url, srcType: 'web' });
              existingUrls.add(url);
              if (/x\.com|twitter\.com/i.test(url)) localPostCount++; else localWebCount++;
            }
          });
          patchLoading(chatId, { webCount: localWebCount, postCount: localPostCount });
        }

        const streamClean = hideTagsWhileStreaming(fullText);
        const { clean: noSugg, suggestions } = parseSuggestions(streamClean);
        const validSuggestions = Array.isArray(suggestions) ? suggestions.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

        setChatSessions(prev => prev.map(session =>
          session.id === chatId ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, content: noSugg, sources: sources.length > 0 ? sources : undefined, suggestions: validSuggestions } : m) } : session
        ));
      }

      let finalRawText = fullText;
      let generatedFileInfo: { name: string, dataUrl: string, type: string } | null = null;
      let finalGeneratedImage = generatedImage;

      const imgMatch = finalRawText.match(/\[GENERATE_IMAGE:\s*(.*?)\]/s);
      if (imgMatch) {
        finalRawText = finalRawText.replace(imgMatch[0], '');
        const imgData = await generateImageWithGemini(imgMatch[1]);
        if (imgData) finalGeneratedImage = imgData;
      }

      const matchers = [
        { type: 'EBOOK', regex: /\[GENERATE_EBOOK:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_EBOOK\]|$)/s, generator: (title: string, content: string) => generateVisualEbookPDF(title, content, finalGeneratedImage) },
        { type: 'PDF', regex: /\[GENERATE_PDF:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_PDF\]|$)/s, generator: generateProfessionalPDF },
        { type: 'DOCS', regex: /\[GENERATE_DOCS:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_DOCS\]|$)/s, generator: generateProfessionalDOCX },
        { type: 'EXCEL', regex: /\[GENERATE_EXCEL:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_EXCEL\]|$)/s, generator: generateProfessionalXLSX },
        { type: 'PPT', regex: /\[GENERATE_PPT:\s*(.*?)\]([\s\S]*?)(?:\[\/GENERATE_PPT\]|$)/s, generator: generateProfessionalPPT }
      ];

      for (const m of matchers) {
        const found = finalRawText.match(m.regex);
        if (found) {
          finalRawText = finalRawText.replace(found[0], '');
          try {
            await new Promise(r => setTimeout(r, 1000));
            const title = found[1].trim();
            const content = found[2].trim();
            const dataUrl = await m.generator(title, content);
            generatedFileInfo = { name: title.endsWith('.pdf') && m.type === 'EBOOK' ? title : `${title}.${m.type === 'EBOOK' ? 'pdf' : m.type.toLowerCase()}`, dataUrl, type: m.type };
          } catch (e) { console.error(`Gagal bikin ${m.type}:`, e); }
          break;
        }
      }

      let streamCleanFinal = hideTagsWhileStreaming(finalRawText);
      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(streamCleanFinal);
      let { clean: finalCleanText, canvasNodes } = parseCanvasTags(cleanFinal);

      if (generatedFileInfo) {
        finalCleanText = `[${generatedFileInfo.type}_FILE: "${generatedFileInfo.name}"](${generatedFileInfo.dataUrl})\n\n` + finalCleanText;
      }

      const validFinalSuggestions = Array.isArray(finalSugg) ? finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

      setChatSessions(prev => {
        const next = prev.map(session =>
          session.id === chatId ? { ...session, messages: session.messages.map((m, idx) => idx === session.messages.length - 1 ? { ...m, content: finalCleanText, suggestions: validFinalSuggestions, image: finalGeneratedImage } : m) } : session
        );
        const updated = next.find(s => s.id === chatId);
        if (updated && !updated.isTemporary) syncSessionToDb(updated);
        return next;
      });

      if (canvasNodes && Array.isArray(canvasNodes)) window.dispatchEvent(new CustomEvent('cylen-canvas-update', { detail: canvasNodes }));
      
      if (!isTemporary) autoSaveMemory([...currentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'assistant' as const, content: finalCleanText }]).catch(() => {});

    } catch (error) {
      console.error(error);
      let errorType: 'offline' | 'timeout' | 'failed' | 'limit' = 'failed';
      if (error instanceof ConnectionError) errorType = error.type; else if (!navigator.onLine) errorType = 'offline';
      updateChat(chatId, [...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), isConnectionError: true, connectionErrorType: errorType } as any], undefined, true);
    } finally {
      clearLoading(chatId);
    }
  };

  const retryLastMessage = (targetIndex?: number) => {
    const aiIndex = targetIndex !== undefined ? targetIndex : messages.length - 1;
    let userIndex = -1;
    for (let i = aiIndex; i >= 0; i--) { if (messages[i].role === 'user') { userIndex = i; break; } }
    if (userIndex === -1) return;
    const lastUserMsg = messages[userIndex];
    const newMessages = messages.slice(0, userIndex);
    setChatSessions(prev => {
      const next = prev.map(session => session.id === activeChatId ? { ...session, messages: newMessages } : session);
      const updated = next.find(s => s.id === activeChatId);
      if (updated && !updated.isTemporary) syncSessionToDb(updated);
      return next;
    });
    sendMessage(lastUserMsg.content, lastUserMsg.image || null, lastUserMsg.images, undefined, undefined, newMessages);
  };

  const createNewChat = (isGhostMode: boolean = false) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = { id: newId, title: isGhostMode ? 'Private Chat' : 'Chat Baru', messages: [], date: formatTimestamp(), isTemporary: isGhostMode };
    setChatSessions(prev => { const filtered = prev.filter(s => !s.isTemporary); return [newSession, ...filtered]; });
    setActiveChatId(newId);
    if (!isGhostMode) syncSessionToDb(newSession);
    return newId;
  };

  const renameChatSession = (id: string, newTitle: string) => {
    setChatSessions(prev => {
      const next = prev.map(session => session.id === id ? { ...session, title: newTitle } : session);
      const updated = next.find(s => s.id === id);
      if (updated && !updated.isTemporary) syncSessionToDb(updated);
      return next;
    });
  };

  const pinChatSession = (id: string) => {
    setChatSessions(prev => {
      const next = prev.map(session => session.id === id ? { ...session, isPinned: !(session as any).isPinned } : session);
      const updated = next.find(s => s.id === id);
      if (updated && !updated.isTemporary) syncSessionToDb(updated);
      return next;
    });
  };

  const deleteChatSession = async (id: string) => {
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
    clearLoading(id);

    if (auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'chats', id));
      } catch(e) { console.error("Gagal hapus di Firestore", e); }
    }
  };

  return { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, webCount, postCount, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession };
}
