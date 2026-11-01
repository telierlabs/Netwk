// ─────────────────────────────────────────────
// PERMISSION SHEET — src/components/permissions/PermissionSheet.tsx
//
// Kartu izin Lokasi / Kamera / Mikrofon. Warna ikut tema app (var(--bg), var(--text)),
// jadi otomatis bagus di terang, gelap, cream, dll.
//
// CARA PAKAI (dari komponen mana pun):
//   const ok = await requestPermission('microphone');   // 'location' | 'camera' | 'microphone'
//   if (ok) { ...jalankan fiturnya... }
//
// Alur:
//   • Izin sudah diberikan  → langsung true, kartu TIDAK muncul
//   • Izin diblokir browser → kartu "diblokir" + cara mengaktifkan
//   • Belum pernah ditanya  → kartu pengantar → tombol Izinkan memicu popup asli browser
//
// <PermissionSheetHost /> cukup dipasang SEKALI di App.tsx.
// ─────────────────────────────────────────────
import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useT } from '../../lib/i18n';

export type PermissionKind = 'location' | 'camera' | 'microphone';
type Mode = 'ask' | 'blocked' | 'missing';

interface Pending {
  kind: PermissionKind;
  mode: Mode;
  busy: boolean;
  resolve: (ok: boolean) => void;
}

// ───────────── STORE (di luar React, bisa dipanggil dari mana saja) ─────────────
let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getPending = () => pending;

const LS_KEY = 'cylen_perm_';
const PERM_NAME: Record<PermissionKind, string> = { location: 'geolocation', camera: 'camera', microphone: 'microphone' };

const queryState = async (kind: PermissionKind): Promise<'granted' | 'denied' | 'prompt'> => {
  try {
    const r = await navigator.permissions.query({ name: PERM_NAME[kind] as PermissionName });
    return r.state as 'granted' | 'denied' | 'prompt';
  } catch {
    // Safari/iOS belum mendukung query untuk kamera & mikrofon → pakai catatan lokal
    return localStorage.getItem(LS_KEY + kind) === 'granted' ? 'granted' : 'prompt';
  }
};

