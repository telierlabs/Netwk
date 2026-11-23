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
import { usePageText, useT } from '../lib/i18n';

/*
  CATATAN FONT
  Halaman ini sengaja TIDAK menetapkan font-family apa pun (tidak ada font-sans / font-serif / font custom).
  Semua teks mewarisi font dari app, jadi kalau user ganti gaya font di profil, halaman ini ikut berubah.
  Input/textarea/button dipaksa `font-family: inherit` supaya tidak jatuh ke font bawaan browser.

  CATATAN WARNA
  Hanya memakai variabel tema: latar = --bg, kartu/tombol = --sf, ditekan/jalur = --ib,
  garis = --bd, teks redup = --mu, tombol utama/aktif = --ac + --at. Tidak ada warna hardcode
  kecuali merah untuk status gagal/hapus.

  CATATAN JADWAL
  Pilihan frekuensi di form cuma Sekali / Harian / Mingguan. Tipe 'weekdays' tetap ada di Frequency
  supaya jadwal lama (atau yang dibuat lewat chat) tetap tampil dan bisa dijalankan backend.
*/

interface TasksPageProps { onClose: () => void }

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';
type Kind = 'reminder' | 'ai';
type Tab = 'aktif' | 'dijeda' | 'selesai';

const TEXT = {
  id: {
    once: 'Sekali', daily: 'Harian', weekdays: 'Hari kerja', weekly: 'Mingguan',
    pre: ['Pagi', 'Siang', 'Sore', 'Malam'],
    tpl: [
      { title: 'Berita Pagi', desc: 'Cari berita terbaru dan ringkas, setiap pagi.', body: 'Cari 5 berita terpenting hari ini lalu ringkas masing-masing dalam 2 kalimat.' },
      { title: 'Cuaca & Rencana Hari Ini', desc: 'Cek cuaca, lalu susun rencana singkat untuk hari ini.', body: 'Cek cuaca hari ini di kota saya, lalu buat rencana singkat dan saran bawaan.' },
      { title: 'Pengingat Minum Air', desc: 'Ingatkan diri sendiri untuk minum air putih.', body: 'Waktunya minum air putih' },
      { title: 'Ide Konten Mingguan', desc: 'Kumpulkan ide konten segar di awal pekan.', body: 'Beri 5 ide konten untuk minggu ini lengkap dengan judul dan sudut pandangnya.' },
      { title: 'Belajar Sedikit Tiap Hari', desc: 'Satu kosakata atau fakta baru yang mudah diingat.', body: 'Beri saya satu kosakata bahasa Inggris baru beserta contoh kalimatnya.' },
      { title: 'Rekap Sore', desc: 'Rangkum yang perlu dibereskan sebelum tutup hari.', body: 'Tanya saya apa yang sudah selesai hari ini, lalu bantu susun 3 prioritas untuk besok.' },
    ],
    tplHeading: 'Templat', everyDay: 'Setiap hari', monFri: 'Senin–Jumat', everyDayName: 'Setiap {d}',
    stRunning: 'Berjalan', stRetrying: 'Mencoba lagi', stError: 'Gagal', stActive: 'Aktif', stDone: 'Selesai', stPaused: 'Dijeda',
    reminder: 'Pengingat', aiTask: 'Tugas AI', next: 'Berikutnya:', lastRun: 'Terakhir jalan', failedHint: 'Belum bisa dijalankan. Ketuk Jalankan untuk coba lagi.',
    run: 'Jalankan', pause: 'Jeda', resume: 'Lanjutkan', runAgain: 'Jalankan lagi', del: 'Hapus',
    noPaused: 'Tidak ada jadwal yang dijeda', noDone: 'Belum ada yang selesai',
    noPausedDesc: 'Jadwal yang kamu jeda akan muncul di sini dan bisa dilanjutkan kapan saja.', noDoneDesc: 'Jadwal sekali jalan yang sudah dijalankan akan muncul di sini.',
    heroTitle: 'Atur dan lupakan', heroDesc: 'Otomatiskan pekerjaan sesuai jadwal atau saat kondisi terpenuhi, lalu biarkan berjalan sendiri.', create: 'Buat baru',
    pushUnsupported: 'Browser ini belum mendukung notifikasi.', pushDenied: 'Notifikasi diblokir di pengaturan browser.', pushNotGranted: 'Izin notifikasi belum diberikan.',
    reqReminder: 'Isi pengingat wajib diisi.', reqAI: 'Instruksi untuk AI wajib diisi.', badTime: 'Pilih jam yang valid.', saveFail: 'Belum bisa disimpan. Cek koneksi lalu coba lagi.',
    queued: 'Masuk antrean. Jalan dalam sekitar 1 menit.', runFail: 'Belum bisa dijalankan.', paused: 'Jadwal dijeda.', pauseFail: 'Belum bisa dijeda.', resumed: 'Jadwal dilanjutkan.', resumeFail: 'Belum bisa dilanjutkan.',
    confirmDel: 'Hapus "{t}"?', delFail: 'Belum bisa dihapus.',
    back: 'Kembali', title: 'Automasi', close: 'Tutup', editTitle: 'Ubah Automasi', newTitle: 'Automasi Baru', saving: 'Menyimpan…', save: 'Simpan', createBtn: 'Buat',
    namePh: 'Nama (opsional)', schedule: 'Jadwal', repeat: 'Ulangi', hour: 'Jam', otherHour: 'Jam lain', instr: 'Instruksi',
    phReminder: 'Tulis isi pengingatnya', phAI: 'Bilang ke AI apa yang harus dikerjakan', notif: 'Notifikasi', enabling: 'Mengaktifkan…', schedActive: 'Jadwal aktif',
  },
  en: {
    once: 'Once', daily: 'Daily', weekdays: 'Weekdays', weekly: 'Weekly',
    pre: ['Morning', 'Noon', 'Afternoon', 'Evening'],
    tpl: [
      { title: 'Morning News', desc: 'Find the latest news and summarize it every morning.', body: 'Find the 5 most important news stories today and summarize each one in 2 sentences.' },
      { title: 'Weather & Today’s Plan', desc: 'Check the weather, then draft a short plan for today.', body: 'Check today’s weather in my city, then make a short plan and suggestions on what to bring.' },
      { title: 'Drink Water Reminder', desc: 'Remind yourself to drink water.', body: 'Time to drink some water' },
      { title: 'Weekly Content Ideas', desc: 'Gather fresh content ideas at the start of the week.', body: 'Give me 5 content ideas for this week, each with a title and an angle.' },
      { title: 'Learn a Little Every Day', desc: 'One new word or fact that is easy to remember.', body: 'Give me one new English word with an example sentence.' },
      { title: 'Evening Recap', desc: 'Sum up what needs wrapping up before the day ends.', body: 'Ask me what I finished today, then help me set 3 priorities for tomorrow.' },
    ],
    tplHeading: 'Templates', everyDay: 'Every day', monFri: 'Mon–Fri', everyDayName: 'Every {d}',
    stRunning: 'Running', stRetrying: 'Retrying', stError: 'Failed', stActive: 'Active', stDone: 'Done', stPaused: 'Paused',
    reminder: 'Reminder', aiTask: 'AI task', next: 'Next:', lastRun: 'Last ran', failedHint: 'Could not run. Tap Run to try again.',
    run: 'Run', pause: 'Pause', resume: 'Resume', runAgain: 'Run again', del: 'Delete',
    noPaused: 'No paused schedules', noDone: 'Nothing completed yet',
    noPausedDesc: 'Schedules you pause will appear here and can be resumed anytime.', noDoneDesc: 'One-time schedules that have run will appear here.',
    heroTitle: 'Set it and forget it', heroDesc: 'Automate work on a schedule or when a condition is met, then let it run on its own.', create: 'Create new',
    pushUnsupported: 'This browser does not support notifications yet.', pushDenied: 'Notifications are blocked in your browser settings.', pushNotGranted: 'Notification permission was not granted.',
    reqReminder: 'The reminder text is required.', reqAI: 'The instruction for the AI is required.', badTime: 'Pick a valid time.', saveFail: 'Could not save. Check your connection and try again.',
    queued: 'Queued. It will run in about 1 minute.', runFail: 'Could not run it.', paused: 'Schedule paused.', pauseFail: 'Could not pause it.', resumed: 'Schedule resumed.', resumeFail: 'Could not resume it.',
    confirmDel: 'Delete "{t}"?', delFail: 'Could not delete it.',
    back: 'Back', title: 'Automations', close: 'Close', editTitle: 'Edit Automation', newTitle: 'New Automation', saving: 'Saving…', save: 'Save', createBtn: 'Create',
    namePh: 'Name (optional)', schedule: 'Schedule', repeat: 'Repeat', hour: 'Time', otherHour: 'Other time', instr: 'Instructions',
    phReminder: 'Write the reminder text', phAI: 'Tell the AI what to do', notif: 'Notifications', enabling: 'Enabling…', schedActive: 'Schedule active',
  },
};
type TxT = typeof TEXT.id;

