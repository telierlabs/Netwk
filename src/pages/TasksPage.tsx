import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, AlarmClock, X, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { enablePush, getPushStatus, type PushStatus } from '../lib/pushNotifications';

interface TasksPageProps { onClose: () => void }

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';
type Kind = 'reminder' | 'ai';

const FREQ_LABEL: Record<Frequency, string> = { once: 'Sekali', daily: 'Harian', weekdays: 'Hari kerja', weekly: 'Mingguan' };
const DAY_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface Task {
  id: string; uid: string; title: string; prompt: string; kind?: Kind;
  frequency: Frequency; time: string; weekday: number; tz: string; tzOffsetMin: number;
  active: boolean; notify?: boolean; nextRunAt: number | null; lastRunAt?: number;
  lastStatus?: 'running' | 'ok' | 'error' | 'retrying'; createdAt: number;
}

// SAMA dengan computeNextRun di api/run-tasks.ts
function computeNextRun(fromMs: number, t: { time: string; frequency: Frequency; weekday: number; tzOffsetMin: number }): number {
  const [h, m] = t.time.split(':').map(Number);
  const off = t.tzOffsetMin * 60000;
  const local = new Date(fromMs + off);
  let c = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m);
  const dayOk = (ms: number) => {
    const d = new Date(ms).getUTCDay();
    if (t.frequency === 'weekdays') return d >= 1 && d <= 5;
    if (t.frequency === 'weekly') return d === t.weekday;
    return true;
  };
  let guard = 0;
  while ((c - off <= fromMs || !dayOk(c)) && guard++ < 14) c += 86400000;
  return c - off;
}

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

const whenText = (t: Task) => {
  if (t.frequency === 'daily') return `Setiap hari · ${t.time}`;
  if (t.frequency === 'weekdays') return `Senin–Jumat · ${t.time}`;
  if (t.frequency === 'weekly') return `Setiap ${DAY_FULL[t.weekday]} · ${t.time}`;
  return t.nextRunAt ? fmtDate(t.nextRunAt) : `Sekali · ${t.time}`;
};

const statusOf = (t: Task) => {
  if (t.lastStatus === 'running') return 'Berjalan';
  if (t.lastStatus === 'retrying') return 'Mencoba lagi';
  if (t.lastStatus === 'error') return 'Gagal';
  if (t.active) return 'Aktif';
  return t.frequency === 'once' && t.lastStatus === 'ok' ? 'Selesai' : 'Dijeda';
};

const Switch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange}
    className={cn('w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300 flex-shrink-0', checked ? 'bg-[var(--text)]' : 'bg-[var(--text)]/20', disabled && 'opacity-60')}>
    <div className={cn('w-5 h-5 rounded-full bg-[var(--bg)] transition-transform duration-300 shadow-sm', checked ? 'translate-x-5' : 'translate-x-0')} />
  </button>
);

const Chip = ({ active, children, onClick }: any) => (
  <button type="button" onClick={onClick}
    className={cn('px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95', active ? 'bg-[var(--text)] text-[var(--bg)]' : 'bg-[var(--text)]/10 text-[var(--text)]/70')}>
    {children}
  </button>
);

const Field = ({ label, value, onChange, type = 'text', placeholder = '', area = false }: any) => (
  <div className="relative bg-[var(--text)]/5 rounded-2xl px-4 py-2 pt-6 border border-transparent focus-within:border-[var(--text)]/30 transition-all">
    <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">{label}</label>
    {area ? (
      <textarea rows={3} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold resize-none placeholder:text-[var(--text)]/20" />
    ) : (
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold placeholder:text-[var(--text)]/20" />
    )}
  </div>
);

