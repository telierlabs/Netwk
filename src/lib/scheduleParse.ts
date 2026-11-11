// src/lib/scheduleParse.ts
//
// Pembaca jadwal TANPA AI dan tanpa Firebase (murni fungsi), dipakai reminderIntent.ts.
// Mengerti kalimat seperti:
//   "ingetin gua jam 5 sore beli susu"      "ingetin gua 30 menit lagi minum obat"
//   "ingetin besok jam 7 pagi rapat"        "tiap hari jam 8 malam minum vitamin"
//   "setiap senin jam 9 pagi meeting"       "bangunin gua jam 5"
// Karena nggak butuh AI, jadwal tetap bisa dibuat walau key Gemini lagi bermasalah.

export type Frequency = 'once' | 'daily' | 'weekdays' | 'weekly';

export interface Parsed {
  isTask: boolean;
  kind: 'reminder' | 'ai';
  title: string;
  text: string;
  frequency: Frequency;
  time: string | null;
  weekday: number | null;
  date: string | null;
}

export const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const WD_RE = "senin|selasa|rabu|kamis|jum'?at|sabtu|minggu|ahad";

// Kata-kata yang menandakan user minta AI mengerjakan sesuatu (bukan sekadar pengingat)
export const AI_WORDS = /(ringkas|rangkum|berita|cari|carikan|buatkan|kasih (tau|tahu|ide|info|saran|rekomendasi)|jelaskan|analisis|analisa|kurs|cuaca|harga|tulis|terjemah|rekomendasi|motivasi|kutipan|quotes)/i;
export const STRONG_HINT = /(ingetin|ingatkan|ingat\s?kan|pengingat|remind|alarm|bangunin)/i;

const pad = (n: number) => String(n).padStart(2, '0');

function wdIndex(name: string): number {
  const s = name.replace("'", '').toLowerCase();
  const map: Record<string, number> = { minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };
  return map[s] ?? 0;
}

function localOf(ms: number, off: number) {
  const x = new Date(ms + off * 60000);
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes(), wd: x.getUTCDay() };
}

