import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { Pin } from 'lucide-react';
import { ChatBubble } from '../components/chat';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { SearchingIndicator } from '../components/chat/components/search/SearchingIndicator';
import type { SearchStage } from '../components/chat/components/search/SearchingIndicator';
import type { LoadingVariant } from '../services/narratorService';
import type { SourceLike } from '../components/chat/components/search/sourceUtils';
import { Message } from '../types';
import { HelixNote } from '../components/chat/components/docs/DocViews';
import { useDocNote } from '../lib/docNoteStore';
import { stripPasted } from '../lib/pasted';
import { usePageText } from '../lib/i18n';
import { NOTICE_NS, NOTICE_TEXT } from '../lib/noticeText';
import { APP_NS, APP_TEXT } from '../lib/appText';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  // 🔧 dibuat opsional: App.tsx dulu tidak pernah mengirim prop ini
  webCount?: number;
  postCount?: number;
  // 🔧 BARU: sumber pencarian yang sedang masuk (buat chip domain di loading pencarian)
  searchSources?: SourceLike[];
  // 🔧 BARU: progres loading pencarian (langkah, kata kunci, waktu mulai)
  searchStage?: SearchStage;
  searchQueries?: string[];
  // 🔧 BARU: kalimat loading dari pemahaman model (mis. "mencari berita di teliernews.com")
  searchTopic?: string;
  searchStartedAt?: number | null;
  searchNotes?: string[];
  loadingVariant?: LoadingVariant | null;
  activityStatus?: 'idle' | 'image' | 'pdf' | 'docs' | 'excel' | 'ppt' | 'ebook';
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (index: number) => void;
  pinnedMessages: Message[];
  onSaveItem?: (text: string) => void;
  onRetry?: (index?: number) => void;
  desktopWelcomeMode?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  isCanvasActive?: boolean;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  onUpgradeClick?: () => void;
  isTemporary?: boolean;
}

// ── FIX LAG: bikin callback yang identitasnya STABIL tapi selalu manggil versi terbaru ──
function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}

// ── FIX LAG KETIK: ChatBubble dibungkus React.memo.
// Dulu tiap ketikan huruf (inputText berubah) SEMUA bubble + markdown-nya dirender ulang.
// Sekarang bubble yang datanya nggak berubah dilewati. ──
const MemoChatBubble = React.memo(ChatBubble as React.ComponentType<any>);

// 🔧 Kartu error sekarang menjelaskan penyebab SEBENARNYA.
// "Connection Issue" hanya untuk offline / jaringan; masalah server AI & kesalahan
// lain punya judul dan pesan sendiri, jadi user nggak dikira internetnya yang jelek.
// Teksnya diambil dari terjemahan statis (namespace 'noticeUi'), jadi ikut bahasa yang dipilih.
const ConnectionErrorCard = ({ type, detail, onRetry }: { type?: string; detail?: string; onRetry?: () => void }) => {
  const nx = usePageText(NOTICE_NS, NOTICE_TEXT);
  const isLimit = type === 'limit';
  const ERROR_COPY: Record<string, { title: string; text: string }> = {
    offline: { title: nx.offlineTitle, text: nx.offlineText },
    timeout: { title: nx.offlineTitle, text: nx.timeoutText },
    server: { title: nx.serverTitle, text: nx.serverText },
    empty: { title: nx.emptyTitle, text: nx.emptyText },
    failed: { title: nx.failedTitle, text: nx.failedText },
    limit: { title: nx.limitTitle, text: nx.limitText },
  };
  const copy = ERROR_COPY[type || 'failed'] || ERROR_COPY.failed;
  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isLimit ? (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 00-3.42 0z" />
          </svg>
        )}
        <span className={`font-bold text-[15px] ${isLimit ? 'text-red-500' : 'text-[var(--text)]'}`}>
          {copy.title}
        </span>
      </div>
      <p className="text-sm text-[var(--mu)] leading-relaxed">{copy.text}</p>
      {detail ? <p className="text-[11px] text-[var(--mu)] opacity-70 font-mono break-words">{nx.code}: {detail}</p> : null}
      {!isLimit && onRetry && (
        <button
          onClick={() => onRetry()}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all"
        >
          {nx.retry}
        </button>
      )}
    </div>
  );
};

