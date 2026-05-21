// ─────────────────────────────────────────────
// UTILS — src/components/chat/utils/index.ts
// ─────────────────────────────────────────────

/** Download a diagram element as PNG (falls back to SVG). */
export const downloadDiagramAsPng = async (el: HTMLElement, title: string) => {
  try {
    const mod = await import('html-to-image').catch(() => null);
    if (mod) {
      const dataUrl = await mod.toPng(el, { cacheBust: true, pixelRatio: 3, backgroundColor: '#ffffff' });
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
      a.href = dataUrl;
      a.click();
      return;
    }
    if (typeof (window as any).html2canvas !== 'undefined') {
      const canvas = await (window as any).html2canvas(el, { scale: 3, backgroundColor: '#ffffff', logging: false, useCORS: true });
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      return;
    }
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svgEl);
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = (title || 'diagram').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.svg';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.error('Download diagram failed:', err);
  }
};

/** Parse the optional file-link prefix from assistant message content. */
export const parseFileLink = (content: string) => {
  const fileMatch = content.match(/^\[(PDF|DOCS|EXCEL|PPT|EBOOK)_FILE: "(.*?)"\]\((.*?)\)\n\n([\s\S]*)$/);
  if (!fileMatch) return { fileLinkData: null, rest: content };
  const [, type, fileName, fileUrl, rest] = fileMatch;
  return { fileLinkData: { type, fileName, fileUrl }, rest };
};

/** Parse optional reply-quote prefix from user message content. */
export const parseReplyQuote = (content: string) => {
  const m = content.match(/^\[Membalas pesan: "(.*?)"\]\n\n([\s\S]*)$/);
  if (!m) return { replyText: null, actualContent: content };
  return { replyText: m[1], actualContent: m[2] };
};
