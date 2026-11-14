// ─────────────────────────────────────────────
// DOC BUILDERS — src/lib/docBuilders.ts
// ParsedDoc (lihat docModel.ts) → file asli: PDF (jsPDF), Word (docx), PowerPoint (pptxgenjs), Excel (xlsx).
// Semua dibuat di browser. Ada juga helper unduh & bagikan file.
// ─────────────────────────────────────────────
import { jsPDF } from 'jspdf';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun,
} from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { DOC_EXT, DOC_MIME, DEFAULT_THEME, OFFICE_FONT, coverColors, inlineRuns, plain, parseDoc } from './docModel';
import type { Block, ParsedDoc, DocKind, Run, Theme } from './docModel';
import { resolveDocImages } from './docImages';
import type { DocImageData } from './docImages';
import type { ChartSpec } from './chartBlocks';

// Tema & foto dokumen yang sedang dibuat (diatur di buildDocBlob sebelum builder jalan)
let T: Theme = DEFAULT_THEME;
let IMG: Map<string, DocImageData> = new Map();
const MUTED = '6B7280';
const LINE = 'E5E7EB';
const pal = (i: number) => '#' + T.palette[i % T.palette.length];
const pdfFont = () => (T.font === 'serif' ? 'times' : T.font === 'mono' ? 'courier' : pdfFont());
const hex = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

const NUMERIC = /^[-+]?[\sRp$%\d.,]+$/;
const looksNumeric = (t: string) => !!t && /\d/.test(t) && NUMERIC.test(t.trim());
const todayId = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Grafik → PNG (untuk PDF & Word) ──
export function chartPng(spec: ChartSpec, w = 1400, h = 640): string {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) return '';
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const font = (px: number, wt = '400') => `${wt} ${px}px Helvetica, Arial, sans-serif`;
  const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
  const fmt = (n: number) => (Math.abs(n) >= 1e6 ? compact.format(n) : nf.format(n));

  let top = 30;
  if (spec.title) { g.fillStyle = '#' + T.ink; g.font = font(34, '700'); g.textAlign = 'left'; g.fillText(spec.title + (spec.unit ? ` (${spec.unit})` : ''), 30, 52); top = 90; }
  const multi = spec.series.length > 1;
  const legendH = multi ? 46 : 0;
  const L = 110, R = w - 30, T = top + 10, B = h - 56 - legendH;
  const all = spec.series.flatMap(s => s.values);
  let min = Math.min(0, ...all), max = Math.max(...all);
  if (spec.type === 'line') min = Math.min(...all) - (Math.max(...all) - Math.min(...all)) * 0.1;
  if (max === min) max = min + 1;
  const rough = (max - min) / 4, mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = (rough / mag <= 1 ? 1 : rough / mag <= 2 ? 2 : rough / mag <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);

  g.font = font(22); g.textAlign = 'right'; g.lineWidth = 1;
  for (let v = lo; v <= hi + step / 2; v += step) {
    g.strokeStyle = '#' + LINE; g.beginPath(); g.moveTo(L, y(v)); g.lineTo(R, y(v)); g.stroke();
    g.fillStyle = '#' + MUTED; g.fillText(fmt(v), L - 12, y(v) + 7);
  }
  const n = spec.labels.length;
  const slot = (R - L) / n;
  g.textAlign = 'center'; g.font = font(22); g.fillStyle = '#' + MUTED;
  spec.labels.forEach((lb, i) => g.fillText(lb.length > 12 ? lb.slice(0, 11) + '…' : lb, L + slot * i + slot / 2, B + 34));

  if (spec.type === 'bar') {
    const sn = spec.series.length;
    const bw = Math.min(90, (slot * 0.62) / sn);
    spec.series.forEach((s, si) => {
      g.fillStyle = pal(si);
      s.values.forEach((v, i) => {
        const x = L + slot * i + slot / 2 - (bw * sn) / 2 + bw * si;
        const y0 = y(Math.max(0, lo)), y1 = y(v);
        g.fillRect(x + 2, Math.min(y0, y1), bw - 4, Math.abs(y0 - y1));
        if (n <= 8 && sn === 1) { g.fillStyle = '#' + T.ink; g.font = font(22, '600'); g.textAlign = 'center'; g.fillText(fmt(v), x + bw / 2, Math.min(y0, y1) - 10); g.fillStyle = pal(si); }
      });
    });
  } else {
    spec.series.forEach((s, si) => {
      const col = pal(si);
      g.strokeStyle = col; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath();
      s.values.forEach((v, i) => { const x = L + slot * i + slot / 2; i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
      g.stroke();
      g.fillStyle = '#fff';
      s.values.forEach((v, i) => { const x = L + slot * i + slot / 2; g.beginPath(); g.arc(x, y(v), 7, 0, Math.PI * 2); g.fill(); g.lineWidth = 4; g.stroke(); });
    });
  }
  if (multi) {
    let x = L; g.textAlign = 'left'; g.font = font(24);
    spec.series.forEach((s, si) => {
      g.fillStyle = pal(si); g.fillRect(x, h - 40, 24, 14);
      g.fillStyle = '#' + T.ink; g.fillText(s.name || `Seri ${si + 1}`, x + 34, h - 27);
      x += 34 + g.measureText(s.name || `Seri ${si + 1}`).width + 36;
    });
  }
  return c.toDataURL('image/png');
}

// ── Pembersih teks untuk font standar PDF (WinAnsi) ──
const winAnsi = (t: string) => t
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/…/g, '...').replace(/ /g, ' ').replace(/[→⇒]/g, '->').replace(/✓|✔/g, 'v')
  .replace(/[^ -ÿ•\n]/g, '');

