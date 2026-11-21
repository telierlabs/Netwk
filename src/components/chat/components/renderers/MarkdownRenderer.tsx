// ─────────────────────────────────────────────
// MARKDOWN RENDERER + STREAMING TEXT
// src/components/chat/components/renderers/MarkdownRenderer.tsx
//
// PERUBAHAN dari versi lama:
//   • onComplete dipanggil dengan delay lebih besar (150ms) agar
//     action bar tidak muncul sebelum teks benar-benar selesai render
//   • completedRef direset dengan benar saat isStreaming kembali true
//   • ActiveParagraph: animasi fade lebih halus (0.25s bukan 0.18s)
//   • Cursor hanya muncul saat isStreaming === true (sudah benar di asli)
//   • BARU: blok ```image-search → <ImageStrip /> (foto publik di dalam jawaban)
//   • BARU: TEKS ARAB tampil benar — paragraf yang isinya Arab dirender kanan→kiri & rata kanan, Arab di tengah kalimat
//     jadi span RTL; font Amiri Quran (punya tanda baca Al-Qur'an, tidak ada kotak "tofu"), tanpa letter-spacing yang
//     merusak sambungan huruf. Terjemah / transliterasi Latin dibuat lebih terang (tidak abu-abu gelap lagi).
//   • BARU: RUMUS pakai garis — pecahan tampil bertumpuk (KaTeX \frac), bukan "1/2". Mendukung $...$, $$...$$, \(...\), \[...\];
//     pecahan polos "1/2" (pembilang < penyebut, penyebut 2–9) otomatis jadi pecahan bertumpuk.
// ─────────────────────────────────────────────
import React, { memo, useContext, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { HtmlPreview } from './HtmlPreview';
import { MermaidDiagram, DiagramBlock } from '../diagrams/DiagramBlock';
import { CopyCard } from './CopyCard';
import { PresentationRenderer, DocumentRenderer } from './PresentationRenderer';
import { CodeBlock } from './CodeBlock';
import { CodeCardHost, CodeStreamCtx } from './CodeCard';
import { openFenceOffset, parseFenceMeta, splitKeepFences } from '../../../../lib/codeCards';
import { ImageStrip } from './ImageStrip';
import { CitationContext, CitePillView, remarkCitePills } from '../search/citations';
import { MediaContext, MediaBlockView, ListItemWithThumb, remarkMediaInserts } from '../media/MediaBlocks';
import type { ThumbItem } from '../../../../lib/media';

const MD_STYLES = `
  @keyframes cursorBlink { 0%,100%{opacity:0.6} 50%{opacity:0} }
  @keyframes chunkFadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cylen-md { font-size:var(--chat-text-size,15px); line-height:1.78; color:var(--text,#141414); letter-spacing:0.01em; min-width:0; max-width:100%; overflow-wrap:anywhere; word-break:break-word; }
  .cylen-md pre { max-width:100%; overflow-x:auto; }
  .cylen-md img, .cylen-md video, .cylen-md iframe { max-width:100%; }
  .cylen-md h1 { font-size:1.45rem; font-weight:760; margin:1.5rem 0 0.6rem; line-height:1.25; letter-spacing:-0.025em; }
  .cylen-md h2 { font-size:1.14rem; font-weight:680; margin:1.2rem 0 0.4rem; letter-spacing:-0.014em; }
  .cylen-md h3 { font-size:1rem; font-weight:660; margin:0.95rem 0 0.3rem; }
  .cylen-md p { margin:0 0 0.85rem; }
  .cylen-md p:last-child { margin-bottom:0; }
  .cylen-md ul { list-style:none; padding-left:0; margin:0.3rem 0 0.85rem; }
  .cylen-md ol { list-style:none; counter-reset:cylen-ol; padding-left:0; margin:0.3rem 0 0.85rem; }
  .cylen-md ul>li { padding-left:1.25rem; position:relative; margin-bottom:0.45rem; line-height:1.7; }
  .cylen-md ul>li::before { content:''; position:absolute; left:2px; top:0.62em; width:5px; height:5px; border-radius:50%; background:var(--text,#141414); opacity:0.4; }
  .cylen-md ol>li { counter-increment:cylen-ol; padding-left:1.5rem; position:relative; margin-bottom:0.45rem; line-height:1.7; }
  .cylen-md ol>li::before { content:counter(cylen-ol) '.'; position:absolute; left:0; font-size:0.82em; font-weight:700; color:var(--mu,#909090); top:0.1em; }
  .cylen-md code:not(pre code) { background:var(--sf,#f7f5f1); color:var(--text,#141414); padding:0.1em 0.4em; border-radius:5px; font-family:'JetBrains Mono','Fira Code',monospace; font-size:0.83em; border:1px solid var(--bd,#e0ddd7); }
  .cylen-md blockquote { border-left:3px solid var(--bd,#e0ddd7); padding:0.5rem 0.9rem; margin:0.9rem 0; color:color-mix(in srgb, var(--text,#141414) 86%, var(--bg,#ffffff)); font-style:italic; background:var(--sf,#f7f5f1); border-radius:0 10px 10px 0; }
  .cylen-md hr { border:none; border-top:1px solid var(--bd,#e0ddd7); margin:1.2rem 0; opacity:0.4; }
  .cylen-md strong { font-weight:720; color:var(--text,#141414); }
  .cylen-md em { font-style:italic; color:color-mix(in srgb, var(--text,#141414) 86%, var(--bg,#ffffff)); }
  .cylen-md a { color:var(--text,#141414); text-decoration:underline; text-underline-offset:3px; text-decoration-color:var(--bd,#e0ddd7); }
  .cylen-md a:hover { text-decoration-color:var(--mu,#909090); }
  .cylen-md .cy-tbl { width:100%; max-width:100%; overflow-x:auto; margin:1rem 0 1.1rem; border-radius:14px; border:1.5px solid var(--bd,#e0ddd7); -webkit-overflow-scrolling:touch; }
  .cylen-md table { border-collapse:collapse; width:100%; min-width:100%; font-size:14px; margin:0; border:none; }
  .cylen-md thead tr { background:var(--sf,#f7f5f1); }
  .cylen-md th { padding:13px 15px; font-size:10.5px; font-weight:700; text-align:left; color:var(--mu,#909090); text-transform:uppercase; letter-spacing:0.07em; border-bottom:1.5px solid var(--bd,#e0ddd7); line-height:1.3; vertical-align:bottom; }
  .cylen-md td { padding:14px 15px; color:var(--text,#141414); border-bottom:1px solid var(--bd,#e0ddd7); line-height:1.5; overflow-wrap:normal; word-break:normal; vertical-align:top; }
  .cylen-md td:first-child { font-weight:640; min-width:110px; }
  .cylen-md tbody tr:last-child td { border-bottom:none; }
  .cylen-md tbody tr:hover td { background:var(--sf,#f7f5f1); }
  .cylen-md .katex { font-size:1.08em; overflow-wrap:normal; word-break:normal; letter-spacing:0; }
  .cylen-md .katex .mfrac .frac-line { border-bottom-width:0.06em; }
  .cylen-md .cy-ar { font-family:'Amiri Quran','Amiri','Noto Naskh Arabic','Scheherazade New','Geeza Pro','Al Bayan','Traditional Arabic','Droid Arabic Naskh','Segoe UI',serif; font-size:1.34em; line-height:2; direction:rtl; unicode-bidi:isolate; letter-spacing:0 !important; word-spacing:0.05em; font-weight:400; font-style:normal; color:var(--text,#141414); overflow-wrap:normal; word-break:normal; font-feature-settings:'liga' 1,'calt' 1,'ccmp' 1,'mark' 1,'mkmk' 1; font-variant-ligatures:common-ligatures contextual; text-rendering:optimizeLegibility; -webkit-font-smoothing:antialiased; }
  .cylen-md .cy-ar-block { direction:rtl; text-align:right; unicode-bidi:isolate; overflow-wrap:normal; word-break:normal; line-height:2.1; margin-top:0.35rem; letter-spacing:0 !important; }
  .cylen-md .cy-ar-block > .cy-ar { display:inline; }
  .cylen-md p .katex, .cylen-md li .katex { max-width:100%; }
  .cylen-md .katex-display { margin:1.2rem 0; padding:0.8rem 1rem; background:var(--sf,#f7f5f1); border:1px solid var(--bd,#e0ddd7); border-radius:12px; overflow-x:auto; text-align:center; }
  @keyframes cyBlockIn { from { opacity:0; transform:translateY(12px); filter:blur(4px); } to { opacity:1; transform:none; filter:blur(0); } }
  .cy-reveal .cylen-md > * { opacity:0; animation:cyBlockIn .75s cubic-bezier(.22,.8,.24,1) forwards; animation-delay:calc(min(var(--cy-i,0),9) * 65ms); }
  .cy-reveal .cylen-md > :nth-child(2){--cy-i:1} .cy-reveal .cylen-md > :nth-child(3){--cy-i:2} .cy-reveal .cylen-md > :nth-child(4){--cy-i:3} .cy-reveal .cylen-md > :nth-child(5){--cy-i:4}
  .cy-reveal .cylen-md > :nth-child(6){--cy-i:5} .cy-reveal .cylen-md > :nth-child(7){--cy-i:6} .cy-reveal .cylen-md > :nth-child(8){--cy-i:7} .cy-reveal .cylen-md > :nth-child(n+9){--cy-i:8}
  @media (prefers-reduced-motion: reduce) { .cy-reveal .cylen-md > * { animation:none; opacity:1; } }
  .cylen-chunk-new {
    animation: chunkFadeIn 0.25s ease-out both;
  }
`;

// ── Tanda `$` untuk mata uang ("US$1 triliun", "$800 miliar") jangan dibaca sebagai rumus ──
// `$` diganti 1 karakter pengganti (panjang teks TIDAK berubah, jadi posisi pil sumber / foto tetap pas),
// lalu dikembalikan ke `$` pada teks biasa setelah remark-math selesai. Blok kode & `kode` tidak disentuh.
// Rumus yang diawali angka ("$1/2$", "$5 + 3 = 8$", "$2^{10}$") dikenali sebagai RUMUS, bukan mata uang.
// Penanda LaTeX \( \) dan \[ \] diubah ke ` $ ` / `$$` (panjang sama) supaya ikut terbaca sebagai rumus.
const CUR = '\uE000';
const CODE_SPLIT = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g;
const CURRENCY_DOLLAR = /(^|[^\\$])\$(?=\d[\d.,]*(?:\s|[A-Za-z]{2,}|$|[)\].,;:!?%\-–/]))/g;

