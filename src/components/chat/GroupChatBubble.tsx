import React, { useState, memo, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw,
  Check, Pin, PinOff, Edit2, ChevronDown, ChevronUp,
  FileText, Download, Sparkles // ── FIX: Tambahan ikon buat Kartu PPT
} from 'lucide-react';
import { AnimatePresence, motion, PanInfo } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface GroupChatBubbleProps {
  msg: Message;
  msgIndex: number;
  isLast?: boolean;
  isSending?: boolean;
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

const formatFullTimestamp = (ts?: string): string => {
  const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let date: Date;
  try { date = ts ? new Date(ts) : new Date(); if (isNaN(date.getTime())) date = new Date(); }
  catch { date = new Date(); }
  const jam = String(date.getHours()).padStart(2, '0');
  const mnt = String(date.getMinutes()).padStart(2, '0');
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${jam}:${mnt}`;
};

const CodeBlock = memo(({ lang, content }: { lang: string; content: string }) => {
  const [copied, setCopied] = useState(false);
  const label     = LANG_LABELS[lang.toLowerCase()] || lang.toUpperCase();
  const prismLang = lang === 'nodejs' ? 'javascript' : lang === 'nextjs' ? 'jsx' : lang === 'tailwind' ? 'css' : lang || 'text';
  return (
    <div className="my-4 border border-[var(--bd)] rounded-2xl overflow-hidden bg-[var(--cd)] shadow-sm w-full transform-gpu">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--sf)] border-b border-[var(--bd)]">
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', color:'var(--mu)', textTransform:'uppercase', fontFamily:'monospace' }}>{label}</span>
        <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
            copied ? "bg-black text-white border border-black" : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)]")}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <SyntaxHighlighter style={prism} language={prismLang} PreTag="div"
        customStyle={{ margin:0, padding:'1.25rem', fontSize:'13px', lineHeight:'1.65', background:'transparent', borderRadius:0 }}>
        {content}
      </SyntaxHighlighter>
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
        <span className="text-[15px] leading-relaxed" style={{ wordBreak:'break-word' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong && !expanded ? '...' : '')}
        </span>
      </div>
      {isLong && (
        <button onClick={handleToggle} className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity" style={{ color:'var(--text)' }}>
          {expanded ? <><ChevronUp size={14} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={14} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

// ── FIX: KOMPONEN KARTU PPT ELEGAN ──
const PPTCard = ({ data, isGenerating }: { data: any, isGenerating: boolean }) => {
  if (isGenerating) {
    return (
      <div className="my-4 w-full rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[pulse_1.5s_ease-in-out_infinite] shadow-lg">
        <div className="bg-[var(--bg)] rounded-[14px] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--text)]/5 flex items-center justify-center">
            <Sparkles size={24} className="text-purple-500 animate-[spin_3s_linear_infinite]" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-[var(--text)]/10 rounded animate-pulse mb-2"></div>
            <div className="h-3 w-1/2 bg-[var(--text)]/10 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const handleDownload = () => {
     // Karena di browser murni, kita generate file text (MD) buat hasil PPT-nya sementara
     const content = `# ${data.title}\n\n` + (data.slides || []).map((s:any, i:number) => `## Slide ${i+1}: ${s.title}\n${s.content}`).join('\n\n---\n\n');
     const blob = new Blob([content], { type: 'text/markdown' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${data.title || 'Presentasi_Cylen'}.md`;
     a.click();
     URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 w-full rounded-2xl p-[1px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-pink-500/40 relative overflow-hidden group shadow-sm">
      <style>{`@keyframes shimmerCard { 100% { transform: translateX(100%); } }`}</style>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmerCard_1.5s_infinite]" />
      
      <div className="bg-[var(--bg)] rounded-[15px] p-5 flex flex-col gap-4 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-blue-500/20">
            <FileText size={24} className="text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[16px] font-bold text-[var(--text)] truncate">{data.title || 'Materi Presentasi'}</h4>
            <p className="text-[13px] text-[var(--text)]/50 mt-1 font-medium">{data.slides?.length || 0} Slide • Cylen Presentation</p>
          </div>
        </div>
        <button onClick={handleDownload} className="w-full py-3 bg-[var(--text)] text-[var(--bg)] rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md hover:opacity-90">
          <Download size={18} /> Download Materi
        </button>
      </div>
    </div>
  );
};

const GroupChatBubbleComponent: React.FC<GroupChatBubbleProps> = ({
  msg, msgIndex, isLast, isSending, onResend, onEdit, onSuggest,
  onTogglePin, onRegenerate, onSwipeToReply, suggestions
}) => {
  const [copied, setCopied]                 = useState(false);
  const [liked, setLiked]                   = useState<null | 'up' | 'down'>(null);
  const [showUserMenu, setShowUserMenu]     = useState(false);
  const [userMenuCopied, setUserMenuCopied] = useState(false);

  useEffect(() => {
    const h = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('mousedown', h);
      document.addEventListener('touchstart', h);
    }
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [showUserMenu]);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleUserMenuCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let clean = msg.content;
    const m = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
    if (m) clean = m[2];
    navigator.clipboard.writeText(clean);
    setUserMenuCopied(true); setTimeout(() => { setUserMenuCopied(false); setShowUserMenu(false); }, 1500);
  };

  const openUserMenu  = (e: React.MouseEvent) => { e.stopPropagation(); setShowUserMenu(true); };
  const handleDragEnd = (_e: any, info: PanInfo) => { if (info.offset.x > 55) onSwipeToReply?.(msg); };

  const isUser     = msg.role === 'user';
  const senderName = msg.senderName || (isUser ? 'Kamu' : 'AI');

  // ── FIX: LOGIKA PARSER TAG PPT ──
  let contentToRender = msg.content;
  let hasPpt = false;
  let isPptGenerating = false;
  let pptData = null;
  let postPptContent = '';

  const pptStartTag = '[CYLEN_PPT_START]';
  const pptEndTag = '[CYLEN_PPT_END]';

  if (!isUser && contentToRender.includes(pptStartTag)) {
    hasPpt = true;
    const startIndex = contentToRender.indexOf(pptStartTag);
    
    if (contentToRender.includes(pptEndTag)) {
      const endIndex = contentToRender.indexOf(pptEndTag);
      const jsonStr = contentToRender.slice(startIndex + pptStartTag.length, endIndex).trim();
      try {
        pptData = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Gagal parse PPT JSON", e);
      }
      postPptContent = contentToRender.slice(endIndex + pptEndTag.length).trim();
      contentToRender = contentToRender.slice(0, startIndex).trim(); // Teks sebelum PPT
    } else {
      isPptGenerating = true;
      contentToRender = contentToRender.slice(0, startIndex).trim(); // Sembunyikan JSON yang lagi di-stream
    }
  }

  return (
    <div
      id={`group-message-${msgIndex}`}
      className={cn(
        "flex flex-col group w-full relative transform-gpu mt-2 mb-3",
        isUser ? "items-end" : "items-start",
        showUserMenu ? "z-[100]" : "z-10"
      )}
    >
      <div className={cn("flex items-end gap-2 mb-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
          <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider leading-none mb-1">
            {senderName}
          </span>
          <span className="text-[9px] font-mono text-[var(--mu)] tracking-wider leading-none">
            {formatFullTimestamp(msg.timestamp)}
          </span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] mb-0.5" />}
      </div>

      <AnimatePresence>
        {(msg.content || isUser) && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full flex"
          >
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              className={cn(
                "msg-bubble rounded-[22px] transform-gpu relative z-10",
                isUser
                  ? "bg-[var(--sf)] border border-[var(--bd)] text-[var(--text)] rounded-tr-[6px] max-w-[85%] shadow-sm ml-auto"
                  : "bg-transparent text-[var(--text)] px-0 w-full"
              )}
            >
              {isUser ? (
                <>
                  <CollapsibleUserBubble content={msg.content} onClick={openUserMenu} />
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1,    y: 0   }}
                        exit={{    opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-[calc(100%+8px)] right-0 z-[99999] w-[160px] bg-[var(--bg)] backdrop-blur-xl border border-[var(--bd)] rounded-[16px] shadow-xl flex flex-col p-1.5"
                      >
                        <button onClick={(e) => { e.stopPropagation(); onResend?.(msg.content); setShowUserMenu(false); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left">
                          <RotateCcw size={16} className="text-[var(--text)]" />
                          <span className="text-[13.5px] font-bold text-[var(--text)]">Ulangi</span>
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          let clean = msg.content;
                          const m = msg.content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
                          if (m) clean = m[2];
                          onEdit?.(clean); setShowUserMenu(false);
                        }} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left">
                          <Edit2 size={16} className="text-[var(--text)]" />
                          <span className="text-[13.5px] font-bold text-[var(--text)]">Edit</span>
                        </button>
                        <div className="w-full h-[1px] bg-[var(--bd)] my-1" />
                        <button onClick={handleUserMenuCopy}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-[var(--sf)] transition-colors active:scale-[0.98] text-left">
                          {userMenuCopied
                            ? <><Check size={16} className="text-black" /><span className="text-[13.5px] font-bold text-black">Tersalin</span></>
                            : <><Copy size={16} className="text-[var(--text)]" /><span className="text-[13.5px] font-bold text-[var(--text)]">Salin</span></>}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="cylen-md w-full" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                  <style>{`
                    .cylen-md { font-size: var(--chat-text-size, 15px); line-height: 1.75; color: var(--text); }
                    .cylen-md p { margin-bottom: 0.85rem; }
                    .cylen-md ul, .cylen-md ol { padding-left: 1.4rem; margin-bottom: 0.85rem; }
                    .cylen-md li { margin-bottom: 0.3rem; }
                    .cylen-md code:not(pre code) { background: var(--sf); padding: 0.15em 0.45em; border-radius: 5px; font-size: 0.875em; border: 1px solid var(--bd); }
                    .cylen-md strong { font-weight: 700; color: var(--text); }
                  `}</style>
                  
                  {/* Teks Sebelum PPT */}
                  {contentToRender && (
                    <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-([\w-]+)/.exec(className || '');
                        const lang  = match ? match[1] : '';
                        const raw   = String(children).replace(/\n$/, '');
                        if (inline) return <code className={className} {...props}>{children}</code>;
                        return <CodeBlock lang={lang || 'text'} content={raw} />;
                      },
                    }}>
                      {contentToRender}
                    </Markdown>
                  )}

                  {/* Render Kartu PPT */}
                  {hasPpt && <PPTCard data={pptData} isGenerating={isPptGenerating} />}

                  {/* Teks Setelah PPT */}
                  {postPptContent && (
                    <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {postPptContent}
                    </Markdown>
                  )}

                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isUser && msg.content && !isSending && (
        <div className="flex items-center gap-[28px] mt-1 relative ml-1">
          <button onClick={handleCopy} className={cn("transition-colors", copied ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")} title="Salin">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} className={cn("transition-colors", liked === 'up' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")} title="Bagus">
            <ThumbsUp size={16} />
          </button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} className={cn("transition-colors", liked === 'down' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")} title="Buruk">
            <ThumbsDown size={16} />
          </button>
          <button onClick={() => onRegenerate?.(msgIndex)} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors" title="Ulangi">
            <RotateCcw size={16} />
          </button>
          <button onClick={() => onTogglePin?.(msgIndex)} className={cn("transition-colors", msg.pinned ? "text-[var(--ac)]" : "text-[var(--mu)] hover:text-[var(--text)]")} title={msg.pinned ? "Unpin" : "Pin Pesan"}>
            {msg.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};

export const GroupChatBubble = memo(GroupChatBubbleComponent, (prev, next) => {
  return (
    prev.msg.content === next.msg.content &&
    prev.msg.pinned  === next.msg.pinned  &&
    prev.isLast      === next.isLast      &&
    prev.isSending   === next.isSending
  );
});
