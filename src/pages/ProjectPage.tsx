import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, FileText, Image as ImageIcon, Code, Table as TableIcon,
  Presentation, BookOpen, Download, Copy, Check, MessageSquare, Folder,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatSession } from '../types';

// ─────────────────────────────────────────────────────────────
// PROJECT = hasil karya berat AI yang tersimpan OTOMATIS.
// Tidak ada penyimpanan baru: semua item DIAMBIL dari riwayat chat
// (file PDF/Word/Excel/PPT/Ebook, gambar hasil generate, dan blok
// kode panjang). Jadi setiap chat lama pun langsung masuk, dan
// useChat.ts / ChatPage.tsx tidak perlu diubah sama sekali.
// ─────────────────────────────────────────────────────────────

type Kind = 'PDF' | 'DOCS' | 'EXCEL' | 'PPT' | 'EBOOK' | 'IMAGE' | 'CODE';
type Filter = 'all' | 'doc' | 'image' | 'code';

interface ProjectItem {
  id: string;
  kind: Kind;
  title: string;
  chatId: string;
  chatTitle: string;
  time?: string;
  dataUrl?: string; // file / gambar
  code?: string;    // kode
}

interface ProjectPageProps {
  chatSessions: ChatSession[];
  onOpenChat: (chatId: string) => void;
  onBack: () => void;
}

const FILE_RE = /\[(PDF|DOCS|EXCEL|PPT|EBOOK)_FILE:\s*"([^"]+)"\]\((data:[^)]+)\)/g;
const CODE_RE = /```([\w+#-]*)\n([\s\S]*?)```/g;
const MIN_CODE_LINES = 15; // blok kode di bawah ini dianggap potongan kecil, bukan project
const SKIP_LANGS = ['suggestions', 'json-canvas'];

const KIND_LABEL: Record<Kind, string> = {
  PDF: 'PDF', DOCS: 'Word', EXCEL: 'Excel', PPT: 'PowerPoint',
  EBOOK: 'Ebook', IMAGE: 'Gambar', CODE: 'Kode',
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'doc', label: 'Dokumen' },
  { id: 'image', label: 'Gambar' },
  { id: 'code', label: 'Kode' },
];

const sessionTitle = (s: any): string => {
  if (s.title && !['New Chat', 'Chat Baru', 'New Conversation'].includes(s.title)) return s.title;
  const first = s.messages?.find((m: any) => m.role === 'user')?.content;
  return first ? first.split(' ').slice(0, 4).join(' ') : 'Chat Baru';
};

const extractProjects = (sessions: ChatSession[]): ProjectItem[] => {
  const items: ProjectItem[] = [];

  for (const s of sessions) {
    if ((s as any).isTemporary) continue; // Private Chat tidak masuk Project
    const chatTitle = sessionTitle(s);
    const msgs: any[] = s.messages || [];

    // dari pesan terbaru ke terlama, supaya karya terbaru ada di atas
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role !== 'assistant' || m.isConnectionError) continue;
      const content: string = m.content || '';
      const base = `${s.id}-${i}`;
      const common = { chatId: s.id, chatTitle, time: m.timestamp as string | undefined };

      let n = 0;
      for (const f of content.matchAll(FILE_RE)) {
        items.push({ id: `${base}-f${n++}`, kind: f[1] as Kind, title: f[2], dataUrl: f[3], ...common });
      }

      // hanya gambar hasil generate (data:), bukan thumbnail berita (http)
      if (typeof m.image === 'string' && m.image.startsWith('data:image')) {
        let title = 'Gambar';
        for (let j = i - 1; j >= 0; j--) {
          if (msgs[j].role === 'user' && msgs[j].content?.trim()) {
            const t: string = msgs[j].content.trim().replace(/\s+/g, ' ');
            title = t.length > 40 ? t.slice(0, 40) + '...' : t;
            break;
          }
        }
        items.push({ id: `${base}-img`, kind: 'IMAGE', title, dataUrl: m.image, ...common });
      }

      let c = 0;
      for (const b of content.matchAll(CODE_RE)) {
        const lang = (b[1] || '').toLowerCase();
        if (SKIP_LANGS.includes(lang)) continue;
        const code = b[2].replace(/\n$/, '');
        const lines = code.split('\n').length;
        if (lines < MIN_CODE_LINES) continue;
        items.push({
          id: `${base}-c${c++}`, kind: 'CODE',
          title: `${lang || 'kode'}, ${lines} baris`,
          code, ...common,
        });
      }
    }
  }
  return items;
};