/** `$` di posisi i (diikuti angka) membuka rumus? (ada `$` penutup di baris yang sama, isinya kelihatan rumus, bukan kalimat) */
function opensMath(s: string, i: number): boolean {
  const nl = s.indexOf('\n', i);
  const end = nl === -1 ? s.length : nl;
  for (let j = i + 1; j < end; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c !== '$') continue;
    if (/\s/.test(s[j - 1]) || /\d/.test(s[j + 1] || '')) return false;
    const body = s.slice(i + 1, j);
    if (body.length > 200) return false;
    if (/\\[a-zA-Z]+/.test(body)) return true;                       // ada perintah LaTeX (\frac, \sqrt, ...)
    const bare = body.replace(/\\[a-zA-Z]+/g, '');
    if (/[A-Za-z]{3,}/.test(bare)) return false;                       // ada kata biasa → kalimat, bukan rumus
    return /[\^_{}=+*/<>]|\d\s*[-−]\s*\d/.test(body);
  }
  return false;
}

export function shieldCurrency(text: string): string {
  if (text.indexOf('$') === -1 && text.indexOf('\\(') === -1 && text.indexOf('\\[') === -1) return text;
  return text.split(CODE_SPLIT).map((part, i) => {
    if (i % 2 === 1) return part;
    let p = part;
    if (p.indexOf('\\(') !== -1) p = p.replace(/\\\(([^\n]*?)\\\)/g, (_m, inner) => ' $' + inner + '$ ');
    if (p.indexOf('\\[') !== -1) p = p.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => '$$' + inner + '$$');
    if (p.indexOf('$') === -1) return p;
    return p.replace(CURRENCY_DOLLAR, (m, pre, offset) => (opensMath(p, offset + pre.length) ? m : pre + CUR));
  }).join('');
}

