// api/run-tasks.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, DocumentReference, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenAI } from '@google/genai';

const BATCH_SIZE = 5;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite'; // dipakai kalau model utama lagi sibuk
const MAX_RETRY = 3; // tugas AI sekali-jalan yang gagal dicoba ulang otomatis sampai 3x

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
}
const db = getFirestore();

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';
interface TaskDoc {
  uid: string;
  title: string;
  prompt: string;
  kind?: 'reminder' | 'ai'; // reminder = cuma kirim notifikasi berisi teks, ai = AI mengerjakan perintah
  frequency: Frequency;
  time: string;
  weekday: number;
  tz: string;
  tzOffsetMin: number;
  active: boolean;
  nextRunAt: number | null;
  attempts?: number;
  notify?: boolean; // false = jangan kirim notifikasi push untuk jadwal ini
  // asal chat (diisi saat jadwal dibuat dari chat): pengingat dibalas di chat yang sama
  chatId?: string;
  groupId?: string;
  aiName?: string;
  aiModel?: string;
}
type Task = TaskDoc & { id: string };

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

async function claim(ref: DocumentReference, now: number): Promise<Task | null> {
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

// ─────────────────────────────────────────────
// KEY GEMINI: key yang mati (project di-suspend / tidak valid) dilewati otomatis
// ─────────────────────────────────────────────
interface KeyInfo { name: string; key: string }

function getGeminiKeys(): KeyInfo[] {
  const env = process.env;
  let names = Object.keys(env).filter((k) => /^(VITE_)?GEMINI_API_KEY\d*$/i.test(k) && env[k]);
  if (names.length === 0) {
    names = Object.keys(env).filter((k) => /GEMINI|GENAI/i.test(k) && !/MODEL/i.test(k) && env[k]);
  }
  const seen = new Set<string>();
  const out: KeyInfo[] = [];
  for (const name of names) {
    const key = env[name] as string;
    if (!seen.has(key)) { seen.add(key); out.push({ name, key }); }
  }
  return out;
}

// key -> waktu (ms) sampai dianggap sudah boleh dicoba lagi. Hidup selama server "hangat".
const deadKeys = new Map<string, number>();
const DEAD_FOR_MS = 30 * 60 * 1000;

type FailKind = 'dead' | 'busy' | 'other';
function failKind(e: any): FailKind {
  const m = String(e?.message || e || '').toLowerCase();
  if (
    m.includes('permission_denied') || m.includes('suspended') ||
    m.includes('api key not valid') || m.includes('api_key_invalid') ||
    m.includes('"code":403') || m.includes('"code":401') ||
    (m.includes('"code":400') && m.includes('api key'))
  ) return 'dead';
  if (
    m.includes('429') || m.includes('resource_exhausted') || m.includes('quota') ||
    m.includes('503') || m.includes('overloaded') || m.includes('unavailable') || m.includes('deadline')
  ) return 'busy';
  return 'other';
}

// Pesan untuk USER: ramah, tanpa kode teknis. Detail asli hanya masuk log server.
function friendlyError(e: any): string {
  const k = failKind(e);
  if (k === 'busy') return 'AI sedang sibuk. Coba lagi sebentar lagi.';
  if (k === 'dead') return 'AI sedang tidak bisa dihubungi. Coba lagi nanti.';
  return 'Tugas ini belum bisa dijalankan. Coba lagi nanti.';
}

// opts.contents  = isi permintaan (default: task.prompt)
// opts.search    = false → tanpa Google Search & tanpa "berpikir" (dipakai untuk kalimat pengingat singkat)
async function generateWithFailover(
  task: Task,
  systemInstruction: string,
  opts: { contents?: string; search?: boolean } = {},
): Promise<any> {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error('NO_GEMINI_KEY');

  const models = [MODEL, FALLBACK_MODEL];
  let sawBusy = false;
  let lastErr: any = null;

  for (let mi = 0; mi < models.length; mi++) {
    if (mi === 1 && !sawBusy) break; // model cadangan cuma kalau tadi alasannya "sibuk"

    const now = Date.now();
    const healthy = keys.filter((k) => (deadKeys.get(k.key) || 0) < now);
    const dead = keys.filter((k) => !healthy.includes(k));
    const start = healthy.length ? Math.floor(Math.random() * healthy.length) : 0;
    const pool = [...healthy.slice(start), ...healthy.slice(0, start), ...dead];

    for (const k of pool) {
      try {
        const ai = new GoogleGenAI({ apiKey: k.key });
        return await ai.models.generateContent({
          model: models[mi],
          contents: opts.contents ?? task.prompt,
          config: {
            systemInstruction,
            ...(opts.search === false
              ? { temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } }
              : { tools: [{ googleSearch: {} }] }),
          },
        });
      } catch (e: any) {
        lastErr = e;
        const kind = failKind(e);
        if (kind === 'dead') {
          deadKeys.set(k.key, Date.now() + DEAD_FOR_MS);
          // Nama variabel (bukan isi key) dicatat di log Vercel supaya gampang ketahuan key mana yang mati
          console.error(`[run-tasks] Key "${k.name}" mati/tidak valid (project di-suspend atau key salah). Hapus atau ganti.`);
        } else if (kind === 'busy') {
          sawBusy = true;
        } else {
          console.error(`[run-tasks] Gemini error (${k.name}):`, e?.message);
        }
      }
    }
  }
  throw lastErr || new Error('Gemini tidak merespons');
}