const GhostEmptyState = () => {
  const ax = usePageText(APP_NS, APP_TEXT);
  return (
  <div className="flex-1 flex flex-col items-center justify-center pointer-events-none select-none" style={{ paddingBottom: '20vh' }}>
    <style>{`
      @keyframes ghost-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
      @keyframes ghost-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      [data-sidebar-open="true"] .cylen-float-ghost { animation-play-state: paused !important; }
    `}</style>
    <div className="cylen-float-ghost" style={{ animation: 'ghost-float 3.5s ease-in-out infinite, ghost-in 0.4s ease-out both' }}>
      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
        <path d="M9 10h.01" /><path d="M15 10h.01" />
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
      </svg>
    </div>
    <div className="flex flex-col items-center gap-3 text-center mt-6" style={{ animation: 'ghost-in 0.4s 0.12s ease-out both', opacity: 0 }}>
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', opacity: 0.85, letterSpacing: '-0.01em' }}>{ax.privTitle}</span>
      <span style={{ fontSize: 14, color: 'var(--text)', opacity: 0.4, lineHeight: 1.5, maxWidth: 260 }}>{ax.privText}</span>
    </div>
  </div>
  );
};

// ── LOGO BULAN SABIT — PNG di-recolor pakai CSS mask, abu subtle, ngikut tema ──
// ★ keyboard.ts menggerakkan logo ini lewat properti CSS `scale` + `translate` (bukan `transform`),
//   jadi tidak bentrok dengan animasi melayang (logo-float) dan tidak memicu hitung ulang tata letak.
const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center select-none pointer-events-none relative overflow-hidden" style={{ paddingBottom: '14vh' }}>
    <style>{`
      @keyframes logo-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
      @keyframes logo-fade-in { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
      /* Sidebar lagi kebuka → logo berhenti melayang, biar blur di belakang sidebar nggak dihitung ulang tiap frame */
      [data-sidebar-open="true"] .cylen-float-logo { animation-play-state: paused !important; }
    `}</style>
    <div
      role="img"
      aria-label="Cylen"
      data-kb-logo
      className="cylen-float-logo"
      style={{
        width: 280,
        height: 280,
        // ★ jangan sampai logo kegencet kalau ruang menyempit
        flexShrink: 0,
        backgroundColor: 'var(--mu)',
        opacity: 0.35,
        WebkitMaskImage: 'url(/82374-removebg-preview.png)',
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskImage: 'url(/82374-removebg-preview.png)',
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        // FIX LAG: kasih layer GPU sendiri biar animasi melayang nggak bikin repaint elemen lain
        willChange: 'transform',
        animation: 'logo-float 3.5s ease-in-out infinite, logo-fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    />
  </div>
);

// ── LOADING ──
// • isSearching = true  → loading KHUSUS pencarian / penjelasan (3 titik abstrak + kalimat hidup dari pemahaman model)
// • isSearching = false → loading chat biasa (helix 2 titik, polos tanpa teks) — TIDAK diubah
// Pesan baru selalu mulai dengan helix; begitu model menilai pesannya bukan chat biasa, helix memudar halus
// lalu berganti ke loading pencarian. Loading gambar / video / dokumen dll ditangani terpisah (activityStatus di ChatBubble).
const HelixLoadingLegacy: React.FC = () => (
  <div className="flex flex-col gap-2 py-3 pl-1 select-none pointer-events-none">
    <style>{`
      @keyframes helix-h-1 {
        0%, 100% { transform: translateX(0px) scale(1); opacity: 1; }
        25% { transform: translateX(14px) scale(0.7); opacity: 0.4; }
        50% { transform: translateX(0px) scale(0.5); opacity: 0.15; }
        75% { transform: translateX(-14px) scale(0.7); opacity: 0.4; }
      }
      @keyframes helix-h-2 {
        0%, 100% { transform: translateX(0px) scale(0.5); opacity: 0.15; }
        25% { transform: translateX(-14px) scale(0.7); opacity: 0.4; }
        50% { transform: translateX(0px) scale(1); opacity: 1; }
        75% { transform: translateX(14px) scale(0.7); opacity: 0.4; }
      }
      @keyframes cy-helix-out { to { opacity: 0; transform: translateY(-4px); } }
    `}</style>

    {/* helix saja, tanpa teks apapun */}
    <div className="flex items-center gap-3">
      <div style={{ position: 'relative', width: '36px', height: '14px', flexShrink: 0 }}>
        <div style={{ position: 'absolute', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text)', animation: 'helix-h-1 1.2s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text)', animation: 'helix-h-2 1.2s ease-in-out infinite' }} />
      </div>
    </div>
  </div>
);

// ── Animasi halus: pesan yang baru dikirim naik dari bawah, loading muncul pelan lalu menutup (mengecil) saat jawaban datang ──
const FLOW_CSS = `
@keyframes cySendIn { from { opacity: 0; transform: translateY(18px) scale(.95); } to { opacity: 1; transform: none; } }
.cy-send-in { transform-origin: 100% 100%; animation: cySendIn .46s cubic-bezier(.22,.8,.24,1) both; }
@keyframes cyLoadIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.cy-load-in { animation: cyLoadIn .4s cubic-bezier(.22,.8,.24,1) .14s both; }
@media (prefers-reduced-motion: reduce) { .cy-send-in, .cy-load-in { animation: none; } }
`;

/**
 * Pembungkus loading: muncul dengan fade + naik pelan; saat jawaban datang loading tidak hilang mendadak,
 * tapi memudar & mengecil (tinggi → 0) selama ±0,3 dtk lalu dilepas, sehingga jawaban muncul mulus tanpa lompatan.
 * Margin negatif saat menutup = jarak `gap` kolom pesan, jadi tata letak akhirnya sama persis dengan saat loading dilepas.
 */
const LoadingSlot: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) => {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), 340);
    return () => clearTimeout(t);
  }, [show]);
  if (!show && !mounted) return null;
  const closing = !show;
  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateRows: closing ? '0fr' : '1fr',
        opacity: closing ? 0 : 1,
        marginTop: closing ? -40 : -16,
        marginBottom: closing ? 0 : 8,
        transition: 'grid-template-rows .32s cubic-bezier(.4,0,.2,1), opacity .22s ease, margin .32s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ minHeight: 0, overflow: closing ? 'hidden' : 'visible' }}>
        <div className={closing ? undefined : 'cy-load-in'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>{children}</div>
      </div>
    </div>
  );
};

