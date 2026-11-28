import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, MessageSquare, UserPlus, Bot, Users,
  Search, FileText, Trash2, Link2, Check, Loader2, ArrowLeft, VolumeX, Volume2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePageText } from '../../lib/i18n';
import { BUBBLE_NS, BUBBLE_TEXT, fillB } from '../../lib/bubbleText';
import { GroupParticipant } from '../../types';

/**
 * ZoomOverlay — panggilan suara/video grup.
 *
 * Ringan by design (sama seperti lapisan halaman di App.tsx):
 *  - Semua panel (overlay, Tambah anggota, Peserta, Chat) adalah LAPISAN yang selalu terpasang dan naik dari bawah
 *    lewat CSS transform (translate3d) dengan kurva yang sama persis: cubic-bezier(.32,.72,0,1), buka .36s / tutup .3s.
 *  - Tanpa backdrop-blur, tanpa animasi layout, tanpa animasi `height` (gelombang AI pakai transform scaleY).
 *  - Kamera baru dinyalakan setelah animasi buka selesai, supaya tidak berebut dengan transisi.
 *  - Warna 100% pakai variabel tema web (--bg --text --sf --bd --mu --ib --ac --at), jadi ikut Terang/Gelap/For You.
 */

interface ZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  /** Peserta panggilan. Elemen pertama dianggap diri sendiri. */
  participants?: GroupParticipant[];
  /** (Opsional) Anggota grup lain yang bisa diundang. Anggota dari `participants` otomatis ikut terdaftar. */
  groupMembers?: GroupParticipant[];
  /** (Opsional) Katalog AI yang bisa ditambahkan. Default: daftar AI yang sama dengan menu "Kelola AI". */
  availableAIs?: GroupParticipant[];
  /** Link undangan panggilan. Default: URL halaman saat ini. */
  inviteLink?: string;
  /** Kirim undangan ke teman. Kalau diisi, teman baru masuk saat `participants` memuat dia. Kalau tidak diisi, langsung masuk (lokal). */
  onInviteMember?: (member: GroupParticipant) => void;
  onAddAI?: (ai: GroupParticipant) => void;
  onRemoveParticipant?: (id: string) => void;
  onSendCallMessage?: (text: string, files: File[]) => void;
}

const ME = { id: 'me', name: 'Rivaldy (CEO)', isAI: false } as GroupParticipant;
const EMPTY: GroupParticipant[] = [];
// Katalog AI = daftar yang sama dengan menu "Kelola AI" (bukan data teman).
const AI_CATALOG = [
  { id: 'chatgpt', name: 'ChatGPT', isAI: true, model: 'GPT-4o' },
  { id: 'gemini', name: 'Gemini', isAI: true, model: 'Gemini 2.5 Flash' },
  { id: 'claude', name: 'Claude', isAI: true, model: 'Claude Sonnet 4' },
  { id: 'deepseek', name: 'DeepSeek', isAI: true, model: 'DeepSeek V3' },
  { id: 'meta', name: 'Meta AI', isAI: true, model: 'Meta AI' },
] as unknown as GroupParticipant[];

// ── CSS lapisan: kurva & durasi disamakan dengan PAGE_LAYER_CSS di App.tsx ──
const ZL_CSS = `
.zl-layer,.zl-sub{display:flex;flex-direction:column;background:var(--bg);color:var(--text);transform:translate3d(0,100%,0);visibility:hidden;pointer-events:none;will-change:transform;backface-visibility:hidden;transition:transform .3s cubic-bezier(.32,.72,0,1),visibility 0s linear .3s}
.zl-layer{position:fixed;inset:0;z-index:1000;overflow:hidden}
.zl-sub{position:absolute;inset:0;z-index:60}
.zl-layer[data-open="true"],.zl-sub[data-open="true"]{transform:translate3d(0,0,0);visibility:visible;pointer-events:auto;transition:transform .36s cubic-bezier(.32,.72,0,1),visibility 0s}
@keyframes zl-bar{0%,100%{transform:scaleY(.3)}25%{transform:scaleY(1)}50%{transform:scaleY(.45)}75%{transform:scaleY(.8)}}
.zl-bar{height:100%;transform-origin:center;will-change:transform;animation:zl-bar 1.2s ease-in-out infinite}
.zl-bar[data-paused="true"]{animation:none;transform:scaleY(.3)}
.zl-layer[data-open="false"] .zl-bar{animation:none}
@keyframes zl-in{from{opacity:0;transform:translate3d(0,6px,0)}to{opacity:1;transform:none}}
.zl-in{animation:zl-in .25s ease-out both}
@keyframes zl-dot{0%,100%{opacity:1}50%{opacity:.35}}
.zl-dot{animation:zl-dot 2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.zl-layer,.zl-sub{transition-duration:.01s!important}.zl-bar,.zl-in,.zl-dot{animation:none!important}}
`;