function dateAfter(L: { y: number; mo: number; d: number }, days: number): string {
  const x = new Date(Date.UTC(L.y, L.mo - 1, L.d) + days * 86400000);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

// SAMA PERSIS dengan computeNextRun di TasksPage.tsx dan api/run-tasks.ts
export function computeNextRun(
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

function to24(h: number, period: string | null): number | null {
  if (h > 23) return null;
  if (h > 12) return h;
  if (period === 'pagi') return h === 12 ? 0 : h;
  if (period === 'siang') return h < 11 ? h + 12 : h;
  if (period === 'sore') return h < 12 ? h + 12 : h;
  if (period === 'malam') return h === 12 ? 0 : h < 12 ? h + 12 : h;
  return null; // ambigu (jam 5 = pagi atau sore?)
}

const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Baca kalimat user. Mengembalikan null kalau kalimatnya tidak mengandung kata pengingat/jadwal sama sekali.
 * Kalau jamnya tidak ketemu, `time` = null (pemanggil yang memutuskan: tanya jam atau minta bantuan AI).
 */
export function localParseSchedule(text: string, now: number, off: number): Parsed | null {
  const strong = STRONG_HINT.test(text);
  const weak = /(jadwalkan|jadwalin|setiap|tiap)/i.test(text);
  if (!strong && !weak) return null;

  let work = ' ' + text.replace(/\s+/g, ' ').trim() + ' ';
  const L = localOf(now, off);

  let time: string | null = null;
  let date: string | null = null;
  let frequency: Frequency = 'once';
  let weekday: number | null = null;
  let relative = false;
  let periodHint: string | null = null;
  let dateOffset: number | null = null;

  // ── 1. Waktu relatif: "30 menit lagi", "2 jam lagi"
  const rel = /(\d+)\s*(menit|mnt|jam|detik)\s*(?:lagi|kemudian|dari sekarang)/i.exec(work);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const unitMs = unit === 'jam' ? 3600000 : unit === 'detik' ? 1000 : 60000;
    const target = Math.ceil((now + n * unitMs) / 60000) * 60000;
    const T = localOf(target, off);
    time = `${pad(T.h)}:${pad(T.mi)}`;
    date = `${T.y}-${pad(T.mo)}-${pad(T.d)}`;
    relative = true;
    work = work.replace(rel[0], ' ');
  }

  // ── 2. Frekuensi
  const weekdaysRe = /\bhari kerja\b|\bsenin\s*(?:-|–|sampai|s\/d|hingga)\s*jumat\b/i;
  const weeklyNameRe = new RegExp(`\\b(?:tiap|setiap)\\s+(hari\\s+)?(${WD_RE})\\b`, 'i');
  const dailyRe = /\b(?:tiap|setiap|saban)\s+hari\b|\bharian\b|\bevery day\b/i;
  const weeklyRe = /\b(?:tiap|setiap)\s+(?:minggu|pekan)\b/i;
  const partRe = /\b(?:tiap|setiap)\s+(pagi|siang|sore|malam)\b/i;
  let fm: RegExpExecArray | null;
  if (weekdaysRe.test(work)) {
    frequency = 'weekdays';
    work = work.replace(weekdaysRe, ' ');
  } else if ((fm = weeklyNameRe.exec(work))) {
    const name = fm[2].toLowerCase();
    frequency = 'weekly';
    weekday = name === 'minggu' && !fm[1] ? L.wd : wdIndex(name);
    work = work.replace(fm[0], ' ');
  } else if (dailyRe.test(work)) {
    frequency = 'daily';
    work = work.replace(dailyRe, ' ');
  } else if (weeklyRe.test(work)) {
    frequency = 'weekly';
    weekday = L.wd;
    work = work.replace(weeklyRe, ' ');
  } else if ((fm = partRe.exec(work))) {
    frequency = 'daily';
    periodHint = fm[1].toLowerCase();
    work = work.replace(fm[0], ' ');
  }

  // ── 3. Tanggal (hanya untuk jadwal sekali)
  let weekdayDateName: string | null = null;
  if (frequency === 'once' && !relative) {
    if (/\bbesok\b/i.test(work)) { dateOffset = 1; work = work.replace(/\bbesok\b/i, ' '); }
    else if (/\blusa\b/i.test(work)) { dateOffset = 2; work = work.replace(/\blusa\b/i, ' '); }
    else if (/\bhari ini\b/i.test(work)) { dateOffset = 0; work = work.replace(/\bhari ini\b/i, ' '); }
    else {
      const wm = new RegExp(`\\b(?:hari\\s+)?(${WD_RE})\\b`, 'i').exec(work);
      if (wm) {
        const raw = wm[0].toLowerCase();
        const name = wm[1].toLowerCase();
        if (name !== 'minggu' || raw.startsWith('hari')) {
          weekdayDateName = name;
          work = work.replace(wm[0], ' ');
        }
      }
    }
  }

  // ── 4. Jam
  if (!relative) {
    let h = -1;
    let mi = 0;
    let period: string | null = null;
    let seg = '';

    let tm = /(?:jam|pukul|pkl\.?)\s*(\d{1,2})(?:\s*[.:]\s*(\d{2}))?(?:\s*(pagi|siang|sore|malam))?/i.exec(work);
    if (tm) { h = parseInt(tm[1], 10); mi = tm[2] ? parseInt(tm[2], 10) : 0; period = tm[3] ? tm[3].toLowerCase() : null; seg = tm[0]; }
    if (!seg) {
      tm = /\b(\d{1,2})\s*[.:]\s*(\d{2})\b(?:\s*(pagi|siang|sore|malam))?/i.exec(work);
      if (tm) { h = parseInt(tm[1], 10); mi = parseInt(tm[2], 10); period = tm[3] ? tm[3].toLowerCase() : null; seg = tm[0]; }
    }
    if (!seg) {
      tm = /\b(\d{1,2})\s*(pagi|siang|sore|malam)\b/i.exec(work);
      if (tm) { h = parseInt(tm[1], 10); mi = 0; period = tm[2].toLowerCase(); seg = tm[0]; }
    }

    if (seg && h >= 0 && h <= 23 && mi <= 59) {
      work = work.replace(seg, ' ');
      if (!period && periodHint) period = periodHint;
      let h24 = to24(h, period);
      const wantAm = /bangunin|alarm|sahur/i.test(text);

      if (h24 === null) {
        // jam 5 → pagi atau sore? tebak yang paling masuk akal
        if (h === 12 || h === 0) h24 = h;
        else if (wantAm && h <= 10) h24 = h;
        else if (frequency === 'once' && dateOffset === null && !weekdayDateName) {
          // tanpa tanggal: pilih kemungkinan yang paling cepat tiba
          const a = computeNextRun(now, { time: `${pad(h)}:${pad(mi)}`, frequency: 'once', weekday: 0, tzOffsetMin: off });
          const b = computeNextRun(now, { time: `${pad(h + 12)}:${pad(mi)}`, frequency: 'once', weekday: 0, tzOffsetMin: off });
          h24 = b < a ? h + 12 : h;
        } else {
          h24 = h >= 1 && h <= 6 ? h + 12 : h;
        }
      }
      time = `${pad(h24)}:${pad(mi)}`;

      if (frequency === 'once') {
        if (weekdayDateName) {
          let n = (wdIndex(weekdayDateName) - L.wd + 7) % 7;
          if (n === 0 && L.h * 60 + L.mi >= h24 * 60 + mi) n = 7;
          date = dateAfter(L, n);
        } else if (dateOffset !== null) {
          date = dateAfter(L, dateOffset);
        }
      }
    }
  }

  // ── 5. Isi pengingat (sisa kalimat setelah kata-kata jadwal dibuang)
  let body = work
    .replace(/\b(?:ingetin|ingatkan|ingat\s?kan|pengingat|remind(?:\s+me)?|bangunin)\b(?:\s+(?:gua|gue|gw|aku|saya|kita))?/gi, ' ')
    .replace(/\b(?:tolong|dong|deh|ya|yaa|please|nanti|pada)\b/gi, ' ')
    .replace(/\b(?:jam|pukul|pkl)\b\.?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  body = body
    .replace(/^(?:untuk|buat|supaya|agar|bahwa|kalau|kalo|tuk)\s+/i, '')
    .replace(/^[\s,.;:!?-]+/, '')
    .replace(/[\s,.;:!?-]+$/, '')
    .trim();
  if (!body && /bangunin|alarm/i.test(text)) body = 'Waktunya bangun';
  body = capital(body);

  const kind: 'reminder' | 'ai' = !strong && AI_WORDS.test(body) ? 'ai' : 'reminder';

  return {
    isTask: true,
    kind,
    title: body.slice(0, 40),
    text: body,
    frequency,
    time,
    weekday,
    date,
  };
}

const hhmm = (ms: number, off: number) => {
  const L = localOf(ms, off);
  return `${pad(L.h)}:${pad(L.mi)}`;
};

/** Teks waktu singkat untuk kartu: "Hari ini · 17:00", "Besok · 07:00", "Setiap hari · 07:00" */
export function describeWhen(
  p: { frequency: Frequency; weekday: number },
  nextRunAt: number,
  time: string,
  now: number,
  off: number,
): string {
  if (p.frequency === 'daily') return `Setiap hari · ${time}`;
  if (p.frequency === 'weekdays') return `Senin–Jumat · ${time}`;
  if (p.frequency === 'weekly') return `Setiap ${DAYS[p.weekday]} · ${time}`;
  const N = localOf(nextRunAt, off);
  const T = localOf(now, off);
  const diff = Math.round((Date.UTC(N.y, N.mo - 1, N.d) - Date.UTC(T.y, T.mo - 1, T.d)) / 86400000);
  if (diff === 0) return `Hari ini · ${hhmm(nextRunAt, off)}`;
  if (diff === 1) return `Besok · ${hhmm(nextRunAt, off)}`;
  return `${DAYS_SHORT[N.wd]}, ${N.d} ${MONTHS_SHORT[N.mo - 1]} · ${hhmm(nextRunAt, off)}`;
}
