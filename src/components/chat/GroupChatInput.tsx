import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Maximize2, ArrowLeft, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface AttachedFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'pdf' | 'text';
  name: string;
  mimeType?: string;
}

interface GroupChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[]) => void;
  isSending: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  participants?: any[];
}

const MAX_FILES = 5;
const MAX_PASTE_LENGTH = 3000;

// Tinggi maksimum textarea (px). Harus sama dengan class `max-h-40` (10rem = 160px).
const MAX_TEXTAREA_HEIGHT = 160;

/* ---------------------------------------------------------------------- */
/*  Icons (sama persis dengan ChatInput biasa)                             */
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
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/* ---------------------------------------------------------------------- */
/*  Popup lampiran: cuma File, Galeri, Kamera                              */
/* ---------------------------------------------------------------------- */

const AttachPopup: React.FC<{
  onClose: () => void;
  isFull: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ onClose, isFull, onFileChange }) => (
  <>
    <div className="fixed inset-0 z-[90]" onClick={onClose} />
    <div
      className="absolute bottom-full mb-3 left-1.5 z-[100] rounded-[26px] p-2 overflow-hidden bg-[var(--bg)]/70 border border-[var(--text)]/10 backdrop-blur-md shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
      style={{ width: 200, maxWidth: 'calc(100vw - 40px)' }}
    >
      <div className="flex flex-col">
        <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
          <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconFile /></span>
          File
        </label>
        <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
          <input type="file" accept="image/*,video/*" multiple disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconGallery /></span>
          Galeri
        </label>
        <label className="relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]">
          <input type="file" accept="image/*" capture="environment" disabled={isFull} onChange={onFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><IconCamera /></span>
          Kamera
        </label>
      </div>
    </div>
  </>
);

/* ---------------------------------------------------------------------- */
/*  Main component                                                         */
/* ---------------------------------------------------------------------- */

export const GroupChatInput: React.FC<GroupChatInputProps> = ({
  inputText, setInputText, onSend, isSending, replyingTo, onCancelReply, participants
}) => {
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  // textarea bayangan (offscreen): nentuin "teks ini muat 1 baris di lebar PIL?"
  const mirrorRef      = useRef<HTMLTextAreaElement>(null);
  const composerRef    = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isMultiLineRef = useRef(false);
  const pillChromeRef  = useRef<number | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [showAttachPopup, setShowAttachPopup] = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [voiceText,     setVoiceText]     = useState('');
  const [isMultiLine,   setIsMultiLine]   = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [mentionQuery,  setMentionQuery]  = useState<string | null>(null);

  // composer sedang ter-mount? (saat mode dengar suara, dia di-unmount)
  const composerVisible = !isListening;

  /* ---------- @mention ---------- */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:\s|^)@(\w*)$/);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  };

  const insertMention = (name: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = inputText.slice(0, cursor);
    const textAfter = inputText.slice(cursor);
    const match = textBefore.match(/(?:\s|^)@(\w*)$/);

    if (match) {
      const replaceStart = textBefore.lastIndexOf('@');
      setInputText(inputText.slice(0, replaceStart) + `@${name} ` + textAfter);
      setMentionQuery(null);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const filteredParticipants = participants
    ? participants.filter(p => p.isAI && p.name.toLowerCase().includes(mentionQuery || ''))
    : [];

  /* ---------- layout pil <-> persegi panjang (sama dengan ChatInput) ---------- */
  const syncLayout = useCallback(() => {
    const el = textareaRef.current;
    const mirror = mirrorRef.current;
    const composer = composerRef.current;
    if (!el || !mirror || !composer) return;

    const composerWidth = composer.offsetWidth;
    if (composerWidth === 0) return;

    // Selama layout pil aktif, (re)learn selisih lebar composer vs textarea.
    if (!isMultiLineRef.current) {
      pillChromeRef.current = composerWidth - el.offsetWidth;
    }

    // 1) tentukan mode dari ukuran teks di lebar PIL
    let needsStack = isMultiLineRef.current;
    const chrome = pillChromeRef.current;
    if (chrome !== null) {
      const value = el.value;
      if (value === '') {
        needsStack = false;
      } else {
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
      setIsMultiLine(needsStack);
      return;
    }

    // 2) fit tinggi textarea asli
    const prevScrollTop = el.scrollTop;
    el.style.overflowY = 'hidden';
    el.style.height = 'auto';
    const contentHeight = el.scrollHeight;

    if (contentHeight > MAX_TEXTAREA_HEIGHT) {
      el.style.height = `${MAX_TEXTAREA_HEIGHT}px`;
      el.style.overflowY = 'auto';
      el.scrollTop = prevScrollTop;
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

  /* ---------- suara (ketik pakai suara, teks masuk ke kolom, kirim manual) ---------- */
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Browser tidak mendukung voice input'); return; }
    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(t);
      if (e.results[e.results.length - 1].isFinal) {
        setInputText(t); setVoiceText(''); setIsListening(false); rec.stop();
      }
    };
    rec.onend = () => { setIsListening(false); setVoiceText(''); };
    rec.onerror = () => { setIsListening(false); setVoiceText(''); };
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); setVoiceText(''); }, []);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  /* ---------- lampiran ---------- */
  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isPdf   = file.type === 'application/pdf';
        const isVideo = file.type.startsWith('video');
        const isImage = file.type.startsWith('image');
        const type: AttachedFile['type'] = isPdf ? 'pdf' : isVideo ? 'video' : isImage ? 'image' : 'text';
        resolve({ id: `${Date.now()}-${Math.random()}`, url: reader.result as string, type, name: file.name, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }))).then(newFiles => {
      setAttachedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    });
  }, [attachedFiles.length]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
    e.target.value = '';
    setShowAttachPopup(false);
  }, [processFiles]);

  const removeFile = (id: string) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.length > MAX_PASTE_LENGTH) {
      e.preventDefault();
      const blob = new Blob([pastedText], { type: 'text/plain' });
      processFiles([new File([blob], 'Kode_Panjang.txt', { type: 'text/plain' })]);
      setInputText(inputText + ' [File kode dilampirkan]');
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const imageUrls = attachedFiles.filter(f => f.type === 'image' || f.type === 'video').map(f => f.url);
    const pdfFiles  = attachedFiles.filter(f => f.type === 'pdf'   || f.type === 'text').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setIsFullscreenEditor(false); setMentionQuery(null);
  };

  const handleClearText = () => { setInputText(''); setMentionQuery(null); };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull     = attachedFiles.length >= MAX_FILES;

  return (
    <>
      {/* ---------- editor layar penuh ---------- */}
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
              <textarea autoFocus value={inputText} onChange={handleTextChange} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none break-words text-[16px] leading-relaxed text-[var(--text)] placeholder:text-[var(--mu)] focus:ring-0 [-webkit-tap-highlight-color:transparent]" style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any} placeholder="Pesan grup atau @sebut..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- lightbox ---------- */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-[#0a0a0a]/95 flex items-center justify-center p-4 pointer-events-auto" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.includes('video')
            ? <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" />
            : <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          }
          <button className="absolute top-5 right-5 w-10 h-10 bg-[#ffffff]/10 rounded-full flex items-center justify-center text-[#ffffff]" onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}><X size={20} /></button>
        </div>
      )}

      {/* ---------- footer ---------- */}
      <footer
        className="px-2 pt-2 relative z-50 pointer-events-auto w-full"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="max-w-4xl mx-auto w-full">
          {isListening ? (
            <div className="flex items-center justify-between w-full h-[64px] rounded-[26px] px-2 relative overflow-hidden bg-[var(--text)]/5 shadow-sm backdrop-blur-md border border-[var(--text)]/10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[50px] bg-[var(--text)]/20 blur-[20px] rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
              <button onClick={() => { setVoiceText(''); stopListening(); }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--bg)] text-[var(--text)] active:scale-95 transition-transform shadow-sm [-webkit-tap-highlight-color:transparent]"><X size={20} strokeWidth={2.5} /></button>
              <div className="relative z-10 flex-1 flex justify-center items-center px-4 overflow-hidden">
                {voiceText
                  ? <span className="text-[15px] font-medium text-[var(--text)] truncate">{voiceText}</span>
                  : <div className="flex items-center text-[var(--mu)] text-[13px] font-medium"><span className="rotate-180 mr-1 opacity-50 flex"><IconChevronRight /></span> Bicara sekarang...</div>
                }
              </div>
              <button onClick={() => { const t = voiceText; stopListening(); if (t) setInputText(t); }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] active:scale-95 transition-transform shadow-md [-webkit-tap-highlight-color:transparent]">
                <IconArrowUp />
              </button>
            </div>
          ) : (
            <div className="relative w-full">
              {showAttachPopup && (
                <AttachPopup
                  onClose={() => setShowAttachPopup(false)}
                  isFull={isFull}
                  onFileChange={handleFileChange}
                />
              )}

              {/* daftar AI buat @mention (melayang di atas pil, nggak dorong layout) */}
              <AnimatePresence>
                {mentionQuery !== null && filteredParticipants.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute bottom-full mb-2 left-0 right-0 z-[100]">
                    <div className="bg-[var(--bg)]/80 backdrop-blur-md border border-[var(--text)]/10 shadow-lg rounded-[22px] p-1.5 flex flex-col gap-1 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                      <div className="px-3 py-2 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-wider">Panggil AI di Grup</div>
                      {filteredParticipants.map(p => (
                        <button key={p.id} onClick={() => insertMention(p.name)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--text)]/10 active:scale-95 transition-all text-left [-webkit-tap-highlight-color:transparent]">
                          <div className="flex-1 min-w-0">
                            <span className="text-[15px] font-semibold text-[var(--text)] block truncate">{p.name}</span>
                            <span className="text-[11px] text-[var(--mu)] block truncate">{p.model || 'AI Assistant'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* pil: radius tetap 26px, tumbuh jadi persegi panjang kalau teks panjang */}
              <div
                ref={composerRef}
                className="rounded-[26px] flex flex-col relative overflow-hidden bg-[var(--bg)]/70 border border-[var(--text)]/10 backdrop-blur-md"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >

                {/* balas pesan */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pt-3.5">
                      <div className="bg-[var(--bg)] rounded-[16px] border-l-[4px] border-[var(--text)] p-2.5 pr-9 relative">
                        <button onClick={onCancelReply} className="absolute right-1.5 top-1.5 w-[26px] h-[26px] flex items-center justify-center text-[var(--mu)] rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={15} strokeWidth={2.5} /></button>
                        <div className="text-[11px] font-bold text-[var(--text)] tracking-wide uppercase mb-1">{replyingTo.senderName || (replyingTo.role === 'user' ? 'Kamu' : 'AI')}</div>
                        <span className="text-[13px] text-[var(--text)]/80 line-clamp-2 leading-snug break-words">{replyingTo.content}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* lampiran */}
                {attachedFiles.length > 0 && (
                  <div className="px-3.5 pt-3 pb-1">
                    <div className="flex gap-2 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'none' }}>
                      {attachedFiles.map(file => {
                        if (file.type === 'pdf' || file.type === 'text') {
                          const isPdf = file.type === 'pdf';
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

                {/* textarea bayangan (offscreen) — padding & font sama dengan textarea utama mode PIL */}
                <textarea
                  ref={mirrorRef}
                  rows={1}
                  readOnly
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute -z-10 opacity-0 pointer-events-none bg-transparent border-none outline-none resize-none break-words overflow-hidden text-[15.5px] leading-relaxed py-[9px] pl-3"
                  style={{ left: -9999, top: -9999 }}
                />

                {/* baris utama: pindah susunan lewat class begitu isMultiLine berubah */}
                <div
                  className={cn(
                    "flex px-2",
                    isMultiLine ? "flex-wrap items-end pt-2 pb-1" : "items-center pt-1 pb-1"
                  )}
                >
                  {/* klip lampiran (kiri) */}
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

                  {/* textarea + tombol perbesar (muncul pas mode persegi panjang) */}
                  <div className={cn("relative flex", isMultiLine ? "order-1 w-full flex-1 basis-full" : "flex-1")}>
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={handleTextChange}
                      onPaste={handlePaste}
                      placeholder="Pesan grup atau @sebut..."
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

                  {/* kanan: mikrofon (kosong) / hapus + kirim (ada isi) */}
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
                      <button onClick={startListening} title="Ketik dengan suara" className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                        <IconMic />
                      </button>
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
