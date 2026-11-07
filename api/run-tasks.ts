// api/run-tasks.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, DocumentReference } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenAI } from '@google/genai';

const BATCH_SIZE = 5;
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

function getGeminiKeys(): string[] {
  const env = process.env;
  let names = Object.keys(env).filter((k) => /^(VITE_)?GEMINI_API_KEY\d*$/i.test(k) && env[k]);
  if (names.length === 0) {
    names = Object.keys(env).filter((k) => /GEMINI|GENAI/i.test(k) && !/MODEL/i.test(k) && env[k]);
  }
  return Array.from(new Set(names.map((k) => env[k] as string)));
}

const clock = (ms: number, tz: string) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Jakarta' });

async function sendPush(task: TaskDoc & { id: string }, chatId: string, text: string) {
  const snap = await db.collection(`users/${task.uid}/fcmTokens`).get();
  if (snap.empty) return;
  const tokens = snap.docs.map((d) => d.get('token') as string).filter(Boolean);
  if (!tokens.length) return;

  const body = text.replace(/[#*_>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: `⏰ ${task.title}`, body: body || 'Your task is done.' },
    data: { chatId },
    webpush: {
      fcmOptions: { link: 'https://www.cylenai.com/' },
      notification: {
        icon: 'https://www.cylenai.com/IMG_20260129_193319_637.webp',
        badge: 'https://www.cylenai.com/82374-removebg-preview.png',
      },
    },
  });

  const cleanup: Promise<unknown>[] = [];
  res.responses.forEach((r, i) => {
    const code = r.error?.code;
    if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
      cleanup.push(snap.docs[i].ref.delete());
    }
  });
  await Promise.all(cleanup);
}

async function runTask(task: TaskDoc & { id: string }, index: number) {
  const ref = db.collection('tasks').doc(task.id);
  try {
    const keys = getGeminiKeys();
    if (keys.length === 0) throw new Error('Gemini API key tidak ditemukan di server');

    const tz = task.tz || 'Asia/Jakarta';
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });

    // Coba semua key (mulai dari yang acak) sampai ada yang berhasil
    const start = Math.floor(Math.random() * keys.length);
    let res: any = null;
    let lastErr: any = null;
    for (let i = 0; i < keys.length; i++) {
      try {
        const ai = new GoogleGenAI({ apiKey: keys[(start + i) % keys.length] });
        res = await ai.models.generateContent({
          model: MODEL,
          contents: task.prompt,
          config: {
            systemInstruction:
              `Kamu Cylen, asisten AI. Ini tugas terjadwal otomatis bernama "${task.title}". ` +
              `Waktu sekarang: ${nowStr} (${tz}). Jawab langsung ke intinya tanpa basa-basi pembuka, ` +
              `dan jangan bertanya balik karena user tidak sedang online.`,
            tools: [{ googleSearch: {} }],
          },
        });
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!res) throw lastErr || new Error('Gemini tidak merespons');

    const text = (res.text || '').trim();
    if (!text) throw new Error('Gemini returned an empty response');

    const nowMs = Date.now();
    const chatId = String(nowMs + index);
    const stamp = clock(nowMs, tz);

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

    await sendPush(task, chatId, text).catch((e) => console.error('Push gagal:', e));
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
  const snap = await db.collection('tasks').where('nextRunAt', '<=', now).orderBy('nextRunAt').limit(BATCH_SIZE).get();

  const claimed: (TaskDoc & { id: string })[] = [];
  for (const d of snap.docs) {
    const t = await claim(d.ref, now);
    if (t) claimed.push(t);
  }

  await Promise.all(claimed.map((t, i) => runTask(t, i)));
  return res.status(200).json({ due: snap.size, ran: claimed.length });
}
