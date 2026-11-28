import React, { useState } from 'react';
import { ArrowLeft, Download, Trash2, Brain, UserX, ExternalLink, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useProfile } from '../hooks/useProfile';
import { usePageText } from '../lib/i18n';
import { cn } from '../lib/utils';

const TEXT = {
  id: {
    title: 'Data & Privasi',
    info: 'Obrolan dan memori kamu tersimpan di akun ini. Kamu bisa mengunduh atau menghapusnya kapan saja.',
    exportT: 'Ekspor data', exportD: 'Unduh obrolan & memori',
    chatsT: 'Hapus semua obrolan', chatsD: 'Termasuk Perpustakaan, Project, Automations & Collaboration',
    memT: 'Hapus semua memori', memD: 'Cylen akan lupa semua yang dicatat',
    accT: 'Hapus akun', accD: 'Hapus akun dan semua datanya',
    note: 'Obrolan sementara tidak disimpan.',
    sheetExport: 'Ekspor data', sheetExportD: 'Semua obrolan dan memori kamu diunduh sebagai satu file JSON.',
    media: 'Sertakan gambar & file', mediaD: 'Ukuran file jadi jauh lebih besar',
    download: 'Unduh',
    cancel: 'Batal', del: 'Hapus',
    delChats: 'Hapus semua obrolan?', delChatsD: 'Semua obrolan pribadi, item Perpustakaan, semua Project, semua jadwal Automations, dan semua Collaboration dihapus permanen, termasuk foto dan file lampirannya. Collaboration yang kamu buat ikut terhapus untuk semua anggota; yang kamu ikuti, kamu keluar. Tidak bisa dibatalkan.',
    delMem: 'Hapus semua memori?', delMemD: 'Cylen tidak akan ingat apa pun tentang kamu lagi.',
    delAcc: 'Hapus akun?', delAccD: 'Akun, obrolan, memori, dan semua datamu dihapus permanen. Collaboration yang kamu buat ikut terhapus untuk semua anggota. Kamu diminta masuk dengan Google sekali lagi untuk konfirmasi.',
    okExport: 'File diunduh', okChats: 'Semua obrolan dihapus', okMem: 'Semua memori dihapus', okAcc: 'Akun dihapus',
    fail: 'Gagal, coba lagi',
  },
  en: {
    title: 'Data & Privacy',
    info: 'Your chats and memories are saved to this account. You can download or delete them anytime.',
    exportT: 'Export data', exportD: 'Download chats & memories',
    chatsT: 'Delete all chats', chatsD: 'Includes Library, Projects, Automations & Collaboration',
    memT: 'Delete all memories', memD: 'Cylen will forget everything it noted',
    accT: 'Delete account', accD: 'Delete your account and all its data',
    note: 'Temporary chats are not saved.',
    sheetExport: 'Export data', sheetExportD: 'All your chats and memories are downloaded as one JSON file.',
    media: 'Include images & files', mediaD: 'The file gets much bigger',
    download: 'Download',
    cancel: 'Cancel', del: 'Delete',
    delChats: 'Delete all chats?', delChatsD: 'All your personal chats, Library items, all Projects, all Automations schedules, and all Collaborations are permanently deleted, including their photos and attached files. Collaborations you created are deleted for all members; ones you joined, you leave. This can’t be undone.',
    delMem: 'Delete all memories?', delMemD: 'Cylen won’t remember anything about you anymore.',
    delAcc: 'Delete account?', delAccD: 'Your account, chats, memories, and all data are permanently deleted. Collaborations you created are deleted for all members. You’ll be asked to sign in with Google once more to confirm.',
    okExport: 'File downloaded', okChats: 'All chats deleted', okMem: 'All memories deleted', okAcc: 'Account deleted',
    fail: 'Something went wrong, try again',
  },
};

// Buang gambar/file dari pesan supaya hasil ekspor kecil (kalau "Sertakan gambar & file" mati)
const stripMedia = (m: any) => {
  const { image, images, pdfs, ...rest } = m;
  return rest;
};

