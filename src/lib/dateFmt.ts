// Format tanggal/jam pesan per bahasa (angka & kalender asli bahasanya). Bahasa 'id' dibiarkan seperti semula.
const NATIVE_NU: Record<string, string> = { ar: 'arab', fa: 'arabext', ur: 'arabext', hi: 'deva', mr: 'deva', bn: 'beng', ta: 'tamldec', te: 'telu', th: 'thai' };

export const nativeDigitsLocale = (lang: string): string => {
  const base = (lang || 'en').split('-')[0];
  const nu = NATIVE_NU[base];
  if (!nu) return lang || 'en';
  const cal = base === 'ar' ? '-ca-gregory' : '';
  return `${lang}-u-nu-${nu}${cal}`;
};

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5, jul: 6, agu: 7, ags: 7, sep: 8, okt: 9, nov: 10, des: 11 };

const safe = (fn: () => string, fallback: string) => { try { return fn(); } catch { return fallback; } };

export const fmtTime = (d: Date, lang: string): string =>
  safe(() => new Intl.DateTimeFormat(nativeDigitsLocale(lang), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d), `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);

export const fmtDate = (d: Date, lang: string): string =>
  safe(() => new Intl.DateTimeFormat(nativeDigitsLocale(lang), { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(d), d.toDateString());

/** "Senin, 22 Nov 2026 · 11:14" dalam bahasa lain (dari objek Date). */
export const formatFullDate = (d: Date, lang: string): string => `${fmtDate(d, lang)} · ${fmtTime(d, lang)}`;

/**
 * Timestamp pesan yang tersimpan berbahasa Indonesia ("Hari ini · 11:16", "Kemarin · 09:00",
 * "Minggu, 22 Nov 2026 · 11:14") → bahasa aktif. Format tak dikenal dikembalikan apa adanya.
 */
export function localizeStoredTimestamp(ts: string | undefined, lang: string, words: { today: string; yesterday: string }): string {
  if (!ts || lang === 'id') return ts || '';
  const parts = ts.split(/\s*[·•]\s*/);
  const timePart = parts[parts.length - 1] || '';
  const tm = timePart.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!tm) return ts;
  const t = new Date(2000, 0, 1, Number(tm[1]), Number(tm[2]));
  const time = fmtTime(t, lang);
  if (parts.length < 2) return time;
  const head = parts[0].trim();
  if (/^hari ini$/i.test(head)) return `${words.today} · ${time}`;
  if (/^kemarin$/i.test(head)) return `${words.yesterday} · ${time}`;
  const dm = head.match(/(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/);
  if (dm) {
    const mo = MONTHS[dm[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) {
      const d = new Date(Number(dm[3]), mo, Number(dm[1]));
      return `${fmtDate(d, lang)} · ${time}`;
    }
  }
  return ts;
}

export const fmtNum = (n: number, lang: string): string =>
  safe(() => new Intl.NumberFormat(lang === 'id' ? 'id-ID' : nativeDigitsLocale(lang)).format(n), String(n));
