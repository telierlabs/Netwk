import React, { useRef, useState, useCallback } from 'react';
import { Mic, Zap, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AttachedFile {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[]) => void;
  isSending: boolean;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
}

const MAX_FILES = 5;

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const processFiles = useCallback((files: File[]) => {
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = files.slice(0, remaining);
    const promises = toAdd.map(file => new Promise<AttachedFile>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          id: `${Date.now()}-${Math.random()}`,
          url: reader.result as string,
          type: file.type.startsWith('video') ? 'video' : 'image',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then(newAttached => {
      setAttachedFiles(prev => {
        const next = [...prev, ...newAttached].slice(0, MAX_FILES);
        const firstImg = next.find(f => f.type === 'image');
        setAttachedImage(firstImg?.url || null);
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
    const imageUrls = attachedFiles.filter(f => f.type === 'image').map(f => f.url);
    onSend(imageUrls.length > 0 ? imageUrls : undefined);
    setAttachedFiles([]);
    setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

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

      {/* PICKER OVERLAY */}
      {showPicker && (
        <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />
      )}

      <footer className="px-4 pb-4 pt-2 bg-[var(--bg)] relative">

        {/* PICKER POPUP */}
        {showPicker && (
          <div
            className="absolute bottom-full mb-2 left-4 bg-[var(--bg)] rounded-2xl p-2 flex gap-1 z-[100]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' }}
          >
            {/* KAMERA */}
            <button
              onClick={() => { setShowPicker(false); cameraInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <span className="text-[11px] font-600 text-[var(--mu)]">Kamera</span>
            </button>

            <div className="w-px bg-[var(--bd)] my-2" />

            {/* GALERI */}
            <button
              onClick={() => { setShowPicker(false); !isFull && galleryInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <rect x="3" y="3" width="18" height="18" rx="3"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path strokeLinecap="round" d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <span className="text-[11px] font-600 text-[var(--mu)]">Galeri</span>
            </button>

            <div className="w-px bg-[var(--bd)] my-2" />

            {/* FILE */}
            <button
              onClick={() => { setShowPicker(false); !isFull && fileInputRef.current?.click(); }}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-[var(--sf)] transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--ac)] flex items-center justify-center">
                <svg width="22" height="22" fill="none" stroke="var(--at)" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                  <path strokeLinecap="round" d="M13 2v7h7"/>
                </svg>
              </div>
              <span className="text-[11px] font-600 text-[var(--mu)]">File</span>
            </button>
          </div>
        )}

        {/* HIDDEN INPUTS */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
        <input ref={fileInputRef} type="file" accept="*/*" multiple onChange={handleFileChange} className="hidden" />

        <div className="max-w-3xl mx-auto">
          <div className="bg-[var(--sf)] rounded-3xl border border-transparent focus-within:border-[var(--bd)] transition-all shadow-sm overflow-hidden">

            {/* FILE PREVIEWS */}
            {attachedFiles.length > 0 && (
              <div className="px-4 pt-3 pb-1">
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  {attachedFiles.map(file => (
                    <div key={file.id} className="relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--bd)]" style={{ width: 80, height: 80 }}>
                      {file.type === 'video' ? (
                        <>
                          <video src={file.url} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                              <svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            </div>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">Video</div>
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

            {/* TEXT INPUT */}
            <div className="px-5 pt-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Tanya apa saja..."
                rows={1}
                className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed placeholder:text-[var(--mu)] min-h-[28px] max-h-40"
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
                }}
              />
            </div>

            {/* BOTTOM ACTIONS */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => !isFull && setShowPicker(p => !p)}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    showPicker ? "bg-[var(--ac)] text-[var(--at)]" :
                    isFull ? "opacity-20 cursor-not-allowed text-[var(--text)]" :
                    "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--bd)]"
                  )}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                    <path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/>
                  </svg>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--cd)] border border-[var(--bd)] rounded-full text-xs font-medium hover:bg-[var(--bd)] transition-all">
                  <Zap size={14} />
                  <span>Auto</span>
                  <ChevronRight size={12} className="rotate-90" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--bd)] rounded-full transition-all">
                  <Mic size={20} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!hasContent || isSending}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    hasContent && !isSending
                      ? "bg-[var(--ac)] text-[var(--at)] scale-110 shadow-md"
                      : "text-[var(--text)] opacity-30 cursor-not-allowed"
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
