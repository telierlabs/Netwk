// ─────────────────────────────────────────────
// CODE CARDS — src/lib/codeCards.ts
// Pembantu untuk kartu kode di jawaban AI (chat pribadi & grup):
//   • baca baris pembuka blok kode:  ```tsx file=DocViews.tsx note="Menyiapkan PDF cadangan"
//   • deteksi blok kode yang belum ditutup (AI masih menulis) → tampil loading >_
//   • pecah teks jadi paragraf TANPA memotong isi blok kode
//   • pewarnaan sintaks ringan (warna ikut tema)
//   • aturan untuk AI (CODE_CARD_RULES)
// ─────────────────────────────────────────────

export interface FenceMeta { file: string; note: string }

const quoted = (key: string, meta: string): string => {
  const m = new RegExp(key + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s]+))', 'i').exec(meta);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '';
};

/** Baca `file=... note="..."` dari baris pembuka blok kode. */
export function parseFenceMeta(meta: string | undefined | null): FenceMeta {
  const t = String(meta || '');
  return { file: quoted('file', t), note: quoted('note', t) };
}

const LANG_LABEL: Record<string, string> = {
  ts: 'TS', typescript: 'TS', tsx: 'TSX', js: 'JS', javascript: 'JS', jsx: 'JSX', mjs: 'JS',
  py: 'Python', python: 'Python', html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', yaml: 'YAML', yml: 'YAML',
  sql: 'SQL', bash: 'Shell', sh: 'Shell', shell: 'Shell', zsh: 'Shell', kt: 'Kotlin', kotlin: 'Kotlin',
  java: 'Java', go: 'Go', rs: 'Rust', rust: 'Rust', php: 'PHP', rb: 'Ruby', ruby: 'Ruby', c: 'C', cpp: 'C++',
  cs: 'C#', csharp: 'C#', swift: 'Swift', dart: 'Dart', md: 'Markdown', markdown: 'Markdown', xml: 'XML',
  text: 'Teks', txt: 'Teks', plaintext: 'Teks', '': 'Kode',
};
export const langLabel = (lang: string): string => LANG_LABEL[(lang || '').toLowerCase()] || (lang ? lang.toUpperCase() : 'Kode');