const MAX_FILES = 5;
const MAX_TEXTAREA_HEIGHT = 160; // sama dengan ChatInput.tsx
type AttachKind = 'image' | 'video' | 'pdf' | 'text';
interface Attachment { name: string; size: number; url: string; kind: AttachKind }
interface DraftAttachment extends Attachment { id: string; file: File }
interface CallMessage { id: string; from: string; text: string; files: Attachment[]; mine: boolean }
type Page = 'add' | 'people' | 'chat' | null;
type AddTab = 'friends' | 'ai';

const kindOf = (f: File): AttachKind =>
  f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'image' : 'text';
const canUseNativeCapture = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
const formatSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const sameP = (a: GroupParticipant, b: GroupParticipant) =>
  a.id === b.id || (!!a.isAI && !!b.isAI && a.name.trim().toLowerCase() === b.name.trim().toLowerCase());
const dedupe = (list: GroupParticipant[]) => {
  const out: GroupParticipant[] = [];
  for (const p of list) if (!out.some(x => sameP(x, p))) out.push(p);
  return out;
};

// ── Ikon + popup lampiran: disalin dari ChatInput.tsx ──
const IconPaperclip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
  </svg>
);
const IconMic = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0014 0" /><line x1="12" y1="19" x2="12" y2="22" />
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
  'relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] text-left cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]';

// Foto dari kamera untuk chat (laptop). Kalau kamera panggilan menyala, stream-nya dipakai ulang supaya tidak rebutan.
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
      <div className="w-full max-w-[560px] rounded-[28px] overflow-hidden bg-[var(--bg)] border border-[var(--text)]/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative w-full aspect-video bg-black">
          <video ref={videoRef} autoPlay playsInline muted onPlaying={() => setReady(true)} className="absolute inset-0 w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
          {!ready && !error && <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[13px] font-medium">Membuka kamera…</div>}
          {error && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-red-400 text-[13.5px] font-medium">{error}</div>}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-full text-[14.5px] font-semibold text-[var(--text)]/70 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">Batal</button>
          <button onClick={takePhoto} disabled={!ready || !!error} aria-label="Ambil foto" className="w-14 h-14 rounded-full border-4 border-[var(--text)]/25 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 [-webkit-tap-highlight-color:transparent]">
            <span className="w-9 h-9 rounded-full bg-[var(--text)]" />
          </button>
          <span className="w-[72px]" />
        </div>
      </div>
    </div>
  );
};

// Header halaman: sama dengan AppearancePage (panah kembali + judul)
const PageHeader: React.FC<{ title: string; subtitle?: string; onBack: () => void }> = ({ title, subtitle, onBack }) => (
  <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 bg-[var(--bg)] border-b border-[var(--bd)]">
    <button onClick={onBack} aria-label="Kembali" className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors [-webkit-tap-highlight-color:transparent]">
      <ArrowLeft size={24} strokeWidth={2.5} />
    </button>
    <div className="min-w-0">
      <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight truncate">{title}</h1>
      {subtitle && <p className="text-[12px] text-[var(--mu)] font-medium truncate">{subtitle}</p>}
    </div>
  </header>
);

const Avatar: React.FC<{ m: GroupParticipant; size?: number }> = ({ m, size = 48 }) => (
  <div
    style={{ width: size, height: size }}
    className={cn('shrink-0 rounded-2xl flex items-center justify-center font-bold', m.isAI ? 'bg-[var(--ac)] text-[var(--at)]' : 'bg-[var(--ib)] text-[var(--mu)]')}
  >
    {m.isAI ? <Bot size={Math.round(size * 0.45)} /> : <span style={{ fontSize: size * 0.4 }}>{m.name[0]}</span>}
  </div>
);

