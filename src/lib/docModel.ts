// ─────────────────────────────────────────────
// DOC MODEL — src/lib/docModel.ts
// Format dokumen "Cylen Doc Markdown" (CDM) yang ditulis AI di dalam tag [GENERATE_PDF/DOCS/EXCEL/PPT],
// dipakai bareng oleh chat pribadi, chat grup, popup preview, dan pembuat file (PDF/Word/PPT/Excel).
//
//   # Judul besar            ## Subjudul           ### Sub-subjudul
//   teks biasa (**tebal**)   - poin / 1. nomor     > kutipan
//   @stat 12,5 jt | Pendapatan     (angka besar, baris berurutan = satu deret kartu angka)
//   | Kolom | Kolom |        (tabel)
//   ```chart {"title":..,"type":"bar","labels":[..],"series":[{"name":..,"values":[..]}]} ```
//   --- (PPT: pemisah slide)  (PDF/Word: garis pemisah)
//   Excel: baris "A | B | C"; sheet baru dengan "## Nama Sheet"
// ─────────────────────────────────────────────
import { parseChartBlocks } from './chartBlocks';
import type { ChartSpec } from './chartBlocks';

export type DocKind = 'PDF' | 'DOCS' | 'EXCEL' | 'PPT';

export type Block =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'chart'; spec: ChartSpec }
  | { t: 'stats'; items: { value: string; label: string }[] }
  | { t: 'hr' };

export interface Slide { title: string; cover?: boolean; subtitle?: string; blocks: Block[] }
export interface Sheet { name: string; rows: string[][] }
export interface ParsedDoc {
  kind: DocKind;
  title: string;
  slides?: Slide[];
  blocks?: Block[];
  sheets?: Sheet[];
}

export const DOC_EXT: Record<DocKind, string> = { PDF: 'pdf', DOCS: 'docx', EXCEL: 'xlsx', PPT: 'pptx' };
export const DOC_LABEL: Record<DocKind, string> = { PDF: 'Dokumen PDF', DOCS: 'Dokumen Word', EXCEL: 'Spreadsheet', PPT: 'Presentasi' };
export const DOC_MIME: Record<DocKind, string> = {
  PDF: 'application/pdf',
  DOCS: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Info dokumen yang disimpan di pesan (chat pribadi & grup). */
export interface DocInfo { kind: DocKind; name: string; source: string; intro?: string }

export const stripExt = (name: string) =>
  name.replace(/(\.(pdf|docx?|xlsx?|csv|pptx?|excel|docs|ppt))+$/i, '').trim();

// ── Cari tag dokumen di teks mentah AI (boleh belum selesai) ──
const TAG_RE = /\[GENERATE_(PDF|DOCS|EXCEL|PPT):\s*([^\]\n]*)\]/;

export interface ExtractedDoc {
  kind: DocKind;
  name: string;
  source: string;     // isi di antara tag (belum tentu lengkap)
  before: string;     // kalimat pembuka (sebelum tag)
  after: string;      // kalimat penutup (setelah tag penutup)
  complete: boolean;  // tag penutup sudah ada
}

export function extractDocFromText(text: string): ExtractedDoc | null {
  const m = TAG_RE.exec(text || '');
  if (!m) return null;
  const kind = m[1] as DocKind;
  const bodyStart = m.index + m[0].length;
  const closeTag = `[/GENERATE_${kind}]`;
  const closeIdx = text.indexOf(closeTag, bodyStart);
  const complete = closeIdx !== -1;
  const source = (complete ? text.slice(bodyStart, closeIdx) : text.slice(bodyStart)).replace(/^\s*\n/, '');
  const name = stripExt(m[2].trim()) || 'Dokumen';
  return {
    kind, name, source,
    before: text.slice(0, m.index).trim(),
    after: complete ? text.slice(closeIdx + closeTag.length).trim() : '',
    complete,
  };
}

// ── Parser blok ──
const clean = (s: string) => s.replace(/\s+$/g, '').trim();
const isSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) => {
  let t = l.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map(c => c.trim());
};

