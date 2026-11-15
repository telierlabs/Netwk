// ─────────────────────────────────────────────
// CODE CARD — src/components/chat/components/renderers/CodeCard.tsx
// Blok kode di jawaban AI jadi kartu kecil (seperti Claude):
//   • AI masih menulis  → baris loading ">_" (ikon loading yang sama dengan kode) + kalimat catatan dari AI
//   • sudah selesai     → baris jejak ">_ kalimat catatan ›" (bisa diketuk → popup "Alur") + kartu file
//   • ketuk kartu       → popup dari bawah: nama file, kode berwarna, tombol Salin
//   • kode pendek       → boleh tampil sebagai blok panjang (pilihan disimpan di perangkat)
// Satu file = satu kartu. Warna dari variabel tema.
// ─────────────────────────────────────────────
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Code2, Copy, Download, Eye, FileDown, MoreVertical, Printer, RefreshCw, Share2 } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { CodeIcon, LOADING_CSS } from '../search/LoadingIcons';
import { Chevron, FlowSheet } from '../search/FlowSheet';
import {
  SHORT_CODE_LINES, codeStages, describeCode, getShortStyle, highlightCode, langLabel, liveStage, setShortStyle, type ShortStyle,
} from '../../../../lib/codeCards';

/** true selagi jawaban AI masih mengalir (blok kode yang belum ditutup = masih ditulis). */
export const CodeStreamCtx = createContext(false);

