import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { UserPlus, Video, Plus, ArrowLeft, Edit2, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant, Message } from '../types';
import { GroupChatBubble } from '../components/chat/GroupChatBubble';
import { NoticeErrorCard } from '../components/chat/NoticeErrorCard';
import { GroupChatInput } from '../components/chat/GroupChatInput';
import { ZoomOverlay } from '../components/chat/ZoomOverlay';
import { AddAIModal } from '../components/group/AddAIModal';
import { InviteModal } from '../components/group/InviteModal';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { useGroupPresence, PresenceEntry } from '../hooks/useGroupPresence';
import { auth } from '../lib/firebase';
import { SearchingIndicator } from '../components/chat/components/search/SearchingIndicator';
import { useGroupSearch, GroupSearchState } from '../lib/groupSearchStore';
import { useDocNote } from '../lib/docNoteStore';
import { useGroupRun } from '../lib/groupRunStore';
import { HelixNote } from '../components/chat/components/docs/DocViews';
import { stripPasted } from '../lib/pasted';
import { usePageText } from '../lib/i18n';
import { GC_NS, GC_TEXT } from '../lib/gcText';
import { APP_NS, APP_TEXT } from '../lib/appText';
import { NOTICE_NS, NOTICE_TEXT } from '../lib/noticeText';

// ── LOADING AI ──
// • pesan dipahami sebagai pencarian / penjelasan (bukan chat biasa) → label nama AI + 3 titik + kalimat hidup
// • chat biasa → titik dua helix + satu kalimat singkat buatan model (via docNote); selagi dipahami → nama AI + helix saja
// Satu baris loading untuk mode multi-AI: nama + helix + kalimat dari model; AI yang bekerja pakai loading penuh (cari / kode / dokumen)
const RunRow: React.FC<{ name: string; note: string; working: boolean; search?: GroupSearchState | null }> = ({ name, note, working, search }) => {
  const docN = useDocNote();
  const gx = usePageText(GC_NS, GC_TEXT);
  const label = (
    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text)' }}>{name.toUpperCase()}</span>
  );
  if (working && search && search.ai === name) return <CylenDynamicLoading name={name} search={search} />;
  const text = working && docN && docN.text ? docN.text : (note || (working ? gx.working : gx.waiting));
  return (
    <div className="w-full flex flex-col items-start justify-start gap-1 select-none pointer-events-none" style={{ opacity: working ? 1 : 0.6 }}>
      {label}
      <HelixNote text={text} />
    </div>
  );
};

const CylenDynamicLoading: React.FC<{ name: string; search?: GroupSearchState | null }> = ({ name, search }) => {
  const docN = useDocNote();
  if (docN && !(search && search.ai === name)) {
    return (
      <div className="w-full flex flex-col items-start justify-start gap-1 select-none pointer-events-none">
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text)' }}>{name.toUpperCase()}</span>
        <HelixNote text={docN.text} />
      </div>
    );
  }
  if (search && search.ai === name) {
    // Label nama AI (satu kali) + loading pencarian di bawahnya. Bubble AI yang masih kosong disembunyikan, jadi nama tidak dobel.
    return (
      <div className="w-full flex flex-col items-start justify-start gap-2 select-none pointer-events-none">
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text)' }}>
          {name.toUpperCase()}
        </span>
        <SearchingIndicator userPrompt={search.prompt} topic={search.topic} sources={search.sources as any} stage={search.stage} queries={search.queries} notes={search.notes} variant={search.variant ?? null} />
      </div>
    );
  }
  // Selagi pesan dipahami: nama AI + helix saja (tanpa kalimat template). Kalimat singkat buatan model menyusul lewat docNote.
  return (
    <div className="w-full flex flex-col items-start justify-start gap-1 select-none pointer-events-none">
      <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text)' }}>{name.toUpperCase()}</span>
      <HelixNote />
    </div>
  );
};