// ── Teks Arab ──
const AR_SET = '\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const AR_RUN = new RegExp(`[${AR_SET}](?:[${AR_SET}\\u200C\\u200D\\u200F()\\s]*[${AR_SET}])?`, 'g');
const AR_ANY = new RegExp(`[${AR_SET}]`);
const AR_ALL = new RegExp(`[${AR_SET}]`, 'g');
export const hasArabic = (t: string) => AR_ANY.test(t);

let arabicFontReady = false;
/** Pasang font Arab (Amiri Quran = lengkap dengan tanda baca Al-Qur'an) sekali saja, hanya kalau ada teks Arab. */
function ensureArabicFont() {
  if (arabicFontReady || typeof document === 'undefined') return;
  arabicFontReady = true;
  try {
    if (document.getElementById('cy-arabic-font')) return;
    const l = document.createElement('link');
    l.id = 'cy-arabic-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;600&display=swap';
    document.head.appendChild(l);
  } catch { /* font gagal dimuat → pakai font sistem */ }
}

const textOf = (n: any): string => (n && typeof n.value === 'string' && n.type !== 'code' && n.type !== 'inlineCode' ? n.value : Array.isArray(n?.children) ? n.children.map(textOf).join('') : '');
const arNode = (value: string) => ({ type: 'emphasis', data: { hName: 'span', hProperties: { className: ['cy-ar'], dir: 'rtl', lang: 'ar' } }, children: [{ type: 'text', value }] });
function emitArabic(out: any[], v: string) {
  if (!v) return;
  if (!AR_ANY.test(v)) { out.push({ type: 'text', value: v }); return; }
  AR_RUN.lastIndex = 0;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = AR_RUN.exec(v))) {
    if (m.index > last) out.push({ type: 'text', value: v.slice(last, m.index) });
    out.push(arNode(m[0]));
    last = m.index + m[0].length;
  }
  if (last < v.length) out.push({ type: 'text', value: v.slice(last) });
}

