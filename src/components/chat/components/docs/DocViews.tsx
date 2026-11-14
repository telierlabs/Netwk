// ─────────────────────────────────────────────
// DOC VIEWS — src/components/chat/components/docs/DocViews.tsx
// Tampilan dokumen buatan AI (dipakai chat pribadi & grup):
//   • HelixNote       → 2 titik helix + kalimat singkat berkilau, SATU baris
//   • DocCard         → kartu (bentuk mengikuti dokumen: PPT 16:9, PDF/Word tegak, Excel 4:3)
//                       loading (langkah ASLI dari isi dokumen + progres) → selesai ("Ketuk untuk melihat")
//   • DocPreviewSheet → popup besar dari bawah: slide / halaman / tabel, unduh + bagikan,
//                       bisa ditutup dengan digeser ke bawah (header atau isi yang sudah di paling atas)
// Desain (warna, font, gaya sampul, foto) mengikuti "@theme" & "@img" yang ditulis AI.
// ─────────────────────────────────────────────
import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Presentation, FileSpreadsheet, Download, Share2, X, ChevronRight, Loader2 } from 'lucide-react';
import { ChatChart } from '../media/ChatChart';
import {
  CARD_SHAPE, DEFAULT_THEME, DOC_LABEL, FONT_STACK, coverColors, docTextOutline, inlineRuns, liveProgress, liveSteps,
  parseDoc, sourceStats,
} from '../../../../lib/docModel';
import type { Block, DocKind, ParsedDoc, Slide, Theme } from '../../../../lib/docModel';
import { buildDocBlob, docFileName, downloadBlob, shareBlob } from '../../../../lib/docBuilders';
import { useDocPhoto } from '../../../../lib/docImages';

const ThemeCtx = createContext<Theme>(DEFAULT_THEME);
const useTheme = () => useContext(ThemeCtx);
const hash = (h: string) => '#' + h;

export const DOC_CSS = `
@keyframes cy-hx-1 { 0%,100%{transform:translateX(0) scale(1);opacity:1} 25%{transform:translateX(14px) scale(.7);opacity:.4} 50%{transform:translateX(0) scale(.5);opacity:.15} 75%{transform:translateX(-14px) scale(.7);opacity:.4} }
@keyframes cy-hx-2 { 0%,100%{transform:translateX(0) scale(.5);opacity:.15} 25%{transform:translateX(-14px) scale(.7);opacity:.4} 50%{transform:translateX(0) scale(1);opacity:1} 75%{transform:translateX(14px) scale(.7);opacity:.4} }
@keyframes cy-shim { 0%{background-position:120% 0} 100%{background-position:-120% 0} }
@keyframes cy-dc-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes cy-dc-sweep { 0%{transform:translateX(-120%)} 100%{transform:translateX(120%)} }
@keyframes cy-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
@keyframes cy-fade { from{opacity:0} to{opacity:1} }
@keyframes cy-spin { to{transform:rotate(360deg)} }
@keyframes cy-pulse { 0%,100%{opacity:.45} 50%{opacity:.9} }
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
      <span className="cy-shim" key={text} style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, lineHeight: 1.4 }}>{text}</span>
    ) : null}
  </div>
);

const KindIcon: React.FC<{ kind: DocKind; size?: number }> = ({ kind, size = 16 }) =>
  kind === 'PPT' ? <Presentation size={size} /> : kind === 'EXCEL' ? <FileSpreadsheet size={size} /> : <FileText size={size} />;

// ── Foto dokumen ──
const DocPhoto: React.FC<{ src: string; caption?: string; ratio?: string; radius?: number; fontPx?: string }> = ({ src, caption, ratio = '16 / 10', radius = 8, fontPx = '11px' }) => {
  const ph = useDocPhoto(src);
  if (ph === null) return null;
  if (ph === undefined) return <div style={{ width: '100%', aspectRatio: ratio, borderRadius: radius, background: '#e5e7eb', animation: 'cy-pulse 1.2s ease-in-out infinite' }} />;
  const cap = caption || ph.title;
  return (
    <figure style={{ margin: 0 }}>
      <img src={ph.src} alt={cap || ''} loading="lazy" referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: radius, background: '#e5e7eb' }} />
      {cap ? <figcaption style={{ fontSize: fontPx, color: '#6b7280', fontStyle: 'italic', marginTop: 5, lineHeight: 1.35 }}>{cap}</figcaption> : null}
    </figure>
  );
};

// ── 2. Kartu: bentuk mengikuti jenis dokumen ──
const cardBox = (kind: DocKind, fill = false): React.CSSProperties => ({
  width: fill ? '100%' : CARD_SHAPE[kind].width, borderRadius: 18, overflow: 'hidden', position: 'relative',
  background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', display: 'flex', flexDirection: 'column',
  textAlign: 'left', padding: 0, font: 'inherit', color: 'var(--text)',
});

const LoadingCard: React.FC<{ kind: DocKind; name: string; source: string; fill?: boolean }> = ({ kind, name, source, fill }) => {
  const steps = useMemo(() => liveSteps(kind, source), [kind, source]);
  const progress = liveProgress(kind, source);
  const shown = steps.slice(-3);
  return (
    <div style={{ ...cardBox(kind, fill), animation: 'cy-dc-in .3s ease both' }}>
      <style>{DOC_CSS}</style>
      <div style={{ position: 'relative', aspectRatio: CARD_SHAPE[kind].ratio, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg,transparent,rgba(127,127,127,.10),transparent)', animation: 'cy-dc-sweep 2.2s ease-in-out infinite' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mu)', fontSize: 12, fontWeight: 600, position: 'relative' }}>
          <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--text)' }}><KindIcon kind={kind} size={15} /></span>
          {DOC_LABEL[kind]}
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 50, justifyContent: 'flex-end' }}>
            {shown.map((s, i) => {
              const fromEnd = shown.length - 1 - i;
              return <div key={s} style={{ fontSize: 12.5, lineHeight: 1.3, color: 'var(--text)', opacity: fromEnd === 0 ? 1 : fromEnd === 1 ? 0.55 : 0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', animation: 'cy-dc-in .35s ease both', fontWeight: fromEnd === 0 ? 600 : 400 }}>{s}</div>;
            })}
          </div>
        </div>
      </div>
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid var(--bd)' }}>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--bd)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.max(4, progress * 100)}%`, background: 'var(--text)', borderRadius: 3, transition: 'width .6s ease' }} />
        </div>
      </div>
    </div>
  );
};

