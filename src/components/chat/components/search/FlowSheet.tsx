// ─────────────────────────────────────────────
// FLOW SHEET — src/components/chat/components/search/FlowSheet.tsx
// Popup "Alur" dari bawah: urutan kerja AI (berpikir → mencari → membaca → menyusun) lengkap dengan
// pil kata kunci, kalimat temuan, dan pil sumber. Dibuka dari baris loading, dan dari baris
// "⚡ Spark 3 dtk >" / "💡 Thinking 22 dtk >" yang tetap ada di atas jawaban setelah selesai.
// Warna dari variabel tema.
//
// PERUBAHAN:
//   • ThoughtRow sekarang menampilkan: ikon mode + nama mode (Spark / Thinking) + durasi (N dtk) + ">"
//     Dulu cuma ikon + ">" saja tanpa teks.
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, Lightbulb } from 'lucide-react';
import { SourceLike, getSourceDomain, looksLikeDomain } from './sourceUtils';
import type { LoadingVariant } from '../../../../services/narratorService';
import { summarizeCodeFlow } from '../../../../lib/codeCards';
import { LOADING_CSS } from './LoadingIcons';

export interface FlowData {
  secs?: number;
  topic?: string;
  queries?: string[];
  notes?: string[];
  /** judul artikel / berita asli yang ditemukan (hanya judul) */
  titles?: string[];
  /** alur kode: kalimat pembuka AI + file yang dikerjakan */
  intro?: string;
  files?: { name: string; note: string; lang: string; lines: number; detail?: string; stages?: string[] }[];
  variant?: LoadingVariant | null;
  /** mode yang dipilih user di input: auto / spark / think */
  mode?: string;
}

export const favicon = (domain: string, sz = 32) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`;

export function flowDomains(sources: SourceLike[] | undefined, max = 12): { domain: string; url: string }[] {
  const out: { domain: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const s of sources || []) {
    let d = '';
    try { d = getSourceDomain(s) || ''; } catch { d = ''; }
    if (!d || !looksLikeDomain(d)) { try { d = new URL((s as any).url).hostname.replace(/^www\./, ''); } catch { d = ''; } }
    if (!d || /^google\./.test(d) || seen.has(d)) continue;
    seen.add(d);
    out.push({ domain: d, url: (s as any).url || '' });
    if (out.length >= max) break;
  }
  return out;
}

export const Chevron = ({ size = 16, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, ...style }}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export const FaviconStack = memo(({ sources, max = 3 }: { sources?: SourceLike[]; max?: number }) => {
  const list = flowDomains(sources, max);
  if (list.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
      {list.map((d, i) => (
        <img key={d.domain} src={favicon(d.domain)} alt="" width={20} height={20} referrerPolicy="no-referrer"
          style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--sf)', border: '2px solid var(--bg)', marginLeft: i === 0 ? 0 : -7, boxSizing: 'content-box' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
      ))}
    </span>
  );
});
FaviconStack.displayName = 'FaviconStack';

const SHEET_CSS = `
@keyframes cy-sh-bg { from { opacity: 0; } to { opacity: 1; } }
@keyframes cy-sh-up { from { transform: translateY(100%); } to { transform: none; } }
.cy-sh-bg { position: fixed; inset: 0; z-index: 400; background: rgba(0,0,0,.45); animation: cy-sh-bg .2s ease both; display: flex; align-items: flex-end; justify-content: center; }
.cy-sh { width: 100%; max-width: 560px; max-height: 82dvh; overflow-y: auto; background: var(--bg); color: var(--text); border: 1px solid var(--bd); border-bottom: 0;
  border-radius: 22px 22px 0 0; padding: 8px 20px calc(24px + env(safe-area-inset-bottom, 0px)); animation: cy-sh-up .28s cubic-bezier(.2,.9,.3,1) both; scrollbar-width: none; }
.cy-sh::-webkit-scrollbar { display: none; }
.cy-sh-pill { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 5px 11px; border-radius: 999px; background: var(--sf); border: 1px solid var(--bd); font-size: 12.5px; line-height: 1.3; color: var(--text); text-decoration: none; }
.cy-sh-pill > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

