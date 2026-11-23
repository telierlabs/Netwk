import React, { useMemo, useState } from 'react';
import { ArrowLeft, X, Plus, Folder, FolderMinus, MessageSquare, SquarePen, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatSession } from '../types';
import type { Project } from '../hooks/useProjects';
import { usePageText } from '../lib/i18n';

const TEXT = {
  id: { newChat: 'Chat Baru', code: '[kode]', file: 'File:', close: 'Tutup', back: 'Kembali', editHead: 'Edit Project', newHead: 'Project Baru', save: 'Simpan', create: 'Buat', namePh: 'Nama project', instrLabel: 'Instruksi project (opsional)', instrPh: 'Tulis instruksi soal gaya, nada, dan peran yang kamu mau dari AI di semua chat dalam project ini.', editAria: 'Edit project', instrHead: 'Instruksi', newChatIn: 'Chat baru di project ini', chatsHead: 'Chat ({n})', noChats: 'Belum ada chat. Di sidebar, klik titik tiga pada riwayat chat, lalu pilih Move to Project.', msgs: '{n} pesan', openChat: 'Buka chat', remove: 'Keluarkan', delProject: 'Hapus project', delConfirm: 'Hapus project ini? Chat di dalamnya tetap ada di riwayat, hanya dikeluarkan dari project.', cancel: 'Batal', del: 'Hapus', listTitle: 'Project', newAria: 'Project baru', emptyTitle: 'Mulai dengan membuat project baru', emptyDesc: 'Project membantu kamu mengatur instruksi bersama untuk banyak percakapan.', newBtn: 'Project baru', chatCount: '{n} chat' },
  en: { newChat: 'New Chat', code: '[code]', file: 'File:', close: 'Close', back: 'Back', editHead: 'Edit Project', newHead: 'New Project', save: 'Save', create: 'Create', namePh: 'Project name', instrLabel: 'Project instructions (optional)', instrPh: 'Write instructions about the style, tone, and role you want from the AI in every chat in this project.', editAria: 'Edit project', instrHead: 'Instructions', newChatIn: 'New chat in this project', chatsHead: 'Chats ({n})', noChats: 'No chats yet. In the sidebar, tap the three dots on a chat in your history, then choose Move to Project.', msgs: '{n} messages', openChat: 'Open chat', remove: 'Remove', delProject: 'Delete project', delConfirm: 'Delete this project? Its chats stay in your history and are only removed from the project.', cancel: 'Cancel', del: 'Delete', listTitle: 'Projects', newAria: 'New project', emptyTitle: 'Start by creating a new project', emptyDesc: 'Projects help you organize shared instructions across many conversations.', newBtn: 'New project', chatCount: '{n} chats' },
};
type PjTx = typeof TEXT.id;
const fill = (t: string, n: number) => t.split('{n}').join(String(n));

// ─────────────────────────────────────────────────────────────
// PROJECT (gaya Grok, tanpa file): daftar project → buat project (nama + instruksi) → isi project.
// - Buat project di sini (tombol + atau "Project baru").
// - Masukkan chat ke project: sidebar → titik tiga di riwayat chat → Move to Project → pilih project.
// - Instruksi project otomatis dikirim ke AI di setiap chat yang ada di dalam project (diatur di useChat).
// Warna: latar = --bg, kartu/tombol = --sf, ditekan/hover = --ib, tombol utama = --ac/--at.
// ─────────────────────────────────────────────────────────────

interface ProjectPageProps {
  projects: Project[];
  chatSessions: ChatSession[];
  onCreateProject: (name: string, instructions: string) => unknown;
  onUpdateProject: (id: string, patch: { name: string; instructions: string }) => unknown;
  onDeleteProject: (id: string) => unknown;
  onOpenChat: (chatId: string) => void;
  onRemoveFromProject: (chatId: string) => void;
  onNewChatInProject: (projectId: string) => void;
  onBack: () => void;
}

interface ProjectChat {
  id: string;
  title: string;
  lastRaw: unknown;
  date: string;
  count: number;
}