// ─────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────
function buildPdf(d: ParsedDoc): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 20, CW = PW - 2 * M, BOTTOM = PH - 20;
  let y = M;
  const need = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
  const rgb = (h: string) => { const [r, g, b] = hex(h); return { r, g, b }; };
  const text = (h: string) => { const c = rgb(h); doc.setTextColor(c.r, c.g, c.b); };
  const fill = (h: string) => { const c = rgb(h); doc.setFillColor(c.r, c.g, c.b); };
  const draw = (h: string) => { const c = rgb(h); doc.setDrawColor(c.r, c.g, c.b); };

  // paragraf dengan **tebal** & *miring*, bungkus kata manual
  const rich = (runs: Run[], x: number, w: number, size: number, lh: number, color = T.ink, italic = false) => {
    doc.setFontSize(size); text(color);
    type Tok = { t: string; style: string; w: number };
    const toks: Tok[] = [];
    runs.forEach(r => {
      const style = r.b ? 'bold' : (r.i || italic) ? 'italic' : 'normal';
      doc.setFont(pdfFont(), style);
      winAnsi(r.text).split(/(\s+)/).forEach(p => { if (p) toks.push({ t: p, style, w: doc.getTextWidth(p) }); });
    });
    let line: Tok[] = [], lw = 0;
    const out = () => {
      need(lh);
      let cx = x;
      line.forEach(k => { doc.setFont(pdfFont(), k.style); doc.text(k.t, cx, y); cx += k.w; });
      y += lh; line = []; lw = 0;
    };
    toks.forEach(k => {
      const isSp = /^\s+$/.test(k.t);
      if (isSp && !line.length) return;
      if (lw + k.w > w && !isSp && line.length) { while (line.length && /^\s+$/.test(line[line.length - 1].t)) line.pop(); out(); }
      line.push(k); lw += k.w;
    });
    if (line.length) out();
  };

  // kepala dokumen
  doc.setFont(pdfFont(), 'bold'); doc.setFontSize(8.5); text(T.accent);
  doc.text('CYLEN AI  -  DOKUMEN', M, y); y += 8;
  doc.setFontSize(24); text(T.ink);
  const tl: string[] = doc.splitTextToSize(winAnsi(d.title), CW);
  tl.forEach(l => { doc.text(l, M, y); y += 10.5; });
  fill(T.accent); doc.rect(M, y - 4.5, 24, 1.1, 'F'); y += 2;
  doc.setFont(pdfFont(), 'normal'); doc.setFontSize(9); text(MUTED);
  doc.text(todayId(), M, y); y += 11;

  const renderBlock = (b: Block) => {
    switch (b.t) {
      case 'h1': need(20); y += 3; doc.setFont(pdfFont(), 'bold'); rich([{ text: plain(b.text), b: true }], M, CW, 17, 7.6); y += 2; break;
      case 'h2':
        need(16); y += 3;
        fill(T.accent); doc.rect(M, y - 4.6, 1.3, 6, 'F');
        rich([{ text: plain(b.text), b: true }], M + 4, CW - 4, 13.5, 6.6); y += 1.5; break;
      case 'h3': need(12); y += 1.5; rich([{ text: plain(b.text), b: true }], M, CW, 11, 5.6, T.accent); y += 0.8; break;
      case 'p': rich(inlineRuns(b.text), M, CW, 10.5, 5.5); y += 2.6; break;
      case 'ul':
      case 'ol':
        b.items.forEach((it, i) => {
          need(7);
          doc.setFont(pdfFont(), 'bold'); doc.setFontSize(10.5); text(T.accent);
          doc.text(b.t === 'ul' ? '•' : `${i + 1}.`, M + 2, y);
          rich(inlineRuns(it), M + 8, CW - 8, 10.5, 5.5); y += 0.9;
        });
        y += 2; break;
      case 'quote': {
        doc.setFont(pdfFont(), 'italic'); doc.setFontSize(11);
        const ls: string[] = doc.splitTextToSize(winAnsi(plain(b.text)), CW - 12);
        const h = ls.length * 5.8 + 8;
        need(h + 2);
        fill(T.soft); doc.rect(M, y - 4, CW, h, 'F'); fill(T.accent); doc.rect(M, y - 4, 1.4, h, 'F');
        text('374151'); ls.forEach((l, i) => doc.text(l, M + 7, y + 2 + i * 5.8));
        y += h + 3; break;
      }
      case 'hr': need(8); draw(LINE); doc.setLineWidth(0.3); doc.line(M, y, M + CW, y); y += 7; break;
      case 'stats': {
        const n = b.items.length || 1, gap = 4, w = (CW - gap * (n - 1)) / n;
        need(30);
        b.items.forEach((s, i) => {
          const x = M + i * (w + gap);
          fill(T.soft); doc.roundedRect(x, y - 3, w, 24, 2, 2, 'F');
          doc.setFont(pdfFont(), 'bold'); doc.setFontSize(s.value.length > 10 ? 13 : 17); text(T.accent);
          doc.text(winAnsi(s.value), x + 5, y + 8, { maxWidth: w - 8 });
          doc.setFont(pdfFont(), 'normal'); doc.setFontSize(8.5); text(MUTED);
          doc.text(winAnsi(s.label), x + 5, y + 15, { maxWidth: w - 8 });
        });
        y += 28; break;
      }
      case 'chart': {
        const h = Math.min(84, CW * 0.46);
        need(h + 6);
        try { doc.addImage(chartPng(b.spec), 'PNG', M, y - 2, CW, h); } catch { /* grafik gagal → lewati */ }
        y += h + 6; break;
      }
      case 'image': {
        const im = IMG.get(b.src);
        if (!im) break;
        let w = Math.min(CW, 150), h = (w * im.h) / im.w;
        if (h > 92) { h = 92; w = (h * im.w) / im.h; }
        need(h + 12);
        try { doc.addImage(im.data, 'JPEG', M + (CW - w) / 2, y - 2, w, h); } catch { break; }
        y += h + 2;
        const cap = winAnsi(b.caption || im.caption || '');
        if (cap) {
          doc.setFont(pdfFont(), 'italic'); doc.setFontSize(8.5); text(MUTED);
          (doc.splitTextToSize(cap, CW - 20) as string[]).slice(0, 2).forEach(l => { doc.text(l, M + CW / 2, y + 2, { align: 'center' }); y += 4; });
        }
        y += 5; break;
      }
      case 'table': {
        const cols = Math.max(...b.rows.map(r => r.length));
        const rows = b.rows.map(r => Array.from({ length: cols }, (_, i) => winAnsi(plain(r[i] || ''))));
        const wt = Array.from({ length: cols }, (_, c) => Math.max(6, Math.min(36, ...[Math.max(...rows.map(r => r[c].length))])));
        const sum = wt.reduce((a, v) => a + v, 0);
        const cw = wt.map(v => (CW * v) / sum);
        doc.setFontSize(9.2);
        const drawRow = (r: string[], head: boolean, zebra: boolean) => {
          doc.setFont(pdfFont(), head ? 'bold' : 'normal'); doc.setFontSize(9.2);
          const cells = r.map((c, i) => doc.splitTextToSize(c, cw[i] - 4.4) as string[]);
          const h = Math.max(...cells.map(c => c.length)) * 4.5 + 4.2;
          if (y + h + 1 > BOTTOM) {
            doc.addPage(); y = M;
            if (!head) { drawRow(rows[0], true, false); doc.setFont(pdfFont(), 'normal'); }
          }
          if (head) fill('1F2937'); else if (zebra) fill('F6F7F9'); else fill('FFFFFF');
          doc.rect(M, y - 3.4, CW, h, 'F');
          draw(LINE); doc.setLineWidth(0.2); doc.line(M, y - 3.4 + h, M + CW, y - 3.4 + h);
          let x = M;
          cells.forEach((c, i) => {
            text(head ? 'FFFFFF' : T.ink);
            const right = !head && looksNumeric(r[i]);
            c.forEach((l, li) => doc.text(l, right ? x + cw[i] - 2.2 : x + 2.2, y + 1 + li * 4.5, right ? { align: 'right' } : undefined));
            x += cw[i];
          });
          y += h;
        };
        rows.forEach((r, ri) => drawRow(r, ri === 0, ri % 2 === 0));
        y += 5; break;
      }
    }
  };
  (d.blocks || []).forEach(renderBlock);

  const N = doc.getNumberOfPages();
  for (let i = 1; i <= N; i++) {
    doc.setPage(i);
    draw(LINE); doc.setLineWidth(0.2); doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont(pdfFont(), 'normal'); doc.setFontSize(8); text(MUTED);
    doc.text(winAnsi(d.title).slice(0, 60), M, PH - 9);
    doc.text(`${i} / ${N}`, PW - M, PH - 9, { align: 'right' });
  }
  return doc.output('blob');
}

