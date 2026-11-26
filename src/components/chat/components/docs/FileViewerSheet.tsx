// ─────────────────────────────────────────────
// FILE VIEWER SHEET
// src/components/chat/components/docs/FileViewerSheet.tsx
//
// Popup dari bawah untuk melihat isi FILE YANG DIKIRIM (PDF / Word .docx / teks), dipakai chat pribadi
// & grup. Mengetuk pil dokumen membuka popup ini (bukan langsung mengunduh). Unduh & Bagikan ada di dalam.
//   • PDF   → dirender per halaman ke canvas (pdfjs-dist, dimuat lazy)
//   • DOCX  → dikonversi ke HTML (mammoth, dimuat lazy) lalu dibersihkan
//   • TXT dll → teks biasa
//   • .doc lama / format lain → tidak bisa dipratinjau, tampil tombol Unduh
//
// Butuh:  npm i pdfjs-dist@4.10.38 mammoth
//
// Isi `file`:
//   • chat pribadi : { name, data }            (data = base64 tanpa awalan)
//   • grup         : { name, fid, n, gid }      (potongan di Firestore)
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Download, Share2, X, Loader2 } from 'lucide-react';
import { DOC_CSS } from './DocViews';
import { downloadBlob } from '../../../../lib/docBuilders';
import { loadGroupFileBlob, mimeFromName } from '../../../../lib/groupFiles';

// ── util ──
const extOf = (name: string) => (String(name || '').split('.').pop() || '').toLowerCase();
const TEXT_EXT = ['txt', 'md', 'csv', 'json', 'log', 'xml'];
type Kind = 'pdf' | 'docx' | 'text' | 'other';
const kindOf = (name: string): Kind => {
  const e = extOf(name);
  return e === 'pdf' ? 'pdf' : e === 'docx' ? 'docx' : TEXT_EXT.includes(e) ? 'text' : 'other';
};
const KIND_LABEL: Record<Kind, string> = { pdf: 'PDF', docx: 'Dokumen Word', text: 'Teks', other: 'File' };

const b64ToBlob = (b64: string, type: string) => {
  const raw = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(raw);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type });
};

const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function cleanHtml(html: string): string {
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('script,style,iframe,object,embed,link,meta,form').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(a => {
      const n = a.name.toLowerCase();
      const v = a.value.trim().toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(a.name);
      else if ((n === 'href' || n === 'src' || n === 'xlink:href') && v.startsWith('javascript:')) el.removeAttribute(a.name);
      else if (n === 'href' && v.startsWith('data:')) el.removeAttribute(a.name);
    });
    if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
  });
  return d.body.innerHTML;
}

