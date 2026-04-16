import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, ChevronRight, X, Square, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ChatMode = 'auto' | 'fast' | 'think';

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
}

const MAX_FILES = 5;

// ── SVG Icons Ala Grok ──
const IconCylen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const IconAuto = () => (
  // Roket (Auto)
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15 3.38-3.38a2.25 2.25 0 0 0 0-3.18l-2.82-2.82a2.25 2.25 0 0 0-3.18 0L6 9.01"/>
    <path d="m9 15 6-6"/>
    <path d="M15 3.01C18.31 3.01 21 5.7 21 9c0 3.31-2.69 6-6 6l-6 6-3-3 6-6c0-3.31 2.69-6 6-6z"/>
  </svg>
);

const IconSpark = () => (
  // Petir (Fast/Spark)
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const IconThink = () => (
  // Lampu (Expert/Think)
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/>
    <path d="M9 18h6"/><path d="M10 22h4"/>
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
    <path d="M8 12l3 3 5-5" strokeWidth="2.5"/>
  </svg>
);

const MODES: { id: ChatMode; label: string; desc: string; Icon: React.FC }[] = [
  { id: 'auto',  label: 'Auto',  desc: 'Pilih Spark atau Think otomatis', Icon: IconAuto  },
  { id: 'fast',  label: 'Spark', desc: 'Respons cepat & ringan',           Icon: IconSpark },
  { id: 'think', label: 'Think', desc: 'Analisis mendalam & teliti',       Icon: IconThink },
];

// ── Mode Selector Popup ──
const ModeSelectorPopup: React.FC<{
  current: ChatMode;
  onSelect: (m: ChatMode) => void;
  onClose: () => void;
  above?: boolean; 
  align?: 'left' | 'right';
  overrideClass?: string;
  overrideStyle?: React.CSSProperties;
}> = ({ current, onSelect, onClose, above = true, align = 'left', overrideClass, overrideStyle }) => (
  <>
    <div className="fixed inset-0 z-[110]" onClick={onClose} />
    <div
      className={cn(
        "absolute z-[120] bg-[var(--bg)] rounded-[28px] p-1.5 flex flex-col",
        overrideClass ? overrideClass : (align === 'right' ? "right-0" : "left-0")
      )}
      style={overrideStyle ? overrideStyle : {
        width: 250, 
        ...(above ? { bottom: 'calc(100% + 12px)' } : { top: 'calc(100% + 12px)' }),
        border: '1px solid var(--bd)',
        boxShadow: '0 12px 40px -12px rgba(0,0,0,0.25)',
      }}
    >
      {/* Cylen Header */}
      <div className="px-3.5 pt-3 pb-3 mb-1 flex items-center justify-between border-b border-[var(--bd)] border-opacity-60">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <IconCylen />
            <span className="text-[15px] font-bold text-[var(--text)] tracking-tight">Cylen</span>
          </div>
          <span className="text-[11px] text-[var(--mu)] font-medium leading-tight">Akses intelijen premium</span>
        </div>
        <button className="bg-[var(--text)] text-[var(--bg)] px-3.5 py-1.5 rounded-full text-[11px] font-bold hover:scale-105 transition-transform">
          Upgrade
        </button>
      </div>

      <div className="flex flex-col gap-0.5 pt-0.5">
        {MODES.map((m) => {
          const active = current === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { onSelect(m.id); onClose(); }}
              className="w-full flex items-start gap-3.5 px-3.5 py-2.5 rounded-[20px] transition-all text-left"
              style={{ background: active ? 'var(--sf)' : 'transparent' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sf)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div className="flex-shrink-0 mt-0.5" style={{ color: active ? 'var(--text)' : 'var(--mu)', opacity: active ? 1 : 0.8 }}>
                <m.Icon />
              </div>
              <div className="flex-1 min-w-0">
                {/* Font lebih tipis (semibold) agar elegan & tidak kaku */}
                <div className="text-[14px] font-semibold leading-tight mb-0.5" style={{ color: 'var(--text)' }}>{m.label}</div>
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

// ── Mode Button ──
const ModeButton: React.FC<{ mode: ChatMode; onClick: () => void; size?: 'sm' | 'md'; }> = ({ mode, onClick, size = 'md' }) => {
  const m = MODES.find(x => x.id === mode)!;
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full font-bold transition-all hover:opacity-80 relative z-[105]"
      style={{
        padding: size === 'sm' ? '6px 14px' : '8px 16px',
        fontSize: size === 'sm' ? 13 : 14,
        border: '1px solid var(--bd)',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      <span style={{ width: iconSize, height: iconSize, display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
        {mode === 'auto' && <IconAuto />}
        {mode === 'fast' && <IconSpark />}
        {mode === 'think' && <IconThink />}
      </span>
      <span>{m.label}</span>
      <ChevronRight size={iconSize - 2} className="rotate-90 opacity-50" />
    </button>
  );
};

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false, mode = 'auto', onModeChange,
}) => {
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef= useRef<HTMLInputElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles]   = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl]       = useState<string | null>(null);
  const [showPicker, setShowPicker]         = useState(false);
  const [isListening, setIsListening]       = useState(false);
  const [voiceText, setVoiceText]           = useState('');
  const [showModeSelector, setShowModeSelector] = useState(false);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Browser tidak mendukung voice input'); return; }
    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(t);
      if (e.results[e.results.length - 1].isFinal) { setInputText(t); setVoiceText(''); }
    };
    rec.onend   = () => { setIsListening(false); setVoiceText(''); };
    rec.onerror = () => { setIsListening(false); setVoiceText(''); };
    recognitionRef.current = rec;
    rec.start();
  }, [setInputText]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false); setVoiceText('');
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    Promise.all(toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const isPdf = file.type === 'application/pdf';
        resolve({
          id: `${Date.now()}-${Math.random()}`,
          url: reader.result as string,
          type: isPdf ? 'pdf' : file.type.startsWith('video') ? 'video' : 'image',
          name: file.name,
          mimeType: file.type,
        });
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
    processFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      setAttachedImage(next.find(f => f.type === 'image')?.url || null);
      return next;
    });
  }, [setAttachedImage]);

  const handleSend = () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    const imageUrls = attachedFiles.filter(f => f.type === 'image').map(f => f.url);
    const pdfFiles  = attachedFiles.filter(f => f.type === 'pdf').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull     = attachedFiles.length >= MAX_FILES;

  // ==========================================
  // COMPACT MODE
  // ==========================================
  if (compact) {
    return (
      <>
        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
        <input ref={fileInputRef}    type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

        {showPicker && <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />}

        <div style={{ width: '100%', position: 'relative' }}>
          {attachedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto px-1" style={{ scrollbarWidth: 'none' }}>
              {attachedFiles.map(file => (
                <div key={file.id} className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--sf)]" style={{ width: 52, height: 52 }}>
                  {file.type === 'pdf' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 px-1">
                      <FileText size={16} className="text-red-500" />
                      <span className="text-[7px] text-red-600 font-medium truncate w-full text-center px-1">{file.name}</span>
                    </div>
                  ) : (
                    <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />
                  )}
                  <button onClick={() => removeFile(file.id)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center"><X size={7} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center w-full" style={{ height: 54, borderRadius: 999, border: '1px solid var(--bd)', background: 'var(--sf)', paddingLeft: 20, paddingRight: 12, gap: 12 }}>
            <button onClick={isListening ? stopListening : startListening} className={cn('flex-shrink-0 transition-all relative z-[105]', isListening ? 'text-red-400' : 'text-[var(--mu)] hover:text-[var(--text)]')}><Mic size={17} /></button>
            <textarea
              ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Tanya apa saja..." rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[14.5px] placeholder:text-[var(--mu)] text-[var(--text)] relative z-[105]"
              style={{ minHeight: 22, maxHeight: 110, lineHeight: '22px', paddingTop: 0, paddingBottom: 0, alignSelf: 'center' }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 110)}px`; }}
            />
            <div className="flex items-center gap-2 flex-shrink-0" style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <ModeButton mode={mode} onClick={() => setShowModeSelector(p => !p)} size="sm" />
                {showModeSelector && <ModeSelectorPopup current={mode} onSelect={m => onModeChange?.(m)} onClose={() => setShowModeSelector(false)} above={true} align="right" />}
              </div>
              <button onClick={() => !isFull && setShowPicker(p => !p)} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors flex-shrink-0 relative z-[105]">
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              </button>
              {hasContent && !isSending && (
                <button onClick={handleSend} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] transition-all hover:opacity-85 flex-shrink-0 relative z-[105]">
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* Picker Attachment Desain Vertical Grok (Compact) */}
          {showPicker && (
            <div
              className="absolute bottom-full mb-3 right-0 bg-[var(--bg)] border border-[var(--bd)] rounded-[28px] p-2 flex flex-col gap-1 z-[100]"
              style={{ width: 180, boxShadow: '0 12px 48px -12px rgba(0,0,0,0.25)' }}
            >
              {[
                { label: 'Kamera', ref: cameraInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                { label: 'Galeri', ref: galleryInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21"/></svg> },
                { label: 'File',   ref: fileInputRef,    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 2v7h7"/></svg> },
              ].map((item, i) => (
                <button key={i}
                  onClick={() => { setShowPicker(false); !isFull && item.ref.current?.click(); }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-[20px] hover:bg-[var(--sf)] transition-colors text-[var(--text)] text-left"
                >
                  <div className="flex-shrink-0 flex items-center justify-center opacity-80">{item.icon}</div>
                  <span className="text-[15px] font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lightboxUrl && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
            <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}><X size={20} /></button>
          </div>
        )}
      </>
    );
  }

  // ==========================================
  // NORMAL MODE
  // ==========================================
  return (
    <>
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}><X size={20} /></button>
        </div>
      )}

      {isListening && (
        <div className="fixed inset-0 z-[180] bg-black/60 flex flex-col items-center justify-center gap-6" onClick={stopListening}>
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-2 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.3s' }} />
              <button onClick={stopListening} className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
                <Square size={20} className="text-black fill-black" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 h-10">
              {[4,8,14,20,28,22,16,10,6,12,20,14,8,4].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, borderRadius: 99, background: 'white', animation: `neuralWave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.06}s`, opacity: 0.9 }} />
              ))}
              <style>{`@keyframes neuralWave { 0%,100%{opacity:0.3;transform:scaleY(0.4)} 50%{opacity:1;transform:scaleY(1)} }`}</style>
            </div>
            <div className="max-w-xs text-center">
              {voiceText ? <p className="text-white text-base font-medium px-4">{voiceText}</p> : <p className="text-white/50 text-sm">Sedang mendengarkan...</p>}
            </div>
            <p className="text-white/30 text-xs">Ketuk untuk berhenti</p>
          </div>
        </div>
      )}

      {showPicker && <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />}

      <footer className="px-4 pb-4 pt-2 bg-[var(--bg)] relative">
        
        {/* === MODE SELECTOR POPUP DI NORMAL MODE === */}
        {/* Gua pindahin kesini (root footer) & override class biar dia nempel 100% di kiri, sama persis kayak tombol attachment Picker! */}
        {showModeSelector && (
          <ModeSelectorPopup 
            current={mode} 
            onSelect={m => onModeChange?.(m)} 
            onClose={() => setShowModeSelector(false)} 
            overrideClass="absolute bottom-full mb-3 left-4"
            overrideStyle={{ width: 250, border: '1px solid var(--bd)', boxShadow: '0 12px 40px -12px rgba(0,0,0,0.25)' }}
          />
        )}

        {/* Picker Attachment Desain Vertical Grok (Normal Mode) */}
        {showPicker && (
          <div className="absolute bottom-full mb-3 left-4 bg-[var(--bg)] border border-[var(--bd)] rounded-[28px] p-2 flex flex-col gap-1 z-[100]"
            style={{ width: 190, boxShadow: '0 12px 48px -12px rgba(0,0,0,0.25)' }}>
            {[
              { label: 'Kamera', ref: cameraInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
              { label: 'Galeri', ref: galleryInputRef, icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21"/></svg> },
              { label: 'File',   ref: fileInputRef,    icon: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M13 2v7h7"/></svg> },
            ].map((item, i) => (
              <button key={i} onClick={() => { setShowPicker(false); !isFull && item.ref.current?.click(); }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] hover:bg-[var(--sf)] transition-colors text-[var(--text)] text-left">
                <div className="flex-shrink-0 flex items-center justify-center opacity-80">{item.icon}</div>
                <span className="text-[15px] font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <input ref={cameraInputRef}  type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
        <input ref={fileInputRef}    type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--bg)] rounded-[32px] relative" style={{ border: '1px solid var(--bd)' }}>
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 pb-1 relative z-[105]">
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {attachedFiles.map(file => (
                    <div key={file.id} className="relative flex-shrink-0 rounded-[20px] overflow-hidden bg-[var(--sf)]" style={{ width: 80, height: 80 }}>
                      {file.type === 'pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 px-1">
                          <FileText size={24} className="text-red-500" />
                          <span className="text-[9px] text-red-600 font-medium text-center leading-tight truncate w-full px-1">{file.name}</span>
                        </div>
                      ) : file.type === 'video' ? (
                        <>
                          <video src={file.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"><svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                          </div>
                        </>
                      ) : (
                        <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />
                      )}
                      <button onClick={() => removeFile(file.id)} className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-5 pt-4 relative z-[105]">
              <textarea
                ref={textareaRef} value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Tanya apa saja..." rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[28px] max-h-40 relative z-[105]"
                onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 160)}px`; }}
              />
            </div>

            <div className="flex items-center justify-between px-3 pb-3 pt-2 relative">
              <div className="flex items-center gap-1">
                <button onClick={() => !isFull && setShowPicker(p => !p)} className={cn("p-2.5 rounded-full transition-all relative z-[105]", showPicker ? "bg-[var(--sf)] text-[var(--text)]" : isFull ? "opacity-20 cursor-not-allowed text-[var(--text)]" : "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--sf)]")}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/><path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/></svg>
                </button>

                {/* Wrapper tombol dipisahkan agar pop-up tidak nempel di tengah */}
                <ModeButton mode={mode} onClick={() => setShowModeSelector(p => !p)} size="md" />
              </div>

              <div className="flex items-center gap-2 relative z-[105]">
                <button onClick={isListening ? stopListening : startListening} className={cn("p-3 rounded-full transition-all", isListening ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30" : "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--sf)]")}><Mic size={20} strokeWidth={2.5} /></button>
                <button onClick={handleSend} disabled={!hasContent || isSending} className={cn("p-3 rounded-full transition-all flex items-center justify-center", hasContent && !isSending ? "bg-[var(--text)] text-[var(--bg)] scale-105 shadow-md" : "text-[var(--text)] opacity-30 cursor-not-allowed")}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
