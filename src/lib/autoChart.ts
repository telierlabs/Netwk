// ─────────────────────────────────────────────
// GRAFIK OTOMATIS — src/lib/autoChart.ts
// Kalau jawaban berisi tabel / daftar angka berurutan (mis. kekayaan per tahun) tapi model lupa menulis blok ```chart,
// grafik dibuat dari angka di jawaban itu sendiri (bukan angka baru). Posisi grafik = tepat setelah tabel / daftarnya.
// ─────────────────────────────────────────────
import type { ChartSpec } from './chartBlocks';

const SCALES: [RegExp, number, string][] = [
  [/\b(triliun|trillion|tn)\b/i, 1e12, 'triliun'],
  [/\b(miliar|milyar|billion|bn)\b/i, 1e9, 'miliar'],
  [/\b(juta|million|jt|mn)\b/i, 1e6, 'juta'],
  [/\b(ribu|thousand)\b/i, 1e3, 'ribu'],
];
const CURRENCY: [RegExp, string][] = [[/us\$|usd|\$/i, 'USD'], [/rp\.?|idr/i, 'Rp'], [/€|eur\b/i, 'EUR'], [/£|gbp/i, 'GBP'], [/¥|jpy|cny|rmb/i, 'CNY']];

export interface Num { value: number; scale: number; scaleName: string; cur: string; pct: boolean }

export function parseNum(cellRaw: string): Num | null {
  const cell = cellRaw.replace(/\*+/g, '').replace(/[~≈±]|sekitar|kira-kira|approx\.?|lebih dari|>|</gi, ' ').replace(/\s+/g, ' ').trim();
  const m = /(\d[\d.,]*)/.exec(cell);
  if (!m) return null;
  // sel harus terutama angka: kata lain selain satuan / mata uang tidak boleh dominan
  let restClean = cell.replace(m[0], '').replace(/us\$|usd|rp\.?|idr|eur|gbp|[$€£¥%]/gi, '');
  for (const [re] of SCALES) restClean = restClean.replace(new RegExp(re.source, 'gi'), '');
  restClean = restClean.replace(/[()\s\-–+]/g, '');
  if (restClean.length > 12) return null;
  let n = m[1];
  const lastDot = n.lastIndexOf('.'), lastCom = n.lastIndexOf(',');
  if (lastDot !== -1 && lastCom !== -1) {
    n = lastDot > lastCom ? n.replace(/,/g, '') : n.replace(/\./g, '').replace(',', '.');
  } else if (lastCom !== -1) {
    n = /^\d{1,3}(,\d{3})+$/.test(n) ? n.replace(/,/g, '') : n.replace(',', '.');
  } else if (lastDot !== -1) {
    n = /^\d{1,3}(\.\d{3})+$/.test(n) ? n.replace(/\./g, '') : n;
  }
  const value = Number(n.replace(/[.,]+$/, ''));
  if (!Number.isFinite(value)) return null;
  let scale = 1, scaleName = '';
  for (const [re, f, nm] of SCALES) if (re.test(cell)) { scale = f; scaleName = nm; break; }
  let cur = '';
  for (const [re, c] of CURRENCY) if (re.test(cell)) { cur = c; break; }
  return { value, scale, scaleName, cur, pct: /%/.test(cell) };
}

