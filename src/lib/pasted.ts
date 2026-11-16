// ─────────────────────────────────────────────
// PASTED CONTENT — src/lib/pasted.ts
// Konten panjang yang ditempel di kolom ketik (kode panjang / teks sangat panjang)
// berubah jadi KARTU "Konten yang ditempel" (seperti Claude), bukan membanjiri kolom ketik.
//   • shouldBecomeCard : tentukan apakah tempelan jadi kartu (kode: lebih mudah, teks biasa: harus sangat panjang)
//   • packPasted       : gabungkan teks ketikan + kartu jadi SATU pesan (kartu = blok ```cy-paste ... ```)
//   • splitPasted      : kebalikannya, dipakai bubble untuk menampilkan kartu dan kolom ketik untuk Edit
//   • stripPasted      : ganti blok jadi "[Konten yang ditempel]" untuk kutipan balasan
// Karena kartu hidup di dalam teks pesan, jalannya sama untuk chat pribadi dan grup, dan AI ikut membaca isinya.
// ─────────────────────────────────────────────

export interface PastedBlock { text: string; lang: string; kind: 'code' | 'text' }

/** Kode: kartu mulai dari 8 baris / 400 karakter. Teks biasa: harus sangat panjang (jarang jadi kartu). */
export const PASTE_CODE_MIN_LINES = 8;
export const PASTE_CODE_MIN_CHARS = 400;
export const PASTE_TEXT_MIN_CHARS = 4000;
export const MAX_PASTE_CARDS = 10;

