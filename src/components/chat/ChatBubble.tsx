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
  Code,
  ExternalLink,
  MapPin,
  Navigation,
  Download,
  Presentation,
  FileText,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Printer,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface ChatBubbleProps {
  msg: Message;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const MapCard = ({ title, url }: { title: string; url: string }) => {
  return (
    <div className="flex flex-col gap-0 bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group my-4 max-w-md">
      <div className="p-4 border-b-2 border-black flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-500 text-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <MapPin size={16} />
          </div>
          <span className="font-bold text-black text-sm truncate max-w-[200px]">{title}</span>
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 bg-black text-white rounded-lg hover:scale-110 active:scale-95 transition-all"
          title="Buka di Google Maps"
        >
          <Navigation size={16} />
        </a>
      </div>
      <div className="w-full h-48 bg-slate-100 relative">
        <iframe 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          style={{ border: 0 }}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(title)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          allowFullScreen
        />
      </div>
      <div className="p-3 bg-white border-t-2 border-black flex items-center justify-center">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-bold uppercase tracking-widest text-black hover:underline"
        >
          Lihat Detail di Google Maps
        </a>
      </div>
    </div>
  );
};

const PresentationRenderer = ({ content }: { content: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  let slides = [];
  try {
    slides = JSON.parse(content).slides || [];
  } catch (e) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200">Gagal memuat slide.</div>;
  }

  const exportToPDF = async () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    for (let i = 0; i < slides.length; i++) {
      if (i > 0) doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 297, 210, 'F');
      doc.setFontSize(24);
      doc.text(slides[i].title, 20, 30);
      doc.setFontSize(14);
      const lines = doc.splitTextToSize(slides[i].content, 250);
      doc.text(lines, 20, 50);
    }
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
        <button 
          disabled={currentSlide === 0}
          onClick={() => setCurrentSlide(s => s - 1)}
          className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20"
        >
          <ChevronLeft />
        </button>
        <div className="flex gap-1">
          {slides.map((_: any, i: number) => (
            <div key={i} className={cn("w-2 h-2 rounded-full", i === currentSlide ? "bg-black" : "bg-black/10")} />
          ))}
        </div>
        <button 
          disabled={currentSlide === slides.length - 1}
          onClick={() => setCurrentSlide(s => s + 1)}
          className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-20"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

const DocumentRenderer = ({ content }: { content: string }) => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, 20);
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

const ImageGallery = ({ src }: { src: string }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'cylen-image.png';
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cylen AI Image',
          text: 'Lihat gambar yang dibuat oleh Cylen AI!',
          url: src
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <>
      <div className="my-4 relative group rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <img src={src} alt="Generated" className="w-full h-auto object-cover cursor-pointer" onClick={() => setIsFullscreen(true)} />
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleDownload} className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            <Download size={16} />
          </button>
          <button onClick={handleShare} className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            <Share2 size={16} />
          </button>
          <button onClick={() => setIsFullscreen(true)} className="p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4"
          >
            <button 
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 p-3 bg-white border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <X size={24} />
            </button>
            <img src={src} alt="Fullscreen" className="max-w-full max-h-[80vh] object-contain border-4 border-white shadow-2xl" />
            <div className="mt-8 flex gap-4">
              <button onClick={handleDownload} className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <Download size={20} /> Unduh Gambar
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-black rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
                <Share2 size={20} /> Bagikan
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
    // Clean content in case there are markdown artifacts
    const jsonStr = content.trim().replace(/^```json-graph/, '').replace(/```$/, '').trim();
    const { type, data } = JSON.parse(jsonStr);
    return (
      <div className="w-full h-64 my-4 bg-[var(--sf)] p-4 rounded-2xl border border-[var(--bd)] shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--mu)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bd)', borderRadius: '12px', fontSize: '12px' }}
                cursor={{ fill: 'var(--sf)' }}
              />
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
  } catch (e) {
    return (
      <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-mono">
        Gagal merender grafik. Pastikan format JSON benar.
      </div>
    );
  }
};

const HtmlPreview = ({ content }: { content: string }) => {
  return (
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
      <iframe 
        srcDoc={content} 
        title="Preview" 
        className="w-full h-80 border-none"
        sandbox="allow-scripts"
      />
    </div>
  );
};