const clock = (ms: number, tz: string) =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Jakarta' });

// Kirim notifikasi push ke semua HP/browser/laptop user. Mengembalikan jumlah perangkat yang berhasil dikirimi.
async function sendPush(task: Task, chatId: string, text: string, title?: string, ttlSeconds?: number): Promise<number> {
  const snap = await db.collection(`users/${task.uid}/fcmTokens`).get();
  if (snap.empty) return 0;
  const tokens = snap.docs.map((d) => d.get('token') as string).filter(Boolean);
  if (!tokens.length) return 0;

  const body = text.replace(/[#*_>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: title || task.title, body: body || 'Your task is done.' },
    data: { chatId },
    webpush: {
      // Pengingat: kalau HP offline lebih lama dari ttlSeconds, pesan dibuang (nggak datang basi). Urgency tinggi supaya cepat.
      headers: { Urgency: 'high', ...(ttlSeconds ? { TTL: String(ttlSeconds) } : {}) },
      fcmOptions: { link: 'https://www.cylenai.com/' },
      notification: {
        icon: 'https://www.cylenai.com/IMG_20260129_193319_637.webp',
        badge: 'https://www.cylenai.com/notif-badge.png',
      },
    },
  });

  const cleanup: Promise<unknown>[] = [];
  let delivered = 0;
  res.responses.forEach((r, i) => {
    if (r.success) delivered++;
    const code = r.error?.code;
    if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
      cleanup.push(snap.docs[i].ref.delete());
    }
  });
  await Promise.all(cleanup);
  return delivered;
}

// Simpan hasil ke riwayat chat user (muncul realtime di sidebar)
async function writeChat(task: Task, index: number, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const tz = task.tz || 'Asia/Jakarta';
  const nowMs = Date.now();
  const chatId = String(nowMs + index); // harus angka: useChat mengurutkan chat pakai Number(id)
  const stamp = clock(nowMs, tz);
  await db.doc(`users/${task.uid}/chats/${chatId}`).set({
    id: chatId,
    title: task.title,
    date: stamp,
    isTemporary: false,
    fromTask: true,
    taskId: task.id,
    messages: messages.map((m) => ({ ...m, timestamp: stamp, suggestions: [] })),
  });
  return chatId;
}

// Balas di chat ASAL jadwal dibuat (chat pribadi atau grup). Mengembalikan id chat/grup,
// atau '' kalau chat-nya sudah tidak ada (mis. chat sementara / sudah dihapus).
async function postToThread(task: Task, text: string): Promise<string> {
  const tz = task.tz || 'Asia/Jakarta';
  const nowMs = Date.now();
  const stamp = clock(nowMs, tz);
  const rid = `rem-${task.id}-${nowMs}`; // dipakai client untuk mencegah pesan dobel

  if (task.groupId) {
    const gref = db.doc(`groups/${task.groupId}`);
    if (!(await gref.get()).exists) return '';
    await gref.update({
      messages: FieldValue.arrayUnion({
        role: 'assistant',
        content: text,
        images: [],
        timestamp: stamp,
        senderName: task.aiName || 'Cylen',
        ...(task.aiModel ? { aiModel: task.aiModel } : {}),
        rid,
        isReminderFire: true,
      }),
    });
    return task.groupId;
  }

  if (task.chatId) {
    const cref = db.doc(`users/${task.uid}/chats/${task.chatId}`);
    if (!(await cref.get()).exists) return '';
    await cref.update({
      messages: FieldValue.arrayUnion({
        role: 'assistant',
        content: text,
        timestamp: stamp,
        suggestions: [],
        rid,
        isReminderFire: true,
      }),
      hasReminder: true, // client mendengarkan chat bertanda ini supaya balasan muncul realtime
      date: stamp,
    });
    return task.chatId;
  }

  return '';
}

