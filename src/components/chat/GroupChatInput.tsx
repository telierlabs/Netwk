import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, FileText, Maximize2, ArrowLeft, Trash2, Paperclip } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface AttachedFile {
  id: string;
  url: string;
  type: 'image' | 'video' | 'pdf' | 'text';
  name: string;
  mimeType?: string;
}

interface GroupChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[]) => void;
  isSending: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  participants?: any[];
}

const MAX_FILES = 5;
const MAX_PASTE_LENGTH = 3000;

export const GroupChatInput: React.FC<GroupChatInputProps> = ({
  inputText, setInputText, onSend, isSending, replyingTo, onCancelReply, participants
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showMaximize, setShowMaximize] = useState(false);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

  // Note: tagWarning state udah dihapus karena kita bebasin ngobrol tanpa @
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 120); 
    el.style.height = `${newHeight}px`;
    setShowMaximize(newHeight >= 110);
  }, [inputText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:\s|^)@(\w*)$/);

    if (match) {
      setMentionQuery(match[1].toLowerCase());
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (name: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = inputText.slice(0, cursor);
    const textAfter = inputText.slice(cursor);
    const match = textBefore.match(/(?:\s|^)@(\w*)$/);

    if (match) {
      const replaceStart = textBefore.lastIndexOf('@');
      const newText = inputText.slice(0, replaceStart) + `@${name} ` + textAfter;
      setInputText(newText);
      setMentionQuery(null);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const filteredParticipants = participants
    ? participants.filter(p => p.isAI && p.name.toLowerCase().includes(mentionQuery || ''))
    : [];

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
      setAttachedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    });
  }, [attachedFiles.length]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFiles(Array.from(e.target.files));
    e.target.value = '';
    setShowPicker(false);
  }, [processFiles]);

  const removeFile = (id: string) => setAttachedFiles(prev => prev.filter(f => f.id !== id));

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

    // ── FIX: LOGIKA VALIDASI WAJIB @ UDAH DIHAPUS. USER BEBAS NGETIK APAPUN! ──
    
    const imageUrls = attachedFiles.filter(f => f.type === 'image' || f.type === 'video').map(f => f.url);
    const pdfFiles  = attachedFiles.filter(f => f.type === 'pdf'   || f.type === 'text').map(f => ({ data: f.url.split(',')[1], name: f.name }));
    onSend(imageUrls.length > 0 ? imageUrls : undefined, pdfFiles.length > 0 ? pdfFiles : undefined);
    setAttachedFiles([]); setIsFullscreenEditor(false); setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleClearText = () => { setInputText(''); setMentionQuery(null); if (textareaRef.current) textareaRef.current.style.height = 'auto'; };

  const hasContent = inputText.trim() || attachedFiles.length > 0;
  const isFull = attachedFiles.length >= MAX_FILES;

  return (
    <>
      <AnimatePresence>
        {isFullscreenEditor && (
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }} className="fixed inset-0 z-[300] bg-[var(--bg)] flex flex-col pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--text)]/10 bg-[var(--bg)] shadow-sm z-[310]">
              <button onClick={() => setIsFullscreenEditor(false)} className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">Edit Pesan</span>
              <div className="flex items-center">
                <button onClick={() => { handleClearText(); setIsFullscreenEditor(false); }} className="p-2 text-red-500 rounded-full active:scale-90 mr-2 [-webkit-tap-highlight-color:transparent]"><Trash2 size={22} strokeWidth={2} /></button>
                <button onClick={() => setIsFullscreenEditor(false)} className="p-2 -mr-2 text-[var(--text)]/60 rounded-full active:scale-90 [-webkit-tap-highlight-color:transparent]"><X size={24} strokeWidth={2.5} /></button>
              </div>
            </div>
            <div className="flex-1 p-5 overflow-hidden bg-[var(--bg)] z-[305]">
              <textarea autoFocus value={inputText} onChange={handleTextChange} onPaste={handlePaste} className="w-full h-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-[var(--text)] placeholder:text-[var(--mu)] focus:ring-0 [-webkit-tap-highlight-color:transparent]" style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any} placeholder="Pesan grup atau @sebut..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {lightboxUrl && (
        <div className="fixed inset-0 z-[200] bg-[#0a0a0a]/95 flex items-center justify-center p-4 pointer-events-auto" onClick={() => setLightboxUrl(null)}>
          {lightboxUrl.includes('video') ? <video src={lightboxUrl} controls autoPlay className="max-w-full max-h-full object-contain rounded-xl" /> : <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-object-contain rounded-xl" />}
          <button className="absolute top-5 right-5 w-10 h-10 bg-[#ffffff]/10 rounded-full flex items-center justify-center text-[#ffffff]"><X size={20} /></button>
        </div>
      )}

      <footer className="px-3 pt-2 pb-6 relative z-50 w-full pointer-events-auto">
        
        {showPicker && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setShowPicker(false)} />
            <div className="absolute bottom-full mb-3 left-4 rounded-[28px] p-2 flex flex-col gap-1 z-[100] bg-[var(--bg)]/80 backdrop-blur-3xl border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3)]" style={{ width: 190 }}>
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

        <AnimatePresence>
          {mentionQuery !== null && filteredParticipants.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="max-w-3xl mx-auto w-full mb-2">
              <div className="bg-[var(--text)]/10 backdrop-blur-3xl border border-[var(--text)]/10 shadow-lg rounded-3xl p-1.5 flex flex-col gap-1 max-h-[180px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <div className="px-3 py-2 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-wider">Panggil AI di Grup</div>
                {filteredParticipants.map(p => (
                  <button key={p.id} onClick={() => insertMention(p.name)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--text)]/10 active:scale-95 transition-all text-left [-webkit-tap-highlight-color:transparent]">
                    <div className="w-8 h-8 rounded-full bg-[var(--text)]/20 flex items-center justify-center text-[13px] font-bold text-[var(--text)] flex-shrink-0">
                      {p.avatar || p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-semibold text-[var(--text)] block truncate">{p.name}</span>
                      <span className="text-[11px] text-[var(--mu)] block truncate">{p.model || 'AI Assistant'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyingTo && (
            <motion.div initial={{ opacity: 0, y: 10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 10, height: 0 }} className="max-w-3xl mx-auto w-full mb-2">
              <div className="bg-[var(--text)]/5 backdrop-blur-md rounded-2xl border-l-[4px] border-[var(--text)] p-3 pr-10 relative shadow-sm ml-2 mr-2">
                <button onClick={onCancelReply} className="absolute right-2 top-2 p-1.5 text-[var(--mu)] rounded-full active:scale-90 hover:bg-[var(--text)]/10 [-webkit-tap-highlight-color:transparent]"><X size={16} strokeWidth={2.5} /></button>
                <div className="flex items-center gap-1.5 mb-1"><span className="text-[12px] font-bold text-[var(--text)] tracking-wide uppercase">{replyingTo.role === 'user' ? 'Kamu' : replyingTo.senderName || 'AI'}</span></div>
                <span className="text-[13.5px] text-[var(--text)]/80 line-clamp-2 font-medium leading-snug break-words">{replyingTo.content}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {attachedFiles.length > 0 && (
          <div className="max-w-3xl mx-auto w-full mb-2">
            <div className="flex gap-2.5 overflow-x-auto pb-1 items-center px-2" style={{ scrollbarWidth: 'none' }}>
              {attachedFiles.map(file => {
                if (file.type === 'pdf' || file.type === 'text') {
                  return (
                    <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 flex items-center gap-3 h-[46px] px-3 bg-[var(--text)]/5 border border-[var(--text)]/15 rounded-2xl max-w-[220px]">
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
                  <div key={file.id} className="relative flex-shrink-0 animate-in zoom-in duration-200 h-[72px] w-[72px] rounded-2xl overflow-hidden bg-[var(--text)]/5 border border-[var(--text)]/15 shadow-sm inline-flex">
                    {file.type === 'video' ? (
                      <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                        <video src={file.url} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative cursor-pointer" onClick={() => setLightboxUrl(file.url)}>
                        <img src={file.url} alt="" className="w-full h-full object-cover block" />
                      </div>
                    )}
                    <button onClick={() => removeFile(file.id)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-md z-10 transition-colors [-webkit-tap-highlight-color:transparent]">
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full">
          {isListening ? (
            <div className="flex items-center justify-between w-full h-[56px] rounded-full px-2 relative overflow-hidden bg-[var(--text)]/5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-xl border border-[var(--text)]/15">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[50px] bg-sky-400/30 blur-[20px] rounded-full animate-pulse" style={{ animationDuration: '1.5s' }} />
              <button onClick={() => { setVoiceText(''); stopListening(); }} className="relative z-10 w-[42px] h-[42px] rounded-full flex items-center justify-center bg-transparent text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-95 transition-all [-webkit-tap-highlight-color:transparent]"><X size={20} strokeWidth={2.5} /></button>
              <div className="relative z-10 flex-1 flex justify-center items-center px-4 overflow-hidden">
                {voiceText ? <span className="text-[15px] font-medium text-[var(--text)] truncate">{voiceText}</span> : <div className="flex items-center text-[var(--text)] opacity-60 text-[14px] font-medium">Bicara sekarang...</div>}
              </div>
              <button onClick={() => { stopListening(); if (voiceText) { setInputText(voiceText); setTimeout(() => handleSend(), 50); } else if (inputText) { handleSend(); } }} className="relative z-10 w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] active:scale-95 shadow-md [-webkit-tap-highlight-color:transparent]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" strokeWidth="2.5"/></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2 w-full">
              
              <div className="flex-1 min-w-0 bg-[var(--text)]/[0.04] backdrop-blur-xl border border-[var(--text)]/15 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-3xl flex items-end pl-2 pr-3 py-1.5 transition-all">
                
                <button
                  onClick={() => !isFull && setShowPicker(p => !p)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mb-[2px] transition-colors [-webkit-tap-highlight-color:transparent]",
                    showPicker ? "bg-[var(--text)]/10 text-[var(--text)]"
                    : isFull   ? "opacity-30 cursor-not-allowed text-[var(--text)]"
                               : "text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--text)]/10"
                  )}
                >
                  <Paperclip size={20} strokeWidth={2.2} style={{ transform: 'rotate(-45deg)' }} />
                </button>

                <div className="flex-1 flex flex-col justify-center min-w-0 mx-1 mb-[10px] mt-[10px]">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={handleTextChange} 
                    onPaste={handlePaste}
                    placeholder="Pesan grup atau @sebut..."
                    rows={1}
                    className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-[22px] placeholder:text-[var(--text)]/40 text-[var(--text)] focus:ring-0 focus:outline-none p-0 m-0"
                    style={{ maxHeight: '120px', scrollbarWidth: 'none', WebkitAppearance: 'none' } as any}
                  />
                </div>

                <div className="flex flex-shrink-0 items-center justify-end w-8 mb-[8px]">
                   <AnimatePresence mode="wait">
                    {inputText.length > 0 && !showMaximize ? (
                      <motion.button key="clear" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={handleClearText} className="w-8 h-8 flex items-center justify-center text-[var(--mu)] hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/10 [-webkit-tap-highlight-color:transparent]"><X size={18} strokeWidth={2.5} /></motion.button>
                    ) : showMaximize ? (
                      <motion.button key="expand" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsFullscreenEditor(true)} className="w-8 h-8 flex items-center justify-center text-[var(--mu)] hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/10 [-webkit-tap-highlight-color:transparent]"><Maximize2 size={16} strokeWidth={2.5} /></motion.button>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-center h-[52px]">
                {!hasContent ? (
                  <button onClick={startListening} className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-[var(--text)] bg-[var(--text)]/5 border border-[var(--text)]/10 shadow-sm active:scale-95 transition-all [-webkit-tap-highlight-color:transparent]">
                    <Mic size={22} strokeWidth={2.2} />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={isSending} className="w-[50px] h-[50px] rounded-full flex items-center justify-center bg-[var(--text)] text-[var(--bg)] shadow-md active:scale-95 transition-all [-webkit-tap-highlight-color:transparent]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </footer>
    </>
  );
};
