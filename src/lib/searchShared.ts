// ─────────────────────────────────────────────
// SEARCH SHARED — src/lib/searchShared.ts
// Helper pencarian yang dipakai chat GRUP (sama persis dengan yang ada di useChat.ts untuk chat pribadi):
//   • buildCitations : bikin posisi pil sumber per paragraf dari groundingSupports Gemini
//   • hideImageSearchWhileStreaming : sembunyikan blok ```image-search yang belum selesai
// ─────────────────────────────────────────────
export interface Citation { end: number; ids: number[] }

export function buildCitations(text: string, supports: any[], chunkList: any[], uriToIndex: Map<string, number>): Citation[] {
  const out: Citation[] = [];
  const sorted = [...supports].sort((a, b) => (a?.segment?.startIndex ?? 0) - (b?.segment?.startIndex ?? 0));
  let cursor = 0;
  for (const sp of sorted) {
    const segText: string = sp?.segment?.text || '';
    const chunkIdx: number[] = Array.isArray(sp?.groundingChunkIndices) ? sp.groundingChunkIndices : [];
    if (!segText.trim() || chunkIdx.length === 0) continue;

    const ids = Array.from(new Set(
      chunkIdx
        .map(ci => { const uri = chunkList?.[ci]?.web?.uri; return uri ? uriToIndex.get(uri) : undefined; })
        .filter((n): n is number => typeof n === 'number'),
    ));
    if (ids.length === 0) continue;

    let pos = text.indexOf(segText, cursor);
    if (pos === -1) pos = text.indexOf(segText);
    if (pos === -1) continue;
    out.push({ end: Math.min(text.length, pos + segText.length), ids });
    cursor = Math.max(cursor, pos);
  }
  return out;
}

const IMG_FENCE = '```image-search';
export function hideImageSearchWhileStreaming(text: string): string {
  const idx = text.lastIndexOf(IMG_FENCE);
  if (idx !== -1) {
    const after = text.slice(idx + IMG_FENCE.length);
    if (!/\n```/.test(after)) return text.slice(0, idx).trimEnd();
    return text;
  }
  for (let len = Math.min(IMG_FENCE.length - 1, text.length); len > 0; len--) {
    if (text.endsWith(IMG_FENCE.slice(0, len))) return text.slice(0, text.length - len);
  }
  return text;
}

/**
 * Rapikan blok ```image-search yang ditulis model setengah jalan (menempel di akhir kalimat, tanpa penutup):
 *   "...daerah.```image-search Hari Pahlawan 2026"  →  blok utuh di baris sendiri.
 * Tanpa ini markdown menganggap sisa jawaban sebagai blok kode (kartu "TEXT" berisi seluruh teks).
 * final=false (saat streaming): hanya baris yang sudah selesai ditulis yang dirapikan.
 */
export function normalizeImageFence(text: string, final = true): string {
  const re = final
    ? /[ \t]*```image-search[ \t]*\n?([^\n`]*?)[ \t]*(?:\n?```)?(?=\n|$)/g
    : /[ \t]*```image-search[ \t]*\n?([^\n`]*?)[ \t]*(?:\n?```)?(?=\n)/g;
  return text.replace(re, (_m, q: string) => (q.trim() ? `\n\n\`\`\`image-search\n${q.trim()}\n\`\`\`\n\n` : ''));
}
