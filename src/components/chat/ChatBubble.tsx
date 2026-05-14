import React, { useState, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw, Share2,
  Check, Download, Presentation, FileText, ChevronLeft, ChevronRight,
  X, Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock, Globe, List, Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface ChatBubbleProps {
  msg: Message;
  msgIndex: number;
  isLast?: boolean;
  onResend?: (content: string) => void;
  onEdit?: (content: string) => void;
  onSuggest?: (text: string) => void;
  onTogglePin?: (index: number) => void;
  onSaveItem?: (item: any) => void;
  onRegenerate?: (index: number) => void;
  onSwipeToReply?: (msg: Message) => void;
  suggestions?: string[];
}

const COLLAPSE_THRESHOLD = 120;

const LANG_LABELS: Record<string, string> = {
  html: 'HTML', css: 'CSS', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  python: 'Python', nodejs: 'Node.js', nextjs: 'Next.js',
  json: 'JSON', bash: 'Bash', shell: 'Shell', sh: 'Shell',
  sql: 'SQL', yaml: 'YAML', yml: 'YAML', xml: 'XML',
  java: 'Java', kotlin: 'Kotlin', swift: 'Swift', go: 'Go',
  rust: 'Rust', cpp: 'C++', c: 'C', csharp: 'C#', php: 'PHP',
  ruby: 'Ruby', dart: 'Dart', tailwind: 'Tailwind', text: 'TEXT',
};

const CodeBlock = memo(({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript' : lang === 'nextjs' ? 'jsx' : lang === 'tailwind' ? 'css' : lang || 'text';

  return (
    <div className="my-4 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full transform-gpu">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--sf)] border-b border-[var(--bd)]">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--mu)', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all", copied ? "bg-black text-white border border-black" : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)]")}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter style={prism} language={prismLang} PreTag="div" customStyle={{ margin: 0, padding: '1.25rem', fontSize: '13px', lineHeight: '1.65', background: 'transparent', borderRadius: 0 }}>
        {content}
      </SyntaxHighlighter>
    </div>
  );
});

