// ─────────────────────────────────────────────────────────────
// PENJAGA ERROR GLOBAL
// - Pengguna biasa TIDAK pernah melihat teks error mentah (layar merah).
//   Error kecil diganti toast singkat, error fatal diganti layar ramah
//   (lihat components/ErrorBoundary.tsx).
// - Mode debug khusus developer: buka  cylenai.com/?debug=1  sekali,
//   tetap aktif di HP itu sampai kamu buka  cylenai.com/?debug=0
// ─────────────────────────────────────────────────────────────

// Error gagal memuat potongan kode (biasanya karena HP masih pegang versi lama)
const CHUNK_RE = /Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i;
// Error jaringan biasa: nggak perlu mengganggu pengguna
const QUIET_RE = /Failed to fetch|NetworkError|Load failed|AbortError|ResizeObserver loop|The operation was aborted/i;

const DEBUG_KEY = 'cylen_debug';
const CHUNK_FLAG = 'cylen_chunk_reload';

export const isDebugMode = (): boolean => {
  try {
    const p = new URLSearchParams(window.location.search).get('debug');
    if (p === '1') localStorage.setItem(DEBUG_KEY, '1');
    if (p === '0') localStorage.removeItem(DEBUG_KEY);
    return localStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return false;
  }
};

const messageOf = (err: unknown): string =>
  String((err as any)?.message ?? err ?? '');

export const isChunkError = (err: unknown): boolean => CHUNK_RE.test(messageOf(err));

// Muat ulang otomatis SEKALI saja (biar nggak looping kalau masalahnya bukan di versi)
export function reloadOnceForChunkError(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_FLAG)) return false;
    sessionStorage.setItem(CHUNK_FLAG, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Obat kalau HP nyangkut di versi lama: hapus cache + service worker lalu muat ulang
export async function clearCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch {
    /* abaikan */
  }
  window.location.reload();
}

let lastToastAt = 0;
function softToast(text = 'Ada kendala kecil. Coba lagi ya.') {
  const now = Date.now();
  if (now - lastToastAt < 8000) return; // maksimal 1 toast per 8 detik
  lastToastAt = now;
  try {
    const el = document.createElement('div');
    el.textContent = text;
    el.setAttribute('role', 'status');
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '96px',
      transform: 'translateX(-50%)',
      background: 'var(--ac, #ffffff)',
      color: 'var(--at, #000000)',
      padding: '10px 20px',
      borderRadius: '999px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '99999',
      boxShadow: '0 10px 40px rgba(0,0,0,.25)',
      whiteSpace: 'nowrap',
      maxWidth: '90vw',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  } catch {
    /* abaikan */
  }
}

let installed = false;

export function installGlobalErrorGuards() {
  if (installed) return;
  installed = true;

  const debug = isDebugMode();

  // Dianggap "stabil" kalau app sudah jalan 15 detik tanpa muat ulang paksa
  setTimeout(() => {
    try { sessionStorage.removeItem(CHUNK_FLAG); } catch { /* abaikan */ }
  }, 15000);

  // Fase capture + stopImmediatePropagation = tampilan error mentah dari
  // skrip lain (mis. di index.html) ikut tertahan untuk pengguna biasa.
  window.addEventListener('error', (e: Event) => {
    if (!(e instanceof ErrorEvent)) return; // gagal muat gambar/file: abaikan
    const err = e.error || e.message;
    console.error('[Cylen] Error:', err);

    if (isChunkError(err) && reloadOnceForChunkError()) return;
    if (debug) return; // developer: biarkan tampilan error mentah muncul

    e.stopImmediatePropagation();
    const msg = messageOf(err);
    if (!msg || /^Script error\.?$/i.test(msg) || QUIET_RE.test(msg)) return;
    softToast();
  }, true);

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    console.error('[Cylen] Promise ditolak:', e.reason);

    if (isChunkError(e.reason) && reloadOnceForChunkError()) return;
    if (debug) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    if (QUIET_RE.test(messageOf(e.reason))) return;
    softToast();
  }, true);
}
