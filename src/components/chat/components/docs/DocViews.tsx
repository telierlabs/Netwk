// ─────────────────────────────────────────────
// DOC VIEWS — src/components/chat/components/docs/DocViews.tsx
// Tampilan dokumen buatan AI (dipakai chat pribadi & grup):
//   • HelixNote       → 2 titik helix + kalimat singkat berkilau, SATU baris
//   • DocLoadingCard  → kartu loading dengan langkah ASLI dari isi dokumen + progres
//   • DocDoneCard     → kartu selesai ("Ketuk untuk melihat")
//   • DocPreviewSheet → popup besar dari bawah: slide / halaman / tabel, + unduh & bagikan
//   • DocCard         → pembungkus: loading → selesai → popup
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Presentation, FileSpreadsheet, Download, Share2, X, ChevronRight, Loader2 } from 'lucide-react';
import { ChatChart } from '../media/ChatChart';
import {
  DOC_LABEL, inlineRuns, liveProgress, liveSteps, parseDoc, sourceStats,
} from '../../../../lib/docModel';
import type { Block, DocKind, ParsedDoc, Slide } from '../../../../lib/docModel';
import { buildDocBlob, docFileName, downloadBlob, shareBlob } from '../../../../lib/docBuilders';

const ACCENT = '#2F5BEA';

export const DOC_CSS = `
@keyframes cy-hx-1 { 0%,100%{transform:translateX(0) scale(1);opacity:1} 25%{transform:translateX(14px) scale(.7);opacity:.4} 50%{transform:translateX(0) scale(.5);opacity:.15} 75%{transform:translateX(-14px) scale(.7);opacity:.4} }
@keyframes cy-hx-2 { 0%,100%{transform:translateX(0) scale(.5);opacity:.15} 25%{transform:translateX(-14px) scale(.7);opacity:.4} 50%{transform:translateX(0) scale(1);opacity:1} 75%{transform:translateX(14px) scale(.7);opacity:.4} }
@keyframes cy-shim { 0%{background-position:120% 0} 100%{background-position:-120% 0} }
@keyframes cy-dc-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes cy-dc-sweep { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
@keyframes cy-sheet-up { from{transform:translateY(100%)} to{transform:none} }
@keyframes cy-fade { from{opacity:0} to{opacity:1} }
@keyframes cy-spin { to{transform:rotate(360deg)} }
.cy-shim{background:linear-gradient(90deg,var(--mu,#888) 0%,var(--mu,#888) 38%,var(--text,#111) 50%,var(--mu,#888) 62%,var(--mu,#888) 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;animation:cy-shim 1.9s linear infinite}
`;

// ── 1. Helix + kalimat (satu baris) ──
export const HelixNote: React.FC<{ text?: string }> = ({ text }) => (
  <div className="select-none pointer-events-none" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0 12px 4px', width: '100%', minWidth: 0 }}>
    <style>{DOC_CSS}</style>
    <div style={{ position: 'relative', width: 36, height: 14, flexShrink: 0 }}>
      <div style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'var(--text)', animation: 'cy-hx-1 1.2s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'var(--text)', animation: 'cy-hx-2 1.2s ease-in-out infinite' }} />
    </div>
    {text ? (
      <span className="cy-shim" key={text} style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, animationName: 'cy-shim', lineHeight: 1.4 }}>{text}</span>
    ) : null}
  </div>
);

const KindIcon: React.FC<{ kind: DocKind; size?: number }> = ({ kind, size = 16 }) =>
  kind === 'PPT' ? <Presentation size={size} /> : kind === 'EXCEL' ? <FileSpreadsheet size={size} /> : <FileText size={size} />;

const cardBase: React.CSSProperties = {
  width: 'min(250px, 72%)', aspectRatio: '3 / 3.6', borderRadius: 18, overflow: 'hidden', position: 'relative',
  background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', display: 'flex', flexDirection: 'column',
  textAlign: 'left', padding: 0, font: 'inherit', color: 'var(--text)',
};

