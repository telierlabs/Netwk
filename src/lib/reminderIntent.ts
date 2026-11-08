// src/lib/reminderIntent.ts
//
// Kalau user ngetik di chat (pribadi atau grup lewat @AI) hal seperti:
//   "ingetin gua jam 5 sore beli susu"
//   "tiap pagi jam 7 ringkas berita teknologi"
// → otomatis dibuat jadi task di koleksi `tasks` (sama persis dengan halaman Automations).
// Server (api/run-tasks.ts) yang menjalankannya dan mengirim notifikasi push.
import { GoogleGenAI } from '@google/genai';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { getActiveApiKey } from '../services/geminiService';
import { getPushStatus, startForegroundPush } from './pushNotifications';

// Penyaring cepat: AI cuma dipanggil kalau pesan mengandung kata-kata ini (hemat kuota)
const INTENT_HINT = /(ingetin|ingatkan|ingat\s?kan|pengingat|remind|alarm|bangunin|jadwalkan|jadwalin|setiap|tiap)/i;

type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';

interface Parsed {
  isTask: boolean;
  kind: 'reminder' | 'ai';
  title: string;
  text: string;
  frequency: Frequency;
  time: string | null;
  weekday: number | null;
  date: string | null;
}

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// SAMA PERSIS dengan computeNextRun di TasksPage.tsx dan api/run-tasks.ts
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

