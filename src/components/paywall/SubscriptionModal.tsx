import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Code,
  Video,
  Sparkles,
  Search,
  Mic,
  BarChart3,
  Users,
  Clock,
  SlidersHorizontal,
  Library,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Feature = { icon: React.ElementType; text: string };
type TierId = 'lite' | 'plus' | 'pro';

const LOGO_SRC = '/82374-removebg-preview.png';

// Jarak antar kartu (px). Harus sama dengan `gap-3` (12px) di baris kartu di bawah.
const GAP = 12;

const TIERS: {
  id: TierId;
  name: string;
  intro: string;
  big: string;
  sub: string;
  badge?: string;
  ai: Feature[];
  more: Feature[];
  weekly: number;
  monthly: number;
}[] = [
  {
    id: 'lite',
    name: 'Lite',
    intro: 'Paket perkenalan kami:',
    big: 'Dasar',
    sub: 'Semua kebutuhan AI harian dalam satu paket',
    ai: [
      { icon: MessageSquare, text: 'Isi percakapan lebih banyak' },
      { icon: ImageIcon, text: 'Pembuatan & edit gambar' },
      { icon: FileText, text: 'Pembuatan dokumen' },
      { icon: Code, text: 'Pembuatan kode' },
      { icon: Video, text: 'Pembuatan video terbatas' },
      { icon: Sparkles, text: 'Akses berbagai AI' },
      { icon: Mic, text: 'Percakapan suara AI' },
      { icon: BarChart3, text: 'Analisis file dan data' },
      { icon: Search, text: 'Pencarian dasar' },
    ],
    more: [
      { icon: BarChart3, text: 'Dasbor analitik' },
      { icon: Users, text: 'Mengundang teman berkolaborasi' },
      { icon: Clock, text: 'Otomatisasi tugas terjadwal' },
      { icon: SlidersHorizontal, text: 'Personalisasi pengalaman Cylen' },
      { icon: Library, text: 'Perpustakaan pribadi' },
    ],
    weekly: 129000,
    monthly: 349000,
  },
  {
    id: 'plus',
    name: 'Plus',
    intro: 'Semua di Lite, dan:',
    big: 'Lebih banyak',
    sub: 'penggunaan dibandingkan dengan Lite',
    badge: 'Paling populer',
    ai: [
      { icon: ImageIcon, text: 'Pembuatan & edit gambar' },
      { icon: Video, text: 'Pembuatan video lebih banyak' },
      { icon: FileText, text: 'Pembuatan dokumen lebih banyak' },
      { icon: Code, text: 'Pembuatan kode' },
      { icon: Sparkles, text: 'Akses berbagai AI' },
      { icon: Mic, text: 'Percakapan suara AI lebih lama' },
      { icon: BarChart3, text: 'Analisis file dan data lebih besar' },
      { icon: Zap, text: 'Respons lebih cepat' },
      { icon: Search, text: 'Akses ke riset mendalam' },
    ],
    more: [
      { icon: BarChart3, text: 'Dasbor analitik' },
      { icon: Users, text: 'Mengundang teman berkolaborasi' },
      { icon: Clock, text: 'Otomatisasi tugas terjadwal' },
    ],
    weekly: 199000,
    monthly: 549000,
  },
  {
    id: 'pro',
    name: 'Pro',
    intro: 'Semua di Plus, dan:',
    big: 'Jauh lebih banyak',
    sub: 'penggunaan dibandingkan dengan Plus',
    ai: [
      { icon: Sparkles, text: 'Model terbaru lebih dulu' },
      { icon: Zap, text: 'Akses prioritas saat waktu sibuk' },
      { icon: Zap, text: 'Respons dan pembuatan tercepat' },
      { icon: Library, text: 'Penyimpanan dan riwayat lebih besar' },
    ],
    more: [],
    weekly: 299000,
    monthly: 799000,
  },
];

const rp = (n: number) => 'Rp' + n.toLocaleString('id-ID');

