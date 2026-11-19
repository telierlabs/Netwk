import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus, X, Bell, Clock, CalendarCheck, ClipboardCheck, Newspaper, Sun,
  Droplet, Lightbulb, BookOpen, Sunset, Pause, Check, ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { enablePush, getPushStatus, type PushStatus } from '../lib/pushNotifications';

/*
  CATATAN FONT
  Halaman ini sengaja TIDAK menetapkan font-family apa pun (tidak ada font-sans / font-serif / font custom).
  Semua teks mewarisi font dari app, jadi kalau user ganti gaya font di profil, halaman ini ikut berubah.
  Input/textarea/button dipaksa `font-family: inherit` supaya tidak jatuh ke font bawaan browser.

  CATATAN JADWAL
  Pilihan frekuensi di form cuma Sekali / Harian / Mingguan. Tipe 'weekdays' tetap ada di Frequency
  supaya jadwal lama (atau yang dibuat lewat chat) tetap tampil dan bisa dijalankan backend.
*/

interface TasksPageProps { onClose: () => void }

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';
type Kind = 'reminder' | 'ai';
type Tab = 'aktif' | 'dijeda' | 'selesai';

const FREQ_LABEL: Record<Frequency, string> = { once: 'Sekali', daily: 'Harian', weekdays: 'Hari kerja', weekly: 'Mingguan' };
const FREQ_OPTIONS: Frequency[] = ['once', 'daily', 'weekly'];
const DAY_LABEL = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const TIME_PRESETS = [
  { label: 'Pagi', time: '07:00' },
  { label: 'Siang', time: '12:00' },
  { label: 'Sore', time: '17:00' },
  { label: 'Malam', time: '20:00' },
];
const TEAL = '#4cb6c2';

interface Task {
  id: string; uid: string; title: string; prompt: string; kind?: Kind;
  frequency: Frequency; time: string; weekday: number; tz: string; tzOffsetMin: number;
  active: boolean; notify?: boolean; nextRunAt: number | null; lastRunAt?: number;
  lastStatus?: 'running' | 'ok' | 'error' | 'retrying'; createdAt: number;
}

// ---------- 6 templat ----------
interface Template {
  icon: LucideIcon; title: string; desc: string; kind: Kind;
  frequency: Frequency; time: string; weekday?: number; body: string;
}

const TEMPLATES: Template[] = [
  { icon: Newspaper, title: 'Berita Pagi', desc: 'Cari berita terbaru dan ringkas, setiap pagi.', kind: 'ai', frequency: 'daily', time: '07:00',
    body: 'Cari 5 berita terpenting hari ini lalu ringkas masing-masing dalam 2 kalimat.' },
  { icon: Sun, title: 'Cuaca & Rencana Hari Ini', desc: 'Cek cuaca, lalu susun rencana singkat untuk hari ini.', kind: 'ai', frequency: 'daily', time: '07:00',
    body: 'Cek cuaca hari ini di kota saya, lalu buat rencana singkat dan saran bawaan.' },
  { icon: Droplet, title: 'Pengingat Minum Air', desc: 'Ingatkan diri sendiri untuk minum air putih.', kind: 'reminder', frequency: 'daily', time: '12:00',
    body: 'Waktunya minum air putih' },
  { icon: Lightbulb, title: 'Ide Konten Mingguan', desc: 'Kumpulkan ide konten segar di awal pekan.', kind: 'ai', frequency: 'weekly', weekday: 1, time: '07:00',
    body: 'Beri 5 ide konten untuk minggu ini lengkap dengan judul dan sudut pandangnya.' },
  { icon: BookOpen, title: 'Belajar Sedikit Tiap Hari', desc: 'Satu kosakata atau fakta baru yang mudah diingat.', kind: 'ai', frequency: 'daily', time: '20:00',
    body: 'Beri saya satu kosakata bahasa Inggris baru beserta contoh kalimatnya.' },
  { icon: Sunset, title: 'Rekap Sore', desc: 'Rangkum yang perlu dibereskan sebelum tutup hari.', kind: 'ai', frequency: 'daily', time: '17:00',
    body: 'Tanya saya apa yang sudah selesai hari ini, lalu bantu susun 3 prioritas untuk besok.' },
];

const tplMeta = (t: Template) =>
  t.frequency === 'weekly' ? `${DAY_FULL[t.weekday ?? 1]} · ${t.time}` : `${FREQ_LABEL[t.frequency]} · ${t.time}`;