async function parseIntent(text: string): Promise<Parsed | null> {
  const tzOffsetMin = -new Date().getTimezoneOffset();
  const local = new Date(Date.now() + tzOffsetMin * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowLocal = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  const dayName = DAYS[local.getUTCDay()];

  const instruction = `Kamu parser jadwal. Tugasmu: tentukan apakah pesan user MEMINTA dibuatkan pengingat atau tugas terjadwal, lalu keluarkan JSON saja.

Waktu lokal user sekarang: ${nowLocal} (hari ${dayName}). Semua jam dalam 24 jam, zona waktu lokal user.

Format JSON (tanpa teks lain):
{"isTask":boolean,"kind":"reminder"|"ai","title":string,"text":string,"frequency":"once"|"daily"|"weekdays"|"weekly","time":"HH:mm"|null,"weekday":0-6|null,"date":"YYYY-MM-DD"|null}

Aturan:
- isTask=true HANYA kalau user jelas minta diingatkan / dijadwalkan sesuatu. Kalau cuma bertanya tentang pengingat, bercerita, atau bercanda, isTask=false.
- kind="reminder": cukup mengirim notifikasi berisi teks ("ingetin gua beli susu"). kind="ai": AI harus mengerjakan sesuatu lalu mengirim hasilnya ("tiap pagi ringkas berita teknologi", "jam 8 malam kasih ide menu makan").
- title: judul singkat maksimal 40 karakter, tanpa emoji.
- text: untuk reminder = isi pengingat dalam kalimat singkat ("Beli susu"). Untuk ai = perintah lengkap untuk AI.
- frequency: "once" untuk sekali, "daily" untuk tiap hari, "weekdays" untuk Senin-Jumat, "weekly" untuk tiap minggu.
- time: jam yang disebut user (jam 5 sore = 17:00). Kalau waktu relatif ("30 menit lagi", "2 jam lagi") hitung dari waktu sekarang. Kalau user tidak menyebut jam sama sekali, time=null.
- date: hanya untuk frequency="once". "hari ini"/tanpa tanggal = tanggal hari ini, "besok" = besok, "lusa" = lusa, nama hari ("Jumat") = tanggal hari itu berikutnya. Format YYYY-MM-DD.
- weekday: hanya untuk weekly (0=Minggu ... 6=Sabtu), selain itu null.
- Kalau jam yang disebut sudah lewat hari ini dan user tidak menyebut tanggal, pakai tanggal besok.`;

  let lastErr: unknown = null;
  // getActiveApiKey() memutar key tiap dipanggil, jadi kalau satu key bermasalah dicoba key berikutnya
  for (let i = 0; i < 3; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nPesan user:\n${text}` }] }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      const raw = (res.text || '').replace(/```json|```/g, '').trim();
      return JSON.parse(raw) as Parsed;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

const clockStr = (ms: number) =>
  new Date(ms)
    .toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    .replace('.', ':');

function describeWhen(p: { frequency: Frequency; weekday: number }, nextRunAt: number, time: string): string {
  if (p.frequency === 'daily') return `setiap hari jam ${time}`;
  if (p.frequency === 'weekdays') return `Senin sampai Jumat jam ${time}`;
  if (p.frequency === 'weekly') return `setiap ${DAYS[p.weekday]} jam ${time}`;
  const day = new Date(nextRunAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${day} jam ${clockStr(nextRunAt)}`;
}

/**
 * Cek pesan user. Kalau ternyata permintaan pengingat/jadwal → task dibuat dan
 * `handled: true` dikembalikan beserta teks balasan. Kalau bukan, `handled: false`
 * dan chat jalan seperti biasa.
 */
export async function tryCreateReminder(text: string): Promise<{ handled: boolean; reply?: string }> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !text || text.length > 600 || !INTENT_HINT.test(text)) return { handled: false };

  let p: Parsed | null = null;
  try {
    p = await parseIntent(text);
  } catch (e) {
    console.warn('[Cylen] Gagal baca maksud jadwal, lanjut chat biasa:', e);
    return { handled: false };
  }
  if (!p || !p.isTask) return { handled: false };

  // Pengingat biasa ("ingetin gua makan") TIDAK butuh AI. Jadi tugas AI hanya kalau kalimatnya memang minta AI mengerjakan sesuatu.
  const AI_WORDS = /(ringkas|rangkum|berita|cari|carikan|buatkan|kasih (tau|tahu|ide|info|saran|rekomendasi)|jelaskan|analisis|analisa|kurs|cuaca|harga|tulis|terjemah|rekomendasi|motivasi|kutipan|quotes)/i;
  const kind: 'reminder' | 'ai' = p.kind === 'ai' && AI_WORDS.test(text) ? 'ai' : 'reminder';
  const frequency: Frequency = (['once', 'daily', 'weekdays', 'weekly'] as const).includes(p.frequency as any) ? p.frequency : 'once';
  const body = String(p.text || '').trim();
  const title = (String(p.title || '').trim() || (kind === 'reminder' ? 'Pengingat' : 'Tugas')).slice(0, 40);
  if (!body) return { handled: false };

  const tm = /^(\d{1,2}):(\d{2})$/.exec(String(p.time || ''));
  const hh = tm ? Number(tm[1]) : -1;
  const mm = tm ? Number(tm[2]) : -1;
  if (!tm || hh > 23 || mm > 59) {
    return {
      handled: true,
      reply: 'Siap, tapi jam berapa aku harus ingetin? Tulis ulang beserta jamnya ya, misalnya "ingetin jam 5 sore ' + body.toLowerCase() + '".',
    };
  }
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  const tzOffsetMin = -new Date().getTimezoneOffset();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  const now = Date.now();
  const weekday = typeof p.weekday === 'number' && p.weekday >= 0 && p.weekday <= 6 ? p.weekday : new Date(now + tzOffsetMin * 60000).getUTCDay();

  let nextRunAt: number;
  if (frequency === 'once' && p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    const [y, mo, d] = p.date.split('-').map(Number);
    nextRunAt = Date.UTC(y, mo - 1, d, hh, mm) - tzOffsetMin * 60000;
    if (nextRunAt <= now + 15000) {
      return { handled: true, reply: 'Waktu yang kamu sebut sudah lewat. Coba sebutkan jam atau tanggal yang akan datang ya.' };
    }
  } else {
    nextRunAt = computeNextRun(now, { time, frequency, weekday, tzOffsetMin });
  }

  try {
    await addDoc(collection(db, 'tasks'), {
      uid,
      title,
      prompt: body,
      kind,
      frequency,
      time,
      weekday,
      tz,
      tzOffsetMin,
      active: true,
      nextRunAt,
      createdAt: now,
      source: 'chat',
    });
  } catch (e) {
    console.error('[Cylen] Gagal menyimpan task dari chat:', e);
    return { handled: true, reply: 'Maaf, pengingatnya gagal disimpan. Coba lagi sebentar ya.' };
  }

  const when = describeWhen({ frequency, weekday }, nextRunAt, time);
  let reply =
    kind === 'reminder'
      ? `Siap, aku ingetin kamu ${when}: ${body}.`
      : `Siap, aku jalankan "${body}" ${when}. Hasilnya masuk ke riwayat chat.`;

  const status = getPushStatus(uid);
  if (status === 'off' || status === 'denied') {
    reply += ' Biar notifnya muncul di luar web, nyalakan Push notifications di menu Automations.';
  }
  return { handled: true, reply };
}

// Supaya notifikasi tetap muncul saat web Cylen sedang terbuka: aktifkan pendengar begitu user login
if (typeof window !== 'undefined') {
  try {
    auth?.onAuthStateChanged((u: any) => { if (u) startForegroundPush(); });
  } catch { /* abaikan */ }
}