type Step = { key: string; title: string; body: React.ReactNode };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const FlowSheet = ({
  open, onClose, data, sources, stage, done, userPrompt,
}: {
  open: boolean; onClose: () => void; data: FlowData; sources?: SourceLike[];
  stage?: 'understand' | 'search' | 'read' | 'write'; done?: boolean; userPrompt?: string;
}) => {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const doms = flowDomains(sources);
  const queries = (data.queries || []).filter(Boolean);
  const notes = (data.notes || []).filter(Boolean);
  const topic = (data.topic || '').trim();
  const v = data.variant;
  const steps: Step[] = [];

  const codeFiles = v === 'code' ? (data.files || []) : [];
  if (v === 'code' && codeFiles.length > 0) {
    const lead = (data.intro || topic || '').trim();
    const seen = new Set<string>();
    const addStep = (key: string, title: string) => {
      const t = cap((title || '').trim());
      const k = t.toLowerCase();
      if (!t || seen.has(k)) return;
      seen.add(k);
      steps.push({ key, title: t, body: null });
    };
    if (lead) addStep('think', lead);
    notes.forEach((n, i) => addStep('n' + i, n));
    // Alur kode: HANYA judul (tanpa deskripsi) — titik, judul, garis, titik, judul ...
    codeFiles.forEach((f, i) => {
      addStep('file' + i, `Menulis ${f.name}`);
      (f.stages || []).filter(Boolean).forEach((t, k) => addStep(`file${i}s${k}`, t));
    });
  } else steps.push({
    key: 'think',
    title: v === 'code' ? 'Mengerjakan kode' : v === 'image' ? 'Mengamati gambar' : v === 'doc' ? 'Membaca dokumen' : 'Memahami permintaan',
    body: topic ? <p style={{ margin: 0 }}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</p> : null,
  });
  if (queries.length > 0) {
    steps.push({
      key: 'search',
      title: 'Mencari',
      body: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {queries.map(q => (
            <span key={q} className="cy-sh-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0, opacity: .6 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span>{q}</span>
            </span>
          ))}
        </div>
      ),
    });
  }
  const artTitles = (data.titles || []).filter(Boolean);
  if (artTitles.length > 0 && codeFiles.length === 0) {
    artTitles.slice(0, 8).forEach((t, i) => steps.push({ key: 'art' + i, title: t, body: null }));
  }
  if (doms.length > 0 || (notes.length > 0 && codeFiles.length === 0)) {
    steps.push({
      key: 'read',
      title: v === 'code' && doms.length === 0 ? 'Hasil' : 'Membaca sumber',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((n, i) => <p key={i} style={{ margin: 0 }}>{n.charAt(0).toUpperCase() + n.slice(1)}</p>)}
          {doms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {doms.map(d => (
                <a key={d.domain} className="cy-sh-pill" href={d.url || `https://${d.domain}`} target="_blank" rel="noopener noreferrer">
                  <img src={favicon(d.domain, 32)} alt="" width={14} height={14} referrerPolicy="no-referrer" style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0 }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  <span>{d.domain}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }
  if (done || stage === 'write') {
    steps.push({ key: 'write', title: done ? (v === 'code' && codeFiles.length ? `Selesai: ${codeFiles.length} file siap dibuka` : v === 'code' && !data.secs ? 'Kode selesai' : 'Jawaban selesai') : 'Menyusun jawaban', body: null });
  }

  return createPortal(
    <div className="cy-sh-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="Alur">
      <style>{LOADING_CSS}{SHEET_CSS}</style>
      <div className="cy-sh" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px' }}>
          <span style={{ width: 38, height: 4, borderRadius: 2, background: 'var(--bd)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Alur</div>
            {done && data.secs ? <div style={{ fontSize: 12.5, color: 'var(--mu)', marginTop: 2 }}>Berpikir selama {data.secs} detik</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup"
            style={{ width: 34, height: 34, borderRadius: 17, border: 0, background: 'var(--sf)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            const live = last && !done; // langkah yang sedang dikerjakan: judulnya berkilau seperti di baris loading
            return (
              <div key={s.key} style={{ display: 'flex', gap: 12, paddingBottom: last ? 0 : 18, position: 'relative' }}>
                <div style={{ position: 'relative', flexShrink: 0, width: 14 }}>
                  <span style={{ position: 'absolute', left: 2.5, top: 7, width: 9, height: 9, borderRadius: '50%', background: 'var(--text)', opacity: live ? 1 : .85, zIndex: 1 }} />
                  {!last && <span style={{ position: 'absolute', left: 6.25, top: 16, bottom: -7, width: 1.5, background: 'var(--bd)' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.55 }}>
                  <div className={live ? 'cy-fl-shim' : undefined} style={{ fontWeight: 650, marginBottom: s.body ? 6 : 0, overflowWrap: 'anywhere' }}>{s.title}</div>
                  {s.body && <div style={{ color: 'var(--text)', opacity: .82 }}>{s.body}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Baris kecil "⚡ Spark 3 dtk >" / "💡 Thinking 22 dtk >" di atas jawaban setelah AI selesai. */
// ikon mode (sama dengan menu di kotak input): Spark = petir, Thinking = bohlam
// Auto TIDAK pernah tampil sebagai label sendiri: cepat → Spark (petir), lama / mencari → Thinking (bohlam)
const ModeIcon: React.FC<{ kind: 'spark' | 'think' }> = ({ kind }) => {
  const I: any = kind === 'think' ? Lightbulb : Zap;
  return <I size={20} strokeWidth={2} aria-hidden />;
};

export const ThoughtRow = memo(({ flow, sources, content }: { flow: FlowData; sources?: SourceLike[]; content?: string }) => {
  const [open, setOpen] = useState(false);
  const data = useMemo<FlowData>(() => {
    if (flow.variant !== 'code' || !content) return flow;
    const c = summarizeCodeFlow(content);
    return c.files.length ? { ...flow, intro: c.intro, files: c.files } : flow;
  }, [flow, content]);
  const secs = Math.max(1, Math.round(flow.secs || 1));
  // Mode pilihan user dipakai apa adanya; kalau Auto → Thinking bila AI mencari / berpikir lama, selain itu Spark
  const kind: 'spark' | 'think' = flow.mode === 'spark' ? 'spark' : flow.mode === 'think' ? 'think'
    : ((flow.queries && flow.queries.length > 0) || secs >= 8 ? 'think' : 'spark');
  // Teks di samping ikon: nama mode + durasi, contoh "Spark 3 dtk" / "Thinking 22 dtk"
  const label = `${kind === 'think' ? 'Thinking' : 'Spark'} ${secs} dtk`;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Lihat alur — ${label}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 0 10px', padding: '4px 0 4px 2px', border: 0, background: 'none', color: 'var(--mu)', cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
        <ModeIcon kind={kind} />
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>{label}</span>
        <Chevron size={17} style={{ marginLeft: -2 }} />
      </button>
      <FlowSheet open={open} onClose={() => setOpen(false)} data={data} sources={sources} done />
    </>
  );
});
ThoughtRow.displayName = 'ThoughtRow';