// ---------- logika jadwal ----------
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

// Ringkasan jadwal di form (baris "Jadwal")
const schedSummary = (frequency: Frequency, time: string, weekday: number) => {
  if (frequency === 'daily') return `Setiap hari · ${time}`;
  if (frequency === 'weekdays') return `Senin–Jumat · ${time}`;
  if (frequency === 'weekly') return `Setiap ${DAY_FULL[weekday]} · ${time}`;
  if (!/^\d{2}:\d{2}$/.test(time)) return 'Sekali';
  const next = computeNextRun(Date.now(), { time, frequency, weekday, tzOffsetMin: -new Date().getTimezoneOffset() });
  return `Sekali · ${fmtDate(next)}`;
};

// Judul otomatis dari isi kalau nama dikosongkan
const autoTitle = (text: string) => {
  const s = text.trim().replace(/\s+/g, ' ');
  return s.length > 28 ? `${s.slice(0, 28).trimEnd()}…` : s;
};

const statusOf = (t: Task) => {
  if (t.lastStatus === 'running') return 'Berjalan';
  if (t.lastStatus === 'retrying') return 'Mencoba lagi';
  if (t.lastStatus === 'error') return 'Gagal';
  if (t.active) return 'Aktif';
  return t.frequency === 'once' && t.lastStatus === 'ok' ? 'Selesai' : 'Dijeda';
};

const isDone = (t: Task) => !t.active && t.frequency === 'once' && t.lastStatus === 'ok';
const FILTER: Record<Tab, (t: Task) => boolean> = {
  aktif: (t) => t.active,
  dijeda: (t) => !t.active && !isDone(t),
  selesai: isDone,
};
const TABS: { key: Tab; label: string }[] = [
  { key: 'aktif', label: 'Aktif' },
  { key: 'dijeda', label: 'Dijeda' },
  { key: 'selesai', label: 'Selesai' },
];

// ---------- komponen kecil ----------
const Switch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange}
    className={cn('w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300 flex-shrink-0', checked ? 'bg-[var(--text)]' : 'bg-[var(--text)]/20', disabled && 'opacity-60')}>
    <div className={cn('w-5 h-5 rounded-full bg-[var(--bg)] transition-transform duration-300 shadow-sm', checked ? 'translate-x-5' : 'translate-x-0')} />
  </button>
);

const Chip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={cn('px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 [font-family:inherit]', active ? 'bg-[var(--text)] text-[var(--bg)]' : 'bg-[var(--text)]/[0.08] text-[var(--text)]/70')}>
    {children}
  </button>
);

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-6 mb-2.5 px-1 text-[15px] font-medium text-[var(--text)]/55">{children}</p>
);

// ---------- hero ----------
const Tile = ({ className, rotate, delay, children }: { className: string; rotate: number; delay: number; children: React.ReactNode }) => (
  <motion.div
    style={{ rotate, color: TEAL }}
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay }}
    className={cn('absolute grid place-items-center rounded-[26%] bg-[var(--text)]/[0.06] border border-[var(--text)]/10 shadow-[0_12px_30px_rgba(0,0,0,0.22)]', className)}>
    {children}
  </motion.div>
);

const Hero = ({ onCreate }: { onCreate: () => void }) => (
  <section className="relative text-center px-6 pt-5 pb-1">
    <div className="absolute left-1/2 -top-2 w-[340px] h-[300px] -translate-x-1/2 pointer-events-none"
      style={{ background: 'radial-gradient(closest-side, rgba(76,182,194,0.14), transparent)' }} />
    <div className="relative w-[200px] h-[130px] mx-auto">
      <Tile className="left-[6px] top-[40px] w-[78px] h-[78px]" rotate={-12} delay={0}><Clock size={34} strokeWidth={1.8} /></Tile>
      <Tile className="left-[88px] top-[2px] w-[54px] h-[54px]" rotate={3} delay={-1.5}><ClipboardCheck size={24} strokeWidth={1.8} /></Tile>
      <Tile className="left-[146px] top-[48px] w-[46px] h-[46px]" rotate={9} delay={-3}><CalendarCheck size={21} strokeWidth={1.8} /></Tile>
    </div>
    <h2 className="relative mt-7 text-[42px] leading-[1.05] tracking-tight font-medium">Atur dan lupakan</h2>
    <p className="relative mt-3 mb-6 mx-auto max-w-[330px] text-[15px] leading-relaxed text-[var(--text)]/55">
      Otomatiskan pekerjaan sesuai jadwal atau saat kondisi terpenuhi, lalu biarkan berjalan sendiri.
    </p>
    <button onClick={onCreate}
      className="relative inline-flex items-center gap-2 h-[46px] px-6 rounded-full bg-[var(--text)] text-[var(--bg)] text-[16px] font-semibold transition-all active:scale-95 hover:opacity-90 [font-family:inherit]">
      <Plus size={20} strokeWidth={2.2} /><span>Buat baru</span>
    </button>
  </section>
);

