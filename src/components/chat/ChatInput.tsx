import React, { useRef, useState } from 'react';
import { Paperclip, Mic, Send, Zap, ChevronRight, X } from 'lucide-react';
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
  onSend: () => void;
  isSending: boolean;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
}

const MAX_FILES = 5;

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText, setInputText, onSend, isSending, attachedImage, setAttachedImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const remaining = MAX_FILES - attachedFiles.length;
    const toAdd = newFiles.slice(0, remaining);

    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        const isVideo = file.type.startsWith('video');
        setAttachedFiles(prev => {
          if (prev.length >= MAX_FILES) return prev;
          return [...prev, {
            id: Date.now().toString() + Math.random(),
            url,
            type: isVideo ? 'video' : 'image',
            name: file.name
          }];
        });
        // Keep first image for backward compat
        if (!isVideo && !attachedImage) setAttachedImage(url);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => {
      const next = prev.filter(f => f.id !== id);
      const firstImg = next.find(f => f.type === 'image');
      setAttachedImage(firstImg ? firstImg.url : null);
      return next;
    });
  };

  const handleSend = () => {
    onSend();
    setAttachedFiles([]);
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  return (
    <footer className="px-4 pb-4 pt-2 bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[var(--sf)] rounded-3xl border border-transparent focus-within:border-[var(--bd)] transition-all shadow-sm overflow-hidden">

          {/* FILE PREVIEWS — di dalam box */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pt-3">
              {/* Counter */}
              <div className={cn(
                "text-[10px] font-bold mb-2",
                isFull ? "text-red-400" : attachedFiles.length >= 4 ? "text-amber-400" : "text-[var(--mu)]"
              )}>
                {attachedFiles.length}/{MAX_FILES} file
                {isFull && " · Batas maksimal"}
              </div>
              {/* Scrollable previews */}
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {attachedFiles.map(file => (
                  <div key={file.id} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[var(--bd)]">
                    {file.type === 'video'
                      ? <video src={file.url} className="w-full h-full object-cover" muted />
                      : <img src={file.url} alt="" className="w-full h-full object-cover" />
                    }
                    {file.type === 'video' && (
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Video
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center"
                    >
                      <X size={10} />
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
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Tanya apa saja..."
              rows={1}
              className="w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder:text-[var(--mu)] min-h-[28px] max-h-40"
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
                onClick={() => !isFull && fileInputRef.current?.click()}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  isFull ? "opacity-20 cursor-not-allowed" : "text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--bd)]"
                )}
              >
                <Paperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
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
                <Send size={20} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