type Screen =
  | { name: 'list' }
  | { name: 'form'; editId?: string }
  | { name: 'detail'; id: string };

const sessionTitle = (s: any, tx: PjTx): string => {
  if (s.title && !['New Chat', 'Chat Baru', 'New Conversation'].includes(s.title)) return s.title;
  const first = s.messages?.find((m: any) => m.role === 'user')?.content;
  return first ? first.split(' ').slice(0, 4).join(' ') : tx.newChat;
};

// Pratinjau dari balasan terakhir. File hasil generate (data URL panjang) dan blok kode dibersihkan dulu
// supaya yang tampil teks yang enak dibaca, bukan potongan base64.
const makePreview = (raw: unknown, tx: PjTx): string => {
  if (typeof raw !== 'string' || !raw) return '';
  return raw
    .replace(/\[(?:PDF|DOCS|EXCEL|PPT|EBOOK)_FILE:\s*"([^"]+)"\]\(data:[^)]*\)/g, tx.file + ' $1')
    .replace(/```[\s\S]*?```/g, ` ${tx.code} `)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
};

const IconBtn = "w-10 h-10 rounded-full flex items-center justify-center text-[var(--text)] hover:bg-[var(--ib)] active:scale-90 transition-all";
const ActionBtn = "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--ib)] hover:opacity-80 text-[13px] font-semibold text-[var(--text)] transition-all active:scale-95";

const TopBar: React.FC<{ left: React.ReactNode; title: string; right?: React.ReactNode }> = ({ left, title, right }) => (
  <div className="px-3 pt-5 pb-3 grid grid-cols-[40px_1fr_40px] items-center gap-2 flex-shrink-0">
    <div>{left}</div>
    <h1 className="text-[18px] font-bold tracking-tight text-[var(--text)] text-center truncate">{title}</h1>
    <div className="flex justify-end">{right}</div>
  </div>
);

// ── FORM BUAT / EDIT PROJECT ──
const ProjectForm: React.FC<{
  heading: string;
  submitLabel: string;
  initialName?: string;
  initialInstructions?: string;
  onClose: () => void;
  onSubmit: (name: string, instructions: string) => void;
}> = ({ heading, submitLabel, initialName = '', initialInstructions = '', onClose, onSubmit }) => {
  const tx = usePageText('project', TEXT);
  const [name, setName] = useState(initialName);
  const [instructions, setInstructions] = useState(initialInstructions);
  const canSubmit = name.trim().length > 0;
  const submit = () => { if (canSubmit) onSubmit(name.trim(), instructions.trim()); };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <div className="px-3 pt-5 pb-3 flex items-center gap-2 flex-shrink-0">
        <button onClick={onClose} aria-label={tx.close} className={IconBtn}>
          <X size={24} strokeWidth={2.2} />
        </button>
        <h1 className="flex-1 text-[20px] font-bold tracking-tight text-[var(--text)]">{heading}</h1>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={cn(
            "h-11 px-6 rounded-full text-[16px] font-semibold transition-all active:scale-95",
            canSubmit ? "bg-[var(--ac)] text-[var(--at)]" : "bg-[var(--sf)] text-[var(--mu)]"
          )}
        >
          {submitLabel}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10 min-h-0" style={{ scrollbarWidth: 'none' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--sf)] flex items-center justify-center flex-shrink-0 text-[var(--text)]">
            <Folder size={22} />
          </div>
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={tx.namePh}
            className="flex-1 min-w-0 h-14 rounded-2xl bg-[var(--sf)] border border-[var(--bd)] focus:border-[var(--mu)] px-4 text-[17px] text-[var(--text)] outline-none transition-colors placeholder:text-[var(--mu)]"
          />
        </div>

        <label className="block mt-7 mb-2 text-[15px] text-[var(--mu)]">{tx.instrLabel}</label>
        <textarea
          value={instructions}
          maxLength={2000}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={tx.instrPh}
          className="w-full min-h-[190px] rounded-2xl bg-[var(--sf)] border border-[var(--bd)] focus:border-[var(--mu)] px-4 py-3.5 text-[16px] leading-relaxed text-[var(--text)] outline-none resize-none transition-colors placeholder:text-[var(--mu)]"
        />
      </div>
    </div>
  );
};

