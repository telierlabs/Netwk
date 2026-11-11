// src/components/chat/components/ui/ScheduleCard.tsx
// Kartu kecil di chat: "Jadwal dibuat" / "Jam berapa?" / "Jadwal belum bisa dibuat"
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, AlertCircle, BellRing, Bell } from 'lucide-react';
import { auth } from '../../../../lib/firebase';
import { enablePush, getPushStatus } from '../../../../lib/pushNotifications';

export interface ScheduleCardData {
  status: 'ok' | 'ask' | 'error';
  title: string;
  when?: string;
  kind?: 'reminder' | 'ai';
  notify?: boolean;
  taskId?: string;
  message?: string;
}

export const ScheduleCard: React.FC<{ card: ScheduleCardData }> = ({ card }) => {
  const uid = auth?.currentUser?.uid;
  const [push, setPush] = useState(() => getPushStatus(uid));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const turnOn = async () => {
    if (busy) return;
    setBusy(true);
    setNote('');
    const res = await enablePush();
    setPush(res.status);
    if (res.status !== 'on') setNote('Izin notifikasi belum diberikan. Aktifkan lewat pengaturan browser.');
    setBusy(false);
  };

  const isOk = card.status === 'ok';
  const isError = card.status === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-[420px] rounded-2xl border border-[var(--bd)] bg-[var(--sf)] px-4 py-3.5 flex items-start gap-3"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isError ? 'rgba(239,68,68,0.12)' : 'var(--text)', color: isError ? '#ef4444' : 'var(--bg)' }}
      >
        {isOk ? <Check size={18} strokeWidth={3} /> : isError ? <AlertCircle size={18} strokeWidth={2.4} /> : <Clock size={18} strokeWidth={2.4} />}
      </div>

      <div className="flex-1 min-w-0">
        {isOk && <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text)]/45">Jadwal dibuat</p>}
        <p className="text-[15px] font-bold text-[var(--text)] leading-snug break-words">{card.title}</p>
        {isOk && card.when && <p className="text-[13px] font-medium text-[var(--text)]/60 mt-0.5">{card.when}</p>}
        {!isOk && card.message && <p className="text-[13px] font-medium text-[var(--text)]/60 mt-0.5">{card.message}</p>}
        {isOk && card.kind === 'ai' && <p className="text-[12px] text-[var(--text)]/45 mt-1">Hasilnya masuk ke riwayat chat</p>}

        {isOk && card.notify && push === 'on' && (
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text)]/55 mt-2">
            <BellRing size={13} strokeWidth={2.4} /> Notifikasi aktif
          </p>
        )}
        {isOk && card.notify && (push === 'off' || push === 'denied') && (
          <button
            onClick={turnOn}
            disabled={busy || push === 'denied'}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text)] text-[var(--bg)] text-[12px] font-bold active:scale-95 transition-all disabled:opacity-50"
          >
            <Bell size={13} strokeWidth={2.5} />
            {busy ? 'Mengaktifkan…' : push === 'denied' ? 'Notifikasi diblokir browser' : 'Aktifkan notifikasi'}
          </button>
        )}
        {note && <p className="text-[12px] text-[var(--text)]/50 mt-1.5">{note}</p>}
      </div>
    </motion.div>
  );
};