// ── INDIKATOR NGETIK: tiga titik bergelombang + "X sedang mengetik..." ──
const TypingIndicator: React.FC<{ names: string[] }> = ({ names }) => {
  const gx = usePageText(GC_NS, GC_TEXT);
  const label =
    names.length === 1 ? gx.typing1.split('{a}').join(names[0])
    : names.length === 2 ? gx.typing2.split('{a}').join(names[0]).split('{b}').join(names[1])
    : gx.typingN.split('{a}').join(names[0]).split('{n}').join(String(names.length - 1));

  return (
    <div className="w-full flex items-center justify-start gap-3 py-2 pl-1 select-none pointer-events-none">
      <style>{`
        @keyframes typing-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
      <div className="flex items-center gap-1 shrink-0">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--text)',
              animation: `typing-dot 1.1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-[12px] font-medium text-[var(--text)]/50 truncate">{label}</span>
    </div>
  );
};

// ── KARTU INFO (pengganti teks pil "Grup AI dibuat...") ──
const HintCard: React.FC<{ onDismiss: () => void; canManageAI: boolean }> = ({ onDismiss, canManageAI }) => {
  const gx = usePageText(GC_NS, GC_TEXT);
  const ax = usePageText(APP_NS, APP_TEXT);
  return (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className="w-full rounded-2xl bg-[var(--sf)] border border-[var(--bd)] pl-4 pr-2 py-3.5 flex items-start gap-2 text-left"
  >
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-[var(--text)]">{gx.hintTitle}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text)]/60">
        {canManageAI
          ? gx.hintAdmin
          : gx.hintMember}
      </p>
    </div>
    <button
      onClick={onDismiss}
      aria-label={ax.close}
      className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text)]/40 hover:text-[var(--text)] hover:bg-[var(--text)]/5 active:scale-95 transition-all shrink-0 [-webkit-tap-highlight-color:transparent]"
    >
      <X size={16} strokeWidth={2.5} />
    </button>
  </motion.div>
  );
};

const hintKey = (groupId: string) => `cylen_collab_hint_${groupId}`;
const readHintHidden = (groupId: string) => {
  try { return localStorage.getItem(hintKey(groupId)) === '1'; } catch { return false; }
};

interface GroupChatPageProps {
  activeGroup: GroupSession;
  isSending: boolean;
  onSendMessage: (text: string, images?: string[], pdfs?: { data: string; name: string }[]) => void;
  onAddParticipant: (p: GroupParticipant) => boolean | void | Promise<boolean | void>;
  onRemoveParticipant?: (id: string) => boolean | void | Promise<boolean | void>;
  showToast: (msg: string) => void;
  onBack?: () => void;
  onNavigateProfile?: () => void;
  thinkingAI?: string | null;
}