// ─────────────────────────────────────────────
// Cangkang popup (geser ke bawah untuk menutup)
// ─────────────────────────────────────────────
export const PreviewShell: React.FC<{
  title: string; subtitle?: string; onClose: () => void;
  onDownload?: () => void; onShare?: () => void; toast?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, onDownload, onShare, toast, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const animateClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const sh = sheetRef.current, bg = bgRef.current;
    if (!sh) { onClose(); return; }
    sh.style.animation = 'none';
    sh.style.transition = 'transform .22s cubic-bezier(.4,0,1,1)';
    sh.style.transform = 'translateY(100%)';
    if (bg) { bg.style.animation = 'none'; bg.style.transition = 'opacity .22s ease'; bg.style.opacity = '0'; }
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') animateClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [animateClose]);

  // geser: header selalu bisa ditarik; isi hanya kalau sudah di paling atas
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    let anchor = 0, startT = 0, dy = 0, active = false, inBody = false;
    const onStart = (e: TouchEvent) => {
      if (closing.current) return;
      const body = bodyRef.current;
      anchor = e.touches[0].clientY; startT = performance.now(); dy = 0; active = false;
      inBody = !!body && body.contains(e.target as Node);
    };
    const onMove = (e: TouchEvent) => {
      if (closing.current) return;
      const y = e.touches[0].clientY;
      const body = bodyRef.current;
      if (!active) {
        if (inBody && body && body.scrollTop > 0) { anchor = y; return; }
        const d = y - anchor;
        if (d > 8) { active = true; startT = performance.now(); el.style.animation = 'none'; el.style.transition = 'none'; }
        else { if (d < 0) anchor = y; return; }
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, y - anchor);
      el.style.transform = `translateY(${dy}px)`;
      if (bgRef.current) { bgRef.current.style.animation = 'none'; bgRef.current.style.opacity = String(Math.max(0.1, 1 - dy / 700)); }
    };
    const onEnd = () => {
      if (!active) return;
      active = false;
      const v = dy / Math.max(1, performance.now() - startT);
      if (dy > 110 || v > 0.6) animateClose();
      else {
        el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
        el.style.transform = 'translateY(0)';
        if (bgRef.current) { bgRef.current.style.transition = 'opacity .22s ease'; bgRef.current.style.opacity = '1'; }
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [animateClose]);

  const iconBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--sf)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <style>{DOC_CSS}</style>
      <div ref={bgRef} onClick={animateClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', animation: 'cy-fade .2s ease both' }} />
      <div ref={sheetRef} style={{ position: 'relative', width: '100%', maxWidth: 820, height: '92%', background: 'var(--bg)', color: 'var(--text)', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'cy-sheet-up .3s cubic-bezier(.2,.8,.2,1) backwards', boxShadow: '0 -8px 40px rgba(0,0,0,.25)', willChange: 'transform' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', flexShrink: 0 }}><div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--bd)' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 12px 18px', borderBottom: '1px solid var(--bd)', flexShrink: 0, touchAction: 'none' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle ? <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{subtitle}</div> : null}
          </div>
          {onDownload && <button style={iconBtn} onClick={onDownload} aria-label="Unduh" title="Unduh"><Download size={17} /></button>}
          {onShare && <button style={iconBtn} onClick={onShare} aria-label="Bagikan" title="Bagikan"><Share2 size={17} /></button>}
          <button style={iconBtn} onClick={animateClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 14px 40px', background: 'var(--sf)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>{children}</div>
        </div>
        {toast && <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, animation: 'cy-fade .2s ease both', maxWidth: '88%', textAlign: 'center' }}>{toast}</div>}
      </div>
    </div>,
    document.body,
  );
};

// ─────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────
const PdfPage: React.FC<{ doc: any; n: number; width: number }> = ({ doc, n, width }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [visible, setVisible] = useState(n <= 2);

  useEffect(() => {
    if (visible) return;
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); } }, { rootMargin: '900px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !width) return;
    let dead = false;
    let task: any = null;
    (async () => {
      const page = await doc.getPage(n);
      const v1 = page.getViewport({ scale: 1 });
      const scale = width / v1.width;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vp = page.getViewport({ scale: scale * dpr });
      const cv = canvasRef.current;
      if (!cv || dead) return;
      setRatio(v1.height / v1.width);
      cv.width = Math.floor(vp.width);
      cv.height = Math.floor(vp.height);
      task = page.render({ canvasContext: cv.getContext('2d'), viewport: vp });
      await task.promise;
    })().catch(() => { /* render dibatalkan / gagal: halaman dibiarkan kosong */ });
    return () => { dead = true; try { task?.cancel(); } catch { /* abaikan */ } };
  }, [visible, width, doc, n]);

  return (
    <div ref={boxRef} style={{ width: '100%', aspectRatio: `1 / ${ratio}`, background: '#fff', borderRadius: 4, boxShadow: '0 2px 14px rgba(0,0,0,.16)', overflow: 'hidden', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', right: 8, bottom: 6, fontSize: 10.5, color: '#9ca3af', background: 'rgba(255,255,255,.8)', padding: '1px 6px', borderRadius: 8 }}>{n}</div>
    </div>
  );
};

const PdfPages: React.FC<{ blob: Blob; onFail: () => void }> = ({ blob, onFail }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<any>(null);
  const [count, setCount] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let dead = false;
    let loaded: any = null;
    (async () => {
      try {
        const pdfjs: any = await import('pdfjs-dist');
        // @ts-ignore - ?url dikenali Vite
        const worker: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const buf = await blob.arrayBuffer();
        loaded = await pdfjs.getDocument({ data: buf }).promise;
        if (dead) { loaded.destroy(); return; }
        setDoc(loaded);
        setCount(loaded.numPages);
      } catch (e) {
        console.error('[Cylen] gagal membuka PDF', e);
        if (!dead) onFail();
      }
    })();
    return () => { dead = true; try { loaded?.destroy(); } catch { /* abaikan */ } };
  }, [blob]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!doc && <Loading text="Membuka PDF..." />}
      {doc && Array.from({ length: count }, (_, i) => <PdfPage key={i} doc={doc} n={i + 1} width={width} />)}
    </div>
  );
};

