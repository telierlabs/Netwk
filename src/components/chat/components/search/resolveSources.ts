// ─────────────────────────────────────────────
// RESOLVE SOURCES — src/components/chat/components/search/resolveSources.ts
// Minta server (/api/resolve-sources) mengikuti link redirect sumber Gemini dan
// mengambil judul + deskripsi artikelnya. Hasil di-cache (memori + localStorage)
// supaya popup sumber yang sama berikutnya langsung muncul tanpa menunggu.
// ─────────────────────────────────────────────

export interface ResolvedSource {
  source: string; // link redirect asli (kunci cache)
  url: string | null; // link artikel asli
  title: string | null;
  description: string | null;
  image: string | null; // gambar utama artikel (og:image)
  domain: string | null;
}

const LS_KEY = 'cylen-src-resolved-v2';
const MAX_ENTRIES = 300;
const BATCH = 12;

let memory: Record<string, ResolvedSource> | null = null;

function load(): Record<string, ResolvedSource> {
  if (memory) return memory;
  memory = {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) memory = JSON.parse(raw) || {};
  } catch {
    /* localStorage tidak tersedia / rusak → abaikan */
  }
  return memory!;
}

function save() {
  try {
    const m = load();
    const keys = Object.keys(m);
    if (keys.length > MAX_ENTRIES) keys.slice(0, keys.length - MAX_ENTRIES).forEach(k => delete m[k]);
    localStorage.setItem(LS_KEY, JSON.stringify(m));
  } catch {
    /* abaikan */
  }
}

export const getCachedSource = (raw: string): ResolvedSource | undefined => load()[raw];

export async function resolveSources(rawUrls: string[]): Promise<Record<string, ResolvedSource>> {
  const cache = load();
  const need = Array.from(new Set(rawUrls.filter(u => u && !cache[u])));

  if (need.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < need.length; i += BATCH) chunks.push(need.slice(i, i + BATCH));

    await Promise.all(
      chunks.map(async urls => {
        try {
          const res = await fetch('/api/resolve-sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls }),
          });
          if (!res.ok) return;
          const data = await res.json();
          for (const r of (data?.results || []) as ResolvedSource[]) {
            // Yang gagal total (tanpa url & judul) tidak di-cache, supaya dicoba lagi lain kali
            if (r && r.source && (r.url || r.title)) cache[r.source] = r;
          }
        } catch (e) {
          console.warn('[Cylen] Gagal mengambil judul sumber:', e);
        }
      }),
    );
    save();
  }

  const out: Record<string, ResolvedSource> = {};
  for (const u of rawUrls) if (cache[u]) out[u] = cache[u];
  return out;
}
