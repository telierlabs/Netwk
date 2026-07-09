import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, FileText, ArrowLeft, Trash2 } from 'lucide-react';
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
}

const MAX_FILES = 5;
const MAX_PASTE_LENGTH = 3000;

const MODELS = [
  'Gemini 2.5 Pro',
  'GPT-5.5',
  'Claude 3.7 Opus',
  'Perplexity',
  'Meta AI',
  'DeepSeek V3',
  'Qwen 2.5',
  'Mistral Large 2'
];

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'fast', onModeChange, onOpenCanvas, onCloseCanvas,
  isCanvasActive = false, onUpgradeClick, replyingTo, onCancelReply
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  
  // States untuk UI baru
  const [showPopup, setShowPopup] = useState(false);
  const [popupView, setPopupView] = useState<'main' | 'model'>('main');
  const [currentModel, setCurrentModel] = useState('Gemini 2.5 Pro');
  const [isStacked, setIsStacked] = useState(false);
  const [baselineHeight, setBaselineHeight] = useState<number | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

  // Ukur tinggi awal textarea buat nentuin kapan layout berubah jadi stacked
  useEffect(() => {
    if (textareaRef.current && baselineHeight === null) {
      setBaselineHeight(textareaRef.current.scrollHeight);
    }
  }, []);

  const handleType = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setInputText(el.value);
    
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    
    if (baselineHeight !== null) {
      setIsStacked(el.scrollHeight > baselineHeight + 4);
    }
  };

  const clearText = () => {
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setIsStacked(false);
      textareaRef.current.focus();
    }
  };

  // --- File Logic ---
  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const type = file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('video') ? 'video' : file.type.startsWith('text') ? 'text' : 'image';
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
    setShowPopup(false);
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
    setAttachedFiles([]); setAttachedImage(null); setIsFullscreenEditor(false); clearText();
  };

  // --- Voice Logic ---
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
        setTimeout(() => handleSend(), 50);
      }
    };
    rec.onend = () => { setIsListening(false); setVoiceText(''); };
    rec.onerror = () => { setIsListening(false); setVoiceText(''); };
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText]);

  const stopListening = useCallback(() => { recognitionRef.current?.stop(); setIsListening(false); setVoiceText(''); }, []);
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const hasText = inputText.trim().length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  return (
    <>
      {/* Lightbox buat preview gambar */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 pointer-events-auto" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.includes('video')
            ? <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" />
            : <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl" />
          }
          <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}><X size={20} /></button>
        </div>
      )}

      {showLiveVoice && <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />}

      {/* Fullscreen Editor */}
      <AnimatePresence>
        {isFullscreenEditor && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }} className="fixed inset-0 z-[500] bg-[var(--bg)] flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgba(255,255,255,0.1)]">
              <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="w-10 h-10 flex items-center justify-center bg-transparent border-none text-[var(--text)] rounded-full [-webkit-tap-highlight-color:transparent]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              </button>
              <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Edit Pesan</span>
              <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="w-10 h-10 flex items-center justify-center bg-transparent border-none text-[var(--text)] rounded-full [-webkit-tap-highlight-color:transparent]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <textarea autoFocus value={inputText} onChange={(e) => handleType(e as any)} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none text-[16px] leading-[1.6] text-[var(--text)] placeholder:text-[var(--mu)] focus:ring-0 [-webkit-tap-highlight-color:transparent]" style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any} placeholder="Tulis pesan atau tempel kode panjang di sini..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="w-full px-2.5 pb-7 relative z-50 pointer-events-auto">
        <div className="max-w-[460px] mx-auto w-full relative">
          
          {/* Popup Overlay & Menu Utama */}
          {showPopup && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => { setShowPopup(false); setPopupView('main'); }} />
              <div className="absolute bottom-[calc(100%+12px)] left-1.5 w-[260px] max-w-[calc(100vw-40px)] z-[100] rounded-[26px] bg-[rgba(24,24,24,0.75)] border border-[rgba(255,255,255,0.12)] backdrop-blur-[24px] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] p-2 overflow-hidden">
                
                {/* Panel Utama (File, Mode, Model Select) */}
                <div className={cn("flex-col", popupView === 'main' ? "flex" : "hidden")}>
                  {/* Buttons File/Media */}
                  <div className="relative w-full">
                    <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                    <button className="flex items-center gap-3 w-full bg-transparent text-[var(--text)] px-3 py-2.5 rounded-[16px] text-[14.5px] font-semibold text-left hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.08)] transition-colors">
                      <span className="w-5 h-5 flex items-center justify-center opacity-85">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </span>
                      File
                    </button>
                  </div>
                  
                  <div className="relative w-full">
                    <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                    <button className="flex items-center gap-3 w-full bg-transparent text-[var(--text)] px-3 py-2.5 rounded-[16px] text-[14.5px] font-semibold text-left hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.08)] transition-colors">
                      <span className="w-5 h-5 flex items-center justify-center opacity-85">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </span>
                      Gallery
                    </button>
                  </div>

                  <div className="relative w-full">
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                    <button className="flex items-center gap-3 w-full bg-transparent text-[var(--text)] px-3 py-2.5 rounded-[16px] text-[14.5px] font-semibold text-left hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.08)] transition-colors">
                      <span className="w-5 h-5 flex items-center justify-center opacity-85">
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </span>
                      Camera
                    </button>
                  </div>

                  <div className="h-[1px] bg-[rgba(255,255,255,0.1)] mx-1 my-1.5" />

                  {/* Mode Selectors */}
                  <button onClick={() => { onModeChange?.('fast'); setShowPopup(false); }} className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-[16px] text-[14.5px] font-semibold text-left transition-colors", mode === 'fast' ? "bg-[rgba(255,255,255,0.12)] text-[var(--text)]" : "bg-transparent text-[var(--text)] hover:bg-[rgba(255,255,255,0.08)]")}>
                    <span className="w-5 h-5 flex items-center justify-center opacity-85"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                    Spark (Santai)
                  </button>
                  <button onClick={() => { onModeChange?.('think'); setShowPopup(false); }} className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-[16px] text-[14.5px] font-semibold text-left transition-colors", mode === 'think' ? "bg-[rgba(255,255,255,0.12)] text-[var(--text)]" : "bg-transparent text-[var(--text)] hover:bg-[rgba(255,255,255,0.08)]")}>
                    <span className="w-5 h-5 flex items-center justify-center opacity-85"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span>
                    Thinking (Mendalam)
                  </button>

                  <div className="h-[1px] bg-[rgba(255,255,255,0.1)] mx-1 my-1.5" />

                  {/* Model Picker */}
                  <button onClick={() => setPopupView('model')} className="flex items-center justify-between w-full bg-[rgba(255,255,255,0.05)] text-[var(--text)] px-3 py-2.5 rounded-[16px] cursor-pointer">
                    <div className="flex flex-col items-start gap-px">
                      <span className="text-[10.5px] text-[var(--mu)] font-semibold uppercase tracking-[0.03em]">Current Model</span>
                      <span className="text-[14px] font-bold">{currentModel}</span>
                    </div>
                    <span className="opacity-50 flex"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
                  </button>
                </div>

                {/* Panel Model */}
                <div className={cn("flex-col", popupView === 'model' ? "flex" : "hidden")}>
                  <div className="text-center text-[15px] font-bold px-2 pt-2.5 pb-2 text-[var(--text)]">Choose AI Model</div>
                  <div className="max-h-[320px] overflow-y-auto flex flex-col gap-px [&::-webkit-scrollbar]:hidden">
                    {MODELS.map((m) => (
                      <button key={m} onClick={() => { setCurrentModel(m); setPopupView('main'); }} className="flex items-center gap-2.5 w-full bg-transparent border-none text-[var(--text)] px-2.5 py-2.5 rounded-[14px] text-[14px] font-semibold text-left hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.06)]">
                        <span className={cn("shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center", currentModel === m ? "border-[var(--text)] bg-[var(--text)]" : "border-[rgba(255,255,255,0.35)]")}>
                          {currentModel === m && <div className="w-[7px] h-[7px] rounded-full bg-[var(--bg)]" />}
                        </span>
                        {m}
                        {currentModel === m && (
                          <span className="ml-auto opacity-90"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                        )}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPopupView('main')} className="w-full mt-2 p-3 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold text-[14.5px] cursor-pointer">Done</button>
                </div>
              </div>
            </>
          )}

          {/* THE PILL */}
          <div className="flex flex-col relative overflow-hidden bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-[10px] rounded-[26px]">
            
            {/* Reply Preview */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pt-3.5">
                  <div className="bg-[var(--bg)] rounded-[16px] border-l-[4px] border-[var(--text)] px-3 py-2.5 pr-8 relative">
                    <button onClick={onCancelReply} className="absolute right-1.5 top-1.5 w-[26px] h-[26px] rounded-full flex items-center justify-center text-[var(--mu)] hover:bg-[rgba(255,255,255,0.1)] bg-transparent border-none cursor-pointer [-webkit-tap-highlight-color:transparent]"><X size={14} strokeWidth={2.5} /></button>
                    <div className="text-[11px] font-bold uppercase tracking-[0.04em] mb-1 text-[var(--text)]">{replyingTo.role === 'user' ? 'Kamu' : 'Cylen AI'}</div>
                    <div className="text-[13px] text-[rgba(245,245,245,0.8)] leading-[1.3] line-clamp-2">{replyingTo.content}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachments Area */}
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden px-3.5 pt-3 pb-1.5 [&::-webkit-scrollbar]:hidden">
                {attachedFiles.map(file => {
                  if (file.type === 'pdf' || file.type === 'text') {
                    const isPdf = file.type === 'pdf';
                    return (
                      <div key={file.id} className="shrink-0 max-w-[190px] h-[44px] rounded-full bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.12)] flex items-center gap-2 pr-2.5 pl-1 text-[var(--text)]">
                        <span className={cn("shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center", isPdf ? "bg-[rgba(239,68,68,0.18)] text-[#ef4444]" : "bg-[rgba(59,130,246,0.18)] text-[#3b82f6]")}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </span>
                        <span className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{file.name}</span>
                        <button onClick={() => removeFile(file.id)} className="shrink-0 w-5 h-5 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[var(--text)] cursor-pointer"><X size={12} strokeWidth={3} /></button>
                      </div>
                    );
                  }
                  return (
                    <div key={file.id} className="relative shrink-0 p-0 w-[104px] max-w-[104px] h-[44px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.12)] flex items-center justify-center cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                      {file.type === 'video' ? (
                        <>
                          <video src={file.url} className="w-full h-full object-cover block" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-6 h-6 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg></div></div>
                        </>
                      ) : (
                        <img src={file.url} alt="Attached" className="w-full h-full object-cover block" />
                      )}
                      <button onClick={(e) => { e.stopPropagation(); removeFile(file.id); }} className="absolute top-[3px] right-[3px] w-5 h-5 rounded-full bg-[rgba(0,0,0,0.65)] flex items-center justify-center text-[var(--text)] cursor-pointer z-10"><X size={12} strokeWidth={3} /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input Row Container */}
            <div className={cn("flex items-center flex-nowrap px-2 relative", isStacked ? "flex-wrap items-end pt-2 pb-1.5 gap-y-1.5" : "py-1.5 gap-x-1")}>
              
              {/* Toolbar Kiri (Paperclip) */}
              <button onClick={() => setShowPopup(p => !p)} title="Lampiran" className={cn("shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[var(--text)] transition-colors hover:bg-[rgba(255,255,255,0.12)] active:scale-95 [-webkit-tap-highlight-color:transparent]", isStacked ? "order-2" : "")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>

              {/* Text Area */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleType}
                onPaste={handlePaste}
                placeholder="Tanya apa saja..."
                rows={1}
                className={cn(
                  "bg-transparent border-none outline-none resize-none text-[var(--text)] text-[15.5px] leading-[1.4] min-h-[24px] max-h-[140px] py-[9px] px-1 font-inherit placeholder:text-[var(--mu)] [-webkit-tap-highlight-color:transparent]",
                  isStacked ? "flex-[1_1_100%] order-1 pl-2 pr-[26px]" : "flex-1"
                )}
                style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any}
              />

              {/* Tombol Maximize (Hanya muncul saat stacked/multiline) */}
              {isStacked && (
                <button onClick={() => setIsFullscreenEditor(true)} className="absolute top-2 right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(20,20,20,0.7)] border border-[rgba(255,255,255,0.12)] text-[var(--text)] cursor-pointer z-[5] [-webkit-tap-highlight-color:transparent]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </button>
              )}

              {/* Toolbar Kanan */}
              <div className={cn("flex items-center gap-1 shrink-0", isStacked ? "order-3 ml-auto" : "")}>
                
                {/* Clear Text Btn */}
                {hasText && (
                  <button onClick={clearText} className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[rgba(245,245,245,0.5)] bg-transparent border-none cursor-pointer [-webkit-tap-highlight-color:transparent]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                )}

                {/* Mic Btn (Sembunyi kalau ada teks) */}
                {!hasText && (
                  <button onClick={() => setShowLiveVoice(true)} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[var(--text)] hover:bg-[rgba(255,255,255,0.12)] transition-colors active:scale-95 [-webkit-tap-highlight-color:transparent]">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </button>
                )}

                {/* Send Btn */}
                <button id="sendBtn" onClick={handleSend} disabled={isSending} className="shrink-0 w-[36px] h-[36px] rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center border-none cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.3)] active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
                  <svg id="sendIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={hasText ? "3" : "2.2"} strokeLinecap="round" strokeLinejoin="round">
                    {hasText ? (
                      <path d="M12 19V5M5 12l7-7 7 7"/>
                    ) : (
                      <>
                        <line x1="3" y1="10" x2="3" y2="14"/><line x1="7.5" y1="6" x2="7.5" y2="18"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="16.5" y1="6" x2="16.5" y2="18"/><line x1="21" y1="10" x2="21" y2="14"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>

            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
