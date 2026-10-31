// ─────────────────────────────────────────────
// SOURCE UTILS — src/components/chat/components/search/sourceUtils.ts
// Ambil domain & tampilan (judul/subjudul) dari sumber pencarian.
//
// Kenapa perlu: di useChat, link `vertexaisearch` diganti jadi link pencarian
// Google, jadi kalau domain diambil dari URL hasilnya selalu "google.com".
// Grounding Gemini biasanya mengisi `title` dengan nama domain, jadi domain
// diambil dari title dulu, baru URL.
// ─────────────────────────────────────────────

export interface SourceLike {
  title?: string;
  url?: string;
  srcType?: string;
}

const DOMAIN_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/i;

const normalize = (s: string) => s.trim().toLowerCase().replace(/^www\./, '');

export const looksLikeDomain = (s: string): boolean => DOMAIN_RE.test(normalize(s || ''));

export const isGoogleUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    return /(^|\.)google\.[a-z.]+$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

export function getSourceDomain(src: SourceLike): string {
  const title = src.title || '';

  // 1) title berisi domain (kasus umum grounding Gemini)
  if (looksLikeDomain(title)) return normalize(title);

  // 2) URL asli (kasus GNews / sumber manual), asal bukan link Google
  if (src.url && !isGoogleUrl(src.url)) {
    try {
      const host = normalize(new URL(src.url).hostname);
      if (host) return host;
    } catch {
      /* abaikan */
    }
  }

  // 3) judul bentuk "Judul artikel - kompas.com"
  const parts = title.split(/\s[-|–]\s/);
  const last = parts[parts.length - 1] || '';
  if (parts.length > 1 && looksLikeDomain(last)) return normalize(last);

  return title.trim() || 'sumber';
}

/** Domain unik, urutan kemunculan dipertahankan. */
export function uniqueDomains(sources: SourceLike[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sources || []) {
    const d = getSourceDomain(s);
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

/** Tampilan satu baris sumber di popup. */
export function getSourceView(src: SourceLike): { domain: string; title: string; subtitle: string } {
  const domain = getSourceDomain(src);
  const titleIsDomain = looksLikeDomain(src.title || '');
  return {
    domain,
    title: titleIsDomain || !src.title ? domain : src.title,
    subtitle: titleIsDomain ? (isGoogleUrl(src.url) ? 'Buka lewat pencarian Google' : '') : domain,
  };
}
