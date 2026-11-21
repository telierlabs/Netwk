// ─────────────────────────────────────────────
// KEYBOARD SMOOTH v4 — src/lib/keyboard.ts
//
// MASALAH v3:
//   1. Kolom ketik naik DULUAN pakai tinggi tebakan (OPEN_DELAY), keyboard menyusul → kelihatan
//      kolom ketik naik sendirian, tidak mulus.
//   2. Keyboard hilang tanpa focusout (tutup web / pindah app / tombol Back) → kolom ketik
//      tertinggal naik, dan waktu web dibuka lagi masih naik sendirian tanpa keyboard.
//
// PERBAIKAN v4:
//   • TIDAK ADA lagi tebakan. Kolom ketik baru naik setelah Chrome melapor tinggi keyboard asli
//     (geometrychange), dengan animasi pendek. Kalau keyboard tidak muncul, kolom ketik diam.
//   • Satu fungsi reconcile(): posisi kolom ketik SELALU dicocokkan dengan keadaan keyboard sebenarnya.
//     Dipanggil saat tab disembunyikan / dibuka lagi, pageshow, window focus/blur, dan oleh
//     watchdog tiap 400 ms selama kolom ketik masih terangkat.
//   • Saat halaman disembunyikan (tutup web / pindah app) kolom ketik langsung diturunkan tanpa animasi.
//
// ATRIBUT:
//   [data-kb-smooth] → kolom ketik (textarea)
//   [data-kb-lift]   → naik sebesar tinggi keyboard  (dipasang di <footer> ChatInput & GroupChatInput)
//   [data-kb-logo]   → logo layar kosong
// ─────────────────────────────────────────────
export const KB_TRANSITION = 'none';

const STORE_KEY = 'cylen_kb_h';

// ── Atur "rasa" di sini ──
const OPEN_MS = 200;          // lama animasi naik (setelah keyboard melapor tinggi asli)
const CLOSE_MS = 180;         // lama animasi turun
const FIX_MS = 120;           // koreksi halus kalau tinggi berubah
const BLUR_GRACE = 60;        // jeda sebelum turun (pindah antar kolom ketik tidak kedip)
const RELEASE_MS = 400;       // setelah keyboard tertutup baru overlaysContent dimatikan
const WATCHDOG_MS = 400;      // cek keadaan keyboard selama kolom ketik terangkat
const LOGO_MIN_SCALE = 0.8;
const LOGO_RISE = 0.45;
const LOGO_SHRINK = (1 - LOGO_MIN_SCALE) / 300;

// Mode prediksi (naik duluan pakai tinggi keyboard terakhir). Default MATI karena bikin
// kolom ketik "naik sendirian". Kalau mau dicoba lagi: PREDICT = true, atur PREDICT_DELAY.
const PREDICT = false;
const PREDICT_DELAY = 150;

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Anim = { from: number; to: number; t0: number; ms: number; delay: number };

