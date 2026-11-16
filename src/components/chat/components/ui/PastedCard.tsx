// ─────────────────────────────────────────────
// PASTED CARD — src/components/chat/components/ui/PastedCard.tsx
// Kartu "Konten yang ditempel" (seperti Claude):
//   • di kolom ketik  → kartu kecil dengan tombol X
//   • di pesan        → kartu yang sama (tanpa X)
//   • diketuk         → popup dari bawah berisi seluruh isi + tombol salin
// Warna dari variabel tema.
// ─────────────────────────────────────────────
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, X } from 'lucide-react';
import type { PastedBlock } from '../../../../lib/pasted';
import { langLabel } from '../../../../lib/codeCards';

const CSS = `
@keyframes cy-pc-bg { from { opacity: 0; } to { opacity: 1; } }
@keyframes cy-pc-up { from { transform: translateY(100%); } to { transform: none; } }
.cy-pc-list { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; max-width: 100%; }
.cy-pc-card { position: relative; flex: none; width: 150px; min-height: 104px; padding: 11px 12px 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; text-align: left; font: inherit; color: var(--text); background: var(--cd, var(--bg)); border: 1.5px solid var(--bd); border-radius: 18px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.cy-pc-card:active { transform: scale(.98); }
.cy-pc-badge { align-self: flex-start; padding: 2px 9px; border-radius: 8px; border: 1px solid var(--bd); background: var(--sf); color: var(--text); font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; font-weight: 600; letter-spacing: .02em; }
.cy-pc-name { font-size: 14.5px; font-weight: 600; line-height: 1.3; }
.cy-pc-x { position: absolute; top: 7px; right: 7px; width: 28px; height: 28px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--text); color: var(--bg); cursor: pointer; -webkit-tap-highlight-color: transparent; }
.cy-pc-bg { position: fixed; inset: 0; z-index: 430; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; justify-content: center; animation: cy-pc-bg .2s ease both; }
.cy-pc-sheet { width: 100%; max-width: 640px; height: 88dvh; display: flex; flex-direction: column; background: var(--bg); color: var(--text); border: 1px solid var(--bd); border-bottom: 0; border-radius: 26px 26px 0 0; animation: cy-pc-up .3s cubic-bezier(.2,.9,.3,1) both; }
.cy-pc-head { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; padding: 14px 12px 8px; }
.cy-pc-title { text-align: center; min-width: 0; }
.cy-pc-title b { display: block; font-size: 16px; font-weight: 650; }
.cy-pc-title span { font-size: 12px; color: var(--mu); }
.cy-pc-ib { width: 42px; height: 42px; border-radius: 50%; border: 0; background: transparent; color: var(--text); display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.cy-pc-ib:active { background: var(--sf); }
.cy-pc-body { flex: 1; margin: 0; overflow: auto; padding: 12px 18px calc(28px + env(safe-area-inset-bottom, 0px)); color: var(--text); white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; user-select: text; -webkit-user-select: text; }
.cy-pc-body.code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 13px; line-height: 1.6; }
.cy-pc-body.text { font-size: 15.5px; line-height: 1.7; }
.cy-pc-toast { position: absolute; left: 50%; bottom: calc(22px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 9px 16px; border-radius: 12px; background: var(--text); color: var(--bg); font-size: 13px; font-weight: 600; }
`;

async function copyText(text: string, el: HTMLElement | null): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* lanjut ke cara cadangan */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch { /* abaikan */ }
  if (el) { // terakhir: pilih teksnya supaya bisa disalin manual
    const r = document.createRange(); r.selectNodeContents(el);
    const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
  }
  return false;
}

const PastedSheet: React.FC<{ block: PastedBlock; onClose: () => void }> = ({ block, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const bodyRef = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lines = useMemo(() => block.text.split('\n').length, [block.text]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); if (timer.current) clearTimeout(timer.current); };
  }, [onClose]);

  const copy = async () => {
    const ok = await copyText(block.text, bodyRef.current);
    setCopied(ok);
    setNote(ok ? 'Tersalin' : 'Teks dipilih, salin manual');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setCopied(false); setNote(''); }, 2200);
  };

  return createPortal(
    <div className="cy-pc-bg" onClick={onClose} role="dialog" aria-modal="true" aria-label="Konten yang ditempel">
      <style>{CSS}</style>
      <div className="cy-pc-sheet" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div className="cy-pc-head">
          <button type="button" className="cy-pc-ib" onClick={onClose} aria-label="Tutup"><X size={22} strokeWidth={2} /></button>
          <div className="cy-pc-title"><b>Konten yang ditempel</b><span>{lines} baris · {block.text.length.toLocaleString('id-ID')} karakter</span></div>
          <button type="button" className="cy-pc-ib" onClick={copy} aria-label="Salin">{copied ? <Check size={21} strokeWidth={2.4} /> : <Copy size={21} strokeWidth={2} />}</button>
        </div>
        <pre ref={bodyRef} className={`cy-pc-body ${block.kind}`}>{block.text}</pre>
        {note && <div className="cy-pc-toast" role="status">{note}</div>}
      </div>
    </div>,
    document.body,
  );
};

export const PastedCard = memo(({ block, onRemove }: { block: PastedBlock; onRemove?: () => void }) => {
  const [open, setOpen] = useState(false);
  const badge = block.kind === 'code' ? (block.lang ? langLabel(block.lang).toUpperCase() : 'KODE') : 'TXT';
  return (
    <>
      <style>{CSS}</style>
      <div
        className="cy-pc-card"
        role="button"
        tabIndex={0}
        aria-label="Buka konten yang ditempel"
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
      >
        <span className="cy-pc-badge">{badge}</span>
        <span className="cy-pc-name">Konten yang ditempel</span>
        {onRemove && (
          <button type="button" className="cy-pc-x" aria-label="Hapus konten yang ditempel" onClick={e => { e.stopPropagation(); onRemove(); }}>
            <X size={15} strokeWidth={2.6} />
          </button>
        )}
      </div>
      {open && <PastedSheet block={block} onClose={() => setOpen(false)} />}
    </>
  );
});
PastedCard.displayName = 'PastedCard';

/** Kartu-kartu di dalam pesan (rata kanan untuk pesan kita). */
export const PastedList: React.FC<{ blocks: PastedBlock[]; align?: 'end' | 'start' }> = ({ blocks, align = 'end' }) => (
  <div className="cy-pc-list" style={{ justifyContent: align === 'end' ? 'flex-end' : 'flex-start' }}>
    {blocks.map((b, i) => <PastedCard key={i} block={b} />)}
  </div>
);
