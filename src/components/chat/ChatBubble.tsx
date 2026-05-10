import React, { useState, memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Zap, Copy, ThumbsUp, ThumbsDown, RotateCcw, Share2,
  Check, ExternalLink, MapPin, Navigation, Download,
  Presentation, FileText, Maximize2, ChevronLeft, ChevronRight,
  X, Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock, Globe, List
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

function exportToPDFFromText(content: string, filename = 'cylen-export.pdf') {
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(content.replace(/[#*`]/g, ''), 170);
  doc.setFontSize(12);
  doc.text(lines, 20, 20);
  doc.save(filename);
}

const LANG_LABELS: Record<string, string> = {
  html: 'HTML', css: 'CSS', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  python: 'Python', nodejs: 'Node.js', nextjs: 'Next.js',
  json: 'JSON', bash: 'Bash', shell: 'Shell', sh: 'Shell',
  sql: 'SQL', tailwind: 'Tailwind', text: 'TEXT',
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
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all", copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)]")}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter style={prism} language={prismLang} PreTag="div" customStyle={{ margin: 0, padding: '1.25rem', fontSize: '13px', lineHeight: '1.65', background: 'transparent', borderRadius: 0 }}>
        {content}
      </SyntaxHighlighter>
    </div>
  );
});

const MapCard = memo(({ title, url }: { title: string; url: string }) => (
  <div className="flex flex-col gap-0 bg-[var(--cd)] border border-[var(--bd)] rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-all group my-4 max-w-md transform-gpu">
    <div className="p-4 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--cd)]">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-red-500 text-white rounded-lg"><MapPin size={16} /></div>
        <span className="font-bold text-[var(--text)] text-sm truncate max-w-[200px]">{title}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--ac)] text-[var(--at)] rounded-lg hover:scale-110 active:scale-95 transition-all"><Navigation size={16} /></a>
    </div>
    <div className="p-3 bg-[var(--cd)] flex items-center justify-center">
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold uppercase tracking-widest text-[var(--text)] hover:underline">Detail di Google Maps</a>
    </div>
  </div>
));

const PresentationRenderer = memo(({ content }: { content: string }) => { /* sama seperti sebelumnya */ return null; });
const DocumentRenderer = memo(({ content }: { content: string }) => { /* sama seperti sebelumnya */ return null; });

