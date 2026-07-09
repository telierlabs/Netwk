import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, ChevronRight, X, FileText, Maximize2, ArrowLeft, Trash2, Paperclip, Image as ImageIcon, Camera, Check } from 'lucide-react';
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

const IconHeavy = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>);
const IconThink = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const IconSpark = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const IconAuto = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>);
const IconPaperclip = () => <Paperclip size={20} strokeWidth={2.2} style={{ transform: 'rotate(-45deg)' }} />;
const IconSpeakWave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"></line><line x1="7.5" y1="6" x2="7.5" y2="18"></line><line x1="12" y1="2" x2="12" y2="22"></line><line x1="16.5" y1="6" x2="16.5" y2="18"></line><line x1="21" y1="10" x2="21" y2="14"></line></svg>);

const MODES: { id: ChatMode; label: string; Icon: React.FC }[] = [
  { id: 'fast',  label: 'Spark (Santai)',    Icon: IconSpark },
  { id: 'think', label: 'Thinking (Mendalam)', Icon: IconThink },
  { id: 'heavy', label: 'Heavy (Team of Experts)', Icon: IconHeavy },
  { id: 'auto',  label: 'Auto',              Icon: IconAuto },
];

const MODELS = [
  'Gemini 2.5 Pro',
  'GPT-5.5',
  'Claude 3.7 Opus',
  'Perplexity',
  'Meta AI',
  'DeepSeek V3',
  'Qwen 2.5',
  'Mistral Large 2',
];

type AttachPanel = 'main' | 'model';

