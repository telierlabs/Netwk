// src/lib/reminderIntent.ts
//
// Kalau user ngetik di chat (pribadi atau grup lewat @AI) hal seperti:
//   "ingetin gua jam 5 sore beli susu"   |   "tiap pagi jam 7 ringkas berita teknologi"
// → otomatis dibuat jadi task di koleksi `tasks` (sama dengan halaman Automations).
//
// Alur di chat:
//   1) jadwal dipahami  → onUnderstood(ack) dipanggil (AI menjawab dulu: "Oke, jam 15:49 nanti aku ingetin…")
//   2) disimpan         → selama itu UI menampilkan pil "Membuat jadwal…"
//   3) selesai          → hasil `card` (pil final). Lonceng ditampilkan ScheduleCard hanya kalau push belum aktif.
// Task menyimpan asal chat-nya (chatId / groupId) supaya saat waktunya tiba, server membalas
// di chat yang SAMA (lihat api/run-tasks.ts).
import { GoogleGenAI } from '@google/genai';
import { collection, addDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getActiveApiKey } from '../services/geminiService';
import { getPushStatus, startForegroundPush } from './pushNotifications';
import { AI_WORDS, STRONG_HINT, DAYS, computeNextRun, describeWhen, localParseSchedule } from './scheduleParse';
import type { Frequency, Parsed } from './scheduleParse';

const WEAK_HINT = /(jadwalkan|jadwalin|setiap|tiap)/i;

export interface ScheduleCardData {
  status: 'pending' | 'ok' | 'ask' | 'error';
  title: string;
  when?: string;
  kind?: 'reminder' | 'ai';
  notify?: boolean;
  taskId?: string;
  message?: string;
}
export interface ReminderResult { handled: boolean; reply?: string; card?: ScheduleCardData }

// Asal pesan: chat pribadi (chatId) atau grup (groupId + AI yang menjawab)
export interface ReminderOrigin {
  chatId?: string;
  groupId?: string;
  aiName?: string;
  aiModel?: string;
  /** Dipanggil begitu jadwal dipahami, SEBELUM disimpan. Dipakai untuk menampilkan jawaban AI + pil loading. */
  onUnderstood?: (ack: string) => void;
}

const askCard = (title: string, message: string, reply: string): ReminderResult => ({
  handled: true, reply, card: { status: 'ask', title, message },
});
const errorCard = (): ReminderResult => ({
  handled: true,
  reply: 'Jadwal belum bisa dibuat.',
  card: { status: 'error', title: 'Jadwal belum bisa dibuat', message: 'Coba lagi sebentar ya.' },
});

// Kalimat jawaban AI yang menunjukkan pesan user sudah dipahami (dibuat lokal: instan, tanpa panggilan AI)
function ackText(kind: 'reminder' | 'ai', frequency: Frequency, time: string, body: string): string {
  const every =
    frequency === 'daily' ? 'Tiap hari' :
    frequency === 'weekdays' ? 'Tiap hari kerja' :
    frequency === 'weekly' ? 'Tiap minggu' : '';
  const at = every ? `${every} jam ${time}` : `Jam ${time}`;
  const what = body.replace(/[.!?\s]+$/, '');
  return kind === 'ai'
    ? `Siap! ${at} aku kerjain ini buat kamu: ${what}.`
    : `Oke, noted! ${at} nanti aku ingetin kamu: ${what}.`;
}

