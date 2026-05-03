import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Zap, Copy, ThumbsUp, ThumbsDown, RotateCcw, Share2,
  Check, ExternalLink, MapPin, Navigation, Download,
  Presentation, FileText, Maximize2, ChevronLeft, ChevronRight,
  X, Pin, PinOff, Bookmark, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion, useAnimation, useMotionValue } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
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
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

function exportToPDFFromText(content: string, filename = 'cylen-export.pdf') {
  const doc = new jsPDF();
  const lines = doc.splitTextToSize(content.replace(/[#*`]/g, ''), 170);
  doc.setFontSize(12);
  doc.text(lines, 20, 20);
  doc.save(filename);
}

function exportToDoc(content: string, filename = 'cylen-export.doc') {
  const html = `<html><head><meta charset="utf-8"></head><body><pre style="font-family:Arial;font-size:12pt;white-space:pre-wrap">${content.replace(/</g, '<').replace(/>/g, '>')}</pre></body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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

const CodeBlock = ({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const label = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript'
    : lang === 'nextjs' ? 'jsx'
    : lang === 'tailwind' ? 'css'
    : lang || 'text';

  return (
    <div className="my-4 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--sf)] border-b border-[var(--bd)]">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--mu)', textTransform: 'uppercase', fontFamily: 'monospace' }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
            copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)]")}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter style={prism} language={prismLang} PreTag="div"
        customStyle={{ margin: 0, padding: '1.25rem', fontSize: '13px', lineHeight: '1.65', background: 'transparent', borderRadius: 0 }}
        codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}>
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

const MapCard = ({ title, url }: { title: string; url: string }) => (
  <div className="flex flex-col gap-0 bg-[var(--cd)] border border-[var(--bd)] rounded-xl overflow-hidden shadow-sm hover:opacity-90 transition-all group my-4 max-w-md">
    <div className="p-4 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--cd)]">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-red-500 text-white rounded-lg"><MapPin size={16} /></div>
        <span className="font-bold text-[var(--text)] text-sm truncate max-w-[200px]">{title}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="p-2 bg-[var(--ac)] text-[var(--at)] rounded-lg hover:scale-110 active:scale-95 transition-all">
        <Navigation size={16} />
      </a>
    </div>
    <div className="w-full h-48 bg-[var(--sf)]">
      <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(title)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
        allowFullScreen />
    </div>
    <div className="p-3 bg-[var(--cd)] border-t border-[var(--bd)] flex items-center justify-center">
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[10px] font-bold uppercase tracking-widest text-[var(--text)] hover:underline">
        Lihat Detail di Google Maps
      </a>
    </div>
  </div>
);

const PresentationRenderer = ({ content }: { content: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  let slides: any[] = [];
  try { slides = JSON.parse(content).slides || []; } catch {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200">Gagal memuat slide.</div>;
  }
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
    <div className="my-6 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full">
      <div className="bg-[var(--ac)] text-[var(--at)] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation size={20} />
          <span className="font-bold uppercase tracking-widest text-xs">Cylen Slides</span>
        </div>
        <button onClick={exportToPDF}
          className="flex items-center gap-2 bg-[var(--bg)] text-[var(--text)] px-3 py-1 rounded-lg text-xs font-bold hover:scale-105 transition-all">
          <Download size={14} /> PDF
        </button>
      </div>
      <div className="aspect-video p-12 flex flex-col justify-center bg-[var(--sf)] relative min-h-[300px]">
        <h2 className="text-3xl font-black mb-6 text-[var(--text)]">{slides[currentSlide]?.title}</h2>
        <p className="text-lg leading-relaxed text-[var(--mu)]">{slides[currentSlide]?.content}</p>
        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-[var(--mu)]">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
      <div className="p-4 border-t border-[var(--bd)] flex items-center justify-between bg-[var(--cd)]">
        <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)}
          className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)]">
          <ChevronLeft />
        </button>
        <div className="flex gap-1">
          {slides.map((_: any, i: number) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background: i === currentSlide ? 'var(--ac)' : 'var(--bd)' }} />
          ))}
        </div>
        <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)}
          className="p-2 hover:bg-[var(--sf)] rounded-xl disabled:opacity-20 text-[var(--text)]">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

const DocumentRenderer = ({ content }: { content: string }) => {
  const exportPDF = () => { const doc = new jsPDF(); doc.text(doc.splitTextToSize(content, 170), 20, 20); doc.save('document.pdf'); };
  return (
    <div className="my-6 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl shadow-sm overflow-hidden w-full">
      <div className="p-4 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--sf)]">
        <div className="flex items-center gap-2 text-[var(--mu)]">
          <FileText size={18} />
          <span className="font-bold text-sm uppercase tracking-tight">Dokumen Cylen</span>
        </div>
        <button onClick={exportPDF} className="p-2 bg-[var(--bg)] border border-[var(--bd)] rounded-lg hover:opacity-80 transition-all">
          <Download size={16} />
        </button>
      </div>
      <div className="p-8 prose prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
};

const ImageGallery = ({ src, square }: { src: string; square?: boolean }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  return (
    <>
      <div className="relative overflow-hidden cursor-pointer border border-[var(--bd)] shadow-sm"
        style={square ? { width: 155, height: 155, borderRadius: 12 } : { width: 240, height: 240, borderRadius: 16 }}
        onClick={() => setIsFullscreen(true)}>
        <img src={src} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
        <div className="absolute bottom-2 right-2 w-7 h-7 bg-black/40 rounded-lg flex items-center justify-center">
          <Maximize2 size={13} className="text-white" />
        </div>
      </div>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4">
            <button onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <X size={24} />
            </button>
            <img src={src} alt="Fullscreen" className="max-w-full max-h-[80vh] object-contain border-4 border-white shadow-2xl" />
            <div className="mt-8">
              <button onClick={() => { const a = document.createElement('a'); a.href = src; a.download = 'cylen-image.png'; a.click(); }}
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <Download size={20} /> Unduh
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const GraphRenderer = ({ content }: { content: string }) => {
  try {
    const { type, data } = JSON.parse(content.trim());
    return (
      <div className="w-full h-64 my-4 bg-[var(--cd)] p-4 rounded-2xl border border-[var(--bd)] shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }} cursor={{ fill: 'var(--sf)' }} />
              <Bar dataKey="value" fill="var(--ac)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke="var(--ac)" strokeWidth={3} dot={{ r: 4, fill: 'var(--ac)' }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="value" stroke="var(--ac)" fill="var(--ac)" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={{ fontSize: 10 }}>
                {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  } catch {
    return <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs w-full">Gagal merender grafik.</div>;
  }
};

const HtmlPreview = ({ content }: { content: string }) => {
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
      <div onClick={() => setIsExpanded(true)}
        className="my-3 flex items-center gap-4 p-4 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl cursor-pointer hover:opacity-80 transition-all shadow-sm w-full">
        <div className="w-11 h-11 rounded-xl bg-[var(--bg)] border border-[var(--bd)] flex items-center justify-center flex-shrink-0 text-[var(--mu)]">
          <Code size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[15px] font-bold text-[var(--text)] truncate">Simulasi Visual</h4>
          <p className="text-[12px] text-[var(--mu)] truncate mt-0.5">Kode · HTML</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[400] bg-[var(--bg)] flex flex-col">
      <div className="flex items-center justify-between px-3 h-[60px] bg-[var(--bg)] border-b border-[var(--bd)] shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-[var(--sf)] rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors flex items-center justify-center">
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-[15px] text-[var(--text)]">Simulasi Visual</span>
        </div>
        <div className="relative flex items-center">
          <button onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-[var(--sf)] rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <MoreVertical size={20} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[410]" onClick={() => setShowMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 z-[420] w-48 bg-[var(--cd)] border border-[var(--bd)] rounded-xl shadow-lg overflow-hidden py-1.5">
                  <button onClick={handleCopy}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span className={copied ? "text-green-500 font-medium" : "font-medium"}>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>
                  <div className="border-t border-[var(--bd)] mx-2" />
                  <button onClick={handleDownload}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text)] hover:bg-[var(--sf)] transition-colors text-left">
                    <Download size={16} /><span className="font-medium">Unduh HTML</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 bg-white relative">
        <iframe srcDoc={content} title="Preview Fullscreen" className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms" />
      </div>
    </motion.div>
  );
};

const CopyCard = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-4 p-5 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow w-full">
      <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-xl text-[11px] font-bold hover:bg-[var(--bd)] transition-all">
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}{copied ? 'Tersalin!' : 'Salin'}
      </button>
      <div className="text-[15px] leading-relaxed text-[var(--text)] pr-20 font-medium whitespace-pre-wrap">{content}</div>
    </div>
  );
};

const CollapsibleUserBubble = ({ content, onClick }: { content: string; onClick: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  // ✅ FIX: BONGKAR TEKS JIKA MENGANDUNG FORMAT REPLY
  let replyText = null;
  let actualContent = content;

  // Cek apakah pesan diawali format reply yang kita buat
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) {
    replyText = replyMatch[1];
    actualContent = replyMatch[2];
  }

  const isLong = actualContent.length > COLLAPSE_THRESHOLD;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(v => !v);
  };

  // ✅ KLIK KOTAK REPLY BUAT SCROLL KE ATAS (Nyari pesan asli)
  const handleScrollToReply = (e: React.MouseEvent) => {
    e.stopPropagation(); // Biar gak ngebuka menu edit/salin
    if (!replyText) return;
    
    // Ambil 20 karakter pertama buat dicari di DOM
    const searchSnippet = replyText.replace('...', '').substring(0, 20);
    const elements = document.querySelectorAll('[id^="message-"]');
    
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.textContent?.includes(searchSnippet)) {
        // Scroll mulus ke elemen tersebut
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Kasih efek "highlight" sementara (kedip border) biar ketahuan yg mana
        const bubble = el.querySelector('.msg-bubble') as HTMLElement;
        if (bubble) {
          bubble.style.transition = 'all 0.3s ease';
          bubble.style.outline = '2px solid var(--ac)';
          bubble.style.outlineOffset = '2px';
          setTimeout(() => {
            bubble.style.outline = 'none';
          }, 1200);
        }
        break;
      }
    }
  };

  return (
    <div className="w-full relative flex flex-col">
      
      {/* ✅ KOTAK REPLY WA STYLE DI DALAM BUBBLE */}
      {replyText && (
        <div 
          onClick={handleScrollToReply}
          className="mx-2 mt-2 mb-1 bg-[var(--bg)]/40 hover:bg-[var(--bg)]/60 border-l-[3px] border-[var(--ac)] p-2.5 rounded-r-[10px] rounded-bl-[10px] cursor-pointer transition-all active:scale-[0.98]"
        >
          <span className="text-[11px] font-black text-[var(--ac)] block mb-0.5 tracking-wide uppercase">Cylen AI</span>
          {/* Teks dibatesin cuma 2 baris aja */}
          <span className="text-[12.5px] text-[var(--text)]/80 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}

      {/* Teks Pesan Asli Lo (Klik buat menu Copy/Edit) */}
      <div onClick={onClick} className={cn("px-4 cursor-pointer active:opacity-80 transition-opacity pb-3", replyText ? "pt-1" : "pt-3")}>
        <span className="text-[15px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '...' : '')}
        </span>
      </div>

      {isLong && (
        <button
          onClick={handleToggle}
          className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text)' }}
        >
          {expanded ? (
            <><ChevronUp size={14} strokeWidth={2.5} /> Ciutkan</>
          ) : (
            <><ChevronDown size={14} strokeWidth={2.5} /> Selengkapnya</>
          )}
        </button>
      )}
    </div>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  msg, msgIndex, isLast, onResend, onEdit, onSuggest, onTogglePin, onSaveItem, onRegenerate, onSwipeToReply, suggestions
}) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu] = useState(false); 
  const [userMenuCopied, setUserMenuCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Animasi Swipe
  const controls = useAnimation();
  const x = useMotionValue(0);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleUserMenuCopy = (e: React.MouseEvent) => { 
    e.stopPropagation();
    
    // ✅ Kalo pas di-copy, kita buang tag "[Membalas pesan...]" nya biar bersih
    let cleanCopyText = msg.content;
    const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (replyMatch) {
      cleanCopyText = replyMatch[2]; // Ambil isinya aja
    }

    navigator.clipboard.writeText(cleanCopyText); 
    setUserMenuCopied(true); 
    setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500); 
  };

  const isUser = msg.role === 'user';

  return (
    <div id={`message-${msgIndex}`} className={cn("flex flex-col group w-full relative", isUser ? "items-end" : "items-start")}>

      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex flex-col">
          {msg.senderName && <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-widest leading-none mb-1">{msg.senderName}</span>}
          <span className="text-[10px] font-mono text-[var(--mu)] uppercase tracking-wider leading-none">{msg.timestamp}</span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] ml-1" />}
      </div>

      {((msg.images && msg.images.length > 0) || msg.image) && (() => {
        const imgs = (msg.images && msg.images.length > 0) ? msg.images : [msg.image!];
        return (
          <div className={cn("mb-2", isUser ? "flex justify-end" : "")}>
            {imgs.length === 1 ? <ImageGallery src={imgs[0]} /> : (
              <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                {imgs.map((src, i) => <div key={i} className="rounded-xl overflow-hidden"><ImageGallery src={src} square /></div>)}
              </div>
            )}
          </div>
        );
      })()}

      {msg.content && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(e, info) => {
            if (info.offset.x > 60) {
              onSwipeToReply?.(msg);
            }
          }}
          className={cn(
            "msg-bubble rounded-[22px]",
            isUser
              ? "bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-tr-[6px] max-w-[85%] shadow-sm relative cursor-grab active:cursor-grabbing"
              : "bg-transparent text-[var(--text)] px-0 w-full cursor-grab active:cursor-grabbing"
          )}>
          {isUser ? (
            <>
              <CollapsibleUserBubble
                content={msg.content}
                onClick={() => setShowUserMenu(true)}
              />
              
              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[100]" 
                      onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); }} 
                    />
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-2 z-[110] w-[160px] bg-[var(--bg)]/95 backdrop-blur-xl border border-[var(--bd)] rounded-[16px] shadow-xl overflow-hidden flex flex-col p-1.5"
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); onResend?.(msg.content); setShowUserMenu(false); }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"
                      >
                        <RotateCcw size={16} className="text-[var(--text)]" />
                        <span className="text-[13.5px] font-bold text-[var(--text)]">Ulangi</span>
                      </button>
                      
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          // Pas di-edit, buang tag reply-nya biar gak menuhin input text
                          let cleanEditText = msg.content;
                          const replyMatch = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
                          if (replyMatch) cleanEditText = replyMatch[2];
                          onEdit?.(cleanEditText); 
                          setShowUserMenu(false); 
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"
                      >
                        <Edit2 size={16} className="text-[var(--text)]" />
                        <span className="text-[13.5px] font-bold text-[var(--text)]">Edit</span>
                      </button>

                      <div className="w-full h-[1px] bg-[var(--bd)] my-1" />

                      <button 
                        onClick={handleUserMenuCopy}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left"
                      >
                        {userMenuCopied ? (
                          <>
                            <Check size={16} className="text-green-500" />
                            <span className="text-[13.5px] font-bold text-green-500">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} className="text-[var(--text)]" />
                            <span className="text-[13.5px] font-bold text-[var(--text)]">Salin</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="cylen-md w-full">
              <style>{`
                .cylen-md { font-size: var(--chat-text-size, 15px); line-height:1.7; color:var(--text); }
                .cylen-md h1 { font-size:1.55rem; font-weight:800; margin:1.4rem 0 0.6rem; line-height:1.25; }
                .cylen-md h2 { font-size:1.25rem; font-weight:700; margin:1.2rem 0 0.5rem; }
                .cylen-md h3 { font-size:1.05rem; font-weight:700; margin:1rem 0 0.4rem; }
                .cylen-md p { margin-bottom:0.75rem; }
                .cylen-md p:last-child { margin-bottom:0; }
                .cylen-md ul { list-style:disc; padding-left:1.4rem; margin-bottom:0.75rem; }
                .cylen-md ol { list-style:decimal; padding-left:1.4rem; margin-bottom:0.75rem; }
                .cylen-md li { margin-bottom:0.3rem; font-size: var(--chat-text-size, 15px); }
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
                  if (lang === 'json-graph') return <GraphRenderer content={raw} />;
                  if (lang === 'html-preview') return <HtmlPreview content={raw} />;
                  if (lang === 'copy-card') return <CopyCard content={raw} />;
                  if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
                  if (lang === 'document-content') return <DocumentRenderer content={raw} />;
                  return <CodeBlock lang={lang || 'text'} content={raw} />;
                },
                table({ children }) { return <div className="overflow-x-auto my-4 border border-[var(--bd)] rounded-xl shadow-sm"><table className="w-full border-collapse text-left">{children}</table></div>; },
                thead({ children }) { return <thead className="bg-[var(--sf)] border-b border-[var(--bd)]">{children}</thead>; },
                th({ children }) { return <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-[var(--mu)] whitespace-nowrap">{children}</th>; },
                td({ children }) { return <td className="px-4 py-3 border-b border-[var(--bd)] text-[14px]">{children}</td>; },
                p({ children }) { return <p className="mb-3 last:mb-0 leading-relaxed text-[var(--chat-text-size, 15px)]">{children}</p>; },
                h1({ children }) { return <h1 className="text-[1.55rem] font-extrabold mt-5 mb-2 leading-tight">{children}</h1>; },
                h2({ children }) { return <h2 className="text-[1.25rem] font-bold mt-4 mb-2 leading-snug">{children}</h2>; },
                h3({ children }) { return <h3 className="text-[1.05rem] font-bold mt-3 mb-1.5">{children}</h3>; },
                ul({ children }) { return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>; },
                ol({ children }) { return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>; },
                li({ children }) { return <li className="text-[var(--chat-text-size, 15px)] leading-relaxed">{children}</li>; },
                blockquote({ children }) { return <blockquote className="border-l-[3px] border-[var(--ac)] pl-4 my-3 italic text-[var(--mu)]">{children}</blockquote>; },
                hr() { return <hr className="border-none border-t border-[var(--bd)] my-5" />; },
                strong({ children }) { return <strong className="font-bold">{children}</strong>; },
                a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--ac)] underline underline-offset-2 hover:opacity-75 transition-opacity">{children}</a>; },
              }}>{msg.content}</Markdown>
            </div>
          )}

          {msg.sources && msg.sources.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-5">
              {msg.sources.map((src, si) => {
                let domain = src.url;
                try {
                  domain = new URL(src.url).hostname.replace(/^www\./, '');
                } catch (e) {}
                
                return (
                  <a key={si} href={src.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg)] border border-[var(--bd)] rounded-full text-[12px] font-medium hover:bg-[var(--sf)] transition-all shadow-sm">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                      alt="" 
                      className="w-4 h-4 rounded-full bg-white flex-shrink-0"
                      onError={(e) => (e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>')} 
                    />
                    <span className="truncate max-w-[140px] text-[var(--text)]">{domain}</span>
                  </a>
                );
              })}
            </div>
          )}

          {!isUser && (
            <div className="flex flex-col gap-2 mt-4">
              {msg.sources?.filter(s => s.url.includes('google.com/maps') || s.url.includes('goo.gl/maps')).map((mapSrc, mi) => (
                <MapCard key={mi} title={mapSrc.title} url={mapSrc.url} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {!isUser && (
        <div className="flex items-center gap-[28px] mt-1 relative">
          <button onClick={handleCopy} title="Salin"
            className={cn("transition-colors", copied ? "text-green-500" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button title="Bagikan" className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><Share2 size={18} /></button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} title="Suka"
            className={cn("transition-colors", liked === 'up' ? "text-blue-500" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            <ThumbsUp size={18} />
          </button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} title="Tidak Suka"
            className={cn("transition-colors", liked === 'down' ? "text-red-400" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            <ThumbsDown size={18} />
          </button>
          <button onClick={() => onRegenerate?.(msgIndex)} title="Ulangi" className="text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <RotateCcw size={18} />
          </button>
          <button onClick={() => onTogglePin?.(msgIndex)} title={msg.pinned ? "Lepas pin" : "Sematkan"}
            className={cn("transition-colors", msg.pinned ? "text-[var(--ac)]" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            {msg.pinned ? <PinOff size={18} /> : <Pin size={18} />}
          </button>
          <button onClick={() => onSaveItem?.({ type: 'teks', title: 'Pesan AI Cylen', preview: msg.content.substring(0, 50) + '...', content: msg.content })}
            title="Simpan" className="text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <Bookmark size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(p => !p)} title="Ekspor" className="text-[var(--mu)] hover:text-[var(--text)] transition-colors">
              <Download size={18} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-[50]" onClick={() => setShowExportMenu(false)} />
                <div className="absolute bottom-full mb-2 left-0 bg-[var(--bg)] border border-[var(--bd)] rounded-2xl shadow-xl z-[60] overflow-hidden min-w-[140px]">
                  <button onClick={() => { exportToPDFFromText(msg.content); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium hover:bg-[var(--sf)] transition-colors text-[var(--text)]">
                    <FileText size={15} /> Ekspor PDF
                  </button>
                  <div className="border-t border-[var(--bd)]" />
                  <button onClick={() => { exportToDoc(msg.content); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium hover:bg-[var(--sf)] transition-colors text-[var(--text)]">
                    <FileText size={15} /> Ekspor DOC
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isUser && isLast && suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-[44px] mt-[44px]">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => {
                onSuggest?.(s);
              }} 
              className="flex items-center gap-2 text-left group/sug w-fit max-w-full active:opacity-70 transition-opacity"
            >
              <svg width="18" height="10" viewBox="0 0 18 10" fill="none"
                className="flex-shrink-0 text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 1 L3 4" /><path d="M3 4 Q3 8 7 8 L15 8" /><polyline points="12,5.5 15,8 12,10.5" />
              </svg>
              <span className="text-[15px] text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors leading-snug">{s}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
};