const FREQ_OPTIONS: Frequency[] = ['once', 'daily', 'weekly'];
const TIME_PRESETS = [{ time: '07:00' }, { time: '12:00' }, { time: '17:00' }, { time: '20:00' }];

// Nama hari dari Intl bawaan browser (statis, tanpa AI). Indeks 0 = Minggu.
const dayNames = (lang: string, style: 'short' | 'long'): string[] =>
  Array.from({ length: 7 }, (_, i) => {
    try { return new Intl.DateTimeFormat(lang, { weekday: style }).format(new Date(2023, 0, 1 + i)); }
    catch { return String(i); }
  });

const freqLabel = (tx: TxT, f: Frequency) => ({ once: tx.once, daily: tx.daily, weekdays: tx.weekdays, weekly: tx.weekly }[f]);

interface Template {
  icon: LucideIcon; title: string; desc: string; kind: Kind;
  frequency: Frequency; time: string; weekday?: number; body: string;
}

// Bagian tetap tiap templat. Judul/deskripsi/isi diambil dari tx.tpl[i] sesuai bahasa.
const TEMPLATE_BASE: { icon: LucideIcon; kind: Kind; frequency: Frequency; time: string; weekday?: number }[] = [
  { icon: Newspaper, kind: 'ai', frequency: 'daily', time: '07:00' },
  { icon: Sun, kind: 'ai', frequency: 'daily', time: '07:00' },
  { icon: Droplet, kind: 'reminder', frequency: 'daily', time: '12:00' },
  { icon: Lightbulb, kind: 'ai', frequency: 'weekly', weekday: 1, time: '07:00' },
  { icon: BookOpen, kind: 'ai', frequency: 'daily', time: '20:00' },
  { icon: Sunset, kind: 'ai', frequency: 'daily', time: '17:00' },
];
const buildTemplates = (tx: TxT): Template[] => TEMPLATE_BASE.map((b, i) => ({ ...b, ...tx.tpl[i] }));

