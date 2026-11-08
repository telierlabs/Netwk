import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, AlarmClock, X, Play, Trash2, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { enablePush, disablePush, getPushStatus, type PushStatus } from '../lib/pushNotifications';

interface TasksPageProps {
  onClose: () => void;
}

// Batas task per user. Nanti tinggal bedain free vs berbayar (pakai data langganan lo).
const MAX_TASKS = 3;

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';

const FREQ_LABEL: Record<Frequency, string> = {
  once: 'Once',
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekly: 'Weekly',
};
const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Task {
  id: string;
  uid: string;
  title: string;
  prompt: string;
  frequency: Frequency;
  time: string; // "HH:mm" jam lokal user
  weekday: number; // 0-6, dipakai kalau weekly
  tz: string;
  tzOffsetMin: number; // mis. WIB = 420
  active: boolean;
  nextRunAt: number | null; // null = nggak dijadwalkan (dijeda / sekali-jalan sudah selesai)
  lastRunAt?: number;
  lastStatus?: 'running' | 'ok' | 'error' | 'retrying';
  lastError?: string;
  createdAt: number;
}

// Hitung kapan task jalan berikutnya (ms UTC). LOGIKA INI HARUS SAMA dengan di api/run-tasks.ts
function computeNextRun(
  fromMs: number,
  t: { time: string; frequency: Frequency; weekday: number; tzOffsetMin: number },
): number {
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

const formatNext = (t: Task) => {
  if (!t.active || !t.nextRunAt) return t.frequency === 'once' && t.lastStatus ? 'Done' : 'Paused';
  return new Date(t.nextRunAt).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const summary = (t: Task) => {
  const when = t.frequency === 'weekly' ? `${FREQ_LABEL.weekly} ${DAY_LABEL[t.weekday]}` : FREQ_LABEL[t.frequency];
  return `${when}, ${t.time}`;
};

// Input dengan floating label (terkontrol)
const GrokInput = ({ label, value, onChange, type = 'text', placeholder = '', isTextArea = false }: any) => (
  <div className="relative bg-[var(--text)]/5 rounded-2xl px-4 py-2 pt-6 border border-transparent focus-within:border-[var(--text)]/30 transition-all">
    <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">
      {label}
    </label>
    {isTextArea ? (
      <textarea
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold resize-none placeholder:text-[var(--text)]/20"
      />
    ) : (
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold placeholder:text-[var(--text)]/20"
      />
    )}
  </div>
);

// Toggle terkontrol
const Switch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={cn('w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300 flex-shrink-0', checked ? 'bg-[var(--text)]' : 'bg-[var(--text)]/20', disabled && 'opacity-60')}
  >
    <div className={cn('w-5 h-5 rounded-full bg-[var(--bg)] transition-transform duration-300 shadow-sm', checked ? 'translate-x-5' : 'translate-x-0')} />
  </button>
);

const Chip = ({ active, children, onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className={cn('px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all active:scale-95', active ? 'bg-[var(--text)] text-[var(--bg)]' : 'bg-[var(--text)]/10 text-[var(--text)]/70')}
  >
    {children}
  </button>
);

export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  // form
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [time, setTime] = useState('07:00');
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [prompt, setPrompt] = useState('');

  const uid = auth?.currentUser?.uid;

  // Push notifications
  const [push, setPush] = useState<PushStatus>('off');
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => { setPush(getPushStatus(uid)); }, [uid]);

  // Daftar task realtime
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'tasks'), where('uid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTasks(list);
        setLoading(false);
      },
      (err) => { console.error('Gagal load tasks:', err); setLoading(false); },
    );
    return () => unsub();
  }, [uid]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const togglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (push === 'on') {
        await disablePush();
        setPush('off');
        showNotice('Push notifications turned off.');
      } else {
        const res = await enablePush();
        setPush(res.status);
        showNotice(res.status === 'on' ? 'Push notifications turned on.' : (res.message || 'Could not turn on notifications.'));
      }
    } finally {
      setPushBusy(false);
    }
  };

  const openCreate = () => {
    if (tasks.length >= MAX_TASKS) { showNotice(`You can have up to ${MAX_TASKS} tasks.`); return; }
    setEditingId(null);
    setTitle(''); setFrequency('daily'); setTime('07:00'); setWeekday(new Date().getDay()); setPrompt('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingId(t.id);
    setTitle(t.title); setFrequency(t.frequency); setTime(t.time); setWeekday(t.weekday ?? 0); setPrompt(t.prompt);
    setFormError('');
    setIsCreateOpen(true);
  };

  const save = async () => {
    if (!uid || saving) return;
    if (!title.trim() || !prompt.trim()) { setFormError('Title and prompt are required.'); return; }
    if (!/^\d{2}:\d{2}$/.test(time)) { setFormError('Pick a valid time.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const tzOffsetMin = -new Date().getTimezoneOffset();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const base = { title: title.trim(), prompt: prompt.trim(), frequency, time, weekday, tz, tzOffsetMin };

      if (editingId) {
        const current = tasks.find((t) => t.id === editingId);
        const active = current?.active ?? true;
        await updateDoc(doc(db, 'tasks', editingId), {
          ...base,
          nextRunAt: active ? computeNextRun(Date.now(), base) : null,
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...base,
          uid,
          active: true,
          nextRunAt: computeNextRun(Date.now(), base),
          createdAt: Date.now(),
        });
      }
      setIsCreateOpen(false);
    } catch (e) {
      console.error(e);
      setFormError('Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Task) => {
    try {
      const turningOn = !t.active;
      await updateDoc(doc(db, 'tasks', t.id), {
        active: turningOn,
        nextRunAt: turningOn ? computeNextRun(Date.now(), t) : null,
      });
    } catch (e) { console.error(e); showNotice('Could not update the task.'); }
  };

  const runNow = async (t: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', t.id), { active: true, nextRunAt: Date.now() });
      showNotice('Queued. It runs within a minute and shows up in your chat history.');
    } catch (e) { console.error(e); showNotice('Could not queue the task.'); }
  };

  const remove = async (t: Task) => {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    try { await deleteDoc(doc(db, 'tasks', t.id)); } catch (e) { console.error(e); showNotice('Could not delete the task.'); }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] font-sans absolute inset-0 z-[150]">

      {/* HEADER */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-none">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
          >
            <ArrowLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Automations</h1>
        </div>
        <button
          onClick={openCreate}
          className="p-2 -mr-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
        >
          <Plus size={26} strokeWidth={2.2} />
        </button>
      </div>

      {/* PUSH NOTIFICATIONS */}
      {push !== 'unsupported' && (
        <div className="mx-4 mt-1 mb-2 flex items-center justify-between gap-3 rounded-2xl bg-[var(--text)]/5 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bell size={18} strokeWidth={2.2} className="text-[var(--text)]/70 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[14px] font-bold">Push notifications</p>
              <p className="text-[12px] text-[var(--text)]/50 font-medium">
                {pushBusy
                  ? (push === 'on' ? 'Turning off…' : 'Turning on…')
                  : push === 'denied' ? 'Blocked in browser settings' : 'Get notified when a task finishes'}
              </p>
            </div>
          </div>
          <Switch checked={pushBusy ? push !== 'on' : push === 'on'} onChange={togglePush} disabled={pushBusy} />
        </div>
      )}

      {loading ? (
        <div className="flex-1" />
      ) : tasks.length === 0 ? (
        /* EMPTY STATE */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 relative flex items-center justify-center">
            <AlarmClock size={56} className="text-[var(--text)]/80" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 bg-[var(--bg)] rounded-full p-1 border-[3px] border-[var(--bg)]">
              <Plus size={16} className="text-[var(--text)]/80" strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-[20px] font-bold tracking-tight mb-2 text-[var(--text)]">Get started by adding a task</h2>
          <p className="text-[var(--text)]/50 mb-8 max-w-[260px] text-[14px] leading-relaxed font-medium">
            Schedule a task to automate actions and get the result in your chat history.
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] px-6 py-3.5 rounded-[20px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span className="text-[15px]">Create task</span>
          </button>
        </div>
      ) : (
        /* LIST */
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
          {tasks.map((t) => (
            <div key={t.id} className="rounded-2xl bg-[var(--text)]/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => openEdit(t)} className="text-left flex-1 min-w-0">
                  <p className="font-bold text-[16px] truncate">{t.title}</p>
                  <p className="text-[13px] text-[var(--text)]/50 font-medium mt-0.5">{summary(t)}</p>
                </button>
                <Switch checked={t.active} onChange={() => toggleActive(t)} />
              </div>

              <p className="text-[12px] text-[var(--text)]/45 font-medium mt-3">
                Next: {formatNext(t)}
                {t.lastStatus === 'ok' && t.lastRunAt ? ` · Last run ${new Date(t.lastRunAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
              {t.lastStatus === 'error' && (
                <p className="text-[12px] text-red-500 font-medium mt-1">Couldn't run this time. Tap Run now to try again.</p>
              )}
              {t.lastStatus === 'retrying' && (
                <p className="text-[12px] text-[var(--text)]/45 font-medium mt-1">Retrying shortly…</p>
              )}
              {t.lastStatus === 'running' && (
                <p className="text-[12px] text-[var(--text)]/45 font-medium mt-1">Running…</p>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => runNow(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--text)]/10 text-[13px] font-bold transition-all active:scale-95"
                >
                  <Play size={13} strokeWidth={2.5} /> Run now
                </button>
                <button
                  onClick={() => remove(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                >
                  <Trash2 size={13} strokeWidth={2.5} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NOTICE */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-4 right-4 bottom-8 z-[220] bg-[var(--text)] text-[var(--bg)] px-4 py-3 rounded-2xl text-[14px] font-semibold text-center"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET (CREATE / EDIT) */}
      <AnimatePresence>
        {isCreateOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transform-gpu"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90dvh] bg-[var(--bg)] rounded-t-[32px] flex flex-col z-[210] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transform-gpu will-change-transform"
            >
              <div className="w-10 h-1.5 bg-[var(--text)]/15 rounded-full mx-auto mt-3 mb-2" />

              <div className="flex items-center justify-between px-4 pb-4">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
                >
                  <X size={24} strokeWidth={2.2} />
                </button>
                <h2 className="text-[18px] font-bold text-[var(--text)] tracking-tight">{editingId ? 'Edit Task' : 'Create Task'}</h2>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] font-bold rounded-full text-[14px] transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
                <GrokInput label="Title" placeholder="e.g. Morning Briefing" value={title} onChange={setTitle} />

                <div className="bg-[var(--text)]/5 rounded-2xl px-4 py-3 pt-6 relative">
                  <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">Frequency</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
                      <Chip key={f} active={frequency === f} onClick={() => setFrequency(f)}>{FREQ_LABEL[f]}</Chip>
                    ))}
                  </div>
                  {frequency === 'weekly' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {DAY_LABEL.map((d, i) => (
                        <Chip key={d} active={weekday === i} onClick={() => setWeekday(i)}>{d}</Chip>
                      ))}
                    </div>
                  )}
                </div>

                <GrokInput label="Time" type="time" value={time} onChange={setTime} />
                <GrokInput label="Prompt" isTextArea placeholder="e.g. Summarize today's top tech news in 5 bullet points." value={prompt} onChange={setPrompt} />

                {formError && <p className="text-[13px] font-semibold text-red-500 px-1">{formError}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