// ---------- templat ----------
const Templates = ({ onPick }: { onPick: (t: Template) => void }) => (
  <>
    <h3 className="px-4 pt-8 pb-3 text-[18px] font-semibold tracking-tight">Templat</h3>
    <div className="grid grid-cols-2 gap-3 px-4">
      {TEMPLATES.map((tpl) => {
        const Icon = tpl.icon;
        return (
          <button key={tpl.title} type="button" onClick={() => onPick(tpl)}
            className="flex flex-col text-left rounded-[22px] border border-dashed border-[var(--text)]/20 p-4 transition-all active:scale-[0.98] hover:bg-[var(--text)]/[0.03] [font-family:inherit]">
            <Icon size={22} strokeWidth={1.7} className="text-[var(--text)]/85" />
            <p className="mt-3.5 text-[15px] font-semibold leading-tight">{tpl.title}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--text)]/50 font-medium">{tpl.desc}</p>
            <span className="mt-auto pt-3.5">
              <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--text)]/[0.07] text-[var(--text)]/55">{tplMeta(tpl)}</span>
            </span>
          </button>
        );
      })}
    </div>
  </>
);

// ---------- kartu jadwal ----------
interface TaskCardProps {
  t: Task;
  onEdit: () => void; onRun: () => void; onPause: () => void; onResume: () => void; onRemove: () => void;
}
const TaskCard = ({ t, onEdit, onRun, onPause, onResume, onRemove }: TaskCardProps) => {
  const st = statusOf(t);
  const done = isDone(t);
  const badge = st === 'Gagal' ? 'bg-red-500/10 text-red-500'
    : st === 'Aktif' || st === 'Berjalan' ? 'bg-[#4cb6c2]/15 text-[#4cb6c2]'
    : 'bg-[var(--text)]/10 text-[var(--text)]/65';
  const act = 'text-[13px] font-bold active:opacity-60 [font-family:inherit]';
  return (
    <div className="rounded-[20px] bg-[var(--text)]/5 p-4">
      <button onClick={onEdit} className="text-left w-full [font-family:inherit]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-[16px] leading-snug break-words">{t.title}</p>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0', badge)}>{st}</span>
        </div>
        <p className="text-[13px] text-[var(--text)]/55 font-medium mt-1">{t.kind === 'reminder' ? 'Pengingat' : 'Tugas AI'} · {whenText(t)}</p>
        {t.active && t.nextRunAt && t.frequency !== 'once' && <p className="text-[12px] text-[var(--text)]/40 mt-0.5">Berikutnya: {fmtDate(t.nextRunAt)}</p>}
        {!t.active && t.lastRunAt && <p className="text-[12px] text-[var(--text)]/40 mt-0.5">Terakhir jalan {fmtDate(t.lastRunAt)}</p>}
        {st === 'Gagal' && t.active && <p className="text-[12px] text-red-500 mt-1">Belum bisa dijalankan. Ketuk Jalankan untuk coba lagi.</p>}
      </button>
      <div className="flex items-center gap-5 mt-3">
        {t.active && (<>
          <button onClick={onRun} className={cn(act, 'text-[var(--text)]')}>Jalankan</button>
          <button onClick={onPause} className={cn(act, 'text-[var(--text)]')}>Jeda</button>
        </>)}
        {!t.active && !done && <button onClick={onResume} className={cn(act, 'text-[var(--text)]')}>Lanjutkan</button>}
        {done && <button onClick={onRun} className={cn(act, 'text-[var(--text)]')}>Jalankan lagi</button>}
        <button onClick={onRemove} className={cn(act, 'text-red-500')}>Hapus</button>
      </div>
    </div>
  );
};