// ── 2. Kartu loading ──
export const DocLoadingCard: React.FC<{ kind: DocKind; name: string; source: string }> = ({ kind, name, source }) => {
  const steps = useMemo(() => liveSteps(kind, source), [kind, source]);
  const progress = liveProgress(kind, source);
  const shown = steps.slice(-3);
  return (
    <div style={{ ...cardBase, padding: 16, justifyContent: 'space-between', animation: 'cy-dc-in .3s ease both' }}>
      <style>{DOC_CSS}</style>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg,transparent,rgba(127,127,127,.10),transparent)', animation: 'cy-dc-sweep 2.2s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu)', fontSize: 12, fontWeight: 600, position: 'relative' }}>
        <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--text)' }}><KindIcon kind={kind} /></span>
        {DOC_LABEL[kind]}
      </div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: 58, justifyContent: 'flex-end' }}>
          {shown.map((s, i) => {
            const fromEnd = shown.length - 1 - i;
            return (
              <div key={s} style={{ fontSize: 12.5, lineHeight: 1.3, color: 'var(--text)', opacity: fromEnd === 0 ? 1 : fromEnd === 1 ? 0.55 : 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: 'cy-dc-in .35s ease both', fontWeight: fromEnd === 0 ? 600 : 400 }}>{s}</div>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'var(--bd)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(4, progress * 100)}%`, background: 'var(--text)', borderRadius: 3, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
};

// ── Thumbnail kecil di kartu selesai ──
const Thumb: React.FC<{ doc: ParsedDoc }> = ({ doc }) => {
  if (doc.kind === 'PPT') {
    const first = doc.slides?.[0];
    return (
      <div style={{ position: 'absolute', inset: 14, borderRadius: 8, background: '#111827', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, boxShadow: '0 2px 10px rgba(0,0,0,.18)' }}>
        <div style={{ width: 3, height: 22, background: ACCENT, borderRadius: 2, position: 'absolute', left: 8, top: '38%' }} />
        <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1.2, paddingLeft: 8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{first?.title || doc.title}</div>
        <div style={{ height: 3, width: '45%', background: 'rgba(255,255,255,.25)', borderRadius: 2, marginLeft: 8 }} />
      </div>
    );
  }
  if (doc.kind === 'EXCEL') {
    return (
      <div style={{ position: 'absolute', inset: 14, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.10)' }}>
        {Array.from({ length: 7 }).map((_, r) => (
          <div key={r} style={{ display: 'flex', height: '14.3%', borderBottom: '1px solid #eceef2', background: r === 0 ? '#eef1f7' : '#fff' }}>
            {Array.from({ length: 4 }).map((_, c) => <div key={c} style={{ flex: 1, borderRight: '1px solid #eceef2' }} />)}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: '14px 24px', borderRadius: 6, background: '#fff', border: '1px solid #e5e7eb', padding: 12, boxShadow: '0 2px 10px rgba(0,0,0,.10)', overflow: 'hidden' }}>
      <div style={{ height: 6, width: '62%', background: '#111827', borderRadius: 2, marginBottom: 5 }} />
      <div style={{ height: 2.5, width: 26, background: ACCENT, marginBottom: 10 }} />
      {[100, 92, 96, 70, 100, 88, 55].map((w, i) => <div key={i} style={{ height: 3, width: `${w}%`, background: '#e5e7eb', borderRadius: 2, marginBottom: 5 }} />)}
    </div>
  );
};

// ── 3. Kartu selesai ──
export const DocDoneCard: React.FC<{ kind: DocKind; name: string; source: string; onOpen: () => void }> = ({ kind, name, source, onOpen }) => {
  const doc = useMemo(() => parseDoc(kind, name, source), [kind, name, source]);
  return (
    <button type="button" onClick={onOpen} style={{ ...cardBase, cursor: 'pointer', animation: 'cy-dc-in .3s ease both' }} aria-label={`Buka ${name}`}>
      <style>{DOC_CSS}</style>
      <div style={{ position: 'relative', flex: 1, background: 'var(--bg)', borderBottom: '1px solid var(--bd)' }}>
        <Thumb doc={doc} />
      </div>
      <div style={{ padding: '11px 14px 13px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--mu)' }}>
          <span>{DOC_LABEL[kind]} · {sourceStats(doc)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Ketuk untuk melihat <ChevronRight size={14} /></div>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────
// Render isi dokumen
// ─────────────────────────────────────────────
const chartVars: React.CSSProperties = { ['--text' as any]: '#111827', ['--mu' as any]: 'rgba(17,24,39,.5)', ['--bd' as any]: 'rgba(17,24,39,.09)', ['--cd' as any]: '#ffffff', ['--sf' as any]: '#f5f6f8' };

const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>{inlineRuns(text).map((r, i) => <span key={i} style={{ fontWeight: r.b ? 700 : undefined, fontStyle: r.i ? 'italic' : undefined }}>{r.text}</span>)}</>
);

const numeric = (t: string) => !!t && /\d/.test(t) && /^[-+]?[\sRp$%\d.,]+$/.test(t.trim());

// ukuran dalam "u": px untuk kertas, cqw untuk slide
const BlockView: React.FC<{ b: Block; u: (n: number) => string; ink?: string }> = ({ b, u, ink = '#1f2937' }) => {
  switch (b.t) {
    case 'h1': return <div style={{ fontSize: u(1.45), fontWeight: 800, color: '#111827', margin: `${u(.8)} 0 ${u(.4)}`, lineHeight: 1.2 }}><Inline text={b.text} /></div>;
    case 'h2': return <div style={{ fontSize: u(1.2), fontWeight: 700, color: '#111827', margin: `${u(.8)} 0 ${u(.3)}`, paddingLeft: u(.55), borderLeft: `${u(.2)} solid ${ACCENT}`, lineHeight: 1.25 }}><Inline text={b.text} /></div>;
    case 'h3': return <div style={{ fontSize: u(1.02), fontWeight: 700, color: ACCENT, margin: `${u(.5)} 0 ${u(.2)}` }}><Inline text={b.text} /></div>;
    case 'p': return <p style={{ fontSize: u(1), lineHeight: 1.62, color: ink, margin: `0 0 ${u(.6)}` }}><Inline text={b.text} /></p>;
    case 'ul':
    case 'ol': {
      const Tag: any = b.t === 'ul' ? 'ul' : 'ol';
      return <Tag style={{ margin: `0 0 ${u(.6)}`, paddingLeft: u(1.3), fontSize: u(1), lineHeight: 1.55, color: ink }}>{b.items.map((it, i) => <li key={i} style={{ marginBottom: u(.25) }}><Inline text={it} /></li>)}</Tag>;
    }
    case 'quote': return <div style={{ margin: `${u(.5)} 0 ${u(.8)}`, padding: `${u(.7)} ${u(.9)}`, background: '#f3f5fb', borderLeft: `${u(.25)} solid ${ACCENT}`, fontStyle: 'italic', fontSize: u(1.05), lineHeight: 1.55, color: '#374151', borderRadius: `0 ${u(.4)} ${u(.4)} 0` }}><Inline text={b.text} /></div>;
    case 'hr': return <div style={{ height: 1, background: '#e5e7eb', margin: `${u(.8)} 0` }} />;
    case 'stats': return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${b.items.length || 1}, minmax(0,1fr))`, gap: u(.6), margin: `${u(.5)} 0 ${u(.8)}` }}>
        {b.items.map((s, i) => (
          <div key={i} style={{ background: '#f3f5fb', borderRadius: u(.6), padding: `${u(.8)} ${u(.9)}` }}>
            <div style={{ fontSize: u(s.value.length > 10 ? 1.25 : 1.7), fontWeight: 800, color: ACCENT, lineHeight: 1.1, wordBreak: 'break-word' }}>{s.value}</div>
            <div style={{ fontSize: u(.78), color: '#6b7280', marginTop: u(.3) }}>{s.label}</div>
          </div>
        ))}
      </div>
    );
    case 'chart': return <div style={{ ...chartVars, margin: `${u(.4)} 0 ${u(.8)}`, background: '#fff', borderRadius: u(.6), border: '1px solid #e5e7eb', padding: u(.5) }}>{b.spec.title ? <div style={{ fontSize: u(.9), fontWeight: 700, color: '#111827', padding: `${u(.2)} ${u(.3)}` }}>{b.spec.title}{b.spec.unit ? ` (${b.spec.unit})` : ''}</div> : null}<ChatChart spec={{ ...b.spec, title: '' }} /></div>;
    case 'table': {
      const cols = Math.max(...b.rows.map(r => r.length));
      return (
        <div style={{ margin: `${u(.4)} 0 ${u(.8)}`, overflowX: 'auto', borderRadius: u(.5), border: '1px solid #e5e7eb' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: u(.88) }}>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} style={{ background: ri === 0 ? '#1f2937' : ri % 2 === 0 ? '#f6f7f9' : '#fff' }}>
                  {Array.from({ length: cols }, (_, ci) => {
                    const c = r[ci] || '';
                    return <td key={ci} style={{ padding: `${u(.5)} ${u(.7)}`, color: ri === 0 ? '#fff' : '#1f2937', fontWeight: ri === 0 ? 700 : 400, textAlign: ri > 0 && numeric(c) ? 'right' : 'left', borderTop: ri ? '1px solid #eceef2' : undefined, verticalAlign: 'top' }}><Inline text={c} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
  return null;
};

const SlideView: React.FC<{ s: Slide; n: number }> = ({ s, n }) => {
  const u = (x: number) => `${(x * 2.05).toFixed(2)}cqw`;
  const base: React.CSSProperties = { containerType: 'inline-size', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,.16)', position: 'relative' };
  if (s.cover) {
    return (
      <div style={{ ...base, background: '#111827' }}>
        <div style={{ position: 'absolute', left: '6%', top: '30%', width: '0.9cqw', height: '30%', background: ACCENT }} />
        <div style={{ position: 'absolute', left: '9.5%', right: '8%', top: '28%' }}>
          <div style={{ color: '#fff', fontSize: s.title.length > 40 ? '4.6cqw' : '5.8cqw', fontWeight: 800, lineHeight: 1.12 }}>{s.title}</div>
          {s.subtitle ? <div style={{ color: '#aeb6c4', fontSize: '2.2cqw', marginTop: '2cqw', lineHeight: 1.35 }}>{s.subtitle}</div> : null}
        </div>
        <div style={{ position: 'absolute', left: '9.5%', bottom: '5%', fontSize: '1.3cqw', color: '#6b7280' }}>Cylen AI</div>
      </div>
    );
  }
  const stats = s.blocks.filter(b => b.t === 'stats');
  const visuals = s.blocks.filter(b => b.t === 'chart' || b.t === 'table');
  const texts = s.blocks.filter(b => !['stats', 'chart', 'table'].includes(b.t));
  const twoCol = visuals.length > 0 && texts.length > 0;
  return (
    <div style={{ ...base, background: '#fff', padding: '4.2cqw 5.5cqw 5cqw', height: 'auto', minHeight: 0 }}>
      <div style={{ fontSize: s.title.length > 48 ? '2.6cqw' : '3.3cqw', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{s.title}</div>
      <div style={{ width: '6.5cqw', height: '0.5cqw', background: ACCENT, margin: '1.2cqw 0 2.4cqw' }} />
      {stats.map((b, i) => <BlockView key={'s' + i} b={b} u={u} />)}
      <div style={{ display: 'grid', gridTemplateColumns: twoCol ? 'minmax(0,.8fr) minmax(0,1fr)' : 'minmax(0,1fr)', gap: '3cqw', alignItems: 'start' }}>
        {texts.length > 0 && <div>{texts.map((b, i) => <BlockView key={i} b={b} u={u} />)}</div>}
        {visuals.length > 0 && <div>{visuals.slice(0, 2).map((b, i) => <BlockView key={i} b={b} u={u} />)}</div>}
      </div>
      <div style={{ position: 'absolute', left: '5.5cqw', bottom: '1.6cqw', fontSize: '1.1cqw', color: '#9ca3af' }}>Cylen AI</div>
      <div style={{ position: 'absolute', right: '5.5cqw', bottom: '1.6cqw', fontSize: '1.1cqw', color: '#9ca3af' }}>{n}</div>
    </div>
  );
};

const PaperView: React.FC<{ doc: ParsedDoc }> = ({ doc }) => {
  const u = (x: number) => `${(x * 13.5).toFixed(1)}px`;
  return (
    <div style={{ background: '#fff', borderRadius: 6, padding: '30px 26px 34px', boxShadow: '0 2px 14px rgba(0,0,0,.16)', color: '#1f2937' }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: ACCENT }}>CYLEN AI · DOKUMEN</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.15, margin: '8px 0 10px' }}>{doc.title}</div>
      <div style={{ width: 40, height: 3, background: ACCENT, marginBottom: 8 }} />
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      {(doc.blocks || []).map((b, i) => <BlockView key={i} b={b} u={u} />)}
    </div>
  );
};

const colLetter = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

const SheetView: React.FC<{ doc: ParsedDoc }> = ({ doc }) => {
  const [tab, setTab] = useState(0);
  const sh = doc.sheets?.[Math.min(tab, (doc.sheets?.length || 1) - 1)];
  if (!sh) return null;
  const cols = Math.max(...sh.rows.map(r => r.length), 1);
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 14px rgba(0,0,0,.16)', overflow: 'hidden', color: '#1f2937' }}>
      <div style={{ overflow: 'auto', maxWidth: '100%' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12.5, minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ background: '#f1f3f6', border: '1px solid #e1e4ea', width: 34, minWidth: 34 }} />
              {Array.from({ length: cols }, (_, c) => <th key={c} style={{ background: '#f1f3f6', border: '1px solid #e1e4ea', padding: '4px 10px', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>{colLetter(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {sh.rows.map((r, ri) => (
              <tr key={ri}>
                <td style={{ background: '#f1f3f6', border: '1px solid #e1e4ea', textAlign: 'center', color: '#6b7280', fontSize: 11, padding: '0 6px' }}>{ri + 1}</td>
                {Array.from({ length: cols }, (_, ci) => {
                  const c = r[ci] || '';
                  return <td key={ci} style={{ border: '1px solid #e1e4ea', padding: '7px 10px', whiteSpace: 'nowrap', fontWeight: ri === 0 ? 700 : 400, background: ri === 0 ? '#eef1f7' : '#fff', textAlign: ri > 0 && numeric(c) ? 'right' : 'left' }}>{c}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(doc.sheets?.length || 0) > 1 && (
        <div style={{ display: 'flex', gap: 2, background: '#f1f3f6', padding: '6px 8px 0', overflowX: 'auto' }}>
          {doc.sheets!.map((s, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '6px 6px 0 0', background: i === tab ? '#fff' : 'transparent', color: i === tab ? '#111827' : '#6b7280', whiteSpace: 'nowrap' }}>{s.name}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── 4. Popup preview ──
export const DocPreviewSheet: React.FC<{ kind: DocKind; name: string; source: string; onClose: () => void }> = ({ kind, name, source, onClose }) => {
  const doc = useMemo(() => parseDoc(kind, name, source), [kind, name, source]);
  const [busy, setBusy] = useState<'dl' | 'share' | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const run = async (mode: 'dl' | 'share') => {
    if (busy) return;
    setBusy(mode);
    try {
      const blob = await buildDocBlob(kind, name, source);
      const fn = docFileName(kind, name);
      if (mode === 'dl') { downloadBlob(blob, fn); setToast('File diunduh'); }
      else { const r = await shareBlob(blob, fn, kind); setToast(r === 'downloaded' ? 'Berbagi tak didukung, file diunduh' : 'Dibagikan'); }
    } catch (e) {
      console.error('[Cylen] gagal membuat file dokumen', e);
      setToast('Gagal membuat file');
    } finally { setBusy(null); }
  };

  const iconBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--sf)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'cy-fade .2s ease both' }}>
      <style>{DOC_CSS}</style>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 820, height: '92%', background: 'var(--bg)', color: 'var(--text)', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'cy-sheet-up .32s cubic-bezier(.2,.8,.2,1) both', boxShadow: '0 -8px 40px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 12px 18px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{DOC_LABEL[kind]} · {sourceStats(doc)}</div>
          </div>
          <button style={iconBtn} onClick={() => run('dl')} aria-label="Unduh" title="Unduh">{busy === 'dl' ? <Loader2 size={17} style={{ animation: 'cy-spin 1s linear infinite' }} /> : <Download size={17} />}</button>
          <button style={iconBtn} onClick={() => run('share')} aria-label="Bagikan" title="Bagikan">{busy === 'share' ? <Loader2 size={17} style={{ animation: 'cy-spin 1s linear infinite' }} /> : <Share2 size={17} />}</button>
          <button style={iconBtn} onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 14px 40px', background: 'var(--sf)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {doc.slides ? doc.slides.map((s, i) => <SlideView key={i} s={s} n={i + 1} />) : doc.sheets ? <SheetView doc={doc} /> : <PaperView doc={doc} />}
          </div>
        </div>
        {toast && <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, animation: 'cy-fade .2s ease both' }}>{toast}</div>}
      </div>
    </div>,
    document.body,
  );
};

// ── 5. Pembungkus ──
export const DocCard: React.FC<{ kind: DocKind; name: string; source: string; live: boolean }> = memo(({ kind, name, source, live }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: '100%', margin: '6px 0 10px' }}>
      {live ? <DocLoadingCard kind={kind} name={name} source={source} /> : <DocDoneCard kind={kind} name={name} source={source} onOpen={() => setOpen(true)} />}
      {open && !live && <DocPreviewSheet kind={kind} name={name} source={source} onClose={() => setOpen(false)} />}
    </div>
  );
});