export function looksLikeCode(t: string): boolean {
  const lines = t.split('\n');
  if (lines.length < 4) return false;
  let score = 0;
  if (/^\s*(import|export|const|let|var|function|class|def|from\s+\S+\s+import|#include|package|public|private|interface|type\s+\w+\s*=|return|async|await|<\/?[a-z][\w-]*[\s>/]|<!doctype|@media|\.[\w-]+\s*\{|SELECT|INSERT|CREATE)\b/im.test(t)) score += 2;
  const sym = (t.match(/[{}();=<>[\]]/g) || []).length / Math.max(1, t.length);
  if (sym > 0.035) score += 2;
  const indented = lines.filter(l => /^( {2,}|\t)\S/.test(l)).length / lines.length;
  if (indented > 0.25) score += 1;
  const ends = lines.filter(l => /[;{}),]\s*$/.test(l)).length / lines.length;
  if (ends > 0.3) score += 1;
  return score >= 3;
}

export function detectLang(t: string): string {
  const s = t.slice(0, 6000);
  if (/^\s*[{[][\s\S]*[}\]]\s*$/.test(t)) { try { JSON.parse(t); return 'json'; } catch { /* bukan JSON */ } }
  if (/import\s+React|from\s+['"]react['"]|useState\(|<[A-Z]\w*[\s/>]|className=/.test(s)) return 'tsx';
  if (/<!doctype html|<html[\s>]|<\/(div|body|head|section|p|span)>/i.test(s)) return 'html';
  if (/:\s*(string|number|boolean)\b|interface\s+\w+\s*\{|\bas\s+const\b|<[A-Z]\w*>\(/.test(s) && /\b(const|let|function|import|export)\b/.test(s)) return 'ts';
  if (/^\s*(def |class \w+\(|import \w+$|from \w+ import|print\()/m.test(s)) return 'py';
  if (/\b(const|let|var|function|=>|require\(|module\.exports|console\.log)\b/.test(s)) return 'js';
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/im.test(s)) return 'sql';
  if (/[.#][\w-]+\s*\{[^}]*:\s*[^}]*;/.test(s)) return 'css';
  if (/^#!\/bin\/(ba)?sh|^\s*(npm|yarn|pip|git|cd|ls|sudo)\s/m.test(s)) return 'bash';
  if (/\b(public|private)\s+(static\s+)?(class|void|int|String)\b/.test(s)) return 'java';
  return '';
}

/** null = tempel seperti biasa; selain itu = jadikan kartu. */
export function shouldBecomeCard(text: string): PastedBlock | null {
  const t = (text || '').replace(/\r\n/g, '\n');
  const lines = t.split('\n').length;
  if (looksLikeCode(t) && (lines >= PASTE_CODE_MIN_LINES || t.length >= PASTE_CODE_MIN_CHARS)) {
    return { text: t, lang: detectLang(t), kind: 'code' };
  }
  if (t.length >= PASTE_TEXT_MIN_CHARS) return { text: t, lang: '', kind: 'text' };
  return null;
}

/**
 * Cadangan untuk tempelan yang TIDAK memicu event "paste" (clipboard keyboard HP seperti Gboard/Xiaomi,
 * drag teks, dll): kalau isi kolom ketik tiba-tiba bertambah banyak sekaligus, bagian yang masuk
 * dicari (selisih awalan/akhiran) lalu dinilai dengan aturan yang sama. null = bukan tempelan besar.
 */
export function extractBigInsert(prev: string, next: string): { rest: string; block: PastedBlock } | null {
  if (next.length - prev.length < 120) return null; // mengetik / autocorrect tidak pernah menambah sebanyak ini sekaligus
  let a = 0;
  const max = Math.min(prev.length, next.length);
  while (a < max && prev.charCodeAt(a) === next.charCodeAt(a)) a++;
  let b = 0;
  while (b < max - a && prev.charCodeAt(prev.length - 1 - b) === next.charCodeAt(next.length - 1 - b)) b++;
  const inserted = next.slice(a, next.length - b);
  const block = shouldBecomeCard(inserted);
  if (!block) return null;
  return { rest: next.slice(0, a) + next.slice(next.length - b), block };
}

const FENCE_INFO = 'cy-paste';

/** Teks ketikan + kartu → satu pesan. */
export function packPasted(typed: string, blocks: PastedBlock[]): string {
  const parts: string[] = [];
  if (typed.trim()) parts.push(typed.trimEnd());
  for (const b of blocks) {
    const run = Math.max(0, ...(b.text.match(/`+/g) || []).map(x => x.length));
    const fence = '`'.repeat(Math.max(3, run + 1));
    parts.push(`${fence}${FENCE_INFO} kind=${b.kind}${b.lang ? ` lang=${b.lang}` : ''}\n${b.text}\n${fence}`);
  }
  return parts.join('\n\n');
}

export function hasPasted(content: string): boolean {
  return /^[ \t]*(`{3,}|~{3,})cy-paste\b/m.test(content || '');
}

/** Pisahkan kartu dari teks biasa (blok kode biasa di teks ketikan tetap dibiarkan). */
export function splitPasted(content: string): { text: string; blocks: PastedBlock[] } {
  const src = content || '';
  if (!hasPasted(src)) return { text: src, blocks: [] };
  const lines = src.split('\n');
  const keep: string[] = [];
  const blocks: PastedBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = /^([ \t]*)(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!m) { keep.push(lines[i]); i++; continue; }
    const marker = m[2];
    const info = m[3].trim();
    const body: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const c = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(lines[j]);
      if (c && c[1][0] === marker[0] && c[1].length >= marker.length) break;
      body.push(lines[j]); j++;
    }
    const closed = j < lines.length;
    if (new RegExp('^' + FENCE_INFO + '\\b').test(info)) {
      const lang = /\blang=([\w+#-]+)/.exec(info)?.[1] || '';
      const kind: PastedBlock['kind'] = /\bkind=text\b/.test(info) ? 'text' : 'code';
      blocks.push({ text: body.join('\n'), lang, kind });
    } else {
      keep.push(...lines.slice(i, closed ? j + 1 : j));
    }
    i = closed ? j + 1 : j;
  }
  const joined = keep.join('\n').replace(/\n{3,}/g, '\n\n');
  // awalan "[Membalas pesan: ...]\n\n" harus utuh supaya bubble tetap mengenalinya
  return { text: /^\[Membalas pesan:/.test(joined) ? joined : joined.trim(), blocks };
}

export function stripPasted(content: string): string {
  const { text, blocks } = splitPasted(content);
  if (!blocks.length) return content || '';
  const t = text.replace(/^\[Membalas pesan:[\s\S]*?\]\n\n/, '').trim();
  return (t ? t + ' ' : '') + blocks.map(() => '[Konten yang ditempel]').join(' ');
}