// Lebar satu langkah geser = lebar kartu + jarak antar kartu.
const stepOf = (el: HTMLDivElement) => {
  const first = el.firstElementChild as HTMLElement | null;
  return first ? first.offsetWidth + GAP : 1;
};

// Semua warna diambil dari variabel tema App (--bg, --sf, --bd, --text, --mu, --ac, --at, --ib),
// jadi otomatis ikut Dark, Light, dan For You.
// ══════════════════════════════════════════════════════════════════════
//  VERSI DESKTOP: popup persegi panjang besar, kartu paket bisa digeser kiri-kanan
// ══════════════════════════════════════════════════════════════════════
const DesktopSubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [nav, setNav] = useState({ active: 0, canPrev: false, canNext: false, scrollable: false });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startLeft: 0, dx: 0, id: 0 });
  const suppressClick = useRef(false);

  // const handleUpgrade = async (planId: TierId) => {
  //   try {
  //     const res = await fetch('/api/checkout', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ planId, period }),
  //     });
  //     const data = await res.json();
  //     if (data.redirect_url) window.location.href = data.redirect_url;
  //     else alert('Gagal memuat pembayaran');
  //   } catch (error) {
  //     console.error(error);
  //     alert('Terjadi kesalahan sistem.');
  //   }
  // };

  // Baca posisi geser → perbarui titik indikator & tombol panah.
  const updateNav = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth > el.clientWidth + 2;
    const canPrev = el.scrollLeft > 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    const raw = Math.round(el.scrollLeft / stepOf(el));
    const active = atEnd && scrollable ? TIERS.length - 1 : Math.min(TIERS.length - 1, raw);
    setNav(prev =>
      prev.active === active && prev.canPrev === canPrev && prev.canNext === (scrollable && !atEnd) && prev.scrollable === scrollable
        ? prev
        : { active, canPrev, canNext: scrollable && !atEnd, scrollable }
    );
  }, []);

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(TIERS.length - 1, i));
    el.scrollTo({ left: idx * stepOf(el), behavior: 'smooth' });
  }, []);

  const move = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    goTo(Math.round(el.scrollLeft / stepOf(el)) + dir);
  }, [goTo]);

  // Saat dibuka: Esc = tutup, ← → = geser kartu, ukur ulang kalau ukuran jendela berubah.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    const el = scrollerRef.current;
    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateNav);
      ro.observe(el);
    }
    updateNav();
    return () => {
      window.removeEventListener('keydown', onKey);
      ro?.disconnect();
    };
  }, [isOpen, onClose, move, updateNav]);

  // ── Geser pakai mouse (drag). Sentuhan / trackpad sudah otomatis bisa geser. ──
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft, dx: 0, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    const el = scrollerRef.current;
    if (!el) return;
    d.dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(d.dx) > 5) {
      d.moved = true;
      el.style.scrollSnapType = 'none'; // matikan snap selama ditarik biar mulus
      el.style.cursor = 'grabbing';
      try { el.setPointerCapture(d.id); } catch { /* abaikan */ }
    }
    if (d.moved) el.scrollLeft = d.startLeft - d.dx;
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.down) return;
    d.down = false;
    const el = scrollerRef.current;
    if (!el || !d.moved) return;
    el.style.cursor = '';
    el.style.scrollSnapType = 'x mandatory';
    // tarik > 50px = pindah ke kartu sebelah, kurang dari itu balik ke kartu semula
    const base = Math.round(d.startLeft / stepOf(el));
    goTo(base + (d.dx < -50 ? 1 : d.dx > 50 ? -1 : 0));
    // klik yang menyusul setelah drag jangan sampai menekan tombol di dalam kartu
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  };

  if (!isOpen) return null;

  const periodLabel = period === 'weekly' ? 'minggu' : 'bulan';

  const renderList = (items: Feature[]) => (
    <ul className="list-none p-0 m-0">
      {items.map((f) => {
        const Icon = f.icon;
        return (
          <li key={f.text} className="flex items-start gap-3 py-[6px] text-[13.5px] leading-snug text-[var(--text)]">
            <Icon size={16} strokeWidth={1.8} className="flex-none mt-[1px] text-[var(--text)]" />
            <span>{f.text}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/55 font-sans"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <style>{`
        @keyframes sub-pop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .sub-scroller::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .sub-modal { animation: none !important; } }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih paket langganan Cylen"
        className="sub-modal relative flex flex-col w-full max-w-[880px] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)] rounded-[28px] bg-[var(--bg)] text-[var(--text)] shadow-2xl border border-[var(--bd)] overflow-hidden"
        style={{ animation: 'sub-pop .28s cubic-bezier(.2,.9,.2,1)' }}
      >
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-[var(--sf)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--ib)] transition-colors"
        >
          <X size={16} strokeWidth={2.4} />
        </button>

        {/* ── Kepala: logo, judul, pilihan periode ── */}
        <div className="flex-none flex flex-col items-center px-6 pt-7 pb-4">
          {/* Logo PNG dipakai sebagai mask, warnanya ngikut --text (putih di tema gelap, hitam di tema terang). */}
          <div
            role="img"
            aria-label="Cylen"
            style={{
              width: 34,
              height: 34,
              backgroundColor: 'var(--text)',
              WebkitMaskImage: `url(${LOGO_SRC})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskImage: `url(${LOGO_SRC})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
            }}
          />
          <h1 className="mt-3 text-center text-[24px] sm:text-[28px] font-semibold leading-tight tracking-tight">
            Satu langganan. Akses ke semuanya.
          </h1>

          <div role="tablist" aria-label="Periode tagihan" className="mt-4 flex bg-[var(--sf)] rounded-full p-[3px] gap-[2px]">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-[6px] rounded-full text-[13px] font-semibold transition-colors ${
                  period === p ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm' : 'text-[var(--mu)] hover:text-[var(--text)]'
                }`}
              >
                {p === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Isi: kartu paket yang bisa digeser kiri-kanan ── */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-3">
          <div className="relative">
            <div
              ref={scrollerRef}
              onScroll={updateNav}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); } }}
              className="sub-scroller flex overflow-x-auto select-none"
              style={{
                gap: GAP,
                padding: '4px 0 8px 20px',
                scrollSnapType: 'x mandatory',
                scrollPaddingLeft: 20,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                cursor: nav.scrollable ? 'grab' : 'default',
              }}
            >
              {TIERS.map((t) => {
                const price = period === 'weekly' ? t.weekly : t.monthly;
                const primary = !!t.badge;
                return (
                  <article
                    key={t.id}
                    className="flex-none w-[300px] max-w-[82%] rounded-[22px] bg-[var(--sf)] p-5 flex flex-col"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="flex items-center justify-between h-6">
                      <span className="text-[15px] font-semibold">{t.name}</span>
                      {t.badge && (
                        <span className="text-[11.5px] bg-[var(--ib)] rounded-full px-2.5 py-[3px] text-[var(--text)]">{t.badge}</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-[32px] font-semibold tracking-tight leading-none tabular-nums">{rp(price)}</span>
                      <span className="text-[13px] text-[var(--mu)]">/{periodLabel}</span>
                    </div>
                    <p className="mt-2 mb-4 text-[12.5px] text-[var(--mu)]">
                      {period === 'weekly' ? 'Fleksibel, ganti kapan saja' : 'Hemat dibanding mingguan'}
                    </p>

                    <button
                      // onClick={() => handleUpgrade(t.id)}  // checkout Midtrans dinonaktifkan sementara
                      className={`w-full py-3 rounded-full text-[14.5px] font-semibold transition-opacity hover:opacity-90 ${
                        primary ? 'bg-[var(--ac)] text-[var(--at)]' : 'bg-[var(--ib)] text-[var(--text)]'
                      }`}
                    >
                      Dapatkan {t.name}
                    </button>

                    <div className="mt-5 text-[12.5px] text-[var(--mu)]">{t.intro}</div>
                    <div className="mt-1 text-[22px] font-semibold leading-tight">{t.big}</div>
                    <div className="text-[13px] text-[var(--text)] mb-3">{t.sub}</div>

                    <div className="text-[12.5px] text-[var(--mu)] py-2 border-b border-[var(--bd)]">Manfaat AI</div>
                    {renderList(t.ai)}

                    {t.more.length > 0 && (
                      <>
                        <div className="text-[12.5px] text-[var(--mu)] py-2 border-b border-[var(--bd)] mt-2">Manfaat lainnya</div>
                        {renderList(t.more)}
                      </>
                    )}
                  </article>
                );
              })}
              {/* spacer: biar kartu terakhir ada napas di kanan */}
              <div className="flex-none w-2" aria-hidden="true" />
            </div>

            {nav.canPrev && (
              <button
                onClick={() => move(-1)}
                aria-label="Paket sebelumnya"
                className="absolute left-3 top-[42%] w-9 h-9 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronLeft size={18} strokeWidth={2.6} />
              </button>
            )}
            {nav.canNext && (
              <button
                onClick={() => move(1)}
                aria-label="Paket berikutnya"
                className="absolute right-3 top-[42%] w-9 h-9 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                <ChevronRight size={18} strokeWidth={2.6} />
              </button>
            )}
          </div>

          {nav.scrollable && (
            <div className="flex items-center justify-center gap-1.5 mt-2" role="tablist" aria-label="Pilih paket">
              {TIERS.map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={nav.active === i}
                  aria-label={`Lihat paket ${t.name}`}
                  onClick={() => goTo(i)}
                  className={`h-[6px] rounded-full transition-all ${nav.active === i ? 'w-5 bg-[var(--text)]' : 'w-[6px] bg-[var(--text)]/25 hover:bg-[var(--text)]/45'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Catatan harga ── */}
        <p className="flex-none px-6 py-3 text-center text-[11px] leading-snug text-[var(--mu)] border-t border-[var(--bd)]">
          Harga belum termasuk pajak. Diperpanjang otomatis hingga dibatalkan, batalkan setidaknya 24 jam sebelum perpanjangan.
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
//  VERSI HP: tampilan lama (layar penuh, tab Lite/Plus/Pro) — TIDAK diubah
// ══════════════════════════════════════════════════════════════════════
const MobileSubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [tierId, setTierId] = useState<'lite' | 'plus' | 'pro'>('plus');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  if (!isOpen) return null;

  const tier = TIERS.find((t) => t.id === tierId)!;
  const price = period === 'weekly' ? tier.weekly : tier.monthly;
  const periodLabel = period === 'weekly' ? 'minggu' : 'bulan';

  // const handleUpgrade = async () => {
  //   try {
  //     const res = await fetch('/api/checkout', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ planId: tier.id, period }),
  //     });
  //     const data = await res.json();
  //     if (data.redirect_url) window.location.href = data.redirect_url;
  //     else alert('Gagal memuat pembayaran');
  //   } catch (error) {
  //     console.error(error);
  //     alert('Terjadi kesalahan sistem.');
  //   }
  // };

  const renderList = (items: Feature[]) => (
    <ul className="list-none p-0 m-0">
      {items.map((f) => {
        const Icon = f.icon;
        return (
          <li key={f.text} className="flex items-center gap-3 py-[7px] text-[14px] text-[var(--text)]">
            <Icon size={17} strokeWidth={1.8} className="flex-none text-[var(--text)]" />
            <span>{f.text}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans overflow-hidden">
      <div className="flex-none relative flex items-center justify-center h-12 px-3">
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute left-3 w-8 h-8 rounded-full bg-[var(--sf)] text-[var(--text)] flex items-center justify-center hover:bg-[var(--ib)]"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col max-w-[520px] w-full mx-auto px-2 pb-3">
        <div className="flex flex-col items-center mt-6 mb-2">
          <div className="flex items-center gap-3 mb-3">
            {/* Logo PNG dipakai sebagai mask, warnanya ngikut --text:
                putih di tema gelap, hitam di tema terang. */}
            <div
              role="img"
              aria-label="Cylen"
              style={{
                width: 30,
                height: 30,
                backgroundColor: 'var(--text)',
                WebkitMaskImage: `url(${LOGO_SRC})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${LOGO_SRC})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
            <Users size={20} strokeWidth={2} className="text-[var(--text)]" />
            <Clock size={20} strokeWidth={2} className="text-[var(--text)]" />
          </div>
          <h1 className="text-center text-[20px] font-semibold leading-tight">
            Satu langganan.
            <br />
            Akses ke semuanya.
          </h1>
        </div>

        <div className="bg-[var(--sf)] rounded-[20px] p-2 flex-1 min-h-0 flex flex-col">
          <div className="flex bg-[var(--bg)] rounded-full p-[3px] gap-[2px] flex-none">
            {TIERS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === tierId}
                onClick={() => setTierId(t.id)}
                className={`flex-1 py-[7px] rounded-full text-[14px] font-semibold ${
                  t.id === tierId ? 'bg-[var(--ib)] text-[var(--text)]' : 'text-[var(--mu)]'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="px-2.5 pt-2 pb-1 flex-1 min-h-0 overflow-y-auto">
            <div className="flex justify-between items-center text-[13px] text-[var(--mu)]">
              <span>{tier.intro}</span>
              {tier.badge && (
                <span className="text-[11.5px] bg-[var(--ib)] rounded-full px-2.5 py-[3px] text-[var(--text)]">
                  {tier.badge}
                </span>
              )}
            </div>
            <div className="text-[24px] font-semibold mt-1">{tier.big}</div>
            <div className="text-[13px] mb-2">{tier.sub}</div>

            <div className="text-[12.5px] text-[var(--mu)] py-2 border-b border-[var(--bd)]">Manfaat AI</div>
            {renderList(tier.ai)}

            {tier.more.length > 0 && (
              <>
                <div className="text-[12.5px] text-[var(--mu)] py-2 border-b border-[var(--bd)] mt-1">
                  Manfaat lainnya
                </div>
                {renderList(tier.more)}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 flex-none">
          {(['weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`text-left rounded-2xl border-[1.5px] px-3 py-2.5 ${
                period === p ? 'border-[var(--text)] bg-[var(--cd)]' : 'border-[var(--bd)]'
              }`}
            >
              <div className="text-[18px] font-semibold">
                {rp(p === 'weekly' ? tier.weekly : tier.monthly)}{' '}
                <span className="text-[12.5px] font-normal text-[var(--mu)]">
                  {p === 'weekly' ? 'mingguan' : 'bulanan'}
                </span>
              </div>
              <div className="text-[12px] text-[var(--mu)] mt-0.5">
                {p === 'weekly' ? 'Fleksibel, ganti kapan saja' : 'Hemat dibanding mingguan'}
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[12.5px] text-[var(--mu)] mt-2 flex-none">
          Diperpanjang seharga {rp(price)} per {periodLabel}, batalkan kapan saja
        </p>

        <button
          // onClick={handleUpgrade}  // checkout Midtrans dinonaktifkan sementara
          className="flex-none mt-2 w-full py-3.5 bg-[var(--ac)] text-[var(--at)] rounded-full font-semibold text-[15.5px]"
        >
          Klaim penawaran sekarang
        </button>

        <p className="flex-none text-center text-[10.5px] text-[var(--mu)] mt-2 leading-snug">
          Harga belum termasuk pajak. Diperpanjang otomatis hingga dibatalkan, batalkan setidaknya 24 jam
          sebelum perpanjangan.
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
//  PEMILIH: rumus mobile/desktop SAMA PERSIS dengan isMobileDevice di App.tsx & main.tsx,
//  jadi halaman langganan selalu sejalan dengan versi App yang sedang dipakai.
// ══════════════════════════════════════════════════════════════════════
const isMobileDevice = (): boolean => {
  const touchScreen = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return [touchScreen, smallScreen, mobileUA].filter(Boolean).length >= 2;
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = (props) => {
  const [isDesktop] = useState(() => typeof window !== 'undefined' && !isMobileDevice());
  return isDesktop ? <DesktopSubscriptionModal {...props} /> : <MobileSubscriptionModal {...props} />;
};
