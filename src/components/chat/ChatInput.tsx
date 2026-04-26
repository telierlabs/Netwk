import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, ChevronRight, X, Square, FileText, LayoutDashboard } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LiveVoiceMode } from './LiveVoiceMode'; 

export type ChatMode = 'auto' | 'fast' | 'think' | 'canvas';

interface AttachedFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'pdf';
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
}

const MAX_FILES = 5;

// ── SVG Icons ──
const IconCylen = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>);

// 🔥 ROKET AUTO ALA GROK (Gagah & Futuristik)
const IconAuto = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15 3.5-3.5a2.2 2.2 0 0 0 0-3.1l-2.9-2.9a2.2 2.2 0 0 0-3.1 0L6 9" />
    <path d="M13 14l8-8" />
    <path d="M20 3v4" />
    <path d="M17 3h4" />
  </svg>
);

const IconSpark = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const IconThink = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const IconCheck = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" strokeWidth="2.5"/></svg>);
const IconPaperclip = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><g transform="rotate(-45 12 12)"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></g></svg>);
const IconSpeakWave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"></line><line x1="7.5" y1="6" x2="7.5" y2="18"></line><line x1="12" y1="2" x2="12" y2="22"></line><line x1="16.5" y1="6" x2="16.5" y2="18"></line><line x1="21" y1="10" x2="21" y2="14"></line></svg>);

const MODES: { id: ChatMode; label: string; desc: string; Icon: React.FC }[] = [
  { id: 'auto',  label: 'Auto',  desc: 'Pilih Spark atau Think otomatis', Icon: IconAuto  },
  { id: 'fast',  label: 'Spark', desc: 'Respons cepat & ringan',           Icon: IconSpark },
  { id: 'think', label: 'Think', desc: 'Analisis mendalam & teliti',       Icon: IconThink },
];

