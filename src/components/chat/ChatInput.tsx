import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, ChevronRight, X, FileText, Maximize2, ArrowLeft, Trash2, Rocket, Paperclip } from 'lucide-react';
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

const IconHeavy = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>);
const IconThink = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const IconSpark = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const IconAuto = () => <Rocket size={18} strokeWidth={2.2} />;
const IconCheck = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" strokeWidth="2.5"/></svg>);
const IconPaperclip = () => <Paperclip size={20} strokeWidth={2.2} style={{ transform: 'rotate(-45deg)' }} />;
const IconSpeakWave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"></line><line x1="7.5" y1="6" x2="7.5" y2="18"></line><line x1="12" y1="2" x2="12" y2="22"></line><line x1="16.5" y1="6" x2="16.5" y2="18"></line><line x1="21" y1="10" x2="21" y2="14"></line></svg>);

const MODES: { id: ChatMode; label: string; desc: string; Icon: React.FC }[] = [
  { id: 'heavy', label: 'Heavy', desc: 'Team of Experts',            Icon: IconHeavy },
  { id: 'think', label: 'Think', desc: 'Analisis mendalam & teliti', Icon: IconThink },
  { id: 'fast',  label: 'Spark', desc: 'Respons cepat & ringan',     Icon: IconSpark },
  { id: 'auto',  label: 'Auto',  desc: 'Pilih mode otomatis',        Icon: IconAuto  },
];