export const GroupChatPage: React.FC<GroupChatPageProps> = ({
  activeGroup, isSending, onSendMessage, onAddParticipant, onRemoveParticipant, showToast, onBack, onNavigateProfile, thinkingAI
}) => {
  const gx = usePageText(GC_NS, GC_TEXT);
  const nx = usePageText(NOTICE_NS, NOTICE_TEXT);
  const [inputText, setInputText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const [showFullAvatar, setShowFullAvatar] = useState(false);

  // Kartu info bisa ditutup (diingat per Collaboration)
  const [hintHidden, setHintHidden] = useState(() => readHintHidden(activeGroup.id));
  useEffect(() => { setHintHidden(readHintHidden(activeGroup.id)); }, [activeGroup.id]);
  const dismissHint = () => {
    setHintHidden(true);
    try { localStorage.setItem(hintKey(activeGroup.id), '1'); } catch {}
  };

  // ← foto Collaboration dibaca dari dokumen grup (Firestore), bukan localStorage
  const groupAvatar: string | null = activeGroup.avatar ?? null;

  // ← nama terbaru semua manusia di grup + pengirim pesan, dari profil publik
  const humanIds = activeGroup.participants.filter(p => !p.isAI).map(p => p.id);
  const senderIds = activeGroup.messages
    .map(m => (m as any).senderId as string | undefined)
    .filter(Boolean) as string[];
  const getProfile = usePublicProfiles([...humanIds, ...senderIds]);

  // ── Status realtime: siapa yang lagi ngetik / AI lagi menjawab ──
  const myId = auth.currentUser?.uid;
  const myName =
    (myId && getProfile(myId)?.name?.trim()) ||
    activeGroup.participants.find(p => p.id === myId)?.name ||
    auth.currentUser?.displayName ||
    gx.someone;
  const { others: presence, setTyping, setAi } = useGroupPresence(activeGroup.id, myId, myName);

  // ── Siapa yang boleh kelola AI: admin selalu, anggota biasa kalau mode "Setiap anggota" ──
  const aiPolicy: 'admin' | 'members' = activeGroup.aiPolicy === 'members' ? 'members' : 'admin';
  const isAdmin = !!myId && activeGroup.createdBy === myId;
  const canManageAI = isAdmin || aiPolicy === 'members';

  // Kita lagi ngetik → kabari yang lain. Berhenti 3 detik setelah ketikan terakhir.
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (!inputText.trim()) { setTyping(false); return; }
    setTyping(true);
    typingTimerRef.current = setTimeout(() => setTyping(false), 3000);
  }, [inputText, setTyping]);
  useEffect(() => () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); }, []);

  // Kita lagi nunggu AI menjawab → kabari yang lain juga
  // Banyak AI dipanggil sekaligus → semua nama yang belum selesai dikabarkan (dipisah '|')
  const groupRun = useGroupRun(activeGroup.id);
  const pendingKey = groupRun ? groupRun.items.filter(i => i.status === 'queued' || i.status === 'working').map(i => i.name).join('|') : '';
  useEffect(() => { setAi(pendingKey || (thinkingAI ?? null)); }, [pendingKey, thinkingAI, setAi]);

  const resolveName = (e: PresenceEntry) => getProfile(e.uid)?.name?.trim() || e.name || gx.someone;
  const aiThinkingNames = Array.from(new Set(presence.filter(e => e.ai).flatMap(e => String(e.ai).split('|').filter(Boolean))));
  const typingNames = presence.filter(e => e.typing).map(resolveName);

  // ── Scroll gaya ChatGPT: pesan yang KITA kirim naik ke pojok atas layar,
  //    jawaban AI muncul di bawahnya (bukan pesan nempel di dasar layar) ──
  const scrollRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const endMarkerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const pinnedIndexRef = useRef<number | null>(null);
  const prevLenRef = useRef(activeGroup.messages.length);
  const anchorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef(false); // true = lagi nahan posisi awal (gambar/teks masih memuat)
  const bottomAnchorRef = useRef(false); // true = baru buka Collaboration: tahan di pesan terakhir selagi gambar memuat

  // ★ penanda "kita BARU SAJA menekan kirim". Selama hidup, pesan kita yang masuk PASTI dinaikkan ke atas layar,
  // walau pesan kita + placeholder AI masuk bareng, atau pesan belum punya senderId.
  const sendPendingRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markSent = useCallback(() => {
    sendPendingRef.current = true;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    sendTimerRef.current = setTimeout(() => { sendPendingRef.current = false; }, 10000);
  }, []);
  useEffect(() => () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
  }, []);

  // ★ posisi elemen di dalam isi scroll yang TIDAK terpengaruh transform animasi (cy-send-in memakai
  // translate + scale, yang bikin getBoundingClientRect meleset saat pesan baru baru masuk).
  const topInContent = useCallback((el: HTMLElement, c: HTMLElement): number => {
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== c) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
    if (n === c) return y;
    return el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop;
  }, []);

  // Ruang kosong di bawah supaya pesan yang di-pin bisa benar-benar naik ke atas.
  // Otomatis menyusut waktu jawaban AI makin panjang.
  const updateSpacer = useCallback(() => {
    const container = scrollRef.current;
    const spacer = spacerRef.current;
    const end = endMarkerRef.current;
    if (!container || !spacer || !end) return;
    const idx = pinnedIndexRef.current;
    const el = idx === null ? null : document.getElementById(`group-message-${idx}`);
    if (!el) { spacer.style.height = '0px'; return; }
    const distance = topInContent(end, container) - topInContent(el, container);
    spacer.style.height = `${Math.max(0, Math.ceil(container.clientHeight - distance - 28))}px`;
  }, [topInContent]);

  const scrollToIndexTop = useCallback((idx: number, instant = false) => {
    const container = scrollRef.current;
    const el = document.getElementById(`group-message-${idx}`);
    if (!container || !el) return;
    const top = topInContent(el, container) - 12;
    container.scrollTo({ top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth' });
  }, [topInContent]);

  // Collaboration dibuka / halaman di-refresh: langsung ke PESAN TERAKHIR (sama seperti chat pribadi)
  useLayoutEffect(() => {
    const msgs = activeGroup.messages;
    prevLenRef.current = msgs.length;
    pinnedIndexRef.current = null;
    anchorRef.current = false;
    updateSpacer();

    const c = scrollRef.current;
    if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'auto' });
    bottomAnchorRef.current = true;

    // Tahan posisi sebentar selagi gambar/teks masih memuat, lalu lepas
    const t = setTimeout(() => { bottomAnchorRef.current = false; }, 1500);
    return () => clearTimeout(t);
  }, [activeGroup.id]);

  // Ada pesan baru. useLayoutEffect (bukan useEffect) supaya pesan kita naik SEBELUM layar digambar → tidak ada kedip.
  useLayoutEffect(() => {
    const msgs = activeGroup.messages;
    const prevLen = prevLenRef.current;
    prevLenRef.current = msgs.length;
    if (msgs.length <= prevLen) { updateSpacer(); return; } // cuma isi pesan berubah (AI lagi ngetik)

    // Cari pesan KITA di antara pesan baru (bukan cuma pesan terakhir — bisa jadi pesan terakhir itu placeholder AI)
    const meUid = auth.currentUser?.uid;
    const pending = sendPendingRef.current;
    let pinIdx = -1;
    for (let i = msgs.length - 1; i >= prevLen; i--) {
      const m = msgs[i] as any;
      if (m.role !== 'user') continue;
      if (m.senderId ? m.senderId === meUid : pending) { pinIdx = i; break; }
    }

    if (pinIdx !== -1) {
      sendPendingRef.current = false;
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      // lepas kunci "tahan di pesan terakhir" — kalau tidak, dia menarik layar balik ke bawah
      bottomAnchorRef.current = false;
      pinnedIndexRef.current = pinIdx;
      updateSpacer();
      scrollToIndexTop(pinIdx);
      // Tahan posisi di atas selagi layout berubah (keyboard menutup, loading muncul) supaya pesan tidak turun lagi
      anchorRef.current = true;
      if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
      anchorTimerRef.current = setTimeout(() => { anchorRef.current = false; }, 1400);
      requestAnimationFrame(() => { updateSpacer(); scrollToIndexTop(pinIdx); });
      // pin ulang setelah animasi masuk selesai (kalau user belum menyentuh layar)
      [140, 520].forEach(ms => window.setTimeout(() => {
        if (anchorRef.current && pinnedIndexRef.current === pinIdx) { updateSpacer(); scrollToIndexTop(pinIdx, true); }
      }, ms));
    } else {
      // pesan dari teman/AI: kalau ujung isi sudah dekat/terlihat, geser sedikit biar pesan barunya kelihatan
      const c = scrollRef.current;
      const end = endMarkerRef.current;
      if (c && end) {
        const gap = end.getBoundingClientRect().bottom - c.getBoundingClientRect().bottom;
        if (gap < 200) {
          requestAnimationFrame(() => {
            const g2 = end.getBoundingClientRect().bottom - c.getBoundingClientRect().bottom;
            if (g2 > 0) c.scrollBy({ top: g2 + 16, behavior: 'smooth' });
          });
        }
      }
    }
  }, [activeGroup.messages, updateSpacer, scrollToIndexTop]);

  // Ukuran isi/layar berubah (jawaban AI memanjang, keyboard muncul) → hitung ulang ruang kosong
  useEffect(() => {
    const content = contentRef.current;
    const container = scrollRef.current;
    if (!content || !container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      updateSpacer();
      if (anchorRef.current && pinnedIndexRef.current !== null) {
        scrollToIndexTop(pinnedIndexRef.current, true);
      }
      if (bottomAnchorRef.current) container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
    });
    ro.observe(content);
    ro.observe(container);
    return () => ro.disconnect();
  }, [updateSpacer, scrollToIndexTop]);

  // User mulai scroll sendiri → lepas kunci posisi awal
  useEffect(() => {
    const c = scrollRef.current;
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
  }, []);

  // ── Aksi dari popup pesan kita: Ulangi / Edit ──
  const sendRef = useRef(onSendMessage);
  sendRef.current = onSendMessage;
  const handleResend = useCallback((content: string, images?: string[]) => {
    markSent(); // ★ pesan baru ini juga dinaikkan ke atas layar
    sendRef.current(content, images && images.length > 0 ? images : undefined);
  }, [markSent]);
  // Gagal kirim (lampiran terlalu besar / koneksi): beri tahu pengirim
  useEffect(() => {
    const on = (e: any) => {
      const big = e?.detail?.reason === 'size';
      const id = document.documentElement.lang === 'id' || !document.documentElement.lang;
      showToast(big
        ? (id ? 'Lampiran terlalu besar untuk grup ini. Kirim lebih sedikit atau file lebih kecil.' : 'Attachment too large for this group. Send fewer or smaller files.')
        : (id ? 'Pesan gagal terkirim, coba lagi.' : 'Message failed to send. Try again.'));
    };
    window.addEventListener('group-send-failed', on);
    return () => window.removeEventListener('group-send-failed', on);
  }, [showToast]);
  const handleEdit = useCallback((text: string) => {
    setInputText(text); // teks balik ke kolom input, tinggal edit lalu kirim
  }, []);

  // packed = teks ketikan + kartu "Konten yang ditempel" yang sudah digabung oleh kolom ketik
  const handleSend = (images?: string[], pdfs?: { data: string; name: string }[], packed?: string) => {
    const body = packed ?? inputText;
    if (!body.trim() && (!images || images.length === 0) && (!pdfs || pdfs.length === 0)) return;

    let finalInputText = body;
    if (replyingTo) {
      const quote = stripPasted(replyingTo.content).replace(/\s+/g, ' ').replace(/"/g, "'").slice(0, 200);
      finalInputText = `[Membalas pesan: "${quote}"]\n\n${body}`;
    }

    markSent(); // ★ pesan ini nanti dinaikkan ke atas layar
    onSendMessage(finalInputText, images, pdfs);
    setInputText('');
    setReplyingTo(null);
  };

  const participantsLabel = activeGroup.participants
    .map(p => (p.isAI ? p.name : (getProfile(p.id)?.name?.trim() || p.name)))
    .join(', ');

  const groupSearch = useGroupSearch(activeGroup.id);
  const lastMsg = activeGroup.messages[activeGroup.messages.length - 1];
  const lastAiMsgHasContent = lastMsg && lastMsg.role === 'assistant' && !!lastMsg.content && lastMsg.content.trim().length > 0;
  const showLoading = isSending && !lastAiMsgHasContent && thinkingAI && !groupRun;

  // pesan yang BARU masuk (bertambah 1–2 sekaligus) → naik halus; membuka grup / memuat riwayat tidak dianimasikan
  const freshPrevLen = useRef(activeGroup.messages.length);
  const freshRef = useRef<Set<number>>(new Set());
  if (activeGroup.messages.length !== freshPrevLen.current) {
    const grew = activeGroup.messages.length - freshPrevLen.current;
    if (grew > 0 && grew <= 2 && freshPrevLen.current > 0) {
      for (let k = freshPrevLen.current; k < activeGroup.messages.length; k++) if (activeGroup.messages[k]?.role === 'user') freshRef.current.add(k);
    } else if (grew < 0 || grew > 2) freshRef.current.clear();
    freshPrevLen.current = activeGroup.messages.length;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">

      <div className="px-2 py-2 flex items-center justify-between bg-[var(--bg)] z-10 border-none shadow-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 -mr-1 rounded-full hover:bg-[var(--text)]/5 text-[var(--text)] transition-colors active:scale-95 shrink-0 [-webkit-tap-highlight-color:transparent]">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0 py-1">
            <div onClick={() => setShowFullAvatar(true)} className="w-10 h-10 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] font-bold shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
              {groupAvatar ? <img src={groupAvatar} alt={nx.photoAlt} className="w-full h-full object-cover" /> : <Users size={20} strokeWidth={1.8} />}
            </div>
            
            <div className="flex-1 min-w-0 cursor-pointer hover:opacity-80" onClick={onNavigateProfile}>
              <h2 className="text-[16px] font-semibold text-[var(--text)] leading-tight truncate">{activeGroup.title}</h2>
              <p className="text-[12px] text-[var(--text)]/50 leading-tight mt-0.5 truncate">{participantsLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => setShowInviteModal(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/5 transition-colors [-webkit-tap-highlight-color:transparent]"><UserPlus size={20} strokeWidth={2} /></button>
          <button onClick={() => setShowZoom(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/5 transition-colors [-webkit-tap-highlight-color:transparent]"><Video size={20} strokeWidth={2} /></button>
          <button onClick={() => setShowAIModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[12px] font-semibold ml-1 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">{canManageAI && <Plus size={14} strokeWidth={2.5} />} AI</button>
        </div>
      </div>

      {/* Layar chat DIAM saat keyboard muncul: yang naik cuma kolom ketik (data-kb-lift di <footer> GroupChatInput).
          Tidak ada lagi data-kb-pad di sini. */}
      <style>{`
        @keyframes cySendIn { from { opacity: 0; transform: translateY(18px) scale(.95); } to { opacity: 1; transform: none; } }
        .cy-send-in { transform-origin: 100% 100%; animation: cySendIn .46s cubic-bezier(.22,.8,.24,1) both; }
        @media (prefers-reduced-motion: reduce) { .cy-send-in { animation: none; } }
      `}</style>
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 relative" style={{ scrollbarWidth: 'none' }}>
        <div ref={contentRef} className="max-w-2xl mx-auto flex flex-col gap-5 pb-4">
          {activeGroup.messages.map((msg, i) => {
            // Pesan sistem → kartu info yang bisa ditutup (bukan pil)
            if (msg.role === 'system') {
              if (hintHidden) return null;
              return (
                <div key={i} className="w-full">
                  <HintCard onDismiss={dismissHint} canManageAI={canManageAI} />
                </div>
              );
            }

            // ← ganti nama lama di pesan dengan nama profil terbaru pengirim
            const sid = (msg as any).senderId as string | undefined;
            const liveProfile: any = sid ? getProfile(sid) : undefined;
            const liveName = liveProfile?.name?.trim();
            const liveAvatar: string | undefined = liveProfile?.avatar || undefined; // foto profil teman → tampil di bubble
            const shownMsg: Message = (liveName || liveAvatar)
              ? ({ ...msg, ...(liveName ? { senderName: liveName } : {}), ...(liveAvatar ? { senderAvatar: liveAvatar } : {}) } as Message)
              : msg;

            // AI gagal menjawab → kartu gagal + Retry, sama seperti di chat pribadi
            if ((msg as any).notice) {
              const prevUser = [...activeGroup.messages.slice(0, i)].reverse().find(m => m.role === 'user');
              return (
                <div key={i} className="w-full">
                  <NoticeErrorCard
                    name={msg.senderName || 'AI'}
                    type={(msg as any).errorType}
                    detail={(msg as any).errorDetail}
                    onRetry={prevUser && !isSending ? () => handleResend(prevUser.content, (prevUser as any).images) : undefined}
                  />
                </div>
              );
            }

            return (
              <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start", freshRef.current.has(i) && "cy-send-in")}>
                <GroupChatBubble 
                  msg={shownMsg} 
                  msgIndex={i} 
                  isLast={i === activeGroup.messages.length - 1} 
                  isSending={isSending} 
                  onSwipeToReply={(m) => setReplyingTo(m)}
                  onResend={(c) => handleResend(c, (msg as any).images)}
                  onEdit={handleEdit}
                />
              </div>
            );
          })}

          {/* AI lagi menjawab (dipanggil oleh anggota lain) */}
          {aiThinkingNames.map(n => (
            <motion.div key={`ai-${n}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-start px-2">
              <CylenDynamicLoading name={n} />
            </motion.div>
          ))}

          {/* Banyak AI dipanggil sekaligus: semua loading serentak, yang dapat giliran tampil penuh, sisanya antri */}
          {isSending && groupRun && groupRun.items.filter(it => it.status === 'queued' || it.status === 'working').map(it => {
            const typing = lastMsg && lastMsg.role === 'assistant' && lastMsg.senderName === it.name && lastAiMsgHasContent;
            if (it.status === 'working' && typing) return null;
            return (
              <motion.div key={`run-${it.name}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-start px-2 mt-2">
                <RunRow name={it.name} note={it.note} working={it.status === 'working'} search={groupSearch} />
              </motion.div>
            );
          })}

          {/* AI lagi menjawab (dipanggil oleh kita sendiri) */}
          <AnimatePresence initial={false}>
            {showLoading && (
              <motion.div
                key="think"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: -20, overflow: 'hidden', transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                transition={{ duration: 0.38, delay: 0.1, ease: [0.22, 0.8, 0.24, 1] }}
                className="w-full flex flex-col items-start px-2"
              >
                <CylenDynamicLoading name={thinkingAI!} search={groupSearch} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Teman lagi ngetik */}
          {typingNames.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-start px-2">
              <TypingIndicator names={typingNames} />
            </motion.div>
          )}

          <div ref={endMarkerRef} />
        </div>
        <div ref={spacerRef} style={{ height: 0 }} />
      </main>

      {/* ★ data-kb-lift ada di <footer> di dalam GroupChatInput */}
      <div style={{ position: 'relative', zIndex: 20 }}>
      <GroupChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        isSending={isSending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        participants={activeGroup.participants}
      />
      </div>

      <ZoomOverlay isOpen={showZoom} onClose={() => setShowZoom(false)} groupName={activeGroup.title} participants={activeGroup.participants} />
      
      <AddAIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        activeGroupParticipants={activeGroup.participants}
        onAddParticipant={onAddParticipant}
        onRemoveParticipant={onRemoveParticipant}
        canManage={canManageAI}
        managedBy={aiPolicy}
        showToast={showToast}
      />
      
      <InviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        showToast={showToast} 
        groupId={activeGroup.id} 
      />

      <AnimatePresence>
        {showFullAvatar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[200] bg-black flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setShowFullAvatar(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><X size={24} strokeWidth={2.5} /></button>
              <button onClick={() => { setShowFullAvatar(false); if(onNavigateProfile) onNavigateProfile(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><Edit2 size={20} strokeWidth={2.5} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {groupAvatar
                ? <img src={groupAvatar} alt={nx.photoAlt} className="w-full h-auto max-h-full object-contain" />
                : <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[var(--text)] text-[var(--bg)] rounded-full flex items-center justify-center"><Users size={160} strokeWidth={1.5} /></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