const nativeRequest = async (kind: PermissionKind): Promise<'ok' | 'denied' | 'missing'> => {
  try {
    if (kind === 'location') {
      if (!navigator.geolocation) return 'missing';
      await new Promise<void>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(() => resolve(), reject, { timeout: 10000, maximumAge: 60000 })
      );
      return 'ok';
    }
    if (!navigator.mediaDevices?.getUserMedia) return 'missing';
    const stream = await navigator.mediaDevices.getUserMedia(kind === 'camera' ? { video: true } : { audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'ok';
  } catch (e: any) {
    if (kind === 'location') {
      // code 1 = ditolak. Timeout / posisi tidak tersedia = izin tetap sudah diberikan.
      return e?.code === 1 ? 'denied' : 'ok';
    }
    if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') return 'missing';
    return 'denied';
  }
};

export async function requestPermission(kind: PermissionKind): Promise<boolean> {
  const state = await queryState(kind);
  if (state === 'granted') return true;
  if (pending) return false; // sudah ada kartu yang tampil
  return new Promise<boolean>((resolve) => {
    pending = { kind, mode: state === 'denied' ? 'blocked' : 'ask', busy: false, resolve };
    emit();
  });
}

const close = (ok: boolean) => {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(ok);
};

const allow = async () => {
  if (!pending || pending.busy) return;
  const kind = pending.kind;
  pending = { ...pending, busy: true };
  emit();
  const result = await nativeRequest(kind);
  if (!pending) return;
  if (result === 'ok') {
    try { localStorage.setItem(LS_KEY + kind, 'granted'); } catch { /* abaikan */ }
    close(true);
  } else {
    pending = { ...pending, busy: false, mode: result === 'missing' ? 'missing' : 'blocked' };
    emit();
  }
};

const dismiss = () => { if (pending && !pending.busy) close(false); };

// ───────────── TEKS (ID / EN) ─────────────
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const COPY = {
  id: {
    names: { location: 'lokasi', camera: 'kamera', microphone: 'mikrofon' },
    ask: {
      location: { title: 'Izinkan Cylen mengakses lokasimu?', desc: 'Dipakai untuk jawaban yang lebih relevan, seperti cuaca dan tempat terdekat.', points: ['Hanya dipakai saat Cylen sedang dibuka', 'Bisa dimatikan kapan saja di pengaturan browser'] },
      camera: { title: 'Izinkan Cylen mengakses kamera?', desc: 'Ambil foto langsung di chat supaya Cylen bisa membaca gambar, dokumen, atau tulisan.', points: ['Hanya aktif saat kamu membuka kamera', 'Foto baru terkirim saat kamu menekan kirim'] },
      microphone: { title: 'Izinkan Cylen mengakses mikrofon?', desc: 'Bicara langsung ke Cylen lewat dikte dan mode suara, tanpa perlu mengetik.', points: ['Hanya aktif saat kamu menekan tombol suara', 'Bisa dimatikan kapan saja di pengaturan browser'] },
    },
    blockedTitle: (n: string) => `Akses ${n} diblokir`,
    blockedDesc: (n: string) => `Browser memblokir akses ${n} untuk Cylen. Buka pengaturan situs di browser, ubah izin ${n} menjadi Izinkan, lalu muat ulang halaman.`,
    missingTitle: (n: string) => `${cap(n)} tidak ditemukan`,
    missingDesc: (n: string) => `Cylen tidak menemukan ${n} di perangkat ini.`,
    allow: 'Izinkan', later: 'Nanti Saja', waiting: 'Menunggu izin…', ok: 'Mengerti',
  },
  en: {
    names: { location: 'location', camera: 'camera', microphone: 'microphone' },
    ask: {
      location: { title: 'Allow Cylen to access your location?', desc: 'Used for more relevant answers, like weather and places near you.', points: ['Only used while Cylen is open', 'Can be turned off anytime in browser settings'] },
      camera: { title: 'Allow Cylen to access your camera?', desc: 'Take photos right in the chat so Cylen can read images, documents, or handwriting.', points: ['Only active when you open the camera', 'Photos are sent only when you press send'] },
      microphone: { title: 'Allow Cylen to access your microphone?', desc: 'Talk to Cylen with dictation and voice mode, no typing needed.', points: ['Only active when you tap the voice button', 'Can be turned off anytime in browser settings'] },
    },
    blockedTitle: (n: string) => `${cap(n)} access is blocked`,
    blockedDesc: (n: string) => `Your browser is blocking ${n} access for Cylen. Open the site settings in your browser, set ${n} to Allow, then reload the page.`,
    missingTitle: (n: string) => `No ${n} found`,
    missingDesc: (n: string) => `Cylen couldn't find a ${n} on this device.`,
    allow: 'Allow', later: 'Not Now', waiting: 'Waiting for permission…', ok: 'Got it',
  },
};

// ───────────── IKON ─────────────
const Icon: React.FC<{ kind: PermissionKind }> = ({ kind }) => {
  const p = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (kind === 'location') return <svg {...p}><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>;
  if (kind === 'camera') return <svg {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
  return <svg {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="8" y1="22" x2="16" y2="22" /></svg>;
};

const Tick = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
);

// ───────────── KARTU ─────────────
export const PermissionSheetHost: React.FC = () => {
  const p = useSyncExternalStore(subscribe, getPending, () => null);
  const { lang } = useT();
  const L = (COPY as any)[lang] || COPY.id;

  // Tombol Esc menutup kartu
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!p]);

  if (typeof document === 'undefined') return null;

  const name: string = p ? L.names[p.kind] : '';
  const ask = p ? L.ask[p.kind] : null;
  const title = !p ? '' : p.mode === 'ask' ? ask.title : p.mode === 'blocked' ? L.blockedTitle(name) : L.missingTitle(name);
  const desc = !p ? '' : p.mode === 'ask' ? ask.desc : p.mode === 'blocked' ? L.blockedDesc(name) : L.missingDesc(name);

  return createPortal(
    <AnimatePresence>
      {p && (
        <motion.div
          key="perm-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={dismiss}
          className="fixed inset-0 z-[400] bg-black/45 backdrop-blur-[2px]"
        />
      )}
      {p && (
        <motion.div
          key="perm-wrap"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          className="fixed inset-0 z-[401] flex items-end md:items-center justify-center px-3 pointer-events-none"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', willChange: 'transform' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="perm-title"
            className="pointer-events-auto w-full max-w-[400px] rounded-[30px] bg-[var(--bg)]/90 backdrop-blur-xl border border-[var(--text)]/10 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] px-6 pt-3 pb-5 flex flex-col items-center text-center"
          >
            <style>{`@keyframes permPulse{0%{transform:scale(.92);opacity:.55}100%{transform:scale(1.55);opacity:0}}`}</style>
            <div className="md:hidden w-9 h-[5px] rounded-full bg-[var(--text)]/15 mb-5" />
            <div className="hidden md:block h-3" />

            {/* ikon */}
            <div className="relative w-[76px] h-[76px] rounded-[24px] bg-[var(--text)]/[0.06] border border-[var(--text)]/10 flex items-center justify-center text-[var(--text)]">
              {p.mode === 'ask' && (
                <span className="absolute inset-0 rounded-[24px] border border-[var(--text)]/30" style={{ animation: 'permPulse 2.4s ease-out infinite' }} />
              )}
              <Icon kind={p.kind} />
              {p.mode !== 'ask' && (
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--text)] text-[var(--bg)] border-2 border-[var(--bg)] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                </span>
              )}
            </div>

            <h2 id="perm-title" className="mt-5 text-[20px] font-bold tracking-tight text-[var(--text)] leading-snug">{title}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--mu)] max-w-[320px]">{desc}</p>

            {p.mode === 'ask' && (
              <ul className="w-full mt-5 rounded-2xl bg-[var(--text)]/[0.05] overflow-hidden text-left">
                {ask.points.map((txt: string, i: number) => (
                  <li key={i} className={`flex items-center gap-3 px-4 py-3 text-[13.5px] font-medium text-[var(--text)]/85 ${i > 0 ? 'border-t border-[var(--text)]/[0.08]' : ''}`}>
                    <span className="flex-shrink-0 text-[var(--text)]/70"><Tick /></span>
                    {txt}
                  </li>
                ))}
              </ul>
            )}

            {p.mode === 'ask' ? (
              <>
                <button
                  onClick={allow}
                  disabled={p.busy}
                  className="mt-6 w-full h-[52px] rounded-2xl bg-[var(--text)] text-[var(--bg)] text-[16px] font-bold active:scale-[0.98] transition-transform disabled:opacity-60 [-webkit-tap-highlight-color:transparent]"
                >
                  {p.busy ? L.waiting : L.allow}
                </button>
                <button
                  onClick={dismiss}
                  disabled={p.busy}
                  className="mt-1.5 w-full h-12 rounded-2xl text-[15.5px] font-semibold text-[var(--text)]/60 active:bg-[var(--text)]/6 disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
                >
                  {L.later}
                </button>
              </>
            ) : (
              <button
                onClick={dismiss}
                className="mt-6 w-full h-[52px] rounded-2xl bg-[var(--text)] text-[var(--bg)] text-[16px] font-bold active:scale-[0.98] transition-transform [-webkit-tap-highlight-color:transparent]"
              >
                {L.ok}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