const tplMeta = (t: Template, tx: TxT, lang: string) =>
  t.frequency === 'weekly' ? `${dayNames(lang, 'long')[t.weekday ?? 1]} · ${t.time}` : `${freqLabel(tx, t.frequency)} · ${t.time}`;

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

const fmtDate = (ms: number, lang: string) => {
  const loc = lang === 'id' ? 'id-ID' : lang;
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false };
  try {
    const out = new Date(ms).toLocaleString(loc, opts);
    return lang === 'id' ? out.replace('.', ':') : out;
  } catch { return new Date(ms).toLocaleString('en-US', opts); }
};

const whenText = (t: Task, tx: TxT, lang: string) => {
  if (t.frequency === 'daily') return `${tx.everyDay} · ${t.time}`;
  if (t.frequency === 'weekdays') return `${tx.monFri} · ${t.time}`;
  if (t.frequency === 'weekly') return `${tx.everyDayName.split('{d}').join(dayNames(lang, 'long')[t.weekday])} · ${t.time}`;
  return t.nextRunAt ? fmtDate(t.nextRunAt, lang) : `${tx.once} · ${t.time}`;
};

// Ringkasan jadwal di form (baris "Jadwal")
const schedSummary = (frequency: Frequency, time: string, weekday: number, tx: TxT, lang: string) => {
  if (frequency === 'daily') return `${tx.everyDay} · ${time}`;
  if (frequency === 'weekdays') return `${tx.monFri} · ${time}`;
  if (frequency === 'weekly') return `${tx.everyDayName.split('{d}').join(dayNames(lang, 'long')[weekday])} · ${time}`;
  if (!/^\d{2}:\d{2}$/.test(time)) return tx.once;
  const next = computeNextRun(Date.now(), { time, frequency, weekday, tzOffsetMin: -new Date().getTimezoneOffset() });
  return `${tx.once} · ${fmtDate(next, lang)}`;
};