// ── Pecahan polos "1/2" → pecahan bertumpuk (pembilang < penyebut 2–9; bukan tanggal, bukan "24/7", bukan "km/jam") ──
const FRAC_RE = /(^|[^\w/.,:#@\-])(\d{1,2})\/([2-9])(?![\w/]|[.,]\d)/g;
const mathNode = (tex: string) => ({ type: 'inlineMath', value: tex, data: { hName: 'span', hProperties: { className: ['math', 'math-inline'] }, hChildren: [{ type: 'text', value: tex }] } });
function emitText(out: any[], v: string, allowFrac: boolean) {
  if (!v) return;
  if (!allowFrac || v.indexOf('/') === -1) { emitArabic(out, v); return; }
  FRAC_RE.lastIndex = 0;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = FRAC_RE.exec(v))) {
    const n = Number(m[2]); const d = Number(m[3]);
    if (n >= d) continue;
    const at = m.index + m[1].length;
    if (at > last) emitArabic(out, v.slice(last, at));
    out.push(mathNode(`\\dfrac{${n}}{${d}}`));
    last = at + m[2].length + 1 + m[3].length;
  }
  emitArabic(out, v.slice(last));
}

/** Kembalikan `$` mata uang, render `**tebal**` yang gagal terbaca parser, bungkus teks Arab (RTL) & ubah "1/2" jadi pecahan. */
function remarkFixText() {
  const walk = (node: any, allowFrac: boolean) => {
    if (!node || !Array.isArray(node.children)) return;
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'math' || node.type === 'inlineMath') return;
    const frac = allowFrac && node.type !== 'link' && node.type !== 'linkReference';
    const out: any[] = [];
    for (const ch of node.children) {
      if (ch.type === 'text' && typeof ch.value === 'string') {
        const v: string = ch.value.split(CUR).join('$');
        if (v.indexOf('**') !== -1 && node.type !== 'strong') {
          let last = 0; let m: RegExpExecArray | null; const re = /\*\*([^*\n][^*\n]*?)\*\*/g; let changed = false;
          while ((m = re.exec(v))) {
            changed = true;
            if (m.index > last) emitText(out, v.slice(last, m.index), frac);
            const inner: any[] = []; emitText(inner, m[1], frac);
            out.push({ type: 'strong', children: inner });
            last = m.index + m[0].length;
          }
          if (changed) { if (last < v.length) emitText(out, v.slice(last), frac); continue; }
        }
        emitText(out, v, frac);
      } else { walk(ch, frac); out.push(ch); }
    }
    node.children = out;
    // paragraf / judul yang isinya (hampir) semuanya Arab → rata kanan & arah kanan→kiri
    if (node.type === 'paragraph' || node.type === 'heading') {
      const t = textOf(node);
      const ar = (t.match(AR_ALL) || []).length;
      if (ar > 0 && ar >= ((t.match(/[A-Za-z]/g) || []).length) * 2) {
        node.data = { ...(node.data || {}), hProperties: { ...((node.data || {}).hProperties || {}), dir: 'rtl', lang: 'ar', className: ['cy-ar-block'] } };
      }
    }
  };
  return (tree: any) => walk(tree, true);
}