// Kalimat pengingat gaya ngobrol, mis. "eh udah jam 15:49 ni katanya mau ngecas hp?"
async function casualReminder(task: Task): Promise<string> {
  const tz = task.tz || 'Asia/Jakarta';
  const hhmm = clock(Date.now(), tz);
  const fallback = `Eh udah jam ${hhmm} nih, waktunya ${task.prompt} ya!`;
  try {
    const res = await generateWithFailover(
      task,
      `Kamu Cylen, teman ngobrol yang santai. Tadi user minta diingatkan: "${task.prompt}". ` +
        `Sekarang jam ${hhmm}. Tulis SATU kalimat pendek (maks 25 kata) dalam bahasa Indonesia santai ala chat, ` +
        `seperti teman yang menyapa: sebut jamnya dan hal yang mau dia lakukan. ` +
        `Contoh gaya: "eh udah jam 15:49 ni katanya mau ngecas hp?". ` +
        `Tanpa tanda kutip, tanpa pembuka seperti "Halo", jangan formal.`,
      { contents: 'Tulis kalimat pengingatnya sekarang.', search: false },
    );
    const t = String(res.text || '').replace(/^["'“”\s]+|["'“”\s]+$/g, '').replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, 220) : fallback;
  } catch (e) {
    console.error('Kalimat pengingat AI gagal, pakai template:', e);
    return fallback;
  }
}

// Pengingat biasa: balas di chat asal dengan kalimat santai + kirim notifikasi dengan isi yang sama.
async function runReminder(task: Task, index: number) {
  const ref = db.collection('tasks').doc(task.id);
  const text = await casualReminder(task);

  let chatId = await postToThread(task, text).catch((e) => {
    console.error('Balas ke chat asal gagal:', e);
    return '';
  });

  const delivered = task.notify === false
    ? 0
    : await sendPush(task, chatId, text, `Pengingat · ${task.title}`, 18000).catch((e) => {
        console.error('Push pengingat gagal:', e);
        return 0;
      });

  // Tidak ada chat asal (chat sementara / terhapus / dibuat dari halaman Automasi) dan push tidak sampai:
  // pengingat tetap sampai lewat riwayat chat baru
  if (!chatId && delivered === 0) {
    chatId = await writeChat(task, index, [{ role: 'assistant', content: text }]);
  }
  await ref.update({ lastStatus: 'ok', lastChatId: chatId, lastError: '', attempts: 0 });
}

async function runAiTask(task: Task, index: number) {
  const ref = db.collection('tasks').doc(task.id);
  const tz = task.tz || 'Asia/Jakarta';
  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });

  const res = await generateWithFailover(
    task,
    `Kamu Cylen, asisten AI. Ini tugas terjadwal otomatis bernama "${task.title}". ` +
      `Waktu sekarang: ${nowStr} (${tz}). Jawab langsung ke intinya tanpa basa-basi pembuka, ` +
      `dan jangan bertanya balik karena user tidak sedang online.`,
  );

  const text = (res.text || '').trim();
  if (!text) throw new Error('EMPTY_RESPONSE');

  const chatId = await writeChat(task, index, [
    { role: 'user', content: task.prompt },
    { role: 'assistant', content: text },
  ]);
  await ref.update({ lastStatus: 'ok', lastChatId: chatId, lastError: '', attempts: 0 });

  // Kalau push gagal, task tetap dianggap berhasil
  if (task.notify !== false) await sendPush(task, chatId, text).catch((e) => console.error('Push gagal:', e));
}

async function runTask(task: Task, index: number) {
  const ref = db.collection('tasks').doc(task.id);
  try {
    if (task.kind === 'reminder') await runReminder(task, index);
    else await runAiTask(task, index);
  } catch (e: any) {
    // Detail teknis HANYA ke log server, tidak pernah ke user
    console.error(`Task ${task.id} gagal:`, e);
    const attempts = task.attempts || 0;
    if (task.frequency === 'once' && task.kind !== 'reminder' && attempts < MAX_RETRY) {
      // Tugas sekali-jalan: coba lagi otomatis 90 detik kemudian, user tidak melihat error apa pun
      await ref
        .update({ active: true, nextRunAt: Date.now() + 90000, attempts: attempts + 1, lastStatus: 'retrying', lastError: '' })
        .catch(() => {});
    } else {
      await ref.update({ lastStatus: 'error', lastError: friendlyError(e), attempts: 0 }).catch(() => {});
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = Date.now();
  const snap = await db.collection('tasks').where('nextRunAt', '<=', now).orderBy('nextRunAt').limit(BATCH_SIZE).get();

  const claimed: Task[] = [];
  for (const d of snap.docs) {
    const t = await claim(d.ref, now);
    if (t) claimed.push(t);
  }

  await Promise.all(claimed.map((t, i) => runTask(t, i)));
  return res.status(200).json({ due: snap.size, ran: claimed.length });
}
