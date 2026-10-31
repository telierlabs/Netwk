import React, { useState } from 'react';
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
} from 'lucide-react';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Feature = { icon: React.ElementType; text: string };

const TIERS: {
  id: 'lite' | 'plus' | 'pro';
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

// Semua warna diambil dari variabel tema App (--bg, --sf, --bd, --text, --mu, --ac, --at, --ib),
// jadi otomatis ikut Dark, Light, dan For You.
export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
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
        <div className="flex items-center gap-2.5">
          <img src="/82374-removebg-preview.png" alt="Cylen" className="h-6 w-auto" />
          <Users size={16} strokeWidth={2} className="text-[var(--text)] ml-1" />
          <Clock size={16} strokeWidth={2} className="text-[var(--text)]" />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col max-w-[520px] w-full mx-auto px-2 pb-3">
        <div className="text-center mt-1 mb-2">
          <h1 className="text-[20px] font-semibold leading-tight mt-2">
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