// ── Shared markdown components config ──────────
const makeComponents = (contentRef: { current: string }) => ({
  table({ node, children, ...props }: any) { return <div className="cy-tbl"><table {...props}>{children}</table></div>; },
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-([\w-]+)/.exec(className || '');
    const lang = match ? match[1] : '';
    const raw = String(children).replace(/\n$/, '');
    if (inline) return <code className={className} {...props}>{children}</code>;
    if (lang === 'html-preview')        return <HtmlPreview content={raw} />;
    if (lang === 'mermaid')             return <MermaidDiagram content={raw} />;
    if (lang.startsWith('diagram-'))    return <DiagramBlock lang={lang} raw={raw} />;
    if (lang === 'copy-card')           return <CopyCard content={raw} />;
    if (lang === 'presentation-slides') return <PresentationRenderer content={raw} />;
    if (lang === 'document-content')    return <DocumentRenderer content={raw} />;
    if (lang === 'image-search')        return <ImageStrip query={raw} />;
    if (lang === 'suggestions')         return null;
    if ((lang === 'text' || lang === '') && !raw.includes('\n') && raw.trim().length <= 120)
      return <span style={{ fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)' }}>{raw}</span>;
    // Blok kode biasa → kartu kode (loading >_ selagi AI masih menulis, lalu kartu yang bisa dibuka)
    const meta = parseFenceMeta((node as any)?.data?.meta ?? (node as any)?.properties?.metastring);
    const at = (node as any)?.position?.start?.offset;
    const isOpenBlock = typeof at === 'number' && openFenceOffset(contentRef.current) === at;
    return <CodeCardHost lang={lang || 'text'} raw={raw} meta={meta} isOpenBlock={isOpenBlock} />;
  },
});

// KaTeX: tidak melempar error untuk rumus rusak (tampil apa adanya), tanpa peringatan strict
const KATEX_OPTS = { throwOnError: false, strict: 'ignore', errorColor: 'currentColor' } as const;
const REHYPE_PLUGINS: any[] = [[rehypeKatex, KATEX_OPTS]];

// ── Markdown Renderer ─────────────────────────
export const MarkdownRenderer = memo(({ content }: { content: string }) => {
  // 🔧 BARU: pil sumber per paragraf. Aktif hanya kalau ChatBubble menyediakan CitationContext
  // DAN teksnya persis sama dengan teks yang dipakai saat menghitung posisi sitasi.
  const cite = useContext(CitationContext);
  const pillsOn = !!cite && cite.text === content && cite.citations.length > 0;

  // 🔧 BARU: foto / video / kartu link di dalam jawaban (aturan sama: teks harus persis sama dengan saat posisi dihitung)
  const mctx = useContext(MediaContext);
  const mediaOn = !!mctx && mctx.text === content && mctx.media.length > 0;

  const thumbs = useMemo<ThumbItem[]>(() => (mediaOn ? (mctx!.media.filter(m => m.t === 'thumb') as ThumbItem[]) : []), [mediaOn, mctx?.media]);

  const remarkPlugins = useMemo<any[]>(() => {
    const p: any[] = [remarkGfm, remarkMath, remarkFixText];
    if (pillsOn) p.push([remarkCitePills, cite!.citations]);
    if (mediaOn) p.push([remarkMediaInserts, mctx!.media]);
    return p;
  }, [pillsOn, cite?.citations, mediaOn, mctx?.media]);
  const contentRef = useRef(content);
  contentRef.current = content;
  const safeContent = useMemo(() => shieldCurrency(content), [content]);
  useEffect(() => { if (hasArabic(content)) ensureArabicFont(); }, [content]);
  const components = useMemo<any>(
    () => ({
      ...makeComponents(contentRef),
      ...(pillsOn ? { 'cite-pill': CitePillView } : {}),
      ...(mediaOn ? { 'media-block': MediaBlockView } : {}),
      ...(thumbs.length > 0 ? {
        li({ node, children, ...props }: any) {
          const s0 = node?.position?.start?.offset, e0 = node?.position?.end?.offset;
          const t = typeof s0 === 'number' && typeof e0 === 'number' ? thumbs.find(x => x.after >= s0 && x.after < e0 && !(node.children || []).some((c: any) => c?.tagName === 'ul' || c?.tagName === 'ol' ? (x.after >= (c.position?.start?.offset ?? 1e12) && x.after < (c.position?.end?.offset ?? -1)) : false)) : undefined;
          if (!t) return <li {...props}>{children}</li>;
          return <ListItemWithThumb thumb={t} group={thumbs.filter(x => x.grp === t.grp)}>{children}</ListItemWithThumb>;
        },
      } : {}),
    }),
    [pillsOn, mediaOn, thumbs],
  );

  return (
    <div className="cylen-md" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <style>{MD_STYLES}</style>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {safeContent}
      </Markdown>
    </div>
  );
});