// ─────────────────────────────────────────────
// WORD
// ─────────────────────────────────────────────
const b64ToBytes = (dataUrl: string) => {
  const s = atob(dataUrl.split(',')[1] || '');
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
};
const wRuns = (runs: Run[], extra: any = {}) => runs.map(r => new TextRun({ text: r.text, bold: r.b || extra.bold, italics: r.i || extra.italics, color: extra.color, size: extra.size }));

async function buildDocx(d: ParsedDoc): Promise<Blob> {
  const kids: any[] = [];
  kids.push(new Paragraph({ children: [new TextRun({ text: 'CYLEN AI  ·  DOKUMEN', bold: true, size: 17, color: T.accent })], spacing: { after: 80 } }));
  kids.push(new Paragraph({ children: [new TextRun({ text: d.title, bold: true, size: 52, color: T.ink })], spacing: { after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: T.accent, space: 8 } } }));
  kids.push(new Paragraph({ children: [new TextRun({ text: todayId(), size: 18, color: MUTED })], spacing: { after: 300 } }));

  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const thin = { style: BorderStyle.SINGLE, size: 4, color: LINE };

  for (const b of d.blocks || []) {
    switch (b.t) {
      case 'h1': kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: plain(b.text), bold: true, size: 36, color: T.ink })], spacing: { before: 320, after: 120 } })); break;
      case 'h2': kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: plain(b.text), bold: true, size: 29, color: T.ink })], spacing: { before: 280, after: 100 }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: T.accent, space: 8 } } })); break;
      case 'h3': kids.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: plain(b.text), bold: true, size: 24, color: T.accent })], spacing: { before: 200, after: 80 } })); break;
      case 'p': kids.push(new Paragraph({ children: wRuns(inlineRuns(b.text), { size: 22 }), spacing: { after: 140, line: 330 } })); break;
      case 'ul': b.items.forEach(it => kids.push(new Paragraph({ bullet: { level: 0 }, children: wRuns(inlineRuns(it), { size: 22 }), spacing: { after: 60, line: 320 } }))); break;
      case 'ol': b.items.forEach((it, i) => kids.push(new Paragraph({ indent: { left: 540, hanging: 340 }, children: [new TextRun({ text: `${i + 1}.  `, bold: true, color: T.accent, size: 22 }), ...wRuns(inlineRuns(it), { size: 22 })], spacing: { after: 60, line: 320 } }))); break;
      case 'quote': kids.push(new Paragraph({ indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 24, color: T.accent, space: 10 } }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: T.soft }, children: [new TextRun({ text: plain(b.text), italics: true, size: 23, color: '374151' })], spacing: { before: 120, after: 200, line: 340 } })); break;
      case 'hr': kids.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 1 } }, spacing: { before: 120, after: 160 } })); break;
      case 'chart': {
        try {
          const png = chartPng(b.spec);
          kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 200 }, children: [new ImageRun({ data: b64ToBytes(png), type: 'png', transformation: { width: 560, height: 256 } } as any)] }));
        } catch { /* lewati */ }
        break;
      }
      case 'stats': {
        const w = Math.floor(100 / (b.items.length || 1));
        kids.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [new TableRow({ children: b.items.map(s => new TableCell({
            width: { size: w, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: T.soft },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            borders: { top: { style: BorderStyle.SINGLE, size: 18, color: 'FFFFFF' }, bottom: none, left: { style: BorderStyle.SINGLE, size: 18, color: 'FFFFFF' }, right: { style: BorderStyle.SINGLE, size: 18, color: 'FFFFFF' } },
            children: [
              new Paragraph({ children: [new TextRun({ text: s.value, bold: true, size: 40, color: T.accent })] }),
              new Paragraph({ children: [new TextRun({ text: s.label, size: 18, color: MUTED })] }),
            ],
          })) })],
        }));
        kids.push(new Paragraph({ spacing: { after: 160 } }));
        break;
      }
      case 'image': {
        const im = IMG.get(b.src);
        if (!im) break;
        let w = 540, h = (w * im.h) / im.w;
        if (h > 330) { h = 330; w = (h * im.w) / im.h; }
        kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, children: [new ImageRun({ data: b64ToBytes(im.data), type: 'jpg', transformation: { width: Math.round(w), height: Math.round(h) } } as any)] }));
        const cap = b.caption || im.caption;
        if (cap) kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: cap, italics: true, size: 18, color: MUTED })] }));
        break;
      }
      case 'table': {
        const cols = Math.max(...b.rows.map(r => r.length));
        kids.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: thin, bottom: thin, left: none, right: none, insideHorizontal: thin, insideVertical: none },
          rows: b.rows.map((r, ri) => new TableRow({
            tableHeader: ri === 0,
            children: Array.from({ length: cols }, (_, ci) => {
              const cell = r[ci] || '';
              const head = ri === 0;
              return new TableCell({
                shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: '1F2937' } : ri % 2 === 0 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F6F7F9' } : undefined,
                margins: { top: 90, bottom: 90, left: 140, right: 140 },
                children: [new Paragraph({ alignment: !head && looksNumeric(cell) ? AlignmentType.RIGHT : AlignmentType.LEFT, children: wRuns(inlineRuns(cell), { size: 20, bold: head, color: head ? 'FFFFFF' : T.ink }) })],
              });
            }),
          })),
        }));
        kids.push(new Paragraph({ spacing: { after: 200 } }));
        break;
      }
    }
  }

  const document = new Document({
    creator: 'Cylen AI',
    title: d.title,
    styles: { default: { document: { run: { font: OFFICE_FONT[T.font], size: 22, color: T.ink } } } },
    sections: [{ properties: { page: { margin: { top: 1300, bottom: 1300, left: 1300, right: 1300 } } }, children: kids }],
  });
  return Packer.toBlob(document);
}

