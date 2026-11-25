import React, { useState, memo, useRef } from 'react';
import { Pin, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { AnimatePresence, motion, PanInfo } from 'motion/react';
import { cn } from '../../lib/utils';
import { Message } from '../../types';
import { auth } from '../../lib/firebase';
import { useT, usePageText } from '../../lib/i18n';
import { BUBBLE_NS, BUBBLE_TEXT } from '../../lib/bubbleText';
import { formatFullDate } from '../../lib/dateFmt';
// ── Komponen yang SAMA dengan chat pribadi, biar tampilan & perilakunya persis sama ──
import { UserBubble } from './components/ui/UserBubble';
import { PastedList } from './components/ui/PastedCard';
import { splitPasted } from '../../lib/pasted';
import { ActionBar } from './components/ui/ActionBar';
import { SmartImageGallery } from './components/media/SmartImageGallery';
import { openGroupFile } from '../../lib/groupFiles';
// ── Renderer yang SAMA dengan chat pribadi: foto, tabel, grafik, diagram, pil sumber per paragraf ──
import { MarkdownRenderer, splitIntoParagraphs } from './components/renderers/MarkdownRenderer';
import { CodeStreamCtx } from './components/renderers/CodeCard';
import { CitationProvider } from './components/search/citations';
import { SourcesButton } from './components/search/SourcesSheet';
import { ThoughtRow } from './components/search/FlowSheet';
import { ChatChart } from './components/media/ChatChart';
import { MediaProvider } from './components/media/MediaBlocks';
import { ScheduleCard } from './components/ui/ScheduleCard';
import { DocCards } from './components/docs/DocViews';
import { extractDocsFromText, legacyPptToSource } from '../../lib/docModel';

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

// Warna bubble teman = abu yang SAMA dengan bubble kita (UserBubble)
const FRIEND_BG = 'color-mix(in srgb, var(--text, #141414) 7%, var(--bg, #ffffff))';

const formatFullTimestamp = (ts?: string, lang: string = 'id'): string => {
  const DAYS   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let date: Date;
  try { date = ts ? new Date(ts) : new Date(); if (isNaN(date.getTime())) date = new Date(); }
  catch { date = new Date(); }
  const jam = String(date.getHours()).padStart(2, '0');
  const mnt = String(date.getMinutes()).padStart(2, '0');
  if (lang !== 'id') return formatFullDate(date, lang);
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${jam}:${mnt}`;
};

// Foto + dokumen yang dilampirkan di pesan (pengirim mana pun)
const GroupAttachments = memo(({ msg, mine, docLabel }: { msg: Message; mine: boolean; docLabel: string }) => {
  const imgs = ((msg as any).images || []) as string[];
  const pdfs = ((msg as any).pdfs || []) as { name?: string; fid?: string; n?: number; gid?: string }[];
  const [busy, setBusy] = useState<number | null>(null);
  const openPdf = async (p: any, i: number) => {
    if (!p?.fid || busy !== null) return;
    setBusy(i);
    try { await openGroupFile(p); } catch (e) { console.error('Gagal buka dokumen', e); }
    finally { setBusy(null); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      {imgs.length > 0 && <SmartImageGallery images={imgs} isUser={mine} />}
      {pdfs.map((p, i) => (
        <div key={i} onClick={() => openPdf(p, i)} style={{ cursor: p.fid ? 'pointer' : 'default', opacity: busy === i ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, maxWidth: '85%' }}>
          <FileText size={17} color="var(--mu,#909090)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.name || docLabel}</span>
        </div>
      ))}
    </div>
  );
});

// Teks AI yang sedang diketik: paragraf yang sudah selesai TIDAK di-parse ulang (ringan, tidak patah-patah),
// dan tanpa kursor "|".
const SettledPart = memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (a, b) => a.content === b.content,
);
const GroupStreamBody = memo(({ content }: { content: string }) => {
  const parts = splitIntoParagraphs(content); // blok kode tidak terpotong
  if (parts.length <= 1) return <CodeStreamCtx.Provider value={true}><MarkdownRenderer content={content} /></CodeStreamCtx.Provider>;
  return (
    <CodeStreamCtx.Provider value={true}>
      <SettledPart content={parts.slice(0, -1).join('\n\n')} />
      <MarkdownRenderer content={parts[parts.length - 1]} />
    </CodeStreamCtx.Provider>
  );
});

// Bubble teks teman (kiri). Pesan KITA sendiri pakai UserBubble dari chat pribadi.
const FriendBubbleContent = memo(({ content }: { content: string }) => {
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  const [expanded, setExpanded] = useState(false);
  let replyText: string | null = null;
  let actualContent = content;
  const replyMatch = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (replyMatch) { replyText = replyMatch[1]; actualContent = replyMatch[2]; }
  // Konten panjang yang ditempel teman → kartu "Konten yang ditempel"
  const pasted = splitPasted(actualContent);
  if (pasted.blocks.length > 0) actualContent = pasted.text;
  const isLong = actualContent.length > COLLAPSE_THRESHOLD;

  return (
    <div className="w-full relative flex flex-col transform-gpu">
      {replyText && (
        <div className="mx-2 mt-2 mb-1 bg-[var(--bg)]/40 border-l-[3px] border-[var(--ac)] p-2.5 rounded-r-[10px] rounded-bl-[10px]">
          <span className="text-[11px] font-black text-[var(--ac)] block mb-0.5 uppercase">{bx.replying}</span>
          <span className="text-[12.5px] text-[var(--text)]/80 line-clamp-2 leading-snug">{replyText}</span>
        </div>
      )}
      {pasted.blocks.length > 0 && (
        <div className={cn("px-3 pb-1", replyText ? "pt-1" : "pt-3")}>
          <PastedList blocks={pasted.blocks} align="start" />
        </div>
      )}
      {(actualContent.trim() || pasted.blocks.length === 0) && (
        <div className={cn("px-4 pb-3", replyText || pasted.blocks.length > 0 ? "pt-1" : "pt-3")}>
          <span className="text-[15px] leading-relaxed" style={{ wordBreak: 'break-word' }}>
            {expanded ? actualContent : actualContent.slice(0, COLLAPSE_THRESHOLD) + (isLong ? '...' : '')}
          </span>
        </div>
      )}
      {isLong && (
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 px-4 pb-2 text-[12px] font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text)' }}>
          {expanded ? <><ChevronUp size={14} strokeWidth={2.5} /> {bx.collapse}</> : <><ChevronDown size={14} strokeWidth={2.5} /> {bx.readMore}</>}
        </button>
      )}
    </div>
  );
});

const GroupChatBubbleComponent: React.FC<GroupChatBubbleProps> = ({
  msg, msgIndex, isLast, isSending, onResend, onEdit,
  onTogglePin, onSaveItem, onRegenerate, onSwipeToReply,
}) => {
  const { lang } = useT();
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  // dipakai UserBubble (menu Ulangi / Edit / Salin) — sama seperti chat pribadi
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sawEmptyRef = useRef(false); // jawaban yang tadinya kosong lalu muncul → blok-bloknya muncul halus bergantian

  const handleDragEnd = (_e: any, info: PanInfo) => { if (info.offset.x > 55) onSwipeToReply?.(msg); };

  // Bubble kanan/kiri berdasarkan ID pengirim
  const isMine = msg.senderId === auth.currentUser?.uid;
  const isAI = msg.role === 'assistant';
  const isOtherUser = !isMine && !isAI; // pesan teman
  const senderName = msg.senderName || (isMine ? bx.you : 'AI');
  // AI yang sedang mengetik jawabannya (bukan pesan lama)
  const isStreamingNow = isAI && !!isLast && !!isSending;
  const scheduleCard = isAI ? (msg as any).scheduleCard : null;
  const hasAtt = !isAI && (((msg as any).images?.length || 0) > 0 || ((msg as any).pdfs?.length || 0) > 0);
  const textEmpty = !(msg.content || '').trim();
  const att = hasAtt ? <GroupAttachments msg={msg} mine={isMine} docLabel={bx.docAttached} /> : null;

  // ── Dokumen buatan AI: kalimat pembuka → kartu (loading → selesai → popup) → kalimat penutup ──
  let contentToRender = (msg.content || '').replace(/\[GENERATE_[^\]]*$/, ''); // tag yang baru setengah diketik
  let docCards: { kind: any; name: string; source: string; live: boolean }[] = [];
  let postPptContent = '';

  if (isAI) {
    const ex = extractDocsFromText(contentToRender);
    if (ex) {
      docCards = ex.docs.map(d => ({ kind: d.kind, name: d.name, source: d.source, live: !d.complete }));
      contentToRender = ex.before;
      postPptContent = ex.after;
    } else if (contentToRender.includes('[CYLEN_PPT_START]')) {
      // pesan lama (format JSON lama) → tetap tampil sebagai kartu dokumen
      const st = contentToRender.indexOf('[CYLEN_PPT_START]');
      const en = contentToRender.indexOf('[CYLEN_PPT_END]');
      let data: any = null;
      if (en !== -1) { try { data = JSON.parse(contentToRender.slice(st + 16, en).trim()); } catch { data = null; } }
      docCards = [{ kind: 'PPT', name: data?.title || bx.presentation, source: data ? legacyPptToSource(data) : '', live: en === -1 }];
      postPptContent = en !== -1 ? contentToRender.slice(en + 15).trim() : '';
      contentToRender = contentToRender.slice(0, st).trim();
    }
  }

  // AI masih menyiapkan jawaban (belum ada teks) → jangan tampilkan nama + jam dulu; loading tampil sendiri seperti di chat pribadi
  if (isAI && !(msg.content || '').trim()) sawEmptyRef.current = true;
  const reveal = isAI && sawEmptyRef.current && !!(msg as any).flow && !isStreamingNow;
  if (isAI && isLast && isSending && !(msg.content || '').trim()) return null;

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
        {isOtherUser && (
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center text-[13px] font-bold text-[var(--text)]">
            {(msg as any).senderAvatar
              ? <img src={(msg as any).senderAvatar} alt={senderName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              : <span>{(senderName || '?').trim().charAt(0).toUpperCase()}</span>}
          </div>
        )}
        <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
          <span className="text-[11px] font-bold text-[var(--text)] uppercase tracking-wider leading-none mb-1">
            {senderName}
          </span>
          <span className="text-[9px] font-mono text-[var(--mu)] tracking-wider leading-none">
            {formatFullTimestamp(msg.timestamp, lang)}
          </span>
        </div>
        {msg.pinned && <Pin size={11} className="text-[var(--ac)] mb-0.5" />}
      </div>

      {isMine ? (
        // ── Pesan KITA: komponen yang sama dengan chat pribadi (popup Ulangi/Edit/Salin ikut jalan) ──
        (() => {
          // Konten panjang yang ditempel → kartu "Konten yang ditempel" di atas teks ketikan
          const sp = splitPasted(msg.content || '');
          if (sp.blocks.length === 0) {
            if (att && textEmpty) return <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>{att}</div>;
            return (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {att}
              <UserBubble
                msg={msg}
                displayContent={msg.content}
                onResend={onResend}
                onEdit={onEdit}
                onSwipeToReply={onSwipeToReply}
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
              />
              </div>
            );
          }
          return (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {att}
              <PastedList blocks={sp.blocks} />
              {sp.text.replace(/^\[Membalas pesan:[\s\S]*?\]\n\n/, '').trim() && (
                <UserBubble
                  msg={msg}
                  displayContent={sp.text}
                  onResend={onResend ? ((_c: string, ...rest: any[]) => (onResend as any)(msg.content, ...rest)) as any : undefined}
                  onEdit={onEdit ? ((() => onEdit(msg.content)) as any) : undefined}
                  onSwipeToReply={onSwipeToReply}
                  isMenuOpen={isMenuOpen}
                  setIsMenuOpen={setIsMenuOpen}
                />
              )}
            </div>
          );
        })()
      ) : (
        <>
        {att && isOtherUser && <div style={{ maxWidth: '85%', alignSelf: 'flex-start' }}>{att}</div>}
        <AnimatePresence>
          {(msg.content || (!isAI && !att)) && (
            <motion.div
              key="bubble"
              initial={{ opacity: 0, y: (msg as any).flow ? 6 : 5 }}
              animate={{ opacity: 1, y: 0 }}
              // jawaban pencarian (punya flow): fade yang sama dengan chat pribadi, supaya teks + pil sumber + foto muncul bersamaan
              transition={{ duration: (msg as any).flow ? 0.35 : 0.18, ease: 'easeOut' }}
              className="w-full flex"
            >
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={isOtherUser ? { background: FRIEND_BG, borderRadius: '4px 18px 18px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } : undefined}
                className={cn(
                  "msg-bubble rounded-[22px] transform-gpu relative z-10",
                  isOtherUser
                    ? "text-[var(--text)] max-w-[85%] mr-auto"
                    : "bg-transparent text-[var(--text)] px-0 w-full"
                )}
              >
                {isOtherUser ? (
                  <FriendBubbleContent content={msg.content} />
                ) : (
                  <div className={reveal ? 'w-full cy-reveal' : 'w-full'} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                    {!scheduleCard && (contentToRender || docCards.length > 0) && (msg as any).flow && <ThoughtRow flow={(msg as any).flow} sources={msg.sources as any} content={contentToRender} />}
                    {contentToRender && (
                      <CitationProvider sources={msg.sources as any} citations={msg.citations} text={contentToRender}>
                        <MediaProvider media={(msg as any).media} text={contentToRender}>
                          {isStreamingNow
                            ? <GroupStreamBody content={contentToRender} />
                            : <MarkdownRenderer content={contentToRender} />}
                        </MediaProvider>
                      </CitationProvider>
                    )}

                    {/* Pil jadwal: tampil di bawah jawaban AI ("Oke, noted! ...") */}
                    {scheduleCard && <div style={{ marginTop: 10 }}><ScheduleCard card={scheduleCard} /></div>}

                    <DocCards docs={docCards} />

                    {postPptContent && <MarkdownRenderer content={postPptContent} />}

                    {/* Grafik (dari blok ```chart) — tampil setelah teks selesai */}
                    {/* (pesan baru memasang grafik inline lewat msg.media; ini untuk pesan lama / dokumen) */}
                    {!isStreamingNow && Array.isArray(msg.charts) && msg.charts.map((c, i) => (
                      <ChatChart key={i} spec={c} />
                    ))}

                    {/* Tombol sumber — hanya jawaban AI yang punya sumber pencarian */}
                    {!isStreamingNow && msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <SourcesButton sources={msg.sources as any} />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
      )}

      {/* Ikon aksi pesan AI: ActionBar yang SAMA dengan chat pribadi (ukuran & gaya persis sama) */}
      {isAI && msg.content && !isSending && !scheduleCard && !(msg as any).notice && (
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
    (prev.msg as any).senderAvatar === (next.msg as any).senderAvatar &&
    (prev.msg as any).images === (next.msg as any).images &&
    (prev.msg as any).pdfs === (next.msg as any).pdfs &&
    prev.msg.sources    === next.msg.sources    &&
    prev.msg.citations  === next.msg.citations  &&
    prev.msg.charts     === next.msg.charts     &&
    (prev.msg as any).media === (next.msg as any).media &&
    (prev.msg as any).flow === (next.msg as any).flow &&
    (prev.msg as any).scheduleCard === (next.msg as any).scheduleCard &&
    prev.isLast         === next.isLast         &&
    prev.isSending      === next.isSending
  );
});