// ─── SMART IMAGE GALLERY (Rata Kanan/Kiri Sesuai User) ───
const SmartImageGallery = memo(({ images, isUser }: { images: string[], isUser: boolean }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openViewer = (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  const downloadImage = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = url;
    a.download = `cylen_image_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Komponen Viewer dirender ke document.body agar tidak tertimpa header/input chat
  const viewerPortalContent = (
    <AnimatePresence>
      {viewerOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center touch-none pointer-events-auto"
        >
          {/* Header Hitam Transparan: Panah Kembali Kiri, Download Kanan */}
          <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex items-center justify-between z-[999999] bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={() => setViewerOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-all">
              <ChevronLeft size={32} strokeWidth={2.5} />
            </button>
            <button onClick={(e) => downloadImage(e, images[currentIndex])} className="w-12 h-12 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-all">
              <Download size={26} strokeWidth={2.5} />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center relative">
            <motion.img 
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
              src={images[currentIndex]} alt="Fullscreen Preview" className="max-w-full max-h-[100vh] object-contain"
              drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
              onDragEnd={(e, { offset }) => {
                const swipe = offset.x;
                if (swipe < -50 && currentIndex < images.length - 1) setCurrentIndex(p => p + 1);
                else if (swipe > 50 && currentIndex > 0) setCurrentIndex(p => p - 1);
              }}
            />
            {images.length > 1 && currentIndex > 0 && (
              <button onClick={handlePrev} className="hidden md:flex absolute left-6 w-14 h-14 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full items-center justify-center text-white transition-colors z-[999999]">
                <ChevronLeft size={32} />
              </button>
            )}
            {images.length > 1 && currentIndex < images.length - 1 && (
              <button onClick={handleNext} className="hidden md:flex absolute right-6 w-14 h-14 bg-black/50 hover:bg-black/80 border border-white/10 rounded-full items-center justify-center text-white transition-colors z-[999999]">
                <ChevronRight size={32} />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-2 z-[999999]">
              {images.map((_, i) => (
                <div key={i} className={cn("w-2 h-2 rounded-full transition-all duration-300", currentIndex === i ? "bg-white scale-125" : "bg-white/30")} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={cn("w-full mb-2 mt-1 flex", isUser ? "justify-end" : "justify-start")}>
        <div className={cn("w-[85vw] sm:w-[500px] max-w-full flex flex-col gap-1.5", isUser ? "ml-auto" : "mr-auto")}>
          {images.length === 1 && (
            <div onClick={() => openViewer(0)} className="w-fit max-w-full rounded-[20px] overflow-hidden cursor-pointer shadow-sm border border-[var(--bd)]/20 relative bg-[var(--sf)]/20 inline-block ml-auto">
              <img src={images[0]} alt="Uploaded" className="w-full max-w-full h-auto max-h-[500px] object-contain" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          )}

          {images.length === 2 && (
            <div className="grid grid-cols-2 gap-1.5 rounded-[20px] overflow-hidden shadow-sm border border-[var(--bd)]/20 bg-[var(--sf)]/20 w-full h-[250px] sm:h-[300px]">
              {images.map((src, i) => (
                <div key={i} onClick={() => openViewer(i)} className="col-span-1 w-full h-full relative cursor-pointer group">
                  <img src={src} alt={`Uploaded ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {images.length === 3 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 rounded-[20px] overflow-hidden shadow-sm border border-[var(--bd)]/20 bg-[var(--sf)]/20 w-full h-[300px] sm:h-[400px]">
              {images.map((src, i) => (
                <div key={i} onClick={() => openViewer(i)} className={cn("relative w-full h-full cursor-pointer group", i === 0 ? "col-span-2 row-span-1" : "col-span-1 row-span-1")}>
                  <img src={src} alt={`Uploaded ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {images.length >= 4 && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1.5 rounded-[20px] overflow-hidden shadow-sm border border-[var(--bd)]/20 bg-[var(--sf)]/20 w-full h-[300px] sm:h-[400px]">
              {images.slice(0, 4).map((src, i) => (
                <div key={i} onClick={() => openViewer(i)} className="col-span-1 row-span-1 relative w-full h-full cursor-pointer group">
                  <img src={src} alt={`Uploaded ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white text-2xl font-bold">
                      +{images.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(viewerPortalContent, document.body)}
    </>
  );
});

// ─── LAIN-LAIN ───
const PresentationRenderer = memo(({ content }: { content: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  let slides: any[] = [];
  try { slides = JSON.parse(content).slides || []; } catch { return <div className="p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200">Gagal memuat slide.</div>; }
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((slide, i) => {
      if (i > 0) doc.addPage();
      doc.setFillColor(255, 255, 255); doc.rect(0, 0, 297, 210, 'F');
      doc.setFontSize(24); doc.text(slide.title, 20, 30);
      doc.setFontSize(14); doc.text(doc.splitTextToSize(slide.content, 250), 20, 50);
    });
    doc.save('presentation.pdf');
  };
  return (
    <div className="my-6 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full transform-gpu">
      <div className="bg-[var(--ac)] text-[var(--at)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2"><Presentation size={20} /><span className="font-bold uppercase tracking-widest text-xs">Cylen Slides</span></div>
        <button onClick={exportToPDF} className="flex items-center gap-2 bg-[var(--bg)] text-[var(--text)] px-3 py-1 rounded-lg text-xs font-bold hover:scale-105 transition-all"><Download size={14} /> PDF</button>
      </div>
      <div className="aspect-video p-12 flex flex-col justify-center bg-[var(--sf)] relative min-h-[300px]">
        <h2 className="text-3xl font-black mb-6 text-[var(--text)]">{slides[currentSlide]?.title}</h2>
        <p className="text-lg leading-relaxed text-[var(--mu)]">{slides[currentSlide]?.content}</p>
        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-[var(--mu)]">{currentSlide + 1} / {slides.length}</div>
      </div>
      <div className="p-4 border-t border-[var(--bd)] flex items-center justify-between bg-[var(--cd)]">
        <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)} className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)]"><ChevronLeft /></button>
        <div className="flex gap-1">{slides.map((_: any, i: number) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: i === currentSlide ? 'var(--ac)' : 'var(--bd)' }} />)}</div>
        <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)} className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)]"><ChevronRight /></button>
      </div>
    </div>
  );
});

const DocumentRenderer = memo(({ content }: { content: string }) => {
  const exportPDF = () => { const doc = new jsPDF(); doc.text(doc.splitTextToSize(content, 170), 20, 20); doc.save('document.pdf'); };
  return (
    <div className="my-6 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl shadow-sm overflow-hidden w-full transform-gpu">
      <div className="p-4 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--sf)]">
        <div className="flex items-center gap-2 text-[var(--mu)]"><FileText size={18} /><span className="font-bold text-sm uppercase tracking-tight">Dokumen Cylen</span></div>
        <button onClick={exportPDF} className="p-2 bg-[var(--bg)] border border-[var(--bd)] rounded-lg hover:opacity-80 transition-all"><Download size={16} /></button>
      </div>
      <div className="p-8 prose prose-sm max-w-none"><Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown></div>
    </div>
  );
});