interface Props {
  onBack: () => void;
  showToast: (msg: string) => void;
  onDeleteAllChats: () => Promise<void> | void;
  onDeleteAllMemory: () => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void; // kosongkan kalau fitur hapus akun belum ada
}

const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';

const ROW = 'w-full flex items-center gap-4 bg-[var(--sf)] px-5 py-4 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--ib)]';

interface Item { key: string; icon: React.ReactNode; title: string; desc: string; onClick: () => void; danger?: boolean; ext?: boolean }

const Block = ({ items }: { items: Item[] }) => (
  <div className="mx-3 flex flex-col gap-[2px]">
    {items.map((it, i) => (
      <button key={it.key} onClick={it.onClick} className={cn(ROW, blockRadius(i, items.length), it.danger && 'text-red-500')}>
        <div className="w-6 flex justify-center flex-shrink-0 opacity-90">{it.icon}</div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[18px] font-medium leading-tight truncate">{it.title}</span>
          <span className="text-[15px] text-[var(--mu)] mt-0.5 truncate">{it.desc}</span>
        </div>
        {it.ext && <ExternalLink size={18} className="text-[var(--mu)] opacity-60 flex-shrink-0" />}
      </button>
    ))}
  </div>
);

// Lembar dari bawah (dipakai untuk ekspor & semua konfirmasi hapus)
const Sheet = ({ title, desc, onClose, children }: { title: string; desc: string; onClose: () => void; children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[100] flex items-end bg-black/50" onClick={onClose}>
    <div
      className="w-full max-w-2xl mx-auto bg-[var(--sf)] rounded-t-[28px] px-6 pt-6"
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{title}</h2>
      <p className="text-[16px] leading-relaxed text-[var(--mu)] mt-1.5">{desc}</p>
      {children}
    </div>
  </div>
);

// Warna tombol mengikuti tema (tidak merah): "main" dan "danger" sama-sama memakai warna teks tema
const Btn = ({ kind, onClick, disabled, loading, children }: { kind: 'main' | 'danger' | 'ghost'; onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-busy={loading || undefined}
    className={cn(
      'w-full rounded-full py-4 text-[17px] font-semibold transition-opacity active:opacity-80 flex items-center justify-center',
      loading ? 'disabled:opacity-100' : 'disabled:opacity-50',
      (kind === 'main' || kind === 'danger') && 'bg-[var(--text)] text-[var(--bg)]',
      kind === 'ghost' && 'bg-[var(--ib)] text-[var(--text)]'
    )}
  >
    {loading ? <Loader2 size={24} className="animate-spin" aria-label="Loading" /> : children}
  </button>
);

type SheetKey = null | 'export' | 'chats' | 'memory' | 'account';

export const DataPrivacyPage: React.FC<Props> = ({ onBack, showToast, onDeleteAllChats, onDeleteAllMemory, onDeleteAccount }) => {
  const tx = usePageText('dataPrivacy', TEXT);
  const user = auth?.currentUser;
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [busy, setBusy] = useState(false);
  const { profile } = useProfile();

  const exportData = async (withMedia: boolean) => {
    if (!user) throw new Error('not-signed-in');
    const [chatSnap, memSnap] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'chats')),
      getDocs(collection(db, 'users', user.uid, 'memory')),
    ]);
    const chats = chatSnap.docs
      .map(d => d.data() as any)
      .filter(c => c.messages?.length) // chat kosong tidak ikut
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map(c => ({ ...c, messages: c.messages.map((m: any) => (withMedia ? m : stripMedia(m))) }));
    const memory = memSnap.docs
      .map(d => { const { text, timestamp, rawDate } = d.data() as any; return { text, timestamp, rawDate }; })
      .sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));
    const payload = {
      app: 'Cylen',
      exportedAt: new Date().toISOString(),
      account: { email: user.email, name: profile?.name || user.displayName || null, language: profile?.lang || null },
      chats,
      memory,
    };
    // Tanpa media: semua string data:... (base64) yang masih tersisa diganti teks pendek
    const replacer = withMedia ? undefined : (_k: string, v: any) =>
      typeof v === 'string' && v.length > 200 && v.startsWith('data:') ? '(file tidak disertakan)' : v;
    const blob = new Blob([JSON.stringify(payload, replacer, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cylen-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const run = async (fn: () => Promise<void> | void, okMsg: string) => {
    setBusy(true);
    try { await fn(); showToast(okMsg); }
    catch { showToast(tx.fail); }
    finally { setBusy(false); setSheet(null); }
  };

  const dataItems: Item[] = [
    { key: 'export', icon: <Download size={24} />, title: tx.exportT, desc: tx.exportD, onClick: () => setSheet('export') },
    { key: 'chats', icon: <Trash2 size={24} />, title: tx.chatsT, desc: tx.chatsD, onClick: () => setSheet('chats') },
    { key: 'memory', icon: <Brain size={24} />, title: tx.memT, desc: tx.memD, onClick: () => setSheet('memory') },
  ];
  const accItems: Item[] = [
    ...(onDeleteAccount ? [{ key: 'acc', icon: <UserX size={24} />, title: tx.accT, desc: tx.accD, danger: true, onClick: () => setSheet('account') }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
      <header className="flex items-center gap-4 px-4 pb-3 flex-shrink-0" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}>
        <button onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors">
          <ArrowLeft size={26} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{tx.title}</h1>
      </header>

      <div className="max-w-2xl w-full mx-auto pt-2">
        <p className="px-6 mb-4 text-[15px] leading-relaxed text-[var(--mu)]">{tx.info}</p>
        <Block items={dataItems} />
        {accItems.length > 0 && (
          <>
            <div className="h-5" />
            <Block items={accItems} />
          </>
        )}
        {user?.email && <p className="px-6 mt-4 text-[14px] text-[var(--mu)] truncate">{user.email}</p>}
        <p className="px-6 mt-1 text-[14px] text-[var(--mu)]">{tx.note}</p>
      </div>

      {sheet === 'export' && (
        <Sheet title={tx.sheetExport} desc={tx.sheetExportD} onClose={() => !busy && setSheet(null)}>
          <button onClick={() => setIncludeMedia(v => !v)} className="w-full flex items-center gap-4 mt-5 text-left">
            <span className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 text-[var(--bg)]', includeMedia ? 'bg-[var(--text)] border-[var(--text)]' : 'border-[var(--mu)]')}>
              {includeMedia && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </span>
            <span className="flex flex-col">
              <span className="text-[17px] font-medium text-[var(--text)]">{tx.media}</span>
              <span className="text-[14px] text-[var(--mu)]">{tx.mediaD}</span>
            </span>
          </button>
          <div className="flex flex-col gap-2 mt-6">
            <Btn kind="main" disabled={busy} loading={busy} onClick={() => run(() => exportData(includeMedia), tx.okExport)}>{tx.download}</Btn>
            <Btn kind="ghost" disabled={busy} onClick={() => setSheet(null)}>{tx.cancel}</Btn>
          </div>
        </Sheet>
      )}

      {sheet && sheet !== 'export' && (
        <Sheet
          title={sheet === 'chats' ? tx.delChats : sheet === 'memory' ? tx.delMem : tx.delAcc}
          desc={sheet === 'chats' ? tx.delChatsD : sheet === 'memory' ? tx.delMemD : tx.delAccD}
          onClose={() => !busy && setSheet(null)}
        >
          <div className="flex flex-col gap-2 mt-6">
            <Btn
              kind="danger"
              disabled={busy}
              loading={busy}
              onClick={() =>
                sheet === 'chats' ? run(onDeleteAllChats, tx.okChats)
                : sheet === 'memory' ? run(onDeleteAllMemory, tx.okMem)
                : run(onDeleteAccount!, tx.okAcc)
              }
            >
              {tx.del}
            </Btn>
            <Btn kind="ghost" disabled={busy} onClick={() => setSheet(null)}>{tx.cancel}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
};