// ─────────────────────────────────────────────
// DOCX
// ─────────────────────────────────────────────
const DOCX_CSS = `
.cy-docx{font-size:14px;line-height:1.65;color:#1f2937;word-break:break-word}
.cy-docx h1{font-size:22px;font-weight:800;margin:18px 0 8px;line-height:1.2}
.cy-docx h2{font-size:18px;font-weight:700;margin:16px 0 6px;line-height:1.25}
.cy-docx h3,.cy-docx h4{font-size:15px;font-weight:700;margin:12px 0 4px}
.cy-docx p{margin:0 0 10px}
.cy-docx ul,.cy-docx ol{padding-left:22px;margin:0 0 10px}
.cy-docx ul{list-style:disc}
.cy-docx ol{list-style:decimal}
.cy-docx table{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px}
.cy-docx td,.cy-docx th{border:1px solid #e1e4ea;padding:6px 8px;vertical-align:top}
.cy-docx img{max-width:100%;height:auto}
.cy-docx a{color:#2563eb;text-decoration:underline}
`;

const DocxView: React.FC<{ blob: Blob; onFail: () => void }> = ({ blob, onFail }) => {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        // @ts-ignore - build browser milik mammoth
        const mod: any = await import('mammoth/mammoth.browser');
        const mammoth = mod.default || mod;
        const res = await mammoth.convertToHtml({ arrayBuffer: await blob.arrayBuffer() });
        if (!dead) setHtml(cleanHtml(res.value || ''));
      } catch (e) {
        console.error('[Cylen] gagal membuka docx', e);
        if (!dead) onFail();
      }
    })();
    return () => { dead = true; };
  }, [blob]);
  if (html === null) return <Loading text="Membuka dokumen..." />;
  return (
    <div style={{ background: '#fff', borderRadius: 6, padding: '24px 20px 30px', boxShadow: '0 2px 14px rgba(0,0,0,.16)', overflowX: 'auto' }}>
      <style>{DOCX_CSS}</style>
      {html.trim() ? <div className="cy-docx" dangerouslySetInnerHTML={{ __html: html }} /> : <div style={{ color: '#6b7280', fontSize: 14 }}>Dokumen ini kosong.</div>}
    </div>
  );
};

// ─────────────────────────────────────────────
// Teks
// ─────────────────────────────────────────────
const TextView: React.FC<{ blob: Blob; onFail: () => void }> = ({ blob, onFail }) => {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    blob.text().then(t => { if (!dead) setText(t.length > 300000 ? t.slice(0, 300000) + '\n\n… (dipotong)' : t); }).catch(() => { if (!dead) onFail(); });
    return () => { dead = true; };
  }, [blob]);
  if (text === null) return <Loading text="Membuka file..." />;
  return (
    <div style={{ background: '#fff', borderRadius: 6, padding: '20px 18px', boxShadow: '0 2px 14px rgba(0,0,0,.16)' }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.6, color: '#1f2937', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{text}</pre>
    </div>
  );
};

// ── bagian kecil ──
const Loading: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 0', color: 'var(--mu)', fontSize: 13.5, fontWeight: 500 }}>
    <Loader2 size={18} style={{ animation: 'cy-spin 1s linear infinite' }} /> {text}
  </div>
);