const HtmlPreview = memo(({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => { setCopied(false); setShowMenu(false); }, 1800); };
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'simulasi_cylen.html';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  if (!isExpanded) {
    return (
      <div onClick={() => setIsExpanded(true)} className="my-3 flex items-center gap-4 p-4 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl cursor-pointer hover:opacity-80 transition-all shadow-sm w-full transform-gpu">
        <div className="w-11 h-11 rounded-xl bg-[var(--bg)] border border-[var(--bd)] flex items-center justify-center flex-shrink-0 text-[var(--mu)]"><Code size={20} /></div>
        <div className="flex-1 min-w-0"><h4 className="text-[15px] font-bold text-[var(--text)] truncate">Simulasi Visual</h4><p className="text-[12px] text-[var(--mu)] truncate mt-0.5">Kode · HTML</p></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed inset-0 z-[400] bg-[var(--bg)] flex flex-col transform-gpu">
      <div className="flex items-center justify-between px-3 h-[60px] bg-[var(--bg)] border-b border-[var(--bd)] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-[var(--sf)] rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors flex items-center justify-center"><ChevronLeft size={24} /></button>
          <span className="font-semibold text-[15px] text-[var(--text)]">Simulasi Visual</span>
        </div>
        <div className="relative flex items-center">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-[var(--sf)] rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors"><MoreVertical size={20} /></button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[410]" onClick={() => setShowMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-full right-0 mt-2 z-[420] w-48 bg-[var(--cd)] border border-[var(--bd)] rounded-xl shadow-lg overflow-hidden py-1.5">
                  <button onClick={handleCopy} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span className={copied ? "text-green-500 font-medium" : "font-medium"}>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                  <div className="border-t border-[var(--bd)] mx-2" />
                  <button onClick={handleDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left"><Download size={16} /><span className="font-medium">Unduh HTML</span></button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 bg-white relative"><iframe srcDoc={content} title="Preview Fullscreen" className="w-full h-full border-none" sandbox="allow-scripts allow-same-origin allow-forms" /></div>
    </motion.div>
  );
});

const CopyCard = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-4 p-5 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow w-full transform-gpu">
      <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-xl text-[11px] font-bold hover:bg-[var(--bd)] transition-all">
        {copied ? <Check size={13} className="text-black" /> : <Copy size={13} />}{copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div className="text-[15px] leading-relaxed text-[var(--text)] pr-20 font-medium whitespace-pre-wrap">{content}</div>
    </div>
  );
});

