// src/components/chat/components/ui/ScheduleCard.tsx
// Pil jadwal di chat (menggantikan kartu persegi "JADWAL DIBUAT").
//   pending → spinner "Membuat jadwal…"
//   ok      → centang + judul + waktu. Ikon lonceng di kanan HANYA kalau notifikasi belum aktif.
//   ask / error → pesan singkat
// Nama export tetap `ScheduleCard`, jadi ChatBubble & GroupChatBubble tidak perlu ganti import.
// Font tidak diatur di sini: ikut font pilihan user.
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, AlertCircle, Bell, Loader2 } from 'lucide-react';
import { auth } from '../../../../lib/firebase';
import { enablePush, ensurePush, getPushStatus } from '../../../../lib/pushNotifications';

export interface ScheduleCardData {
  status: 'pending' | 'ok' | 'ask' | 'error';
  title: string;
  when?: string;
  kind?: 'reminder' | 'ai';
  notify?: boolean;
  taskId?: string;
  message?: string;
}

export const ScheduleCard: React.FC<{ card: ScheduleCardData }> = ({ card }) => {
  const uid = auth?.currentUser?.uid;
  // Izin sudah diberikan? Anggap aktif dulu (tidak ada lonceng yang kedip), lalu dipastikan di belakang layar
  const [push, setPush] = useState(() => {
    const st = getPushStatus(uid);
    return st === 'off' && typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'on' : st;
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (card.status !== 'ok') return;
    let alive = true;
    ensurePush(uid).then(st => { if (alive) setPush(st); });
    return () => { alive = false; };
  }, [card.status, uid]);

  const isPending = card.status === 'pending';
  const isOk = card.status === 'ok';
  const isError = card.status === 'error';

  // Lonceng hanya muncul kalau notifikasi belum aktif di perangkat ini
  const showBell = isOk && card.notify !== false && (push === 'off' || push === 'denied');

  const turnOn = async () => {
    if (busy) return;
    if (push === 'denied') { setNote('Notifikasi diblokir browser. Aktifkan lewat pengaturan situs.'); return; }
    setBusy(true);
    setNote('');
    const res = await enablePush();
    setPush(res.status);
    if (res.status !== 'on') setNote(res.message || 'Izin notifikasi belum diberikan.');
    setBusy(false);
  };

  if (isPending) {
    // Kartu kerangka berkilau (shimmer), bentuknya sama dengan kartu akhir
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative flex w-full items-center gap-3.5 overflow-hidden rounded-3xl border border-[var(--bd)] bg-[var(--sf)] p-3 min-h-[60px]"
      >
        <style>{`
          @keyframes sc-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
          .sc-sk{background:var(--bd);border-radius:999px;opacity:.7}
        `}</style>
        <div className="sc-sk w-9 h-9 flex-shrink-0" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="sc-sk h-3 w-[55%]" />
          <div className="sc-sk h-2.5 w-[35%]" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(100deg, transparent 20%, color-mix(in srgb, var(--text) 12%, transparent) 50%, transparent 80%)',
            animation: 'sc-shimmer 1.4s ease-in-out infinite',
          }}
        />
      </motion.div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex w-full items-center gap-3.5 rounded-3xl border border-[var(--bd)] bg-[var(--sf)] p-3 min-h-[60px]"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: isError ? 'rgba(239,68,68,0.12)' : isPending ? 'var(--bd)' : 'var(--text)',
            color: isError ? '#ef4444' : isPending ? 'var(--text)' : 'var(--bg)',
          }}
        >
          {isPending ? (
            <Loader2 size={17} strokeWidth={2.4} className="animate-spin" />
          ) : isOk ? (
            <Check size={18} strokeWidth={3} />
          ) : isError ? (
            <AlertCircle size={18} strokeWidth={2.4} />
          ) : (
            <Clock size={18} strokeWidth={2.4} />
          )}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          {isPending ? (
            <p className="text-[14px] font-semibold text-[var(--text)]/55 leading-snug">Membuat jadwal…</p>
          ) : (
            <>
              <p className="text-[15px] font-bold text-[var(--text)] leading-snug break-words">{card.title}</p>
              {isOk && card.when && <p className="text-[12px] font-medium text-[var(--text)]/55 mt-0.5">{card.when}</p>}
              {!isOk && card.message && <p className="text-[12px] font-medium text-[var(--text)]/55 mt-0.5">{card.message}</p>}
            </>
          )}
        </div>

        {showBell && (
          <button
            onClick={turnOn}
            disabled={busy}
            aria-label="Aktifkan notifikasi"
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--text)] text-[var(--bg)] active:scale-90 transition-all disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
          >
            {busy ? <Loader2 size={16} strokeWidth={2.4} className="animate-spin" /> : <Bell size={16} strokeWidth={2.4} />}
          </button>
        )}
      </motion.div>

      {note && <p className="text-[12px] text-[var(--text)]/50 pl-3">{note}</p>}
    </div>
  );
};
