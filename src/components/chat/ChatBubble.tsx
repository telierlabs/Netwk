import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Zap,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Share2,
  ArrowLeftRight,
  Check,
  ExternalLink,
  MapPin,
  Navigation,
  Download,
  Presentation,
  FileText,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface ChatBubbleProps {
  msg: Message;
  onResend?: (content: string) => void;
  onEdit?: (content: string) => void;
  onSuggest?: (text: string) => void;
  suggestions?: string[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

/* ─────────────── MAP CARD ─────────────── */
const MapCard = ({ title, url }: { title: string; url: string }) => (
  <div className="flex flex-col gap-0 bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group my-4 max-w-md">
    <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-red-500 text-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <MapPin size={16} />
        </div>
        <span className="font-bold text-black text-sm truncate max-w-[200px]">{title}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="p-2 bg-black text-white rounded-lg hover:scale-110 active:scale-95 transition-all" title="Buka di Google Maps">
        <Navigation size={16} />
      </a>
    </div>
    <div className="w-full h-48 bg-slate-100 relative">
      <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(title)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
        allowFullScreen />
    </div>
    <div className="p-3 bg-white border-t-2 border-black flex items-center justify-center">
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[10px] font-bold uppercase tracking-widest text-black hover:underline">
        Lihat Detail di Google Maps
      </a>
    </div>
  </div>
);

/* ─────────────── PRESENTATION ─────────────── */
const PresentationRenderer = ({ content }: { content: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  let slides: any[] = [];
  try {
    slides = JSON.parse(content).slides || [];
  } catch {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200">Gagal memuat slide.</div>;
  }

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    slides.forEach((slide, i) => {
      if (i > 0) doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 297, 210, 'F');
      doc.setFontSize(24);
      doc.text(slide.title, 20, 30);
      doc.setFontSize(14);
      doc.text(doc.splitTextToSize(slide.content, 250), 20, 50);
    });
    doc.save('presentation.pdf');
  };

  return (
    <div className="my-6 border-2 border-black rounded-2xl overflow-hidden bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="bg-black text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation size={20} />
          <span className="font-bold uppercase tracking-widest text-xs">Cylen Slides</span>
        </div>
        <button onClick={exportToPDF} className="flex items-center gap-2 bg-white text-black px-3 py-1 rounded-lg text-xs font-bold hover:scale-105 transition-all">
          <Download size={14} /> PDF
        </button>
      </div>
      <div className="aspect-video p-12 flex flex-col justify-center bg-slate-50 relative min-h-[300px]">
        <h2 className="text-3xl font-black mb-6">{slides[currentSlide]?.title}</h2>
        <p className="text-lg leading-relaxed text-slate-600">{slides[currentSlide]?.content}</p>
        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-black/20">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>
      <div className="p-4 border-t-2 border-black flex items-center justify-between bg-white">
        <button disabled={currentSlide === 0} onClick={() => setCurrentSlide(s => s - 1)}
          className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20"><ChevronLeft /></button>
        <div className="flex gap-1">
          {slides.map((_: any, i: number) => (
            <div key={i} className={cn("w-2 h-2 rounded-full", i === currentSlide ? "bg-black" : "bg-black/10")} />
          ))}
        </div>
        <button disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(s => s + 1)}
          className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20"><ChevronRight /></button>
      </div>
    </div>
  );
};

/* ─────────────── DOCUMENT ─────────────── */
const DocumentRenderer = ({ content }: { content: string }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(content, 170), 20, 20);
    doc.save('document.pdf');
  };
  return (
    <div className="my-6 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="p-4 border-b-2 border-black flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <FileText size={18} />
          <span className="font-bold text-sm uppercase tracking-tight">Dokumen Cylen</span>
        </div>
        <button onClick={exportToPDF} className="p-2 bg-black text-white rounded-lg hover:scale-110 transition-all">
          <Download size={16} />
        </button>
      </div>
      <div className="p-8 prose prose-sm max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    </div>
  );
};