const TIMEISH = /^(?:(?:19|20)\d{2}(?:\s*[-–/]\s*\d{1,4})?|q[1-4]\s*['’]?\d{2,4}|(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*\.?\s*['’]?\d{0,4}|\d{1,2}\s+(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*\.?\s*\d{0,4}|h[12]\s*\d{2,4}|kuartal.*|tahun.*)$/i;
const yearOf = (l: string): number | null => { const m = /(?:19|20)\d{2}/.exec(l); return m ? Number(m[0]) : null; };
const cleanLabel = (l: string) => l.replace(/\*+/g, '').replace(/\s+/g, ' ').trim().slice(0, 22);

interface Col { idx: number; name: string; nums: (Num | null)[] }

function buildFromRows(headers: string[], rows: string[][]): ChartSpec | null {
  if (rows.length < 3 || rows.length > 24) return null;
  const labelsRaw = rows.map(r => (r[0] || '').replace(/\*+/g, '').trim());
  const timeish = labelsRaw.filter(l => TIMEISH.test(l)).length >= Math.ceil(rows.length * 0.8);

  const cols: Col[] = [];
  for (let c = 1; c < headers.length; c++) {
    const nums = rows.map(r => parseNum(r[c] || ''));
    const ok = nums.filter(Boolean).length;
    if (ok >= Math.ceil(rows.length * 0.8) && ok >= 3) cols.push({ idx: c, name: headers[c].replace(/\*+/g, '').trim(), nums });
  }
  if (cols.length === 0) return null;

  // hanya tren waktu atau angka berunit jelas (uang / persen / satuan besar) yang layak jadi grafik — bukan spesifikasi (RAM 8 GB, dll)
  const hasUnit = (col: Col) => col.nums.filter(n => n && (n.cur || n.pct || n.scale > 1)).length >= Math.ceil(rows.length * 0.6);
  const usable = cols.filter(c => timeish || hasUnit(c));
  if (usable.length === 0) return null;

  const first = usable[0];
  const cur = first.nums.find(n => n)?.cur || '';
  const pct = first.nums.some(n => n?.pct);
  // satu skala untuk seluruh kolom: pakai skala terbanyak, nilai lain dikonversi
  const scaleCount = new Map<number, { c: number; name: string }>();
  for (const n of first.nums) if (n) { const e = scaleCount.get(n.scale) || { c: 0, name: n.scaleName }; e.c++; scaleCount.set(n.scale, e); }
  let base = 1, baseName = '', best = -1;
  for (const [sc, e] of scaleCount) if (e.c > best) { best = e.c; base = sc; baseName = e.name; }

  const series = usable.filter(c => {
    const cc = c.nums.find(n => n)?.cur || '';
    return cc === cur && c.nums.some(n => n?.pct) === pct;
  }).slice(0, 3).map(c => ({
    name: c.name.slice(0, 28) || 'Nilai',
    values: c.nums.map(n => (n ? Math.round(((n.value * n.scale) / base) * 1000) / 1000 : NaN)),
  })).filter(s => s.values.every(v => Number.isFinite(v)));
  if (series.length === 0) return null;

  let labels = labelsRaw.map(cleanLabel);
  let valuesSets = series.map(s => s.values);
  // tahun menurun (terbaru dulu) → urutkan naik supaya garis membaca dari kiri ke kanan
  const ys = labels.map(yearOf);
  if (timeish && ys.every(y => y != null) && (ys[0] as number) > (ys[ys.length - 1] as number)) {
    labels = labels.slice().reverse();
    valuesSets = valuesSets.map(v => v.slice().reverse());
  }
  const unit = pct ? '%' : [cur, baseName].filter(Boolean).join(' ').trim() || undefined;
  const title = (series.length === 1 ? series[0].name : headers[0] || 'Perbandingan') + (unit && !pct ? ` (${unit})` : '');
  return {
    title: title.slice(0, 60),
    type: timeish ? 'line' : 'bar',
    unit,
    labels,
    series: series.map((s, i) => ({ name: s.name, values: valuesSets[i] })),
  };
}

const splitRow = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function autoChartFromText(text: string): { spec: ChartSpec; after: number } | null {
  if (!text) return null;
  const lines: { s: string; start: number; end: number }[] = [];
  let pos = 0;
  for (const s of text.split('\n')) { lines.push({ s, start: pos, end: pos + s.length }); pos += s.length + 1; }

  // (1) tabel Markdown
  for (let i = 0; i < lines.length - 2; i++) {
    if (!/^\s*\|/.test(lines[i].s) || !isSep(lines[i + 1].s)) continue;
    let j = i + 2;
    const rows: string[][] = [];
    while (j < lines.length && /^\s*\|/.test(lines[j].s)) { rows.push(splitRow(lines[j].s)); j++; }
    const spec = buildFromRows(splitRow(lines[i].s), rows);
    if (spec) return { spec, after: lines[j - 1].end };
    i = j - 1;
  }

  // (2) daftar "2021: USD 300 miliar" / "- 2023 — Rp 1,2 triliun" (≥ 3 baris berurutan)
  const itemRe = /^\s*(?:[-*•]|\d+[.)])?\s*\**((?:19|20)\d{2}(?:\s*[-–/]\s*\d{1,4})?|q[1-4]\s*(?:19|20)\d{2}|(?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)[a-z]*\.?\s*(?:19|20)\d{2})\**\s*[:–—-]\s*(.+)$/i;
  for (let i = 0; i < lines.length; i++) {
    const run: { label: string; cell: string; end: number }[] = [];
    let j = i;
    while (j < lines.length) {
      const m = itemRe.exec(lines[j].s);
      if (!m) break;
      run.push({ label: m[1], cell: m[2], end: lines[j].end });
      j++;
    }
    if (run.length >= 3) {
      const spec = buildFromRows(['Periode', 'Nilai'], run.map(r => [r.label, r.cell.split(/[.;(]/)[0] || r.cell]));
      if (spec) return { spec, after: run[run.length - 1].end };
    }
    if (j > i) i = j - 1;
  }
  return null;
}
