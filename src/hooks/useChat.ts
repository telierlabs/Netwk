import { useState, useRef, useEffect } from 'react';
import { Message, ChatSession } from '../types';
import { formatTimestamp } from '../lib/utils';
import { chatWithGeminiStream, generateImageWithGemini, extractMemoryFromChat, ConnectionError } from '../services/geminiService';
import { ChatMode } from '../components/chat/ChatInput';
import { GenerateContentResponse } from '@google/genai';
import { fetchRealtimeNews } from '../services/newsService';
import { parseChartBlocks, hideChartWhileStreaming } from '../lib/chartBlocks';
import type { ChartSpec } from '../lib/chartBlocks';
import { analyzeIntent, buildIntentInstruction, CHAT_INTENT } from '../services/intentService';
import type { Intent } from '../services/intentService';
import { narrateStart, narrateFindings, detectVariant, narrateDocStart } from '../services/narratorService';
import { extractDocsFromText, detectDocRequest, parseDoc, DOC_FORMAT_PROMPT } from '../lib/docModel';
import { docNote } from '../lib/docNoteStore';
import { normalizeImageFence } from '../lib/searchShared';
import type { LoadingVariant } from '../services/narratorService';
import { createResolver, manualCitations, buildMedia, photoCapFor, videoUrlsInText, fetchSite, siteContext, siteLinkCards, fetchFx, fxContext, fxToChart, sourceKey, fetchNewsPool, fetchVideos, videosContext, newsPoolContext } from '../lib/media';
import type { NewsPhoto, VideoHit } from '../lib/media';
import type { LinkCard } from '../lib/media';
import type { SearchStage } from '../components/chat/components/search/SearchingIndicator';
import { trackMessageSent } from '../lib/usageTracker';
import { tryCreateReminder } from '../lib/reminderIntent';