// Bantuan AI untuk kalimat yang tidak bisa dibaca pembaca lokal (mis. "besok lusa ...", bahasa campur)
async function parseWithAI(text: string): Promise<Parsed | null> {
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const local = new Date(Date.now() + tzOffsetMin * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowLocal = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;

  const instruction = `Kamu parser jadwal. Tentukan apakah pesan user MEMINTA dibuatkan pengingat atau tugas terjadwal, lalu keluarkan JSON saja.
Waktu lokal user sekarang: ${nowLocal} (hari ${DAYS[local.getUTCDay()]}). Semua jam 24 jam, zona waktu lokal user.
Format: {"isTask":boolean,"kind":"reminder"|"ai","title":string,"text":string,"frequency":"once"|"daily"|"weekdays"|"weekly","time":"HH:mm"|null,"weekday":0-6|null,"date":"YYYY-MM-DD"|null}
Aturan: isTask=true HANYA kalau user jelas minta diingatkan/dijadwalkan. kind="reminder" = cukup notifikasi berisi teks; kind="ai" = AI harus mengerjakan sesuatu (ringkas berita, kasih ide) lalu mengirim hasilnya. title maksimal 40 karakter tanpa emoji. text: isi pengingat singkat, atau perintah lengkap untuk AI. time: jam yang disebut (5 sore = 17:00), waktu relatif dihitung dari sekarang, tidak disebut = null. date hanya untuk "once" (YYYY-MM-DD). weekday hanya untuk weekly (0=Minggu).`;

  let lastErr: unknown = null;
  for (let i = 0; i < 3; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nPesan user:\n${text}` }] }],
        config: { responseMimeType: 'application/json', temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
      });
      return JSON.parse((res.text || '').replace(/```json|```/g, '').trim()) as Parsed;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// AI merapikan pesan user: judul pendek, inti kegiatan, dan kalimat jawaban santai yang menunjukkan pesan dipahami.
// Kalau gagal (key habis / offline), pemanggil memakai hasil pembaca lokal.
async function polishWithAI(
  text: string,
  info: { kind: 'reminder' | 'ai'; frequency: Frequency; time: string },
): Promise<{ title: string; task: string; ack: string } | null> {
  const freq = ({ once: 'sekali', daily: 'setiap hari', weekdays: 'setiap hari kerja', weekly: 'setiap minggu' } as Record<string, string>)[info.frequency] || 'sekali';
  const instruction = `Kamu Cylen, teman ngobrol yang santai. User meminta ${info.kind === 'ai' ? 'tugas terjadwal' : 'pengingat'}. Rapikan pesannya, keluarkan JSON saja:
{"title":string,"task":string,"ack":string}
- title: judul pendek 2-4 kata, huruf kapital di awal tiap kata, tanpa emoji, tanpa kata "ingetin" atau "pengingat". Contoh: "Benerin Kode".
- task: kegiatan intinya saja, huruf kecil, tanpa kata ingetin / jam / waktu / sapaan / kata sambung di depan. Contoh: "benerin kode", "ngecas hp".${info.kind === 'ai' ? ' Karena ini tugas untuk AI, isi task = perintah lengkap yang jelas.' : ''}
- ack: SATU kalimat jawaban santai ala chat (maks 22 kata) yang menunjukkan kamu paham. Sebut jam ${info.time} (${freq}) dan kegiatannya, pakai "aku" dan "kamu". Contoh: "Siap, jam 19:20 aku ingetin kamu buat benerin kode ya."`;
  for (let i = 0; i < 2; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nPesan user:\n${text}` }] }],
        config: { responseMimeType: 'application/json', temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
      });
      const j = JSON.parse((res.text || '').replace(/```json|```/g, '').trim());
      const title = String(j.title || '').trim().slice(0, 40);
      const task = String(j.task || '').trim().slice(0, 200);
      const ack = String(j.ack || '').trim().slice(0, 220);
      if (title && task && ack) return { title, task, ack };
    } catch { /* coba lagi */ }
  }
  return null;
}