const CollapsibleUserBubble = memo(({ content, onClick }: { content: string; onClick: (e: React.MouseEvent) => void }) => {
  const [expanded, setExpanded] = useState(false);
  let replyText = null; let actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;
  const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setExpanded(v => !v); };
  
  return (
    <div className="w-full relative flex flex-col transform-gpu">
      {replyText && (
        <div className="mx-2 mt-2 mb-1 bg-[var(--bg)]/40 border-l-[3px] border-[var(--ac)] p-2.5 rounded-r-[10px] rounded-bl-[10px]">
          <span className="text-[11px] font-black text-[var(--ac)] block mb-0.5 uppercase">Cylen AI</span>
          <span className="text-[12.5px] text-[var(--text)]/80 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}
      <div onClick={onClick} className={cn("px-4 cursor-pointer active:opacity-80 transition-opacity pb-3 select-none", replyText ? "pt-1" : "pt-3")}>
        <span className="text-[15px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '...' : '')}
        </span>
      </div>
      {isLong && (
        <button onClick={handleToggle} className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
          {expanded ? <><ChevronUp size={14} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={14} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ─── MAIN COMPONENT ───
const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({ msg, msgIndex, isLast, onResend, onEdit, onSuggest, onTogglePin, onSaveItem, onRegenerate, onSwipeToReply, suggestions }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu] = useState(false); 
  const [userMenuCopied, setUserMenuCopied] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  
  const handleUserMenuCopy = (e: React.MouseEvent) => { 
    e.stopPropagation();
    let cleanCopyText = msg.content;
    const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (replyMatch) cleanCopyText = replyMatch[2]; 
    navigator.clipboard.writeText(cleanCopyText); 
    setUserMenuCopied(true); setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500); 
  };

  const openUserMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUserMenu(true);
  };

  const isUser = msg.role === 'user';

  if (!isUser && msg.isAutoReminder) {
    return (
      <div id={`message-${msgIndex}`} className="flex flex-col group w-full relative transform-gpu items-start my-6">
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-[90%] md:max-w-[80%] bg-transparent border border-[var(--text)]/10 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--text)]/5 blur-3xl rounded-full pointer-events-none" />
          <div className="border-l-[3px] border-[var(--text)]/20 pl-3 mb-4 relative z-10">
            <div className="flex items-center gap-1.5 mb-1.5"><Clock size={12} className="text-[var(--text)]/50" /><span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]/50">Cylen Mengingatkan</span></div>
            <p className="text-[13px] italic text-[var(--text)]/70 line-clamp-2 leading-relaxed">"{msg.quotedText}"</p>
          </div>
          <p className="text-[15px] font-medium text-[var(--text)] relative z-10 leading-relaxed">{msg.content}</p>
        </motion.div>
      </div>
    );
  }

  let pdfLinkElement = null;
  const pdfLinkMatch = msg.content && msg.content.match(/^\[PDF Terlampir: "(.*?)"\]\((.*?)\)\n\n([\s\S]*)$/);
  if (pdfLinkMatch) {
    const pdfTitle = pdfLinkMatch[1];
    const pdfUrl = pdfLinkMatch[2];
    const remainingContent = pdfLinkMatch[3];
    msg.content = remainingContent;

    pdfLinkElement = (
      <div className={cn("flex flex-col gap-2 mb-2 w-full", isUser ? "items-end" : "items-start")}>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={cn("flex items-center gap-3 px-4 py-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl shadow-sm w-fit max-w-[85%]", isUser ? "ml-auto" : "mr-auto")}>
          <FileText size={20} className="text-[var(--text)] shrink-0" />
          <span className="text-[14px] font-medium text-[var(--text)] truncate max-w-[200px]">{pdfTitle || 'PDF Terlampir'}</span>
        </a>
      </div>
    );
  }

  return (
    <div id={`message-${msgIndex}`} className={cn("flex flex-col group w-full relative transform-gpu", isUser ? "items-end" : "items-start", showUserMenu ? "z-[100]" : "z-10")}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex flex-col">
          {msg.senderName && <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-widest leading-none mb-1">{msg.senderName}</span>}
          <span className="text-[10px] font-mono text-[var(--mu)] uppercase tracking-wider leading-none">{msg.timestamp}</span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] ml-1" />}
      </div>

      {pdfLinkElement}

      {((msg.images && msg.images.length > 0) || msg.image) && (
        <SmartImageGallery images={(msg.images && msg.images.length > 0) ? msg.images : [msg.image!]} isUser={isUser} />
      )}

      {msg.pdfs && msg.pdfs.length > 0 && (
        <div className={cn("flex flex-col gap-2 mb-2 w-full", isUser ? "items-end" : "items-start")}>
          {msg.pdfs.map((pdf, i) => (
             <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl shadow-sm w-fit max-w-[85%]">
               <FileText size={20} className="text-[var(--text)] shrink-0" />
               <span className="text-[14px] font-medium text-[var(--text)] truncate max-w-[200px]">{pdf.name || 'Dokumen Terlampir'}</span>
             </div>
          ))}
        </div>
      )}

      {msg.content && (
        <div className={cn("msg-bubble rounded-[22px] transform-gpu relative z-10", isUser ? "bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-tr-[6px] max-w-[85%] shadow-sm" : "bg-transparent text-[var(--text)] px-0 w-full")}>
          {isUser ? (
            <>
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={(_e, info) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}>
                <CollapsibleUserBubble content={msg.content} onClick={openUserMenu} />
              </motion.div>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div 
                    onClick={(e) => e.stopPropagation()} 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: -10 }} 
                    transition={{ duration: 0.15 }} 
                    className="absolute top-[calc(100%+8px)] right-0 z-[99999] w-[160px] bg-[var(--bg)] backdrop-blur-xl border border-[var(--bd)] rounded-[16px] shadow-xl flex flex-col p-1.5" 
                  >
                    <button onClick={(e) => { e.stopPropagation(); onResend?.(msg.content); setShowUserMenu(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"><RotateCcw size={16} className="text-[var(--text)]" /><span className="text-[13.5px] font-bold text-[var(--text)]">Ulangi</span></button>
                    <button onClick={(e) => { e.stopPropagation(); let cleanEditText = msg.content; const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/); if (replyMatch) cleanEditText = replyMatch[2]; onEdit?.(cleanEditText); setShowUserMenu(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"><Edit2 size={16} className="text-[var(--text)]" /><span className="text-[13.5px] font-bold text-[var(--text)]">Edit</span></button>
                    <div className="w-full h-[1px] bg-[var(--bd)] my-1" />
                    <button onClick={handleUserMenuCopy} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left">{userMenuCopied ? <><Check size={16} className="text-black" /><span className="text-[13.5px] font-bold text-black">Tersalin</span></> : <><Copy size={16} className="text-[var(--text)]" /><span className="text-[13.5px] font-bold text-[var(--text)]">Salin</span></>}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={(_e, info) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }} className="w-full">
              <div className="cylen-md w-full" style={{ userSelect: "text", WebkitUserSelect: "text" }}>
                <style>{`
                  .cylen-md { font-size: var(--chat-text-size, 15px); line-height:1.7; color:var(--text); }
                  .cylen-md h1 { font-size:1.55rem; font-weight:800; margin:1.4rem 0 0.6rem; line-height:1.25; }
                  .cylen-md h2 { font-size:1.25rem; font-weight:700; margin:1.2rem 0 0.5rem; }
                  .cylen-md p { margin-bottom:0.75rem; }
                  .cylen-md ul { list-style:disc; padding-left:1.4rem; margin-bottom:0.75rem; }
                  .cylen-md ol { list-style:decimal; padding-left:1.4rem; margin-bottom:0.75rem; }
                  .cylen-md code:not(pre code) { background:var(--sf); color:var(--ac); padding:0.15em 0.45em; border-radius:5px; font-family:'JetBrains Mono',monospace; font-size:0.875em; border:1px solid var(--bd); }
                  .cylen-md blockquote { border-left:3px solid var(--ac); padding-left:1rem; margin:1rem 0; color:var(--mu); font-style:italic; }
                  .cylen-md hr { border:none; border-top:1px solid var(--bd); margin:1.5rem 0; }
                  .cylen-md strong { font-weight:700; }
                  .cylen-md a { color:var(--ac); text-decoration:underline; text-underline-offset:2px; }
                `}</style>
                <Markdown remarkPlugins={[remarkGfm]} components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-([\w-]+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    const raw = String(children).replace(/\n$/, '');
                    if (inline) return <code className={className} {...props}>{children}</code>;
                    if (lang === 'html-preview') return <HtmlPreview content={raw} />;
                    if (lang === 'copy-card') return <CopyCard content={raw} />;
                    if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
                    if (lang === 'document-content') return <DocumentRenderer content={raw} />;
                    if (lang === 'suggestions') return null;
                    if ((lang === 'text' || lang === '') && !raw.includes('\n') && raw.trim().length <= 120) return <span style={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)' }}>{raw}</span>;
                    return <CodeBlock lang={lang || 'text'} content={raw} />;
                  },
                }}>{msg.content}</Markdown>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!isUser && (
        <div className="flex items-center gap-[28px] mt-1 relative">
          <button onClick={handleCopy} className={cn("transition-colors", copied ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}>{copied ? <Check size={18} /> : <Copy size={18} />}</button>
          <button className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><Share2 size={18} /></button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} className={cn("transition-colors", liked === 'up' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsUp size={18} /></button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} className={cn("transition-colors", liked === 'down' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsDown size={18} /></button>
          <button onClick={() => onRegenerate?.(msgIndex)} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><RotateCcw size={18} /></button>
          <button onClick={() => onTogglePin?.(msgIndex)} className={cn("transition-colors", msg.pinned ? "text-[var(--ac)]" : "text-[var(--mu)] hover:text-[var(--text)]")}>{msg.pinned ? <PinOff size={18} /> : <Pin size={18} />}</button>
        </div>
      )}

      {!isUser && isLast && suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-[44px] mt-[44px]">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => onSuggest?.(s)} className="flex items-center gap-2 text-left group/sug w-fit max-w-full active:opacity-70 transition-opacity">
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none" className="flex-shrink-0 text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 1 L3 4" /><path d="M3 4 Q3 8 7 8 L15 8" /><polyline points="12,5.5 15,8 12,10.5" /></svg>
              <span className="text-[15px] text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors leading-snug">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatBubble = memo(ChatBubbleComponent, (prev, next) => {
  return prev.msg.content === next.msg.content && prev.msg.pinned === next.msg.pinned && prev.isLast === next.isLast;
});