// ─── IMAGE VIEWER fullscreen ────────────────────────────────────────────────
const ImageViewer = ({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void; }) => {
  const [current, setCurrent] = useState(startIndex);
  const total = images.length;

  return (
    <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.28 }} className="fixed inset-0 z-[500] bg-black/95 flex flex-col backdrop-blur-md">
      <div className="flex items-center justify-between px-4 h-[60px] flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors flex items-center gap-1">
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <span className="text-white/70 text-[14px] font-semibold">{total > 1 ? `${current + 1} / ${total}` : ''}</span>
        <button onClick={() => { const a = document.createElement('a'); a.href = images[current]; a.download = `cylen-image-${current + 1}.png`; a.click(); }} className="p-2 -mr-2 text-white/80 hover:text-white transition-colors">
          <Download size={24} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          <motion.img key={current} src={images[current]} alt="" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }} className="max-w-full max-h-full object-contain select-none" />
        </AnimatePresence>
        {total > 1 && (
          <>
            <button onClick={() => setCurrent(c => (c - 1 + total) % total)} className="absolute left-3 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm"><ChevronLeft size={22} /></button>
            <button onClick={() => setCurrent(c => (c + 1) % total)} className="absolute right-3 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white backdrop-blur-sm"><ChevronRight size={22} /></button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="flex justify-center gap-1.5 py-4 flex-shrink-0 overflow-x-auto">
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="w-2 h-2 rounded-full transition-all flex-shrink-0" style={{ background: i === current ? 'white' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ─── IMAGE GRID (REVISI ALA GPT) ─────────────────────────────────────────────
const ImageGrid = memo(({ images, isUser }: { images: string[]; isUser: boolean }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(0);
  
  if (!images || images.length === 0) return null;
  const count = images.length;

  return (
    <>
      <AnimatePresence>
        {viewerOpen && <ImageViewer images={images} startIndex={viewerStart} onClose={() => setViewerOpen(false)} />}
      </AnimatePresence>
      <div className={cn("mb-2 flex flex-wrap gap-2 w-full", isUser ? "justify-end" : "justify-start")}>
        {images.map((src, i) => (
          <div
            key={i}
            onClick={() => { setViewerStart(i); setViewerOpen(true); }}
            className={cn(
              "relative overflow-hidden cursor-pointer border border-[var(--bd)] shadow-sm bg-[var(--sf)] hover:opacity-85 transition-opacity active:scale-[0.98]",
              count === 1 ? "rounded-2xl max-w-[280px]" : "rounded-xl w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] flex-shrink-0"
            )}
          >
            <img src={src} alt="attachment" loading="lazy" className="w-full h-full object-cover" />
            {count === 1 && (
              <div className="absolute bottom-2 right-2 w-7 h-7 bg-black/40 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Maximize2 size={13} className="text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
});

const HtmlPreview = memo(({ content }: { content: string }) => { /* ... (Tetap sama) ... */ return null; });
const CopyCard = memo(({ content }: { content: string }) => { /* ... (Tetap sama) ... */ return null; });

// ─── COLLAPSIBLE USER BUBBLE (REVISI KLIK LANGSUNG MUNCUL) ─────────────────
const CollapsibleUserBubble = memo(({ content, onClick }: { content: string; onClick: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  let replyText = null; let actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;

  const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setExpanded(v => !v); };

  return (
    <div
      onClick={onClick}
      className="w-full relative flex flex-col transform-gpu cursor-pointer active:opacity-70 transition-opacity"
      style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as any}
    >
      {replyText && (
        <div className="mx-2 mt-2 mb-1 bg-[var(--bg)]/40 border-l-[3px] border-[var(--ac)] p-2.5 rounded-r-[10px] rounded-bl-[10px]">
          <span className="text-[11px] font-black text-[var(--ac)] block mb-0.5 tracking-wide uppercase">Cylen AI</span>
          <span className="text-[12.5px] text-[var(--text)]/80 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}
      <div className={cn("px-4", replyText ? "pt-1" : "pt-3", "pb-3")}>
        <span className="text-[15px] leading-relaxed break-words">
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '...' : '')}
        </span>
      </div>
      {isLong && (
        <button onClick={handleToggle} className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
          {expanded ? <><ChevronUp size={14} /> Ciutkan</> : <><ChevronDown size={14} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ─── MAIN CHAT BUBBLE ────────────────────────────────────────────────────────
const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({ msg, msgIndex, isLast, onResend, onEdit, onSuggest, onTogglePin, onSaveItem, onRegenerate, onSwipeToReply, suggestions }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuCopied, setUserMenuCopied] = useState(false);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let cleanCopyText = msg.content;
    const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (replyMatch) cleanCopyText = replyMatch[2];
    navigator.clipboard.writeText(cleanCopyText);
    setUserMenuCopied(true); setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500);
  };

  const isUser = msg.role === 'user';
  const imgs = (msg.images && msg.images.length > 0) ? msg.images : msg.image ? [msg.image] : [];

  return (
    <div id={`message-${msgIndex}`} className={cn("flex flex-col group w-full relative transform-gpu", isUser ? "items-end" : "items-start")}>
      
      {/* Grid Foto */}
      {imgs.length > 0 && <ImageGrid images={imgs} isUser={isUser} />}

      {/* Bubble Chat */}
      {msg.content && (
        <motion.div
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
          onDragEnd={(e, info) => { if (info.offset.x > 60) onSwipeToReply?.(msg); }}
          className={cn("msg-bubble rounded-[22px] transform-gpu", isUser ? "bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-tr-[6px] max-w-[85%] shadow-sm relative" : "bg-transparent text-[var(--text)] px-0 w-full")}
          style={!isUser ? { userSelect: 'text', WebkitUserSelect: 'text' } as any : undefined}
        >
          {isUser ? (
            <>
              {/* Cukup klik, menu langsung muncul */}
              <CollapsibleUserBubble content={msg.content} onClick={() => setShowUserMenu(true)} />

              {/* Popup Menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); }} />
                    <motion.div initial={{ opacity: 0, scale: 0.92, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: -8 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-2 z-[110] w-[160px] bg-[var(--bg)]/95 backdrop-blur-xl border border-[var(--bd)] rounded-[16px] shadow-xl flex flex-col p-1.5">
                      <button onClick={(e) => { e.stopPropagation(); onResend?.(msg.content); setShowUserMenu(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"><RotateCcw size={16} /><span className="text-[13.5px] font-bold text-[var(--text)]">Ulangi</span></button>
                      <button onClick={(e) => { e.stopPropagation(); let clean = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/) ? msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/)![2] : msg.content; onEdit?.(clean); setShowUserMenu(false); }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"><Edit2 size={16} /><span className="text-[13.5px] font-bold text-[var(--text)]">Edit</span></button>
                      <div className="w-full h-[1px] bg-[var(--bd)] my-1" />
                      <button onClick={handleUserMenuCopy} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left">{userMenuCopied ? <><Check size={16} className="text-green-500" /><span className="text-[13.5px] font-bold text-green-500">Tersalin</span></> : <><Copy size={16} /><span className="text-[13.5px] font-bold text-[var(--text)]">Salin</span></>}</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="cylen-md w-full relative">
              <style>{`
                /* REVISI WARNA SELEKSI (HITAM TRANSPARAN) */
                .cylen-md *::selection { background: rgba(0, 0, 0, 0.2) !important; color: inherit; }
                .cylen-md *::-moz-selection { background: rgba(0, 0, 0, 0.2) !important; color: inherit; }
                .cylen-md { font-size: var(--chat-text-size, 15px); line-height:1.7; -webkit-tap-highlight-color: transparent; }
                .cylen-md h1 { font-size:1.55rem; font-weight:800; margin:1.4rem 0 0.6rem; }
                .cylen-md p { margin-bottom:0.75rem; }
                .cylen-md code:not(pre code) { background:var(--sf); color:var(--ac); padding:0.15em 0.45em; border-radius:5px; font-family:monospace; border:1px solid var(--bd); }
                .cylen-md a { color:var(--ac); text-decoration:underline; }
              `}</style>
              <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
            </div>
          )}
        </motion.div>
      )}

      {/* Action Bar AI */}
      {!isUser && (
        <div className="flex items-center gap-[28px] mt-1 relative">
          <button onClick={handleCopy} className={cn("transition-colors", copied ? "text-green-500" : "text-[var(--mu)] hover:text-[var(--text)]")}>{copied ? <Check size={18} /> : <Copy size={18} />}</button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} className={cn("transition-colors", liked === 'up' ? "text-blue-500" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsUp size={18} /></button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} className={cn("transition-colors", liked === 'down' ? "text-red-400" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsDown size={18} /></button>
          <button onClick={() => onRegenerate?.(msgIndex)} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><RotateCcw size={18} /></button>
        </div>
      )}
    </div>
  );
};

export const ChatBubble = memo(ChatBubbleComponent, (prev, next) => {
  return prev.msg.content === next.msg.content && prev.msg.pinned === next.msg.pinned && prev.isLast === next.isLast && prev.msg.role === next.msg.role;
});