// ── Thumbnail kartu selesai (isi nyata dokumen, bukan gambar generik) ──
const CoverThumb: React.FC<{ s: Slide; theme: Theme }> = ({ s, theme }) => {
  const cc = coverColors(theme);
  const ph = useDocPhoto(s.image?.src || '');
  return (
    <div style={{ position: 'absolute', inset: 0, background: hash(cc.bg), display: 'flex', alignItems: 'center', fontFamily: FONT_STACK[theme.font] }}>
      {s.image && ph ? <img src={ph.src} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '42%', height: '100%', objectFit: 'cover' }} /> : null}
      <div style={{ position: 'absolute', left: '7%', top: '32%', width: 3, height: '34%', background: hash(cc.bar) }} />
      <div style={{ paddingLeft: '11%', paddingRight: s.image && ph ? '46%' : '8%', color: hash(cc.fg) }}>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
        {s.subtitle ? <div style={{ fontSize: 9.5, marginTop: 5, color: hash(cc.sub), display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.subtitle}</div> : null}
      </div>
    </div>
  );
};

const Thumb: React.FC<{ doc: ParsedDoc }> = ({ doc }) => {
  const t = doc.theme;
  if (doc.kind === 'PPT') {
    const first = doc.slides?.[0];
    if (first && first.cover) return <CoverThumb s={first} theme={t} />;
    return (
      <div style={{ position: 'absolute', inset: 0, background: hash(t.slideBg), padding: '9% 8%', fontFamily: FONT_STACK[t.font] }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: hash(t.ink), lineHeight: 1.15 }}>{first?.title || doc.title}</div>
        <div style={{ width: 28, height: 3, background: hash(t.accent), margin: '7px 0 9px' }} />
        {[90, 75, 82].map((w, i) => <div key={i} style={{ height: 4, width: `${w}%`, background: '#e5e7eb', borderRadius: 2, marginBottom: 5 }} />)}
      </div>
    );
  }
  if (doc.kind === 'EXCEL') {
    const rows = (doc.sheets?.[0]?.rows || []).slice(0, 6);
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#fff', overflow: 'hidden', fontFamily: FONT_STACK[t.font] }}>
        {Array.from({ length: 7 }).map((_, r) => (
          <div key={r} style={{ display: 'flex', height: `${100 / 7}%`, borderBottom: '1px solid #eceef2', background: r === 0 ? hash(t.soft) : '#fff' }}>
            {Array.from({ length: 4 }).map((__, c) => (
              <div key={c} style={{ flex: 1, borderRight: '1px solid #eceef2', padding: '0 5px', fontSize: 8.5, display: 'flex', alignItems: 'center', fontWeight: r === 0 ? 700 : 400, color: '#374151', overflow: 'hidden', whiteSpace: 'nowrap' }}>{rows[r]?.[c] || ''}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff', padding: '11% 11%', overflow: 'hidden', fontFamily: FONT_STACK[t.font] }}>
      <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.12em', color: hash(t.accent) }}>CYLEN AI · DOKUMEN</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: hash(t.ink), lineHeight: 1.15, margin: '6px 0 6px' }}>{doc.title}</div>
      <div style={{ width: 26, height: 3, background: hash(t.accent), marginBottom: 10 }} />
      {[100, 92, 96, 70, 100, 88, 94, 60].map((w, i) => <div key={i} style={{ height: 3.5, width: `${w}%`, background: '#e5e7eb', borderRadius: 2, marginBottom: 5 }} />)}
    </div>
  );
};

const DoneCard: React.FC<{ kind: DocKind; name: string; source: string; fill?: boolean; onOpen: () => void }> = ({ kind, name, source, fill, onOpen }) => {
  const doc = useMemo(() => parseDoc(kind, name, source), [kind, name, source]);
  return (
    <button type="button" onClick={onOpen} style={{ ...cardBox(kind, fill), cursor: 'pointer', animation: 'cy-dc-in .3s ease both' }} aria-label={`Buka ${name}`}>
      <style>{DOC_CSS}</style>
      <div style={{ position: 'relative', aspectRatio: CARD_SHAPE[kind].ratio, background: 'var(--bg)', borderBottom: '1px solid var(--bd)', overflow: 'hidden' }}>
        <Thumb doc={doc} />
      </div>
      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{DOC_LABEL[kind]} · {sourceStats(doc)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 600 }}>Ketuk untuk melihat <ChevronRight size={14} /></div>
      </div>
    </button>
  );
};

// ─────────────────────────────────────────────
// Isi dokumen di popup
// ─────────────────────────────────────────────
const chartVars: React.CSSProperties = { ['--text' as any]: '#111827', ['--mu' as any]: 'rgba(17,24,39,.5)', ['--bd' as any]: 'rgba(17,24,39,.09)', ['--cd' as any]: '#ffffff', ['--sf' as any]: '#f5f6f8' };

const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>{inlineRuns(text).map((r, i) => <span key={i} style={{ fontWeight: r.b ? 700 : undefined, fontStyle: r.i ? 'italic' : undefined }}>{r.text}</span>)}</>
);
const numeric = (t: string) => !!t && /\d/.test(t) && /^[-+]?[\sRp$%\d.,]+$/.test(t.trim());

const BlockView: React.FC<{ b: Block; u: (n: number) => string; ink?: string }> = ({ b, u, ink = '#1f2937' }) => {
  const th = useTheme();
  const A = hash(th.accent), H = hash(th.ink), SOFT = hash(th.soft);
  switch (b.t) {
    case 'h1': return <div style={{ fontSize: u(1.45), fontWeight: 800, color: H, margin: `${u(.8)} 0 ${u(.4)}`, lineHeight: 1.2 }}><Inline text={b.text} /></div>;
    case 'h2': return <div style={{ fontSize: u(1.2), fontWeight: 700, color: H, margin: `${u(.8)} 0 ${u(.3)}`, paddingLeft: u(.55), borderLeft: `${u(.2)} solid ${A}`, lineHeight: 1.25 }}><Inline text={b.text} /></div>;
    case 'h3': return <div style={{ fontSize: u(1.02), fontWeight: 700, color: A, margin: `${u(.5)} 0 ${u(.2)}` }}><Inline text={b.text} /></div>;
    case 'p': return <p style={{ fontSize: u(1), lineHeight: 1.62, color: ink, margin: `0 0 ${u(.6)}` }}><Inline text={b.text} /></p>;
    case 'ul':
    case 'ol': {
      const Tag: any = b.t === 'ul' ? 'ul' : 'ol';
      return <Tag style={{ margin: `0 0 ${u(.6)}`, paddingLeft: u(1.5), listStyleType: b.t === 'ul' ? 'disc' : 'decimal', listStylePosition: 'outside', fontSize: u(1), lineHeight: 1.55, color: ink }}>{b.items.map((it, i) => <li key={i} style={{ marginBottom: u(.25) }}><Inline text={it} /></li>)}</Tag>;
    }
    case 'quote': return <div style={{ margin: `${u(.5)} 0 ${u(.8)}`, padding: `${u(.7)} ${u(.9)}`, background: SOFT, borderLeft: `${u(.25)} solid ${A}`, fontStyle: 'italic', fontSize: u(1.05), lineHeight: 1.55, color: '#374151', borderRadius: `0 ${u(.4)} ${u(.4)} 0` }}><Inline text={b.text} /></div>;
    case 'hr': return <div style={{ height: 1, background: '#e5e7eb', margin: `${u(.8)} 0` }} />;
    case 'image': return <div style={{ margin: `${u(.4)} 0 ${u(.8)}` }}><DocPhoto src={b.src} caption={b.caption} fontPx={u(.75)} radius={8} /></div>;
    case 'stats': return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${b.items.length || 1}, minmax(0,1fr))`, gap: u(.6), margin: `${u(.5)} 0 ${u(.8)}` }}>
        {b.items.map((s, i) => (
          <div key={i} style={{ background: SOFT, borderRadius: u(.6), padding: `${u(.8)} ${u(.9)}` }}>
            <div style={{ fontSize: u(s.value.length > 10 ? 1.25 : 1.7), fontWeight: 800, color: A, lineHeight: 1.1, wordBreak: 'break-word' }}>{s.value}</div>
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
  const th = useTheme();
  const u = (x: number) => `${(x * 2.05).toFixed(2)}cqw`;
  const base: React.CSSProperties = { containerType: 'inline-size', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 14px rgba(0,0,0,.16)', position: 'relative', fontFamily: FONT_STACK[th.font] };
  const ph = useDocPhoto(s.cover ? s.image?.src || '' : '');
  if (s.cover) {
    const cc = coverColors(th);
    const withImg = !!(s.image && ph);
    return (
      <div style={{ ...base, background: hash(cc.bg) }}>
        {withImg ? <img src={ph!.src} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '44%', height: '100%', objectFit: 'cover' }} /> : null}
        <div style={{ position: 'absolute', left: '6%', top: '30%', width: '0.9cqw', height: '30%', background: hash(cc.bar) }} />
        <div style={{ position: 'absolute', left: '9.5%', right: withImg ? '50%' : '8%', top: '28%' }}>
          <div style={{ color: hash(cc.fg), fontSize: s.title.length > 40 || withImg ? '4.4cqw' : '5.8cqw', fontWeight: 800, lineHeight: 1.12 }}>{s.title}</div>
          {s.subtitle ? <div style={{ color: hash(cc.sub), fontSize: '2.2cqw', marginTop: '2cqw', lineHeight: 1.35 }}>{s.subtitle}</div> : null}
        </div>
        <div style={{ position: 'absolute', left: '9.5%', bottom: '5%', fontSize: '1.3cqw', color: hash(cc.sub) }}>Cylen AI</div>
      </div>
    );
  }
  const stats = s.blocks.filter(b => b.t === 'stats');
  const visuals = s.blocks.filter(b => b.t === 'chart' || b.t === 'table' || b.t === 'image');
  const texts = s.blocks.filter(b => !['stats', 'chart', 'table', 'image'].includes(b.t));
  const twoCol = visuals.length > 0 && texts.length > 0;
  return (
    <div style={{ ...base, background: hash(th.slideBg), padding: '4.2cqw 5.5cqw 5cqw', height: 'auto' }}>
      <div style={{ fontSize: s.title.length > 48 ? '2.6cqw' : '3.3cqw', fontWeight: 800, color: hash(th.ink), lineHeight: 1.15 }}>{s.title}</div>
      <div style={{ width: '6.5cqw', height: '0.5cqw', background: hash(th.accent), margin: '1.2cqw 0 2.4cqw' }} />
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
  const th = doc.theme;
  const u = (x: number) => `${(x * 13.5).toFixed(1)}px`;
  return (
    <div style={{ background: '#fff', borderRadius: 6, padding: '30px 26px 34px', boxShadow: '0 2px 14px rgba(0,0,0,.16)', color: '#1f2937', fontFamily: FONT_STACK[th.font] }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: hash(th.accent) }}>CYLEN AI · DOKUMEN</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: hash(th.ink), lineHeight: 1.15, margin: '8px 0 10px' }}>{doc.title}</div>
      <div style={{ width: 40, height: 3, background: hash(th.accent), marginBottom: 8 }} />
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      {(doc.blocks || []).map((b, i) => <BlockView key={i} b={b} u={u} />)}
    </div>
  );
};

const colLetter = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

const SheetView: React.FC<{ doc: ParsedDoc }> = ({ doc }) => {
  const [tab, setTab] = useState(0);
  const th = doc.theme;
  const sh = doc.sheets?.[Math.min(tab, (doc.sheets?.length || 1) - 1)];
  if (!sh) return null;
  const cols = Math.max(...sh.rows.map(r => r.length), 1);
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 14px rgba(0,0,0,.16)', overflow: 'hidden', color: '#1f2937', fontFamily: FONT_STACK[th.font] }}>
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
                  return <td key={ci} style={{ border: '1px solid #e1e4ea', padding: '7px 10px', whiteSpace: 'nowrap', fontWeight: ri === 0 ? 700 : 400, background: ri === 0 ? hash(th.soft) : '#fff', textAlign: ri > 0 && numeric(c) ? 'right' : 'left' }}>{c}</td>;
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

// ── 4. Popup preview (geser ke bawah untuk menutup) ──
export const DocPreviewSheet: React.FC<{ kind: DocKind; name: string; source: string; onClose: () => void }> = ({ kind, name, source, onClose }) => {
  const doc = useMemo(() => parseDoc(kind, name, source), [kind, name, source]);
  const [busy, setBusy] = useState<'dl' | 'share' | null>(null);
  const [toast, setToast] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  // File disiapkan di latar belakang begitu popup terbuka. Dengan begitu tombol Bagikan langsung bisa dipakai
  // (Chrome HP menolak share kalau pembuatan file terlalu lama setelah tap) dan Unduh terasa instan.
  const blobP = useRef<Promise<Blob | null> | null>(null);
  const blobReady = useRef(false);
  useEffect(() => {
    blobReady.current = false;
    const p = buildDocBlob(kind, name, source).then(b => { blobReady.current = true; return b; }, (e) => { console.error('[Cylen] gagal membuat file dokumen', e); blobReady.current = true; return null; });
    blobP.current = p;
  }, [kind, name, source]);

  // tutup dengan animasi singkat & halus (ikut posisi sheet saat ini)
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

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t); }, [toast]);

  const run = async (mode: 'dl' | 'share') => {
    if (busy) return;
    const wasReady = blobReady.current;
    setBusy(mode);
    try {
      let blob = await (blobP.current || buildDocBlob(kind, name, source));
      if (!blob) {
        // percobaan ulang sekali (mis. koneksi foto sempat putus)
        blob = await buildDocBlob(kind, name, source);
      }
      const fn = docFileName(kind, name);
      if (mode === 'dl') { downloadBlob(blob, fn); setToast('File diunduh'); }
      else if (!wasReady) {
        // menunggu file tadi bikin izin berbagi dari tap habis; file sudah siap, cukup tekan sekali lagi
        setToast('File sudah siap, tekan Bagikan sekali lagi');
      } else {
        const r = await shareBlob(blob, fn, kind, docTextOutline(doc));
        setToast(r === 'shared' ? 'Dibagikan' : r === 'text' ? 'HP belum bisa kirim file ini, ringkasan teks dibagikan' : 'File diunduh, silakan kirim dari folder unduhan');
      }
    } catch (e) {
      console.error('[Cylen] gagal membuat file dokumen', e);
      setToast('File belum bisa dibuat, coba lagi sebentar lagi');
    } finally { setBusy(null); }
  };

  const iconBtn: React.CSSProperties = { width: 38, height: 38, borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--sf)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <style>{DOC_CSS}</style>
      <div ref={bgRef} onClick={animateClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', animation: 'cy-fade .2s ease both' }} />
      <div ref={sheetRef} style={{ position: 'relative', width: '100%', maxWidth: 820, height: '92%', background: 'var(--bg)', color: 'var(--text)', borderRadius: '22px 22px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'cy-sheet-up .3s cubic-bezier(.2,.8,.2,1) backwards', boxShadow: '0 -8px 40px rgba(0,0,0,.25)', willChange: 'transform' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', flexShrink: 0 }}><div style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--bd)' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 12px 18px', borderBottom: '1px solid var(--bd)', flexShrink: 0, touchAction: 'none' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--mu)' }}>{DOC_LABEL[kind]} · {sourceStats(doc)}</div>
          </div>
          <button style={iconBtn} onClick={() => run('dl')} aria-label="Unduh" title="Unduh">{busy === 'dl' ? <Loader2 size={17} style={{ animation: 'cy-spin 1s linear infinite' }} /> : <Download size={17} />}</button>
          <button style={iconBtn} onClick={() => run('share')} aria-label="Bagikan" title="Bagikan">{busy === 'share' ? <Loader2 size={17} style={{ animation: 'cy-spin 1s linear infinite' }} /> : <Share2 size={17} />}</button>
          <button style={iconBtn} onClick={animateClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 14px 40px', background: 'var(--sf)' }}>
          <ThemeCtx.Provider value={doc.theme}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {doc.slides ? doc.slides.map((s, i) => <SlideView key={i} s={s} n={i + 1} />) : doc.sheets ? <SheetView doc={doc} /> : <PaperView doc={doc} />}
            </div>
          </ThemeCtx.Provider>
        </div>
        {toast && <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--bg)', padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, animation: 'cy-fade .2s ease both', maxWidth: '88%', textAlign: 'center' }}>{toast}</div>}
      </div>
    </div>,
    document.body,
  );
};

// ── 5. Pembungkus: loading → selesai → popup ──
export const DocCard: React.FC<{ kind: DocKind; name: string; source: string; live: boolean; inRow?: boolean }> = memo(({ kind, name, source, live, inRow }) => {
  const [open, setOpen] = useState(false);
  const wrap: React.CSSProperties = inRow
    ? { flex: '0 0 auto', width: CARD_SHAPE[kind].width.replace('88%', '300px').replace('84%', '290px').replace('68%', '235px'), scrollSnapAlign: 'start' }
    : { width: '100%', margin: '6px 0 10px' };
  // di dalam baris geser, lebar kartu dipatok (persen tidak berlaku); kartu mengisi pembungkusnya
  const inner = inRow ? { ['--cy-w' as any]: '100%' } : undefined;
  return (
    <div style={{ ...wrap, ...(inner || {}) }}>
      {live ? <LoadingCard kind={kind} name={name} source={source} fill={!!inRow} /> : <DoneCard kind={kind} name={name} source={source} fill={!!inRow} onOpen={() => setOpen(true)} />}
      {open && !live && <DocPreviewSheet kind={kind} name={name} source={source} onClose={() => setOpen(false)} />}
    </div>
  );
});

/** 1 dokumen → kartu biasa; 2-3 dokumen → baris yang bisa digeser kanan-kiri (kartu baru muncul di ujung dan otomatis digulir ke situ). */
export const DocCards: React.FC<{ docs: { kind: DocKind; name: string; source: string; live: boolean }[] }> = ({ docs }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(docs.length);
  useEffect(() => {
    const el = rowRef.current;
    if (el && docs.length > prevCount.current) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    prevCount.current = docs.length;
  }, [docs.length]);
  if (docs.length <= 1) return <>{docs.map((d, i) => <DocCard key={i} {...d} />)}</>;
  return (
    <div style={{ position: 'relative', width: '100%', margin: '6px 0 10px' }}>
      <style>{`.cy-dc-row::-webkit-scrollbar{display:none}`}</style>
      <div ref={rowRef} className="cy-dc-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2, overscrollBehaviorX: 'contain' }}>
        {docs.map((d, i) => <DocCard key={i} {...d} inRow />)}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--mu)', marginTop: 4 }}>{docs.length} dokumen · geser untuk melihat semuanya</div>
    </div>
  );
};