export async function tryCreateReminder(text: string, origin: ReminderOrigin = {}): Promise<ReminderResult> {
  const uid = auth?.currentUser?.uid;
  const trimmed = (text || '').trim();
  if (!uid || !trimmed || trimmed.length > 600) return { handled: false };
  const strong = STRONG_HINT.test(trimmed);
  if (!strong && !WEAK_HINT.test(trimmed)) return { handled: false };

  const tzOffsetMin = -new Date().getTimezoneOffset();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const now = Date.now();

  // 1) Pembaca lokal (tanpa AI): instan dan tidak bergantung pada key Gemini
  const local = localParseSchedule(trimmed, now, tzOffsetMin);
  let p: Parsed | null = null;
  if (strong && local && local.time) {
    p = local;
  } else {
    // 2) Minta bantuan AI. Kalau gagal: kalimat "ingetin ..." tetap ditangani (tanya jam), bukan dilempar ke chat biasa
    try { p = await parseWithAI(trimmed); } catch { p = null; }
    if (!p && strong && local) p = local;
  }
  if (!p) return strong ? errorCard() : { handled: false };
  if (!p.isTask) return { handled: false };

  const kind: 'reminder' | 'ai' = p.kind === 'ai' && (!strong || AI_WORDS.test(trimmed)) && AI_WORDS.test(trimmed) ? 'ai' : 'reminder';
  const frequency: Frequency = (['once', 'daily', 'weekdays', 'weekly'] as const).includes(p.frequency as any) ? p.frequency : 'once';
  const body = String(p.text || '').trim();
  if (!body) return askCard('Diingatkan soal apa?', 'Tulis ulang beserta isinya, misalnya "ingetin jam 5 sore beli susu".', 'Mau diingatkan soal apa?');

  const tm = /^(\d{1,2}):(\d{2})$/.exec(String(p.time || ''));
  const hh = tm ? Number(tm[1]) : -1;
  const mm = tm ? Number(tm[2]) : -1;
  if (!tm || hh > 23 || mm > 59) {
    return askCard('Jam berapa?', `Tulis ulang beserta jamnya, misalnya "ingetin jam 5 sore ${body.toLowerCase()}".`, 'Jam berapa aku harus ingetin?');
  }
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  let title = (String(p.title || '').trim() || body).slice(0, 40);
  let taskText = body;
  const weekday = typeof p.weekday === 'number' && p.weekday >= 0 && p.weekday <= 6 ? p.weekday : new Date(now + tzOffsetMin * 60000).getUTCDay();

  let nextRunAt: number;
  if (frequency === 'once' && p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    const [y, mo, d] = p.date.split('-').map(Number);
    nextRunAt = Date.UTC(y, mo - 1, d, hh, mm) - tzOffsetMin * 60000;
    if (nextRunAt <= now + 15000) {
      return askCard('Waktunya sudah lewat', 'Coba sebutkan jam atau tanggal yang akan datang ya.', 'Waktu yang kamu sebut sudah lewat.');
    }
  } else {
    nextRunAt = computeNextRun(now, { time, frequency, weekday, tzOffsetMin });
  }

  // Jadwal sudah dipahami → AI menjawab dulu (UI menampilkan jawabannya + pil loading)
  // AI merapikan judul + isi, dan menulis jawaban yang natural (selagi itu UI menampilkan loading helix)
  const pol = await polishWithAI(trimmed, { kind, frequency, time });
  if (pol) { title = pol.title; if (kind === 'reminder') taskText = pol.task; }
  const ack = pol?.ack || ackText(kind, frequency, time, taskText);
  try { origin.onUnderstood?.(ack); } catch { /* abaikan */ }

  // 3) Simpan, lalu BACA ULANG dari server. Pil "berhasil" hanya muncul kalau jadwalnya benar-benar ada.
  try {
    const ref = await addDoc(collection(db, 'tasks'), {
      uid, title, prompt: taskText, kind, frequency, time, weekday, tz, tzOffsetMin,
      active: true, notify: true, nextRunAt, createdAt: now, source: 'chat',
      // asal chat: saat waktunya tiba, balasan masuk ke chat yang sama (Firestore menolak undefined, jadi dikondisikan)
      ...(origin.chatId ? { chatId: origin.chatId } : {}),
      ...(origin.groupId ? { groupId: origin.groupId } : {}),
      ...(origin.aiName ? { aiName: origin.aiName } : {}),
      ...(origin.aiModel ? { aiModel: origin.aiModel } : {}),
    });
    const check = await getDocFromServer(ref);
    if (!check.exists() || check.data()?.nextRunAt !== nextRunAt) return errorCard();

    const when = describeWhen({ frequency, weekday }, nextRunAt, time, now, tzOffsetMin);
    return {
      handled: true,
      reply: ack,
      card: { status: 'ok', title, when, kind, notify: true, taskId: ref.id },
    };
  } catch (e) {
    console.error('[Cylen] Gagal menyimpan jadwal dari chat:', e);
    return errorCard();
  }
}

export { getPushStatus };

// Supaya notifikasi tetap muncul saat web Cylen sedang terbuka
if (typeof window !== 'undefined') {
  try { auth?.onAuthStateChanged((u: any) => { if (u) startForegroundPush(); }); } catch { /* abaikan */ }
}