const CopyCard = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-6 p-6 bg-white border-2 border-black rounded-xl relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all">
      <div className="text-sm font-medium leading-relaxed text-black mb-6 pr-8">{content}</div>
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 bg-black text-white rounded-lg hover:scale-110 active:scale-95 transition-all"
        title="Salin Teks"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-black/40">
        <Zap size={10} />
        <span>Cylen AI Card</span>
      </div>
    </div>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ msg }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex flex-col group w-full", msg.role === 'user' ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2.5 mb-2">
        {msg.role === 'assistant' && (
          <div className="w-7 h-7 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)] shadow-sm">
            <Zap size={14} />
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
      <div className={cn(
        "msg-bubble p-4 rounded-2xl text-sm leading-relaxed w-full",
        msg.role === 'user' 
          ? "bg-[var(--ac)] text-[var(--at)] rounded-tr-none max-w-[85%]" 
          : "bg-transparent text-[var(--text)] px-0"
      )}>
        {msg.image && (
          <ImageGallery src={msg.image} />
        )}
        <div className="markdown-body w-full">
          <Markdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const content = String(children).replace(/\n$/, '');
                
                if (!inline && lang === 'json-graph') {
                  return <GraphRenderer content={content} />;
                }
                if (!inline && lang === 'html-preview') {
                  return <HtmlPreview content={content} />;
                }
                if (!inline && lang === 'copy-card') {
                  return <CopyCard content={content} />;
                }
                if (!inline && lang === 'presentation-slides') {
                  return <PresentationRenderer content={content} />;
                }
                if (!inline && lang === 'document-content') {
                  return <DocumentRenderer content={content} />;
                }
                
                return !inline && match ? (
                  <div className="my-4 rounded-xl overflow-hidden border border-[var(--bd)] shadow-sm">
                    <div className="bg-[#1a1b26] px-4 py-1.5 border-b border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{lang}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(content)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <Copy size={12} className="text-white/40" />
                      </button>
                    </div>
                    <SyntaxHighlighter
                      style={atomDark}
                      language={lang}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1rem', fontSize: '13px' }}
                      {...props}
                    >
                      {content}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={cn("bg-[var(--sf)] px-1.5 py-0.5 rounded text-[var(--ac)] font-mono text-xs border border-[var(--bd)]", className)} {...props}>
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="my-6 overflow-x-auto border border-[var(--bd)] rounded-xl shadow-sm bg-[var(--bg)]">
                    <table className="w-full text-left border-collapse table-auto">
                      {children}
                    </table>
                  </div>
                );
              },
              thead({ children }) {
                return <thead className="bg-[var(--sf)] border-b border-[var(--bd)]">{children}</thead>;
              },
              th({ children }) {
                return <th className="px-4 py-3 font-bold text-[11px] uppercase tracking-wider text-[var(--mu)]">{children}</th>;
              },
              td({ children }) {
                return <td className="px-4 py-3 border-b border-[var(--bd)] text-xs text-[var(--text)]">{children}</td>;
              },
              p({ children }) {
                return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>;
              },
              li({ children }) {
                return <li className="text-sm">{children}</li>;
              }
            }}
          >
            {msg.content}
          </Markdown>
        </div>
        
        {msg.sources && (
          <div className="flex flex-wrap gap-2 mt-6">
            {msg.sources.map((src, si) => (
              <a 
                key={si} 
                href={src.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--sf)] border border-[var(--bd)] rounded-full text-xs font-medium hover:bg-[var(--bd)] transition-all shadow-sm"
              >
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${new URL(src.url).hostname}&sz=32`} 
                  alt="" 
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => (e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>')}
                />
                <span className="truncate max-w-[120px]">{src.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Maps Grounding */}
        {msg.role === 'assistant' && (
          <div className="flex flex-col gap-2 mt-4">
            {/* We will assume maps grounding chunks are passed in a specific way or just use the sources if they contain maps links */}
            {msg.sources?.filter(s => s.url.includes('google.com/maps') || s.url.includes('goo.gl/maps')).map((mapSrc, mi) => (
              <MapCard key={mi} title={mapSrc.title} url={mapSrc.url} />
            ))}
          </div>
        )}
      </div>
      <div className={cn(
        "flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity",
        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
      )}>
        <button 
          onClick={handleCopy}
          className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]"
          title="Salin"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        </button>
        <button className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]" title="Suka">
          <ThumbsUp size={14} />
        </button>
        <button className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]" title="Tidak Suka">
          <ThumbsDown size={14} />
        </button>
        <button className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]" title="Bagikan">
          <Share2 size={14} />
        </button>
        <button className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]" title="Ulangi">
          <RotateCcw size={14} />
        </button>
        <button className="p-2 text-[var(--mu)] hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-xl transition-all border border-transparent hover:border-[var(--bd)]" title="Bandingkan">
          <ArrowLeftRight size={14} />
        </button>
      </div>
    </div>
  );
};
