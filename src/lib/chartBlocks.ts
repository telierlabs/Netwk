// ─────────────────────────────────────────────
// CHART BLOCKS — src/lib/chartBlocks.ts
// AI menulis grafik sebagai blok ```chart berisi JSON satu baris.
// File ini: (1) menyembunyikan blok itu selama teks diketik,
//           (2) mengambilnya dari teks final lalu memvalidasinya.
// Teks final dibersihkan SEBELUM sitasi dihitung, jadi posisi pil sumber tetap pas.
// ─────────────────────────────────────────────

export interface ChartSpec {
  title: string;
  type: 'line' | 'bar';
  unit?: string;
  labels: string[];
  series: { name: string; values: number[] }[];
}

const MAX_CHARTS = 2;
const MAX_POINTS = 24;
const MAX_SERIES = 3;

const CHART_RE = /```chart[^\n]*\n([\s\S]*?)```/g;
const CHART_OPEN = '```chart';

function validate(raw: any): ChartSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type === 'bar' ? 'bar' : raw.type === 'line' ? 'line' : null;
  if (!type) return null;
  if (!Array.isArray(raw.labels) || !Array.isArray(raw.series)) return null;

  const labels = raw.labels.map((l: any) => String(l ?? '').trim());
  if (labels.length > MAX_POINTS) return null;
  if (labels.length < (type === 'line' ? 3 : 2)) return null;

  const series = raw.series.slice(0, MAX_SERIES).map((s: any) => ({
    name: String(s?.name ?? '').trim(),
    values: Array.isArray(s?.values) ? s.values.map((v: any) => (typeof v === 'number' ? v : Number(v))) : [],
  }));
  if (series.length === 0) return null;
  for (const s of series) {
    if (s.values.length !== labels.length) return null;
    if (s.values.some((v: number) => !Number.isFinite(v))) return null;
  }

  return {
    title: String(raw.title ?? '').trim(),
    type,
    unit: raw.unit ? String(raw.unit).trim() : undefined,
    labels,
    series,
  };
}

/** Teks final → { teks tanpa blok chart, daftar chart valid }. Blok rusak tetap dibuang dari teks. */
export function parseChartBlocks(text: string): { clean: string; charts: ChartSpec[] } {
  const charts: ChartSpec[] = [];
  let clean = text.replace(CHART_RE, (_m, body: string) => {
    if (charts.length < MAX_CHARTS) {
      try {
        const spec = validate(JSON.parse(body.trim()));
        if (spec) charts.push(spec);
      } catch { /* JSON rusak → buang saja */ }
    }
    return '';
  });
  // Blok yang tidak pernah ditutup (jawaban terpotong) → buang sisanya
  const open = clean.indexOf(CHART_OPEN);
  if (open !== -1) clean = clean.slice(0, open);
  clean = clean.replace(/\n{3,}/g, '\n\n').trimEnd();
  return { clean, charts };
}

/** Dipakai efek ketik: sembunyikan blok chart (lengkap / setengah jadi / awalan ``` yang baru muncul). */
export function hideChartWhileStreaming(text: string): string {
  let out = text.replace(CHART_RE, '');
  const open = out.indexOf(CHART_OPEN);
  if (open !== -1) return out.slice(0, open).trimEnd();
  for (let len = Math.min(CHART_OPEN.length - 1, out.length); len > 0; len--) {
    if (out.endsWith(CHART_OPEN.slice(0, len))) return out.slice(0, out.length - len);
  }
  return out;
}
