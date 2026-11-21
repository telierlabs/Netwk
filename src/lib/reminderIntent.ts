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
import { AI_WORDS, STRONG_HINT, DAYS, computeNextRun, describeWhen, localParseSchedule, normalizeTimes } from './scheduleParse';
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

// Pertanyaan balik (jam / isi / waktu lewat) ditulis AI sesuai pesan user, BUKAN teks template.
// Jawaban user berikutnya (dalam 5 menit) disambungkan ke permintaan ini, walau tanpa kata "ingetin".
type Missing = 'time' | 'what' | 'past';
let pending: { scope: string; original: string; missing: Missing; at: number } | null = null;
const PENDING_MS = 5 * 60 * 1000;
const FALLBACK_ASK: Record<Missing, string> = {
  time: 'Jam berapa nih aku ingetin?',
  what: 'Mau diingetin soal apa?',
  past: 'Jam segitu udah lewat, mau jam berapa?',
};

async function askWithAI(text: string, missing: Missing): Promise<string> {
  const need =
    missing === 'time' ? 'jam berapa pengingat harus bunyi' :
    missing === 'what' ? 'soal apa dia mau diingatkan' :
    'jam yang dia sebut sudah lewat, jadi tanyakan jam atau tanggal yang akan datang';
  const instruction = `Kamu Cylen, teman ngobrol yang santai. User minta diingatkan tapi belum jelas: ${need}. Tulis SATU kalimat singkat (maks 18 kata) dalam bahasa Indonesia santai yang menunjukkan kamu paham maksudnya, lalu tanyakan hal yang kurang itu. Jangan bilang pengingat sudah dibuat. Tanpa tanda kutip.`;
  try {
    const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nPesan user:\n${text}` }] }],
      config: { temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
    });
    const t = String(res.text || '').replace(/^["'“”\s]+|["'“”\s]+$/g, '').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 200);
  } catch { /* pakai cadangan */ }
  return FALLBACK_ASK[missing];
}

async function askReply(scope: string, original: string, missing: Missing): Promise<ReminderResult> {
  pending = { scope, original, missing, at: Date.now() };
  return { handled: true, reply: await askWithAI(original, missing) };
}
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

// Cadangan kalau AI gagal: buang kata sambung di depan ("di bakal musikan" → "musikan") supaya judul tidak berantakan
const LEAD_JUNK = /^(di|bakal|mau|akan|nanti|untuk|buat|ke|kalo|kalau|biar|supaya|jangan\s+lupa|gua|gue|gw|saya|aku|masuk|ingetin|ingatkan|ya|yg|yang|tolong)\s+/i;
function cleanTask(raw: string): string {
  let t = String(raw || '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 6 && LEAD_JUNK.test(t); i++) t = t.replace(LEAD_JUNK, '');
  return t.replace(/[.!?,\s]+$/, '').trim();
}
function cleanTitle(raw: string): string {
  const words = cleanTask(raw).split(' ').filter(Boolean).slice(0, 4);
  if (words.length === 0) return 'Pengingat';
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').slice(0, 40);
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
  for (let i = 0; i < 3; i++) {
    try {
      const ai = new GoogleGenAI({ apiKey: getActiveApiKey() });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `${instruction}\n\nPesan user:\n${text}` }] }],
        config: { responseMimeType: 'application/json', temperature: 0.5, thinkingConfig: { thinkingBudget: 0 } },
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
  const scope = origin.groupId || origin.chatId || 'chat';
  let trimmed = normalizeTimes((text || '').trim());
  if (!uid || !trimmed) return { handled: false };

  // Jawaban atas pertanyaan balik tadi ("jam 17:08", "beli susu") → sambungkan ke permintaan sebelumnya
  if (pending && pending.scope === scope) {
    const p0 = pending;
    pending = null;
    if (Date.now() - p0.at < PENDING_MS && trimmed.length <= 120 && !STRONG_HINT.test(trimmed) && !WEAK_HINT.test(trimmed)) {
      const merged = p0.missing === 'what' ? `${p0.original} ${trimmed}` : `${trimmed} ${p0.original}`;
      const probe = localParseSchedule(merged, Date.now(), -new Date().getTimezoneOffset());
      const ok = !!probe && (p0.missing === 'what' ? !!probe.text.trim() : !!probe.time);
      if (ok) trimmed = merged.slice(0, 600);
    }
  }
  if (trimmed.length > 600) return { handled: false };
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
  if (!body) return askReply(scope, trimmed, 'what');

  const tm = /^(\d{1,2}):(\d{1,2})$/.exec(String(p.time || ''));
  const hh = tm ? Number(tm[1]) : -1;
  const mm = tm ? Number(tm[2]) : -1;
  if (!tm || hh > 23 || mm > 59) {
    return askReply(scope, trimmed, 'time');
  }
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  let title = cleanTitle(String(p.title || '').trim() || body);
  let taskText = cleanTask(body) || body;
  const weekday = typeof p.weekday === 'number' && p.weekday >= 0 && p.weekday <= 6 ? p.weekday : new Date(now + tzOffsetMin * 60000).getUTCDay();

  let nextRunAt: number;
  if (frequency === 'once' && p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    const [y, mo, d] = p.date.split('-').map(Number);
    nextRunAt = Date.UTC(y, mo - 1, d, hh, mm) - tzOffsetMin * 60000;
    if (nextRunAt <= now + 15000) {
      return askReply(scope, trimmed, 'past');
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