export function parseBlocks(src: string): Block[] {
  const lines = (src || '').replace(/\r/g, '').split('\n');
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ') }); para = []; } };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const l = raw.trim();
    if (!l) { flush(); continue; }

    // blok chart (satu baris / beberapa baris)
    if (l.startsWith('```chart')) {
      flush();
      const body: string[] = [];
      const rest = l.slice(8).trim();
      let closedSameLine = false;
      if (rest) {
        if (rest.endsWith('```')) { body.push(rest.slice(0, -3)); closedSameLine = true; } else body.push(rest);
      }
      let j = i + 1;
      if (!closedSameLine) {
        for (; j < lines.length; j++) {
          if (lines[j].trim().startsWith('```')) break;
          body.push(lines[j]);
        }
        i = j;
      }
      const spec = parseChartBlocks('```chart\n' + body.join('\n') + '\n```').charts[0];
      if (spec) out.push({ t: 'chart', spec });
      continue;
    }

    if (/^-{3,}$|^\*{3,}$/.test(l)) { flush(); out.push({ t: 'hr' }); continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) { flush(); out.push({ t: (`h${h[1].length}`) as 'h1' | 'h2' | 'h3', text: clean(h[2]) }); continue; }

    if (/^@stat\s/i.test(l)) {
      flush();
      const items: { value: string; label: string }[] = [];
      let j = i;
      for (; j < lines.length; j++) {
        const sl = lines[j].trim();
        const sm = /^@stat\s+(.*)$/i.exec(sl);
        if (!sm) break;
        const [v, ...lab] = sm[1].split('|');
        items.push({ value: clean(v), label: clean(lab.join('|')) });
      }
      i = j - 1;
      out.push({ t: 'stats', items: items.slice(0, 4) });
      continue;
    }

    if (l.startsWith('>')) {
      flush();
      const q: string[] = [];
      let j = i;
      for (; j < lines.length && lines[j].trim().startsWith('>'); j++) q.push(lines[j].trim().replace(/^>\s?/, ''));
      i = j - 1;
      out.push({ t: 'quote', text: q.join(' ') });
      continue;
    }

    if (l.includes('|') && (l.startsWith('|') || (lines[i + 1] && isSep(lines[i + 1])) || (lines[i + 1] || '').includes('|'))) {
      flush();
      const rows: string[][] = [];
      let j = i;
      for (; j < lines.length && lines[j].includes('|'); j++) {
        if (isSep(lines[j])) continue;
        rows.push(splitRow(lines[j]));
      }
      i = j - 1;
      if (rows.length) out.push({ t: 'table', rows });
      continue;
    }

    if (/^([-*•])\s+/.test(l)) {
      flush();
      const items: string[] = [];
      let j = i;
      for (; j < lines.length && /^\s*([-*•])\s+/.test(lines[j]); j++) items.push(clean(lines[j].replace(/^\s*([-*•])\s+/, '')));
      i = j - 1;
      out.push({ t: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(l)) {
      flush();
      const items: string[] = [];
      let j = i;
      for (; j < lines.length && /^\s*\d+[.)]\s+/.test(lines[j]); j++) items.push(clean(lines[j].replace(/^\s*\d+[.)]\s+/, '')));
      i = j - 1;
      out.push({ t: 'ol', items });
      continue;
    }

    para.push(l);
  }
  flush();
  return out;
}

// ── PPT: pisah slide pakai --- ──
function splitSlides(src: string): string[] {
  const parts: string[] = [];
  let cur: string[] = [];
  let inFence = false;
  for (const line of (src || '').replace(/\r/g, '').split('\n')) {
    if (line.trim().startsWith('```')) inFence = !inFence;
    if (!inFence && /^\s*-{3,}\s*$/.test(line)) { parts.push(cur.join('\n')); cur = []; continue; }
    cur.push(line);
  }
  parts.push(cur.join('\n'));
  return parts.map(p => p.trim()).filter(Boolean);
}

function toSlide(chunk: string, index: number, deckTitle: string): Slide {
  let blocks = parseBlocks(chunk);
  let title = '';
  const hi = blocks.findIndex(b => b.t === 'h1' || b.t === 'h2' || b.t === 'h3');
  if (hi !== -1 && hi <= 1) {
    title = (blocks[hi] as any).text;
    blocks = blocks.filter((_, i) => i !== hi);
  } else if (blocks[0] && blocks[0].t === 'p' && (blocks[0] as any).text.length <= 70) {
    // format lama: baris pertama = judul slide
    title = (blocks[0] as any).text.replace(/^slide\s*\d+\s*[:.-]\s*/i, '');
    blocks = blocks.slice(1);
  }
  if (!title) title = index === 0 ? deckTitle : `Slide ${index + 1}`;
  const textual = blocks.filter(b => b.t === 'p');
  const isCover = index === 0 && blocks.every(b => b.t === 'p') && textual.length <= 2;
  if (isCover) return { title, cover: true, subtitle: textual.map(b => (b as any).text).join(' · '), blocks: [] };
  return { title, blocks };
}

