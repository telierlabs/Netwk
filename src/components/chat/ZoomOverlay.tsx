import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, MessageSquare, UserPlus, Bot,
  LayoutDashboard, Activity, Users, Search, FileText, Trash2, Link2, Check, Loader2,
} from 'lucide-react';
// Disamakan dengan App.tsx (motion/react). Sebelumnya 'framer-motion', paket lain yang cuma kebetulan ikut terpasang.
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePageText } from '../../lib/i18n';
import { BUBBLE_NS, BUBBLE_TEXT, fillB } from '../../lib/bubbleText';
import { GroupParticipant } from '../../types';

interface ZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  participants?: GroupParticipant[];
  /** Anggota grup (manusia) yang bisa diundang ke panggilan. */
  groupMembers?: GroupParticipant[];
  /** Daftar AI yang bisa ditambahkan ke panggilan. */
  availableAIs?: GroupParticipant[];
  /** Link undangan panggilan. Default: URL halaman saat ini. */
  inviteLink?: string;
  /** Hook ke backend (Firestore dll). UI sudah jalan tanpa ini. */
  onInviteMember?: (member: GroupParticipant) => void;
  onAddAI?: (ai: GroupParticipant) => void;
  onRemoveParticipant?: (id: string) => void;
  onSendCallMessage?: (text: string, files: File[]) => void;
}

// ── Data bawaan supaya halaman bisa dicoba sebelum disambung ke data asli ──
const ME = { id: 'me', name: 'Rivaldy (CEO)', isAI: false } as GroupParticipant;
const EMPTY: GroupParticipant[] = [];
const DEMO_MEMBERS = [
  { id: 'm-dina', name: 'Dina', isAI: false },
  { id: 'm-raka', name: 'Raka', isAI: false },
  { id: 'm-sari', name: 'Sari', isAI: false },
] as unknown as GroupParticipant[];
const DEFAULT_AIS = [
  { id: 'chatgpt', name: 'ChatGPT', isAI: true, model: 'GPT-4o' },
  { id: 'gemini', name: 'Gemini', isAI: true, model: 'Gemini 2.5 Flash' },
  { id: 'claude', name: 'Claude', isAI: true, model: 'Claude Sonnet 4' },
  { id: 'deepseek', name: 'DeepSeek', isAI: true, model: 'DeepSeek V3' },
  { id: 'meta', name: 'Meta AI', isAI: true, model: 'Meta AI' },
] as unknown as GroupParticipant[];

const SPRING = { type: 'spring' as const, damping: 30, stiffness: 260 };

type AttachKind = 'image' | 'video' | 'pdf' | 'text';
interface Attachment { name: string; size: number; url: string; kind: AttachKind }
interface DraftAttachment extends Attachment { id: string; file: File }
interface CallMessage { id: string; from: string; text: string; files: Attachment[]; mine: boolean }
type Page = 'add' | 'chat' | null;
type AddTab = 'friends' | 'ai';

const MAX_FILES = 5;
// Sama dengan ChatInput.tsx: composer berhenti tumbuh di 160px, lalu scroll di dalam.
const MAX_TEXTAREA_HEIGHT = 160;
const kindOf = (f: File): AttachKind =>
  f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : 'text';
// HP: kamera bawaan lewat `capture`. Laptop: `capture` diabaikan browser, jadi dipakai webcam lewat modal.
const canUseNativeCapture = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

const formatSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

// ── Ikon + popup lampiran: disalin dari ChatInput.tsx ──
const IconPaperclip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);
const IconMic = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0014 0" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);
const IconArrowUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const IconFile = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const IconGallery = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
);
const IconCamera = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);

const POPUP_ROW =
  'relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-white text-left cursor-pointer hover:bg-white/10 active:bg-white/10 [-webkit-tap-highlight-color:transparent]';

