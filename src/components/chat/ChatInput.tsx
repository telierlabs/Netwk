import React, { useRef, useState, useCallback, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Maximize2, ArrowLeft, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
// Kartu izin: sekarang cuma dipakai untuk mikrofon. Kamera chat pakai kamera bawaan HP (tanpa izin web).
import { requestPermission, getPermissionState, showPermissionSheet } from '../permissions/PermissionSheet';

// ── FIX HALAMAN LAMBAT DIBUKA ──
// Mode Suara (bola 3D partikel + Gemini + simulasi) itu berat. Dulu di-import langsung,
// jadi ikut kebawa di bundle awal dan memperlambat SEMUA halaman. Sekarang baru
// diunduh saat dibutuhkan (tombol mode suara ditekan).
type LiveVoiceModule = typeof import('./LiveVoiceMode');
let liveVoiceLoader: Promise<LiveVoiceModule> | null = null;
const loadLiveVoice = (): Promise<LiveVoiceModule> => {
  if (!liveVoiceLoader) {
    liveVoiceLoader = import('./LiveVoiceMode').catch((e) => { liveVoiceLoader = null; throw e; });
  }
  return liveVoiceLoader;
};
const preloadLiveVoice = () => { loadLiveVoice().catch(() => {}); };
const LiveVoiceMode = lazy(() => loadLiveVoice().then((m) => ({ default: m.LiveVoiceMode })));

// Kalau file Mode Suara gagal diunduh (misal offline), jangan sampai seluruh app jadi layar putih.
class VoiceBoundary extends React.Component<{ onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) {
    console.error('[Cylen] Mode suara gagal dimuat:', err);
    this.props.onFail();
  }
  render() { return this.state.failed ? null : this.props.children; }
}

// ── Kamera di HP: pakai `capture` (buka app kamera bawaan). Di LAPTOP atribut `capture`
// diabaikan browser dan malah membuka galeri/file picker → makanya di laptop dipakai
// webcam beneran lewat modal di bawah ini.
const canUseNativeCapture = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));

// Rumus mobile/desktop yang SAMA PERSIS dengan isMobileDevice di App.tsx & main.tsx.
const isMobileLayout = (): boolean => {
  if (typeof window === 'undefined') return false;
  const touchScreen = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return [touchScreen, smallScreen, mobileUA].filter(Boolean).length >= 2;
};

