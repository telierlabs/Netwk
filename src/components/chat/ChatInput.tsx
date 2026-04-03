import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Mic, Zap, ChevronRight, X, Square, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

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
  // Mode compact: input lebih kecil, centered, kaya Grok welcome screen
  compact?: boolean;
}

const MAX_FILES = 5;

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Browser tidak mendukung voice input'); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(transcript);
      if (e.results[e.results.length - 1].isFinal) { setInputText(transcript); setVoiceText(''); }
    };
    rec.onend = () => { setIsListening(false); setVoiceText(''); };
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
    const pdfFiles = attachedFiles.filter(f => f.type === 'pdf').map(f => ({
      data: f.url.split(',')[1],
      name: f.name,
    }));
    onSend(
      imageUrls.length > 0 ? imageUrls : undefined,
      pdfFiles.length > 0 ? pdfFiles : undefined,
    );
    setAttachedFiles([]);
    setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  // ── COMPACT MODE (Desktop welcome screen — kaya Grok) ──
  if (compact) {
    return (
      <>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
        <input ref={pdfInputRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />
        <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

        <div
          className="rounded-2xl overflow-hidden transition-all duration-200"
          style={{
            border: '1px solid var(--bd)',
            background: 'var(--sf)',
            boxShadow: inputText ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
          }}
        >
          {/* Attached files (compact) */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {attachedFiles.map(file => (
                <div key={file.id} className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--bg)]" style={{ width: 64, height: 64 }}>
                  {file.type === 'pdf' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 px-1">
                      <FileText size={20} className="text-red-500" />
                      <span className="text-[9px] text-red-600 font-medium text-center leading-tight truncate w-full px-1">{file.name}</span>
                    </div>
                  ) : (
                    <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />
                  )}
                  <button onClick={() => removeFile(file.id)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center">
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-center gap-2 px-4 py-3">
            {/* Mic */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={cn(
                'p-2 rounded-full transition-all flex-shrink-0',
                isListening
                  ? 'bg-red-500 text-white'
                  : 'text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--bd)]'
              )}
            >
              <Mic size={17} />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Tanya apa saja..."
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-[14px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[24px] max-h-32"
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />

            {/* Auto + Send */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg)] border border-[var(--bd)] rounded-full text-[11px] font-medium text-[var(--mu)] hover:text-[var(--text)] transition-all">
                <Zap size={12} />
                <span>Auto</span>
                <ChevronRight size={10} className="rotate-90" />
              </button>
              <button
                onClick={handleSend}
                disabled={!hasContent || isSending}
                className={cn(
                  'p-2 rounded-full transition-all',
                  hasContent && !isSending
                    ? 'bg-[var(--ac)] text-[var(--at)] shadow-sm'
                    : 'text-[var(--mu)] opacity-40 cursor-not-allowed'
                )}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom row: attach button */}
          <div className="flex items-center px-3 pb-2.5 gap-1">
            <button
              onClick={() => !isFull && setShowPicker(p => !p)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all',
                isFull
                  ? 'opacity-20 cursor-not-allowed text-[var(--mu)]'
                  : 'text-[var(--mu)] hover:bg-[var(--bd)] hover:text-[var(--text)]'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                <path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/>
              </svg>
              <span>Lampiran</span>
            </button>

            {/* Picker popup compact */}
            {showPicker && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />
                <div className="absolute bottom-full mb-2 left-0 bg-[var(--bg)] border border-[var(--bd)] rounded-2xl p-2 flex gap-1 z-[100]"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.16)' }}>
                  {[
                    { label: 'Kamera', ref: cameraInputRef, icon: <svg width="18" height="18" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                    { label: 'Galeri', ref: galleryInputRef, icon: <svg width="18" height="18" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path strokeLinecap="round" d="M21 15l-5-5L5 21"/></svg> },
                    { label: 'PDF', ref: pdfInputRef, icon: <FileText size={18} color="var(--at)" /> },
                  ].map((item, i) => (
                    <button key={i} onClick={() => { setShowPicker(false); !isFull && item.ref.current?.click(); }}
                      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[var(--ac)] flex items-center justify-center">{item.icon}</div>
                      <span className="text-[10px] font-medium text-[var(--mu)]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
            <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
            <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}>
              <X size={20} />
            </button>
          </div>
        )}
      </>
    );
  }

  // ── NORMAL MODE (Mobile + Desktop chat aktif) ──
  return (
    <>
      {/* LIGHTBOX */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setLightboxUrl(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* VOICE OVERLAY */}
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

        {/* PICKER POPUP */}
        {showPicker && (
          <div className="absolute bottom-full mb-2 left-4 bg-[var(--bg)] border border-[var(--bd)] rounded-2xl p-2 flex gap-1 z-[100]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}>
            <button onClick={() => { setShowPicker(false); cameraInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[var(--mu)]">Kamera</span>
            </button>
            <div className="w-px bg-[var(--bd)] my-2" />
            <button onClick={() => { setShowPicker(false); !isFull && galleryInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path strokeLinecap="round" d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[var(--mu)]">Galeri</span>
            </button>
            <div className="w-px bg-[var(--bd)] my-2" />
            <button onClick={() => { setShowPicker(false); !isFull && pdfInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <FileText size={22} color="var(--at)" />
              </div>
              <span className="text-[11px] font-medium text-[var(--mu)]">PDF</span>
            </button>
            <div className="w-px bg-[var(--bd)] my-2" />
            <button onClick={() => { setShowPicker(false); !isFull && fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                  <path strokeLinecap="round" d="M13 2v7h7"/>
                </svg>
              </div>
              <span className="text-[11px] font-medium text-[var(--mu)]">File</span>
            </button>
          </div>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
        <input ref={pdfInputRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />
        <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

        <div className="max-w-3xl mx-auto">
          <div
            className="bg-[var(--bg)] rounded-3xl overflow-hidden"
            style={{ border: '1px solid var(--bd)' }}
          >
            {/* Attached files */}
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {attachedFiles.map(file => (
                    <div key={file.id} className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--sf)]" style={{ width: 80, height: 80 }}>
                      {file.type === 'pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 px-1">
                          <FileText size={24} className="text-red-500" />
                          <span className="text-[9px] text-red-600 font-medium text-center leading-tight truncate w-full px-1">{file.name}</span>
                        </div>
                      ) : file.type === 'video' ? (
                        <>
                          <video src={file.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                              <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={file.url} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxUrl(file.url)} />
                      )}
                      <button onClick={() => removeFile(file.id)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center">
                        <X size={9} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="px-5 pt-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Tanya apa saja..."
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed placeholder:text-[var(--mu)] text-[var(--text)] min-h-[28px] max-h-40"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
                }}
              />
            </div>

            {/* Tombol-tombol */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => !isFull && setShowPicker(p => !p)}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    showPicker ? "bg-[var(--ac)] text-[var(--at)]" :
                    isFull ? "opacity-20 cursor-not-allowed text-[var(--text)]" :
                    "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--sf)]"
                  )}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                    <path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/>
                  </svg>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--sf)] border border-[var(--bd)] rounded-full text-xs font-medium text-[var(--text)] hover:bg-[var(--bd)] transition-all">
                  <Zap size={14} />
                  <span>Auto</span>
                  <ChevronRight size={12} className="rotate-90" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    isListening ? "bg-red-500 text-white scale-110 shadow-lg shadow-red-500/30" : "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--sf)]"
                  )}
                >
                  <Mic size={20} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!hasContent || isSending}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    hasContent && !isSending ? "bg-[var(--ac)] text-[var(--at)] scale-110 shadow-md" : "text-[var(--text)] opacity-30 cursor-not-allowed"
                  )}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
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