// Judul otomatis dari isi kalau nama dikosongkan
const autoTitle = (text: string) => {
  const s = text.trim().replace(/\s+/g, ' ');
  return s.length > 28 ? `${s.slice(0, 28).trimEnd()}…` : s;
};

type St = 'running' | 'retrying' | 'error' | 'active' | 'done' | 'paused';
const statusOf = (t: Task): St => {
  if (t.lastStatus === 'running') return 'running';
  if (t.lastStatus === 'retrying') return 'retrying';
  if (t.lastStatus === 'error') return 'error';
  if (t.active) return 'active';
  return t.frequency === 'once' && t.lastStatus === 'ok' ? 'done' : 'paused';
};
const stLabel = (tx: TxT, st: St) => ({ running: tx.stRunning, retrying: tx.stRetrying, error: tx.stError, active: tx.stActive, done: tx.stDone, paused: tx.stPaused }[st]);

const isDone = (t: Task) => !t.active && t.frequency === 'once' && t.lastStatus === 'ok';
const FILTER: Record<Tab, (t: Task) => boolean> = {
  aktif: (t) => t.active,
  dijeda: (t) => !t.active && !isDone(t),
  selesai: isDone,
};
const TAB_KEYS: Tab[] = ['aktif', 'dijeda', 'selesai'];

// ---------- komponen kecil ----------
// Saklar: nyala = warna aksen, mati = --mu. Dipakai di baris berlatar --sf.
const Switch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange}
    className={cn('w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300 flex-shrink-0', checked ? 'bg-[var(--ac)]' : 'bg-[var(--mu)]', disabled && 'opacity-60')}>
    <div className={cn('w-5 h-5 rounded-full transition-transform duration-300 shadow-sm', checked ? 'translate-x-5 bg-[var(--at)]' : 'translate-x-0 bg-[var(--sf)]')} />
  </button>
);

// Chip: aktif = aksen. Tidak aktif = --sf (di atas latar halaman) atau --ib (di dalam panel berlatar --sf).
const Chip = ({ active, children, onClick, onSurface = false }: { active: boolean; children: React.ReactNode; onClick: () => void; onSurface?: boolean }) => (
  <button type="button" onClick={onClick}
    className={cn(
      'px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all active:scale-95 [font-family:inherit]',
      active ? 'bg-[var(--ac)] text-[var(--at)]' : cn(onSurface ? 'bg-[var(--ib)]' : 'bg-[var(--sf)]', 'text-[var(--text)]')
    )}>
    {children}
  </button>
);

const Lbl = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-6 mb-2.5 px-1 text-[15px] font-medium text-[var(--mu)]">{children}</p>
);

// ---------- hero ----------
const Tile = ({ className, rotate, delay, children }: { className: string; rotate: number; delay: number; children: React.ReactNode }) => (
  <motion.div
    style={{ rotate, color: 'var(--text)' }}
    animate={{ y: [0, -6, 0] }}
    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay }}
    className={cn('absolute grid place-items-center rounded-[26%] bg-[var(--sf)] border border-[var(--bd)] shadow-[0_12px_30px_rgba(0,0,0,0.10)]', className)}>
    {children}
  </motion.div>
);

