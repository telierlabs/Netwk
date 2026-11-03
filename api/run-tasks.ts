// api/run-tasks.ts  (taruh di folder /api di root project, sejajar dengan /src)
//
// Dipanggil tiap menit oleh cron-job.org. Alurnya:
//   1. Cek header rahasia (CRON_SECRET)
//   2. Ambil task yang sudah jatuh tempo dari Firestore
//   3. "Klaim" tiap task (transaksi) supaya nggak jalan dobel, sekaligus set jadwal berikutnya
//   4. Panggil Gemini, simpan hasilnya jadi chat baru di users/{uid}/chats
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, DocumentReference } from 'firebase-admin/firestore';
import { GoogleGenAI } from '@google/genai';

const BATCH_SIZE = 5; // maksimal task yang diproses per panggilan (jaga limit Gemini free tier + batas waktu function)
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
}
const db = getFirestore();

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';
interface TaskDoc {
  uid: string;
  title: string;
  prompt: string;
  frequency: Frequency;
  time: string;
  weekday: number;
  tz: string;
  tzOffsetMin: number;
  active: boolean;
  nextRunAt: number | null;
}

// SAMA PERSIS dengan computeNextRun di TasksPage.tsx
function computeNextRun(fromMs: number, t: Pick<TaskDoc, 'time' | 'frequency' | 'weekday' | 'tzOffsetMin'>): number {
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

// Klaim task: kalau sudah diambil proses lain / sudah nggak jatuh tempo → null
async function claim(ref: DocumentReference, now: number): Promise<(TaskDoc & { id: string }) | null> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const t = snap.data() as TaskDoc | undefined;
    if (!t || !t.active || typeof t.nextRunAt !== 'number' || t.nextRunAt > now) return null;
    const isOnce = t.frequency === 'once';
    tx.update(ref, {
      nextRunAt: isOnce ? null : computeNextRun(now, t),
      active: !isOnce,
      lastRunAt: now,
      lastStatus: 'running',
      lastError: '',
    });
    return { id: ref.id, ...t };
  });
}

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 2500));
    }
  }
  throw lastErr;
}

const clock = (ms: number, tz: string) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Jakarta' });

async function runTask(task: TaskDoc & { id: string }, index: number) {
  const ref = db.collection('tasks').doc(task.id);
  try {
    // Pakai key Gemini yang SUDAH ada di Vercel, apa pun namanya di antara ini
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.API_KEY;
    if (!apiKey) throw new Error('Gemini API key belum ada di Environment Variables Vercel');
    const ai = new GoogleGenAI({ apiKey });
    const tz = task.tz || 'Asia/Jakarta';
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });

    const res = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        contents: task.prompt,
        config: {
          systemInstruction:
            `Kamu Cylen, asisten AI. Ini tugas terjadwal otomatis bernama "${task.title}". ` +
            `Waktu sekarang: ${nowStr} (${tz}). Jawab langsung ke intinya tanpa basa-basi pembuka, ` +
            `dan jangan bertanya balik karena user tidak sedang online.`,
          tools: [{ googleSearch: {} }],
        },
      }),
    );

    const text = (res.text || '').trim();
    if (!text) throw new Error('Gemini returned an empty response');

    const nowMs = Date.now();
    const chatId = String(nowMs + index); // harus berupa angka: useChat mengurutkan chat pakai Number(id)
    const stamp = clock(nowMs, tz);

    // Bentuk dokumen = ChatSession di useChat (+ fromTask supaya app bisa menangkapnya realtime)
    await db.doc(`users/${task.uid}/chats/${chatId}`).set({
      id: chatId,
      title: `⏰ ${task.title}`,
      date: stamp,
      isTemporary: false,
      fromTask: true,
      taskId: task.id,
      messages: [
        { role: 'user', content: task.prompt, timestamp: stamp },
        { role: 'assistant', content: text, timestamp: stamp, suggestions: [] },
      ],
    });

    await ref.update({ lastStatus: 'ok', lastChatId: chatId, lastError: '' });
  } catch (e: any) {
    console.error(`Task ${task.id} gagal:`, e);
    await ref.update({ lastStatus: 'error', lastError: String(e?.message || e).slice(0, 200) }).catch(() => {});
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = Date.now();
  // nextRunAt null (dijeda / selesai) otomatis nggak ikut karena range filter hanya cocok ke angka
  const snap = await db.collection('tasks').where('nextRunAt', '<=', now).orderBy('nextRunAt').limit(BATCH_SIZE).get();

  const claimed: (TaskDoc & { id: string })[] = [];
  for (const d of snap.docs) {
    const t = await claim(d.ref, now);
    if (t) claimed.push(t);
  }

  await Promise.all(claimed.map((t, i) => runTask(t, i)));
  return res.status(200).json({ due: snap.size, ran: claimed.length });
}
