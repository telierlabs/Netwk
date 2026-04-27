import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, ChevronRight, X, Square, FileText, LayoutDashboard, Sparkles, Paperclip, Camera, Image as ImageIcon } from 'lucide-react';
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
  onUpgradeClick?: () => void; 
}

const MAX_FILES = 5;

// ── SVG Icons ──
const IconAuto = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15 3.5-3.5a2.2 2.2 0 0 0 0-3.1l-2.9-2.9a2.2 2.2 0 0 0-3.1 0L6 9"/><path d="M13 14l8-8"/><path d="M20 3v4"/><path d="M17 3h4"/></svg>);
const IconSpark = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>);
const IconThink = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>);
const IconCheck = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const IconSpeakWave = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="3" y2="14"></line><line x1="7.5" y1="6" x2="7.5" y2="18"></line><line x1="12" y1="2" x2="12" y2="22"></line><line x1="16.5" y1="6" x2="16.5" y2="18"></line><line x1="21" y1="10" x2="21" y2="14"></line></svg>);

const MODES: { id: ChatMode; label: string; desc: string; Icon: React.FC }[] = [
  { id: 'auto',  label: 'Auto',  desc: 'Pilih model otomatis', Icon: IconAuto  },
  { id: 'fast',  label: 'Spark', desc: 'Respons cepat & ringan', Icon: IconSpark },
  { id: 'think', label: 'Think', desc: 'Analisis mendalam',       Icon: IconThink },
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
      className={cn("absolute z-[120] bg-[var(--bg)] rounded-[32px] p-1.5 flex flex-col left-4 shadow-2xl border border-[var(--bd)]")}
      style={{ width: 260, maxWidth: '75vw', ...(above ? { bottom: 'calc(100% + 12px)' } : { top: 'calc(100% + 12px)' }) }}
    >
      <div className="px-3 pt-5 pb-5 mb-1 flex items-center justify-between border-b border-[var(--bd)] border-opacity-60">
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center">
              <img src="/IMG_20260427_105231.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-[22px] font-black text-[var(--text)] tracking-tighter">Cylen</span>
          </div>
          <span className="text-[11px] text-[var(--mu)] font-bold ml-1 opacity-70">Akses premium</span>
        </div>
        <button onClick={() => { onClose(); if(onUpgradeClick) onUpgradeClick(); }} className="bg-[var(--text)] text-[var(--bg)] px-4 py-2.5 rounded-full text-[13px] font-black shadow-md hover:scale-105 active:scale-95 transition-all">
          Upgrade
        </button>
      </div>

      <div className="flex flex-col pt-1 pb-1">
        <button onClick={() => { if (onOpenCanvas) onOpenCanvas(); onClose(); }} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-[20px] transition-all text-left hover:bg-[var(--sf)] group", isCanvasActive && "bg-[var(--sf)]")}>
          <LayoutDashboard size={20} className="text-[var(--ac)]" /><div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-[var(--text)]">Cylen Canvas</div><div className="text-[12px] text-[var(--mu)]">Workspace</div></div><ChevronRight size={16} className="text-[var(--mu)] opacity-50" />
        </button>
        <div className="mx-4 my-1.5 h-[1px] bg-[var(--bd)] opacity-40"></div>
        {MODES.map((m) => {
          const active = current === m.id && !isCanvasActive;
          return (
            <button key={m.id} onClick={() => { onSelect(m.id); if (onCloseCanvas) onCloseCanvas(); onClose(); }} className={cn("w-full flex items-start gap-3 px-4 py-3 rounded-[20px] transition-all text-left group", active && "bg-[var(--sf)]")}>
              <div className={active ? "text-[var(--text)]" : "text-[var(--mu)]"}><m.Icon /></div><div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-[var(--text)]">{m.label}</div><div className="text-[12px] text-[var(--mu)]">{m.desc}</div></div>{active && <IconCheck />}
            </button>
          );
        })}
      </div>
    </div>
  </>
);