// Helix polos; kalau user minta dibuatkan dokumen → helix + kalimat singkat berkilau di SATU baris
const HelixLoadingSwitch: React.FC = () => {
  const note = useDocNote();
  if (note) return <HelixNote text={note.text} />;
  return <HelixLoadingLegacy />;
};

const CylenDynamicLoading: React.FC<{
  isSearching: boolean;
  userPrompt: string;
  webCount?: number;
  sources?: SourceLike[];
  stage?: SearchStage;
  queries?: string[];
  topic?: string;
  startedAt?: number | null;
  notes?: string[];
  variant?: LoadingVariant | null;
}> = ({ isSearching, userPrompt, sources, stage, queries, topic, startedAt, notes, variant }) => {
  // helix yang sedang "pamit" saat berganti ke loading pencarian (perpindahan mulus, tanpa lompatan)
  const [leaving, setLeaving] = useState(false);
  const wasSearching = useRef(isSearching);
  useEffect(() => {
    if (isSearching && !wasSearching.current) {
      wasSearching.current = true;
      setLeaving(true);
      const t = setTimeout(() => setLeaving(false), 280);
      return () => clearTimeout(t);
    }
    wasSearching.current = isSearching;
  }, [isSearching]);

  if (isSearching || variant) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {leaving && (
          <div style={{ position: 'absolute', left: 0, top: 0, animation: 'cy-helix-out .26s ease both' }}>
            <HelixLoadingSwitch />
          </div>
        )}
        <SearchingIndicator userPrompt={userPrompt} topic={topic} sources={sources} stage={stage} queries={queries} startedAt={startedAt} notes={notes} variant={isSearching ? null : variant} />
      </div>
    );
  }

  return <HelixLoadingSwitch />;
};