// ── Split content into visual "paragraphs" for fade-in ──
export function splitIntoParagraphs(text: string): string[] {
  return splitKeepFences(text); // blok kode tidak terpotong meski berisi baris kosong
}

// ── Streaming Text ─────────────────────────────
// Render konten LANGSUNG saat datang (tidak ada typewriter delay),
// dengan fade-in halus pada paragraf yang baru muncul.
// onComplete dipanggil hanya setelah isStreaming benar-benar false.

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

export const StreamingText = memo(({ content, isStreaming, onComplete }: StreamingTextProps) => {
  const seenParagraphsRef = useRef<number>(0);
  const prevContentRef    = useRef<string>('');
  const onCompleteRef     = useRef(onComplete);
  // ── FIX: completedRef direset setiap kali streaming dimulai ulang ──
  const completedRef      = useRef(false);

  onCompleteRef.current = onComplete;

  const paragraphs     = splitIntoParagraphs(content);
  const newFromIndex   = seenParagraphsRef.current;

  useEffect(() => {
    prevContentRef.current = content;
    if (paragraphs.length > 1) {
      seenParagraphsRef.current = paragraphs.length - 1;
    }
  });

  useEffect(() => {
    // ── FIX: reset saat streaming dimulai ──
    if (isStreaming) {
      completedRef.current = false;
      return;
    }
    // Streaming selesai — tunggu lebih lama agar render terakhir selesai
    // sebelum action bar muncul
    if (!completedRef.current) {
      completedRef.current = true;
      const t = setTimeout(() => {
        onCompleteRef.current?.();
      }, 150); // ── naik dari 80ms → 150ms ──
      return () => clearTimeout(t);
    }
  }, [isStreaming]);

  const showCursor = isStreaming;

  return (
    <StreamingContainer
      content={content}
      isStreaming={isStreaming}
      showCursor={showCursor}
      newFromIndex={newFromIndex}
      paragraphCount={paragraphs.length}
    />
  );
});

// ── Internal streaming container ────────────────
interface StreamingContainerProps {
  content: string;
  isStreaming: boolean;
  showCursor: boolean;
  newFromIndex: number;
  paragraphCount: number;
}

const StreamingContainer = memo(({
  content, isStreaming, showCursor,
}: StreamingContainerProps) => {
  const paragraphs   = splitIntoParagraphs(content);
  const hasMultiple  = paragraphs.length > 1;

  if (!hasMultiple) {
    return (
      <CodeStreamCtx.Provider value={isStreaming}>
        <div key="single" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          <style>{MD_STYLES}</style>
          <div className="cylen-chunk-new">
            <MarkdownRenderer content={content} />
          </div>
          {showCursor && <InlineCursor />}
        </div>
      </CodeStreamCtx.Provider>
    );
  }

  const settledContent = paragraphs.slice(0, paragraphs.length - 1).join('\n\n');
  const activeContent  = paragraphs[paragraphs.length - 1];

  return (
    <CodeStreamCtx.Provider value={isStreaming}>
      <div style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
        <style>{MD_STYLES}</style>
        {/* Settled paragraphs — tidak re-render saat paragraf baru muncul */}
        <SettledContent content={settledContent} />
        {/* Active last paragraph — fade-in halus setiap kali paragraf baru */}
        <ActiveParagraph
          key={`active-${paragraphs.length}`}
          content={activeContent}
          isStreaming={isStreaming}
          showCursor={showCursor}
        />
      </div>
    </CodeStreamCtx.Provider>
  );
});

// ── Settled content — di-memo ketat ──
const SettledContent = memo(
  ({ content }: { content: string }) => <MarkdownRenderer content={content} />,
  (prev, next) => prev.content === next.content,
);

// ── Active paragraph ──
interface ActiveParagraphProps {
  content: string;
  isStreaming: boolean;
  showCursor: boolean;
}

const ActiveParagraph = memo(({ content, isStreaming, showCursor }: ActiveParagraphProps) => (
  <div className={isStreaming ? 'cylen-chunk-new' : ''} style={{ display: 'inline' }}>
    <MarkdownRenderer content={content} />
    {showCursor && <InlineCursor />}
  </div>
));

// ── Blinking cursor ──
const InlineCursor = () => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: 2,
      height: '1.1em',
      background: 'var(--text)',
      borderRadius: 2,
      marginLeft: 3,
      verticalAlign: 'middle',
      opacity: 0.6,
      animation: 'cursorBlink 0.55s step-end infinite',
    }}
  />
);