// ─────────────────────────────────────────────
// EXCEL
// ─────────────────────────────────────────────
function toCell(v: string): string | number {
  const t = (v || '').trim();
  const num = t.replace(/^Rp\.?\s*/i, '').replace(/\s/g, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(num)) return Number(num.replace(/\./g, '').replace(',', '.'));
  if (/^-?\d+,\d+$/.test(num)) return Number(num.replace(',', '.'));
  if (/^-?\d+(\.\d+)?$/.test(num) && num.length < 16) return Number(num);
  return plain(t);
}

function buildXlsx(d: ParsedDoc): Blob {
  const wb = XLSX.utils.book_new();
  (d.sheets || []).forEach((s, i) => {
    const aoa = s.rows.map(r => r.map(toCell));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const cols = Math.max(...aoa.map(r => r.length), 1);
    (ws as any)['!cols'] = Array.from({ length: cols }, (_, c) => ({ wch: Math.min(46, Math.max(10, ...aoa.map(r => String(r[c] ?? '').length + 3))) }));
    XLSX.utils.book_append_sheet(wb, ws, (s.name || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  });
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: DOC_MIME.EXCEL });
}

// ─────────────────────────────────────────────
// POWERPOINT
// ─────────────────────────────────────────────
async function buildPptx(d: ParsedDoc): Promise<Blob> {
  const pres: any = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.title = d.title;
  pres.author = 'Cylen AI';
  const FONT = OFFICE_FONT[T.font];
  const slides = d.slides || [];

  slides.forEach((s, idx) => {
    const sl = pres.addSlide();
    if (s.cover) {
      const cc = coverColors(T);
      sl.background = { color: cc.bg };
      const im = s.image ? IMG.get(s.image.src) : undefined;
      const tw = im ? 6.2 : 11;
      if (im) sl.addImage({ data: im.data, x: 7.2, y: 0, w: 6.13, h: 7.5, sizing: { type: 'cover', w: 6.13, h: 7.5 } });
      sl.addShape(pres.ShapeType.rect, { x: 0.8, y: 2.3, w: 0.12, h: 2.2, fill: { color: cc.bar }, line: { color: cc.bar } });
      sl.addText(s.title, { x: 1.2, y: 2.2, w: tw, h: 1.6, fontFace: FONT, fontSize: s.title.length > 40 || im ? 32 : 42, bold: true, color: cc.fg, valign: 'top' });
      if (s.subtitle) sl.addText(s.subtitle, { x: 1.2, y: 3.9, w: tw - 0.5, h: 0.9, fontFace: FONT, fontSize: 20, color: cc.sub, valign: 'top' });
      sl.addText('Cylen AI', { x: 1.2, y: 6.7, w: 4, h: 0.4, fontFace: FONT, fontSize: 12, color: cc.sub });
      return;
    }
    sl.background = { color: T.slideBg };
    sl.addText(s.title, { x: 0.7, y: 0.4, w: 11.9, h: 0.9, fontFace: FONT, fontSize: s.title.length > 48 ? 24 : 30, bold: true, color: T.ink, valign: 'middle' });
    sl.addShape(pres.ShapeType.rect, { x: 0.7, y: 1.34, w: 0.9, h: 0.06, fill: { color: T.accent }, line: { color: T.accent } });
    sl.addText('Cylen AI', { x: 0.7, y: 7.0, w: 3, h: 0.3, fontFace: FONT, fontSize: 10, color: '9CA3AF' });
    sl.addText(String(idx + 1), { x: 11.9, y: 7.0, w: 0.75, h: 0.3, fontFace: FONT, fontSize: 10, color: '9CA3AF', align: 'right' });

    const X = 0.7, W = 11.93;
    let Y = 1.7;
    const stats = s.blocks.filter(b => b.t === 'stats') as Extract<Block, { t: 'stats' }>[];
    const visuals = s.blocks.filter(b => b.t === 'chart' || b.t === 'table' || (b.t === 'image' && IMG.has(b.src))).slice(0, 2);
    const texts = s.blocks.filter(b => !['stats', 'chart', 'table', 'hr', 'image'].includes(b.t));

    if (stats.length) {
      const items = stats[0].items;
      const gap = 0.25, w = (W - gap * (items.length - 1)) / items.length;
      items.forEach((it, i) => {
        const x = X + i * (w + gap);
        sl.addShape(pres.ShapeType.roundRect, { x, y: Y, w, h: 1.35, fill: { color: T.soft }, line: { color: T.soft }, rectRadius: 0.1 });
        sl.addText(it.value, { x: x + 0.2, y: Y + 0.12, w: w - 0.4, h: 0.7, fontFace: FONT, fontSize: it.value.length > 10 ? 24 : 32, bold: true, color: T.accent, valign: 'middle' });
        sl.addText(it.label, { x: x + 0.2, y: Y + 0.82, w: w - 0.4, h: 0.4, fontFace: FONT, fontSize: 13, color: MUTED, valign: 'top' });
      });
      Y += 1.65;
    }

    const twoCol = visuals.length > 0 && texts.length > 0;
    const tx = X, tw = twoCol ? 5.3 : W;
    const th = 6.85 - Y;

    // ── kotak teks (satu text box, mengalir otomatis) ──
    if (texts.length) {
      const cpl = (fs: number) => tw / (fs * 0.0066);
      const est = (fs: number) => texts.reduce((a, b) => {
        if (b.t === 'ul' || b.t === 'ol') return a + b.items.reduce((x, it) => x + Math.ceil((plain(it).length + 4) / cpl(fs)) * fs * 0.0185 + 0.1, 0);
        return a + Math.ceil(plain((b as any).text).length / cpl(fs)) * fs * 0.0185 + (b.t === 'p' ? 0.16 : 0.2);
      }, 0);
      const fs = [22, 20, 18, 16, 14].find(f => est(f) <= th) || 13;
      const runs: any[] = [];
      const pushPara = (rs: Run[], o: any) => rs.forEach((r, i) => runs.push({ text: r.text, options: { ...o, bold: r.b || o.bold, italic: r.i || o.italic, breakLine: i === rs.length - 1 } }));
      texts.forEach(b => {
        if (b.t === 'h1' || b.t === 'h2') pushPara([{ text: plain(b.text), b: true }], { fontSize: fs + 3, color: T.ink, paraSpaceBefore: 6, paraSpaceAfter: 6 });
        else if (b.t === 'h3') pushPara([{ text: plain(b.text), b: true }], { fontSize: fs + 1, color: T.accent, paraSpaceBefore: 4, paraSpaceAfter: 4 });
        else if (b.t === 'p') pushPara(inlineRuns(b.text), { fontSize: fs, color: '374151', paraSpaceAfter: 10 });
        else if (b.t === 'quote') pushPara([{ text: `“${plain(b.text)}”`, i: true }], { fontSize: fs, color: MUTED, paraSpaceAfter: 10 });
        else if (b.t === 'ul') b.items.forEach(it => pushPara(inlineRuns(it), { fontSize: fs, color: '374151', bullet: { indent: 20 }, paraSpaceAfter: 7 }));
        else if (b.t === 'ol') b.items.forEach(it => pushPara(inlineRuns(it), { fontSize: fs, color: '374151', bullet: { type: 'number', indent: 24 }, paraSpaceAfter: 7 }));
      });
      sl.addText(runs, { x: tx, y: Y, w: tw, h: th, fontFace: FONT, valign: 'top', margin: 0 });
    }

    // ── visual (grafik / tabel) ──
    if (visuals.length) {
      const vx = twoCol ? X + tw + 0.5 : X, vw = twoCol ? W - tw - 0.5 : W;
      const slot = (th - (visuals.length - 1) * 0.3) / visuals.length;
      visuals.forEach((v, i) => {
        const vy = Y + i * (slot + 0.3);
        if (v.t === 'chart') {
          const spec = v.spec;
          sl.addChart(spec.type === 'bar' ? 'bar' : 'line',
            spec.series.map(se => ({ name: se.name || spec.title || 'Data', labels: spec.labels, values: se.values })),
            {
              x: vx, y: vy, w: vw, h: slot, chartColors: T.palette,
              showLegend: spec.series.length > 1, legendPos: 'b', legendFontSize: 12,
              showTitle: !!spec.title, title: spec.title, titleFontSize: 14, titleColor: T.ink, titleFontFace: FONT,
              catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
              valGridLine: { color: LINE, size: 0.5 }, catGridLine: { style: 'none' },
              barDir: 'col', barGapWidthPct: 60,
              showValue: spec.type === 'bar' && spec.labels.length <= 8 && spec.series.length === 1, dataLabelFontSize: 11, dataLabelColor: T.ink,
              lineSize: 3, lineDataSymbolSize: 8,
            });
        } else if (v.t === 'image') {
          const im = IMG.get(v.src)!;
          const cap = v.caption || im.caption;
          const ih = cap ? slot - 0.4 : slot;
          sl.addImage({ data: im.data, x: vx, y: vy, w: vw, h: ih, sizing: { type: 'cover', w: vw, h: ih } });
          if (cap) sl.addText(cap, { x: vx, y: vy + ih + 0.02, w: vw, h: 0.36, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, valign: 'top', margin: 0 });
        } else if (v.t === 'table') {
          const rows = v.rows.slice(0, 12);
          const cols = Math.max(...rows.map(r => r.length));
          const fsz = cols > 4 ? 11 : 13;
          const rowH = Math.min(0.5, slot / rows.length);
          sl.addTable(
            rows.map((r, ri) => Array.from({ length: cols }, (_, ci) => {
              const c = r[ci] || '';
              return { text: plain(c), options: { bold: ri === 0, color: ri === 0 ? 'FFFFFF' : T.ink, fill: { color: ri === 0 ? '1F2937' : ri % 2 === 0 ? 'F6F7F9' : 'FFFFFF' }, align: ri > 0 && looksNumeric(c) ? 'right' : 'left', fontFace: FONT, fontSize: fsz } };
            })),
            { x: vx, y: vy, w: vw, rowH, border: { type: 'solid', pt: 0.5, color: LINE }, valign: 'middle', margin: [0.04, 0.1, 0.04, 0.1] },
          );
        }
      });
    }
  });

  const out = await pres.write({ outputType: 'blob' });
  return out as Blob;
}