import { db, auth } from '../lib/firebase';
// ✅ EDIT 1: ditambah onSnapshot dan where (buat nangkep chat hasil Automations)
import { collection, doc, setDoc, getDocs, deleteDoc, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';

import { jsPDF } from 'jspdf'; 
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

// Ekstensi file asli per tipe hasil generate
const FILE_EXT: Record<string, string> = {
  EBOOK: 'pdf',
  PDF: 'pdf',
  DOCS: 'docx',
  EXCEL: 'xlsx',
  PPT: 'pptx',
};

// Buang ekstensi (satu atau lebih) di akhir judul, mis. "Data.csv.excel" -> "Data", "Laporan.pdf.pdf" -> "Laporan"
const stripFileExtension = (name: string) =>
  name.replace(/(\.(pdf|docx?|xlsx?|csv|pptx?|excel|docs|ppt))+$/i, '').trim();

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

// 🔧 BARU: sembunyikan blok ```suggestions yang belum selesai ditulis AI (dan awalan
// fence-nya yang baru setengah jalan), supaya efek ngetik tidak pernah menampilkan
// teks mentah "```suggestions" ke layar. HANYA dipakai untuk tampilan saat streaming —
// jalur final tetap pakai parseSuggestions seperti sebelumnya.
const SUGG_FENCE = '```suggestions';
function hideSuggestionsWhileStreaming(text: string): string {
  const idx = text.indexOf(SUGG_FENCE);
  if (idx !== -1) return text.slice(0, idx).trimEnd();
  for (let len = Math.min(SUGG_FENCE.length - 1, text.length); len > 0; len--) {
    if (text.endsWith(SUGG_FENCE.slice(0, len))) return text.slice(0, text.length - len);
  }
  return text;
}

// 🔧 BARU: blok ```image-search baru ditampilkan setelah penutupnya selesai ditulis,
// supaya kata kuncinya tidak ketahuan setengah-setengah / memicu pencarian foto berkali-kali.
const IMG_FENCE = '```image-search';
function hideImageSearchWhileStreaming(text: string): string {
  const idx = text.lastIndexOf(IMG_FENCE);
  if (idx !== -1) {
    const after = text.slice(idx + IMG_FENCE.length);
    if (!/\n```/.test(after)) return text.slice(0, idx).trimEnd();
    return text;
  }
  for (let len = Math.min(IMG_FENCE.length - 1, text.length); len > 0; len--) {
    if (text.endsWith(IMG_FENCE.slice(0, len))) return text.slice(0, text.length - len);
  }
  return text;
}

function getStreamingDisplayText(fullText: string): string {
  return hideImageSearchWhileStreaming(hideChartWhileStreaming(hideSuggestionsWhileStreaming(hideTagsWhileStreaming(normalizeImageFence(fullText, false)))));
}

// 🔧 BARU: sitasi per paragraf (pil sumber ala Grok).
// Gemini memberi `groundingSupports`: potongan teks jawaban + indeks sumber yang mendukungnya.
// Posisi akhir tiap potongan dicari di teks final lewat segment.text (BUKAN startIndex/endIndex,
// karena indeks Gemini dihitung dalam byte UTF-8 dan bergeser kalau ada emoji / tanda baca khusus).
interface Citation { end: number; ids: number[] }

function buildCitations(text: string, supports: any[], chunkList: any[], uriToIndex: Map<string, number>): Citation[] {
  const out: Citation[] = [];
  const sorted = [...supports].sort((a, b) => (a?.segment?.startIndex ?? 0) - (b?.segment?.startIndex ?? 0));
  let cursor = 0;
  for (const sp of sorted) {
    const segText: string = sp?.segment?.text || '';
    const chunkIdx: number[] = Array.isArray(sp?.groundingChunkIndices) ? sp.groundingChunkIndices : [];
    if (!segText.trim() || chunkIdx.length === 0) continue;

    const ids = Array.from(new Set(
      chunkIdx
        .map(ci => { const uri = chunkList?.[ci]?.web?.uri; return uri ? uriToIndex.get(uri) : undefined; })
        .filter((n): n is number => typeof n === 'number'),
    ));
    if (ids.length === 0) continue;

    let pos = text.indexOf(segText, cursor);
    if (pos === -1) pos = text.indexOf(segText);
    if (pos === -1) continue;
    out.push({ end: Math.min(text.length, pos + segText.length), ids });
    cursor = Math.max(cursor, pos);
  }
  return out;
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

// 🔧 BARU: sumber pencarian yang sedang masuk — dipakai UI loading pencarian
// (chip favicon + domain). Bentuknya sama dengan msg.sources.
interface SearchSource {
  title: string;
  url: string;
  srcType: string;
  // 🔧 BARU: link redirect asli dari Gemini (vertexaisearch). Kalau diklik di browser,
  // langsung diarahkan ke artikelnya — dipakai popup sumber untuk buka artikel & ambil judulnya.
  redirect?: string;
}

interface ChatLoadingState {
  isSending: boolean;
  isSearching: boolean;
  webCount: number;
  postCount: number;
  activityStatus: ActivityStatus;
  sources: SearchSource[];
  // 🔧 BARU: progres pencarian buat kartu loading (langkah, kata kunci, waktu mulai)
  searchStage: SearchStage;
  searchQueries: string[];
  // 🔧 BARU: kalimat loading dari pemahaman model
  searchTopic: string;
  searchStartedAt: number | null;
  // kalimat temuan dari model kecil + jenis loading khusus (kode / gambar / dokumen)
  searchNotes: string[];
  variant: LoadingVariant | null;
}

const DEFAULT_LOADING_STATE: ChatLoadingState = {
  isSending: false,
  isSearching: false,
  webCount: 0,
  postCount: 0,
  activityStatus: 'idle',
  sources: [],
  searchStage: 'understand',
  searchQueries: [],
  searchTopic: '',
  searchStartedAt: null,
  searchNotes: [],
  variant: null,
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

  // 🔧 BARU: naikkan langkah loading — tidak pernah mundur
  const bumpStage = (chatId: string, stage: SearchStage) => {
    const order: SearchStage[] = ['understand', 'search', 'read', 'write'];
    setLoadingStates(prev => {
      const cur = prev[chatId] || DEFAULT_LOADING_STATE;
      if (order.indexOf(stage) <= order.indexOf(cur.searchStage)) return prev;
      return { ...prev, [chatId]: { ...cur, searchStage: stage } };
    });
  };

  // 🔧 BARU: isi kata kunci sementara (hanya kalau belum ada kata kunci dari Gemini)
  const seedQuery = (chatId: string, q: string) => {
    if (!q) return;
    setLoadingStates(prev => {
      const cur = prev[chatId] || DEFAULT_LOADING_STATE;
      if (cur.searchQueries.length > 0) return prev;
      return { ...prev, [chatId]: { ...cur, searchQueries: [q] } };
    });
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

  // ✅ EDIT 2 (BARU): chat hasil Automations (dibikin server /api/run-tasks) muncul realtime tanpa reload
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    const unsubAuth = auth?.onAuthStateChanged((user: any) => {
      unsubSnap?.(); unsubSnap = null;
      if (!user) return;
      const q = query(collection(db, 'users', user.uid, 'chats'), where('fromTask', '==', true));
      unsubSnap = onSnapshot(q, (snap) => {
        const incoming: ChatSession[] = [];
        snap.docChanges().forEach(ch => { if (ch.type === 'added') incoming.push(ch.doc.data() as ChatSession); });
        if (!incoming.length) return;
        setChatSessions(prev => {
          const have = new Set(prev.map(s => s.id));
          const fresh = incoming.filter(s => !have.has(s.id)).sort((a, b) => Number(b.id) - Number(a.id));
          return fresh.length ? [...fresh, ...prev] : prev;
        });
      }, (err) => console.error('Listener chat Automations gagal:', err));
    });
    return () => { unsubSnap?.(); unsubAuth?.(); };
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

  // ─────────────────────────────────────────────
  // 🎙️ CYLEN VOICE → RIWAYAT CHAT
  // LiveVoiceMode mengirim CustomEvent tiap selesai satu giliran tanya-jawab.
  // Di sini pesannya dimasukkan ke chat yang sedang aktif (persis seperti chat
  // teks), jadi otomatis muncul di sidebar/riwayat, dapat judul otomatis, dan
  // ikut tersinkron ke Firestore. Satu sesi voice = satu chat (dikunci di
  // giliran pertama, walau user pindah chat saat voice masih terbuka).
  // ─────────────────────────────────────────────
  const activeChatIdRef = useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  const voiceChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    const onStart = () => { voiceChatIdRef.current = null; };
    const onEnd = () => { voiceChatIdRef.current = null; };

    const onTurn = (e: Event) => {
      const { userText, assistantText } = (e as CustomEvent).detail || {};
      if (typeof userText !== 'string' || !userText.trim()) return;

      const chatId = voiceChatIdRef.current ?? activeChatIdRef.current;
      voiceChatIdRef.current = chatId;

      const newMsgs: Message[] = [
        { role: 'user', content: userText.trim(), timestamp: formatTimestamp(), source: 'voice' },
      ];
      if (typeof assistantText === 'string' && assistantText.trim()) {
        newMsgs.push({ role: 'assistant', content: assistantText.trim(), timestamp: formatTimestamp(), source: 'voice' });
      }

      setChatSessions(prev => {
        const next = prev.map(s => {
          if (s.id !== chatId) return s;
          let title = s.title;
          if ((title === 'Chat Baru' || title === 'New Chat') && !s.isTemporary) {
            title = userText.trim().slice(0, 30) + (userText.trim().length > 30 ? '...' : '');
          }
          return { ...s, messages: [...s.messages, ...newMsgs], title, date: formatTimestamp() };
        });
        const updated = next.find(s => s.id === chatId);
        if (updated && !updated.isTemporary) syncSessionToDb(updated);
        return next;
      });
    };

    window.addEventListener('cylen-voice-start', onStart);
    window.addEventListener('cylen-voice-end', onEnd);
    window.addEventListener('cylen-voice-turn', onTurn);
    return () => {
      window.removeEventListener('cylen-voice-start', onStart);
      window.removeEventListener('cylen-voice-end', onEnd);
      window.removeEventListener('cylen-voice-turn', onTurn);
    };
  }, []);

  const activeSession = chatSessions.find(s => s.id === activeChatId) || chatSessions[0];
  const messages = activeSession.messages;
  const isTemporary = activeSession.isTemporary || false;

  // Status loading yang DIEKSPOS ke UI — cuma diambil dari chat yang lagi aktif dilihat.
  // Kalau chat lain (yang gak lagi dibuka) masih streaming di background, itu gak
  // akan nongol di sini karena key map-nya beda dari activeChatId.
  const activeLoading = loadingStates[activeChatId] || DEFAULT_LOADING_STATE;
  const { isSending, isSearching, webCount, postCount, activityStatus, sources: searchSources, searchStage, searchQueries, searchTopic, searchStartedAt, searchNotes, variant: loadingVariant } = activeLoading;

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

    // 🔧 FIX BUG: sebelumnya field `pdfs` gak pernah dimasukin ke userMessage,
    // padahal ChatBubble.tsx udah nunggu `msg.pdfs` buat nampilin pill PDF di
    // bubble pesan user. attachedPdfs sendiri sebenarnya SAMPAI ke AI (dipakai
    // di chatWithGeminiStream di bawah), tapi gak pernah ikut disimpen ke
    // object message yang dirender ke layar — makanya pill PDF ilang begitu
    // pesan udah terkirim walau attachment-nya kepakai buat analisis AI.
    const userMessage: Message = { 
      role: 'user', 
      content: finalText, 
      timestamp: formatTimestamp(), 
      image: images[0] || undefined, 
      images: images.length > 0 ? images : undefined,
      pdfs: attachedPdfs && attachedPdfs.length > 0 ? attachedPdfs : undefined,
    };
    const currentMessages = [...(baseMessages || messages), userMessage];
    
    updateChat(chatId, currentMessages, finalText, true);
    const sendStartedAt = Date.now();
    const loadVariant = detectVariant(finalText, images.length > 0, !!(attachedPdfs && attachedPdfs.length > 0));
    let sendFinished = false;
    let flowNotes: string[] = [];
    let flowQueries: string[] = [];
    let thinkSecs = 0;
    patchLoading(chatId, { isSending: true, isSearching: false, activityStatus: 'idle', searchStage: 'understand', searchQueries: [], searchTopic: '', searchNotes: [], variant: loadVariant, sources: [], searchStartedAt: sendStartedAt });
    // kalimat pembuka loading kode / gambar / dokumen ditulis model kecil
    if (loadVariant) {
      narrateStart(finalText, loadVariant).then(t => { if (t && !sendFinished) setLoadingStates(prev => (prev[chatId] && prev[chatId].variant && !prev[chatId].isSearching ? { ...prev, [chatId]: { ...prev[chatId], searchTopic: t } } : prev)); });
    }
    // Minta dibuatkan dokumen? helix + satu kalimat singkat dari model (tanpa teks template)
    const docKindLabel = images.length === 0 ? detectDocRequest(finalText) : null;
    if (docKindLabel) {
      docNote.start(chatId);
      narrateDocStart(finalText, docKindLabel).then(t => { if (t && !sendFinished) docNote.set(chatId, t); });
    }
    trackMessageSent();
    // Pesan minta pengingat / jadwal? Otomatis dibuat jadi Automation (tanpa setup manual)
    if (images.length === 0 && !(attachedPdfs && attachedPdfs.length > 0)) {
      const reminder = await tryCreateReminder(finalText);
      if (reminder.handled) {
        updateChat(
          chatId,
          [...currentMessages, { role: 'assistant', content: reminder.reply || 'Jadwal dibuat.', timestamp: formatTimestamp(), suggestions: [], ...(reminder.card ? { scheduleCard: reminder.card } : {}) } as any],
          undefined,
          true,
        );
        clearLoading(chatId);
        return;
      }
    }

    const specialFeaturesInstruction = `\n\n[INSTRUKSI SISTEM WAJIB]:
Jika user meminta:
1. Gambar: AWALI teksmu dengan [GENERATE_IMAGE: <prompt inggris detail>]
${DOC_FORMAT_PROMPT}
6. Visual Ebook/Novel/Buku: AWALI teksmu dengan memanggil 2 tag ini sekaligus (gambar & ebook):
[GENERATE_IMAGE: <tulis gaya cover novel detail bahasa inggris>] 
[GENERATE_EBOOK: Judul Buku.pdf] Bab 1... Tulis seluruh isinya dengan panjang dan epik [/GENERATE_EBOOK]

PENTING: untuk Ebook, tulis teks penjelasan singkat SETELAH tag penutup.`;

    let injectedContext = specialFeaturesInstruction;
    let manualSources: SearchSource[] = [];
    const manualImage = ''; // foto berita kini ditempel per paragraf (msg.media), bukan satu foto di atas
    let fxChart: ChartSpec | null = null;
    let siteCards: LinkCard[] = [];
    let newsPool: NewsPhoto[] = [];
    let videoHits: VideoHit[] = [];

    // 🧠 Pahami pesan dengan model (bukan daftar kata kunci): chat biasa atau perlu info / pencarian?
    const hasAttachments = images.length > 0 || !!(attachedPdfs && attachedPdfs.length > 0);
    const recentContext = currentMessages.slice(-4, -1).map(m => `${m.role === 'user' ? 'User' : 'Cylen'}: ${(m.content || '').slice(0, 200)}`).join('\n');
    const intent: Intent = hasAttachments ? { ...CHAT_INTENT } : await analyzeIntent(finalText, recentContext);

    if (intent.kind === 'info') {
      // loading berganti dari helix 2 titik ke 3 titik + kalimat hidup
      flowQueries = intent.queries.slice(0, 3);
      patchLoading(chatId, { isSearching: true, variant: null, searchTopic: intent.topic, searchQueries: flowQueries, searchStage: 'search' });
      if (intent.queries.length === 0 && !intent.topic) seedQuery(chatId, finalText.trim().slice(0, 60));
    }

    const isNewsQuery = intent.news && !intent.domain;
    let isGNewsSuccess = false;

    // Kalimat temuan: model kecil menulis 2–3 kalimat dari judul sumber ASLI (sekali per jawaban)
    let narrated = false;
    const runNarrate = (titles: string[]) => {
      if (narrated || intent.kind !== 'info' || titles.length < 2) return;
      narrated = true;
      narrateFindings(finalText, titles).then(n => {
        if (n.length > 0 && !sendFinished) { flowNotes = n; patchLoading(chatId, { searchNotes: n }); }
      });
    };

    // Data nyata yang disiapkan sebelum jawaban dibuat: isi situs (kalau user menyebut domain) dan kurs asli
    const [siteData, fxData, vids] = await Promise.all([
      intent.domain ? fetchSite(intent.domain) : Promise.resolve(null),
      intent.fx ? fetchFx(intent.fx.base, intent.fx.quote, intent.fx.days) : Promise.resolve(null),
      intent.video ? fetchVideos(intent.queries[0] || finalText.slice(0, 80)) : Promise.resolve([] as VideoHit[]),
    ]);
    if (vids.length > 0) { videoHits = vids; injectedContext += videosContext(vids); }
    if (siteData && siteData.items.length > 0) {
      injectedContext += siteContext(siteData);
      manualSources = [...manualSources, ...siteData.items.map(it => ({ title: it.title, url: it.url, srcType: 'web' }))];
      siteCards = siteLinkCards(siteData);
      patchLoading(chatId, { sources: [...manualSources], webCount: manualSources.length });
      bumpStage(chatId, 'read');
    }
    if (fxData) {
      injectedContext += fxContext(fxData);
      fxChart = fxToChart(fxData); // grafik dari data kurs asli, bukan angka tebakan model
    }

    if (isNewsQuery) {
      patchLoading(chatId, { isSearching: true, searchStage: 'search' });
      try {
        const modelQuery = intent.queries.find(q => !/^site:/i.test(q));
        let searchKeyword = (modelQuery || finalText).toLowerCase().replace(/\b(apa|ada|tolong|carikan|cari kan|cariin|cari|info|berita|news|terkini|terbaru|hari ini|sekarang|dong|indonesia)\b/gi, ' ').replace(/\s+/g, ' ').trim();
        if (searchKeyword === '') searchKeyword = 'indonesia OR nasional OR trending';
        if (intent.queries.length === 0) {
          flowQueries = [searchKeyword === 'indonesia OR nasional OR trending' ? 'berita terkini Indonesia' : `berita ${searchKeyword}`];
          patchLoading(chatId, { searchQueries: flowQueries });
        }
        const rssQuery = searchKeyword === 'indonesia OR nasional OR trending' ? '' : searchKeyword;
        // GNews + RSS media besar berjalan bersamaan: dua-duanya artikel asli (judul + foto artikelnya sendiri)
        const [articles, rss] = await Promise.all([
          fetchRealtimeNews(searchKeyword).catch(() => [] as any[]),
          fetchNewsPool(rssQuery).catch(() => [] as NewsPhoto[]),
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
          injectedContext += newsPoolContext(pool);
          manualSources = [...manualSources, ...pool.slice(0, 10).map(a => ({ title: a.title, url: a.url, srcType: 'web' }))];
          isGNewsSuccess = true;
          // 🔧 sumber berita sudah diketahui di awal → langsung kirim ke UI loading pencarian
          patchLoading(chatId, { sources: [...manualSources], webCount: manualSources.length });
          bumpStage(chatId, 'read');
          runNarrate(pool.slice(0, 8).map(a => a.title));
        }
      } catch (e) { console.error(e); }
    }

    // Instruksi dinamis dari pemahaman model (foto tersebar, bedah mendalam, tautan resmi, video, domain, kurs)
    injectedContext += buildIntentInstruction(intent, { hasSiteData: !!siteData && siteData.items.length > 0, hasFxChart: !!fxChart, hasNewsData: newsPool.length > 0, hasVideoData: videoHits.length > 0 });

    // Pencarian web (grounding) aktif kalau model menilai perlu
    const needsSearch = intent.search;
    // Pesan yang butuh bedah mendalam otomatis memakai mode Think (kalau mode masih Auto)
    const effectiveChatMode: ChatMode = intent.deep && chatMode === 'auto' ? ('think' as ChatMode) : chatMode;

    // 🔧 Timer efek ngetik (tick tiap 50ms) — di luar try supaya bisa dibersihkan di finally apa pun yang terjadi.
    const typer = {
      shown: 0,                 // jumlah karakter yang sudah tampil di layar
      budget: 0,                // sisa pecahan karakter antar-tick
      lastTick: 0,
      lastPainted: -1,
      sourcesDirty: false,
      streamDone: false,
      ready: false,             // bubble AI sudah dibuat?
      timer: null as ReturnType<typeof setInterval> | null,
      onDrained: null as (() => void) | null,
    };

    try {
      const chatMessages = currentMessages.filter(m => m.role !== 'system').map((m, idx, arr) => {
        if (idx === arr.length - 1 && injectedContext) return { role: m.role as 'user'|'assistant', content: m.content + injectedContext };
        return { role: m.role as 'user'|'assistant', content: m.content };
      });

      const memoryContextString = await buildMemoryContext();
      
      // LOKASI DIHAPUS - tidak ada lagi navigator.geolocation
      const stream = await chatWithGeminiStream(chatMessages, needsSearch, undefined, images.length > 0 ? images : undefined, attachedPdfs, effectiveChatMode, memoryContextString);

      let fullText = '';
      let sources: SearchSource[] = [...manualSources];
      const uriToIndex = new Map<string, number>(); // 🔧 uri Gemini -> indeks di `sources` (cegah duplikat + dipakai pil sumber)
      let lastSupports: any[] = [];
      let lastChunkList: any[] = [];
      let lastQueriesKey = ''; // 🔧 BARU: cegah patch kata kunci berulang
      let generatedImage = manualImage;
      let localWebCount = manualSources.length;
      let localPostCount = 0;
      const resolver = createResolver(); // ikuti link sumber → gambar utama / video, selagi jawaban diketik

      if (isNewsQuery && isGNewsSuccess) patchLoading(chatId, { webCount: localWebCount, sources: [...sources] });

      // ─────────────────────────────────────────────
      // 🔧 EFEK NGETIK MULUS
      // Gemini ngirim teks per blok besar (apalagi pakai Google Search / mode Think),
      // dulu setiap blok langsung ditempel ke layar → kelihatan muncul per paragraf.
      // Sekarang data yang datang ditampung di `fullText`, lalu timer 40ms membuka teks
      // sedikit demi sedikit dengan kecepatan adaptif (makin banyak antrean, makin cepat),
      // jadi alirannya halus dan nggak pernah ketinggalan jauh.
      // ─────────────────────────────────────────────
      // dokumen yang sedang ditulis AI (kartu loading dengan isi asli); null kalau bukan permintaan dokumen
      let docLive: { kind: string; name: string; source: string; live: boolean }[] | null = null;
      const paint = (text: string) => {
        const dl = docLive;
        setChatSessions(prev => prev.map(session =>
          session.id === chatId
            ? {
                ...session,
                messages: session.messages.map((m, idx) =>
                  idx === session.messages.length - 1
                    ? { ...m, content: text, sources: sources.length > 0 ? sources : undefined, suggestions: [], ...(dl ? { docLive: dl } : {}) } as any
                    : m
                ),
              }
            : session
        ));
      };

      const tick = () => {
        const now = performance.now();
        const dt = Math.min(now - typer.lastTick, 1000); // tab di background → timer melambat, jangan loncat terlalu jauh
        typer.lastTick = now;

        const exDoc = extractDocsFromText(fullText);
        // dokumen: yang diketik di atas kartu hanya kalimat pembuka (isi dokumen & penutup tidak ikut)
        const target = getStreamingDisplayText(exDoc ? exDoc.before : fullText);
        if (typer.shown > target.length) typer.shown = target.length;

        const backlog = target.length - typer.shown;
        if (backlog > 0) {
          // Lagi streaming : kejar antrean dengan konstanta waktu ±1,2 dtk (minimum 40 karakter/dtk)
          // Stream selesai : kuras sisa dalam ±0,35 dtk
          const cps = typer.streamDone
            ? Math.max(backlog / 0.35, 150)
            : Math.min(Math.max(backlog / 1.2, 40), 2000);
          typer.budget += cps * (dt / 1000);
          const n = Math.floor(typer.budget);
          if (n > 0) {
            typer.budget -= n;
            let next = Math.min(target.length, typer.shown + n);
            // jangan belah emoji (surrogate pair) di tengah
            const code = target.charCodeAt(next - 1);
            if (next < target.length && code >= 0xD800 && code <= 0xDBFF) next++;
            typer.shown = next;
          }
        } else {
          typer.budget = 0;
        }

        // kartu dokumen baru muncul setelah kalimat pembuka selesai diketik
        const nextLive = exDoc && typer.shown >= target.length ? exDoc.docs.map(d => ({ kind: d.kind as string, name: d.name, source: d.source, live: !d.complete })) : null;
        const sig = (l: typeof nextLive) => (l ? l.map(d => `${d.name}:${d.source.length}:${d.live}`).join('|') : '');
        if (sig(nextLive) !== sig(docLive)) { docLive = nextLive; typer.sourcesDirty = true; }
        if (typer.shown !== typer.lastPainted || typer.sourcesDirty) {
          paint(target.slice(0, typer.shown));
          typer.lastPainted = typer.shown;
          typer.sourcesDirty = false;
        }

        if (typer.streamDone && typer.shown >= target.length && typer.onDrained) {
          const done = typer.onDrained;
          typer.onDrained = null;
          done();
        }
      };

      // Alur berpikir yang disimpan di pesan (baris "Berpikir N dtk >" di atas jawaban)
      const makeFlow = () => {
        if (intent.kind !== 'info' && !loadVariant && !docKindLabel) return null;
        return {
          secs: thinkSecs || Math.max(1, Math.round((Date.now() - sendStartedAt) / 1000)),
          topic: intent.kind === 'info' ? intent.topic : '',
          queries: flowQueries,
          notes: flowNotes,
          mode: chatMode,
          ...(intent.kind !== 'info' && loadVariant ? { variant: loadVariant } : {}),
        };
      };

      // Bubble AI baru dibuat saat teks PERTAMA datang (bukan sebelum request jalan),
      // supaya selama retry diam-diam nggak ada bubble kosong + action bar yang nongol.
      const ensureAssistant = () => {
        if (typer.ready) return;
        typer.ready = true;
        thinkSecs = Math.max(1, Math.round((Date.now() - sendStartedAt) / 1000));
        updateChat(chatId, [...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), suggestions: [], ...(makeFlow() ? { flow: makeFlow() } : {}) } as any]);
        typer.lastTick = performance.now();
        typer.timer = setInterval(tick, 50);
      };

      let currentActivity: ActivityStatus = 'idle';

      try {
        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          fullText += c.text || '';
          if (fullText.length > 0) ensureAssistant();

          if (currentActivity === 'idle') {
            if (fullText.includes('[GENERATE_EBOOK:')) { currentActivity = 'ebook'; patchLoading(chatId, { activityStatus: 'ebook' }); }
            // PDF / Word / Excel / PPT tidak memakai activityStatus lagi: kartunya hidup di dalam pesan (msg.docLive)
            else if (fullText.includes('[GENERATE_IMAGE:')) { currentActivity = 'image'; patchLoading(chatId, { activityStatus: 'image' }); }
          }

          const gm: any = c.candidates?.[0]?.groundingMetadata;
          if (gm?.groundingChunks?.length) lastChunkList = gm.groundingChunks;
          if (gm?.groundingSupports?.length) lastSupports = gm.groundingSupports;
          // 🔧 BARU: kata kunci asli yang dipakai Gemini → tampil sebagai chip di kartu loading
          if (Array.isArray(gm?.webSearchQueries) && gm.webSearchQueries.length > 0) {
            const qs: string[] = gm.webSearchQueries.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 4);
            const key = qs.join('|');
            if (qs.length > 0 && key !== lastQueriesKey) { lastQueriesKey = key; flowQueries = qs; patchLoading(chatId, { searchQueries: qs }); }
          }
          const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            const existingUrls = new Set(sources.map(s => s.url));
            chunks.forEach(ch => {
              const uri = ch.web?.uri || '';
              if (ch.web && uri && !uriToIndex.has(uri) && !existingUrls.has(uri)) {
                let url = uri;
                const isRedirect = uri.includes('vertexaisearch');
                if (isRedirect) url = `https://www.google.com/search?q=${encodeURIComponent(ch.web.title?.split(/[-|]/)[0].trim() || '')}`;
                sources.push({ title: ch.web.title || 'Ref', url, srcType: 'web', ...(isRedirect ? { redirect: uri } : {}) });
                existingUrls.add(url);
                uriToIndex.set(uri, sources.length - 1);
                typer.sourcesDirty = true;
                if (/x\.com|twitter\.com/i.test(url)) localPostCount++; else localWebCount++;
              }
            });
            // 🔧 BARU: ikut kirim daftar sumber ke UI loading pencarian (chip favicon + domain)
            patchLoading(chatId, { webCount: localWebCount, postCount: localPostCount, sources: [...sources] });
            // sumber dari pencarian Google → cari gambar & video-nya di latar belakang
            resolver.request(sources.slice(manualSources.length).map(sourceKey));
            bumpStage(chatId, 'read');
            if (sources.length >= 2) runNarrate(sources.map(x => x.title).filter(t => t && !/^(ref|[a-z0-9-]+\.[a-z.]+)$/i.test(t)));
          }
          bumpStage(chatId, 'write');
        }
      } catch (streamErr) {
        // 🔧 Stream putus di tengah jalan TAPI teks sudah masuk → pertahankan teksnya,
        // jangan diganti kartu "Connection Issue". Error baru dianggap error kalau belum ada teks sama sekali.
        if (fullText.trim().length === 0) throw streamErr;
        console.warn('[Cylen] Stream terputus di tengah jalan, teks yang sudah masuk dipertahankan.', streamErr);
      }

      // Pastikan bubble AI ada (walau balasannya kosong), lalu tunggu efek ngetik selesai
      // sebelum lanjut bikin file/gambar & finalisasi.
      ensureAssistant();
      typer.streamDone = true;
      await new Promise<void>(resolve => {
        typer.onDrained = resolve;
        setTimeout(resolve, 6000); // jaring pengaman: jangan pernah nunggu selamanya
      });
      if (typer.timer) { clearInterval(typer.timer); typer.timer = null; }

      let finalRawText = fullText;
      let docResult: { docs: { kind: string; name: string; source: string }[]; intro: string } | null = null;
      const exFinal = extractDocsFromText(fullText);
      if (exFinal) {
        docResult = { docs: exFinal.docs.map(d => ({ kind: d.kind as string, name: d.name, source: d.source.trim() })), intro: hideTagsWhileStreaming(exFinal.before) };
        // yang dianggap teks jawaban = kalimat penutup saja; pembuka disimpan di msg.doc.intro
        finalRawText = exFinal.after;
      }
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

      for (const m of (docResult ? [] : matchers)) {
        const found = finalRawText.match(m.regex);
        if (found) {
          finalRawText = finalRawText.replace(found[0], '');
          try {
            await new Promise(r => setTimeout(r, 1000));
            const title = found[1].trim();
            const content = found[2].trim();
            // 🔧 FIX: ekstensi lama di judul dibuang dulu, lalu dipasang ekstensi asli
            // (pdf/docx/xlsx/pptx). Sebelumnya jadi "X.pdf.pdf", "X.csv.excel", "X.docs", "X.ppt".
            const baseName = stripFileExtension(title) || 'Dokumen';
            const dataUrl = await m.generator(baseName, content);
            generatedFileInfo = { name: `${baseName}.${FILE_EXT[m.type] || 'file'}`, dataUrl, type: m.type };
          } catch (e) { console.error(`Gagal bikin ${m.type}:`, e); }
          break;
        }
      }

      let streamCleanFinal = normalizeImageFence(hideTagsWhileStreaming(finalRawText), true);
      const { clean: cleanFinal, suggestions: finalSugg } = parseSuggestions(streamCleanFinal);
      let { clean: finalCleanText, canvasNodes } = parseCanvasTags(cleanFinal);
      // 🔧 BARU: blok ```chart diambil dari teks SEBELUM sitasi dihitung (posisi pil sumber tetap pas)
      const { clean: textWithoutCharts, charts: parsedCharts } = parseChartBlocks(finalCleanText);
      finalCleanText = textWithoutCharts;

      if (docResult) { try { docResult.docs.forEach(d => parseDoc(d.kind as any, d.name, d.source)); } catch { docResult = null; } }
      if (generatedFileInfo) {
        finalCleanText = `[${generatedFileInfo.type}_FILE: "${generatedFileInfo.name}"](${generatedFileInfo.dataUrl})\n\n` + finalCleanText;
      }

      // Grafik kurs asli dipasang di dalam jawaban lewat media (awal), bukan di akhir pesan; blok chart karangan model diabaikan
      const finalCharts: ChartSpec[] = fxChart ? ((generatedFileInfo || docResult) ? [fxChart] : []) : parsedCharts;

      const validFinalSuggestions = Array.isArray(finalSugg) ? finalSugg.filter(s => typeof s === 'string' && s.trim().length > 0) : [];

      // 🔧 BARU: sitasi per paragraf (disimpan terpisah dari teks, jadi copy/simpan/memori tetap bersih)
      // Dari Gemini (groundingSupports) + pelengkap: paragraf yang menyebut judul / nama situs sumber ikut dapat pil
      const groundedCitations: Citation[] =
        !generatedFileInfo && !docResult && sources.length > 0 && lastSupports.length > 0
          ? buildCitations(finalCleanText, lastSupports, lastChunkList, uriToIndex)
          : [];
      const citations: Citation[] = !generatedFileInfo && !docResult && sources.length > 0
        ? manualCitations(finalCleanText, sources, groundedCitations)
        : groundedCitations;

      // 🖼️ Foto / video / kartu link dari sumber jawaban (tersebar per paragraf yang menyitir sumbernya)
      resolver.request(videoUrlsInText(finalCleanText), true);
      await resolver.settle(2200);
      const media = (generatedFileInfo || docResult)
        ? []
        : buildMedia({ text: finalCleanText, citations, sources, resolver, photoCap: photoCapFor(intent.photos), links: siteCards, newsPool, chart: fxChart, allowWiki: true, videoHits, brandHints: finalText.toLowerCase().match(/[a-z0-9]{4,}/g) || [] });

      setChatSessions(prev => {
        const next = prev.map(session =>
          session.id === chatId
            ? {
                ...session,
                messages: session.messages.map((m, idx) =>
                  idx === session.messages.length - 1
                    ? ({ ...m, content: finalCleanText, suggestions: validFinalSuggestions, image: finalGeneratedImage, sources: sources.length > 0 ? sources : m.sources, ...(citations.length > 0 ? { citations } : {}), ...(finalCharts.length > 0 ? { charts: finalCharts } : {}), ...(media.length > 0 ? { media } : {}), ...(makeFlow() ? { flow: makeFlow() } : {}), ...(docResult ? { docs: docResult.docs, docIntro: docResult.intro, docLive: undefined } : {}) } as any)
                    : m
                ),
              }
            : session
        );
        const updated = next.find(s => s.id === chatId);
        if (updated && !updated.isTemporary) syncSessionToDb(updated);
        return next;
      });

      if (canvasNodes && Array.isArray(canvasNodes)) window.dispatchEvent(new CustomEvent('cylen-canvas-update', { detail: canvasNodes }));
      
      if (!isTemporary) autoSaveMemory([...currentMessages.map(m => ({ role: m.role, content: m.content })), { role: 'assistant' as const, content: finalCleanText }]).catch(() => {});

    } catch (error: any) {
      console.error(error);

      // 🔧 Tipe error sekarang akurat. Kartu "Connection Issue" hanya untuk offline / jaringan
      // beneran bermasalah. Server AI sibuk → 'server'. Bug di kode sendiri → 'failed'.
      let errorType: 'offline' | 'timeout' | 'failed' | 'limit' | 'server' = 'failed';
      if (error instanceof ConnectionError) {
        errorType = error.type;
      } else if (!navigator.onLine) {
        errorType = 'offline';
      }

      updateChat(
        chatId,
        [...currentMessages, { role: 'assistant', content: '', timestamp: formatTimestamp(), isConnectionError: true, connectionErrorType: errorType } as any],
        undefined,
        true,
      );
    } finally {
      sendFinished = true;
      docNote.clear(chatId);
      if (typer.timer) { clearInterval(typer.timer); typer.timer = null; }
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
    // 🔧 FIX kecil sekalian: sebelumnya parameter pdfs dikirim `undefined` di sini,
    // jadi kalau user retry pesan yang ada lampiran PDF-nya, PDF itu ilang pas
    // di-generate ulang. Sekarang ikutin pdfs dari pesan aslinya.
    sendMessage(lastUserMsg.content, lastUserMsg.image || null, lastUserMsg.images, lastUserMsg.pdfs, undefined, newMessages);
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

  return { chatSessions, activeChatId, setActiveChatId, messages, isSending, isSearching, webCount, postCount, searchSources, searchStage, searchQueries, searchTopic, searchStartedAt, searchNotes, loadingVariant, activityStatus, sendMessage, createNewChat, togglePin, pinnedMessages, retryLastMessage, chatMode, setChatMode, isTemporary, renameChatSession, pinChatSession, deleteChatSession };
}