// Timer durasi: state-nya di komponen kecil sendiri supaya tick 1 detik tidak merender ulang seluruh overlay.
const CallTimer: React.FC<{ startRef: React.MutableRefObject<number>; running: boolean }> = ({ startRef, running }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    setTick(t => t + 1);
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  const s = Math.max(0, Math.floor((Date.now() - startRef.current) / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return <>{s >= 3600 ? `${p(Math.floor(s / 3600))}:` : ''}{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</>;
};

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({
  isOpen, onClose, groupName, participants = EMPTY,
  groupMembers = EMPTY, availableAIs = AI_CATALOG, inviteLink,
  onInviteMember, onAddAI, onRemoveParticipant, onSendCallMessage,
}) => {
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  // ── Navigasi halaman ──
  const [page, setPage] = useState<Page>(null);
  const [addTab, setAddTab] = useState<AddTab>('friends');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const callStartRef = useRef<number>(Date.now());

  // ── Peserta panggilan ──
  const baseKey = participants.map(p => `${p.id}:${p.name}`).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => dedupe(participants.length > 0 ? participants : [ME]), [baseKey]);
  const selfId = base[0]?.id;
  const [joined, setJoined] = useState<GroupParticipant[]>(base);
  const removedRef = useRef<Set<string>>(new Set());
  const prevBaseRef = useRef<Set<string>>(new Set(base.map(p => p.id)));

  useEffect(() => {
    const prevIds = prevBaseRef.current;
    const nextIds = new Set(base.map(p => p.id));
    setJoined(prev => {
      let next = prev.filter(p => !(prevIds.has(p.id) && !nextIds.has(p.id)));
      for (const p of base) {
        if (!removedRef.current.has(p.id) && !next.some(x => sameP(x, p))) next = [...next, p];
      }
      return next;
    });
    // Undangan yang sudah terpenuhi (orangnya muncul di participants) tidak lagi "memanggil"
    setPending(pd => pd.filter(id => !nextIds.has(id)));
    prevBaseRef.current = nextIds;
  }, [base]);

  // Daftar untuk halaman Tambah anggota: dari data grup yang NYATA (tanpa data contoh)
  const friendsAll = useMemo(
    () => dedupe([...base.filter(p => !p.isAI), ...groupMembers.filter(m => !m.isAI)]).filter(m => m.id !== selfId),
    [base, groupMembers, selfId]
  );
  const aisAll = useMemo(
    () => dedupe([...base.filter(p => p.isAI), ...availableAIs.filter(a => a.isAI !== false)]),
    [base, availableAIs]
  );
  const inCall = (m: GroupParticipant) => joined.some(p => sameP(p, m));

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

  // ── Kamera sungguhan untuk tile diri sendiri (baru dinyalakan SETELAH animasi buka selesai) ──
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isVideoOn) { setCamStream(null); setCamError(null); return; }
    let cancelled = false;
    let local: MediaStream | null = null;
    const start = () => {
      if (!navigator.mediaDevices?.getUserMedia) { setCamError('Kamera tidak didukung di browser ini'); return; }
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
    };
    const timer = window.setTimeout(start, 420);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
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

  // ── Buka / tutup ──
  useEffect(() => {
    if (isOpen) { callStartRef.current = Date.now(); return; }
    setPage(null); setPending([]); setQuery(''); setAttachOpen(false); setCameraOpen(false);
    setMutedIds([]); setJoined(base); removedRef.current = new Set();
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
    if (page === 'chat') chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, draftFiles.length, page]);

  // Tinggi textarea ikut isi, maksimal 160px lalu scroll di dalam (sama dengan ChatInput)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.overflowY = 'hidden';
    el.style.height = 'auto';
    const h = el.scrollHeight;
    if (h > MAX_TEXTAREA_HEIGHT) { el.style.height = `${MAX_TEXTAREA_HEIGHT}px`; el.style.overflowY = 'auto'; }
    else el.style.height = `${h}px`;
  }, [draft, page]);

  const notify = useCallback((text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2200);
  }, []);

  // ── Aksi anggota ──
  const inviteMember = (m: GroupParticipant) => {
    if (inCall(m) || pending.includes(m.id)) return;
    removedRef.current.delete(m.id);
    if (onInviteMember) {
      // Undangan dikirim ke backend; teman masuk saat `participants` memuat dia.
      setPending(p => [...p, m.id]);
      onInviteMember(m);
      notify(`Mengundang ${m.name}`);
    } else {
      setJoined(p => [...p, m]);
      notify(`${m.name} ditambahkan`);
    }
  };
  const cancelInvite = (m: GroupParticipant) => setPending(p => p.filter(id => id !== m.id));

  const addAI = (ai: GroupParticipant) => {
    if (inCall(ai)) return;
    removedRef.current.delete(ai.id);
    setJoined(p => [...p, ai]);
    onAddAI?.(ai);
    notify(`${ai.name} bergabung`);
  };

  const removeParticipant = (m: GroupParticipant) => {
    if (m.id === selfId) return;
    removedRef.current.add(m.id);
    setJoined(p => p.filter(x => x.id !== m.id));
    setMutedIds(ids => ids.filter(id => id !== m.id));
    onRemoveParticipant?.(m.id);
    notify(`${m.name} dikeluarkan`);
  };

  const toggleMute = (m: GroupParticipant) => {
    const was = mutedIds.includes(m.id);
    setMutedIds(ids => (was ? ids.filter(id => id !== m.id) : [...ids, m.id]));
    notify(was ? `${m.name} bisa bicara lagi` : `${m.name} dibisukan`);
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
      from: joined[0]?.name ?? 'Anda',
      text,
      files: draftFiles.map(({ name, size, url, kind }) => ({ name, size, url, kind })),
      mine: true,
    }]);
    onSendCallMessage?.(text, files);
    setDraft('');
    setDraftFiles([]);
    setAttachOpen(false);
  };

  // Dikte suara ke kolom ketik
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

  // ── LOGIKA GRID DINAMIS + ukuran nama/isi tile mengecil kalau peserta banyak ──
  const pCount = joined.length;
  let gridClass = 'grid-cols-1 grid-rows-1';
  if (pCount === 2) gridClass = 'grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1';
  else if (pCount <= 4 && pCount > 2) gridClass = 'grid-cols-2 grid-rows-2';
  else if (pCount <= 6 && pCount > 4) gridClass = 'grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2';
  else if (pCount <= 9 && pCount > 6) gridClass = 'grid-cols-3 grid-rows-3';
  else if (pCount > 9) gridClass = 'grid-cols-3 md:grid-cols-4 auto-rows-[7.5rem] overflow-y-auto content-start';
  const compact = pCount > 4;
  const dense = pCount > 6;

  // ── Daftar halaman Tambah anggota ──
  const q = query.trim().toLowerCase();
  const list = (addTab === 'friends' ? friendsAll : aisAll).filter(m =>
    m.name.toLowerCase().includes(q) || (m.isAI && (m.model ?? '').toLowerCase().includes(q))
  );

  const renderRow = (m: GroupParticipant) => {
    const present = inCall(m);
    const isPending = pending.includes(m.id);
    return (
      <div key={m.id} className="flex items-center gap-4 p-3 bg-[var(--sf)] border border-[var(--bd)] rounded-3xl">
        <Avatar m={m} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate text-[var(--text)]">{m.name}</div>
          <div className="text-[10px] font-mono text-[var(--mu)] tracking-widest uppercase truncate">{m.isAI ? (m.model || 'AI') : 'Anggota grup'}</div>
        </div>
        {present ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--mu)] tracking-widest uppercase"><Check size={13} /> Di panggilan</span>
            <button onClick={() => removeParticipant(m)} aria-label={`Keluarkan ${m.name}`} className="p-2.5 rounded-xl bg-[var(--ib)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
              <X size={14} />
            </button>
          </div>
        ) : isPending ? (
          <button onClick={() => cancelInvite(m)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--ib)] text-[var(--mu)] text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <Loader2 size={14} className="animate-spin" /> Memanggil
          </button>
        ) : (
          <button
            onClick={() => (m.isAI ? addAI(m) : inviteMember(m))}
            className="px-4 py-2.5 rounded-2xl bg-[var(--ac)] text-[var(--at)] text-[11px] font-bold uppercase tracking-wider active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
          >
            {m.isAI ? 'Tambah' : 'Undang'}
          </button>
        )}
      </div>
    );
  };

  const linkButton = (
    <button onClick={copyLink} className="w-full flex items-center justify-center gap-3 h-14 rounded-3xl bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] text-[13px] font-bold uppercase tracking-wider active:scale-[0.98] transition-transform [-webkit-tap-highlight-color:transparent]">
      {linkCopied ? <Check size={16} /> : <Link2 size={16} />}
      {linkCopied ? 'Link disalin' : 'Salin link undangan'}
    </button>
  );

  const openPage = (p: Page) => { setAttachOpen(false); setPage(p); };

  return (
    <div className="zl-layer font-sans outline-none" data-open={isOpen} aria-hidden={!isOpen}>
      <style>{ZL_CSS}</style>

      {/* ── HEADER ── */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-start bg-[var(--bg)] z-50 pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto min-w-0 pr-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 shrink-0 bg-[var(--text)] rounded-full zl-dot" />
            <span className="font-bold text-xs tracking-[0.2em] uppercase text-[var(--text)] truncate">{groupName}</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--mu)] tracking-widest uppercase">{fillB(bx.zNodes, { n: pCount })}</span>
        </div>

        <div className="flex gap-3 pointer-events-auto shrink-0">
          <button onClick={() => openPage('people')} aria-label="Peserta" className="p-3 rounded-2xl border border-[var(--bd)] bg-[var(--sf)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <Users size={18} />
          </button>
          <button onClick={onClose} aria-label="Perkecil" className="p-3 rounded-2xl border border-[var(--bd)] bg-[var(--sf)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* ── GRID PESERTA ── */}
      <div className="flex-1 relative w-full h-full p-4 md:p-8 pt-24 pb-32 flex items-center justify-center min-h-0">
        <div className={cn('w-full h-full max-w-6xl grid min-h-0', dense ? 'gap-2' : compact ? 'gap-3' : 'gap-4', gridClass)}>
          {joined.map((p, idx) => {
            const isSelf = idx === 0;
            const muted = isSelf ? !isMicOn : mutedIds.includes(p.id);
            return (
              <div
                key={p.id}
                className={cn(
                  'zl-in relative w-full h-full min-h-0 bg-[var(--sf)] border overflow-hidden',
                  dense ? 'rounded-[20px]' : compact ? 'rounded-[26px]' : 'rounded-[32px]',
                  isSelf ? 'border-[var(--text)]/25' : 'border-[var(--bd)]'
                )}
              >
                {p.isAI ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className={cn('flex items-center justify-center', dense ? 'gap-1 h-6 mb-1' : compact ? 'gap-1 h-8 mb-3' : 'gap-1.5 h-12 mb-6')}>
                      {[...Array(dense ? 5 : 6)].map((_, i) => (
                        <span key={i} className={cn('block h-full rounded-full bg-[var(--text)]', dense ? 'w-[3px]' : compact ? 'w-1' : 'w-1.5')}>
                          <span className="zl-bar block w-full rounded-full bg-[var(--text)]" data-paused={muted} style={{ animationDelay: `${i * 0.1}s` }} />
                        </span>
                      ))}
                    </div>
                    {!dense && (
                      <p className={cn('text-[var(--mu)] font-mono tracking-[0.3em] uppercase max-w-full px-2 truncate', compact ? 'text-[8px]' : 'text-[10px]')}>{p.model || bx.zSynth}</p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isSelf && isVideoOn && camStream ? (
                      <video ref={attachStream} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
                    ) : isSelf && isVideoOn && camError ? (
                      <span className="px-4 text-center text-[var(--mu)] font-mono text-[10px] tracking-widest uppercase">{camError}</span>
                    ) : isSelf && isVideoOn ? (
                      <span className="text-[var(--mu)] font-mono text-[11px] tracking-widest uppercase">…</span>
                    ) : isSelf ? (
                      <div className={cn('bg-[var(--text)]/6 rounded-full flex items-center justify-center border border-[var(--bd)] text-[var(--mu)] font-bold', dense ? 'w-10 h-10 text-base' : compact ? 'w-14 h-14 text-xl' : 'w-24 h-24 text-3xl')}>{p.name[0]}</div>
                    ) : (
                      <div className={cn('bg-[var(--text)]/6 rounded-full flex items-center justify-center border border-[var(--bd)] text-[var(--mu)] font-bold', dense ? 'w-10 h-10 text-base' : compact ? 'w-14 h-14 text-xl' : 'w-20 h-20 text-2xl')}>{p.name[0]}</div>
                    )}
                  </div>
                )}

                {/* Label nama: mengecil + dipotong (…) kalau peserta banyak */}
                <div
                  className={cn(
                    'absolute flex items-center bg-[var(--bg)]/85 border border-[var(--bd)] min-w-0',
                    dense ? 'left-1.5 bottom-1.5 gap-1.5 px-2 py-1 rounded-lg max-w-[calc(100%-0.75rem)]'
                    : compact ? 'left-2.5 bottom-2.5 gap-2 px-2.5 py-1.5 rounded-xl max-w-[calc(100%-1.25rem)]'
                    : 'left-4 bottom-4 gap-3 p-3 rounded-2xl max-w-[calc(100%-2rem)]'
                  )}
                >
                  <div className={cn('shrink-0 rounded-full bg-[var(--text)]', dense ? 'w-1 h-1' : compact ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
                  <span className={cn('text-[var(--text)] font-bold uppercase truncate min-w-0', dense ? 'text-[8px] tracking-normal' : compact ? 'text-[10px] tracking-normal' : 'text-xs tracking-wide')}>
                    {p.name}{isSelf && !compact ? ` ${bx.zYou}` : ''}
                  </span>
                  {muted && <MicOff size={dense ? 9 : compact ? 11 : 12} className="shrink-0 text-[var(--mu)]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KONTROL BAWAH ── */}
      <div className="absolute bottom-10 w-full flex justify-center z-50 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 p-3 bg-[var(--bg)]/95 rounded-[40px] border border-[var(--bd)] shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <button onClick={() => openPage('add')} aria-label="Tambah anggota" className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--sf)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <UserPlus size={22} />
          </button>

          <div className="w-[1px] h-8 bg-[var(--bd)] mx-1" />

          <button onClick={() => setIsMicOn(!isMicOn)} aria-label="Mic" className={cn('w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]', isMicOn ? 'bg-[var(--sf)] text-[var(--text)]' : 'bg-[var(--ac)] text-[var(--at)]')}>
            {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          <button onClick={() => setIsVideoOn(!isVideoOn)} aria-label="Kamera" className={cn('w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]', isVideoOn ? 'bg-[var(--sf)] text-[var(--text)]' : 'bg-[var(--ac)] text-[var(--at)]')}>
            {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
          </button>

          <button onClick={() => openPage('chat')} aria-label="Chat" className="w-14 h-14 rounded-full bg-[var(--sf)] text-[var(--text)] flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <MessageSquare size={22} />
          </button>

          <div className="w-[1px] h-8 bg-[var(--bd)] mx-1" />

          <button onClick={onClose} aria-label="Akhiri panggilan" className="w-16 h-16 rounded-[28px] bg-[var(--ac)] text-[var(--at)] flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <PhoneOff size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── HALAMAN: PESERTA ── */}
      <div className="zl-sub" data-open={page === 'people'} aria-hidden={page !== 'people'}>
        <PageHeader title="Peserta" subtitle={`${pCount} di panggilan`} onBack={() => setPage(null)} />
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4 flex flex-col gap-2" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
          <div className="flex items-center justify-between px-5 py-4 mb-2 bg-[var(--sf)] border border-[var(--bd)] rounded-3xl">
            <span className="text-[13px] font-bold uppercase tracking-widest text-[var(--mu)]">Durasi</span>
            <span className="text-[18px] font-bold font-mono text-[var(--text)]"><CallTimer startRef={callStartRef} running={isOpen && page === 'people'} /></span>
          </div>
          {joined.map((m, idx) => {
            const isSelf = idx === 0;
            const muted = isSelf ? !isMicOn : mutedIds.includes(m.id);
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-[var(--sf)] border border-[var(--bd)] rounded-3xl">
                <Avatar m={m} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate text-[var(--text)]">{m.name}{isSelf ? ' (Anda)' : ''}</div>
                  <div className="text-[10px] font-mono text-[var(--mu)] tracking-widest uppercase truncate">
                    {m.isAI ? (m.model || 'AI') : isSelf ? 'Anda' : 'Anggota grup'}{muted ? ' · dibisukan' : ''}
                  </div>
                </div>
                {!isSelf && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMute(m)} aria-label={muted ? `Aktifkan suara ${m.name}` : `Bisukan ${m.name}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--ib)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                      {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <button onClick={() => removeParticipant(m)} aria-label={`Keluarkan ${m.name}`} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--ib)] text-[var(--text)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <button onClick={() => setPage('add')} className="w-full flex items-center justify-center gap-3 h-14 rounded-full bg-[var(--ac)] text-[var(--at)] text-[14px] font-bold active:scale-[0.98] transition-transform [-webkit-tap-highlight-color:transparent]">
            <UserPlus size={18} /> Tambah anggota
          </button>
        </div>
      </div>

      {/* ── HALAMAN: TAMBAH ANGGOTA ── */}
      <div className="zl-sub" data-open={page === 'add'} aria-hidden={page !== 'add'}>
        <PageHeader title="Tambah anggota" subtitle={`${pCount} di panggilan`} onBack={() => setPage(null)} />

        {/* Pil terpisah, gaya sama dengan pilihan tema di AppearancePage */}
        <div className="px-4 mt-5 flex gap-2 flex-shrink-0">
          {(['friends', 'ai'] as AddTab[]).map(tab => {
            const active = addTab === tab;
            const Icon = tab === 'friends' ? Users : Bot;
            return (
              <button key={tab} onClick={() => { setAddTab(tab); setQuery(''); }} className="flex flex-col items-center gap-2 flex-1 [-webkit-tap-highlight-color:transparent]">
                <div className={cn('w-full h-[48px] rounded-3xl flex items-center justify-center gap-2 transition-colors', active ? 'bg-[var(--ac)] text-[var(--at)] shadow-md' : 'bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)]')}>
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[13px] font-bold">{tab === 'friends' ? 'Teman' : 'AI'}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-3 flex-shrink-0">
          <div className="flex items-center gap-3 h-12 px-4 rounded-3xl bg-[var(--sf)] border border-[var(--bd)]">
            <Search size={16} className="text-[var(--mu)] shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={addTab === 'friends' ? 'Cari anggota grup' : 'Cari AI'}
              className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] text-[var(--text)] placeholder:text-[var(--mu)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 flex flex-col gap-2" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
          {list.map(renderRow)}
          {list.length === 0 && (
            <div className="py-14 text-center flex flex-col items-center gap-2">
              <Users size={28} className="text-[var(--mu)] opacity-50" />
              <span className="text-[13px] font-bold text-[var(--text)]">
                {q ? 'Tidak ditemukan' : addTab === 'friends' ? 'Belum ada anggota lain di grup ini' : 'Belum ada AI tersedia'}
              </span>
              {!q && addTab === 'friends' && <span className="text-[12px] text-[var(--mu)] px-6">Bagikan link undangan supaya teman bisa bergabung ke panggilan.</span>}
            </div>
          )}
        </div>

        {addTab === 'friends' && (
          <div className="px-4 pt-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>{linkButton}</div>
        )}
      </div>

      {/* ── HALAMAN: CHAT ── */}
      <div className="zl-sub" data-open={page === 'chat'} aria-hidden={page !== 'chat'} style={{ bottom: 'var(--kb, 0px)' }}>
        <PageHeader title="Chat panggilan" subtitle={groupName} onBack={() => { setAttachOpen(false); setPage(null); }} />

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" style={{ minHeight: 0, scrollbarWidth: 'none' }} onClick={() => setAttachOpen(false)}>
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <MessageSquare size={28} className="text-[var(--mu)] opacity-50" />
              <span className="text-[13px] font-bold text-[var(--text)]">Belum ada pesan</span>
              <span className="text-[12px] text-[var(--mu)]">Kirim pesan, gambar, atau file ke peserta panggilan.</span>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={cn('flex flex-col gap-1.5', m.mine ? 'items-end' : 'items-start')}>
              <span className="text-[10px] font-mono text-[var(--mu)] tracking-widest uppercase px-1">{m.from}</span>
              <div className={cn('max-w-[82%] p-3 rounded-[24px] flex flex-col gap-2', m.mine ? 'bg-[var(--ac)] text-[var(--at)] rounded-br-md' : 'bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-bl-md')}>
                {m.files.map((f, i) => f.kind === 'image' ? (
                  <img key={i} src={f.url} alt={f.name} className="rounded-2xl max-h-56 w-full object-cover" />
                ) : f.kind === 'video' ? (
                  <video key={i} src={f.url} controls className="rounded-2xl max-h-56 w-full" />
                ) : (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-black/10">
                    <FileText size={18} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{f.name}</div>
                      <div className="text-[10px] font-mono opacity-60 uppercase">{formatSize(f.size)}</div>
                    </div>
                  </div>
                ))}
                {m.text && <span className="text-[15px] leading-relaxed px-1 whitespace-pre-wrap break-words">{m.text}</span>}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Composer berbentuk pil, sama dengan ChatInput.tsx. Popup lampiran hanya: File, Galeri, Kamera. */}
        <div className="relative z-10 px-2 pt-2 w-full flex-shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
          <div className="relative w-full">
            {attachOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setAttachOpen(false)} />
                <div
                  className="absolute left-1.5 bottom-full mb-3 z-[100] rounded-[26px] p-2 overflow-hidden bg-[var(--bg)]/95 border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
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

            <div className="rounded-[26px] flex flex-col relative overflow-hidden bg-[var(--bg)]/95 border border-[var(--text)]/10" style={{ WebkitTapHighlightColor: 'transparent' }}>
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
                            <span className="text-[12.5px] font-semibold truncate text-[var(--text)] max-w-[100px] leading-tight">{file.name || 'Dokumen'}</span>
                            <button onClick={() => removeDraft(file.id)} aria-label={`Hapus ${file.name}`} className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--text)]/10 flex items-center justify-center text-[var(--text)] [-webkit-tap-highlight-color:transparent]">
                              <X size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div key={file.id} className="relative flex-shrink-0 h-11 w-[104px] rounded-full overflow-hidden bg-[var(--text)]/7 shadow-sm inline-flex">
                          {file.kind === 'video' ? (
                            <div className="w-full h-full relative">
                              <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-7 h-7 bg-black/50 rounded-full flex items-center justify-center shadow-sm">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z" /></svg>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img src={file.url} alt="" className="w-full h-full object-cover block" />
                          )}
                          <button onClick={() => removeDraft(file.id)} aria-label={`Hapus ${file.name}`} className="absolute top-[3px] right-[3px] w-5 h-5 bg-black/65 text-white rounded-full flex items-center justify-center shadow-md z-10 [-webkit-tap-highlight-color:transparent]">
                            <X size={11} strokeWidth={3} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-end px-2 pt-1 pb-1">
                <button
                  onClick={() => { if (isFull) { notify(`Maksimal ${MAX_FILES} lampiran`); return; } setAttachOpen(v => !v); }}
                  aria-label="Lampirkan"
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors z-[105] flex-shrink-0 [-webkit-tap-highlight-color:transparent]',
                    attachOpen ? 'bg-[var(--text)]/12 text-[var(--text)]'
                    : isFull   ? 'opacity-20 cursor-not-allowed text-[var(--text)]'
                               : 'text-[var(--text)] bg-[var(--text)]/6 hover:bg-[var(--text)]/12'
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
                  className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none break-words text-[15.5px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[24px] max-h-40 py-[9px] pl-3 z-[105] focus:ring-0 focus:outline-none"
                  style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
                />

                <div className="flex items-center gap-1.5 flex-shrink-0 self-end pb-0.5">
                  {hasContent ? (
                    <>
                      <button onClick={handleClear} aria-label="Hapus isi" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)]/60 bg-[var(--text)]/5 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={sendMessage} aria-label="Kirim" className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] shadow-[0_2px_10px_rgba(0,0,0,0.3)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                        <IconArrowUp />
                      </button>
                    </>
                  ) : (
                    <button onClick={toggleMic} aria-label="Ketik pakai suara" className={cn('w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]', isListening ? 'bg-[var(--text)] text-[var(--bg)] animate-pulse' : 'text-[var(--text)] bg-[var(--text)]/6')}>
                      <IconMic />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL KAMERA (foto untuk chat, laptop) ── */}
      {cameraOpen && (
        <CameraCaptureModal
          stream={isVideoOn ? camStream : null}
          onCapture={file => { processFiles([file]); setCameraOpen(false); }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* ── NOTIFIKASI SINGKAT (gaya sama dengan toast App.tsx) ── */}
      {notice && (
        <div key={notice} className="zl-in absolute top-24 left-1/2 -translate-x-1/2 z-[500] bg-[var(--ac)] text-[var(--at)] px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap shadow-[0_10px_40px_rgba(0,0,0,0.2)] pointer-events-none max-w-[calc(100%-2rem)] truncate">
          {notice}
        </div>
      )}
    </div>
  );
};