const KindIcon: React.FC<{ kind: Kind }> = ({ kind }) => {
  const p = { size: 20, strokeWidth: 2 };
  switch (kind) {
    case 'EXCEL': return <TableIcon {...p} />;
    case 'PPT': return <Presentation {...p} />;
    case 'EBOOK': return <BookOpen {...p} />;
    case 'IMAGE': return <ImageIcon {...p} />;
    case 'CODE': return <Code {...p} />;
    default: return <FileText {...p} />;
  }
};

const imageExt = (dataUrl: string) => {
  const m = dataUrl.match(/^data:image\/(\w+)/);
  return m ? (m[1] === 'jpeg' ? 'jpg' : m[1]) : 'png';
};

export const ProjectPage: React.FC<ProjectPageProps> = ({ chatSessions, onOpenChat, onBack }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const all = useMemo(() => extractProjects(chatSessions), [chatSessions]);

  const shown = all.filter(it => {
    if (filter === 'all') return true;
    if (filter === 'image') return it.kind === 'IMAGE';
    if (filter === 'code') return it.kind === 'CODE';
    return it.kind !== 'IMAGE' && it.kind !== 'CODE';
  });

  const handleCopy = async (it: ProjectItem) => {
    try {
      await navigator.clipboard.writeText(it.code || '');
      setCopiedId(it.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* abaikan */ }
  };

  const actionBtn = "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--text)]/5 hover:bg-[var(--text)]/10 text-[13px] font-semibold text-[var(--text)] transition-all active:scale-95";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="px-4 pt-5 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[var(--text)]/5 flex items-center justify-center text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-90 transition-all"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className="text-[20px] font-bold tracking-tight text-[var(--text)]">Project</h1>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95",
              filter === f.id
                ? "bg-[var(--ac)] text-[var(--at)]"
                : "bg-[var(--text)]/5 text-[var(--text)]/70 hover:bg-[var(--text)]/10"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-3 min-h-0" style={{ scrollbarWidth: 'none' }}>
        {shown.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 pb-24">
            <div className="w-14 h-14 rounded-2xl bg-[var(--text)]/5 flex items-center justify-center text-[var(--text)]/50">
              <Folder size={26} />
            </div>
            <p className="text-[16px] font-bold text-[var(--text)]">Belum ada project</p>
            <p className="text-[14px] text-[var(--text)]/60 leading-relaxed max-w-[280px]">
              Minta AI bikin dokumen, gambar, atau kode panjang. Hasilnya otomatis tersimpan di sini.
            </p>
          </div>
        ) : (
          shown.map(it => (
            <div key={it.id} className="rounded-2xl bg-[var(--text)]/5 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {it.kind === 'IMAGE' && it.dataUrl ? (
                  <img src={it.dataUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[var(--text)]/10 flex items-center justify-center flex-shrink-0 text-[var(--text)]">
                    <KindIcon kind={it.kind} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--text)] truncate">{it.title}</p>
                  <p className="text-[12px] text-[var(--text)]/60 truncate">{KIND_LABEL[it.kind]} dari chat {it.chatTitle}</p>
                  {it.time && <p className="text-[11px] text-[var(--text)]/40 mt-0.5">{it.time}</p>}
                </div>
              </div>

              {it.kind === 'CODE' && (
                <pre className="text-[11.5px] leading-relaxed text-[var(--text)]/80 bg-[var(--bg)] rounded-xl p-3 max-h-32 overflow-hidden whitespace-pre-wrap break-all">
                  {(it.code || '').split('\n').slice(0, 6).join('\n')}
                </pre>
              )}

              <div className="flex gap-2 flex-wrap">
                {it.kind === 'CODE' ? (
                  <button onClick={() => handleCopy(it)} className={actionBtn}>
                    {copiedId === it.id ? <Check size={15} /> : <Copy size={15} />}
                    {copiedId === it.id ? 'Tersalin' : 'Salin kode'}
                  </button>
                ) : (
                  <a
                    href={it.dataUrl}
                    download={it.kind === 'IMAGE' ? `cylen-gambar.${imageExt(it.dataUrl || '')}` : it.title}
                    className={actionBtn}
                  >
                    <Download size={15} /> Unduh
                  </a>
                )}
                <button onClick={() => onOpenChat(it.chatId)} className={actionBtn}>
                  <MessageSquare size={15} /> Buka chat
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