/** Posisi awal (offset) blok kode yang belum ditutup di akhir teks, atau null kalau semua blok sudah tertutup. */
export function openFenceOffset(text: string): number | null {
  let open: { marker: string; at: number } | null = null;
  const re = /^([ \t]*)(`{3,}|~{3,})/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const marker = m[2];
    if (!open) open = { marker, at: m.index + m[1].length };
    else if (marker[0] === open.marker[0] && marker.length >= open.marker.length) open = null;
  }
  return open ? open.at : null;
}

/** Pecah teks per paragraf (baris kosong) tetapi blok kode selalu utuh, meski berisi baris kosong. */
export function splitKeepFences(text: string): string[] {
  const lines = text.split('\n');
  const out: string[] = [];
  let cur: string[] = [];
  let fence: string | null = null;
  const flush = () => { const s = cur.join('\n'); if (s.trim()) out.push(s); cur = []; };
  for (const line of lines) {
    const f = /^[ \t]*(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1];
      else if (f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
    }
    if (!fence && line.trim() === '' && !f) { flush(); continue; }
    cur.push(line);
  }
  flush();
  return out;
}


export interface CodeFlowFile { name: string; note: string; lang: string; lines: number }
/** Baca jawaban AI jadi ringkasan alur: kalimat pembuka + tiap file (nama, catatan, bahasa, jumlah baris). */
export function summarizeCodeFlow(text: string): { intro: string; files: CodeFlowFile[] } {
  const lines = String(text || '').split('\n');
  const files: CodeFlowFile[] = [];
  const head: string[] = [];
  let fence: string | null = null, info = '', count = 0, seenFence = false;
  const push = () => {
    const lang = info.split(/\s+/)[0] || '';
    const meta = parseFenceMeta(info.slice(lang.length));
    files.push({ name: meta.file || langLabel(lang), note: meta.note, lang, lines: count });
  };
  for (const line of lines) {
    const f = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence) {
      if (f) { fence = f[1]; info = (f[2] || '').trim(); count = 0; seenFence = true; }
      else if (!seenFence) head.push(line);
    } else if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !(f[2] || '').trim()) {
      push(); fence = null;
    } else count++;
  }
  if (fence) push(); // blok belum ditutup (masih ditulis)
  const intro = head.join(' ').replace(/\s+/g, ' ').trim();
  return { intro: intro.length > 200 ? intro.slice(0, 197) + '…' : intro, files };
}

/** Kode dianggap pendek kalau tidak lebih dari ini (boleh ditampilkan sebagai blok panjang). */
export const SHORT_CODE_LINES = 12;

// ── Pewarnaan sintaks ringan ──
const KW = 'const|let|var|function|return|if|else|elif|for|while|do|switch|case|break|continue|class|extends|new|this|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|type|interface|enum|public|private|protected|static|readonly|void|null|undefined|true|false|None|True|False|def|lambda|pass|with|as|is|not|and|or|fun|val|func|struct|impl|fn|mut|use|package|select|insert|update|delete|where|join|group|order|by|create|table|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|GROUP|ORDER|BY|CREATE|TABLE|AND|OR|NOT|NULL';
const HASH_LANGS = new Set(['py', 'python', 'sh', 'bash', 'shell', 'zsh', 'yaml', 'yml', 'rb', 'ruby', 'toml', 'dockerfile']);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function highlightCode(code: string, lang: string): string {
  const l = (lang || '').toLowerCase();
  const comment = HASH_LANGS.has(l) ? '#.*' : l === 'sql' ? '--.*' : l === 'css' || l === 'scss' ? '\\/\\*[\\s\\S]*?\\*\\/' : l === 'html' || l === 'xml' ? '<!--[\\s\\S]*?-->' : '\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\/';
  const tag = l === 'html' || l === 'xml' ? '|(<\\/?[A-Za-z][\\w.-]*)' : '';
  const re = new RegExp(`(${comment})|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|\\b(${KW})\\b|\\b(\\d+(?:\\.\\d+)?)\\b|\\b([A-Za-z_$][\\w$]*)(?=\\()${tag}`, 'g');
  let out = '', last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[0] === '') { re.lastIndex++; continue; }
    out += esc(code.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : m[4] ? 'n' : m[5] ? 'f' : 'k';
    out += `<span class="cy-tk-${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

// ── Pilihan tampilan kode pendek (disimpan di perangkat) ──
const STYLE_KEY = 'cylen.codeShortStyle';
export type ShortStyle = 'card' | 'block';
export const getShortStyle = (): ShortStyle => {
  try { return localStorage.getItem(STYLE_KEY) === 'block' ? 'block' : 'card'; } catch { return 'card'; }
};
export const setShortStyle = (v: ShortStyle) => {
  try { localStorage.setItem(STYLE_KEY, v); } catch { /* penyimpanan diblokir: pilihan hanya berlaku sesi ini */ }
  try { window.dispatchEvent(new Event('cylen-code-style')); } catch { /* abaikan */ }
};

/** Aturan untuk AI: format blok kode supaya bisa jadi kartu dengan kalimat nyata. */
export const CODE_CARD_RULES = `# ATURAN KODE (kartu kode)
Setiap blok kode WAJIB punya baris pembuka berisi nama file dan SATU kalimat catatan, contoh:
\`\`\`tsx file=DocViews.tsx note="Menyiapkan PDF cadangan saat popup dibuka"
kode di sini
\`\`\`
- note = satu kalimat pendek tentang apa yang dikerjakan di file itu. Jangan tulis kalimat generik seperti "memahami pertanyaan".
- Satu file = satu blok. Jangan menggabungkan beberapa file dalam satu blok, meski kodenya pendek.
- Boleh menulis penjelasan singkat sebebasnya di antara blok, tetapi jangan menjelaskan tiap potongan kode. Cukup satu kalimat pembuka sebelum blok pertama dan satu penutup setelah blok terakhir.
- Kalau penyebab bug belum jelas dari kode yang diberikan, cari dulu info error-nya (dokumentasi, forum, berita) lalu pakai hasilnya sebelum memperbaiki.
- Tulis kode lengkap yang siap ditimpa, bukan potongan dengan "...".
- Kalau user meminta simulasi, demo, desain, mockup, atau tampilan (kartu nama, landing page, animasi, game kecil, kalkulator): tulis SATU file HTML mandiri (HTML + CSS + JS inline, jangan dipecah jadi file terpisah) dalam satu blok \`\`\`html file=nama.html note="..."\`\`\`. Hasilnya dijalankan langsung di popup, jadi harus rapi di lebar 360px, tanpa URL gambar karangan (pakai SVG inline atau CSS), dan boleh memakai pustaka dari cdnjs.cloudflare.com. Setelah blok, cukup satu kalimat penutup.`;