const Hero = ({ onCreate, tx }: { onCreate: () => void; tx: TxT }) => (
  <section className="relative text-center px-6 pt-5 pb-1">
    <div className="absolute left-1/2 -top-2 w-[340px] h-[300px] -translate-x-1/2 pointer-events-none"
      style={{ background: 'radial-gradient(closest-side, color-mix(in srgb, var(--text) 8%, transparent), transparent)' }} />
    <div className="relative w-[200px] h-[130px] mx-auto">
      <Tile className="left-[6px] top-[40px] w-[78px] h-[78px]" rotate={-12} delay={0}><Clock size={34} strokeWidth={1.8} /></Tile>
      <Tile className="left-[88px] top-[2px] w-[54px] h-[54px]" rotate={3} delay={-1.5}><ClipboardCheck size={24} strokeWidth={1.8} /></Tile>
      <Tile className="left-[146px] top-[48px] w-[46px] h-[46px]" rotate={9} delay={-3}><CalendarCheck size={21} strokeWidth={1.8} /></Tile>
    </div>
    <h2 className="relative mt-7 text-[42px] leading-[1.05] tracking-tight font-medium">{tx.heroTitle}</h2>
    <p className="relative mt-3 mb-6 mx-auto max-w-[330px] text-[15px] leading-relaxed text-[var(--mu)]">
      {tx.heroDesc}
    </p>
    <button onClick={onCreate}
      className="relative inline-flex items-center gap-2 h-[46px] px-6 rounded-full bg-[var(--ac)] text-[var(--at)] text-[16px] font-semibold transition-all active:scale-95 hover:opacity-90 [font-family:inherit]">
      <Plus size={20} strokeWidth={2.2} /><span>{tx.create}</span>
    </button>
  </section>
);

// ---------- templat ----------
const Templates = ({ onPick, tx, lang }: { onPick: (t: Template) => void; tx: TxT; lang: string }) => (
  <>
    <h3 className="px-4 pt-8 pb-3 text-[18px] font-semibold tracking-tight">{tx.tplHeading}</h3>
    <div className="grid grid-cols-2 gap-3 px-4">
      {buildTemplates(tx).map((tpl, idx) => {
        const Icon = tpl.icon;
        return (
          <button key={idx} type="button" onClick={() => onPick(tpl)}
            className="flex flex-col text-left rounded-[22px] bg-[var(--sf)] p-4 transition-[transform,background-color] active:scale-[0.98] active:bg-[var(--ib)] [font-family:inherit]">
            <Icon size={22} strokeWidth={1.7} className="text-[var(--text)]" />
            <p className="mt-3.5 text-[15px] font-semibold leading-tight">{tpl.title}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-[var(--mu)] font-medium">{tpl.desc}</p>
            <span className="mt-auto pt-3.5">
              <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--ib)] text-[var(--mu)]">{tplMeta(tpl, tx, lang)}</span>
            </span>
          </button>
        );
      })}
    </div>
  </>
);

// ---------- kartu jadwal ----------
interface TaskCardProps {
  t: Task; tx: TxT; lang: string;
  onEdit: () => void; onRun: () => void; onPause: () => void; onResume: () => void; onRemove: () => void;
}
const TaskCard = ({ t, tx, lang, onEdit, onRun, onPause, onResume, onRemove }: TaskCardProps) => {
  const st = statusOf(t);
  const done = isDone(t);
  const badge = st === 'error' ? 'bg-red-500/10 text-red-500'
    : st === 'active' || st === 'running' ? 'bg-[var(--ac)] text-[var(--at)]'
    : 'bg-[var(--ib)] text-[var(--mu)]';
  const act = 'text-[13px] font-bold active:opacity-60 [font-family:inherit]';
  return (
    <div className="rounded-[20px] bg-[var(--sf)] p-4">
      <button onClick={onEdit} className="text-left w-full [font-family:inherit]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-[16px] leading-snug break-words">{t.title}</p>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0', badge)}>{stLabel(tx, st)}</span>
        </div>
        <p className="text-[13px] text-[var(--mu)] font-medium mt-1">{t.kind === 'reminder' ? tx.reminder : tx.aiTask} · {whenText(t, tx, lang)}</p>
        {t.active && t.nextRunAt && t.frequency !== 'once' && <p className="text-[12px] text-[var(--mu)] mt-0.5">{tx.next} {fmtDate(t.nextRunAt, lang)}</p>}
        {!t.active && t.lastRunAt && <p className="text-[12px] text-[var(--mu)] mt-0.5">{tx.lastRun} {fmtDate(t.lastRunAt, lang)}</p>}
        {st === 'error' && t.active && <p className="text-[12px] text-red-500 mt-1">{tx.failedHint}</p>}
      </button>
      <div className="flex items-center gap-5 mt-3">
        {t.active && (<>
          <button onClick={onRun} className={cn(act, 'text-[var(--text)]')}>{tx.run}</button>
          <button onClick={onPause} className={cn(act, 'text-[var(--text)]')}>{tx.pause}</button>
        </>)}
        {!t.active && !done && <button onClick={onResume} className={cn(act, 'text-[var(--text)]')}>{tx.resume}</button>}
        {done && <button onClick={onRun} className={cn(act, 'text-[var(--text)]')}>{tx.runAgain}</button>}
        <button onClick={onRemove} className={cn(act, 'text-red-500')}>{tx.del}</button>
      </div>
    </div>
  );
};