// ─────────────────────────────────────────────
// PINTU UTAMA + unduh / bagikan
// ─────────────────────────────────────────────
export async function buildDocBlob(kind: DocKind, title: string, source: string): Promise<Blob> {
  const d = parseDoc(kind, title, source);
  T = d.theme;
  const make = async () => (kind === 'PDF' ? buildPdf(d) : kind === 'DOCS' ? await buildDocx(d) : kind === 'EXCEL' ? buildXlsx(d) : await buildPptx(d));
  let raw: any;
  try {
    IMG = await resolveDocImages(d); // foto @img (gagal diambil = dilewati)
    raw = await make();
  } catch (e) {
    // Gagal gara-gara foto / grafik? Coba lagi tanpa foto supaya file tetap jadi dan bisa diunduh.
    console.warn('[Cylen] build dokumen dengan foto gagal, coba tanpa foto', e);
    IMG = new Map();
    raw = await make();
  }
  // Paksa tipe MIME yang benar: pptxgenjs / JSZip memberi 'application/zip', dan Chrome HP lalu menamai file jadi .zip
  return new Blob([raw], { type: DOC_MIME[kind] });
}

export const docFileName = (kind: DocKind, name: string) => `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Dokumen'}.${DOC_EXT[kind]}`;

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Bagikan lewat share sheet bawaan perangkat. Chrome HP hanya mengizinkan jenis file tertentu (PDF, gambar, dll),
 * jadi untuk Word / PPT / Excel yang ditolak → bagikan ringkasan teksnya lewat share sheet yang sama;
 * kalau share sheet tidak ada sama sekali (desktop) → unduh.
 */
