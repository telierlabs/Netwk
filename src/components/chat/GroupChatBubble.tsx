import React, { useState, memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  Copy, Check, Pin, ChevronDown, ChevronUp,
  FileText, Download, Sparkles
} from 'lucide-react';
import { AnimatePresence, motion, PanInfo } from 'motion/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import { auth } from '../../lib/firebase';
// ── Komponen yang SAMA dengan chat pribadi, biar tampilan & perilakunya persis sama ──
import { UserBubble } from './components/ui/UserBubble';
import { ActionBar } from './components/ui/ActionBar';

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
            copied ? "bg-[var(--text)] text-[var(--bg)] border border-[var(--text)]" : "bg-[var(--bg)] border border-[var(--bd)] text-[var(--mu)] hover:text-[var(--text)]")}>
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

// Bubble teks teman (kiri). Pesan KITA sendiri pakai UserBubble dari chat pribadi.
const FriendBubbleContent = memo(({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  let replyText: string | null = null;
  let actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;

  return (
    <div className="w-full relative flex flex-col transform-gpu">
      {replyText && (
        <div className="mx-2 mt-2 mb-1 bg-[var(--bg)]/40 border-l-[3px] border-[var(--ac)] p-2.5 rounded-r-[10px] rounded-bl-[10px]">
          <span className="text-[11px] font-black text-[var(--ac)] block mb-0.5 uppercase">Membalas</span>
          <span className="text-[12.5px] text-[var(--text)]/80 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}
      <div className={cn("px-4 pb-3", replyText ? "pt-1" : "pt-3")}>
        <span className="text-[15px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
          {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong ? '...' : '')}
        </span>
      </div>
      {isLong && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
          {expanded ? <><ChevronUp size={14} strokeWidth={2.5} /> Ciutkan</> : <><ChevronDown size={14} strokeWidth={2.5} /> Selengkapnya</>}
        </button>
      )}
    </div>
  );
});

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
  msg, msgIndex, isSending, onResend, onEdit,
  onTogglePin, onSaveItem, onRegenerate, onSwipeToReply,
}) => {
  // dipakai UserBubble (menu Ulangi / Edit / Salin) — sama seperti chat pribadi
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDragEnd = (_e: any, info: PanInfo) => { if (info.offset.x > 55) onSwipeToReply?.(msg); };

  // Bubble kanan/kiri berdasarkan ID pengirim
  const isMine = msg.senderId === auth.currentUser?.uid;
  const isAI = msg.role === 'assistant';
  const isOtherUser = !isMine && !isAI; // pesan teman
  const senderName = msg.senderName || (isMine ? 'Kamu' : 'AI');

  let contentToRender = msg.content;
  let hasPpt = false;
  let isPptGenerating = false;
  let pptData = null;
  let postPptContent = '';

  const pptStartTag = '[CYLEN_PPT_START]';
  const pptEndTag = '[CYLEN_PPT_END]';

  if (isAI && contentToRender.includes(pptStartTag)) {
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
      contentToRender = contentToRender.slice(0, startIndex).trim(); 
    } else {
      isPptGenerating = true;
      contentToRender = contentToRender.slice(0, startIndex).trim(); 
    }
  }

  return (
    <div
      id={`group-message-${msgIndex}`}
      className={cn(
        "flex flex-col group w-full relative transform-gpu mt-2 mb-3",
        isMine ? "items-end" : "items-start",
        isMenuOpen ? "z-[100]" : "z-10"
      )}
    >
      {/* Nama pengirim + waktu */}
      <div className={cn("flex items-end gap-2 mb-1.5", isMine ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
          <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider leading-none mb-1">
            {senderName}
          </span>
          <span className="text-[9px] font-mono text-[var(--mu)] tracking-wider leading-none">
            {formatFullTimestamp(msg.timestamp)}
          </span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] mb-0.5" />}
      </div>

      {isMine ? (
        // ── Pesan KITA: komponen yang sama dengan chat pribadi (popup Ulangi/Edit/Salin ikut jalan) ──
        <UserBubble
          msg={msg}
          displayContent={msg.content}
          onResend={onResend}
          onEdit={onEdit}
          onSwipeToReply={onSwipeToReply}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      ) : (
        <AnimatePresence>
          {(msg.content || !isAI) && (
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
                  isOtherUser
                    ? "border border-[var(--bd)] text-[var(--text)] max-w-[85%] shadow-sm bg-transparent rounded-tl-[6px] mr-auto"
                    : "bg-transparent text-[var(--text)] px-0 w-full"
                )}
              >
                {isOtherUser ? (
                  <FriendBubbleContent content={msg.content} />
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

                    {hasPpt && <PPTCard data={pptData} isGenerating={isPptGenerating} />}

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
      )}

      {/* Ikon aksi pesan AI: ActionBar yang SAMA dengan chat pribadi (ukuran & gaya persis sama) */}
      {isAI && msg.content && !isSending && (
        <ActionBar
          content={msg.content}
          msgIndex={msgIndex}
          isPinned={!!msg.pinned}
          onTogglePin={onTogglePin}
          onRegenerate={onRegenerate}
          // kalau grup belum punya fitur simpan, jangan kasih handler (biar nggak muncul centang "tersimpan" palsu)
          onSaveItem={onSaveItem ? (text: string) => onSaveItem(text) : undefined}
          visible={true}
        />
      )}
    </div>
  );
};

// senderName ikut dicek, biar nama baru dari profil publik bikin bubble digambar ulang
export const GroupChatBubble = memo(GroupChatBubbleComponent, (prev, next) => {
  return (
    prev.msg.content    === next.msg.content    &&
    prev.msg.pinned     === next.msg.pinned     &&
    prev.msg.senderName === next.msg.senderName &&
    prev.isLast         === next.isLast         &&
    prev.isSending      === next.isSending
  );
});
