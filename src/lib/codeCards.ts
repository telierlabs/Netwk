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


export interface CodeFlowFile { name: string; note: string; lang: string; lines: number; detail?: string; stages?: string[] }
/** Baca jawaban AI jadi ringkasan alur: kalimat pembuka + tiap file (nama, catatan, bahasa, jumlah baris). */
export function summarizeCodeFlow(text: string): { intro: string; files: CodeFlowFile[] } {
  const lines = String(text || '').split('\n');
  const files: CodeFlowFile[] = [];
  const head: string[] = [];
  let fence: string | null = null, info = '', count = 0, seenFence = false, body: string[] = [];
  const push = () => {
    const lang = info.split(/\s+/)[0] || '';
    const meta = parseFenceMeta(info.slice(lang.length));
    const name = meta.file || langLabel(lang);
    files.push({ name, note: meta.note, lang, lines: count, detail: describeCode(body.join('\n'), lang, name), stages: codeStages(body.join('\n'), lang, name, meta.note) });
  };
  for (const line of lines) {
    const f = /^[ \t]*(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence) {
      if (f) { fence = f[1]; info = (f[2] || '').trim(); count = 0; body = []; seenFence = true; }
      else if (!seenFence) head.push(line);
    } else if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !(f[2] || '').trim()) {
      push(); fence = null;
    } else { count++; body.push(line); }
  }
  if (fence) push(); // blok belum ditutup (masih ditulis)
  const intro = head.join(' ').replace(/\s+/g, ' ').trim();
  return { intro: intro.length > 200 ? intro.slice(0, 197) + '…' : intro, files };
}

const lastIndex = (code: string, re: RegExp): number => {
  const g = new RegExp(re.source, 'gi');
  let i = -1, m: RegExpExecArray | null;
  while ((m = g.exec(code)) !== null) { i = m.index; if (m[0] === '') g.lastIndex++; }
  return i;
};
const isHtmlLike = (lang: string, file: string) => /^(html|htm|svg)$/i.test(lang || '') || /\.(html?|svg)$/i.test(file || '');

/** Ringkasan isi kode yang nyata (bukan template): bagian-bagian HTML/CSS/JS, jumlah warna, fungsi, baris. */
export function describeCode(code: string, lang: string, file = ''): string {
  const c = code || '';
  const lines = c ? c.split('\n').length : 0;
  const parts: string[] = [];
  if (isHtmlLike(lang, file)) {
    parts.push(/^svg$/i.test(lang) ? 'SVG' : 'HTML');
    if (/<style\b|style\s*=/i.test(c)) parts.push('CSS');
    if (/<script\b/i.test(c)) parts.push('JavaScript');
    if (/<svg\b/i.test(c) && !/^svg$/i.test(lang)) parts.push('SVG');
    const colors = new Set((c.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi) || []).map(x => x.toLowerCase()));
    const out = [parts.join(', ')];
    if (colors.size) out.push(`${colors.size} warna`);
    const font = /font-family\s*:\s*['"]?([A-Za-z][\w -]{1,24})/i.exec(c)?.[1]?.trim();
    if (font) out.push(`font ${font}`);
    if (/@media/i.test(c)) out.push('responsif');
    out.push(`${lines} baris`);
    return out.join(' · ');
  }
  const fn = (c.match(/\b(?:function|def|fun|fn|func)\s+[A-Za-z_$]|=>\s*[{(]|\b[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(/g) || []).length;
  const cls = (c.match(/\b(?:class|interface|struct)\s+[A-Za-z_$]/g) || []).length;
  const out = [langLabel(lang)];
  if (cls) out.push(`${cls} kelas/tipe`);
  if (fn) out.push(`${fn} fungsi`);
  out.push(`${lines} baris`);
  return out.join(' · ');
}

const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));
const listOf = (a: string[], n = 3): string => { const u = uniq(a); return u.slice(0, n).join(', ') + (u.length > n ? ` dan ${u.length - n} lainnya` : ''); };

/** Langkah-langkah nyata yang terbaca dari kode (berurutan sesuai isi). Dipakai untuk loading dan catatan Alur. */
export function codeStages(code: string, lang: string, file: string, note: string): string[] {
  const c = code || '';
  if (!c.trim()) return [file ? `Menyiapkan ${file}` : (note || 'Menyiapkan kode')];
  const out: string[] = [];
  if (isHtmlLike(lang, file)) {
    out.push('Menyiapkan kerangka HTML dan font');
    const st = /<style\b[^>]*>([\s\S]*?)(?:<\/style>|$)/i.exec(c);
    if (st) {
      const css = st[1];
      const sels = [...css.matchAll(/([.#][A-Za-z][\w-]*)[^{};]*\{/g)].map(m => m[1]);
      const color = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|gradient/i.test(css);
      out.push(sels.length ? `Menulis CSS untuk ${listOf(sels)}${color ? ', lengkap dengan warna' : ''}` : 'Menulis CSS: warna, ukuran, dan tata letak');
      if (/@keyframes/i.test(css)) out.push('Menambahkan animasi CSS');
      if (/@media/i.test(css)) out.push('Menyesuaikan tampilan untuk layar kecil');
    }
    const bi = lastIndex(c, /<body\b/);
    if (bi >= 0) {
      const after = c.slice(bi);
      const cls = [...after.matchAll(/class\s*=\s*["']([\w-]+)/gi)].map(m => '.' + m[1]);
      out.push(cls.length ? `Menyusun elemen ${listOf(cls)}` : 'Menyusun isi halaman');
      if (/<canvas\b/i.test(after)) out.push('Menyiapkan kanvas untuk menggambar');
      if (/<svg\b/i.test(after)) out.push('Menggambar SVG');
    }
    const si = lastIndex(c, /<script\b/);
    if (si >= 0) {
      const js = c.slice(si);
      const fns = [...js.matchAll(/function\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)].map(m => m[1] || m[2]);
      out.push(fns.length ? `Menulis JavaScript: fungsi ${listOf(fns)}` : 'Menulis JavaScript untuk interaksinya');
      if (/addEventListener|onclick|ontouch/i.test(js)) out.push('Menghubungkan klik dan sentuhan');
      if (/requestAnimationFrame|setInterval/.test(js)) out.push('Menjalankan animasi berulang');
    }
    return out;
  }
  if (/^\s*(import|from)\s/m.test(c)) out.push('Menyiapkan import');
  const defs = [...c.matchAll(/\b(function|def|class|interface|fun|fn|func|struct)\s+([A-Za-z_$][\w$]*)/g)];
  defs.slice(0, 8).forEach(m => out.push(`Menulis ${/class|interface|struct/.test(m[1]) ? 'kelas' : 'fungsi'} ${m[2]}`));
  if (!defs.length) {
    const v = [...c.matchAll(/\b(?:const|let|var|val)\s+([A-Za-z_$][\w$]*)/g)].pop()?.[1];
    out.push(v ? `Menulis ${v} di ${file || langLabel(lang)}` : `Menulis ${file || `kode ${langLabel(lang)}`}`);
  }
  return out;
}

/** Langkah terakhir (yang sedang dikerjakan AI sekarang). */
export function liveStage(code: string, lang: string, file: string, note: string): string {
  const st = codeStages(code, lang, file, note);
  return st[st.length - 1];
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
