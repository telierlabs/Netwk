import React, { useMemo } from 'react';
import { ChevronLeft, MessageSquare, Folder, FolderMinus } from 'lucide-react';
import { ChatSession } from '../types';

// ─────────────────────────────────────────────────────────────
// PROJECT = kumpulan chat yang DIPILIH sendiri oleh user.
// Cara masuk: di sidebar, klik titik tiga (⋯) di sebuah riwayat chat
// → "Move to Project". Cara keluar: tombol "Keluarkan" di halaman ini,
// atau titik tiga → "Keluarkan dari Project".
//
// Tidak ada lagi pengambilan otomatis kode / gambar / dokumen dari chat.
// Status disimpan di dokumen chat (field isProject) lewat useChat,
// jadi ikut tersinkron ke semua perangkat.
// ─────────────────────────────────────────────────────────────

interface ProjectPageProps {
  chatSessions: ChatSession[];
  onOpenChat: (chatId: string) => void;
  onRemoveFromProject: (chatId: string) => void;
  onBack: () => void;
}

interface ProjectChat {
  id: string;
  title: string;
  preview: string;
  date: string;
  count: number;
}

const sessionTitle = (s: any): string => {
  if (s.title && !['New Chat', 'Chat Baru', 'New Conversation'].includes(s.title)) return s.title;
  const first = s.messages?.find((m: any) => m.role === 'user')?.content;
  return first ? first.split(' ').slice(0, 4).join(' ') : 'Chat Baru';
};

// Pratinjau dari balasan terakhir. File hasil generate (data URL panjang) dan blok kode dibersihkan dulu
// supaya yang tampil teks yang enak dibaca, bukan potongan base64.
const makePreview = (raw: unknown): string => {
  if (typeof raw !== 'string' || !raw) return '';
  return raw
    .replace(/\[(?:PDF|DOCS|EXCEL|PPT|EBOOK)_FILE:\s*"([^"]+)"\]\(data:[^)]*\)/g, 'File: $1')
    .replace(/```[\s\S]*?```/g, ' [kode] ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
};

const buildProjectChats = (sessions: ChatSession[]): ProjectChat[] => {
  const out: ProjectChat[] = [];
  for (const s of sessions) {
    const a: any = s;
    if (!a.isProject || a.isTemporary) continue; // Private Chat tidak ikut tersimpan, jadi tidak masuk Project
    const msgs: any[] = a.messages || [];
    out.push({
      id: a.id,
      title: sessionTitle(a),
      preview: makePreview(msgs[msgs.length - 1]?.content),
      date: typeof a.date === 'string' ? a.date : '',
      count: msgs.length,
    });
  }
  return out;
};

export const ProjectPage: React.FC<ProjectPageProps> = ({ chatSessions, onOpenChat, onRemoveFromProject, onBack }) => {
  const chats = useMemo(() => buildProjectChats(chatSessions), [chatSessions]);

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
        <div className="flex flex-col">
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--text)] leading-tight">Project</h1>
          {chats.length > 0 && (
            <span className="text-[12px] text-[var(--text)]/50 font-medium">{chats.length} chat</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-1 flex flex-col gap-3 min-h-0" style={{ scrollbarWidth: 'none' }}>
        {chats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 pb-24">
            <div className="w-14 h-14 rounded-2xl bg-[var(--text)]/5 flex items-center justify-center text-[var(--text)]/50">
              <Folder size={26} />
            </div>
            <p className="text-[16px] font-bold text-[var(--text)]">Belum ada project</p>
            <p className="text-[14px] text-[var(--text)]/60 leading-relaxed max-w-[290px]">
              Di sidebar, klik titik tiga pada riwayat chat, lalu pilih Move to Project. Chat itu akan muncul di sini.
            </p>
          </div>
        ) : (
          chats.map(c => (
            <div key={c.id} className="rounded-2xl bg-[var(--text)]/5 p-4 flex flex-col gap-3">
              <button
                onClick={() => onOpenChat(c.id)}
                className="flex items-center gap-3 text-left active:opacity-70 transition-opacity"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--text)]/10 flex items-center justify-center flex-shrink-0 text-[var(--text)]">
                  <Folder size={20} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-[var(--text)] truncate">{c.title}</p>
                  {c.preview && <p className="text-[12.5px] text-[var(--text)]/60 truncate mt-0.5">{c.preview}</p>}
                  <p className="text-[11px] text-[var(--text)]/40 mt-1">
                    {c.count} pesan{c.date ? `, ${c.date}` : ''}
                  </p>
                </div>
              </button>

              <div className="flex gap-2 flex-wrap">
                <button onClick={() => onOpenChat(c.id)} className={actionBtn}>
                  <MessageSquare size={15} /> Buka chat
                </button>
                <button onClick={() => onRemoveFromProject(c.id)} className={actionBtn}>
                  <FolderMinus size={15} /> Keluarkan
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