const CameraCaptureModal: React.FC<{ onCapture: (file: File) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Browser ini tidak mendukung kamera (butuh koneksi HTTPS).');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; v.play().catch(() => {}); }
      } catch (err: any) {
        if (cancelled) return;
        const n = err?.name;
        setError(
          n === 'NotAllowedError' || n === 'SecurityError' ? 'Izin kamera ditolak. Aktifkan lewat pengaturan situs di browser, lalu coba lagi.'
          : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'Kamera tidak ditemukan di perangkat ini.'
          : n === 'NotReadableError' ? 'Kamera sedang dipakai aplikasi atau tab lain.'
          : 'Gagal membuka kamera.'
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

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
    c.getContext('2d')?.drawImage(v, 0, 0); // hasil foto TIDAK dicermin (preview saja yang dicermin)
    c.toBlob(blob => {
      if (!blob) return;
      onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4 pointer-events-auto" onClick={onClose}>
      <div
        className="w-full max-w-[560px] rounded-[28px] overflow-hidden bg-[var(--bg)] border border-[var(--text)]/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full aspect-video bg-black">
          <video
            ref={videoRef}
            autoPlay playsInline muted
            onPlaying={() => setReady(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[13px] font-medium">Membuka kamera...</div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-red-400 text-[13.5px] font-medium">{error}</div>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-full text-[14.5px] font-semibold text-[var(--text)]/70 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">Batal</button>
          <button
            onClick={takePhoto}
            disabled={!ready || !!error}
            aria-label="Ambil foto"
            className="w-14 h-14 rounded-full border-4 border-[var(--text)]/25 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 [-webkit-tap-highlight-color:transparent]"
          >
            <span className="w-9 h-9 rounded-full bg-[var(--text)]" />
          </button>
          <span className="w-[72px]" />
        </div>
      </div>
    </div>
  );
};

export type ChatMode = 'auto' | 'fast' | 'think' | 'heavy';

interface AttachedFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'pdf' | 'text';
  name: string;
  mimeType?: string;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[]) => void;
  isSending: boolean;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  compact?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasActive?: boolean;
  onUpgradeClick?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

const MAX_FILES = 5;
const MAX_PASTE_LENGTH = 3000;

// Tinggi maksimum textarea (px). Harus sama dengan class `max-h-40` (10rem = 160px)
// di textarea utama. Lewat batas ini composer berhenti tumbuh dan textarea
// scroll di dalam.
const MAX_TEXTAREA_HEIGHT = 160;

// ── Path logo Cylen. Dipakai sebagai MASK, jadi warnanya ikut var(--text)
// (hitam di light mode, putih di dark mode) — bukan warna asli PNG-nya.
const CYLEN_LOGO_SRC = '/IMG_20260427_105231.png';

/* ---------------------------------------------------------------------- */
/*  Icons — ported 1:1 from the Cylen HTML mockup                          */
/* ---------------------------------------------------------------------- */

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

/* the "sound bars" glyph — used both as the Speak-mode icon and the idle send icon */
const IconWaveBars = ({ active = false }: { active?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 3 : 2.2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="10" x2="3" y2="14" />
    <line x1="7.5" y1="6" x2="7.5" y2="18" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="16.5" y1="6" x2="16.5" y2="18" />
    <line x1="21" y1="10" x2="21" y2="14" />
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
const IconSpark = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconThinking = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />
  </svg>
);
const IconAuto = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1-2 3.5-2 3.5s2.5-.5 3.5-2c.5-.5.5-1.5 0-2s-1.5-.5-2 .5z" />
    <path d="M12 15l-3-3 8.5-8.5a2.12 2.12 0 013 3L12 15z" /><path d="M9 12l-1.5-1.5" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MODES: { id: ChatMode; label: string; Icon: React.FC }[] = [
  { id: 'fast', label: 'Spark', Icon: IconSpark },
  { id: 'think', label: 'Thinking', Icon: IconThinking },
  { id: 'auto', label: 'Auto', Icon: IconAuto },
];

const AI_MODELS = ['Gemini 2.5 Pro', 'GPT-5.5', 'Claude 3.7 Opus', 'Perplexity', 'Meta AI', 'DeepSeek V3', 'Qwen 2.5', 'Mistral Large 2'];

/* ---------------------------------------------------------------------- */
/*  Merged attachment / mode / model popup                                 */
/* ---------------------------------------------------------------------- */

const AttachPopup: React.FC<{
  mode: ChatMode;
  onModeSelect: (m: ChatMode) => void;
  model: string;
  onModelSelect: (m: string) => void;
  onClose: () => void;
  isFull: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpgradeClick?: () => void;
  onOpenCamera: () => void;
  // true = popup terbuka KE BAWAH dari kolom ketik, false = ke atas
  below: boolean;
  // batas tinggi popup (px) kalau ruang di bawah kolom ketik sempit (laptop); isinya scroll di dalam
  maxH?: number;
}> = ({ mode, onModeSelect, model, onModelSelect, onClose, isFull, onFileChange, onUpgradeClick, onOpenCamera, below, maxH }) => {
  const [panel, setPanel] = useState<'main' | 'model'>('main');
  const nativeCamera = canUseNativeCapture(); // HP = kamera bawaan, laptop = webcam

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        // FIX LAG: backdrop-blur dihapus (berat di HP Android menengah), diganti latar hampir solid.
        className={cn(
          "absolute left-1.5 z-[100] rounded-[26px] p-2 overflow-hidden bg-[var(--bg)]/95 border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]",
          below ? "top-full mt-3" : "bottom-full mb-3"
        )}
        style={{
          width: 280,
          maxWidth: 'calc(100vw - 40px)',
          ...(maxH ? { maxHeight: maxH, overflowY: 'auto', scrollbarWidth: 'thin' } : {}),
        }}
      >
        {panel === 'main' ? (
          <div className="flex flex-col">
            {/* Cylen logo + Upgrade */}
            <div className="flex items-center justify-between px-3 pt-3 pb-3.5 mb-1 border-b border-[var(--text)]/10">
              <div className="flex items-center gap-2.5">
                {/* Logo pakai CSS mask: bentuknya dari PNG, warnanya dari var(--text).
                    Light mode → hitam, dark mode → putih, otomatis ikut tema. */}
                <span
                  role="img"
                  aria-label="Cylen Logo"
                  className="w-7 h-7 flex-shrink-0 bg-[var(--text)]"
                  style={{
                    WebkitMaskImage: `url(${CYLEN_LOGO_SRC})`,
                    maskImage: `url(${CYLEN_LOGO_SRC})`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                  }}
                />
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold text-[var(--text)] tracking-tight leading-none">Cylen</span>
                  <span className="text-[11px] text-[var(--mu)] font-medium mt-0.5">Akses intelijen premium</span>
                </div>
              </div>
              <button
                onClick={() => { onClose(); onUpgradeClick?.(); }}
                className="flex-shrink-0 ml-2 bg-[var(--text)] text-[var(--bg)] px-4 py-2 rounded-full text-[13px] font-bold shadow active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
              >
                Upgrade
              </button>
            </div>

            {/* File */}
            <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
              <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconFile /></span>
              File
            </label>
            {/* Gallery */}
            <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
              <input type="file" accept="image/*,video/*" multiple disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconGallery /></span>
              Gallery
            </label>
            {/* Camera — HP: langsung buka kamera bawaan lewat `capture` (tanpa popup izin).
                Laptop: `capture` diabaikan browser (malah buka galeri), jadi buka webcam lewat modal. */}
            {nativeCamera ? (
              <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
                <input type="file" accept="image/*" capture="environment" disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
                Camera
              </label>
            ) : (
              <button
                type="button"
                onClick={() => { if (isFull) return; onClose(); onOpenCamera(); }}
                disabled={isFull}
                className="w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] text-left hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
              >
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
                Camera
              </button>
            )}

            <div className="h-px bg-[var(--text)]/10 my-1.5 mx-1" />

            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { onModeSelect(m.id); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-left [-webkit-tap-highlight-color:transparent]",
                    active ? "bg-[var(--text)]/12 text-[var(--text)]" : "text-[var(--text)] hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8"
                  )}
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><m.Icon /></span>
                  {m.label}
                </button>
              );
            })}

            <div className="h-px bg-[var(--text)]/10 my-1.5 mx-1" />

            <button
              onClick={() => setPanel('model')}
              className="w-full flex items-center justify-between bg-[var(--text)]/5 rounded-[16px] px-3 py-2.5 [-webkit-tap-highlight-color:transparent]"
            >
              <div className="flex flex-col items-start gap-[1px]">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--mu)]">Current Model</span>
                <span className="text-[14px] font-bold text-[var(--text)]">{model}</span>
              </div>
              <span className="opacity-50 flex"><IconChevronRight /></span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="text-center text-[15px] font-bold px-2 pt-2.5 pb-2 text-[var(--text)]">Choose AI Model</div>
            <div className="flex flex-col gap-[1px] max-h-[320px] overflow-y-auto">
              {AI_MODELS.map(name => {
                const selected = model === name;
                return (
                  <button
                    key={name}
                    onClick={() => onModelSelect(name)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-[14px] text-[14px] font-semibold text-left text-[var(--text)] hover:bg-[var(--text)]/6 active:bg-[var(--text)]/6 [-webkit-tap-highlight-color:transparent]"
                  >
                    <span className={cn(
                      "flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center",
                      selected ? "border-[var(--text)] bg-[var(--text)]" : "border-[var(--text)]/35"
                    )}>
                      {selected && <span className="w-[7px] h-[7px] rounded-full bg-[var(--bg)]" />}
                    </span>
                    {name}
                    {selected && <span className="ml-auto text-[var(--text)]/90"><IconCheck /></span>}
                  </button>
                );
              })}
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold text-[14.5px] [-webkit-tap-highlight-color:transparent]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/* ---------------------------------------------------------------------- */
/*  Main component                                                         */
/* ---------------------------------------------------------------------- */

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onOpenCanvas, onCloseCanvas,
  isCanvasActive = false, onUpgradeClick, replyingTo, onCancelReply,
  currentModel, onModelChange
}) => {
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  // textarea bayangan (offscreen). Dipakai SATU tujuan: nentuin "apakah teks ini
  // muat 1 baris di lebar layout PIL?" — dengan lebar yang selalu lebar-pil,
  // gak peduli composer lagi di mode pil atau kotak.
  const mirrorRef      = useRef<HTMLTextAreaElement>(null);
  const composerRef    = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // cerminan `isMultiLine` yang dijamin sinkron dengan DOM yang sudah ke-commit
  // (di-update di awal layout effect). Dibaca oleh syncLayout & ResizeObserver.
  const isMultiLineRef = useRef(false);
  // selisih (px) antara lebar composer dan lebar textarea PADA LAYOUT PIL
  // (= paperclip + tombol kanan + padding + border). Nilainya konstan, jadi
  // lebar textarea-di-mode-pil bisa dihitung kapan saja: lebarComposer - chrome.
  const pillChromeRef = useRef<number | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [showAttachPopup, setShowAttachPopup] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [voiceText,     setVoiceText]     = useState('');
  const [showLiveVoice,    setShowLiveVoice]    = useState(false);
  const [isMultiLine,      setIsMultiLine]      = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [modelInternal, setModelInternal] = useState('Gemini 2.5 Pro');
  // Arah popup lampiran: true = ke bawah. Ditentukan tiap kali tombol klip ditekan (lihat di bawah).
  const [popupBelow, setPopupBelow] = useState(false);
  const [popupMaxH, setPopupMaxH] = useState<number | undefined>(undefined);

  const model = currentModel ?? modelInternal;
  const setModel = (m: string) => { setModelInternal(m); onModelChange?.(m); };

  // composer (pil/kotak) sedang ter-mount? (saat mode dengar suara, dia di-unmount)
  const composerVisible = !(isListening && !showLiveVoice);

  /**
   * Layout pil ↔ kotak (root cause bug yang berulang sudah diperbaiki):
   *  1) Mode ditentukan dari textarea bayangan (mirror) yang lebarnya SELALU
   *     lebar-pil → hasilnya cuma bergantung pada teks + lebar composer,
   *     bukan pada mode saat ini → tidak ada feedback loop.
   *  2) Tinggi textarea asli diukur SETELAH mode final & DOM ke-commit.
   *  3) overflow-y dikontrol eksplisit: hidden selama belum mentok max,
   *     auto hanya kalau konten > MAX_TEXTAREA_HEIGHT.
   */
  const syncLayout = useCallback(() => {
    const el = textareaRef.current;
    const mirror = mirrorRef.current;
    const composer = composerRef.current;
    if (!el || !mirror || !composer) return;

    const composerWidth = composer.offsetWidth;
    if (composerWidth === 0) return; // lagi hidden / belum ke-layout; ResizeObserver akan manggil lagi

    // Selama layout pil aktif, (re)learn selisih lebar composer vs textarea.
    if (!isMultiLineRef.current) {
      pillChromeRef.current = composerWidth - el.offsetWidth;
    }

    // ---- 1) tentukan mode dari ukuran teks di lebar PIL ----
    let needsStack = isMultiLineRef.current;
    const chrome = pillChromeRef.current;
    if (chrome !== null) {
      const value = el.value;
      if (value === '') {
        needsStack = false;
      } else {
        // -2px = margin aman: offsetWidth dibulatkan, jadi mirror sengaja
        // dibikin sedikit lebih sempit dari textarea pil asli.
        mirror.style.width = `${Math.max(composerWidth - chrome - 2, 1)}px`;
        mirror.value = value;
        const cs = window.getComputedStyle(mirror);
        const fontSize = parseFloat(cs.fontSize) || 15.5;
        const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.625;
        const oneLine =
          lineHeight + (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        needsStack = mirror.scrollHeight > oneLine + lineHeight / 2;
      }
    }

    if (needsStack !== isMultiLineRef.current) {
      // Layout bakal berubah → effect otomatis jalan lagi setelah commit.
      setIsMultiLine(needsStack);
      return;
    }

    // ---- 2) fit tinggi textarea asli (mode sudah cocok dengan DOM) ----
    const prevScrollTop = el.scrollTop;
    el.style.overflowY = 'hidden'; // cegah scrollbar (desktop) nyempitin lebar pas ngukur
    el.style.height = 'auto';
    const contentHeight = el.scrollHeight;

    if (contentHeight > MAX_TEXTAREA_HEIGHT) {
      el.style.height = `${MAX_TEXTAREA_HEIGHT}px`;
      el.style.overflowY = 'auto';
      el.scrollTop = prevScrollTop; // jangan lompatin posisi scroll user
    } else {
      el.style.height = `${contentHeight}px`;
      el.scrollTop = 0;
    }
  }, []);

  useLayoutEffect(() => {
    isMultiLineRef.current = isMultiLine;
    syncLayout();
  }, [inputText, isMultiLine, composerVisible, syncLayout]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    let lastWidth = node.offsetWidth;
    const ro = new ResizeObserver(() => {
      const w = node.offsetWidth;
      if (w === lastWidth) return;
      lastWidth = w;
      syncLayout();
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [composerVisible, syncLayout]);

  useEffect(() => {
    const fonts = (document as any).fonts;
    if (fonts?.ready) fonts.ready.then(() => syncLayout());
  }, [syncLayout]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Browser tidak mendukung voice input'); return; }
    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(t);
      if (e.results[e.results.length - 1].isFinal) {
        setInputText(t); setVoiceText(''); setIsListening(false); rec.stop();
        // teks hasil suara cuma dimasukkan ke textarea — tidak auto-kirim
      }
    };
    rec.onend   = () => { setIsListening(false); setVoiceText(''); };
    rec.onerror = (e: any) => {
      setIsListening(false); setVoiceText('');
      // Izin dicabut di tengah jalan → tampilkan petunjuk (cuma kalau memang berstatus diblokir)
      if (e?.error === 'not-allowed') {
        getPermissionState('microphone').then(s => { if (s === 'denied') showPermissionSheet('microphone', 'blocked'); });
      }
    };
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); setVoiceText(''); }, []);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // Tombol mic: izin dulu (popup browser SAJA kalau belum pernah ditanya), baru dengar.
  const handleMicClick = useCallback(async () => {
    if (await requestPermission('microphone')) startListening();
  }, [startListening]);

  // Mode suara AI: unduh file Mode Suara BARENGAN dengan cek izin, jadi tidak nunggu dua kali.
  const handleLiveVoiceClick = useCallback(async () => {
    preloadLiveVoice();
    if (await requestPermission('microphone')) setShowLiveVoice(true);
  }, []);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isPdf   = file.type === 'application/pdf';
        const isVideo = file.type.startsWith('video');
        const isImage = file.type.startsWith('image');
        // apapun yang bukan pdf/video/image (docx, doc, txt, dll) masuk kategori 'text'
        const type: AttachedFile['type'] = isPdf ? 'pdf' : isVideo ? 'video' : isImage ? 'image' : 'text';
        resolve({ id: `${Date.now()}-${Math.random()}`, url: reader.result as string, type, name: file.name, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }))).then(newFiles => {
      setAttachedFiles(prev => {
        const next = [...prev, ...newFiles].slice(0, MAX_FILES);
        setAttachedImage(next.find(f => f.type === 'image')?.url || null);
        return next;
      });
    });
  }, [attachedFiles.length, setAttachedImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
    e.target.value = '';
    setShowAttachPopup(false);
  }, [processFiles]);

  // Foto dari webcam (laptop) → masuk sebagai lampiran gambar, sama seperti dari Gallery
  const handleCameraCaptured = useCallback((file: File) => {
    processFiles([file]);
    setShowCameraModal(false);
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      setAttachedImage(next.find(f => f.type === 'image')?.url || null);
      return next;
    });
  }, [setAttachedImage]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > MAX_PASTE_LENGTH) {
      e.preventDefault();
      const blob = new Blob([pastedText], { type: 'text/plain' });
      processFiles([new File([blob], 'Kode_Panjang.txt', { type: 'text/plain' })]);
      // FIX TypeScript: setInputText cuma menerima string (bukan fungsi updater)
      setInputText(inputText + ' [File kode dilampirkan]');
    }
  };

  // Tinggi textarea cuma diatur satu tempat (syncLayout), yang otomatis jalan
  // begitu `inputText` jadi kosong.
  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const imageUrls = attachedFiles.filter(f => f.type === 'image' || f.type === 'video').map(f => f.url);
    const pdfFiles  = attachedFiles.filter(f => f.type === 'pdf'   || f.type === 'text').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setAttachedImage(null); setIsFullscreenEditor(false);
  };

  // FIX: setelah setInputText(voiceText), handleSend versi lama masih memegang inputText kosong
  // (stale closure) → pesan suara tidak terkirim. Ref ini selalu menunjuk handleSend terbaru.
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  const handleClearText = () => { setInputText(''); };

  const renderFullscreenEditor = () => (
    <AnimatePresence>
      {isFullscreenEditor && (
        <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }} className="fixed inset-0 z-[300] bg-[var(--bg)] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--text)]/10 bg-[var(--bg)] shadow-sm z-[310]">
            <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] transition-colors rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><ArrowLeft size={22} strokeWidth={2.5} /></button>
            <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Edit Pesan</span>
            <div className="flex items-center">
              <button onClick={(e) => { e.stopPropagation(); handleClearText(); setIsFullscreenEditor(false); }} className="p-2 text-[var(--text)] rounded-full active:scale-90 mr-2 [-webkit-tap-highlight-color:transparent]"><Trash2 size={22} strokeWidth={2} /></button>
              <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="p-2 -mr-2 text-[var(--text)]/60 rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={22} strokeWidth={2.5} /></button>
            </div>
          </div>
          <div className="flex-1 p-[18px] overflow-hidden bg-[var(--bg)] z-[305]">
            <textarea autoFocus value={inputText} onChange={e => setInputText(e.target.value)} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none break-words text-[16px] leading-relaxed text-[var(--text)] placeholder:text-[var(--mu)] focus:ring-0 [-webkit-tap-highlight-color:transparent]" style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any} placeholder="Tulis pesan atau tempel kode panjang di sini..." />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull     = attachedFiles.length >= MAX_FILES;

  return (
    <>
      {renderFullscreenEditor()}

      {/* Mode Suara: di-portal ke <body> (kebal dari parent yang punya transform) + lazy-load.
          Kalau gagal diunduh → ditutup + pesan, bukan layar putih. */}
      {showLiveVoice && typeof document !== 'undefined' && createPortal(
        <VoiceBoundary
          onFail={() => {
            setShowLiveVoice(false);
            alert('Mode suara gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
          }}
        >
          <Suspense fallback={<div className="fixed inset-0 z-[9999] bg-[var(--bg)]" />}>
            <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />
          </Suspense>
        </VoiceBoundary>,
        document.body
      )}

      {showCameraModal && typeof document !== 'undefined' && createPortal(
        <CameraCaptureModal onCapture={handleCameraCaptured} onClose={() => setShowCameraModal(false)} />,
        document.body
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-[#0a0a0a]/95 flex items-center justify-center p-4 pointer-events-auto" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.includes('video')
            ? <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" />
            : <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          }
          <button className="absolute top-5 right-5 w-10 h-10 bg-[#ffffff]/10 rounded-full flex items-center justify-center text-[#ffffff]" onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}><X size={20} /></button>
        </div>
      )}

      {/* FOOTER — transparan, tanpa background tambahan. */}
      <footer
        className={cn(
          "px-2 relative z-50 pointer-events-auto w-full",
          compact ? "pt-0" : "pt-2"
        )}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        <div className="max-w-4xl mx-auto w-full">
          {isListening && !showLiveVoice ? (
            <div className="flex items-center justify-between w-full h-[64px] rounded-[26px] px-2 relative overflow-hidden bg-[var(--text)]/5 shadow-sm backdrop-blur-md border border-[var(--text)]/10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[50px] bg-[var(--text)]/20 blur-[20px] rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
              <button onClick={() => { setVoiceText(''); stopListening(); }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--bg)] text-[var(--text)] active:scale-95 transition-transform shadow-sm [-webkit-tap-highlight-color:transparent]"><X size={20} strokeWidth={2.5} /></button>
              <div className="relative z-10 flex-1 flex justify-center items-center px-4 overflow-hidden">
                {voiceText
                  ? <span className="text-[15px] font-medium text-[var(--text)] truncate">{voiceText}</span>
                  : <div className="flex items-center text-[var(--mu)] text-[13px] font-medium"><span className="rotate-180 mr-1 opacity-50 flex"><IconChevronRight /></span> Bicara sekarang...</div>
                }
              </div>
              <button
                onClick={() => {
                  stopListening();
                  if (voiceText) {
                    setInputText(voiceText);
                    // pakai ref supaya yang dipanggil handleSend TERBARU (sudah tahu inputText baru)
                    setTimeout(() => handleSendRef.current(), 80);
                  } else if (inputText) {
                    handleSend();
                  }
                }}
                className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] active:scale-95 transition-transform shadow-md [-webkit-tap-highlight-color:transparent]"
              >
                <IconArrowUp />
              </button>
            </div>
          ) : (
            <div className="relative w-full">
              {showAttachPopup && (
                <AttachPopup
                  mode={mode}
                  onModeSelect={m => { onModeChange?.(m); onCloseCanvas?.(); }}
                  model={model}
                  onModelSelect={setModel}
                  onClose={() => setShowAttachPopup(false)}
                  isFull={isFull}
                  onFileChange={handleFileChange}
                  onUpgradeClick={onUpgradeClick}
                  onOpenCamera={() => setShowCameraModal(true)}
                  below={popupBelow}
                  maxH={popupMaxH}
                />
              )}

              {/* Pil composer — radius 26px, glassmorphism ikut tema (bg-[var(--bg)]/70 + blur).
                  Perpindahan pil<->kotak INSTAN lewat class Tailwind (tanpa animasi `layout`).
                  Catatan: kalau scroll chat masih terasa berat di HP, hapus `backdrop-blur-md` di sini
                  dan ganti bg-[var(--bg)]/70 jadi bg-[var(--bg)]/95. */}
              <div
                ref={composerRef}
                className="rounded-[26px] flex flex-col relative overflow-hidden bg-[var(--bg)]/70 border border-[var(--text)]/10 backdrop-blur-md"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >

                <AnimatePresence>
                  {replyingTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pt-3.5">
                      <div className="bg-[var(--bg)] rounded-[16px] border-l-[4px] border-[var(--text)] p-2.5 pr-9 relative">
                        <button onClick={onCancelReply} className="absolute right-1.5 top-1.5 w-[26px] h-[26px] flex items-center justify-center text-[var(--mu)] rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={15} strokeWidth={2.5} /></button>
                        <div className="text-[11px] font-bold text-[var(--text)] tracking-wide uppercase mb-1">{replyingTo.role === 'user' ? 'Kamu' : 'Cylen AI'}</div>
                        <span className="text-[13px] text-[var(--text)]/80 line-clamp-2 leading-snug break-words">{replyingTo.content}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {attachedFiles.length > 0 && (
                  <div className="px-3.5 pt-3 pb-1">
                    <div className="flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'none' }}>
                      {attachedFiles.map(file => {
                        if (file.type === 'pdf' || file.type === 'text') {
                          const isPdf = file.type === 'pdf';
                          // Chip tanpa border, background tint sesuai tipe (merah PDF, biru dokumen)
                          return (
                            <div key={file.id} className={cn("relative flex-shrink-0 animate-in zoom-in duration-200 flex items-center gap-2 h-11 pl-1 pr-2 rounded-full max-w-[190px]", isPdf ? "bg-red-500/10" : "bg-blue-500/10")}>
                              <span className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", isPdf ? "bg-red-500/18 text-red-500" : "bg-blue-500/18 text-blue-500")}>
                                <FileText size={16} strokeWidth={2} />
                              </span>
                              <span className="text-[12.5px] font-semibold truncate text-[var(--text)] max-w-[100px] leading-tight">{file.name || 'Dokumen'}</span>
                              <button onClick={() => removeFile(file.id)} className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--text)]/10 flex items-center justify-center text-[var(--text)] [-webkit-tap-highlight-color:transparent]">
                                <X size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 h-11 w-[104px] rounded-full overflow-hidden bg-[var(--text)]/7 shadow-sm inline-flex">
                            {file.type === 'video' ? (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-7 h-7 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z" /></svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <img src={file.url} alt="" className="w-full h-full object-cover block" />
                              </div>
                            )}
                            <button onClick={() => removeFile(file.id)} className="absolute top-[3px] right-[3px] w-5 h-5 bg-black/65 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-md z-10 [-webkit-tap-highlight-color:transparent]">
                              <X size={11} strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* textarea bayangan (offscreen). Padding, font, dan break-words SENGAJA
                    disamakan dengan textarea utama versi PIL (`py-[9px] pl-3`). */}
                <textarea
                  ref={mirrorRef}
                  rows={1}
                  readOnly
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute -z-10 opacity-0 pointer-events-none bg-transparent border-none outline-none resize-none break-words overflow-hidden text-[15.5px] leading-relaxed py-[9px] pl-3"
                  style={{ left: -9999, top: -9999 }}
                />

                {/* Baris utama: susunan pindah instan lewat class Tailwind saat `isMultiLine` berubah */}
                <div
                  className={cn(
                    "flex px-2",
                    isMultiLine ? "flex-wrap items-end pt-2 pb-1" : "items-center pt-1 pb-1"
                  )}
                >
                  {/* paperclip */}
                  <button
                    onClick={() => {
                      if (isFull) return;
                      if (!showAttachPopup) {
                        // Muncul ke BAWAH kalau ruang di bawah kolom ketik cukup buat popup (~470px),
                        // contohnya layar sambutan desktop yang kolom ketiknya di tengah.
                        // Kalau kolom ketik menempel di dasar layar (chat berjalan / HP), otomatis ke atas.
                        // Versi HP (rumus sama dengan isMobileDevice di App.tsx) selalu ke atas, tidak diubah.
                        const r = composerRef.current?.getBoundingClientRect();
                        const space = r ? window.innerHeight - r.bottom - 16 : 0;
                        // `compact` = layar sambutan desktop (kolom ketik di tengah): selalu turun selama
                        // masih ada ruang minimal ~200px. Kalau ruangnya kurang dari tinggi popup (laptop),
                        // tingginya dibatasi & isinya bisa discroll.
                        const below = !isMobileLayout() && !!r && (space > 470 || (compact && space >= 200));
                        setPopupBelow(below);
                        setPopupMaxH(below && space <= 470 ? Math.floor(space) : undefined);
                      }
                      setShowAttachPopup(p => !p);
                    }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors z-[105] flex-shrink-0 [-webkit-tap-highlight-color:transparent]",
                      isMultiLine && "order-2",
                      showAttachPopup ? "bg-[var(--text)]/12 text-[var(--text)]"
                      : isFull        ? "opacity-20 cursor-not-allowed text-[var(--text)]"
                                      : "text-[var(--text)] bg-[var(--text)]/6 hover:bg-[var(--text)]/12"
                    )}
                  >
                    <IconPaperclip />
                  </button>

                  {/* textarea + tombol maximize (muncul cuma pas stacked, pojok kanan atas) */}
                  <div
                    className={cn("relative flex", isMultiLine ? "order-1 w-full flex-1 basis-full" : "flex-1")}
                  >
                    {/* Tinggi & overflow-y diatur SATU tempat: syncLayout() (inline style).
                        Jangan tambah `transition-[height]` di sini. */}
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Tanya apa saja..."
                      rows={1}
                      className={cn(
                        "w-full bg-transparent border-none outline-none resize-none break-words text-[15.5px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[24px] max-h-40 z-[105] focus:ring-0 focus:outline-none",
                        isMultiLine ? "py-[9px] pl-2 pr-7" : "py-[9px] pl-3"
                      )}
                      style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any}
                    />
                    <AnimatePresence>
                      {isMultiLine && (
                        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsFullscreenEditor(true)} className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center rounded-full text-[var(--text)]/70 active:scale-95 z-[110] [-webkit-tap-highlight-color:transparent]"><Maximize2 size={14} strokeWidth={2.5} /></motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* clear (kalau ada teks) / mic+volume (kalau kosong) / kirim */}
                  <div
                    className={cn("flex items-center gap-1.5 flex-shrink-0", isMultiLine && "order-3 ml-auto")}
                  >
                    {hasContent ? (
                      <>
                        <button onClick={handleClearText} title="Hapus teks" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)]/60 bg-[var(--text)]/5 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={isSending}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] shadow-[0_2px_10px_rgba(0,0,0,0.3)] active:scale-95 transition-transform flex-shrink-0 [-webkit-tap-highlight-color:transparent]"
                        >
                          <IconArrowUp />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Mic — ketik pakai suara */}
                        <button onClick={handleMicClick} title="Ketik dengan suara" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                          <IconMic />
                        </button>
                        {/* Mode suara AI (bola partikel) */}
                        <button onClick={handleLiveVoiceClick} onPointerDown={preloadLiveVoice} title="Mode suara AI" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                          <IconWaveBars />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
    </>
  );
};