const ModeSelectorPopup: React.FC<{
  current: ChatMode;
  onSelect: (m: ChatMode) => void;
  onClose: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasActive?: boolean;
  onUpgradeClick?: () => void; 
  above?: boolean; 
}> = ({ current, onSelect, onClose, onOpenCanvas, onCloseCanvas, isCanvasActive, onUpgradeClick, above = true }) => (
  <>
    <div className="fixed inset-0 z-[110]" onClick={onClose} />
    <div
      className={cn("absolute z-[120] rounded-[28px] p-2 flex flex-col left-4",
        "bg-[var(--bg)]/80 backdrop-blur-3xl border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3)] supports-[backdrop-filter]:bg-[var(--bg)]/60"
      )}
      style={{ width: 250, maxWidth: 'calc(100vw - 32px)', ...(above ? { bottom: 'calc(100% + 12px)' } : { top: 'calc(100% + 12px)' }) }}
    >
      <div className="px-4 pt-4 pb-3 mb-1 flex flex-col items-start border-b border-[var(--text)]/10">
        <div className="flex items-center gap-1.5 mb-1">
          <img src="/IMG_20260427_105231.png" alt="Cylen Logo" className="w-5 h-5 object-contain" />
          <span className="text-[17px] font-bold text-[var(--text)] tracking-tight leading-none">Cylen</span>
        </div>
        <span className="text-[13px] text-[var(--mu)] font-medium mb-3">Akses intelijen premium</span>
        <button onClick={() => { onClose(); if(onUpgradeClick) onUpgradeClick(); }} className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 rounded-full text-[13px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform tracking-wide [-webkit-tap-highlight-color:transparent]">
          Upgrade
        </button>
      </div>
      <div className="flex flex-col gap-0.5 pt-1 pb-1">
        {MODES.map((m) => {
          const active = current === m.id && !isCanvasActive;
          return (
            <button key={m.id} onClick={() => { onSelect(m.id); if (onCloseCanvas) onCloseCanvas(); onClose(); }} className={cn("w-full flex items-start gap-3 px-4 py-3 rounded-[20px] transition-colors text-left group [-webkit-tap-highlight-color:transparent]", active ? "bg-[var(--text)]/10" : "bg-transparent hover:bg-[var(--text)]/5")}>
              <div className={cn("flex-shrink-0 mt-0.5 transition-transform", active ? "text-[var(--text)]" : "text-[var(--mu)] group-hover:scale-110")}><m.Icon /></div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold leading-tight mb-0.5" style={{ color: 'var(--text)' }}>{m.label}</div>
                <div className="text-[12px] leading-tight" style={{ color: 'var(--mu)' }}>{m.desc}</div>
              </div>
              {active && <div className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text)' }}><IconCheck /></div>}
            </button>
          );
        })}
      </div>
    </div>
  </>
);

const ModeButton: React.FC<{ mode: ChatMode; onClick: () => void; size?: 'sm' | 'md'; isCanvasActive?: boolean; }> = ({ mode, onClick, size = 'md' }) => {
  const m = MODES.find(x => x.id === mode)!;
  const iconSize = size === 'sm' ? 14 : 18;
  const label = m?.label || 'Auto';
  const Icon = m?.Icon || IconAuto;
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 rounded-full font-bold z-[105] [-webkit-tap-highlight-color:transparent] transition-transform duration-200 active:scale-95 bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[var(--text)] border border-[var(--text)]/10 backdrop-blur-md")} style={{ padding: size === 'sm' ? '6px 14px' : '8px 18px', fontSize: size === 'sm' ? 13 : 15 }}>
      <span style={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center' }}><Icon /></span>
      <span>{label}</span>
      <ChevronRight size={iconSize - 4} className="rotate-90 opacity-50" />
    </button>
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onOpenCanvas, onCloseCanvas,
  isCanvasActive = false, onUpgradeClick, replyingTo, onCancelReply
}) => {
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl,   setLightboxUrl]   = useState<string | null>(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const [isListening,   setIsListening]   = useState(false);
  const [voiceText,     setVoiceText]     = useState('');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showLiveVoice,    setShowLiveVoice]    = useState(false);
  const [showMaximize,     setShowMaximize]     = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${newHeight}px`;
    setShowMaximize(newHeight >= 150);
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
        {showModeSelector && (
          <ModeSelectorPopup current={mode} onSelect={m => onModeChange?.(m)} onClose={() => setShowModeSelector(false)} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas} isCanvasActive={isCanvasActive} onUpgradeClick={onUpgradeClick} />
        )}

        {showPicker && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />
            <div
              className="absolute bottom-full mb-3 left-4 rounded-[28px] p-2 flex flex-col gap-1 z-[100] bg-[var(--bg)]/80 backdrop-blur-3xl border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3)]"
              style={{ width: 190 }}
            >
              <div className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-colors text-[var(--text)] relative overflow-hidden", isFull ? "opacity-40" : "hover:bg-[var(--text)]/5 active:bg-[var(--text)]/10")}>
                <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0 opacity-80 pointer-events-none"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span className="text-[15px] font-semibold pointer-events-none">Kamera</span>
              </div>
              <div className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-colors text-[var(--text)] relative overflow-hidden", isFull ? "opacity-40" : "hover:bg-[var(--text)]/5 active:bg-[var(--text)]/10")}>
                <input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0 opacity-80 pointer-events-none"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21"/></svg>
                <span className="text-[15px] font-semibold pointer-events-none">Galeri</span>
              </div>
              <div className={cn("w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-colors text-[var(--text)] relative overflow-hidden", isFull ? "opacity-40" : "hover:bg-[var(--text)]/5 active:bg-[var(--text)]/10")}>
                <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple onChange={handleFileChange} disabled={isFull} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" style={{ fontSize: 0 }} />
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" className="flex-shrink-0 opacity-80 pointer-events-none"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 2v7h7"/></svg>
                <span className="text-[15px] font-semibold pointer-events-none">Dokumen</span>
              </div>
            </div>
          </>
        )}

        <div className="max-w-4xl mx-auto w-full">
          {isListening && !showLiveVoice ? (
            <div className="flex items-center justify-between w-full h-[64px] rounded-[32px] px-2 relative overflow-hidden bg-[var(--text)]/5 shadow-sm backdrop-blur-md border border-[var(--text)]/10">
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
              <div className="rounded-[32px] flex flex-col relative overflow-hidden bg-[var(--text)]/[0.04] border border-[var(--text)]/10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-md" style={{ WebkitTapHighlightColor: 'transparent' }}>

                <AnimatePresence>
                  {replyingTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pt-4">
                      <div className="bg-[var(--bg)] rounded-[16px] border-l-[4px] border-[var(--text)] p-3 pr-10 relative">
                        <button onClick={onCancelReply} className="absolute right-2 top-2 p-1.5 text-[var(--mu)] rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={16} strokeWidth={2.5} /></button>
                        <div className="flex items-center gap-1.5 mb-1"><span className="text-[12px] font-bold text-[var(--text)] tracking-wide uppercase">{replyingTo.role === 'user' ? 'Kamu' : 'Cylen AI'}</span></div>
                        <span className="text-[13.5px] text-[var(--text)]/80 line-clamp-2 font-medium leading-snug break-words">{replyingTo.content}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {attachedFiles.length > 0 && (
                  <div className="px-4 pt-4 pb-1">
                    <div className="flex gap-2.5 overflow-x-auto pb-1 items-center" style={{ scrollbarWidth: 'none' }}>
                      {attachedFiles.map(file => {
                        if (file.type === 'pdf' || file.type === 'text') {
                          return (
                            <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 flex items-center gap-3 h-[46px] px-3 bg-[var(--text)]/5 border border-[var(--text)]/15 rounded-[14px] max-w-[220px]">
                              <div className="flex items-center justify-center shrink-0">
                                <FileText size={20} className="text-red-500" />
                              </div>
                              <span className="text-[13px] font-semibold truncate text-[var(--text)] flex-1 leading-tight">
                                {file.name || 'Dokumen'}
                              </span>
                              <button onClick={() => removeFile(file.id)} className="shrink-0 text-[var(--mu)] hover:text-[var(--text)] p-1.5 rounded-full hover:bg-[var(--text)]/10 transition-colors [-webkit-tap-highlight-color:transparent]">
                                <X size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 h-[86px] w-[86px] rounded-[16px] overflow-hidden bg-[var(--text)]/5 border border-[var(--text)]/15 shadow-sm inline-flex">
                            {file.type === 'video' ? (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <div className="w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                                <img src={file.url} alt="" className="w-full h-full object-cover block" />
                              </div>
                            )}
                            <button onClick={() => removeFile(file.id)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-md z-10 transition-colors [-webkit-tap-highlight-color:transparent]">
                              <X size={12} strokeWidth={3} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="px-5 pt-4 pb-1 z-[105] flex">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Tanya apa saja..."
                    rows={1}
                    className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[28px] max-h-40 z-[105] py-1 pl-6 focus:ring-0 focus:outline-none"
                    style={{ fieldSizing: 'content', outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any}
                  />
                  <AnimatePresence>
                    {inputText.length > 0 && (
                      <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleClearText} className="absolute top-3 left-3 p-1.5 bg-[var(--text)]/5 text-[var(--text)]/60 rounded-full z-[110] [-webkit-tap-highlight-color:transparent]"><Trash2 size={15} /></motion.button>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {showMaximize && (
                      <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsFullscreenEditor(true)} className="absolute top-4 right-4 p-2 bg-[var(--bg)]/80 backdrop-blur-sm border border-[var(--text)]/10 rounded-full text-[var(--text)] shadow-sm active:scale-95 z-[110] [-webkit-tap-highlight-color:transparent]"><Maximize2 size={16} strokeWidth={2.5} /></motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <div className="flex items-center gap-1.5 pl-1">
                    <button
                      onClick={() => !isFull && setShowPicker(p => !p)}
                      className={cn(
                        "p-2.5 rounded-full transition-colors z-[105] [-webkit-tap-highlight-color:transparent]",
                        showPicker ? "bg-[var(--text)]/10 text-[var(--text)]"
                        : isFull   ? "opacity-20 cursor-not-allowed text-[var(--text)]"
                                   : "text-[var(--text)] bg-[var(--text)]/5 hover:bg-[var(--text)]/10"
                      )}
                    >
                      <IconPaperclip />
                    </button>
                    <ModeButton mode={mode} onClick={() => setShowModeSelector(p => !p)} size="md" isCanvasActive={isCanvasActive} />
                  </div>

                  <div className="flex items-center gap-1.5 z-[105] pr-1">
                    {!hasContent && (
                      <button onClick={startListening} className="p-2.5 rounded-full text-[var(--text)] bg-[var(--text)]/5 flex-shrink-0 [-webkit-tap-highlight-color:transparent]">
                        <Mic size={20} strokeWidth={2.5} />
                      </button>
                    )}
                    {hasContent
                      ? <button onClick={handleSend} disabled={isSending} className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] scale-105 shadow-md flex-shrink-0 [-webkit-tap-highlight-color:transparent]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
                      : <button onClick={() => setShowLiveVoice(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold hover:scale-105 shadow-md flex-shrink-0 ml-1 [-webkit-tap-highlight-color:transparent]"><IconSpeakWave /><span className="text-[13px]">Speak</span></button>
                    }
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