function parseSheets(src: string): Sheet[] {
  const sheets: Sheet[] = [];
  let cur: Sheet = { name: 'Data', rows: [] };
  const push = () => { if (cur.rows.length) sheets.push(cur); };
  for (const raw of (src || '').replace(/\r/g, '').split('\n')) {
    const l = raw.trim();
    if (!l) continue;
    const h = /^#{1,3}\s+(.*)$/.exec(l);
    if (h) { push(); cur = { name: clean(h[1]).slice(0, 28) || `Sheet${sheets.length + 1}`, rows: [] }; continue; }
    if (isSep(l)) continue;
    if (l.includes('|')) cur.rows.push(splitRow(l));
    else if (l.includes('\t')) cur.rows.push(l.split('\t').map(c => c.trim()));
    else if ((l.match(/,/g) || []).length >= 1) cur.rows.push(l.split(',').map(c => c.trim()));
    else cur.rows.push([l]);
  }
  push();
  return sheets.length ? sheets : [{ name: 'Data', rows: [['(kosong)']] }];
}

export function parseDoc(kind: DocKind, title: string, source: string): ParsedDoc {
  if (kind === 'PPT') {
    const chunks = splitSlides(source);
    return { kind, title, slides: (chunks.length ? chunks : [title]).map((c, i) => toSlide(c, i, title)) };
  }
  if (kind === 'EXCEL') return { kind, title, sheets: parseSheets(source) };
  return { kind, title, blocks: parseBlocks(source) };
}

// ── Inline **tebal** / *miring* ──
export interface Run { text: string; b?: boolean; i?: boolean }
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith('**')) runs.push({ text: t.slice(2, -2), b: true });
    else if (t.startsWith('`')) runs.push({ text: t.slice(1, -1) });
    else runs.push({ text: t.slice(1, -1), i: true });
    last = m.index + t.length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}
export const plain = (text: string) => inlineRuns(text).map(r => r.text).join('');

