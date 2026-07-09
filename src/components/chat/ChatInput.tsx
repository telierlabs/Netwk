import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Trash2, ArrowLeft, Maximize2 } from 'lucide-react';
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

const MODES = [
  { id: 'heavy', label: 'Heavy', desc: 'Team of Experts' },
  { id: 'think', label: 'Think', desc: 'Analisis mendalam & teliti' },
  { id: 'fast',  label: 'Spark', desc: 'Respons cepat & ringan' },
  { id: 'auto',  label: 'Auto',  desc: 'Pilih mode otomatis' },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onOpenCanvas, onCloseCanvas,
  isCanvasActive = false, onUpgradeClick, replyingTo, onCancelReply
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const baselineHeightRef = useRef<number | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [showMaximize, setShowMaximize] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

  // Ukur tinggi awal persis kayak logic HTML lu
  useEffect(() => {
    if (textareaRef.current && baselineHeightRef.current === null) {
      textareaRef.current.style.height = 'auto';
      baselineHeightRef.current = textareaRef.current.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 140);
    el.style.height = `${newHeight}px`;
    
    // Logic stacked: pindah layout kalo tinggi lewat dari 1 baris (+4px safety)
    const isMultiLine = baselineHeightRef.current !== null && el.scrollHeight > baselineHeightRef.current + 4;
    setShowMaximize(isMultiLine);
  }, [inputText]);

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
    setShowPicker(false);
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
    const pdfFiles = attachedFiles.filter(f => f.type === 'pdf' || f.type === 'text').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setAttachedImage(null); setIsFullscreenEditor(false); setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleClearText = () => { setInputText(''); if (textareaRef.current) textareaRef.current.style.height = 'auto'; };
  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  return (
    <>
      <AnimatePresence>
        {isFullscreenEditor && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }} className="fixed inset-0 z-[500] bg-[#0a0a0a] flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f5f5f5]/10 shadow-sm z-[310]">
              <button onClick={() => setIsFullscreenEditor(false)} className="w-[38px] h-[38px] rounded-full text-[#f5f5f5] flex items-center justify-center hover:bg-white/5 active:scale-95 [-webkit-tap-highlight-color:transparent]"><ArrowLeft size={22} strokeWidth={2.5} /></button>
              <span className="font-bold text-[16px] text-[#f5f5f5]">Edit Pesan</span>
              <button onClick={() => setIsFullscreenEditor(false)} className="w-[38px] h-[38px] rounded-full text-[#f5f5f5] flex items-center justify-center hover:bg-white/5 active:scale-95 [-webkit-tap-highlight-color:transparent]"><X size={22} strokeWidth={2.5} /></button>
            </div>
            <div className="flex-1 p-[18px] overflow-hidden bg-[#0a0a0a] z-[305]">
              <textarea autoFocus value={inputText} onChange={e => setInputText(e.target.value)} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none text-[16px] leading-[1.6] text-[#f5f5f5] placeholder:text-[#8a8a8a] focus:ring-0 [-webkit-tap-highlight-color:transparent]" placeholder="Tulis pesan atau tempel kode panjang di sini..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLiveVoice && <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />}

      <footer className={cn("px-[10px] pb-[28px] relative z-50 pointer-events-auto w-full max-w-[460px] mx-auto", compact ? "pt-0" : "pt-[24px]")}>
        {showPicker && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />
            <div className="absolute bottom-[calc(100%+12px)] left-[6px] w-[260px] max-w-[calc(100vw-40px)] z-[100] rounded-[26px] bg-[#181818]/75 backdrop-blur-[24px] border border-white/[0.12] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)] p-2 flex flex-col gap-1">
              {/* Menu file disesuaikan sederhana, bisa di-expand kalau lu butuh logic detail pop-upnya */}
              <label className={cn("w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] transition-colors text-[#f5f5f5] font-semibold text-[14.5px]", isFull ? "opacity-40" : "hover:bg-white/[0.08] active:bg-white/[0.08] cursor-pointer")}>
                <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} disabled={isFull} className="hidden" />
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></span>
                Galeri
              </label>
              <label className={cn("w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] transition-colors text-[#f5f5f5] font-semibold text-[14.5px]", isFull ? "opacity-40" : "hover:bg-white/[0.08] active:bg-white/[0.08] cursor-pointer")}>
                <input type="file" accept=".pdf,.txt,.doc,.docx" multiple onChange={handleFileChange} disabled={isFull} className="hidden" />
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
                Dokumen
              </label>
            </div>
          </>
        )}

        <div className="relative w-full">
          {/* THE PILL - Kunci utama desain lu dengan radius fix 26px */}
          <div 
            className="flex flex-col relative overflow-hidden bg-white/[0.06] border border-white/[0.1] shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-[10px]"
            style={{ borderRadius: '26px' }}
          >
            {/* Reply Box */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-[14px] px-[16px]">
                  <div className="bg-[#0a0a0a] rounded-[16px] border-l-[4px] border-[#f5f5f5] p-[10px_34px_10px_12px] relative">
                    <button onClick={onCancelReply} className="absolute right-[6px] top-[6px] w-[26px] h-[26px] rounded-full flex items-center justify-center text-[#8a8a8a] bg-transparent border-none cursor-pointer [-webkit-tap-highlight-color:transparent]"><X size={14} strokeWidth={3} /></button>
                    <div className="text-[11px] font-bold uppercase tracking-[0.04em] mb-1 text-[#f5f5f5]">{replyingTo.role === 'user' ? 'Kamu' : 'Cylen AI'}</div>
                    <div className="text-[13px] text-[#f5f5f5]/80 leading-[1.3] line-clamp-2">{replyingTo.content}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Attachments - Bentuk murni kapsul 999px */}
            {attachedFiles.length > 0 && (
              <div className="flex items-center gap-2 px-[14px] pt-[12px] pb-[6px] overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch]" style={{ scrollbarWidth: 'none' }}>
                {attachedFiles.map(file => {
                  if (file.type === 'pdf' || file.type === 'text') {
                    return (
                      <div key={file.id} className="flex-shrink-0 max-w-[190px] h-[44px] rounded-full bg-white/[0.07] border border-white/[0.12] flex items-center gap-2 p-[4px_10px_4px_4px] text-[#f5f5f5]">
                        <span className={cn("flex-shrink-0 w-[36px] h-[36px] rounded-full overflow-hidden flex items-center justify-center", file.type === 'pdf' ? "bg-red-500/[0.18] text-red-500" : "bg-blue-500/[0.18] text-blue-500")}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </span>
                        <span className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{file.name}</span>
                        <button onClick={() => removeFile(file.id)} className="flex-shrink-0 w-[20px] h-[20px] rounded-full bg-white/10 flex items-center justify-center text-[#f5f5f5] border-none cursor-pointer [-webkit-tap-highlight-color:transparent]"><X size={12} strokeWidth={2.5} /></button>
                      </div>
                    );
                  }
                  return (
                    <div key={file.id} className="relative flex-shrink-0 w-[104px] max-w-[104px] h-[44px] rounded-full overflow-hidden p-0 bg-white/[0.07] border border-white/[0.12]">
                      <img src={file.url} alt="" className="w-full h-full object-cover block" onClick={() => setLightboxUrl(file.url)} />
                      <button onClick={() => removeFile(file.id)} className="absolute top-[3px] right-[3px] w-[20px] h-[20px] bg-black/65 rounded-full flex items-center justify-center text-[#f5f5f5] border-none cursor-pointer [-webkit-tap-highlight-color:transparent]"><X size={12} strokeWidth={2.5} /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* INPUT ROW - Logika Flex persis index.html */}
            <div className={cn(
              "flex items-center gap-x-1 gap-y-1.5 transition-none", 
              showMaximize ? "flex-wrap items-end p-[8px_8px_6px]" : "flex-nowrap p-[6px_8px]"
            )}>
              
              {/* Paperclip Button */}
              <button onClick={() => !isFull && setShowPicker(p => !p)} className={cn("flex-shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center text-[#f5f5f5] border-none cursor-pointer [-webkit-tap-highlight-color:transparent] transition-colors", showPicker ? "bg-white/[0.12]" : "bg-white/[0.06] hover:bg-white/[0.12]", showMaximize ? "order-2" : "order-1")} title="Lampirkan file">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              </button>

              {/* Textarea Area */}
              <div className={cn("relative flex", showMaximize ? "flex-[1_1_100%] order-1" : "flex-1 order-2")}>
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Tanya apa saja..."
                  rows={1}
                  className={cn(
                    "w-full bg-transparent border-none outline-none resize-none text-[15.5px] leading-[1.4] text-[#f5f5f5] placeholder:text-[#8a8a8a] focus:ring-0 min-h-[24px]",
                    showMaximize ? "p-[6px_26px_6px_8px]" : "p-[9px_4px]"
                  )}
                  style={{ fontFamily: 'inherit' }}
                />
                
                {/* Maximize Button muncul kalau panjang */}
                <AnimatePresence>
                  {showMaximize && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFullscreenEditor(true)} className="absolute top-[8px] right-[10px] w-[28px] h-[28px] rounded-full flex items-center justify-center bg-[#141414]/70 border border-white/[0.12] text-[#f5f5f5] cursor-pointer z-[5] [-webkit-tap-highlight-color:transparent]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Controls */}
              <div className={cn("flex items-center gap-1 flex-shrink-0", showMaximize ? "order-3 ml-auto" : "order-3")}>
                {hasContent && (
                  <button onClick={handleClearText} className="flex-shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#f5f5f5]/50 bg-transparent border-none cursor-pointer [-webkit-tap-highlight-color:transparent]">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                )}
                
                {!hasContent && (
                  <button onClick={startListening} className="flex-shrink-0 w-[40px] h-[40px] rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] text-[#f5f5f5] border-none cursor-pointer transition-colors [-webkit-tap-highlight-color:transparent]">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                  </button>
                )}

                {/* Send Button logic murni HTML */}
                <button onClick={() => { if(hasContent) handleSend(); else setShowLiveVoice(true); }} className="flex-shrink-0 w-[36px] h-[36px] rounded-full bg-[#f5f5f5] text-[#0a0a0a] flex items-center justify-center border-none shadow-[0_2px_10px_rgba(0,0,0,0.3)] cursor-pointer active:scale-[0.94] [-webkit-tap-highlight-color:transparent]">
                  {hasContent ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7.5" y1="6" x2="7.5" y2="18"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="16.5" y1="6" x2="16.5" y2="18"/><line x1="21" y1="10" x2="21" y2="14"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