const EmptyTab = ({ tab, tx }: { tab: 'dijeda' | 'selesai'; tx: TxT }) => {
  const Icon = tab === 'dijeda' ? Pause : Check;
  return (
    <div className="flex flex-col items-center text-center px-8 pt-24">
      <div className="w-16 h-16 rounded-full bg-[var(--sf)] grid place-items-center text-[var(--mu)] mb-5">
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <h3 className="text-[17px] font-semibold">{tab === 'dijeda' ? tx.noPaused : tx.noDone}</h3>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-[var(--mu)] font-medium">
        {tab === 'dijeda' ? tx.noPausedDesc : tx.noDoneDesc}
      </p>
    </div>
  );
};

// ---------- halaman ----------
export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  const tx = usePageText('tasks', TEXT);
  const { lang } = useT();
  const dayShort = useMemo(() => dayNames(lang, 'short'), [lang]);
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
    if (push === 'unsupported') { setNotifyNote(tx.pushUnsupported); return; }
    if (push === 'on') { setNotify(true); return; }
    setNotifyBusy(true);
    const res = await enablePush();
    setPush(res.status);
    if (res.status === 'on') setNotify(true);
    else setNotifyNote(res.status === 'denied' ? tx.pushDenied : tx.pushNotGranted);
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
    if (!body.trim()) { setFormError(kind === 'reminder' ? tx.reqReminder : tx.reqAI); return; }
    if (!/^\d{2}:\d{2}$/.test(time)) { setFormError(tx.badTime); setSchedOpen(true); setCustomTime(true); return; }
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
      setFormError(tx.saveFail);
    } finally { setSaving(false); }
  };

  const runNow = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: true, nextRunAt: Date.now() });
      showNotice(tx.queued);
    } catch (e) { console.error(e); showNotice(tx.runFail); }
  };

  const pause = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: false, nextRunAt: null });
      showNotice(tx.paused);
    } catch (e) { console.error(e); showNotice(tx.pauseFail); }
  };

  const resume = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: true, nextRunAt: computeNextRun(Date.now(), t) });
      showNotice(tx.resumed);
    } catch (e) { console.error(e); showNotice(tx.resumeFail); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(tx.confirmDel.split('{t}').join(t.title))) return;
    try { await deleteDoc(doc(db, 'tasks', t.id)); } catch (e) { console.error(e); showNotice(tx.delFail); }
  };

  const circleBtn = 'w-10 h-10 rounded-full bg-[var(--sf)] grid place-items-center text-[var(--text)] transition-all active:scale-90 hover:bg-[var(--ib)]';
  const subLbl = 'mb-2 text-[13px] font-medium text-[var(--mu)]';
  const rem = kind === 'reminder';

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] absolute inset-0 z-[150]">
      {/* Header */}
      <div className="px-4 pt-4 pb-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <button onClick={onClose} aria-label={tx.back} className={circleBtn}>
            <ArrowLeft size={22} strokeWidth={2.2} />
          </button>
          <h1 className="text-[20px] font-medium tracking-tight">{tx.title}</h1>
        </div>
        <button onClick={() => openCreate()} aria-label={tx.create} className={circleBtn}>
          <Plus size={24} strokeWidth={2.2} />
        </button>
      </div>

      {/* Tab status */}
      <div className="flex gap-2 px-4 pt-2 pb-2.5 flex-shrink-0">
        {TAB_KEYS.map((key) => (
          <Chip key={key} active={tab === key} onClick={() => switchTab(key)}>
            {key === 'aktif' ? tx.stActive : key === 'dijeda' ? tx.stPaused : tx.stDone}{counts[key] > 0 && <span className="ml-1.5 opacity-60 font-bold">{counts[key]}</span>}
          </Chip>
        ))}
      </div>

      {/* Isi */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-10" style={{ scrollbarWidth: 'none' }}>
        {loading ? null : showHero ? (
          <>
            <Hero onCreate={() => openCreate()} tx={tx} />
            <Templates onPick={openCreate} tx={tx} lang={lang} />
          </>
        ) : visible.length === 0 ? (
          <EmptyTab tab={tab === 'selesai' ? 'selesai' : 'dijeda'} tx={tx} />
        ) : (
          <>
            <div className="flex flex-col gap-3 px-4 pt-1">
              {visible.map((t) => (
                <TaskCard key={t.id} t={t} tx={tx} lang={lang}
                  onEdit={() => openEdit(t)} onRun={() => runNow(t)} onPause={() => pause(t)}
                  onResume={() => resume(t)} onRemove={() => remove(t)} />
              ))}
            </div>
            {tab === 'aktif' && <Templates onPick={openCreate} tx={tx} lang={lang} />}
          </>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {notice && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.15 }}
            className="fixed left-4 right-4 bottom-8 z-[220] bg-[var(--ac)] text-[var(--at)] px-4 py-3 rounded-2xl text-[14px] font-semibold text-center">{notice}</motion.div>
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
              className="fixed inset-x-0 bottom-0 bg-[var(--bg)] rounded-t-[28px] border-t border-[var(--bd)] flex flex-col z-[210] transform-gpu will-change-transform">
              {/* Header form */}
              <div className="flex items-center justify-between px-4 pt-5 pb-1.5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setOpen(false)} aria-label={tx.close}
                    className="w-9 h-9 -ml-1 grid place-items-center rounded-full text-[var(--text)] hover:bg-[var(--ib)] transition-all active:scale-90">
                    <X size={26} strokeWidth={2} />
                  </button>
                  <h2 className="text-[20px] font-bold tracking-tight">{editingId ? tx.editTitle : tx.newTitle}</h2>
                </div>
                <button onClick={save} disabled={saving}
                  className="px-5 py-2.5 rounded-full bg-[var(--ac)] text-[var(--at)] text-[16px] font-semibold transition-all active:scale-95 disabled:opacity-50 [font-family:inherit]">
                  {saving ? tx.saving : editingId ? tx.save : tx.createBtn}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pt-2" style={{ scrollbarWidth: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)' }}>
                {/* Ikon */}
                <div className="w-[52px] h-[52px] rounded-[17px] mx-auto mt-1.5 mb-6 grid place-items-center bg-[var(--sf)] border border-[var(--bd)]">
                  {rem ? <Bell size={24} strokeWidth={1.8} /> : <Clock size={24} strokeWidth={1.8} />}
                </div>

                {/* Nama (opsional) */}
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tx.namePh}
                  className="w-full h-[54px] rounded-[20px] bg-[var(--sf)] border border-[var(--bd)] focus:border-[var(--mu)] px-4 text-[17px] font-medium text-[var(--text)] outline-none transition-colors placeholder:text-[var(--mu)] [font-family:inherit]" />

                {/* Jadwal */}
                <Lbl>{tx.schedule}</Lbl>
                <button type="button" onClick={() => setSchedOpen((v) => !v)} aria-expanded={schedOpen}
                  className={cn('w-full h-[54px] rounded-[20px] bg-[var(--sf)] border px-4 flex items-center gap-3.5 text-left transition-colors [font-family:inherit]', schedOpen ? 'border-[var(--mu)]' : 'border-[var(--bd)]')}>
                  <Clock size={20} strokeWidth={1.9} className="text-[var(--mu)] flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate text-[17px] font-medium">{schedSummary(frequency, time, weekday, tx, lang)}</span>
                  <ChevronDown size={20} strokeWidth={2} className={cn('text-[var(--mu)] flex-shrink-0 transition-transform duration-300', schedOpen && 'rotate-180')} />
                </button>
                <div aria-hidden={!schedOpen} className={cn('grid transition-[grid-template-rows] duration-300 ease-out', schedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <div className="overflow-hidden">
                    <div className="mt-2.5 rounded-[20px] bg-[var(--sf)] border border-[var(--bd)] p-4">
                      <p className={subLbl}>{tx.repeat}</p>
                      <div className="flex flex-wrap gap-2">
                        {freqOptions.map((f) => <Chip key={f} onSurface active={frequency === f} onClick={() => setFrequency(f)}>{freqLabel(tx, f)}</Chip>)}
                      </div>
                      {frequency === 'weekly' && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                          {dayShort.map((d, i) => <Chip key={i} onSurface active={weekday === i} onClick={() => setWeekday(i)}>{d}</Chip>)}
                        </div>
                      )}

                      <p className={cn(subLbl, 'mt-4')}>{tx.hour}</p>
                      <div className="flex flex-wrap gap-2">
                        {TIME_PRESETS.map((p, i) => (
                          <Chip key={p.time} onSurface active={!showCustom && time === p.time} onClick={() => { setTime(p.time); setCustomTime(false); }}>
                            {tx.pre[i]}<span className="ml-1.5 opacity-60 font-medium">{p.time}</span>
                          </Chip>
                        ))}
                        <Chip onSurface active={showCustom} onClick={() => setCustomTime(true)}>{tx.otherHour}</Chip>
                      </div>
                      {showCustom && (
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                          className="mt-3 w-full h-12 rounded-xl bg-[var(--ib)] px-4 text-[16px] font-semibold text-[var(--text)] outline-none [font-family:inherit]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Instruksi */}
                <Lbl>{tx.instr}</Lbl>
                <div className="rounded-[22px] bg-[var(--sf)] border border-[var(--bd)] focus-within:border-[var(--mu)] p-4 transition-colors">
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                    placeholder={rem ? tx.phReminder : tx.phAI}
                    className="block w-full min-h-[120px] bg-transparent outline-none resize-none text-[17px] leading-snug text-[var(--text)] placeholder:text-[var(--mu)] [font-family:inherit]" />
                </div>

                {/* Notifikasi */}
                <Lbl>{tx.notif}</Lbl>
                <div className="rounded-[22px] overflow-hidden flex flex-col gap-[2px]">
                  <div className="flex items-center gap-3.5 min-h-[62px] px-4 bg-[var(--sf)]">
                    <Bell size={22} strokeWidth={1.8} className="text-[var(--mu)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold">{tx.notif}</p>
                      {notifyBusy && <p className="text-[12px] text-[var(--mu)] font-medium">{tx.enabling}</p>}
                    </div>
                    <Switch checked={notifyBusy ? !notify : notify} onChange={toggleNotify} disabled={notifyBusy} />
                  </div>
                  {editingId && (
                    <div className="flex items-center gap-3.5 min-h-[62px] px-4 bg-[var(--sf)]">
                      <Clock size={22} strokeWidth={1.8} className="text-[var(--mu)] flex-shrink-0" />
                      <p className="flex-1 text-[17px] font-semibold">{tx.schedActive}</p>
                      <Switch checked={active} onChange={() => setActive(!active)} />
                    </div>
                  )}
                </div>
                {notifyNote && <p className="text-[13px] text-[var(--mu)] mt-2.5 px-1">{notifyNote}</p>}

                {formError && <p className="text-[13px] font-semibold text-red-500 mt-4 px-1">{formError}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