const Unsupported: React.FC<{ message: string; onDownload?: () => void }> = ({ message, onDownload }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
    <FileText size={40} color="var(--mu)" />
    <div style={{ fontSize: 14, color: 'var(--mu)', lineHeight: 1.5, maxWidth: 280 }}>{message}</div>
    {onDownload && (
      <button onClick={onDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, border: 'none', background: 'var(--text)', color: 'var(--bg)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        <Download size={16} /> Unduh
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────
// Popup utama
// ─────────────────────────────────────────────
export const FileViewerSheet: React.FC<{ file: any; onClose: () => void }> = ({ file, onClose }) => {
  const name: string = file?.name || 'Dokumen';
  const kind = useMemo(() => kindOf(name), [name]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [viewFailed, setViewFailed] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        let b: Blob;
        if (file?.data) b = b64ToBlob(String(file.data), mimeFromName(name));
        else if (file?.fid) b = await loadGroupFileBlob(file);
        else throw new Error('nodata');
        if (!dead) setBlob(b);
      } catch (e) {
        console.error('[Cylen] gagal memuat file', e);
        if (!dead) setLoadFailed(true);
      }
    })();
    return () => { dead = true; };
  }, [file]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t); }, [toast]);

  const download = useCallback(() => {
    if (!blob) return;
    downloadBlob(blob, name);
    setToast('File diunduh');
  }, [blob, name]);

  const share = useCallback(async () => {
    if (!blob) return;
    const nav: any = navigator;
    try {
      const f = new File([blob], name, { type: blob.type || mimeFromName(name) });
      if (nav.canShare && nav.canShare({ files: [f] })) await nav.share({ files: [f], title: name });
      else { downloadBlob(blob, name); setToast('HP belum bisa membagikan file ini, file diunduh'); }
    } catch (e: any) {
      if (e && e.name === 'AbortError') return;
      downloadBlob(blob, name);
      setToast('File diunduh');
    }
  }, [blob, name]);

  const subtitle = `${KIND_LABEL[kind]}${blob ? ` · ${fmtSize(blob.size)}` : ''}`;

  let body: React.ReactNode;
  if (loadFailed) body = <Unsupported message="File tidak bisa dimuat. Cek koneksi lalu coba lagi." />;
  else if (!blob) body = <Loading text="Memuat file..." />;
  else if (viewFailed || kind === 'other') {
    body = <Unsupported message={kind === 'other' ? 'Pratinjau belum tersedia untuk jenis file ini. Unduh untuk membukanya.' : 'File ini tidak bisa dipratinjau. Unduh untuk membukanya.'} onDownload={download} />;
  }
  else if (kind === 'pdf') body = <PdfPages blob={blob} onFail={() => setViewFailed(true)} />;
  else if (kind === 'docx') body = <DocxView blob={blob} onFail={() => setViewFailed(true)} />;
  else body = <TextView blob={blob} onFail={() => setViewFailed(true)} />;

  return (
    <PreviewShell title={name} subtitle={subtitle} onClose={onClose} onDownload={blob ? download : undefined} onShare={blob ? share : undefined} toast={toast}>
      {body}
    </PreviewShell>
  );
};

// ─────────────────────────────────────────────
// Pil dokumen di bubble: ketuk → popup isi dokumen (bukan unduh)
// ─────────────────────────────────────────────
export const FilePill: React.FC<{ file: any; label?: string }> = ({ file, label }) => {
  const [open, setOpen] = useState(false);
  const clickable = !!(file && (file.data || file.fid));
  return (
    <>
      <div
        role={clickable ? 'button' : undefined}
        onClick={() => { if (clickable) setOpen(true); }}
        style={{ cursor: clickable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, maxWidth: '85%', WebkitTapHighlightColor: 'transparent' }}
      >
        <FileText size={17} color="var(--mu,#909090)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{file?.name || label || 'Dokumen'}</span>
      </div>
      {open && <FileViewerSheet file={file} onClose={() => setOpen(false)} />}
    </>
  );
};
