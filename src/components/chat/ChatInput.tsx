import React, { useRef } from 'react';
import { Paperclip, Mic, Send, Zap, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputText,
  setInputText,
  onSend,
  isSending,
  attachedImage,
  setAttachedImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <footer className="p-4 md:pb-8 bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto">
        {attachedImage && (
          <div className="mb-4 relative inline-block">
            <img src={attachedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-[var(--bd)]" />
            <button 
              onClick={() => setAttachedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="bg-[var(--sf)] rounded-3xl overflow-hidden border border-transparent focus-within:border-[var(--bd)] transition-all shadow-sm">
          <div className="px-5 pt-4">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Tanya apa saja..." 
              rows={1}
              className="w-full bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder:text-[var(--mu)] min-h-[28px] max-h-40"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
              }}
            />
          </div>
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--bd)] rounded-full transition-all"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
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
                onClick={onSend}
                disabled={(!inputText.trim() && !attachedImage) || isSending}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  (inputText.trim() || attachedImage) && !isSending
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