const CSS = `
@keyframes cy-cc-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes cy-cc-bg { from { opacity: 0; } to { opacity: 1; } }
@keyframes cy-cc-up { from { transform: translateY(100%); } to { transform: none; } }
.cy-cc-load { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 2px; margin: 6px 0; border: 0; background: none; font-family: inherit; text-align: left; cursor: pointer; color: var(--text); -webkit-tap-highlight-color: transparent; animation: cy-cc-in .3s ease both; }
.cy-cc-load:active { opacity: .7; }
.cy-cc-load .cy-cc-t { flex: 1 1 auto; min-width: 0; font-size: 16px; line-height: 26px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cy-cc-trace { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; margin: 8px 0 2px; padding: 4px 0 4px 2px; border: 0; background: none; color: var(--mu); font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent; }
.cy-cc-trace > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.cy-cc-card { display: flex; align-items: center; gap: 14px; width: 100%; margin: 6px 0 10px; padding: 10px 14px 10px 10px; text-align: left; font: inherit; color: var(--text); background: var(--cd, var(--bg)); border: 1px solid var(--bd); border-radius: 16px; cursor: pointer; animation: cy-cc-in .3s ease both; -webkit-tap-highlight-color: transparent; }
.cy-cc-card:active { transform: scale(.985); }
.cy-cc-ico { width: 50px; height: 58px; border-radius: 12px; background: var(--sf); border: 1px solid var(--bd); display: grid; place-items: center; flex: none; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; font-weight: 600; color: var(--text); }
.cy-cc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cy-cc-name { font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cy-cc-type { font-size: 12.5px; color: var(--mu); }
.cy-cc-go { color: var(--mu); display: grid; flex: none; }
.cy-cc-bg { position: fixed; inset: 0; z-index: 420; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; animation: cy-cc-bg .2s ease both; }
.cy-cc-sheet { width: 100%; max-width: 640px; height: 88dvh; display: flex; flex-direction: column; background: var(--bg); color: var(--text); border: 1px solid var(--bd); border-bottom: 0; border-radius: 22px 22px 0 0; animation: cy-cc-up .3s cubic-bezier(.2,.9,.3,1) both; }
.cy-cc-head { display: grid; grid-template-columns: 44px 1fr auto; align-items: center; gap: 8px; padding: 14px 12px 8px; }
.cy-cc-title { text-align: center; min-width: 0; }
.cy-cc-title b { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cy-cc-title span { font-size: 12px; color: var(--mu); }
.cy-cc-x { width: 40px; height: 40px; border-radius: 50%; border: 0; background: transparent; color: var(--text); display: grid; place-items: center; cursor: pointer; }
.cy-cc-copy { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; border: 1px solid var(--bd); background: var(--sf); color: var(--text); font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.cy-cc-pre { flex: 1; margin: 0; overflow: auto; padding: 8px 16px 24px; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 12.5px; line-height: 1.7; color: var(--text); tab-size: 2; white-space: pre; user-select: text; -webkit-user-select: text; }
.cy-cc-foot { padding: 8px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--bd); }
.cy-cc-tabs { display: flex; gap: 4px; margin: 2px 16px 8px; padding: 3px; background: var(--sf); border: 1px solid var(--bd); border-radius: 11px; align-self: flex-start; }
.cy-cc-tab { border: 0; background: transparent; color: var(--mu); font: inherit; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.cy-cc-tab[aria-selected="true"] { background: var(--bg); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.cy-cc-frame { flex: 1; min-height: 0; width: 100%; border: 0; border-top: 1px solid var(--bd); background: #fff; }
.cy-cc-menu { position: absolute; top: 58px; right: 12px; z-index: 3; min-width: 224px; padding: 6px; background: var(--bg); border: 1px solid var(--bd); border-radius: 14px; box-shadow: 0 12px 36px rgba(0,0,0,.22); animation: cy-cc-in .15s ease both; }
.cy-cc-mi { display: flex; align-items: center; gap: 12px; width: 100%; padding: 11px 12px; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 14.5px; font-weight: 500; text-align: left; border-radius: 9px; cursor: pointer; }
.cy-cc-mi:hover, .cy-cc-mi:active { background: var(--sf); }
.cy-cc-sep { height: 1px; margin: 4px 6px; background: var(--bd); }
.cy-cc-toast { position: absolute; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); max-width: 88%; padding: 10px 16px; border-radius: 12px; background: var(--text); color: var(--bg); font-size: 13px; font-weight: 600; text-align: center; animation: cy-cc-in .2s ease both; z-index: 4; }
.cy-cc-link { border: 0; background: none; color: var(--mu); font: inherit; font-size: 12.5px; cursor: pointer; padding: 4px 2px; text-decoration: underline; text-underline-offset: 3px; }
.cy-tk-k { color: color-mix(in srgb, var(--text) 45%, #8b3dff); font-weight: 600; }
.cy-tk-s { color: color-mix(in srgb, var(--text) 50%, #0f8a5f); }
.cy-tk-n { color: color-mix(in srgb, var(--text) 45%, #d97706); }
.cy-tk-f { color: color-mix(in srgb, var(--text) 40%, #2563eb); }
.cy-tk-c { color: var(--mu); font-style: italic; }
@media (prefers-reduced-motion: reduce) { .cy-cc-load, .cy-cc-card, .cy-cc-sheet { animation: none; } }
`;

const Cc = () => <style>{LOADING_CSS}{CSS}</style>;

const CodeTagsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 7L3 12l5 5M16 7l5 5-5 5M13.5 5l-3 14" />
  </svg>
);

const UploadIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
  </svg>
);

function useShortStyle(): [ShortStyle, (v: ShortStyle) => void] {
  const [v, setV] = useState<ShortStyle>(getShortStyle);
  useEffect(() => {
    const on = () => setV(getShortStyle());
    window.addEventListener('cylen-code-style', on);
    return () => window.removeEventListener('cylen-code-style', on);
  }, []);
  return [v, (x: ShortStyle) => { setShortStyle(x); setV(x); }];
}

async function copyToClipboard(text: string, pre: HTMLElement | null): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* lanjut ke cara cadangan */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch { /* abaikan */ }
  if (pre) { // terakhir: pilih teksnya supaya user bisa salin manual
    const r = document.createRange(); r.selectNodeContents(pre);
    const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
  }
  return false;
}

