import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Maximize2, ArrowLeft, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LiveVoiceMode } from './LiveVoiceMode';
import { Message } from '../../types';

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
  { id: 'fast', label: 'Spark (Santai)', Icon: IconSpark },
  { id: 'think', label: 'Thinking (Mendalam)', Icon: IconThinking },
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
}> = ({ mode, onModeSelect, model, onModelSelect, onClose, isFull, onFileChange, onUpgradeClick }) => {
  const [panel, setPanel] = useState<'main' | 'model'>('main');

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} />
      <div
        // FIX: dulu `bg-[#181818]/75` — warna gelap hardcode yang gak ikut tema
        // app, makanya popup ini tetep gelap walau app-nya lagi di mode Light.
        // Diganti `bg-[var(--bg)]/90` supaya narik warna latar app yang beneran
        // aktif (sama pattern kayak elemen lain di file ini yang udah themed).
        className="absolute bottom-full mb-3 left-1.5 z-[100] rounded-[26px] p-2 overflow-hidden bg-[var(--bg)]/90 border border-[var(--text)]/10 backdrop-blur-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
        style={{ width: 280, maxWidth: 'calc(100vw - 40px)' }}
      >
        {panel === 'main' ? (
          <div className="flex flex-col">
            {/* Cylen logo + Upgrade */}
            <div className="flex items-center justify-between px-3 pt-3 pb-3.5 mb-1 border-b border-[var(--text)]/10">
              <div className="flex items-center gap-2.5">
                <img src="/IMG_20260427_105231.png" alt="Cylen Logo" className="w-7 h-7 object-contain" />
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
            {/* Camera */}
            <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
              <input type="file" accept="image/*" capture="environment" disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
              Camera
            </label>

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
  const baselineRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [showAttachPopup, setShowAttachPopup] = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [voiceText,     setVoiceText]     = useState('');
  const [showLiveVoice,    setShowLiveVoice]    = useState(false);
  const [isMultiLine,      setIsMultiLine]      = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [modelInternal, setModelInternal] = useState('Gemini 2.5 Pro');
  const baselineHeight = useRef<number | null>(null);

  const model = currentModel ?? modelInternal;
  const setModel = (m: string) => { setModelInternal(m); onModelChange?.(m); };

  // ukur tinggi 1 baris kosong sekali di awal — persis seperti `baselineHeight`
  // di HTML mockup (window.addEventListener('load', ...))
  useEffect(() => {
    if (baselineRef.current) {
      baselineRef.current.style.height = 'auto';
      baselineHeight.current = baselineRef.current.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${newHeight}px`;
    // pindah ke layout bertumpuk begitu tingginya lewat 1 baris — sama logic HTML: scrollHeight > baseline + 4
    const baseline = baselineHeight.current;
    setIsMultiLine(baseline !== null && el.scrollHeight > baseline + 4);
  }, [inputText]);

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
        // just drop the transcribed text into the textarea — no auto-send,
        // user reviews it and taps the send button themselves.
      }
    };
    rec.onend   = () => { setIsListening(false); setVoiceText(''); };
    rec.onerror = () => { setIsListening(false); setVoiceText(''); };
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); setVoiceText(''); }, []);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isPdf   = file.type === 'application/pdf';
        const isVideo = file.type.startsWith('video');
        const isImage = file.type.startsWith('image');
        // apapun yang bukan pdf/video/image (docx, doc, txt, dll) masuk kategori
        // 'text' — dirender sebagai chip dokumen biru, bukan dipaksa jadi <img>
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
      setInputText(prev => prev + ' [File kode dilampirkan]');
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const imageUrls = attachedFiles.filter(f => f.type === 'image' || f.type === 'video').map(f => f.url);
    const pdfFiles  = attachedFiles.filter(f => f.type === 'pdf'   || f.type === 'text').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setAttachedImage(null); setIsFullscreenEditor(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleClearText = () => { setInputText(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; };

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
      {showLiveVoice && <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />}

      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-[#0a0a0a]/95 flex items-center justify-center p-4 pointer-events-auto" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.includes('video')
            ? <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" />
            : <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          }
          <button className="absolute top-5 right-5 w-10 h-10 bg-[#ffffff]/10 rounded-full flex items-center justify-center text-[#ffffff]" onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}><X size={20} /></button>
        </div>
      )}

      {/*
        FOOTER — transparan, tanpa background tambahan.
      */}
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
              <button onClick={() => { stopListening(); if (voiceText) { setInputText(voiceText); setTimeout(() => handleSend(), 50); } else if (inputText) { handleSend(); } }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] active:scale-95 transition-transform shadow-md [-webkit-tap-highlight-color:transparent]">
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
                />
              )}

              {/* the pill — fixed 26px radius, never becomes rounded-full */}
              <div className="rounded-[26px] flex flex-col relative overflow-hidden bg-[var(--text)]/[0.06] border border-[var(--text)]/10 shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md" style={{ WebkitTapHighlightColor: 'transparent' }}>

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
                          return (
                            <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 flex items-center gap-2 h-11 pl-1 pr-2 bg-[var(--text)]/7 border border-[var(--text)]/12 rounded-full max-w-[190px]">
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
                          <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 h-11 w-[104px] rounded-full overflow-hidden bg-[var(--text)]/7 border border-[var(--text)]/12 shadow-sm inline-flex">
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

                {/* textarea tersembunyi cuma buat ngukur tinggi 1 baris kosong (baseline) */}
                <textarea
                  ref={baselineRef}
                  rows={1}
                  readOnly
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute -z-10 opacity-0 pointer-events-none w-full bg-transparent border-none outline-none resize-none text-[15.5px] leading-relaxed min-h-[24px] py-[9px] pl-5"
                  style={{ left: -9999, top: -9999 }}
                  value=""
                  onChange={() => {}}
                />

                <div className={cn(
                  "flex px-2 transition-[padding] duration-150 ease-out",
                  isMultiLine ? "flex-wrap items-end pt-2 pb-1" : "items-center pt-1 pb-1"
                )}>
                  {/* paperclip */}
                  <button
                    onClick={() => !isFull && setShowAttachPopup(p => !p)}
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
                  <div className={cn("relative flex", isMultiLine ? "order-1 w-full flex-1 basis-full" : "flex-1")}>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Tanya apa saja..."
                      rows={1}
                      className={cn(
                        // FIX (revisi): SEMPAT ditambah transition-[height] di sini,
                        // tapi itu malah bikin bug baru — height textarea diukur ulang
                        // lewat scrollHeight di SETIAP keystroke, dan kalau nilai itu
                        // sedang di tengah CSS transition, tiap huruf baru "mengejar"
                        // target yang belum selesai animasi dari huruf sebelumnya.
                        // Ngetik cepat = height kejar-kejaran terus-menerus, itu yang
                        // kerasa "eror eror eror" / gak stabil pas lagi ngetik, dan baru
                        // diam begitu berhenti (transisi terakhir sempat kelar).
                        // Transition DIHAPUS dari sini — height textarea sendiri di-set
                        // instan tiap keystroke (ini juga cara WhatsApp/Telegram/iMessage:
                        // box teksnya sendiri gak dianimasikan real-time pas diketik).
                        // FIX: tambah `break-words` (overflow-wrap: break-word).
                        // Sebelumnya, teks tanpa spasi sama sekali (lu ngetik huruf
                        // nempel terus tanpa jeda) gak punya titik wrap yang valid
                        // buat browser — default-nya browser cuma boleh motong baris
                        // di spasi/kata. Karena gak ada spasi, browser gak wrap, teks
                        // malah numpuk 1 baris dan meluber ke kanan (nempel ke tombol
                        // trash/kirim, itu yang keliatan di screenshot). Ini JUGA
                        // penyebab pil↔kotak lu gonta-ganti sendiri tiap 1 huruf:
                        // scrollHeight yang diukur di useLayoutEffect jadi gak stabil
                        // karena baris yang "gak bisa di-wrap" itu keukur beda-beda.
                        // Dengan break-words, browser sekarang boleh motong di tengah
                        // kata kalau kepanjangan, jadi wrap-nya konsisten & scrollHeight
                        // jadi bisa diprediksi — gak oscillasi lagi.
                        "w-full bg-transparent border-none outline-none resize-none break-words text-[15.5px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[24px] max-h-40 z-[105] focus:ring-0 focus:outline-none",
                        isMultiLine ? "py-[6px] pl-2 pr-7" : "py-[9px] pl-3"
                      )}
                      // FIX UTAMA: `fieldSizing: 'content'` (auto-resize bawaan
                      // browser) DIHAPUS. Sebelumnya ini jalan BARENGAN dengan
                      // logic manual di useLayoutEffect di atas (yang set
                      // `el.style.height` sendiri) — dua mekanisme resize saling
                      // menimpa tiap render. Untuk 1 baris kebetulan hasilnya
                      // sama (makanya keliatan aman), begitu masuk 2 baris atau
                      // teks sangat panjang keduanya "rebutan" tiap frame → itu
                      // yang bikin animasi macet, dan pada teks super panjang
                      // bisa override batas `max-h-40` sehingga tinggi meledak
                      // dan mendorong tombol-tombol lain keluar. Sekarang cuma
                      // satu sumber kebenaran: logic manual di useLayoutEffect.
                      style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any}
                    />
                    <AnimatePresence>
                      {isMultiLine && (
                        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsFullscreenEditor(true)} className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-[#141414]/70 backdrop-blur-sm border border-[var(--text)]/12 rounded-full text-[var(--text)] shadow-sm active:scale-95 z-[110] [-webkit-tap-highlight-color:transparent]"><Maximize2 size={14} strokeWidth={2.5} /></motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* clear (kalau ada teks) / mic+volume (kalau kosong) / kirim */}
                  <div className={cn("flex items-center gap-1.5 flex-shrink-0", isMultiLine && "order-3 ml-auto")}>
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
                        {/* Mic — ketik pakai suara, teks masuk textarea, kirim manual */}
                        <button onClick={startListening} title="Ketik dengan suara" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                          <IconMic />
                        </button>
                        {/* Volume/voice — buka mode suara AI (bola partikel), ikon doang, tanpa teks */}
                        <button onClick={() => setShowLiveVoice(true)} title="Mode suara AI" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
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