// Popup gabungan: attach (file/gallery/camera) + mode + model, 2 panel seperti mockup HTML
const AttachModePopup: React.FC<{
  panel: AttachPanel;
  setPanel: (p: AttachPanel) => void;
  onClose: () => void;
  mode: ChatMode;
  onModeChange?: (m: ChatMode) => void;
  onCloseCanvas?: () => void;
  isCanvasActive?: boolean;
  currentModel: string;
  onModelChange: (m: string) => void;
  isFull: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ panel, setPanel, onClose, mode, onModeChange, onCloseCanvas, isCanvasActive, currentModel, onModelChange, isFull, onFileChange }) => (
  <>
    <div className="fixed inset-0 z-[90]" onClick={onClose} />
    <div
      className="absolute bottom-full mb-3 left-1.5 z-[100] rounded-[26px] p-2 overflow-hidden bg-black/75 border border-[var(--text)]/10 backdrop-blur-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]"
      style={{ width: 260, maxWidth: 'calc(100vw - 40px)' }}
    >
      {panel === 'main' ? (
        <div className="flex flex-col">
          <div className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold relative overflow-hidden text-[var(--text)]", isFull ? "opacity-40" : "hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8")}>
            <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple onChange={onFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
            <span className="w-5 h-5 flex items-center justify-center opacity-85 pointer-events-none"><FileText size={19} /></span>
            <span className="pointer-events-none">File</span>
          </div>
          <div className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold relative overflow-hidden text-[var(--text)]", isFull ? "opacity-40" : "hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8")}>
            <input type="file" accept="image/*,video/*" multiple onChange={onFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
            <span className="w-5 h-5 flex items-center justify-center opacity-85 pointer-events-none"><ImageIcon size={19} /></span>
            <span className="pointer-events-none">Gallery</span>
          </div>
          <div className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold relative overflow-hidden text-[var(--text)]", isFull ? "opacity-40" : "hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8")}>
            <input type="file" accept="image/*" capture="environment" onChange={onFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
            <span className="w-5 h-5 flex items-center justify-center opacity-85 pointer-events-none"><Camera size={19} /></span>
            <span className="pointer-events-none">Camera</span>
          </div>

          <div className="h-px bg-[var(--text)]/10 my-1.5 mx-1" />

          {MODES.map(m => {
            const active = mode === m.id && !isCanvasActive;
            return (
              <button
                key={m.id}
                onClick={() => { onModeChange?.(m.id); onCloseCanvas?.(); onClose(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[14.5px] font-semibold text-left text-[var(--text)]",
                  active ? "bg-[var(--text)]/12" : "hover:bg-[var(--text)]/8 active:bg-[var(--text)]/8"
                )}
              >
                <span className="w-5 h-5 flex items-center justify-center opacity-85"><m.Icon /></span>
                {m.label}
              </button>
            );
          })}

          <div className="h-px bg-[var(--text)]/10 my-1.5 mx-1" />

          <button
            onClick={() => setPanel('model')}
            className="w-full flex items-center justify-between bg-[var(--text)]/5 rounded-2xl px-3 py-2.5 text-[var(--text)]"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--mu)]">Current Model</span>
              <span className="text-[14px] font-bold">{currentModel}</span>
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="text-center text-[15px] font-bold pt-2.5 pb-2 text-[var(--text)]">Choose AI Model</div>
          <div className="max-h-80 overflow-y-auto flex flex-col gap-px">
            {MODELS.map(name => {
              const selected = currentModel === name;
              return (
                <button
                  key={name}
                  onClick={() => onModelChange(name)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-2xl text-[14px] font-semibold text-left text-[var(--text)] hover:bg-[var(--text)]/6 active:bg-[var(--text)]/6"
                >
                  <span className={cn(
                    "flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center",
                    selected ? "border-[var(--text)] bg-[var(--text)]" : "border-[var(--text)]/35"
                  )}>
                    {selected && <span className="w-[7px] h-[7px] rounded-full bg-[var(--bg)]" />}
                  </span>
                  {name}
                  {selected && <Check size={16} className="ml-auto opacity-90" />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPanel('main')}
            className="w-full mt-2 py-3 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold text-[14.5px]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  </>
);

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onCloseCanvas,
  isCanvasActive = false, replyingTo, onCancelReply,
  currentModel: currentModelProp, onModelChange: onModelChangeProp,
}) => {
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const baselineHeightRef = useRef<number | null>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [isListening,   setIsListening]   = useState(false);
  const [voiceText,     setVoiceText]     = useState('');
  const [showLiveVoice,    setShowLiveVoice]    = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);

  const [showAttachPopup, setShowAttachPopup] = useState(false);
  const [attachPanel, setAttachPanel] = useState<AttachPanel>('main');

  const [localModel, setLocalModel] = useState('Gemini 2.5 Pro');
  const currentModel = currentModelProp ?? localModel;
  const handleModelChange = (m: string) => {
    setLocalModel(m);
    onModelChangeProp?.(m);
  };

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    if (baselineHeightRef.current === null) {
      baselineHeightRef.current = el.scrollHeight;
    }
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${newHeight}px`;
    setIsMultiline(el.scrollHeight > (baselineHeightRef.current ?? 0) + 4);
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
        setTimeout(() => handleSend(), 50);
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

  const toggleAttachPopup = () => {
    setShowAttachPopup(prev => {
      if (!prev) setAttachPanel('main');
      return !prev;
    });
  };

  const closeAttachPopup = () => {
    setShowAttachPopup(false);
    setAttachPanel('main');
  };

  const renderFullscreenEditor = () => (
    <AnimatePresence>
      {isFullscreenEditor && (
        <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }} className="fixed inset-0 z-[300] bg-[var(--bg)] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--text)]/10 bg-[var(--bg)] shadow-sm z-[310]">
            <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] transition-colors rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><ArrowLeft size={24} strokeWidth={2.5} /></button>
            <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Edit Pesan</span>
            <div className="flex items-center">
              <button onClick={(e) => { e.stopPropagation(); handleClearText(); setIsFullscreenEditor(false); }} className="p-2 text-[var(--text)] rounded-full active:scale-90 mr-2 [-webkit-tap-highlight-color:transparent]"><Trash2 size={22} strokeWidth={2} /></button>
              <button onClick={(e) => { e.stopPropagation(); setIsFullscreenEditor(false); }} className="p-2 -mr-2 text-[var(--text)]/60 rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={24} strokeWidth={2.5} /></button>
            </div>
          </div>
          <div className="flex-1 p-5 overflow-hidden bg-[var(--bg)] z-[305]">
            <textarea autoFocus value={inputText} onChange={e => setInputText(e.target.value)} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-[var(--text)] placeholder:text-[var(--mu)] focus:ring-0 [-webkit-tap-highlight-color:transparent]" style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any} placeholder="Tulis pesan atau tempel kode panjang di sini..." />
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

      <footer className={cn("px-2 pb-6 relative z-50 pointer-events-auto w-full", compact ? "pt-0" : "pt-2")}>
        {showAttachPopup && (
          <AttachModePopup
            panel={attachPanel}
            setPanel={setAttachPanel}
            onClose={closeAttachPopup}
            mode={mode}
            onModeChange={onModeChange}
            onCloseCanvas={onCloseCanvas}
            isCanvasActive={isCanvasActive}
            currentModel={currentModel}
            onModelChange={handleModelChange}
            isFull={isFull}
            onFileChange={handleFileChange}
          />
        )}

        <div className="max-w-4xl mx-auto w-full">
          {isListening && !showLiveVoice ? (
            <div className="flex items-center justify-between w-full h-[64px] rounded-full px-2 relative overflow-hidden bg-[var(--text)]/5 shadow-sm backdrop-blur-md border border-[var(--text)]/10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[50px] bg-[var(--text)]/20 blur-[20px] rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
              <button onClick={() => { setVoiceText(''); stopListening(); }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--bg)] text-[var(--text)] active:scale-95 transition-transform shadow-sm [-webkit-tap-highlight-color:transparent]"><X size={20} strokeWidth={2.5} /></button>
              <div className="relative z-10 flex-1 flex justify-center items-center px-4 overflow-hidden">
                {voiceText
                  ? <span className="text-[15px] font-medium text-[var(--text)] truncate">{voiceText}</span>
                  : <div className="flex items-center text-[var(--mu)] text-[13px] font-medium"><ChevronRight size={16} className="rotate-180 mr-1 opacity-50" /> Bicara sekarang...</div>
                }
              </div>
              <button onClick={() => { stopListening(); if (voiceText) { setInputText(voiceText); setTimeout(() => handleSend(), 50); } else if (inputText) { handleSend(); } }} className="relative z-10 w-[46px] h-[46px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] active:scale-95 transition-transform shadow-md [-webkit-tap-highlight-color:transparent]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" strokeWidth="2.5"/></svg>
              </button>
            </div>
          ) : (
            <div className="relative w-full">
              {/* radius fixed 26px sesuai mockup - bukan rounded-full */}
              <div className="rounded-[26px] flex flex-col relative overflow-hidden bg-[var(--text)]/[0.06] border border-[var(--text)]/10 shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md">

                <AnimatePresence>
                  {replyingTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pt-3.5">
                      <div className="bg-[var(--bg)] rounded-[16px] border-l-[4px] border-[var(--text)] p-3 pr-10 relative">
                        <button onClick={onCancelReply} className="absolute right-1.5 top-1.5 p-1.5 text-[var(--mu)] rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={16} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1.5 mb-1"><span className="text-[11px] font-bold text-[var(--text)] tracking-wide uppercase">{replyingTo.role === 'user' ? 'Kamu' : 'Cylen AI'}</span></div>
                        <span className="text-[13px] text-[var(--text)]/80 line-clamp-2 font-medium leading-snug break-words">{replyingTo.content}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* attach row - chip pil sesuai mockup */}
                {attachedFiles.length > 0 && (
                  <div className="px-3.5 pt-3 pb-1.5">
                    <div className="flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: 'none' }}>
                      {attachedFiles.map(file => {
                        if (file.type === 'pdf' || file.type === 'text') {
                          const isPdf = file.type === 'pdf';
                          return (
                            <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 flex items-center gap-2 h-[44px] pl-1 pr-2.5 bg-[var(--text)]/7 border border-[var(--text)]/12 rounded-full max-w-[190px]">
                              <div className={cn("flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center", isPdf ? "bg-red-500/18 text-red-500" : "bg-blue-500/18 text-blue-500")}>
                                <FileText size={17} />
                              </div>
                              <span className="text-[12.5px] font-semibold truncate max-w-[100px] text-[var(--text)]">
                                {file.name || 'Dokumen'}
                              </span>
                              <button onClick={() => removeFile(file.id)} className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--text)]/10 flex items-center justify-center text-[var(--text)] [-webkit-tap-highlight-color:transparent]">
                                <X size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 h-[44px] w-[104px] rounded-full overflow-hidden bg-[var(--text)]/7 border border-[var(--text)]/12">
                            {file.type === 'video' ? (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <img src={file.url} alt="" className="w-full h-full object-cover block" />
                              </div>
                            )}
                            <button onClick={() => removeFile(file.id)} className="absolute top-1 right-1 w-5 h-5 bg-black/65 text-white rounded-full flex items-center justify-center z-10 [-webkit-tap-highlight-color:transparent]">
                              <X size={11} strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* input row - normal / stacked sesuai mockup */}
                <div className={cn(
                  "flex items-center px-2 py-1.5 relative",
                  isMultiline ? "flex-wrap items-end gap-y-1.5 pt-2 pb-1.5" : "gap-1"
                )}>
                  {!isMultiline && (
                    <button
                      onClick={() => !isFull && toggleAttachPopup()}
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors [-webkit-tap-highlight-color:transparent]",
                        showAttachPopup ? "bg-[var(--text)]/12 text-[var(--text)]"
                        : isFull        ? "opacity-30 text-[var(--text)]"
                                        : "text-[var(--text)] bg-[var(--text)]/6 hover:bg-[var(--text)]/12"
                      )}
                    >
                      <IconPaperclip />
                    </button>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Tanya apa saja..."
                    rows={1}
                    className={cn(
                      "bg-transparent border-none outline-none resize-none text-[15.5px] leading-snug placeholder:text-[var(--mu)] text-[var(--text)] min-h-[24px] max-h-40 py-[9px] px-1 focus:ring-0 focus:outline-none",
                      isMultiline ? "order-1 basis-full w-full pr-7" : "flex-1"
                    )}
                    style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any}
                  />

                  {isMultiline && (
                    <button
                      onClick={() => setIsFullscreenEditor(true)}
                      className="absolute top-2 right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-black/70 border border-[var(--text)]/12 text-[var(--text)] z-[5] [-webkit-tap-highlight-color:transparent]"
                      title="Buka layar penuh"
                    >
                      <Maximize2 size={14} strokeWidth={2.5} />
                    </button>
                  )}

                  {isMultiline && (
                    <button
                      onClick={() => !isFull && toggleAttachPopup()}
                      className={cn(
                        "order-2 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors [-webkit-tap-highlight-color:transparent]",
                        showAttachPopup ? "bg-[var(--text)]/12 text-[var(--text)]"
                        : isFull        ? "opacity-30 text-[var(--text)]"
                                        : "text-[var(--text)] bg-[var(--text)]/6 hover:bg-[var(--text)]/12"
                      )}
                    >
                      <IconPaperclip />
                    </button>
                  )}

                  <div className={cn("flex items-center gap-1 flex-shrink-0", isMultiline && "order-3 ml-auto")}>
                    {hasContent && (
                      <button onClick={handleClearText} className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[var(--text)]/50 [-webkit-tap-highlight-color:transparent]">
                        <Trash2 size={15} />
                      </button>
                    )}
                    {!hasContent && (
                      <button onClick={startListening} className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/6 [-webkit-tap-highlight-color:transparent]">
                        <Mic size={19} strokeWidth={2.5} />
                      </button>
                    )}
                    {hasContent ? (
                      <button onClick={handleSend} disabled={isSending} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] shadow-[0_2px_10px_rgba(0,0,0,0.3)] active:scale-95 [-webkit-tap-highlight-color:transparent]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"/><line x1="7.5" y1="6" x2="7.5" y2="18"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="16.5" y1="6" x2="16.5" y2="18"/><line x1="21" y1="10" x2="21" y2="14"/></svg>
                      </button>
                    ) : (
                      <button onClick={() => setShowLiveVoice(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold shadow-md flex-shrink-0 ml-1 [-webkit-tap-highlight-color:transparent]">
                        <IconSpeakWave /><span className="text-[13px]">Speak</span>
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