const EmptyTab = ({ tab }: { tab: 'dijeda' | 'selesai' }) => {
  const Icon = tab === 'dijeda' ? Pause : Check;
  return (
    <div className="flex flex-col items-center text-center px-8 pt-24">
      <div className="w-16 h-16 rounded-full bg-[var(--text)]/[0.06] grid place-items-center text-[var(--text)]/50 mb-5">
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3 className="text-[17px] font-semibold">{tab === 'dijeda' ? 'Tidak ada jadwal yang dijeda' : 'Belum ada yang selesai'}</h3>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-[var(--text)]/45 font-medium">
        {tab === 'dijeda' ? 'Jadwal yang kamu jeda akan muncul di sini dan bisa dilanjutkan kapan saja.' : 'Jadwal sekali jalan yang sudah dijalankan akan muncul di sini.'}
      </p>
    </div>
  );
};

// ---------- halaman ----------
export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('aktif');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const [schedOpen, setSchedOpen] = useState(false);
  const [customTime, setCustomTime] = useState(false);

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

  const counts = useMemo(() => ({
    aktif: tasks.filter(FILTER.aktif).length,
    dijeda: tasks.filter(FILTER.dijeda).length,
    selesai: tasks.filter(FILTER.selesai).length,
  }), [tasks]);
  const visible = useMemo(() => tasks.filter(FILTER[tab]), [tasks, tab]);
  const showHero = tab === 'aktif' && visible.length === 0;

  const isPreset = TIME_PRESETS.some((p) => p.time === time);
  const showCustom = customTime || !isPreset;
  // 'Hari kerja' tidak ditawarkan di form, tapi tetap muncul kalau jadwal lama memakainya
  const freqOptions: Frequency[] = frequency === 'weekdays' ? [...FREQ_OPTIONS, 'weekdays'] : FREQ_OPTIONS;

  const switchTab = (k: Tab) => { setTab(k); scrollRef.current?.scrollTo({ top: 0 }); };
  const showNotice = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(''), 3500); };

  // Baris Notifikasi: kalau dinyalakan dan perangkat ini belum diizinkan, izin diminta di sini
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

  // tpl opsional: kalau dari templat, form langsung terisi
  const openCreate = (tpl?: Template) => {
    setEditingId(null);
    setTitle(tpl?.title ?? '');
    setKind(tpl?.kind ?? 'ai');
    setFrequency(tpl?.frequency ?? 'daily');
    setTime(tpl?.time ?? '07:00');
    setWeekday(tpl?.weekday ?? new Date().getDay());
    setBody(tpl?.body ?? '');
    setActive(true); setNotify(push === 'on');
    setSchedOpen(false); setCustomTime(false);
    setNotifyNote(''); setFormError(''); setOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingId(t.id); setTitle(t.title); setKind(t.kind === 'reminder' ? 'reminder' : 'ai'); setFrequency(t.frequency);
    setTime(t.time); setWeekday(t.weekday ?? 0); setBody(t.prompt); setActive(t.active); setNotify(t.notify !== false);
    setSchedOpen(false); setCustomTime(false);
    setNotifyNote(''); setFormError(''); setOpen(true);
  };

  const save = async () => {
    if (!uid || saving) return;
    if (!body.trim()) { setFormError(kind === 'reminder' ? 'Isi pengingat wajib diisi.' : 'Instruksi untuk AI wajib diisi.'); return; }
    if (!/^\d{2}:\d{2}$/.test(time)) { setFormError('Pilih jam yang valid.'); setSchedOpen(true); setCustomTime(true); return; }
    setSaving(true); setFormError('');
    try {
      const tzOffsetMin = -new Date().getTimezoneOffset();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const base = { title: title.trim() || autoTitle(body), prompt: body.trim(), kind, frequency, time, weekday, tz, tzOffsetMin, notify };
      if (editingId) {
        await updateDoc(doc(db, 'tasks', editingId), { ...base, active, nextRunAt: active ? computeNextRun(Date.now(), base) : null });
      } else {
        await addDoc(collection(db, 'tasks'), { ...base, uid, active: true, nextRunAt: computeNextRun(Date.now(), base), createdAt: Date.now(), source: 'manual' });
        setTab('aktif');
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

  const pause = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: false, nextRunAt: null });
      showNotice('Jadwal dijeda.');
    } catch (e) { console.error(e); showNotice('Belum bisa dijeda.'); }
  };

  const resume = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: true, nextRunAt: computeNextRun(Date.now(), t) });
      showNotice('Jadwal dilanjutkan.');
    } catch (e) { console.error(e); showNotice('Belum bisa dilanjutkan.'); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Hapus "${t.title}"?`)) return;
    try { await deleteDoc(doc(db, 'tasks', t.id)); } catch (e) { console.error(e); showNotice('Belum bisa dihapus.'); }
  };

  const circleBtn = 'w-10 h-10 rounded-full bg-[var(--text)]/[0.08] grid place-items-center text-[var(--text)] transition-all active:scale-90 hover:bg-[var(--text)]/[0.12]';
  const subLbl = 'mb-2 text-[13px] font-medium text-[var(--text)]/50';
  const rem = kind === 'reminder';

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] absolute inset-0 z-[150]">
      {/* Header */}
      <div className="px-4 pt-4 pb-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <button onClick={onClose} aria-label="Kembali" className={circleBtn}>
            <ArrowLeft size={22} strokeWidth={2.2} />
          </button>
          <h1 className="text-[20px] font-medium tracking-tight">Automasi</h1>
        </div>
        <button onClick={() => openCreate()} aria-label="Buat baru" className={circleBtn}>
          <Plus size={24} strokeWidth={2.2} />
        </button>
      </div>

      {/* Tab status */}
      <div className="flex gap-2 px-4 pt-2 pb-2.5 flex-shrink-0">
        {TABS.map(({ key, label }) => (
          <Chip key={key} active={tab === key} onClick={() => switchTab(key)}>
            {label}{counts[key] > 0 && <span className="ml-1.5 opacity-60 font-bold">{counts[key]}</span>}
          </Chip>
        ))}
      </div>

      {/* Isi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-10" style={{ scrollbarWidth: 'none' }}>
        {loading ? null : showHero ? (
          <>
            <Hero onCreate={() => openCreate()} />
            <Templates onPick={openCreate} />
          </>
        ) : visible.length === 0 ? (
          <EmptyTab tab={tab === 'selesai' ? 'selesai' : 'dijeda'} />
        ) : (
          <>
            <div className="flex flex-col gap-3 px-4 pt-1">
              {visible.map((t) => (
                <TaskCard key={t.id} t={t}
                  onEdit={() => openEdit(t)} onRun={() => runNow(t)} onPause={() => pause(t)}
                  onResume={() => resume(t)} onRemove={() => remove(t)} />
              ))}
            </div>
            {tab === 'aktif' && <Templates onPick={openCreate} />}
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {notice && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
            className="fixed left-4 right-4 bottom-8 z-[220] bg-[var(--text)] text-[var(--bg)] px-4 py-3 rounded-2xl text-[14px] font-semibold text-center">{notice}</motion.div>
        )}
      </AnimatePresence>

      {/* Form buat / ubah automasi (gaya Grok) */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] transform-gpu" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 }}
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
              className="fixed inset-x-0 bottom-0 bg-[var(--bg)] rounded-t-[28px] border-t border-[var(--text)]/10 flex flex-col z-[210] transform-gpu will-change-transform">
              {/* Header form */}
              <div className="flex items-center justify-between px-4 pt-5 pb-1.5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setOpen(false)} aria-label="Tutup"
                    className="w-9 h-9 -ml-1 grid place-items-center rounded-full text-[var(--text)] hover:bg-[var(--text)]/10 transition-all active:scale-90">
                    <X size={26} strokeWidth={2} />
                  </button>
                  <h2 className="text-[20px] font-bold tracking-tight">{editingId ? 'Ubah Automasi' : 'Automasi Baru'}</h2>
                </div>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-[var(--text)]/10 text-[16px] font-semibold transition-all active:scale-95 disabled:opacity-50 [font-family:inherit]">
                  {saving ? 'Menyimpan…' : editingId ? 'Simpan' : 'Buat'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pt-2" style={{ scrollbarWidth: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}>
                {/* Ikon */}
                <div className="w-[52px] h-[52px] rounded-[17px] mx-auto mt-1.5 mb-6 grid place-items-center bg-[var(--text)]/[0.07] border border-[var(--text)]/[0.08]">
                  {rem ? <Bell size={24} strokeWidth={1.8} /> : <Clock size={24} strokeWidth={1.8} />}
                </div>

                {/* Nama (opsional) */}
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama (opsional)"
                  className="w-full h-[54px] rounded-[20px] bg-[var(--text)]/[0.04] border border-[var(--text)]/[0.14] focus:border-[var(--text)]/35 px-4 text-[17px] font-medium text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text)]/40 [font-family:inherit]" />

                {/* Jadwal */}
                <Lbl>Jadwal</Lbl>
                <button type="button" onClick={() => setSchedOpen((v) => !v)} aria-expanded={schedOpen}
                  className={cn('w-full h-[54px] rounded-[20px] bg-[var(--text)]/[0.04] border px-4 flex items-center gap-3.5 text-left transition-colors [font-family:inherit]', schedOpen ? 'border-[var(--text)]/30' : 'border-[var(--text)]/[0.14]')}>
                  <Clock size={20} strokeWidth={1.9} className="text-[var(--text)]/55 flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-[17px] font-medium">{schedSummary(frequency, time, weekday)}</span>
                  <ChevronDown size={20} strokeWidth={2} className={cn('text-[var(--text)]/45 flex-shrink-0 transition-transform duration-300', schedOpen && 'rotate-180')} />
                </button>
                <div aria-hidden={!schedOpen} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', schedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <div className="mt-2.5 rounded-[20px] bg-[var(--text)]/[0.04] border border-[var(--text)]/10 p-4">
                      <p className={subLbl}>Ulangi</p>
                      <div className="flex flex-wrap gap-2">
                        {freqOptions.map((f) => <Chip key={f} active={frequency === f} onClick={() => setFrequency(f)}>{FREQ_LABEL[f]}</Chip>)}
                      </div>
                      {frequency === 'weekly' && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {DAY_LABEL.map((d, i) => <Chip key={d} active={weekday === i} onClick={() => setWeekday(i)}>{d}</Chip>)}
                        </div>
                      )}

                      <p className={cn(subLbl, 'mt-4')}>Jam</p>
                      <div className="flex flex-wrap gap-2">
                        {TIME_PRESETS.map((p) => (
                          <Chip key={p.time} active={!showCustom && time === p.time} onClick={() => { setTime(p.time); setCustomTime(false); }}>
                            {p.label}<span className="ml-1.5 opacity-60 font-medium">{p.time}</span>
                          </Chip>
                        ))}
                        <Chip active={showCustom} onClick={() => setCustomTime(true)}>Jam lain</Chip>
                      </div>
                      {showCustom && (
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                          className="mt-3 w-full h-12 rounded-xl bg-[var(--text)]/[0.08] px-4 text-[16px] font-semibold text-[var(--text)] outline-none [font-family:inherit]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Instruksi */}
                <Lbl>Instruksi</Lbl>
                <div className="rounded-[22px] bg-[var(--text)]/5 border border-[var(--text)]/[0.14] focus-within:border-[var(--text)]/35 p-4 transition-colors">
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                    placeholder={rem ? 'Tulis isi pengingatnya' : 'Bilang ke AI apa yang harus dikerjakan'}
                    className="block w-full min-h-[120px] bg-transparent outline-none resize-none text-[17px] leading-snug text-[var(--text)] placeholder:text-[var(--text)]/40 [font-family:inherit]" />
                </div>

                {/* Notifikasi */}
                <Lbl>Notifikasi</Lbl>
                <div className="rounded-[22px] overflow-hidden flex flex-col gap-[2px]">
                  <div className="flex items-center gap-3.5 min-h-[62px] px-4 bg-[var(--text)]/[0.06]">
                    <Bell size={22} strokeWidth={1.8} className="text-[var(--text)]/55 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold">Notifikasi</p>
                      {notifyBusy && <p className="text-[12px] text-[var(--text)]/50 font-medium">Mengaktifkan…</p>}
                    </div>
                    <Switch checked={notifyBusy ? !notify : notify} onChange={toggleNotify} disabled={notifyBusy} />
                  </div>
                  {editingId && (
                    <div className="flex items-center gap-3.5 min-h-[62px] px-4 bg-[var(--text)]/[0.06]">
                      <Clock size={22} strokeWidth={1.8} className="text-[var(--text)]/55 flex-shrink-0" />
                      <p className="flex-1 text-[17px] font-semibold">Jadwal aktif</p>
                      <Switch checked={active} onChange={() => setActive(!active)} />
                    </div>
                  )}
                </div>
                {notifyNote && <p className="text-[13px] text-[var(--text)]/55 mt-2.5 px-1">{notifyNote}</p>}

                {formError && <p className="text-[13px] font-semibold text-red-500 mt-4 px-1">{formError}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