export const ChatPage: React.FC<ChatPageProps> = ({
  messages,
  isSending,
  isSearching,
  webCount = 0,
  postCount = 0,
  searchSources = [],
  searchStage,
  searchQueries = [],
  searchTopic = '',
  searchStartedAt = null,
  searchNotes = [],
  loadingVariant = null,
  activityStatus = 'idle',
  inputText,
  setInputText,
  onSend,
  attachedImage,
  setAttachedImage,
  onTogglePin,
  pinnedMessages,
  onSaveItem,
  onRetry,
  desktopWelcomeMode = false,
  mode = 'auto',
  onModeChange,
  isCanvasActive = false,
  onOpenCanvas,
  onCloseCanvas,
  onUpgradeClick,
  isTemporary = false,
}) => {
  const ax = usePageText(APP_NS, APP_TEXT);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [replyingToMsg, setReplyingToMsg] = useState<Message | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  // 🔧 FIX "pesan nyangkut di bawah": begitu user mengirim pesan, pesan itu LANGSUNG dinaikkan ke atas layar
  // (seperti ChatGPT/Claude), tidak menunggu jawaban AI. Ruang kosong di bawah (spacer) dihitung langsung
  // di DOM sebelum layar digambar, jadi scroll tidak pernah terpotong; spacer menyusut sendiri saat jawaban memanjang.
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const anchorRef = useRef(false); // true = lagi menahan posisi (keyboard menutup / loading muncul)
  const anchorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevCountRef = useRef(messages.length);
  const prevFirstRef = useRef<Message | undefined>(messages[0]);
  const firstRunRef = useRef(true);
  const bottomAnchorRef = useRef(false); // true = baru buka chat lama: tahan posisi di pesan terakhir selagi gambar memuat
  const bottomTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ★ BARU: penanda "user BARU SAJA menekan kirim". Selama penanda ini hidup, pesan user yang masuk
  // PASTI dinaikkan ke atas layar — tidak peduli bentuk array `messages` dari parent berubah seperti apa
  // (objek pesan dibuat ulang, pesan user + placeholder AI masuk bareng, dsb).
  const sendPendingRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;
  const markSent = useCallback(() => {
    sendPendingRef.current = true;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    // kalau pesan tak kunjung masuk (gagal kirim), penanda dilepas sendiri
    sendTimerRef.current = setTimeout(() => { sendPendingRef.current = false; }, 10000);
  }, []);
  useEffect(() => () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
    if (bottomTimerRef.current) clearTimeout(bottomTimerRef.current);
  }, []);

  const autoScrollEnabled = useRef(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
    const spacerH = spacerRef.current ? parseFloat(spacerRef.current.style.height || '0') || 0 : 0;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight - spacerH;
    setShowScrollButton(messages.length > 0 && distanceToBottom >= 200);
    if (distanceToBottom <= 150) autoScrollEnabled.current = true;
    else if (distanceToBottom > 300) autoScrollEnabled.current = false;
  };

  const lastUserIndex = messages.reduce((acc, msg, i) => (msg.role === 'user' ? i : acc), -1);
  // pesan user yang BARU dikirim (bertambah 1–2 pesan sekaligus) → ditandai supaya masuknya beranimasi halus.
  // Membuka chat lama / pindah chat (jumlah pesan melonjak) tidak dianimasikan.
  const prevLenRef = useRef(messages.length);
  const freshRef = useRef<Set<number>>(new Set());
  if (messages.length !== prevLenRef.current) {
    const grew = messages.length - prevLenRef.current;
    if (grew > 0 && grew <= 2 && prevLenRef.current > 0) {
      for (let k = prevLenRef.current; k < messages.length; k++) if (messages[k]?.role === 'user') freshRef.current.add(k);
    } else if (grew < 0 || grew > 2) freshRef.current.clear();
    prevLenRef.current = messages.length;
  }

  // Ruang kosong di bawah supaya pesan yang di-pin bisa benar-benar naik ke atas.
  // Padding bawah (160 + 16) dan jarak antar-elemen (40) ikut dihitung.
  const updateSpacer = useCallback(() => {
    const c = scrollContainerRef.current;
    const sp = spacerRef.current;
    const end = chatEndRef.current;
    if (!c || !sp || !end) return;
    const idx = pinnedIndexRef.current;
    const el = idx === null ? null : document.getElementById(`message-${idx}`);
    if (!el) { sp.style.height = '0px'; return; }
    const distance = end.getBoundingClientRect().top - el.getBoundingClientRect().top;
    sp.style.height = `${Math.max(0, Math.ceil(c.clientHeight - distance - 200))}px`;
  }, []);

  const pinToTop = useCallback((idx: number, smooth: boolean) => {
    const c = scrollContainerRef.current;
    const el = document.getElementById(`message-${idx}`);
    if (!c || !el) return;
    const offset = el.getBoundingClientRect().top - c.getBoundingClientRect().top;
    c.scrollTo({ top: c.scrollTop + offset - 8, behavior: (smooth ? 'smooth' : 'instant') as ScrollBehavior });
  }, []);

  // Ada pesan baru dari user → langsung naik ke atas (sebelum layar digambar), tanpa menunggu isSending / jawaban AI.
  useLayoutEffect(() => {
    const prevLen = prevCountRef.current;
    const sameChat = prevLen === 0 || messages[0] === prevFirstRef.current;
    prevCountRef.current = messages.length;
    prevFirstRef.current = messages[0];

    const isFirstRun = firstRunRef.current;
    firstRunRef.current = false;

    // ── ★ User BARU SAJA kirim pesan → pesan itu SELALU naik ke atas layar ──
    // Cadangan: kalau ChatPage ikut ter-mount ulang tepat saat kirim (mis. pindah dari layar sambutan),
    // penandanya hilang, jadi dikenali dari isSending + chat yang baru berisi 1–2 pesan.
    const sendJustLanded =
      (sendPendingRef.current && messages.length > prevLen) ||
      (isFirstRun && isSendingRef.current && messages.length > 0 && messages.length <= 2);
    if (sendJustLanded) {
      let sentIdx = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          if (i >= prevLen || !sameChat || isFirstRun) sentIdx = i;
          break;
        }
      }
      if (sentIdx !== -1) {
        sendPendingRef.current = false;
        if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
        // lepas kunci "tahan di pesan terakhir" (chat lama baru dibuka) — kalau tidak, dia menarik layar balik ke bawah
        bottomAnchorRef.current = false;
        if (bottomTimerRef.current) clearTimeout(bottomTimerRef.current);
        autoScrollEnabled.current = true;
        pinnedIndexRef.current = sentIdx;
        updateSpacer();
        pinToTop(sentIdx, sameChat && !isFirstRun);
        // Tahan posisi selagi layout berubah (keyboard menutup, loading muncul) supaya pesan tidak turun lagi
        anchorRef.current = true;
        if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
        anchorTimerRef.current = setTimeout(() => { anchorRef.current = false; }, 1400);
        return;
      }
    }

    // Chat lama dibuka (dari riwayat / refresh): langsung ke PESAN TERAKHIR, bukan di awal
    const isLoad = messages.length > 0 && (isFirstRun || !sameChat || (prevLen === 0 && messages.length > 2));
    if (isLoad) {
      pinnedIndexRef.current = null;
      updateSpacer();
      autoScrollEnabled.current = true;
      const c = scrollContainerRef.current;
      if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'instant' as ScrollBehavior });
      bottomAnchorRef.current = true;
      if (bottomTimerRef.current) clearTimeout(bottomTimerRef.current);
      bottomTimerRef.current = setTimeout(() => { bottomAnchorRef.current = false; }, 1500);
      return;
    }

    if (messages.length === 0 || !sameChat) {
      // chat kosong / pindah chat → tidak ada pesan yang di-pin
      pinnedIndexRef.current = null;
      updateSpacer();
      if (messages.length === 0) {
        setShowScrollButton(false);
        autoScrollEnabled.current = true;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
      return;
    }

    const added = messages.length - prevLen;
    if (added >= 1 && added <= 2) {
      const off = messages.slice(prevLen).findIndex(m => m.role === 'user');
      if (off !== -1) {
        const idx = prevLen + off;
        autoScrollEnabled.current = true;

        // 🎙️ Pesan dari Cylen Voice masuk langsung ke `messages`: tanpa spacer, scroll hanya kalau chat memang panjang.
        if (messages[idx].source === 'voice') {
          pinnedIndexRef.current = null;
          updateSpacer();
          window.setTimeout(() => {
            const c = scrollContainerRef.current;
            if (!c || c.scrollHeight <= c.clientHeight + 4) return;
            document.getElementById(`message-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
          return;
        }

        bottomAnchorRef.current = false;
        pinnedIndexRef.current = idx;
        updateSpacer();
        pinToTop(idx, true);
        anchorRef.current = true;
        if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
        anchorTimerRef.current = setTimeout(() => { anchorRef.current = false; }, 1400);
        return;
      }
    }
    updateSpacer(); // isi pesan berubah (AI sedang mengetik): hitung ulang ruang kosong
  }, [messages, updateSpacer, pinToTop]);

  const scrollToBottom = () => {
    autoScrollEnabled.current = true;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const handleSendWrapper = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    let finalPrompt = directText || inputText;
    if (finalPrompt.trim() !== '') setLastUserPrompt(finalPrompt);
    if (replyingToMsg && finalPrompt.trim() !== '') {
      const rawText = stripPasted(replyingToMsg.content).replace(/\n/g, ' ');
      const snippet = rawText.length > 60 ? rawText.substring(0, 60) + '...' : rawText;
      finalPrompt = `[Membalas pesan: "${snippet.replace(/"/g, "'")}"]\n\n${finalPrompt}`;
      setReplyingToMsg(null);
    }
    markSent(); // ★ pesan ini nanti dinaikkan ke atas layar
    if (!directText) { setInputText(''); onSend(images, pdfs, finalPrompt); }
    else { onSend(images, pdfs, finalPrompt); }
  };

  // FIX LAG: semua handler yang dikirim ke bubble dibikin stabil (identitas tetap, isi selalu terbaru),
  // supaya React.memo di bubble benar-benar bisa melewati render.
  const handleSuggest = useStableCallback((text: string) => handleSendWrapper(undefined, undefined, text));

  // 🔧 FIX "Ulangi": versi lama manggil handleSendWrapper() lewat setTimeout, tapi
  // closure-nya masih pegang `inputText` LAMA (kosong) → yang terkirim teks kosong,
  // jadi tidak terjadi apa-apa. Sekarang teks dikirim LANGSUNG sebagai pesan baru
  // (beserta gambar/PDF dari pesan aslinya kalau ada). Draft di kolom ketik tidak disentuh.
  const handleResend = useStableCallback((content: string) => {
    if (isSending || !content.trim()) return;
    const original = [...messages]
      .reverse()
      .find(m => m.role === 'user' && (m.content || '').trim() === content.trim());
    markSent(); // ★ pesan baru ini juga dinaikkan ke atas layar
    onSend(original?.images, original?.pdfs, content);
  });

  // 🔧 "Edit": teks pesan dimasukkan lagi ke kolom ketik, lalu kolom ketik difokuskan
  // dengan kursor di akhir teks. User tinggal ubah lalu kirim.
  const handleEditMessage = useStableCallback((content: string) => {
    setInputText(content);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLTextAreaElement>('footer textarea:not([aria-hidden="true"])');
      if (!el) return;
      el.focus({ preventScroll: true }); // jangan sampai browser menggeser layar chat
      try { el.setSelectionRange(content.length, content.length); } catch { /* abaikan */ }
    });
  });

  const handleSwipeReply = useCallback((m: Message) => setReplyingToMsg(m), []);

  const lastMsg = messages[messages.length - 1];
  const lastAiMsgHasContent = lastMsg && lastMsg.role === 'assistant' && ((!!lastMsg.content && lastMsg.content.trim().length > 0) || !!(lastMsg as any).docLive);
  const showLoading = isSending && !lastAiMsgHasContent && activityStatus === 'idle';
  const hasUserMessage = messages.some(m => m.role === 'user');
  const isEmptyChat = !hasUserMessage && !isSending;

  // Ukuran isi/layar berubah (jawaban AI memanjang, keyboard muncul) → hitung ulang ruang kosong,
  // dan selama masa "tahan posisi" pesan yang di-pin dijaga tetap di atas.
  useEffect(() => {
    const content = contentRef.current;
    const container = scrollContainerRef.current;
    if (!content || !container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      updateSpacer();
      if (anchorRef.current && pinnedIndexRef.current !== null) pinToTop(pinnedIndexRef.current, false);
      if (bottomAnchorRef.current) container.scrollTo({ top: container.scrollHeight, behavior: 'instant' as ScrollBehavior });
    });
    ro.observe(content);
    ro.observe(container);
    return () => ro.disconnect();
  }, [isEmptyChat, updateSpacer, pinToTop]);

  // User mulai scroll sendiri → lepas kunci posisi
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const stop = () => { anchorRef.current = false; bottomAnchorRef.current = false; };
    c.addEventListener('touchstart', stop, { passive: true });
    c.addEventListener('wheel', stop, { passive: true });
    c.addEventListener('mousedown', stop);
    return () => {
      c.removeEventListener('touchstart', stop);
      c.removeEventListener('wheel', stop);
      c.removeEventListener('mousedown', stop);
    };
  }, [isEmptyChat]);

  if (desktopWelcomeMode) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pointer-events-auto">
        <ChatInput inputText={inputText} setInputText={setInputText} onSend={(imgs, pdfs, txt) => handleSendWrapper(imgs, pdfs, txt)} isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage} compact mode={mode} onModeChange={onModeChange} isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas} onUpgradeClick={onUpgradeClick} replyingTo={replyingToMsg} onCancelReply={() => setReplyingToMsg(null)} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg)]">

      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 relative z-30 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--bd)] border-opacity-40">
          <div className="max-w-3xl mx-auto">
            <div
              onClick={() => {
                const idx = messages.indexOf(pinnedMessages[pinnedMessages.length - 1]);
                if (idx !== -1) document.getElementById(`message-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="flex items-center gap-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-[var(--bd)] transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Pin size={14} className="text-[var(--at)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--mu)] mb-0.5">{ax.pinned}</p>
                <p className="text-[13px] text-[var(--text)] truncate font-medium">{pinnedMessages[pinnedMessages.length - 1].content.slice(0, 85)}</p>
              </div>
              {pinnedMessages.length > 1 && (
                <div className="px-2 py-1 bg-[var(--bd)] rounded-lg text-[10px] font-black text-[var(--mu)]">+{pinnedMessages.length - 1}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layar chat DIAM saat keyboard muncul: yang naik cuma kolom ketik (data-kb-lift di <footer> ChatInput)
          dan logo layar kosong (data-kb-logo). Tidak ada lagi data-kb-pad di sini. */}
      <style>{FLOW_CSS}</style>
      <main ref={scrollContainerRef} onScroll={checkScroll} className="flex-1 overflow-y-auto p-4 md:px-8 pt-6 flex flex-col relative z-10 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
        {isEmptyChat ? (
          isTemporary ? <GhostEmptyState /> : <EmptyState />
        ) : (
          <div ref={contentRef} className="max-w-3xl mx-auto flex flex-col gap-10 w-full pb-[160px]">
            {messages.map((msg, i) => {
              const isConnectionError = (msg as any).isConnectionError;
              const isThisLastMessage = i === messages.length - 1;
              const showLoadingHere = showLoading && i === lastUserIndex;

              return (
                <React.Fragment key={i}>
                  <div id={`message-${i}`} className={freshRef.current.has(i) ? 'w-full cy-send-in' : 'w-full'}>
                    {isConnectionError ? (
                      <ConnectionErrorCard
                        type={(msg as any).connectionErrorType}
                        detail={(msg as any).connectionErrorDetail}
                        onRetry={onRetry}
                      />
                    ) : (
                      <MemoChatBubble
                        msg={msg}
                        msgIndex={i}
                        isLast={isThisLastMessage}
                        activityStatus={isThisLastMessage && isSending ? activityStatus : 'idle'}
                        suggestions={msg.suggestions}
                        onSuggest={handleSuggest}
                        onResend={handleResend}
                        onEdit={handleEditMessage}
                        onTogglePin={onTogglePin}
                        onSaveItem={onSaveItem}
                        onRegenerate={onRetry}
                        onSwipeToReply={handleSwipeReply}
                        isStreaming={false}
                      />
                    )}
                  </div>

                  {i === lastUserIndex && (
                    <LoadingSlot show={showLoadingHere}>
                      <CylenDynamicLoading
                        isSearching={isSearching}
                        userPrompt={lastUserPrompt}
                        webCount={webCount}
                        sources={searchSources} stage={searchStage} queries={searchQueries} topic={searchTopic} startedAt={searchStartedAt} notes={searchNotes} variant={loadingVariant}
                      />
                    </LoadingSlot>
                  )}
                </React.Fragment>
              );
            })}

            {showLoading && lastUserIndex === -1 && (
              <div className="w-full flex flex-col items-start mb-2">
                <CylenDynamicLoading
                  isSearching={isSearching}
                  userPrompt={lastUserPrompt}
                  webCount={webCount}
                  sources={searchSources} stage={searchStage} queries={searchQueries} topic={searchTopic} startedAt={searchStartedAt} notes={searchNotes} variant={loadingVariant}
                />
              </div>
            )}

            {/* penanda ujung isi (dipakai tombol ↓ dan untuk menghitung spacer) */}
            <div ref={chatEndRef} style={{ scrollMarginBottom: 150 }} />

            {/* spacer: tingginya dihitung langsung di DOM (updateSpacer), menyusut sendiri saat jawaban AI memanjang */}
            <div ref={spacerRef} style={{ height: 0, flexShrink: 0 }} />
          </div>
        )}
      </main>

      <div className={`absolute bottom-40 right-6 md:right-10 z-[60] transition-all duration-400 ease-out ${showScrollButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-75 pointer-events-none'}`}>
        <button onClick={scrollToBottom} className="w-12 h-12 flex items-center justify-center bg-[var(--ac)] text-[var(--at)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all border border-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* ★ data-kb-lift ada di <footer> di dalam ChatInput */}
      <div className="absolute bottom-0 left-0 w-full z-[100] pointer-events-none">
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          onSend={(imgs, pdfs, txt) => handleSendWrapper(imgs, pdfs, txt)}
          isSending={isSending}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          mode={mode}
          onModeChange={onModeChange}
          isCanvasActive={isCanvasActive}
          onOpenCanvas={onOpenCanvas}
          onCloseCanvas={onCloseCanvas}
          onUpgradeClick={onUpgradeClick}
          replyingTo={replyingToMsg}
          onCancelReply={() => setReplyingToMsg(null)}
        />
      </div>
    </div>
  );
};
