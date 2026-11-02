// ─────────────────────────────────────────────
// CITATIONS — src/components/chat/components/search/citations.tsx
// Pil sumber kecil di akhir tiap paragraf jawaban (ala Grok):  [news.detik +2]
//
// Alur:
//   1) useChat menghitung `msg.citations` = [{ end, ids }] dari groundingSupports Gemini
//      (end = posisi akhir potongan teks di msg.content, ids = indeks sumber di msg.sources).
//      Disimpan TERPISAH dari teks, jadi copy / simpan / memori / riwayat ke AI tetap bersih.
//   2) ChatBubble membungkus teks dengan <CitationProvider>.
//   3) MarkdownRenderer memasang plugin remarkCitePills → satu <cite-pill> di akhir
//      tiap paragraf yang punya sitasi → dirender sebagai <CitePillView />.
//   4) Pil diketuk → popup sumber (SheetPanel) berisi sumber paragraf itu + tombol "Lihat semua".
//
// Kalau pesan tidak punya sitasi / sumber, semua ini tidak aktif dan tampilan tidak berubah.
// Warna seluruhnya dari variabel tema (--sf, --bd, --text, --mu).
// ─────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { SheetPanel } from './SourcesSheet';
import { SourceLike, getSourceDomain, looksLikeDomain } from './sourceUtils';

export interface Citation {
  end: number;
  ids: number[];
}

interface CitationCtx {
  sources: SourceLike[];
  citations: Citation[];
  /** Teks persis yang dipakai saat menghitung posisi sitasi. */
  text: string;
  open: (ids: number[]) => void;
}

export const CitationContext = createContext<CitationCtx | null>(null);

// ── Provider: menyimpan data sitasi + popup untuk pil ──
export const CitationProvider = ({
  sources,
  citations,
  text,
  children,
}: {
  sources?: SourceLike[];
  citations?: Citation[];
  text: string;
  children: React.ReactNode;
}) => {
  const [sheet, setSheet] = useState<{ open: boolean; ids?: number[] }>({ open: false });
  const open = useCallback((ids: number[]) => setSheet({ open: true, ids }), []);
  const close = useCallback(() => setSheet(s => ({ ...s, open: false })), []);

  const enabled = !!sources && sources.length > 0 && !!citations && citations.length > 0;

  const value = useMemo<CitationCtx | null>(
    () => (enabled ? { sources: sources!, citations: citations!, text, open } : null),
    [enabled, sources, citations, text, open],
  );

  return (
    <CitationContext.Provider value={value}>
      {children}
      {enabled &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {sheet.open && <SheetPanel sources={sources!} onlyIndices={sheet.ids} onClose={close} />}
          </AnimatePresence>,
          document.body,
        )}
    </CitationContext.Provider>
  );
};

// ── Plugin remark: tempel satu <cite-pill> di akhir tiap paragraf yang punya sitasi ──
// Posisi paragraf diambil dari mdast (position.offset) → harus dipakai pada teks yang sama persis.
export function remarkCitePills(citations: Citation[]) {
  return (tree: any) => {
    const paragraphs: any[] = [];
    const walk = (node: any) => {
      if (node.type === 'paragraph' && node.position?.start?.offset != null) paragraphs.push(node);
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
    if (paragraphs.length === 0) return;

    const byParagraph = new Map<any, Set<number>>();
    for (const c of citations || []) {
      const pos = Math.max(0, c.end - 1); // karakter terakhir potongan teks
      const target = paragraphs.find(
        p => p.position.start.offset <= pos && pos < p.position.end.offset,
      );
      if (!target) continue; // jatuh di judul / tabel / blok kode → tidak diberi pil
      const set = byParagraph.get(target) || new Set<number>();
      c.ids.forEach(i => set.add(i));
      byParagraph.set(target, set);
    }

    byParagraph.forEach((ids, paragraph) => {
      paragraph.children = paragraph.children || [];
      // Node tak dikenal + data.hName → jadi elemen <cite-pill>1,2,3</cite-pill> di hasil render
      paragraph.children.push({
        type: 'citePill',
        data: { hName: 'cite-pill' },
        children: [{ type: 'text', value: Array.from(ids).join(',') }],
      });
    });
  };
}

// ── Nama pendek domain: news.detik.com → news.detik, tempo.co.id → tempo ──
const SECOND_LEVEL = new Set(['co', 'or', 'go', 'ac', 'sch', 'web', 'net', 'org', 'com']);

function shortDomain(domain: string): string {
  const parts = domain.replace(/^www\./i, '').split('.');
  if (parts.length <= 1) return domain;
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (parts.length >= 3 && last.length === 2 && SECOND_LEVEL.has(prev)) return parts.slice(0, -2).join('.');
  return parts.slice(0, -1).join('.');
}

// ── Tampilan pil ──
export const CitePillView = ({ children }: { children?: React.ReactNode }) => {
  const ctx = useContext(CitationContext);
  const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
  const ids = raw
    .split(',')
    .map(n => parseInt(n, 10))
    .filter(n => !Number.isNaN(n));

  if (!ctx || ids.length === 0) return null;
  const first = ctx.sources[ids[0]];
  if (!first) return null;

  const domain = getSourceDomain(first);
  const label = looksLikeDomain(domain) ? shortDomain(domain) : 'Sumber';
  const extra = ids.length - 1;

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        ctx.open(ids);
      }}
      aria-label={`Lihat ${ids.length} sumber`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 6,
        padding: '1px 9px',
        borderRadius: 999,
        border: '1px solid var(--bd)',
        background: 'var(--sf)',
        color: 'var(--mu)',
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.6,
        letterSpacing: 0,
        whiteSpace: 'nowrap',
        verticalAlign: 'baseline',
        cursor: 'pointer',
      }}
    >
      {label}
      {extra > 0 ? ` +${extra}` : ''}
    </button>
  );
};
