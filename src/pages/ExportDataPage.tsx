import React, { useState } from 'react';
import { ArrowLeft, Download, Check, Loader2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useProfile } from '../hooks/useProfile';
import { cn } from '../lib/utils';

// Buang gambar & file base64 dari pesan supaya hasil ekspor tetap kecil dan mudah dibaca
const stripMedia = (m: any) => {
  const { image, images, pdfs, ...rest } = m;
  const out: any = { ...rest };
  if (typeof out.content === 'string') {
    out.content = out.content.replace(/\(data:[^)]*\)/g, '(file tidak disertakan)');
  }
  return out;
};

export const ExportDataPage = ({ onBack, showToast }: { onBack: () => void; showToast: (msg: string) => void }) => {
  const { profile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(false);

  const handleExport = async () => {
    const user = auth?.currentUser;
    if (!user) return showToast('Kamu belum masuk');
    setBusy(true);
    try {
      const [chatSnap, memSnap] = await Promise.all([
        getDocs(collection(db, 'users', user.uid, 'chats')),
        getDocs(collection(db, 'users', user.uid, 'memory')),
      ]);

      const chats = chatSnap.docs
        .map(d => d.data() as any)
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map(c => ({ ...c, messages: (c.messages || []).map((m: any) => (includeMedia ? m : stripMedia(m))) }));

      const memory = memSnap.docs
        .map(d => {
          const { text, timestamp, rawDate } = d.data() as any;
          return { text, timestamp, rawDate };
        })
        .sort((a, b) => (b.rawDate || 0) - (a.rawDate || 0));

      const payload = {
        app: 'Cylen',
        exportedAt: new Date().toISOString(),
        account: { email: user.email, name: profile?.name || user.displayName || null, language: profile?.lang || null },
        chats,
        memory,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cylen-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showToast(`Selesai: ${chats.length} obrolan, ${memory.length} memori`);
    } catch (e) {
      console.error('Gagal ekspor data:', e);
      showToast('Gagal menyiapkan data');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Ekspor Data</h1>
      </header>

      <div className="p-6 pt-6 flex flex-col gap-4">
        <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">
          Unduh semua riwayat obrolan dan memori Cylen kamu sebagai satu file JSON.
        </p>

        <button
          onClick={() => setIncludeMedia(v => !v)}
          className="flex items-center gap-3 p-4 bg-[var(--sf)] border border-[var(--bd)]/30 rounded-[20px] text-left active:scale-[0.98] transition-transform"
        >
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center border flex-shrink-0', includeMedia ? 'bg-[var(--text)] text-[var(--bg)] border-transparent' : 'border-[var(--bd)]')}>
            {includeMedia && <Check size={16} strokeWidth={3} />}
          </div>
          <div>
            <div className="font-bold text-[14px] text-[var(--text)]">Sertakan gambar & file</div>
            <div className="text-xs text-[var(--mu)] mt-0.5 font-medium">Ukuran file jadi jauh lebih besar</div>
          </div>
        </button>

        <button
          onClick={handleExport}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 bg-[var(--text)] text-[var(--bg)] p-4 rounded-full font-bold shadow-lg active:scale-95 transition-all text-[15px] disabled:opacity-60"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          {busy ? 'Menyiapkan data...' : 'Unduh Data Saya (JSON)'}
        </button>

        <p className="text-[12px] text-[var(--mu)] text-center mt-3 leading-relaxed px-4 font-medium">
          Data diproses langsung di perangkat kamu dan file tersimpan di folder Unduhan. Nggak ada yang dikirim lewat email.
        </p>
      </div>
    </div>
  );
};
