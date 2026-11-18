// ─────────────────────────────────────────────
// KEYBOARD SMOOTH v3 — src/lib/keyboard.ts
//
// PERUBAHAN v3:
//   Daftar pesan sekarang DIAM saat keyboard muncul. Yang bergerak cuma kolom ketik
//   ([data-kb-lift]) dan logo layar kosong ([data-kb-logo]).
//   Dihapus: padding bawah + scrollTo otomatis di [data-kb-pad] — itu yang bikin
//   isi chat ikut naik sebesar tinggi keyboard.
//
// CARA KERJA:
//   1. overlaysContent dinyalakan saat jari MENYENTUH kolom ketik (sebelum keyboard muncul) dan
//      baru dimatikan setelah keyboard benar-benar tertutup → layar tidak pernah di-resize.
//   2. Kolom ketik tetap diam di bawah sesaat setelah diketuk (OPEN_DELAY), lalu naik barengan
//      keyboard. Begitu Chrome melapor tinggi asli (geometrychange) → langsung dipakai.
//   3. Gerak per-frame cuma transform / translate / scale (tanpa hitung ulang tata letak).
//
// ATRIBUT:
//   [data-kb-smooth] → kolom ketik (textarea)
//   [data-kb-lift]   → naik sebesar tinggi keyboard  (dipasang di <footer> ChatInput & GroupChatInput)
//   [data-kb-logo]   → logo layar kosong (mengecil sedikit + naik sedikit)
//   [data-kb-pad]    → TIDAK dipakai lagi (aman dibiarkan / dihapus dari ChatPage)
// ─────────────────────────────────────────────
export const KB_TRANSITION = 'none';

const STORE_KEY = 'cylen_kb_h';

// ── Atur "rasa" di sini ──
const OPEN_DELAY = 70;        // ms kolom ketik diam setelah diketuk. Naik duluan dari keyboard → besarkan. Telat → kecilkan.
const OPEN_MS = 240;          // lama animasi naik
const CLOSE_MS = 190;         // lama animasi turun
const FIX_MS = 140;           // koreksi halus kalau tinggi keyboard asli beda dari tebakan
const BLUR_GRACE = 60;        // ms jeda sebelum turun (biar pindah antar kolom ketik tidak kedip)
const RELEASE_MS = 400;       // ms setelah keyboard tertutup baru overlaysContent dimatikan
const LOGO_MIN_SCALE = 0.8;   // logo mengecil maksimal ke 80%
const LOGO_RISE = 0.45;       // logo naik 45% dari tinggi keyboard
const LOGO_SHRINK = (1 - LOGO_MIN_SCALE) / 300;

const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic, mirip gerak keyboard Android

type Anim = { from: number; to: number; t0: number; ms: number; delay: number };

export function initSmoothKeyboard(): () => void {
  const vk = typeof navigator !== 'undefined' ? (navigator as any).virtualKeyboard : null;
  if (!vk) return () => {};

  const root = document.documentElement;

  let current = 0;                 // posisi yang sedang digambar (px)
  let anim: Anim | null = null;
  let raf = 0;
  let realH = 0;                   // tinggi keyboard asli (dari geometrychange)
  let prepared = false;
  let openIntentAt = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;

  let lifts: HTMLElement[] = [];
  let logos: HTMLElement[] = [];

  const smooth = (t: any): boolean => t instanceof Element && !!t.closest('[data-kb-smooth]');
  const isEditable = (t: any): boolean =>
    t instanceof HTMLElement && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
  const collect = (sel: string): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(el => el.getClientRects().length > 0); // skip yang display:none

  const vkHeight = (): number => {
    try { return Math.round(vk.boundingRect.height) || 0; } catch { return 0; }
  };

  const guess = (): number => {
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
    if (isEditable(a) && !smooth(a)) return; // keyboard lagi kebuka untuk kolom lain → jangan ganggu
    vk.overlaysContent = true;
  };
  const scheduleRelease = () => {
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (smooth(document.activeElement) || vkHeight() > 1 || current > 0.5) return;
      try { vk.overlaysContent = false; } catch { /* abaikan */ }
    }, RELEASE_MS);
  };

  // ── gambar satu frame ──
  const render = (px: number) => {
    current = px;
    const v = Math.max(0, px);
    const on = v > 0.5;

    // Kolom ketik naik. Daftar pesan sengaja TIDAK disentuh → layar chat diam.
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

  const settle = () => {
    prepared = false;
    if (current < 0.5) {
      for (const el of lifts) el.style.willChange = '';
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
    root.style.setProperty('--kb', `${to}px`); // dibaca editor layar penuh

    anim = { from: current, to, t0: performance.now(), ms, delay };
    raf = requestAnimationFrame(step);
  };

  // ── event ──
  // Jari menyentuh kolom ketik → nyalakan overlay SEKARANG, jauh sebelum keyboard muncul
  const onPointerDown = (e: Event) => { if (smooth(e.target)) holdOverlay(); };

  const onFocusIn = (e: FocusEvent) => {
    if (!smooth(e.target)) return;
    if (closeTimer) clearTimeout(closeTimer);
    holdOverlay(); // jaga-jaga kalau fokus datang tanpa sentuhan (autoFocus)
    openIntentAt = performance.now();
    const known = vkHeight();
    if (known > 120) realH = known;
    const h = known > 120 ? known : (realH || guess());
    if (!anim && Math.abs(h - current) < 2) return; // sudah naik (pindah antar kolom ketik)
    // Kolom ketik DIAM dulu OPEN_DELAY ms, baru naik barengan keyboard
    animateTo(h, OPEN_MS, known > 120 ? 0 : OPEN_DELAY);
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
      if (!smooth(document.activeElement)) return; // keyboard lagi menutup / untuk kolom lain
      realH = h;
      try { localStorage.setItem(STORE_KEY, String(h)); } catch { /* abaikan */ }
      if (releaseTimer) clearTimeout(releaseTimer);
      const waiting = !!anim && anim.delay > 0 && performance.now() - anim.t0 < anim.delay;
      if (waiting) {
        animateTo(h, OPEN_MS); // keyboard mulai muncul → mulai naik sekarang juga, pakai tinggi asli
      } else if (Math.abs((anim ? anim.to : current) - h) > 2) {
        animateTo(h, current < 1 ? OPEN_MS : FIX_MS); // koreksi halus ke tinggi asli
      }
    } else if (h < 1) {
      // laporan "0" yang basi dari penutupan sebelumnya → abaikan kalau baru saja mau buka
      if (smooth(document.activeElement) && performance.now() - openIntentAt < 600) return;
      if (anim ? anim.to > 0 : current > 0.5) animateTo(0, CLOSE_MS); // keyboard ditutup (mis. tombol Back)
      scheduleRelease();
    }
  };

  document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  vk.addEventListener('geometrychange', onGeometry);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    vk.removeEventListener('geometrychange', onGeometry);
    cancelAnimationFrame(raf);
    if (closeTimer) clearTimeout(closeTimer);
    if (releaseTimer) clearTimeout(releaseTimer);
    anim = null;
    lifts = collect('[data-kb-lift]');
    logos = collect('[data-kb-logo]');
    render(0);
    settle();
    root.style.setProperty('--kb', '0px');
    try { vk.overlaysContent = false; } catch { /* abaikan */ }
  };
}