export async function shareBlob(
  blob: Blob, filename: string, kind: DocKind, fallbackText?: string,
  alt?: { blob: Blob; filename: string } | null,
): Promise<'shared' | 'pdf' | 'text' | 'downloaded'> {
  const nav: any = navigator;
  // 1) file aslinya (PDF selalu bisa; Word/PPT/Excel hanya di perangkat yang mengizinkan)
  try {
    const file = new File([blob], filename, { type: DOC_MIME[kind] });
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'shared'; // user menutup share sheet
  }
  // 2) Chrome HP menolak Word/PPT/Excel → bagikan versi PDF-nya supaya tetap bisa dikirim ke WhatsApp dll.
  if (alt) {
    try {
      const f = new File([alt.blob], alt.filename, { type: 'application/pdf' });
      if (nav.canShare && nav.canShare({ files: [f] })) {
        await nav.share({ files: [f], title: alt.filename });
        return 'pdf';
      }
    } catch (e: any) {
      if (e && e.name === 'AbortError') return 'pdf';
    }
  }
  // 3) ringkasan teks
  try {
    if (nav.share && fallbackText) {
      await nav.share({ title: filename, text: fallbackText.slice(0, 6000) });
      return 'text';
    }
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'text';
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

/** Versi PDF dari dokumen Word / PPT (untuk dibagikan lewat HP yang tidak mau menerima file .docx/.pptx). */
export async function buildSharePdf(kind: DocKind, title: string, source: string): Promise<{ blob: Blob; filename: string } | null> {
  if (kind === 'PDF' || kind === 'EXCEL') return null;
  const blob = await buildDocBlob('PDF', title, source);
  return { blob, filename: docFileName('PDF', title) };
}
