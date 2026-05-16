import React, { useState, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Copy, ThumbsUp, ThumbsDown, RotateCcw, Share2,
  Check, Download, Presentation, FileText, ChevronLeft, ChevronRight,
  Pin, PinOff, MoreVertical, Code, ChevronDown, ChevronUp,
  Edit2, Clock
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface GroupChatBubbleProps {
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

// --- KOMPONEN BANTUAN (CODE, DOKUMEN, GAMBAR DLL - SAMA SEPERTI ASLI) ---
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

// --- KOMPONEN GAMBAR & LAINNYA DIHILANGKAN DARI SNIPPET AGAR SINGKAT (PILIH FULL SNIPPET NYA NANTI DARI ASLINYA, GUA POKUS KE UI BUBBLENYA AJA DULU YA BIAR GAMPANG) ---

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

// ─── MAIN COMPONENT (KHUSUS GROUP CHAT) ───
const GroupChatBubbleComponent: React.FC<GroupChatBubbleProps> = ({
  msg, msgIndex, isLast, onResend, onEdit, onSuggest,
  onTogglePin, onRegenerate, onSwipeToReply, suggestions
}) => {
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
  const openUserMenu = (e: React.MouseEvent) => { e.stopPropagation(); setShowUserMenu(true); };

  const isUser = msg.role === 'user';
  
  // Deteksi Nama Pengirim
  const senderDisplayName = msg.senderName || (isUser ? 'Kamu' : 'AI');

  return (
    <div id={`group-message-${msgIndex}`} className={cn("flex flex-col group w-full relative transform-gpu mt-2 mb-3", isUser ? "items-end" : "items-start", showUserMenu ? "z-[100]" : "z-10")}>
      
      {/* ── NAMA PENGIRIM & WAKTU (DESAIN KHUSUS GRUP) ── */}
      <div className={cn("flex items-end gap-2 mb-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
        {/* Avatar Bulat Kecil (Opsional, Kalau Mau Ditambahin Avatar AI/User) */}
        {!isUser && (
           <div className="w-6 h-6 rounded-full bg-[var(--ac)] text-[var(--at)] flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm border border-[var(--bd)]/20">
             {senderDisplayName[0]}
           </div>
        )}
        <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
          <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider leading-none mb-1">
            {senderDisplayName}
          </span>
          <span className="text-[9px] font-mono text-[var(--mu)] tracking-wider leading-none">
            {msg.timestamp?.split(' ')[1] || msg.timestamp}
          </span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] mb-0.5" />}
      </div>

      {/* ── BUBBLE KONTEN (Diperhalus warnanya untuk grup) ── */}
      {msg.content && (
        <div className={cn(
          "msg-bubble rounded-[20px] transform-gpu relative z-10 p-[14px]", 
          isUser
            ? "bg-[var(--text)] text-[var(--bg)] rounded-tr-[4px] max-w-[85%] shadow-md ml-auto" // User: Hitam Putih Elegan
            : "bg-[var(--sf)] border border-[var(--bd)]/40 text-[var(--text)] rounded-tl-[4px] max-w-[90%] shadow-sm mr-auto" // AI: Abu-abu Soft
        )}>
          {isUser ? (
            <>
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={(_e, info) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}>
                <CollapsibleUserBubble content={msg.content} onClick={openUserMenu} />
              </motion.div>
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+8px)] right-0 z-[99999] w-[160px] bg-[var(--bg)] backdrop-blur-xl border border-[var(--bd)] rounded-[16px] shadow-xl flex flex-col p-1.5">
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
                
                {/* --- CSS MARKDOWN KHUSUS GRUP (Lebih Rapi & Kecil) --- */}
                <style>{`
                  .cylen-md { font-size: var(--chat-text-size, 14px); line-height: 1.6; color: var(--text); }
                  .cylen-md p { margin-bottom: 0.6rem; }
                  .cylen-md ul, .cylen-md ol { padding-left: 1.2rem; margin-bottom: 0.6rem; }
                  .cylen-md li { margin-bottom: 0.2rem; }
                  .cylen-md code:not(pre code) { background: var(--bg); padding: 0.1em 0.3em; border-radius: 4px; font-size: 0.85em; border: 1px solid var(--bd); }
                  .cylen-md strong { font-weight: 700; color: var(--text); }
                `}</style>

                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-([\w-]+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      const raw = String(children).replace(/\n$/, '');
                      if (inline) return <code className={className} {...props}>{children}</code>;
                      return <CodeBlock lang={lang || 'text'} content={raw} />;
                    },
                  }}
                >
                  {msg.content}
                </Markdown>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── TOOLBAR BAWAH AI (Kecil & Minimalis untuk Grup) ── */}
      {!isUser && (
        <div className="flex items-center gap-4 mt-2 px-1 relative">
          <button onClick={handleCopy} className={cn("transition-colors", copied ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>
          <button className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><Share2 size={14} /></button>
          <button onClick={() => setLiked(l => l === 'up' ? null : 'up')} className={cn("transition-colors", liked === 'up' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsUp size={14} /></button>
          <button onClick={() => setLiked(l => l === 'down' ? null : 'down')} className={cn("transition-colors", liked === 'down' ? "text-black" : "text-[var(--mu)] hover:text-[var(--text)]")}><ThumbsDown size={14} /></button>
          <button onClick={() => onRegenerate?.(msgIndex)} className="text-[var(--mu)] hover:text-[var(--text)] transition-colors"><RotateCcw size={14} /></button>
        </div>
      )}
    </div>
  );
};

export const GroupChatBubble = memo(GroupChatBubbleComponent, (prev, next) => {
  return prev.msg.content === next.msg.content && prev.msg.pinned === next.msg.pinned && prev.isLast === next.isLast;
});