// ── Langkah loading ASLI dari isi dokumen yang sedang ditulis ──
export function liveSteps(kind: DocKind, source: string): string[] {
  // buang blok chart yang belum tertutup
  let src = source || '';
  const open = src.lastIndexOf('```chart');
  if (open !== -1 && !/```/.test(src.slice(open + 8))) src = src.slice(0, open);
  const steps: string[] = [];
  if (kind === 'PPT') {
    const chunks = splitSlides(src);
    chunks.forEach((c, i) => {
      const hm = /^#{1,3}\s+(.*)$/m.exec(c);
      let t = hm ? hm[1] : (c.split('\n').find(x => x.trim()) || '').replace(/^slide\s*\d+\s*[:.-]\s*/i, '');
      t = plain(t).slice(0, 46);
      if (t) steps.push(`Slide ${i + 1} · ${t}`);
    });
    return steps;
  }
  if (kind === 'EXCEL') {
    let rows = 0;
    for (const raw of src.split('\n')) {
      const l = raw.trim();
      if (!l) continue;
      const h = /^#{1,3}\s+(.*)$/.exec(l);
      if (h) { steps.push(`Sheet · ${plain(h[1]).slice(0, 36)}`); rows = 0; continue; }
      if (isSep(l)) continue;
      rows++;
      if (rows === 1) steps.push(`Kolom · ${l.split('|').map(c => c.trim()).filter(Boolean).slice(0, 4).join(', ').slice(0, 44)}`);
      else if (rows % 5 === 0) steps.push(`Baris data · ${rows} terisi`);
    }
    return steps;
  }
  for (const b of parseBlocks(src)) {
    if (b.t === 'h1') steps.push(`Judul · ${plain(b.text).slice(0, 44)}`);
    else if (b.t === 'h2') steps.push(`Bagian · ${plain(b.text).slice(0, 44)}`);
    else if (b.t === 'h3') steps.push(`Sub · ${plain(b.text).slice(0, 44)}`);
    else if (b.t === 'table') steps.push(`Tabel · ${b.rows[0]?.slice(0, 3).join(', ').slice(0, 40) || 'data'}`);
    else if (b.t === 'chart') steps.push(`Grafik · ${(b.spec.title || 'data').slice(0, 40)}`);
    else if (b.t === 'stats') steps.push(`Angka kunci · ${b.items.map(s => s.label).filter(Boolean).slice(0, 2).join(', ')}`);
    else if (b.t === 'quote') steps.push('Kutipan');
  }
  return steps;
}

/** Perkiraan progres 0–0.95 dari panjang teks yang sudah ditulis. */
export function liveProgress(kind: DocKind, source: string): number {
  const expect = kind === 'PPT' ? 3200 : kind === 'EXCEL' ? 1500 : 4200;
  return Math.min(0.95, 1 - Math.exp(-(source || '').length / expect));
}

/** Teks cadangan untuk dokumen lama (format tag lama / user tanpa struktur): tetap jadi blok rapi. */
export function sourceStats(d: ParsedDoc): string {
  if (d.slides) return `${d.slides.length} slide`;
  if (d.sheets) return `${d.sheets.length} sheet · ${d.sheets.reduce((a, s) => a + s.rows.length, 0)} baris`;
  const pages = Math.max(1, Math.round((d.blocks || []).reduce((a, b) => a + (b.t === 'p' ? 1.2 : b.t === 'table' || b.t === 'chart' ? 5 : b.t === 'ul' || b.t === 'ol' ? 3 : 1), 0) / 14) || 1);
  return `${pages} halaman`;
}

/** Deteksi permintaan membuat dokumen dari pesan user (untuk kalimat loading awal). */
const DOC_REQ = /\b(buat(?:kan|in)?|bikin(?:in)?|susun(?:kan)?|generate|create|tulis(?:kan)?|rancang)\b[^.\n]{0,60}\b(ppt|pptx|powerpoint|presentasi|slide|pdf|word|docx|dokumen|excel|xlsx|spreadsheet|csv)\b/i;
export function detectDocRequest(text: string): string | null {
  const m = DOC_REQ.exec(text || '');
  if (!m) return null;
  const w = m[2].toLowerCase();
  if (/ppt|powerpoint|presentasi|slide/.test(w)) return 'presentasi';
  if (/pdf/.test(w)) return 'dokumen PDF';
  if (/word|docx|dokumen/.test(w)) return 'dokumen Word';
  return 'spreadsheet';
}

/** Ubah PPT JSON lama grup ({title, slides:[{title,content}]}) jadi sumber CDM. */
export function legacyPptToSource(data: any): string {
  const slides: any[] = Array.isArray(data?.slides) ? data.slides : [];
  const parts = [`# ${data?.title || 'Presentasi'}`];
  slides.forEach(s => parts.push(`## ${String(s?.title || '').replace(/^slide\s*\d+\s*[:.-]\s*/i, '')}\n${String(s?.content || '')}`));
  return parts.join('\n---\n');
}

/** Instruksi format dokumen untuk AI di chat grup (chat pribadi punya salinan sendiri di useChat). */
export const DOC_FORMAT_PROMPT = `# MEMBUAT DOKUMEN (PDF, Word, Excel, PowerPoint)
Jika pengguna meminta dibuatkan dokumen, pakai urutan WAJIB ini:
(a) tulis SATU kalimat pembuka natural (sebut topik dokumennya, bukan kalimat template),
(b) lalu tag dokumen berisi isinya,
(c) setelah tag penutup tulis 1-2 kalimat penutup (apa yang sudah dibuat, tawarkan revisi).
Tag: [GENERATE_PDF: Judul.pdf] ... [/GENERATE_PDF] | [GENERATE_DOCS: Judul.docx] ... [/GENERATE_DOCS] | [GENERATE_EXCEL: Judul.xlsx] ... [/GENERATE_EXCEL] | [GENERATE_PPT: Judul.pptx] ... [/GENERATE_PPT]
Isi di dalam tag memakai format:
# Judul besar   ## Subjudul   ### Sub-subjudul
teks paragraf biasa (boleh **tebal** dan *miring*)
- poin   atau   1. daftar bernomor
> kutipan penting
@stat 12,5 jt | Pendapatan   (angka besar; maksimal 4 baris @stat berurutan)
| Kolom A | Kolom B |   (tabel; baris pertama = header, tanpa baris pemisah ---)
| data | data |
\`\`\`chart
{"title":"Judul grafik","type":"bar","unit":"Rp","labels":["Q1","Q2","Q3"],"series":[{"name":"Penjualan","values":[10,20,30]}]}
\`\`\`  (grafik: JSON satu baris, type "bar" atau "line", angka murni, maksimal 12 label)
- PowerPoint: slide dipisah baris yang isinya hanya ---. Slide 1 = sampul: "# Judul" + satu baris subjudul. Slide lain diawali "## Judul slide" lalu isi singkat (maks 5 poin pendek), boleh @stat, satu tabel atau satu grafik per slide. Buat 8-12 slide bervariasi.
- PDF / Word: struktur # / ## / ###, paragraf substansial, sertakan tabel / grafik / @stat bila data mendukung. --- = garis pemisah.
- Excel: tiap baris "A | B | C", baris pertama header; beberapa sheet diawali "## Nama Sheet"; angka tulis murni (12000000).
Jangan taruh penjelasan di luar format ini di dalam tag.
`;