export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('ai');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [time, setTime] = useState('07:00');
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);
  const [notify, setNotify] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyNote, setNotifyNote] = useState('');

  const uid = auth?.currentUser?.uid;
  const [push, setPush] = useState<PushStatus>('off');
  useEffect(() => { setPush(getPushStatus(uid)); }, [uid]);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'tasks'), where('uid', '==', uid));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setTasks(list);
      setLoading(false);
    }, (err) => { console.error('Gagal load jadwal:', err); setLoading(false); });
  }, [uid]);

  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3500); };

  // Pil Notifikasi di dalam popup: kalau dinyalakan dan perangkat ini belum diizinkan, izin diminta di sini
  const toggleNotify = async () => {
    if (notifyBusy) return;
    setNotifyNote('');
    if (notify) { setNotify(false); return; }
    if (push === 'unsupported') { setNotifyNote('Browser ini belum mendukung notifikasi.'); return; }
    if (push === 'on') { setNotify(true); return; }
    setNotifyBusy(true);
    const res = await enablePush();
    setPush(res.status);
    if (res.status === 'on') setNotify(true);
    else setNotifyNote(res.status === 'denied' ? 'Notifikasi diblokir di pengaturan browser.' : 'Izin notifikasi belum diberikan.');
    setNotifyBusy(false);
  };

  const openCreate = () => {
    setEditingId(null); setTitle(''); setKind('ai'); setFrequency('daily'); setTime('07:00');
    setWeekday(new Date().getDay()); setBody(''); setActive(true); setNotify(push === 'on');
    setNotifyNote(''); setFormError(''); setOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingId(t.id); setTitle(t.title); setKind(t.kind === 'reminder' ? 'reminder' : 'ai'); setFrequency(t.frequency);
    setTime(t.time); setWeekday(t.weekday ?? 0); setBody(t.prompt); setActive(t.active); setNotify(t.notify !== false);
    setNotifyNote(''); setFormError(''); setOpen(true);
  };

  const save = async () => {
    if (!uid || saving) return;
    if (!title.trim() || !body.trim()) { setFormError('Judul dan isi wajib diisi.'); return; }
    if (!/^\d{2}:\d{2}$/.test(time)) { setFormError('Pilih jam yang valid.'); return; }
    setSaving(true); setFormError('');
    try {
      const tzOffsetMin = -new Date().getTimezoneOffset();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const base = { title: title.trim(), prompt: body.trim(), kind, frequency, time, weekday, tz, tzOffsetMin, notify };
      if (editingId) {
        await updateDoc(doc(db, 'tasks', editingId), { ...base, active, nextRunAt: active ? computeNextRun(Date.now(), base) : null });
      } else {
        await addDoc(collection(db, 'tasks'), { ...base, uid, active: true, nextRunAt: computeNextRun(Date.now(), base), createdAt: Date.now(), source: 'manual' });
      }
      setOpen(false);
    } catch (e) {
      console.error(e);
      setFormError('Belum bisa disimpan. Cek koneksi lalu coba lagi.');
    } finally { setSaving(false); }
  };

  const runNow = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: true, nextRunAt: Date.now() });
      showNotice('Masuk antrean. Jalan dalam sekitar 1 menit.');
    } catch (e) { console.error(e); showNotice('Belum bisa dijalankan.'); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Hapus "${t.title}"?`)) return;
    try { await deleteDoc(doc(db, 'tasks', t.id)); } catch (e) { console.error(e); showNotice('Belum bisa dihapus.'); }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] font-sans absolute inset-0 z-[150]">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90">
            <ArrowLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 className="text-[18px] font-bold tracking-tight">Automations</h1>
        </div>
        <button onClick={openCreate} className="p-2 -mr-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90">
          <Plus size={26} strokeWidth={2.2} />
        </button>
      </div>

      {loading ? (
        <div className="flex-1" />
      ) : tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlarmClock size={56} className="text-[var(--text)]/80 mb-6" strokeWidth={1.5} />
          <h2 className="text-[20px] font-bold tracking-tight mb-2">Belum ada jadwal</h2>
          <p className="text-[var(--text)]/50 mb-8 max-w-[270px] text-[14px] leading-relaxed font-medium">
            Buat pengingat atau tugas AI yang jalan otomatis. Atau cukup ketik di chat: "ingetin gua jam 5 sore beli susu".
          </p>
          <button onClick={openCreate} className="flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] px-6 py-3.5 rounded-[20px] font-bold hover:opacity-90 transition-all active:scale-95">
            <Plus size={20} strokeWidth={2.5} /><span className="text-[15px]">Buat jadwal</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
          {tasks.map((t) => {
            const st = statusOf(t);
            return (
              <div key={t.id} className="rounded-2xl bg-[var(--text)]/5 p-4">
                <button onClick={() => openEdit(t)} className="text-left w-full">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-[16px] leading-snug break-words">{t.title}</p>
                    <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0', st === 'Gagal' ? 'bg-red-500/10 text-red-500' : 'bg-[var(--text)]/10 text-[var(--text)]/70')}>{st}</span>
                  </div>
                  <p className="text-[13px] text-[var(--text)]/55 font-medium mt-1">{whenText(t)}</p>
                  {t.active && t.nextRunAt && t.frequency !== 'once' && <p className="text-[12px] text-[var(--text)]/40 mt-0.5">Berikutnya: {fmtDate(t.nextRunAt)}</p>}
                  {!t.active && t.lastRunAt && <p className="text-[12px] text-[var(--text)]/40 mt-0.5">Terakhir jalan {fmtDate(t.lastRunAt)}</p>}
                  {st === 'Gagal' && <p className="text-[12px] text-red-500 mt-1">Belum bisa dijalankan. Ketuk Jalankan untuk coba lagi.</p>}
                </button>
                <div className="flex items-center gap-5 mt-3">
                  <button onClick={() => runNow(t)} className="text-[13px] font-bold text-[var(--text)] active:opacity-60">Jalankan</button>
                  <button onClick={() => remove(t)} className="text-[13px] font-bold text-red-500 active:opacity-60">Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {notice && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
            className="fixed left-4 right-4 bottom-8 z-[220] bg-[var(--text)] text-[var(--bg)] px-4 py-3 rounded-2xl text-[14px] font-semibold text-center">{notice}</motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transform-gpu" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90dvh] bg-[var(--bg)] rounded-t-[32px] flex flex-col z-[210] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transform-gpu will-change-transform">
              <div className="w-10 h-1.5 bg-[var(--text)]/15 rounded-full mx-auto mt-3 mb-2" />
              <div className="flex items-center justify-between px-4 pb-4">
                <button onClick={() => setOpen(false)} className="p-2 -ml-2 text-[var(--text)]/60 hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"><X size={24} strokeWidth={2.2} /></button>
                <h2 className="text-[18px] font-bold tracking-tight">{editingId ? 'Ubah Jadwal' : 'Buat Jadwal'}</h2>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] font-bold rounded-full text-[14px] transition-all active:scale-95 disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan'}</button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
                <Field label="Judul" placeholder="mis. Beli susu" value={title} onChange={setTitle} />

                <div className="bg-[var(--text)]/5 rounded-2xl px-4 py-3 pt-6 relative">
                  <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">Jenis</label>
                  <div className="flex gap-2 mt-1">
                    <Chip active={kind === 'reminder'} onClick={() => setKind('reminder')}>Pengingat</Chip>
                    <Chip active={kind === 'ai'} onClick={() => setKind('ai')}>Tugas AI</Chip>
                  </div>
                </div>

                <div className="bg-[var(--text)]/5 rounded-2xl px-4 py-3 pt-6 relative">
                  <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">Frekuensi</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => <Chip key={f} active={frequency === f} onClick={() => setFrequency(f)}>{FREQ_LABEL[f]}</Chip>)}
                  </div>
                  {frequency === 'weekly' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {DAY_LABEL.map((d, i) => <Chip key={d} active={weekday === i} onClick={() => setWeekday(i)}>{d}</Chip>)}
                    </div>
                  )}
                </div>

                <Field label="Jam" type="time" value={time} onChange={setTime} />
                <Field label={kind === 'reminder' ? 'Isi pengingat' : 'Perintah untuk AI'} area placeholder={kind === 'reminder' ? 'mis. Beli susu di minimarket' : 'mis. Ringkas berita teknologi hari ini'} value={body} onChange={setBody} />

                {/* PIL NOTIFIKASI — ada di dalam popup jadwal */}
                <div className="bg-[var(--text)]/5 rounded-2xl px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Bell size={18} strokeWidth={2.2} className="text-[var(--text)]/70 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold">Notifikasi</p>
                        <p className="text-[12px] text-[var(--text)]/50 font-medium">{notifyBusy ? 'Mengaktifkan…' : 'Muncul di HP atau laptop saat jadwal jalan'}</p>
                      </div>
                    </div>
                    <Switch checked={notifyBusy ? !notify : notify} onChange={toggleNotify} disabled={notifyBusy} />
                  </div>
                  {notifyNote && <p className="text-[12px] text-[var(--text)]/55 mt-2">{notifyNote}</p>}
                </div>

                {editingId && (
                  <div className="bg-[var(--text)]/5 rounded-2xl px-4 py-3.5 flex items-center justify-between">
                    <p className="text-[15px] font-bold">Jadwal aktif</p>
                    <Switch checked={active} onChange={() => setActive(!active)} />
                  </div>
                )}

                {formError && <p className="text-[13px] font-semibold text-red-500 px-1">{formError}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
