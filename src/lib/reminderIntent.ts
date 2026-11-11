// src/lib/reminderIntent.ts
//
// Kalau user ngetik di chat (pribadi atau grup lewat @AI) hal seperti:
//   "ingetin gua jam 5 sore beli susu"   |   "tiap pagi jam 7 ringkas berita teknologi"
// → otomatis dibuat jadi task di koleksi `tasks` (sama dengan halaman Automations).
// Hasilnya dikembalikan sebagai KARTU (card) yang ditampilkan di chat, bukan teks biasa.
import { GoogleGenAI } from '@google/genai';
import { collection, addDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getActiveApiKey } from '../services/geminiService';
import { getPushStatus, startForegroundPush } from './pushNotifications';
import { AI_WORDS, STRONG_HINT, DAYS, computeNextRun, describeWhen, localParseSchedule } from './scheduleParse';
import type { Frequency, Parsed } from './scheduleParse';

const WEAK_HINT = /(jadwalkan|jadwalin|setiap|tiap)/i;

export interface ScheduleCardData {
  status: 'ok' | 'ask' | 'error';
  title: string;
  when?: string;
  kind?: 'reminder' | 'ai';
  notify?: boolean;
  taskId?: string;
  message?: string;
}
export interface ReminderResult { handled: boolean; reply?: string; card?: ScheduleCardData }

const askCard = (title: string, message: string, reply: string): ReminderResult => ({
  handled: true, reply, card: { status: 'ask', title, message },
});
const errorCard = (): ReminderResult => ({
  handled: true,
  reply: 'Jadwal belum bisa dibuat.',
  card: { status: 'error', title: 'Jadwal belum bisa dibuat', message: 'Coba lagi sebentar ya.' },
});

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

export async function tryCreateReminder(text: string): Promise<ReminderResult> {
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
  const title = (String(p.title || '').trim() || body).slice(0, 40);
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

  // 3) Simpan, lalu BACA ULANG dari server. Kartu "berhasil" hanya muncul kalau jadwalnya benar-benar ada.
  try {
    const ref = await addDoc(collection(db, 'tasks'), {
      uid, title, prompt: body, kind, frequency, time, weekday, tz, tzOffsetMin,
      active: true, notify: true, nextRunAt, createdAt: now, source: 'chat',
    });
    const check = await getDocFromServer(ref);
    if (!check.exists() || check.data()?.nextRunAt !== nextRunAt) return errorCard();

    const when = describeWhen({ frequency, weekday }, nextRunAt, time, now, tzOffsetMin);
    return {
      handled: true,
      reply: `Jadwal dibuat: ${title} · ${when}`,
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