const EXT_OF: Record<string, string> = { ts: 'ts', typescript: 'ts', tsx: 'tsx', js: 'js', javascript: 'js', jsx: 'jsx', py: 'py', python: 'py', html: 'html', css: 'css', json: 'json', sql: 'sql', bash: 'sh', sh: 'sh', kt: 'kt', java: 'java', go: 'go', rs: 'rs', php: 'php', yaml: 'yml', yml: 'yml', svg: 'svg', md: 'md' };

/** HTML / SVG bisa dijalankan sebagai simulasi (hasilnya tampil di popup). */
export const isPreviewable = (lang: string, file: string): boolean =>
  /^(html|htm|svg)$/i.test(lang || '') || /\.(html?|svg)$/i.test(file || '');

/** Skrip yang disisipkan ke simulasi: cetak (dengan skala pas halaman) dan buat PDF langsung. */
const HOOK_JS = `(function(){
var H2C="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",JSP="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
function load(src){return new Promise(function(ok,no){var s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=function(){no(new Error("gagal memuat pustaka"))};document.head.appendChild(s)})}
function bg(){var c=getComputedStyle(document.body).backgroundColor;if(!c||c==="rgba(0, 0, 0, 0)"||c==="transparent")c=getComputedStyle(document.documentElement).backgroundColor;if(!c||c==="rgba(0, 0, 0, 0)"||c==="transparent")c="#ffffff";return c}
function bounds(){var x1=1e9,y1=1e9,x2=0,y2=0,sx=scrollX,sy=scrollY;document.body.querySelectorAll("*").forEach(function(el){if(/^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|NOSCRIPT)$/.test(el.tagName))return;var cs=getComputedStyle(el);if(cs.display==="none"||cs.visibility==="hidden"||cs.opacity==="0")return;var r=el.getBoundingClientRect();if(r.width<2||r.height<2)return;x1=Math.min(x1,r.left+sx);y1=Math.min(y1,r.top+sy);x2=Math.max(x2,r.right+sx);y2=Math.max(y2,r.bottom+sy)});
if(x2<=x1||y2<=y1){return{x:0,y:0,w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}}
var p=28,W=document.documentElement.scrollWidth,Hh=document.documentElement.scrollHeight,x=Math.max(0,x1-p),y=Math.max(0,y1-p);return{x:x,y:y,w:Math.min(W-x,x2-x+p),h:Math.min(Hh-y,y2-y+p)}}
function doPrint(){var z=Math.max(1,Math.min(2.4,720/Math.max(320,innerWidth)));var st=document.createElement("style");st.textContent="@page{margin:10mm}@media print{html{zoom:"+z.toFixed(2)+"}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}";document.head.appendChild(st);setTimeout(function(){try{print()}catch(_){}},60)}
async function doPdf(){try{
if(!window.html2canvas)await load(H2C);if(!window.jspdf)await load(JSP);
var b=bounds();
var cv=await window.html2canvas(document.documentElement,{x:b.x,y:b.y,width:b.w,height:b.h,scale:2,backgroundColor:bg(),useCORS:true,logging:false,windowWidth:document.documentElement.scrollWidth,windowHeight:document.documentElement.scrollHeight,scrollX:0,scrollY:0});
var J=window.jspdf.jsPDF;var pdf=new J({unit:"px",format:[b.w,b.h],orientation:b.w>b.h?"l":"p",hotfixes:["px_scaling"]});
pdf.addImage(cv.toDataURL("image/jpeg",0.95),"JPEG",0,0,b.w,b.h);
var buf=pdf.output("arraybuffer");parent.postMessage({cyPdf:{ok:true,buf:buf}},"*",[buf])
}catch(e){parent.postMessage({cyPdf:{ok:false,err:String(e&&e.message||e)}},"*")}}
addEventListener("message",function(e){var d=e.data;if(!d)return;if(d.cyPrint)doPrint();if(d.cyPdf)doPdf()});
})()`;