// Kamera untuk foto di chat. Di HP dipakai kamera bawaan (`capture`); di laptop dipakai webcam lewat modal ini.
// Kalau kamera panggilan sedang menyala, stream-nya dipakai ulang supaya tidak rebutan kamera.
const CameraCaptureModal: React.FC<{ stream: MediaStream | null; onCapture: (file: File) => void; onClose: () => void }> = ({ stream, onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ownRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const attach = (s: MediaStream) => {
      const v = videoRef.current;
      if (v) { v.srcObject = s; v.play().catch(() => {}); }
    };
    if (stream) { attach(stream); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('Kamera tidak didukung di browser ini'); return; }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        ownRef.current = s;
        attach(s);
      })
      .catch((err: { name?: string }) => {
        if (cancelled) return;
        const n = err?.name;
        setError(
          n === 'NotAllowedError' || n === 'SecurityError' ? 'Izin kamera ditolak'
          : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'Kamera tidak ditemukan'
          : n === 'NotReadableError' ? 'Kamera sedang dipakai aplikasi lain'
          : 'Kamera tidak bisa dibuka'
        );
      });
    return () => {
      cancelled = true;
      ownRef.current?.getTracks().forEach(t => t.stop());
      ownRef.current = null;
    };
  }, [stream]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0); // hasil foto tidak dicermin (preview saja yang dicermin)
    c.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="absolute inset-0 z-[400] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[560px] rounded-[28px] overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative w-full aspect-video bg-black">
          <video ref={videoRef} autoPlay playsInline muted onPlaying={() => setReady(true)} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          {!ready && !error && <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[13px] font-medium">Membuka kamera…</div>}
          {error && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-red-400 text-[13.5px] font-medium">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-full text-[14.5px] font-semibold text-white/70 active:bg-white/10 [-webkit-tap-highlight-color:transparent]">Batal</button>
          <button onClick={takePhoto} disabled={!ready || !!error} aria-label="Ambil foto" className="w-14 h-14 rounded-full border-4 border-white/25 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 [-webkit-tap-highlight-color:transparent]">
            <span className="w-9 h-9 rounded-full bg-white" />
          </button>
          <span className="w-[72px]" />
        </div>
      </div>
    </div>
  );
};

const PageHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({ title, subtitle, onClose }) => (
  <div className="flex items-start justify-between p-6 pb-4">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
        <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/90">{title}</span>
      </div>
      {subtitle && <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase pl-5">{subtitle}</span>}
    </div>
    <button onClick={onClose} aria-label="Tutup" className="p-3 bg-black/50 border border-white/10 rounded-2xl text-white hover:bg-white/10 backdrop-blur-md transition-all outline-none [-webkit-tap-highlight-color:transparent]">
      <X size={18} />
    </button>
  </div>
);

const Avatar: React.FC<{ m: GroupParticipant; size?: number }> = ({ m, size = 48 }) => (
  <div
    style={{ width: size, height: size }}
    className={cn('shrink-0 rounded-2xl flex items-center justify-center border font-bold', m.isAI ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10')}
  >
    {m.isAI ? <Bot size={Math.round(size * 0.42)} /> : <span style={{ fontSize: size * 0.38 }}>{m.name[0]}</span>}
  </div>
);

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({
  isOpen, onClose, groupName, participants = EMPTY,
  groupMembers = DEMO_MEMBERS, availableAIs = DEFAULT_AIS, inviteLink,
  onInviteMember, onAddAI, onRemoveParticipant, onSendCallMessage,
}) => {
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);

  // ── Navigasi halaman ──
  const [page, setPage] = useState<Page>(null);
  const [addTab, setAddTab] = useState<AddTab>('friends');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Peserta di panggilan (state lokal, disinkronkan dari props) ──
  const baseKey = participants.map(p => p.id).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => (participants.length > 0 ? participants : [ME]), [baseKey]);
  const [joined, setJoined] = useState<GroupParticipant[]>(base);

  useEffect(() => {
    setJoined(prev => {
      const ids = new Set(prev.map(p => p.id));
      const add = base.filter(p => !ids.has(p.id));
      return add.length ? [...prev, ...add] : prev;
    });
  }, [base]);

  // ── Chat ──
  const [messages, setMessages] = useState<CallMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [draftFiles, setDraftFiles] = useState<DraftAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const urlsRef = useRef<string[]>([]);
  const timersRef = useRef<number[]>([]);
  const noticeTimerRef = useRef<number | undefined>(undefined);

  // ── Kamera sungguhan untuk tile diri sendiri ──
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isVideoOn) { setCamStream(null); setCamError(null); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setCamError('Kamera tidak didukung di browser ini'); return; }
    let cancelled = false;
    let local: MediaStream | null = null;
    setCamError(null);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        local = s;
        setCamStream(s);
      })
      .catch((err: { name?: string }) => {
        if (!cancelled) setCamError(err?.name === 'NotAllowedError' ? 'Izin kamera ditolak' : 'Kamera tidak bisa dibuka');
      });
    return () => {
      cancelled = true;
      local?.getTracks().forEach(t => t.stop());
      setCamStream(null);
    };
  }, [isOpen, isVideoOn]);

  const attachStream = useCallback((el: HTMLVideoElement | null) => {
    if (el && camStream && el.srcObject !== camStream) {
      el.srcObject = camStream;
      el.play().catch(() => {});
    }
  }, [camStream]);

  // ── Reset saat overlay ditutup, bersihkan saat unmount ──
  useEffect(() => {
    if (!isOpen) {
      setPage(null); setShowDashboard(false); setPending([]); setQuery('');
      setAttachOpen(false); setCameraOpen(false); setJoined(base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => {
    timersRef.current.forEach(t => window.clearTimeout(t));
    window.clearTimeout(noticeTimerRef.current);
    urlsRef.current.forEach(u => URL.revokeObjectURL(u));
    recRef.current?.stop();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || cameraOpen) return;
      if (attachOpen) setAttachOpen(false);
      else if (page) setPage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, page, attachOpen, cameraOpen]);

  useEffect(() => {
    if (page === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, draftFiles.length, page]);

  const notify = useCallback((text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2200);
  }, []);

  // ── Aksi tambah anggota ──
  const selfId = joined[0]?.id;
  const inCall = (id: string) => joined.some(p => p.id === id);

  const inviteMember = (m: GroupParticipant) => {
    if (inCall(m.id) || pending.includes(m.id)) return;
    setPending(p => [...p, m.id]);
    onInviteMember?.(m);
    const t = window.setTimeout(() => {
      setPending(p => p.filter(id => id !== m.id));
      setJoined(p => (p.some(x => x.id === m.id) ? p : [...p, m]));
      notify(`${m.name} bergabung`);
    }, 1500);
    timersRef.current.push(t);
  };

  const addAI = (ai: GroupParticipant) => {
    if (inCall(ai.id)) return;
    setJoined(p => [...p, ai]);
    onAddAI?.(ai);
    notify(`${ai.name} bergabung`);
  };

  const removeParticipant = (m: GroupParticipant) => {
    if (m.id === selfId) return;
    setJoined(p => p.filter(x => x.id !== m.id));
    onRemoveParticipant?.(m.id);
    notify(`${m.name} dikeluarkan`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink ?? window.location.href);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
      notify('Link undangan disalin');
    } catch {
      notify('Gagal menyalin link');
    }
  };

  // ── Aksi chat ──
  const nativeCamera = canUseNativeCapture();
  const isFull = draftFiles.length >= MAX_FILES;
  const hasContent = draft.trim().length > 0 || draftFiles.length > 0;

  // Tinggi textarea ikut isi, maksimal 160px (sama dengan ChatInput), lalu scroll di dalam.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.overflowY = 'hidden';
    el.style.height = 'auto';
    const h = el.scrollHeight;
    if (h > MAX_TEXTAREA_HEIGHT) { el.style.height = `${MAX_TEXTAREA_HEIGHT}px`; el.style.overflowY = 'auto'; }
    else el.style.height = `${h}px`;
  }, [draft, page]);

  const processFiles = (files: File[]) => {
    const room = MAX_FILES - draftFiles.length;
    if (room <= 0) { notify(`Maksimal ${MAX_FILES} lampiran`); return; }
    const next: DraftAttachment[] = files.slice(0, room).map(file => {
      const kind = kindOf(file);
      const url = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : '';
      if (url) urlsRef.current.push(url);
      return { id: `${Date.now()}-${Math.random()}`, file, name: file.name, size: file.size, url, kind };
    });
    setDraftFiles(prev => [...prev, ...next].slice(0, MAX_FILES));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
    e.target.value = '';
    setAttachOpen(false);
  };

  const removeDraft = (id: string) => {
    setDraftFiles(prev => {
      const item = prev.find(d => d.id === id);
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter(d => d.id !== id);
    });
  };

  const handleClear = () => {
    draftFiles.forEach(d => { if (d.url) URL.revokeObjectURL(d.url); });
    setDraft('');
    setDraftFiles([]);
  };

  const sendMessage = () => {
    if (!hasContent) return;
    const text = draft.trim();
    const files = draftFiles.map(d => d.file);
    setMessages(prev => [...prev, {
      id: `${Date.now()}`,
      from: joined[0]?.name ?? 'Kamu',
      text,
      files: draftFiles.map(({ name, size, url, kind }) => ({ name, size, url, kind })),
      mine: true,
    }]);
    onSendCallMessage?.(text, files);
    setDraft('');
    setDraftFiles([]);
    setAttachOpen(false);
  };

  // Dikte suara ke kolom ketik (tombol mic di composer)
  const toggleMic = () => {
    if (isListening) { recRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { notify('Dikte suara tidak didukung browser ini'); return; }
    const rec = new SR();
    const prefix = draft;
    rec.lang = 'id-ID';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setDraft(prefix ? `${prefix} ${t}` : t);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recRef.current = rec;
    rec.start();
  };

  // LOGIKA GRID DINAMIS
  const pCount = joined.length;
  let gridClass = 'grid-cols-1 grid-rows-1';
  if (pCount === 2) gridClass = 'grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1';
  else if (pCount === 3 || pCount === 4) gridClass = 'grid-cols-2 grid-rows-2';
  else if (pCount > 4) gridClass = 'grid-cols-2 md:grid-cols-3 auto-rows-fr';

  // ── Daftar untuk halaman tambah anggota ──
  const q = query.trim().toLowerCase();
  const friendList = groupMembers.filter(m => !m.isAI && m.id !== selfId && m.name.toLowerCase().includes(q));
  const aiList = availableAIs.filter(a => a.name.toLowerCase().includes(q) || (a.model ?? '').toLowerCase().includes(q));
  const list = addTab === 'friends' ? friendList : aiList;

  const renderRow = (m: GroupParticipant) => {
    const present = inCall(m.id);
    const isPending = pending.includes(m.id);
    return (
      <motion.div layout key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-3 bg-white/[0.04] border border-white/5 rounded-[24px]">
        <Avatar m={m} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{m.name}</div>
          <div className="text-[10px] font-mono text-white/40 tracking-widest uppercase truncate">
            {m.isAI ? (m.model || 'AI') : 'Anggota grup'}
          </div>
        </div>
        {present ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/50 tracking-widest uppercase"><Check size={13} /> Di panggilan</span>
            <button onClick={() => removeParticipant(m)} aria-label={`Keluarkan ${m.name}`} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 transition-colors outline-none [-webkit-tap-highlight-color:transparent]">
              <X size={14} />
            </button>
          </div>
        ) : isPending ? (
          <span className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 text-white/60 text-[11px] font-bold uppercase tracking-wider">
            <Loader2 size={14} className="animate-spin" /> Memanggil
          </span>
        ) : (
          <button
            onClick={() => (m.isAI ? addAI(m) : inviteMember(m))}
            className="px-4 py-2.5 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all outline-none [-webkit-tap-highlight-color:transparent]"
          >
            {m.isAI ? 'Tambah' : 'Undang'}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          // FIX tema terang: latar overlay ini SELALU gelap (#050505), jadi teks bawaannya harus putih.
          className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col font-sans overflow-hidden text-white outline-none"
        >
          {/* ── HEADER OVERLAY ── */}
          <div className="absolute top-0 w-full p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-50 pointer-events-none">
            <div className="flex flex-col gap-1 pointer-events-auto outline-none">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/90">{groupName}</span>
              </div>
              <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">{fillB(bx.zNodes, { n: pCount })}</span>
            </div>

            <div className="flex gap-3 pointer-events-auto outline-none">
              <button onClick={() => setShowDashboard(!showDashboard)} aria-label="Dashboard" className={cn('p-3 rounded-2xl border transition-all outline-none [-webkit-tap-highlight-color:transparent]', showDashboard ? 'bg-white text-black border-white' : 'bg-black/50 border-white/10 text-white hover:bg-white/10 backdrop-blur-md')}>
                <LayoutDashboard size={18} />
              </button>
              <button onClick={onClose} aria-label="Perkecil" className="p-3 bg-black/50 border border-white/10 rounded-2xl text-white hover:bg-white/10 backdrop-blur-md transition-all outline-none [-webkit-tap-highlight-color:transparent]">
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* ── MAIN VIDEO GRID ── */}
          <div className="flex-1 relative w-full h-full p-4 md:p-8 pt-24 pb-32 z-10 flex items-center justify-center outline-none">
            <div className={cn('w-full h-full max-w-6xl gap-4 grid transition-all duration-500', gridClass)}>
              <AnimatePresence initial={false}>
                {joined.map((p, idx) => {
                  const isSelf = idx === 0;
                  return (
                    <motion.div
                      layout
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94 }}
                      transition={{ duration: 0.3 }}
                      className="relative w-full h-full bg-[#111] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl group outline-none"
                    >
                      {/* Efek Garis Scan */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-[200%] animate-[scan_4s_linear_infinite] pointer-events-none" style={{ transform: 'translateY(-50%)' }} />

                      {p.isAI ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-[#0a0a0a]">
                          <div className="flex gap-1.5 items-center justify-center mb-6 h-12">
                            {[...Array(6)].map((_, i) => (
                              <motion.div key={i} animate={{ height: [12, 40, 16, 32, 12] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1 }} className="w-1.5 bg-white/80 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                            ))}
                          </div>
                          <p className="text-white/20 text-[10px] font-mono tracking-[0.3em] uppercase">{p.model || bx.zSynth}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
                          {isSelf && isVideoOn && camStream ? (
                            <video ref={attachStream} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
                          ) : isSelf && isVideoOn && camError ? (
                            <span className="px-6 text-center text-white/30 font-mono text-[11px] tracking-widest uppercase">{camError}</span>
                          ) : isSelf && isVideoOn ? (
                            <span className="text-white/20 font-mono text-[11px] tracking-widest uppercase animate-pulse">Membuka kamera…</span>
                          ) : isSelf && !isVideoOn ? (
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/30 font-bold text-3xl">{p.name[0]}</div>
                          ) : (
                            <span className="text-white/10 font-mono text-sm tracking-widest uppercase">{bx.zCamera}</span>
                          )}
                        </div>
                      )}

                      {/* Name Tag Kiri Bawah */}
                      <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        <span className="text-white font-bold text-xs tracking-wide uppercase">{p.name} {isSelf && bx.zYou}</span>
                        {isSelf && !isMicOn && <MicOff size={12} className="text-white/60" />}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ── SIDE DASHBOARD PANEL ── */}
          <AnimatePresence>
            {showDashboard && (
              <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-24 right-6 w-80 max-w-[calc(100%-3rem)] bottom-32 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 z-40 flex flex-col gap-6 shadow-2xl outline-none">
                <div className="flex items-center gap-3 text-white/50 border-b border-white/10 pb-4">
                  <Activity size={18} />
                  <span className="text-xs font-bold tracking-widest uppercase">{bx.zTelemetry}</span>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1 uppercase">{bx.zLatency}</div><div className="text-xl font-bold font-mono">12ms <span className="text-white text-sm">●</span></div></div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1 uppercase">{bx.zCompute}</div><div className="text-xl font-bold font-mono">24%</div><div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-white w-1/4 rounded-full" /></div></div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1 uppercase">{bx.zCanvas}</div><div className="text-xs font-bold text-white/60 mt-1">{bx.zNoFile}</div></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BOTTOM CONTROLS ── */}
          <div className="absolute bottom-10 w-full flex justify-center z-50 outline-none">
            <div className="flex items-center gap-3 p-3 bg-black/60 backdrop-blur-3xl rounded-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <button onClick={() => { setShowDashboard(false); setPage('add'); }} aria-label="Tambah anggota" className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-white/5 text-white hover:bg-white/15 outline-none [-webkit-tap-highlight-color:transparent]">
                <UserPlus size={22} />
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-1" />

              <button onClick={() => setIsMicOn(!isMicOn)} aria-label="Mic" className={cn('w-14 h-14 rounded-full flex items-center justify-center transition-all outline-none [-webkit-tap-highlight-color:transparent]', isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black')}>
                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              <button onClick={() => setIsVideoOn(!isVideoOn)} aria-label="Kamera" className={cn('w-14 h-14 rounded-full flex items-center justify-center transition-all outline-none [-webkit-tap-highlight-color:transparent]', isVideoOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-black')}>
                {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>

              <button onClick={() => { setShowDashboard(false); setPage('chat'); }} aria-label="Chat" className="w-14 h-14 rounded-full bg-white/5 text-white hover:bg-white/15 transition-all flex items-center justify-center outline-none [-webkit-tap-highlight-color:transparent]">
                <MessageSquare size={22} />
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-1" />

              <button onClick={onClose} aria-label="Akhiri panggilan" className="w-16 h-16 rounded-[28px] bg-white text-black flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all outline-none [-webkit-tap-highlight-color:transparent]">
                <PhoneOff size={24} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* ── HALAMAN: TAMBAH ANGGOTA ── */}
          <AnimatePresence>
            {page === 'add' && (
              <motion.div key="page-add" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING} className="absolute inset-0 z-[60] bg-[#050505] flex flex-col outline-none">
                <PageHeader title="Tambah anggota" subtitle={`${pCount} di panggilan`} onClose={() => setPage(null)} />

                {/* Pil terpisah: Teman / AI */}
                <div className="px-6 pb-4">
                  <div className="relative flex p-1.5 bg-white/5 border border-white/10 rounded-full">
                    {(['friends', 'ai'] as AddTab[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => { setAddTab(tab); setQuery(''); }}
                        className={cn('relative flex-1 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors outline-none [-webkit-tap-highlight-color:transparent]', addTab === tab ? 'text-black' : 'text-white/60')}
                      >
                        {addTab === tab && (
                          <motion.div layoutId="addTabPill" className="absolute inset-0 bg-white rounded-full" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />
                        )}
                        <span className="relative flex items-center justify-center gap-2">
                          {tab === 'friends' ? <Users size={15} /> : <Bot size={15} />}
                          {tab === 'friends' ? 'Teman' : 'AI'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cari */}
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-3 h-12 px-4 rounded-full bg-white/5 border border-white/10 focus-within:border-white/30 transition-colors">
                    <Search size={16} className="text-white/40" />
                    <input
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={addTab === 'friends' ? 'Cari anggota grup' : 'Cari AI'}
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* Daftar */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {list.map(renderRow)}
                  </AnimatePresence>
                  {list.length === 0 && (
                    <div className="py-16 text-center text-[11px] font-mono text-white/30 tracking-widest uppercase">
                      {q ? 'Tidak ditemukan' : addTab === 'friends' ? 'Belum ada anggota grup lain' : 'Belum ada AI tersedia'}
                    </div>
                  )}
                </div>

                {addTab === 'friends' && (
                  <div className="px-6 pb-8 pt-2">
                    <button onClick={copyLink} className="w-full flex items-center justify-center gap-3 h-14 rounded-[24px] bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-colors outline-none [-webkit-tap-highlight-color:transparent]">
                      {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
                      {linkCopied ? 'Link disalin' : 'Salin link undangan'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── HALAMAN: CHAT ── */}
          <AnimatePresence>
            {page === 'chat' && (
              <motion.div key="page-chat" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={SPRING} className="absolute inset-0 z-[60] bg-[#050505] flex flex-col outline-none">
                <PageHeader title="Chat panggilan" subtitle={groupName} onClose={() => { setAttachOpen(false); setPage(null); }} />

                <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-4" onClick={() => setAttachOpen(false)}>
                  {messages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                      <MessageSquare size={28} className="text-white/15" />
                      <span className="text-[11px] font-mono text-white/30 tracking-widest uppercase">Belum ada pesan</span>
                      <span className="text-xs text-white/25">Kirim pesan, gambar, atau file ke peserta panggilan.</span>
                    </div>
                  )}
                  {messages.map(m => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex flex-col gap-1.5', m.mine ? 'items-end' : 'items-start')}>
                      <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase px-1">{m.from}</span>
                      <div className={cn('max-w-[82%] p-3 rounded-[24px] flex flex-col gap-2', m.mine ? 'bg-white text-black rounded-br-md' : 'bg-white/10 text-white rounded-bl-md')}>
                        {m.files.map((f, i) => f.kind === 'image' ? (
                          <img key={i} src={f.url} alt={f.name} className="rounded-2xl max-h-56 w-full object-cover" />
                        ) : f.kind === 'video' ? (
                          <video key={i} src={f.url} controls className="rounded-2xl max-h-56 w-full" />
                        ) : (
                          <div key={i} className={cn('flex items-center gap-3 p-3 rounded-2xl', m.mine ? 'bg-black/5' : 'bg-white/10')}>
                            <FileText size={18} />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{f.name}</div>
                              <div className="text-[10px] font-mono opacity-60 uppercase">{formatSize(f.size)}</div>
                            </div>
                          </div>
                        ))}
                        {m.text && <span className="text-sm leading-relaxed px-1 whitespace-pre-wrap break-words">{m.text}</span>}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Composer berbentuk pil, sama dengan ChatInput.tsx. Popup lampiran hanya: File, Galeri, Kamera. */}
                <div className="relative z-10 px-2 pt-2 w-full" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
                  <div className="relative w-full">
                    {attachOpen && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setAttachOpen(false)} />
                        <div
                          className="absolute left-1.5 bottom-full mb-3 z-[100] rounded-[26px] p-2 overflow-hidden bg-[#0a0a0a]/95 border border-white/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
                          style={{ width: 280, maxWidth: 'calc(100vw - 40px)' }}
                        >
                          <div className="flex flex-col">
                            <label className={POPUP_ROW}>
                              <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple disabled={isFull} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconFile /></span>
                              File
                            </label>
                            <label className={POPUP_ROW}>
                              <input type="file" accept="image/*,video/*" multiple disabled={isFull} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconGallery /></span>
                              Galeri
                            </label>
                            {nativeCamera ? (
                              <label className={POPUP_ROW}>
                                <input type="file" accept="image/*" capture="environment" disabled={isFull} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
                                Kamera
                              </label>
                            ) : (
                              <button type="button" disabled={isFull} onClick={() => { if (isFull) return; setAttachOpen(false); setCameraOpen(true); }} className={cn(POPUP_ROW, 'disabled:opacity-40')}>
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
                                Kamera
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="rounded-[26px] flex flex-col relative overflow-hidden bg-black/70 border border-white/10 backdrop-blur-md" style={{ WebkitTapHighlightColor: 'transparent' }}>
                      {draftFiles.length > 0 && (
                        <div className="px-3.5 pt-3 pb-1">
                          <div className="flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'none' }}>
                            {draftFiles.map(file => {
                              if (file.kind === 'pdf' || file.kind === 'text') {
                                const isPdf = file.kind === 'pdf';
                                return (
                                  <div key={file.id} className={cn('relative flex-shrink-0 flex items-center gap-2 h-11 pl-1 pr-2 rounded-full max-w-[190px]', isPdf ? 'bg-red-500/10' : 'bg-blue-500/10')}>
                                    <span className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center', isPdf ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500')}>
                                      <FileText size={16} strokeWidth={2} />
                                    </span>
                                    <span className="text-[12.5px] font-semibold truncate text-white max-w-[100px] leading-tight">{file.name || 'Dokumen'}</span>
                                    <button onClick={() => removeDraft(file.id)} aria-label={`Hapus ${file.name}`} className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white [-webkit-tap-highlight-color:transparent]">
                                      <X size={12} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                );
                              }
                              return (
                                <div key={file.id} className="relative flex-shrink-0 h-11 w-[104px] rounded-full overflow-hidden bg-white/10 shadow-sm inline-flex">
                                  {file.kind === 'video' ? (
                                    <div className="w-full h-full relative">
                                      <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <div className="w-7 h-7 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <img src={file.url} alt="" className="w-full h-full object-cover block" />
                                  )}
                                  <button onClick={() => removeDraft(file.id)} aria-label={`Hapus ${file.name}`} className="absolute top-[3px] right-[3px] w-5 h-5 bg-black/65 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-md z-10 [-webkit-tap-highlight-color:transparent]">
                                    <X size={11} strokeWidth={3} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-end px-2 pt-1 pb-1">
                        {/* paperclip */}
                        <button
                          onClick={() => { if (isFull) { notify(`Maksimal ${MAX_FILES} lampiran`); return; } setAttachOpen(v => !v); }}
                          aria-label="Lampirkan"
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-colors z-[105] flex-shrink-0 [-webkit-tap-highlight-color:transparent]',
                            attachOpen ? 'bg-white/15 text-white'
                            : isFull   ? 'opacity-20 cursor-not-allowed text-white'
                                       : 'text-white bg-white/10 hover:bg-white/15'
                          )}
                        >
                          <IconPaperclip />
                        </button>

                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onFocus={() => setAttachOpen(false)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !nativeCamera) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Pesan ke panggilan"
                          rows={1}
                          className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none break-words text-[15.5px] leading-relaxed placeholder:text-white/40 text-white min-h-[24px] max-h-40 py-[9px] pl-3 z-[105] focus:ring-0 focus:outline-none"
                          style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
                        />

                        {/* hapus + kirim (kalau ada isi) / mic (kalau kosong) */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 self-end pb-0.5">
                          {hasContent ? (
                            <>
                              <button onClick={handleClear} aria-label="Hapus isi" className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 bg-white/5 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                                <Trash2 size={15} />
                              </button>
                              <button onClick={sendMessage} aria-label="Kirim" className="w-9 h-9 rounded-full flex items-center justify-center bg-white text-black shadow-[0_2px_10px_rgba(0,0,0,0.3)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                                <IconArrowUp />
                              </button>
                            </>
                          ) : (
                            <button onClick={toggleMic} aria-label="Ketik pakai suara" className={cn('w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]', isListening ? 'bg-white text-black animate-pulse' : 'text-white bg-white/10')}>
                              <IconMic />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MODAL KAMERA (foto untuk chat, laptop) ── */}
          {cameraOpen && (
            <CameraCaptureModal
              stream={isVideoOn ? camStream : null}
              onCapture={file => { processFiles([file]); setCameraOpen(false); }}
              onClose={() => setCameraOpen(false)}
            />
          )}

          {/* ── NOTIFIKASI SINGKAT ── */}
          <AnimatePresence>
            {notice && (
              <motion.div key={notice} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-24 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl text-[10px] font-mono tracking-widest uppercase text-white/80 pointer-events-none whitespace-nowrap">
                {notice}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