const ModeButton: React.FC<{ mode: ChatMode; onClick: () => void; isCanvasActive?: boolean; }> = ({ mode, onClick, isCanvasActive }) => {
  const m = MODES.find(x => x.id === mode)!;
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 rounded-full font-bold transition-all px-4 py-2 border", isCanvasActive ? "bg-[var(--text)] text-[var(--bg)] border-transparent" : "bg-[var(--bg)] text-[var(--text)] border-[var(--bd)]")}>
      {isCanvasActive ? <LayoutDashboard size={16}/> : <m.Icon />}
      <span className="text-[13px]">{isCanvasActive ? 'Canvas' : m?.label || 'Auto'}</span>
      <ChevronRight size={14} className="rotate-90 opacity-50" />
    </button>
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange, onOpenCanvas, onCloseCanvas, isCanvasActive = false, onUpgradeClick
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
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'id-ID'; rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(t);
      if (e.results[e.results.length - 1].isFinal) { 
        setInputText(t); setVoiceText(''); setIsListening(false);
        rec.stop(); setTimeout(() => onSend(), 50); 
      }
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText, onSend]);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => { resolve({ id: `${Date.now()}-${Math.random()}`, url: reader.result as string, type: file.type === 'application/pdf' ? 'pdf' : 'image', name: file.name }); };
      reader.readAsDataURL(file);
    }))).then(newFiles => {
      setAttachedFiles(prev => {
        const next = [...prev, ...newFiles].slice(0, MAX_FILES);
        setAttachedImage(next.find(f => f.type === 'image')?.url || null);
        return next;
      });
    });
  }, [attachedFiles.length, setAttachedImage]);

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    onSend(attachedFiles.filter(f => f.type === 'image').map(f => f.url), undefined);
    setAttachedFiles([]); setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;

  return (
    <>
      {showLiveVoice && <LiveVoiceMode onClose={() => setShowLiveVoice(false)} />}
      {lightboxUrl && <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}><img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain" /></div>}
      
      <footer className="px-4 pb-4 pt-2 bg-[var(--bg)] relative z-50">
        {showModeSelector && <ModeSelectorPopup current={mode} onSelect={m => onModeChange?.(m)} onClose={() => setShowModeSelector(false)} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas} isCanvasActive={isCanvasActive} onUpgradeClick={onUpgradeClick} />}
        
        {showPicker && (
          <div className="absolute bottom-full mb-3 left-4 bg-[var(--bg)] border border-[var(--bd)] rounded-[28px] p-2 flex flex-col gap-1 z-[100] shadow-xl w-[190px]">
            <button onClick={() => { setShowPicker(false); cameraInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-[20px] hover:bg-[var(--sf)] text-[var(--text)] text-left font-bold text-[14px]"><Camera size={18}/> Kamera</button>
            <button onClick={() => { setShowPicker(false); galleryInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-[20px] hover:bg-[var(--sf)] text-[var(--text)] text-left font-bold text-[14px]"><ImageIcon size={18}/> Galeri</button>
            <button onClick={() => { setShowPicker(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-[20px] hover:bg-[var(--sf)] text-[var(--text)] text-left font-bold text-[14px]"><FileText size={18}/> File</button>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => processFiles(Array.from(e.target.files || []))} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={e => processFiles(Array.from(e.target.files || []))} className="hidden" />
        <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={e => processFiles(Array.from(e.target.files || []))} className="hidden" />

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-[32px] relative shadow-md overflow-hidden">
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 flex gap-2 overflow-x-auto bg-black/5">
                {attachedFiles.map(f => (
                  <div key={f.id} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={f.url} className="w-full h-full object-cover" onClick={() => setLightboxUrl(f.url)} />
                    <button onClick={() => setAttachedFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="px-5 pt-4">
              <textarea ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Tanya apa saja..." rows={1} className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-black min-h-[28px] max-h-40" onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; }} />
            </div>

            <div className="flex items-center justify-between px-3 pb-3 pt-2">
              <div className="flex items-center gap-1">
                <button onClick={() => setShowPicker(!showPicker)} className="p-2.5 rounded-full text-black opacity-60 hover:opacity-100"><Paperclip size={20}/></button>
                <ModeButton mode={mode} onClick={() => setShowModeSelector(!showModeSelector)} isCanvasActive={isCanvasActive} />
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={startListening} className={cn("p-3 rounded-full transition-all", isListening ? "text-red-500 animate-pulse" : "text-gray-400")}><Mic size={20} /></button>
                {hasContent ? (
                  <button onClick={handleSend} disabled={isSending} className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center active:scale-90 transition-transform">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                ) : (
                  <button onClick={() => setShowLiveVoice(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white font-bold active:scale-95 transition-transform">
                    <IconSpeakWave /><span className="text-[14px]">Speak</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