/** Bungkus kode jadi dokumen HTML utuh untuk iframe + pendengar perintah cetak / PDF dari popup. */
function buildSrcDoc(code: string): string {
  const full = /<html[\s>]|<!doctype/i.test(code);
  let doc = full ? code : `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:system-ui,-apple-system,sans-serif}</style></head><body>${code}</body></html>`;
  if (!/<meta[^>]+viewport/i.test(doc)) {
    const meta = '<meta name="viewport" content="width=device-width,initial-scale=1">';
    doc = /<head[^>]*>/i.test(doc) ? doc.replace(/<head[^>]*>/i, m => m + meta) : meta + doc;
  }
  const hook = '<script>' + HOOK_JS.replace(/<\/script/gi, '<\\/script') + '<\/script>';
  return /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, () => hook + '</body>') : doc + hook;
}

const CodeSheet: React.FC<{ file: string; lang: string; content: string; short: boolean; onClose: () => void; onBlock: () => void }> = ({ file, lang, content, short, onClose, onBlock }) => {
  const preview = isPreviewable(lang, file);
  const [tab, setTab] = useState<'preview' | 'code'>(preview ? 'preview' : 'code');
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [runKey, setRunKey] = useState(0);
  const preRef = useRef<HTMLPreElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const html = useMemo(() => highlightCode(content, lang), [content, lang]);
  const srcDoc = useMemo(() => (preview ? buildSrcDoc(content) : ''), [preview, content]);
  const lines = content.split('\n').length;
  const fname = file && /\.[A-Za-z0-9]+$/.test(file) ? file : `${(file || (preview ? 'simulasi' : 'kode')).replace(/[^\w.-]+/g, '-')}.${preview ? 'html' : EXT_OF[(lang || '').toLowerCase()] || 'txt'}`;

  const say = (t: string) => { setToast(t); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 2400); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (menu) setMenu(false); else onClose(); } };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); if (timer.current) clearTimeout(timer.current); };
  }, [onClose, menu]);

  const copy = async () => {
    setMenu(false);
    if (tab !== 'code') setTab('code'); // supaya teks bisa dipilih manual kalau salin otomatis ditolak
    const ok = await copyToClipboard(content, preRef.current);
    say(ok ? 'Kode tersalin' : 'Teks dipilih, salin manual');
  };
  const download = () => {
    setMenu(false);
    try {
      const url = URL.createObjectURL(new Blob([content], { type: preview ? 'text/html' : 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      say(`Mengunduh ${fname}`);
    } catch { say('Unduh gagal di perangkat ini'); }
  };
  const share = async () => {
    setMenu(false);
    const nav: any = navigator;
    try {
      const f = new File([content], fname, { type: preview ? 'text/html' : 'text/plain' });
      if (nav.canShare && nav.canShare({ files: [f] })) { await nav.share({ files: [f], title: fname }); return; }
      if (nav.share) { await nav.share({ title: fname, text: content.slice(0, 6000) }); return; }
    } catch (e: any) { if (e && e.name === 'AbortError') return; }
    const ok = await copyToClipboard(content, null);
    say(ok ? 'Bagikan tidak tersedia, kode disalin' : 'Bagikan tidak tersedia di perangkat ini');
  };
  const pdfTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallbackPrint = (msg: string) => {
    say(msg);
    setTimeout(() => frameRef.current?.contentWindow?.postMessage({ cyPrint: true }, '*'), 400);
  };
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = (e.data || {}).cyPdf;
      if (!d) return;
      if (pdfTimer.current) clearTimeout(pdfTimer.current);
      if (d.ok && d.buf) {
        const name = fname.replace(/\.[A-Za-z0-9]+$/, '') + '.pdf';
        try {
          const url = URL.createObjectURL(new Blob([d.buf], { type: 'application/pdf' }));
          const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          say(`PDF tersimpan: ${name}`);
        } catch { say('PDF jadi, tapi gagal diunduh di perangkat ini'); }
      } else fallbackPrint('Pembuat PDF gagal, membuka dialog cetak. Pilih "Simpan sebagai PDF"');
    };
    window.addEventListener('message', on);
    return () => { window.removeEventListener('message', on); if (pdfTimer.current) clearTimeout(pdfTimer.current); };
  }, [fname]);
  const toFrame = (msg: any) => {
    const go = () => frameRef.current?.contentWindow?.postMessage(msg, '*');
    if (tab !== 'preview') { setTab('preview'); setTimeout(go, 500); } else go();
  };
  const print = () => { setMenu(false); toFrame({ cyPrint: true }); };
  const savePdf = () => {
    setMenu(false);
    say('Membuat PDF…');
    toFrame({ cyPdf: true });
    if (pdfTimer.current) clearTimeout(pdfTimer.current);
    pdfTimer.current = setTimeout(() => fallbackPrint('PDF terlalu lama, membuka dialog cetak. Pilih "Simpan sebagai PDF"'), 20000);
  };

  const Item = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
    <button type="button" className="cy-cc-mi" role="menuitem" onClick={onClick}>{icon}<span>{label}</span></button>
  );

  return createPortal(
    <div className="cy-cc-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label={file}>
      <Cc />
      <div className="cy-cc-sheet" style={{ position: 'relative' }} onClick={e => { e.stopPropagation(); if (menu) setMenu(false); }}>
        <div className="cy-cc-head">
          <button type="button" className="cy-cc-x" onClick={onClose} aria-label="Tutup">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="cy-cc-title"><b>{file || langLabel(lang)}</b><span>{preview ? 'Simulasi' : langLabel(lang)} · {lines} baris</span></div>
          <button type="button" className="cy-cc-x" aria-label="Menu" aria-haspopup="menu" aria-expanded={menu} onClick={e => { e.stopPropagation(); setMenu(m => !m); }}>
            <MoreVertical size={20} />
          </button>
        </div>

        {menu && (
          <div className="cy-cc-menu" role="menu" onClick={e => e.stopPropagation()}>
            <Item icon={<Copy size={18} />} label="Salin kode" onClick={copy} />
            <Item icon={<Download size={18} />} label={`Unduh ${preview ? '.html' : ''}`.trim()} onClick={download} />
            <Item icon={<Share2 size={18} />} label="Bagikan" onClick={share} />
            {preview && (<>
              <div className="cy-cc-sep" />
              <Item icon={<Printer size={18} />} label="Cetak" onClick={print} />
              <Item icon={<FileDown size={18} />} label="Simpan sebagai PDF" onClick={savePdf} />
              <Item icon={<RefreshCw size={18} />} label="Muat ulang simulasi" onClick={() => { setMenu(false); setTab('preview'); setRunKey(k => k + 1); }} />
            </>)}
          </div>
        )}

        {preview && (
          <div className="cy-cc-tabs" role="tablist">
            <button type="button" role="tab" className="cy-cc-tab" aria-selected={tab === 'preview'} onClick={() => setTab('preview')}><Eye size={14} />Pratinjau</button>
            <button type="button" role="tab" className="cy-cc-tab" aria-selected={tab === 'code'} onClick={() => setTab('code')}><Code2 size={14} />Kode</button>
          </div>
        )}

        {preview && tab === 'preview' ? (
          <iframe key={runKey} ref={frameRef} className="cy-cc-frame" title={file || 'Simulasi'} srcDoc={srcDoc}
            sandbox="allow-scripts allow-forms allow-modals" referrerPolicy="no-referrer" />
        ) : (
          <pre ref={preRef} className="cy-cc-pre" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {short && !preview && (
          <div className="cy-cc-foot">
            <button type="button" className="cy-cc-link" onClick={() => { onBlock(); onClose(); }}>Tampilkan kode pendek sebagai blok panjang</button>
          </div>
        )}
        {toast && <div className="cy-cc-toast" role="status">{toast}</div>}
      </div>
    </div>,
    document.body,
  );
};

interface CodeCardProps {
  lang: string;
  content: string;
  file: string;
  note: string;
  /** AI masih menulis blok ini */
  loading?: boolean;
}

export const CodeCard = memo(({ lang, content, file, note, loading }: CodeCardProps) => {
  const [open, setOpen] = useState(false);
  const [flow, setFlow] = useState(false);
  const [style, setStyle] = useShortStyle();
  const close = useCallback(() => setOpen(false), []);
  const lines = content.split('\n').length;
  const short = lines <= SHORT_CODE_LINES;
  const name = file || `${langLabel(lang)}`;

  if (loading) {
    // Kalimat nyata tentang apa yang sedang ditulis (dibaca dari kode yang sudah masuk), bukan template.
    // Bisa diketuk: Alur langsung terbuka, berisi semua langkah yang sudah dikerjakan.
    const stages = codeStages(content, lang, file, note);
    const text = stages[stages.length - 1];
    return (
      <>
        <button type="button" className="cy-cc-load" role="status" aria-live="polite" aria-label={`${text}. Ketuk untuk melihat alur`} onClick={() => setFlow(true)}>
          <Cc />
          <CodeIcon />
          <span className="cy-cc-t cy-fl-shim">{text}</span>
          <Chevron size={18} style={{ color: 'var(--mu)', flex: 'none' }} />
        </button>
        <FlowSheet open={flow} onClose={() => setFlow(false)}
          data={{ variant: 'code', files: [{ name, note, lang, lines, detail: describeCode(content, lang, file), stages }] }} />
      </>
    );
  }

  // Kode pendek + pilihan "blok panjang" → blok biasa, dengan jalan kembali ke kartu
  if (short && style === 'block' && !isPreviewable(lang, file)) {
    return (
      <div style={{ margin: '6px 0 10px' }}>
        <Cc />
        <CodeBlock lang={lang || 'text'} content={content} />
        <button type="button" className="cy-cc-link" onClick={() => setStyle('card')}>Tampilkan sebagai kartu</button>
      </div>
    );
  }

  return (
    <>
      <Cc />
      {note && (
        <button type="button" className="cy-cc-trace" onClick={() => setFlow(true)} aria-label={`Lihat alur: ${note}`}>
          <CodeIcon still size={20} />
          <span>{note}</span>
          <Chevron size={16} />
        </button>
      )}
      <button type="button" className="cy-cc-card" onClick={() => setOpen(true)} aria-label={`Buka ${name}`}>
        <div className="cy-cc-ico"><CodeTagsIcon /></div>
        <div className="cy-cc-meta">
          <div className="cy-cc-name">{name}</div>
          <div className="cy-cc-type">{isPreviewable(lang, file) ? 'Simulasi' : 'Kode'} · {langLabel(lang)}</div>
        </div>
        <span className="cy-cc-go"><UploadIcon /></span>
      </button>
      {open && <CodeSheet file={name} lang={lang} content={content} short={short} onClose={close} onBlock={() => setStyle('block')} />}
      <FlowSheet open={flow} onClose={() => setFlow(false)} done
        data={{ variant: 'code', files: [{ name, note, lang, lines, detail: describeCode(content, lang, file), stages: codeStages(content, lang, file, note) }] }} />
    </>
  );
});
CodeCard.displayName = 'CodeCard';

/** Dipanggil dari MarkdownRenderer untuk setiap blok kode biasa. */
export const CodeCardHost: React.FC<{ lang: string; raw: string; meta: { file: string; note: string }; isOpenBlock: boolean }> = ({ lang, raw, meta, isOpenBlock }) => {
  const streaming = useContext(CodeStreamCtx);
  // Blok yang belum ditutup = AI masih menulis → TETAP loading, kartu baru muncul setelah kode selesai.
  // Tidak bergantung pada penanda "streaming" (bisa sudah false sementara teks masih diketik).
  // Cadangan: kalau AI lupa menutup blok dan tidak ada tambahan 4 detik, tampilkan kartu apa adanya.
  const [stale, setStale] = useState(false);
  useEffect(() => {
    setStale(false);
    if (!isOpenBlock || streaming) return;
    const t = setTimeout(() => setStale(true), 4000);
    return () => clearTimeout(t);
  }, [isOpenBlock, streaming, raw]);
  return <CodeCard lang={lang} content={raw} file={meta.file} note={meta.note} loading={isOpenBlock && !stale} />;
};