export function initSmoothKeyboard(): () => void {
  const vk = typeof navigator !== 'undefined' ? (navigator as any).virtualKeyboard : null;
  if (!vk) return () => {};

  const root = document.documentElement;

  let current = 0;
  let anim: Anim | null = null;
  let raf = 0;
  let prepared = false;
  let openIntentAt = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let lastH = 0;

  let lifts: HTMLElement[] = [];
  let logos: HTMLElement[] = [];

  const smooth = (t: any): boolean => t instanceof Element && !!t.closest('[data-kb-smooth]');
  const isEditable = (t: any): boolean =>
    t instanceof HTMLElement && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  const collect = (sel: string): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(el => el.getClientRects().length > 0);

  const vkHeight = (): number => {
    try { return Math.round(vk.boundingRect.height) || 0; } catch { return 0; }
  };

  const cachedH = (): number => {
    if (lastH > 120) return lastH;
    try {
      const v = Number(localStorage.getItem(STORE_KEY));
      if (v > 120 && v < window.innerHeight * 0.7) return v;
    } catch { /* abaikan */ }
    return Math.round(window.innerHeight * 0.34);
  };

  // ── overlaysContent: nyalakan SEBELUM keyboard muncul, matikan SETELAH keyboard tertutup ──
  const holdOverlay = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    if (vk.overlaysContent) return;
    const a = document.activeElement;
    if (isEditable(a) && !smooth(a)) return;
    try { vk.overlaysContent = true; } catch { /* abaikan */ }
  };
  const scheduleRelease = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (vkHeight() > 1 || current > 0.5) return;
      if (smooth(document.activeElement) && vkHeight() > 1) return;
      try { vk.overlaysContent = false; } catch { /* abaikan */ }
    }, RELEASE_MS);
  };

  // ── gambar satu frame ──
  const render = (px: number) => {
    current = px;
    const v = Math.max(0, px);
    const on = v > 0.5;

    const ty = on ? `translate3d(0,${(-v).toFixed(2)}px,0)` : '';
    for (const el of lifts) el.style.transform = ty;

    if (logos.length) {
      const s = Math.max(LOGO_MIN_SCALE, 1 - v * LOGO_SHRINK);
      for (const el of logos) {
        if (on) {
          el.style.setProperty('scale', s.toFixed(3));
          el.style.setProperty('translate', `0 ${(-v * LOGO_RISE).toFixed(2)}px`);
        } else {
          el.style.removeProperty('scale');
          el.style.removeProperty('translate');
        }
      }
    }
  };

  const prepare = () => {
    lifts = collect('[data-kb-lift]');
    logos = collect('[data-kb-logo]');
    for (const el of lifts) el.style.willChange = 'transform';
    prepared = true;
  };

  const stopWatchdog = () => { if (watchdog) { clearInterval(watchdog); watchdog = undefined; } };

  const settle = () => {
    prepared = false;
    if (current < 0.5) {
      for (const el of lifts) el.style.willChange = '';
      stopWatchdog();
      scheduleRelease();
    }
  };

  const step = (now: number) => {
    const a = anim;
    if (!a) return;
    const t = Math.max(0, now - a.t0) - a.delay;
    if (t < 0) { raf = requestAnimationFrame(step); return; }
    const p = Math.min(1, t / a.ms);
    render(a.from + (a.to - a.from) * ease(p));
    if (p < 1) { raf = requestAnimationFrame(step); return; }
    anim = null;
    settle();
  };

  const animateTo = (to: number, ms: number, delay = 0) => {
    to = Math.max(0, Math.round(to));
    cancelAnimationFrame(raf);
    if (!anim && Math.abs(to - current) < 0.5) return;
    if (!prepared) prepare();
    root.style.setProperty('--kb', `${to}px`);
    anim = { from: current, to, t0: performance.now(), ms, delay };
    raf = requestAnimationFrame(step);
    if (to > 0) startWatchdog();
  };

  // Turunkan SEKARANG tanpa animasi (tab disembunyikan / keadaan sudah tidak sinkron)
  const hardReset = () => {
    cancelAnimationFrame(raf);
    anim = null;
    if (closeTimer) clearTimeout(closeTimer);
    lifts = collect('[data-kb-lift]');
    logos = collect('[data-kb-logo]');
    render(0);
    for (const el of lifts) el.style.willChange = '';
    prepared = false;
    root.style.setProperty('--kb', '0px');
    stopWatchdog();
    scheduleRelease();
  };

  // ── Cocokkan posisi kolom ketik dengan keadaan keyboard yang SEBENARNYA ──
  const reconcile = () => {
    const h = vkHeight();
    const focused = smooth(document.activeElement);
    const target = anim ? anim.to : current;

    if (h > 120 && focused) {
      lastH = h;
      if (Math.abs(target - h) > 2) animateTo(h, current < 1 ? OPEN_MS : FIX_MS);
      return;
    }
    // Keyboard tidak ada (atau bukan untuk kolom ketik kita) tapi kolom ketik masih terangkat → turunkan
    if (target > 0.5) {
      const predicting = PREDICT && anim && anim.to > 0 && performance.now() - openIntentAt < 700;
      if (predicting) return;
      animateTo(0, CLOSE_MS);
    }
    scheduleRelease();
  };

  function startWatchdog() {
    if (watchdog) return;
    watchdog = setInterval(() => {
      if (anim) return; // jangan ganggu animasi yang sedang jalan
      if (current < 0.5) { stopWatchdog(); return; }
      reconcile();
    }, WATCHDOG_MS);
  }

  // ── event ──
  const onPointerDown = (e: Event) => { if (smooth(e.target)) holdOverlay(); };

  const onFocusIn = (e: FocusEvent) => {
    if (!smooth(e.target)) return;
    if (closeTimer) clearTimeout(closeTimer);
    holdOverlay();
    openIntentAt = performance.now();
    const known = vkHeight();
    if (known > 120) {
      lastH = known;
      if (Math.abs((anim ? anim.to : current) - known) > 2) animateTo(known, OPEN_MS);
      return;
    }
    // Keyboard belum melapor. Default: kolom ketik DIAM, tunggu geometrychange.
    if (PREDICT) animateTo(cachedH(), OPEN_MS, PREDICT_DELAY);
  };

  const onFocusOut = (e: FocusEvent) => {
    if (!smooth(e.target) || smooth(e.relatedTarget as any)) return;
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (smooth(document.activeElement)) return;
      animateTo(0, CLOSE_MS);
      scheduleRelease();
    }, BLUR_GRACE);
  };

  const onGeometry = () => {
    const h = vkHeight();
    if (h > 120) {
      if (!smooth(document.activeElement)) return;
      lastH = h;
      try { localStorage.setItem(STORE_KEY, String(h)); } catch { /* abaikan */ }
      if (releaseTimer) clearTimeout(releaseTimer);
      const target = anim ? anim.to : current;
      if (Math.abs(target - h) > 2) animateTo(h, current < 1 ? OPEN_MS : FIX_MS);
    } else if (h < 1) {
      // keyboard ditutup (tombol Back / tombol tutup keyboard / pindah app)
      if (PREDICT && smooth(document.activeElement) && performance.now() - openIntentAt < 600) return;
      if ((anim ? anim.to : current) > 0.5) animateTo(0, CLOSE_MS);
      scheduleRelease();
    }
  };

  // Tab disembunyikan / app ditinggalkan → keyboard otomatis hilang tanpa focusout.
  // Langsung turunkan supaya waktu dibuka lagi tidak ada kolom ketik yang tertinggal naik.
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') { hardReset(); return; }
    // Kembali ke web: cocokkan ulang beberapa kali (keyboard bisa muncul lagi belakangan)
    reconcile();
    setTimeout(reconcile, 150);
    setTimeout(reconcile, 600);
  };
  const onPageHide = () => hardReset();
  const onPageShow = () => { reconcile(); setTimeout(reconcile, 300); };
  const onWinBlur = () => { if (document.visibilityState === 'hidden') hardReset(); };
  const onWinFocus = () => { reconcile(); setTimeout(reconcile, 300); };

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('blur', onWinBlur);
  window.addEventListener('focus', onWinFocus);
  vk.addEventListener('geometrychange', onGeometry);

  // Keadaan awal (mis. halaman dimuat ulang saat keyboard terbuka)
  setTimeout(reconcile, 300);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('blur', onWinBlur);
    window.removeEventListener('focus', onWinFocus);
    vk.removeEventListener('geometrychange', onGeometry);
    cancelAnimationFrame(raf);
    if (closeTimer) clearTimeout(closeTimer);
    if (releaseTimer) clearTimeout(releaseTimer);
    stopWatchdog();
    hardReset();
    try { vk.overlaysContent = false; } catch { /* abaikan */ }
  };
}