/* ─────────────── IMAGE GALLERY ─────────────── */
const ImageGallery = ({ src, square }: { src: string; square?: boolean }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'cylen-image.png';
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Cylen AI Image', url: src }); } catch { }
    }
  };

  return (
    <>
      <div
        className="relative overflow-hidden cursor-pointer"
        style={square ? { width: 155, height: 155 } : { width: 240, height: 240, borderRadius: 16 }}
        onClick={() => setIsFullscreen(true)}
      >
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
            <div className="mt-8 flex gap-4">
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <Download size={20} /> Unduh Gambar
              </button>
              <button onClick={handleShare}
                className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <Share2 size={20} /> Bagikan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ─────────────── GRAPH ─────────────── */
const GraphRenderer = ({ content }: { content: string }) => {
  try {
    const { type, data } = JSON.parse(content.trim());
    return (
      <div className="w-full h-64 my-4 bg-[var(--sf)] p-4 rounded-2xl border border-[var(--bd)] shadow-sm">
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
                {data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  } catch {
    return <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-mono">Gagal merender grafik.</div>;
  }
};

/* ─────────────── HTML PREVIEW ─────────────── */
const HtmlPreview = ({ content }: { content: string }) => (
  <div className="my-4 border border-[var(--bd)] rounded-2xl overflow-hidden bg-white shadow-md">
    <div className="bg-[var(--sf)] px-4 py-2 border-b border-[var(--bd)] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] ml-2">Live Preview</span>
      </div>
      <ExternalLink size={14} className="text-[var(--mu)]" />
    </div>
    <iframe srcDoc={content} title="Preview" className="w-full h-80 border-none" sandbox="allow-scripts" />
  </div>
);

/* ─────────────── COPY CARD ─────────────── */
const CopyCard = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-4 p-5 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow">
      {/* copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--ac)] text-[var(--at)] rounded-xl text-[11px] font-bold hover:opacity-80 active:scale-95 transition-all"
        title="Salin Teks"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Tersalin!' : 'Salin'}
      </button>
      {/* content */}
      <div className="text-[15px] leading-relaxed text-[var(--text)] pr-20 font-medium">{content}</div>
      {/* footer label */}
      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold uppercase tracking-widest text-[var(--mu)]">
        <Zap size={9} />
        <span>Cylen AI Card</span>
      </div>
    </div>
  );
};

/* ─────────────── CODE BLOCK ─────────────── */
const CodeBlock = ({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[var(--bd)] shadow-sm">
      <div className="bg-[#1a1b26] px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{lang}</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-[11px] text-white/60 font-medium">
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter
        style={atomDark}
        language={lang}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1rem', fontSize: '13px', lineHeight: '1.6' }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
};

/* ─────────────── MAIN BUBBLE ─────────────── */
export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg, onResend, onEdit, onSuggest, suggestions }) => {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null);
  const [showUserSheet, setShowUserSheet] = useState(false);
  const [userSheetCopied, setUserSheetCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUserSheetCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setUserSheetCopied(true);
    setTimeout(() => { setUserSheetCopied(false); setShowUserSheet(false); }, 1500);
  };

  const isUser = msg.role === 'user';

  return (
    <div className={cn("flex flex-col group w-full", isUser ? "items-end" : "items-start")}>
      {/* ── meta row ── */}
      <div className="flex items-center gap-2.5 mb-2">
        {!isUser && (
          <div className="w-7 h-7 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
        )}
        <div className="flex flex-col">
          {msg.senderName && (
            <span className="text-[10px] font-bold text-[var(--text)] uppercase tracking-widest leading-none mb-1">
              {msg.senderName}
            </span>
          )}
          <span className="text-[10px] font-mono text-[var(--mu)] uppercase tracking-wider leading-none">
            {msg.timestamp}
          </span>
        </div>
      </div>

      {/* ── images ── */}
      {((msg.images && msg.images.length > 0) || msg.image) && (() => {
        const imgs = (msg.images && msg.images.length > 0) ? msg.images : [msg.image!];
        const count = imgs.length;
        return (
          <div className={cn("mb-2", isUser ? "flex justify-end" : "")}>
            {count === 1 ? (
              <ImageGallery src={imgs[0]} />
            ) : (
              <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 320 }}>
                {imgs.map((src, i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <ImageGallery src={src} square />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── bubble ── */}
      {msg.content && (
        <div
          onClick={() => isUser && setShowUserSheet(true)}
          className={cn(
          "msg-bubble rounded-2xl",
          isUser
            ? "bg-[var(--ac)] text-[var(--at)] rounded-tr-none max-w-[78%] px-4 py-3 text-[15px] leading-relaxed cursor-pointer active:opacity-80 transition-opacity"
            : "bg-transparent text-[var(--text)] px-0 w-full"
        )}>
          {isUser ? (
            /* ── user: plain text ── */
            <span style={{ wordBreak: 'break-word' }}>{msg.content}</span>
          ) : (
            /* ── assistant: full markdown ── */
            <div className="cylen-md w-full">
              <style>{`
                .cylen-md { font-size: 15px; line-height: 1.7; color: var(--text); }

                /* headings — bold & big */
                .cylen-md h1 { font-size: 1.55rem; font-weight: 800; margin: 1.4rem 0 0.6rem; line-height: 1.25; color: var(--text); }
                .cylen-md h2 { font-size: 1.25rem; font-weight: 700; margin: 1.2rem 0 0.5rem; line-height: 1.3; color: var(--text); }
                .cylen-md h3 { font-size: 1.05rem; font-weight: 700; margin: 1rem 0 0.4rem; color: var(--text); }
                .cylen-md h4 { font-size: 0.95rem; font-weight: 600; margin: 0.8rem 0 0.3rem; color: var(--text); }

                /* paragraph */
                .cylen-md p { margin-bottom: 0.75rem; }
                .cylen-md p:last-child { margin-bottom: 0; }

                /* list */
                .cylen-md ul { list-style: disc; padding-left: 1.4rem; margin-bottom: 0.75rem; }
                .cylen-md ol { list-style: decimal; padding-left: 1.4rem; margin-bottom: 0.75rem; }
                .cylen-md li { margin-bottom: 0.3rem; font-size: 15px; }
                .cylen-md li > ul, .cylen-md li > ol { margin-top: 0.3rem; margin-bottom: 0; }

                /* inline code */
                .cylen-md code {
                  background: var(--sf);
                  color: var(--ac);
                  padding: 0.15em 0.45em;
                  border-radius: 5px;
                  font-family: 'JetBrains Mono', 'Fira Code', monospace;
                  font-size: 0.875em;
                  border: 1px solid var(--bd);
                }

                /* blockquote */
                .cylen-md blockquote {
                  border-left: 3px solid var(--ac);
                  padding-left: 1rem;
                  margin: 1rem 0;
                  color: var(--mu);
                  font-style: italic;
                }

                /* hr */
                .cylen-md hr { border: none; border-top: 1px solid var(--bd); margin: 1.5rem 0; }

                /* strong / em */
                .cylen-md strong { font-weight: 700; color: var(--text); }
                .cylen-md em { font-style: italic; }

                /* TABLE — scrollable wrapper handled in component */
                .cylen-md .table-wrap { overflow-x: auto; margin: 1rem 0; border: 1px solid var(--bd); border-radius: 12px; }
                .cylen-md table { width: 100%; border-collapse: collapse; font-size: 14px; }
                .cylen-md thead { background: var(--sf); }
                .cylen-md th { padding: 10px 14px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mu); white-space: nowrap; border-bottom: 1px solid var(--bd); }
                .cylen-md td { padding: 10px 14px; border-bottom: 1px solid var(--bd); color: var(--text); }
                .cylen-md tr:last-child td { border-bottom: none; }
                .cylen-md tr:hover td { background: var(--sf); }
              `}</style>

              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  /* ── code blocks ── */
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    const raw = String(children).replace(/\n$/, '');

                    if (inline) {
                      return (
                        <code className={className} {...props}>{children}</code>
                      );
                    }

                    if (lang === 'json-graph') return <GraphRenderer content={raw} />;
                    if (lang === 'html-preview') return <HtmlPreview content={raw} />;
                    if (lang === 'copy-card') return <CopyCard content={raw} />;
                    if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
                    if (lang === 'document-content') return <DocumentRenderer content={raw} />;

                    return <CodeBlock lang={lang || 'text'} content={raw} />;
                  },

                  /* ── table with scroll wrapper ── */
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-4 border border-[var(--bd)] rounded-xl shadow-sm">
                        <table className="w-full border-collapse text-left">{children}</table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className="bg-[var(--sf)] border-b border-[var(--bd)]">{children}</thead>;
                  },
                  th({ children }) {
                    return (
                      <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-[var(--mu)] whitespace-nowrap">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return <td className="px-4 py-3 border-b border-[var(--bd)] text-[14px] text-[var(--text)]">{children}</td>;
                  },

                  /* ── standard elements ── */
                  p({ children }) {
                    return <p className="mb-3 last:mb-0 leading-relaxed text-[15px]">{children}</p>;
                  },
                  h1({ children }) {
                    return <h1 className="text-[1.55rem] font-extrabold mt-5 mb-2 leading-tight text-[var(--text)]">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-[1.25rem] font-bold mt-4 mb-2 leading-snug text-[var(--text)]">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-[1.05rem] font-bold mt-3 mb-1.5 text-[var(--text)]">{children}</h3>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="text-[15px] leading-relaxed">{children}</li>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-[3px] border-[var(--ac)] pl-4 my-3 italic text-[var(--mu)]">
                        {children}
                      </blockquote>
                    );
                  },
                  hr() {
                    return <hr className="border-none border-t border-[var(--bd)] my-5" />;
                  },
                  strong({ children }) {
                    return <strong className="font-bold text-[var(--text)]">{children}</strong>;
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-[var(--ac)] underline underline-offset-2 hover:opacity-75 transition-opacity">
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {msg.content}
              </Markdown>
            </div>
          )}

          {/* sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {msg.sources.map((src, si) => (
                <a key={si} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--sf)] border border-[var(--bd)] rounded-full text-xs font-medium hover:bg-[var(--bd)] transition-all shadow-sm">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${new URL(src.url).hostname}&sz=32`}
                    alt="" className="w-4 h-4 rounded-sm"
                    onError={(e) => (e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>')}
                  />
                  <span className="truncate max-w-[120px]">{src.title}</span>
                </a>
              ))}
            </div>
          )}

          {/* map cards */}
          {!isUser && (
            <div className="flex flex-col gap-2 mt-4">
              {msg.sources?.filter(s => s.url.includes('google.com/maps') || s.url.includes('goo.gl/maps')).map((mapSrc, mi) => (
                <MapCard key={mi} title={mapSrc.title} url={mapSrc.url} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI action bar ── */}
      {!isUser && (
        <div className="flex items-center gap-2 -mt-0.5 -ml-1.5">
          <button onClick={handleCopy} title="Salin"
            className={cn("p-1.5 rounded-lg transition-colors", copied ? "text-green-500" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
          <button title="Bagikan" className="p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <Share2 size={17} />
          </button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} title="Suka"
            className={cn("p-1.5 rounded-lg transition-colors", liked === 'up' ? "text-blue-500" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            <ThumbsUp size={17} />
          </button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} title="Tidak Suka"
            className={cn("p-1.5 rounded-lg transition-colors", liked === 'down' ? "text-red-400" : "text-[var(--mu)] hover:text-[var(--text)]")}>
            <ThumbsDown size={17} />
          </button>
          <button title="Ulangi" className="p-1.5 rounded-lg text-[var(--mu)] hover:text-[var(--text)] transition-colors">
            <RotateCcw size={17} />
          </button>
        </div>
      )}

      {/* ── Suggestions — gap antar item, panah horizontal Grok style ── */}
      {!isUser && suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggest?.(s)}
              className="flex items-center gap-2 text-left group/sug w-fit max-w-full"
            >
              {/* panah Grok: garis horizontal panjang dulu, lalu belok bawah dikit ke kanan */}
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none"
                className="flex-shrink-0 text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {/* garis horizontal dari kiri */}
                <path d="M1 4 L10 4" />
                {/* belok elegan ke bawah lalu ke kanan */}
                <path d="M10 4 C14 4 14 4 14 8" />
                {/* garis ke kanan */}
                <path d="M14 8 L17 8" />
                {/* kepala panah */}
                <polyline points="14.5,5.5 17,8 14.5,10.5" />
              </svg>
              <span className="text-[13px] text-[var(--mu)] group-hover/sug:text-[var(--text)] transition-colors leading-snug underline underline-offset-2 decoration-[var(--mu)]/25 group-hover/sug:decoration-[var(--text)]/40">
                {s}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── User bubble — klik buka bottom sheet ── */}
      {isUser && showUserSheet && (
        <AnimatePresence>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/30"
            onClick={() => setShowUserSheet(false)}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[160] bg-[var(--bg)] border-t border-[var(--bd)] rounded-t-2xl shadow-2xl pb-8"
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 rounded-full bg-[var(--bd)]" />
            </div>

            {/* preview teks */}
            <div className="px-5 pb-4">
              <p className="text-[13px] text-[var(--mu)] line-clamp-2 leading-relaxed">{msg.content}</p>
            </div>

            <div className="border-t border-[var(--bd)]" />

            {/* aksi */}
            {[
              {
                icon: <RotateCcw size={18} />,
                label: 'Kirim Ulang',
                sub: 'Kirim pesan ini lagi ke AI',
                action: () => { onResend?.(msg.content); setShowUserSheet(false); },
                color: 'text-[var(--text)]',
              },
              {
                icon: <Share2 size={18} />,
                label: 'Edit Pesan',
                sub: 'Ubah teks lalu kirim ulang',
                action: () => { onEdit?.(msg.content); setShowUserSheet(false); },
                color: 'text-[var(--text)]',
              },
              {
                icon: userSheetCopied ? <Check size={18} /> : <Copy size={18} />,
                label: userSheetCopied ? 'Tersalin!' : 'Salin Pesan',
                sub: 'Salin teks ke clipboard',
                action: handleUserSheetCopy,
                color: userSheetCopied ? 'text-green-500' : 'text-[var(--text)]',
              },
            ].map((item, i) => (
              <button key={i} onClick={item.action}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--sf)] active:bg-[var(--bd)] transition-colors text-left">
                <div className={cn("w-9 h-9 rounded-xl bg-[var(--sf)] flex items-center justify-center flex-shrink-0", item.color)}>
                  {item.icon}
                </div>
                <div>
                  <div className={cn("text-[15px] font-semibold", item.color)}>{item.label}</div>
                  <div className="text-[12px] text-[var(--mu)]">{item.sub}</div>
                </div>
              </button>
            ))}

            {/* cancel */}
            <div className="border-t border-[var(--bd)] mt-2" />
            <button onClick={() => setShowUserSheet(false)}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 text-[var(--mu)] hover:bg-[var(--sf)] transition-colors text-[14px] font-medium">
              <X size={15} /> Batal
            </button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