const ModeSelectorPopup: React.FC<{
  current: ChatMode;
  onSelect: (m: ChatMode) => void;
  onClose: () => void;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  isCanvasActive?: boolean;
  above?: boolean; 
  align?: 'left' | 'right';
  overrideClass?: string;
  overrideStyle?: React.CSSProperties;
}> = ({ current, onSelect, onClose, onOpenCanvas, onCloseCanvas, isCanvasActive, above = true, align = 'left', overrideClass, overrideStyle }) => (
  <>
    <div className="fixed inset-0 z-[110]" onClick={onClose} />
    <div
      className={cn("absolute z-[120] bg-[var(--bg)] rounded-[32px] p-2 flex flex-col", overrideClass ? overrideClass : (align === 'right' ? "right-0" : "left-0"))}
      style={overrideStyle ? overrideStyle : { width: 280, ...(above ? { bottom: 'calc(100% + 12px)' } : { top: 'calc(100% + 12px)' }), border: '1px solid var(--bd)', boxShadow: '0 16px 48px -12px rgba(0,0,0,0.3)' }}
    >
      <div className="px-4 pt-4 pb-4 mb-2 flex items-center justify-between border-b border-[var(--bd)] border-opacity-60">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
            <IconCylen />
            <span className="text-[17px] font-bold text-[var(--text)] tracking-tight">Cylen</span>
          </div>
          <span className="text-[12px] text-[var(--mu)] font-medium leading-tight">Akses intelijen premium</span>
        </div>
        <button className="bg-[var(--text)] text-[var(--bg)] px-4 py-2 rounded-full text-[12px] font-bold hover:scale-105 active:scale-95 transition-all">Upgrade</button>
      </div>

      <div className="flex flex-col gap-1 pt-0.5">
        <button
          onClick={() => { if (onOpenCanvas) onOpenCanvas(); onClose(); }}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-[24px] transition-all text-left mb-1 hover:bg-[var(--sf)] group"
          style={{ background: isCanvasActive ? 'var(--sf)' : 'transparent' }}
        >
          <div className="flex-shrink-0 text-[var(--ac)] opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
            <LayoutDashboard size={22} strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[16px] font-bold leading-tight mb-0.5 text-[var(--text)]">Cylen Canvas</div>
            <div className="text-[12px] leading-tight text-[var(--mu)]">Infinite spatial workspace</div>
          </div>
          {isCanvasActive ? <div className="flex-shrink-0 text-[var(--text)]"><IconCheck /></div> : <ChevronRight size={16} className="text-[var(--mu)] opacity-50 group-hover:opacity-100 transition-opacity" />}
        </button>
        
        <div className="mx-4 my-1 h-[1px] bg-[var(--bd)] opacity-40"></div>

        {MODES.map((m) => {
          const active = current === m.id && !isCanvasActive; 
          return (
            <button
              key={m.id}
              onClick={() => { 
                onSelect(m.id); 
                if (onCloseCanvas) onCloseCanvas(); 
                onClose(); 
              }}
              className="w-full flex items-start gap-4 px-4 py-3 rounded-[24px] transition-all text-left group"
              style={{ background: active ? 'var(--sf)' : 'transparent' }}
            >
              <div className="flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" style={{ color: active ? 'var(--text)' : 'var(--mu)', opacity: active ? 1 : 0.8 }}>
                <m.Icon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-bold leading-tight mb-0.5" style={{ color: 'var(--text)' }}>{m.label}</div>
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

const ModeButton: React.FC<{ mode: ChatMode; onClick: () => void; size?: 'sm' | 'md'; isCanvasActive?: boolean; }> = ({ mode, onClick, size = 'md', isCanvasActive }) => {
  const m = MODES.find(x => x.id === mode)!;
  const iconSize = size === 'sm' ? 14 : 18;
  const label = isCanvasActive ? 'Cylen Canvas' : m?.label || 'Auto';
  const Icon = isCanvasActive ? LayoutDashboard : (m?.Icon || IconAuto);

  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 rounded-full font-bold transition-all hover:opacity-80 active:scale-95 relative z-[105]", isCanvasActive ? "bg-[var(--text)] text-[var(--bg)] border-transparent shadow-md" : "bg-[var(--bg)] text-[var(--text)] border-[var(--bd)]")} style={{ padding: size === 'sm' ? '6px 14px' : '8px 18px', fontSize: size === 'sm' ? 13 : 15, borderWidth: isCanvasActive ? 0 : 1 }}>
      <span style={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        <Icon />
      </span>
      <span>{label}</span>
      <ChevronRight size={iconSize - 4} className="rotate-90 opacity-50" />
    </button>
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onOpenCanvas, onCloseCanvas, isCanvasActive = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showLiveVoice, setShowLiveVoice] = useState(false);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Browser tidak mendukung voice input'); return; }
    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(t);
      if (e.results[e.results.length - 1].isFinal) { setInputText(t); setVoiceText(''); }
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
      reader.onloadend = () => { resolve({ id: `${Date.now()}-${Math.random()}`, url: reader.result as string, type: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('video') ? 'video' : 'image', name: file.name, mimeType: file.type }); };
      reader.readAsDataURL(file);
    }))).then(newFiles => {
      setAttachedFiles(prev => { const next = [...prev, ...newFiles].slice(0, MAX_FILES); setAttachedImage(next.find(f => f.type === 'image')?.url || null); return next; });
    });
  }, [attachedFiles.length, setAttachedImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; }, [processFiles]);
  const removeFile = useCallback((id: string) => { setAttachedFiles(prev => { const next = prev.filter(f => f.id !== id); setAttachedImage(next.find(f => f.type === 'image')?.url || null); return next; }); }, [setAttachedImage]);

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const imageUrls = attachedFiles.filter(f => f.type === 'image').map(f => f.url);
    const pdfFiles = attachedFiles.filter(f => f.type === 'pdf').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  return (
    <>
      {showLiveVoice && <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />}
      {lightboxUrl && <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}><img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" /><button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}><X size={20} /></button></div>}
      {showPicker && <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />}

      {isListening && !showLiveVoice && (
        <div className="fixed inset-0 z-[180] bg-black/60 flex flex-col items-center justify-center gap-6" onClick={stopListening}>
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="relative w-24 h-24 flex items-center justify-center"><div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} /><div className="absolute inset-2 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} /><button onClick={stopListening} className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform"><Square size={20} className="text-black fill-black" /></button></div>
            <div className="max-w-xs text-center">{voiceText ? <p className="text-white text-base font-medium px-4">{voiceText}</p> : <p className="text-white/50 text-sm">Sedang mendengarkan...</p>}</div>
            <p className="text-white/30 text-xs">Ketuk untuk berhenti</p>
          </div>
        </div>
      )}

      {compact ? (
        <div style={{ width: '100%', position: 'relative' }}>
          {attachedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto px-1" style={{ scrollbarWidth: 'none' }}>
              {attachedFiles.map(file => (
                <div key={file.id} className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--sf)]" style={{ width: 52, height: 52 }}>
                  {file.type === 'pdf' ? <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 px-1"><FileText size={16} className="text-red-500" /></div> : <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />}
                  <button onClick={() => removeFile(file.id)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center"><X size={7} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center w-full" style={{ height: 54, borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--sf)', paddingLeft: 20, paddingRight: 8, gap: 12 }}>
            <textarea ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tanya apa saja..." rows={1} className="flex-1 bg-transparent border-none outline-none resize-none text-[14.5px] placeholder:text-[var(--mu)] text-[var(--text)] relative z-[105]" style={{ minHeight: 22, maxHeight: 110, lineHeight: '22px', paddingTop: 0, paddingBottom: 0, alignSelf: 'center' }} onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 110)}px`; }} />
            <div className="flex items-center gap-1.5 flex-shrink-0" style={{ position: 'relative' }}>
              <button onClick={startListening} className="p-2.5 rounded-full text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--bd)] transition-all flex-shrink-0 relative z-[105]"><Mic size={18} strokeWidth={2.5} /></button>
              {hasContent ? <button onClick={handleSend} disabled={isSending} className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] transition-all hover:opacity-85 flex-shrink-0 relative z-[105]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button> : <button onClick={() => setShowLiveVoice(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text)] text-[var(--bg)] font-bold transition-all hover:scale-105 shadow-md flex-shrink-0 relative z-[105]"><IconSpeakWave /><span className="text-[13px]">Speak</span></button>}
            </div>
          </div>
        </div>
      ) : (
        <footer className="px-4 pb-4 pt-2 bg-[var(--bg)] relative z-50">
          {showModeSelector && (
            <ModeSelectorPopup current={mode} onSelect={m => onModeChange?.(m)} onClose={() => setShowModeSelector(false)} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas} isCanvasActive={isCanvasActive} overrideClass="absolute bottom-full mb-3 left-4" overrideStyle={{ width: 280, border: '1px solid var(--bd)', boxShadow: '0 16px 48px -12px rgba(0,0,0,0.3)' }} />
          )}

          {showPicker && (
            <div className="absolute bottom-full mb-3 left-4 bg-[var(--bg)] border border-[var(--bd)] rounded-[28px] p-2 flex flex-col gap-1 z-[100]" style={{ width: 190, boxShadow: '0 12px 48px -12px rgba(0,0,0,0.25)' }}>
              {[
                { label: 'Kamera', ref: cameraInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                { label: 'Galeri', ref: galleryInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21"/></svg> },
                { label: 'File',   ref: fileInputRef,    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 2v7h7"/></svg> },
              ].map((item, i) => (
                <button key={i} onClick={() => { setShowPicker(false); !isFull && item.ref.current?.click(); }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] hover:bg-[var(--sf)] transition-colors text-[var(--text)] text-left"><div className="flex-shrink-0 flex items-center justify-center opacity-80">{item.icon}</div><span className="text-[15px] font-semibold">{item.label}</span></button>
              ))}
            </div>
          )}

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
          <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

          <div className="max-w-3xl mx-auto">
            <div className="bg-[var(--bg)] rounded-[32px] relative transition-all" style={{ border: '1px solid var(--bd)' }}>
              {attachedFiles.length > 0 && (
                <div className="px-4 pt-3 pb-1 relative z-[105]">
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {attachedFiles.map(file => (
                      <div key={file.id} className="relative flex-shrink-0 rounded-[20px] overflow-hidden bg-[var(--sf)]" style={{ width: 80, height: 80 }}>
                        {file.type === 'pdf' ? <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 px-1"><FileText size={24} className="text-red-500" /></div> : <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />}
                        <button onClick={() => removeFile(file.id)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="px-5 pt-4 relative z-[105]">
                <textarea ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tanya apa saja..." rows={1} className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[28px] max-h-40 relative z-[105]" onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; }} />
              </div>
              <div className="flex items-center justify-between px-3 pb-3 pt-2 relative">
                <div className="flex items-center gap-1">
                  <button onClick={() => !isFull && setShowPicker(p => !p)} className={cn("p-2.5 rounded-full transition-all relative z-[105]", showPicker ? "bg-[var(--sf)] text-[var(--text)]" : isFull ? "opacity-20 cursor-not-allowed text-[var(--text)]" : "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--sf)]")}><IconPaperclip /></button>
                  <ModeButton mode={mode} onClick={() => setShowModeSelector(p => !p)} size="md" isCanvasActive={isCanvasActive} />
                </div>
                <div className="flex items-center gap-1.5 relative z-[105]">
                  <button onClick={startListening} className="p-3 rounded-full text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] transition-all flex-shrink-0"><Mic size={20} strokeWidth={2.5} /></button>
                  {hasContent ? <button onClick={handleSend} disabled={isSending} className="w-10 h-10 rounded-full transition-all flex items-center justify-center bg-[var(--text)] text-[var(--bg)] scale-105 shadow-md hover:opacity-85"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button> : <button onClick={() => setShowLiveVoice(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text)] text-[var(--bg)] transition-all hover:scale-105 shadow-md flex-shrink-0"><IconSpeakWave /><span className="text-[15px] font-bold tracking-wide">Speak</span></button>}
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </>
  );
};