export const ProjectPage: React.FC<ProjectPageProps> = ({
  projects, chatSessions, onCreateProject, onUpdateProject, onDeleteProject,
  onOpenChat, onRemoveFromProject, onNewChatInProject, onBack,
}) => {
  const tx = usePageText('project', TEXT);
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // chat per project (Private Chat tidak ikut, karena tidak disimpan ke server)
  const chatsByProject = useMemo(() => {
    const map: Record<string, ProjectChat[]> = {};
    for (const s of chatSessions) {
      const a: any = s;
      if (!a.projectId || a.isTemporary) continue;
      const msgs: any[] = a.messages || [];
      if (!map[a.projectId]) map[a.projectId] = [];
      map[a.projectId].push({
        id: a.id,
        title: sessionTitle(a, tx),
        lastRaw: msgs[msgs.length - 1]?.content,
        date: typeof a.date === 'string' ? a.date : '',
        count: msgs.length,
      });
    }
    return map;
  }, [chatSessions, tx]);

  // ─── FORM (baru / edit) ───
  if (screen.name === 'form') {
    const editing = screen.editId ? projects.find((p) => p.id === screen.editId) : undefined;
    const editId = screen.editId;
    return (
      <ProjectForm
        key={editId || 'new'}
        heading={editing ? tx.editHead : tx.newHead}
        submitLabel={editing ? tx.save : tx.create}
        initialName={editing?.name}
        initialInstructions={editing?.instructions}
        onClose={() => setScreen(editing ? { name: 'detail', id: editing.id } : { name: 'list' })}
        onSubmit={(name, instructions) => {
          if (editing) {
            onUpdateProject(editing.id, { name, instructions });
            setScreen({ name: 'detail', id: editing.id });
          } else {
            onCreateProject(name, instructions);
            setScreen({ name: 'list' });
          }
        }}
      />
    );
  }

  // ─── DETAIL PROJECT ───
  const detail = screen.name === 'detail' ? projects.find((p) => p.id === screen.id) : undefined;
  if (screen.name === 'detail' && detail) {
    const chats = chatsByProject[detail.id] || [];
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
        <TopBar
          left={<button onClick={() => { setConfirmDelete(false); setScreen({ name: 'list' }); }} aria-label={tx.back} className={IconBtn}><ArrowLeft size={24} strokeWidth={2.2} /></button>}
          title={detail.name}
          right={<button onClick={() => setScreen({ name: 'form', editId: detail.id })} aria-label={tx.editAria} className={IconBtn}><Pencil size={20} strokeWidth={2.2} /></button>}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-10 pt-1 flex flex-col gap-3 min-h-0" style={{ scrollbarWidth: 'none' }}>
          {detail.instructions && (
            <div className="rounded-2xl bg-[var(--sf)] p-4">
              <p className="text-[12px] font-semibold text-[var(--mu)] mb-1.5">{tx.instrHead}</p>
              <p className="text-[14px] leading-relaxed text-[var(--text)] whitespace-pre-wrap line-clamp-6">{detail.instructions}</p>
            </div>
          )}

          <button
            onClick={() => onNewChatInProject(detail.id)}
            className="flex items-center justify-center gap-2 h-12 rounded-full bg-[var(--ac)] text-[var(--at)] text-[15px] font-bold transition-transform active:scale-[0.97]"
          >
            <SquarePen size={18} strokeWidth={2.2} /> {tx.newChatIn}
          </button>

          <p className="text-[13px] font-semibold text-[var(--mu)] mt-2 px-1">{fill(tx.chatsHead, chats.length)}</p>

          {chats.length === 0 ? (
            <div className="rounded-2xl bg-[var(--sf)] px-4 py-6 text-center text-[14px] leading-relaxed text-[var(--mu)]">
              {tx.noChats}
            </div>
          ) : (
            chats.map((c) => {
              const preview = makePreview(c.lastRaw, tx);
              return (
                <div key={c.id} className="rounded-2xl bg-[var(--sf)] p-4 flex flex-col gap-3">
                  <button onClick={() => onOpenChat(c.id)} className="flex flex-col text-left active:opacity-70 transition-opacity">
                    <p className="text-[15px] font-bold text-[var(--text)] truncate">{c.title}</p>
                    {preview && <p className="text-[12.5px] text-[var(--mu)] truncate mt-0.5">{preview}</p>}
                    <p className="text-[11px] text-[var(--mu)] mt-1">{fill(tx.msgs, c.count)}{c.date ? `, ${c.date}` : ''}</p>
                  </button>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => onOpenChat(c.id)} className={ActionBtn}><MessageSquare size={15} /> {tx.openChat}</button>
                    <button onClick={() => onRemoveFromProject(c.id)} className={ActionBtn}><FolderMinus size={15} /> {tx.remove}</button>
                  </div>
                </div>
              );
            })
          )}

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="mt-4 flex items-center justify-center gap-2 h-12 rounded-full bg-[var(--sf)] text-red-500 text-[15px] font-semibold transition-transform active:scale-[0.97]"
            >
              <Trash2 size={17} /> {tx.delProject}
            </button>
          ) : (
            <div className="mt-4 rounded-2xl bg-[var(--sf)] p-4 flex flex-col gap-3">
              <p className="text-[14px] leading-relaxed text-[var(--mu)]">
                {tx.delConfirm}
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className={ActionBtn}>{tx.cancel}</button>
                <button
                  onClick={() => { onDeleteProject(detail.id); setConfirmDelete(false); setScreen({ name: 'list' }); }}
                  className={cn(ActionBtn, "text-red-500")}
                >
                  {tx.del}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DAFTAR PROJECT ───
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      <TopBar
        left={<button onClick={onBack} aria-label={tx.back} className={IconBtn}><ArrowLeft size={24} strokeWidth={2.2} /></button>}
        title={tx.listTitle}
        right={<button onClick={() => setScreen({ name: 'form' })} aria-label={tx.newAria} className={IconBtn}><Plus size={26} strokeWidth={2.2} /></button>}
      />

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3 pb-24">
          <div className="w-[70px] h-[70px] rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)]">
            <Folder size={28} />
          </div>
          <p className="text-[17px] font-bold text-[var(--text)] mt-1">{tx.emptyTitle}</p>
          <p className="text-[14.5px] text-[var(--mu)] leading-relaxed max-w-[300px]">
            {tx.emptyDesc}
          </p>
          <button
            onClick={() => setScreen({ name: 'form' })}
            className="mt-3 flex items-center gap-2 h-12 px-6 rounded-full bg-[var(--sf)] hover:bg-[var(--ib)] text-[16px] font-bold text-[var(--text)] transition-transform active:scale-95"
          >
            <Plus size={20} strokeWidth={2.2} /> {tx.newBtn}
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-10 pt-1 min-h-0" style={{ scrollbarWidth: 'none' }}>
          {/* 2 kolom, tiap project = kotak persegi. Kalau baru satu, tetap satu kotak (setengah lebar), bukan persegi panjang. */}
          <div className="grid grid-cols-2 gap-3">
            {projects.map((p) => {
              const n = (chatsByProject[p.id] || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setScreen({ name: 'detail', id: p.id })}
                  className="aspect-square min-w-0 rounded-3xl bg-[var(--sf)] hover:bg-[var(--ib)] p-4 flex flex-col justify-between text-left transition-[transform,background-color] active:scale-[0.96]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[var(--ib)] flex items-center justify-center flex-shrink-0 text-[var(--text)]">
                    <Folder size={22} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold leading-snug text-[var(--text)] line-clamp-2 break-words">{p.name}</p>
                    <p className="text-[12px] text-[var(--mu)] mt-1">{fill(tx.chatCount, n)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
