import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  Cpu,
  MessageSquare,
  Sparkles,
  LayoutGrid,
  Gauge,
  Brain,
  Infinity as InfinityIcon,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIERS = [
  {
    id: 'lite',
    name: 'Lite',
    title: 'Akses AI Dasar',
    image: '/file_00000000d25471fa9d798a8c4d22a242.png',
    monthly: 'Rp 49.000',
    yearly: 'Rp 490.000',
    save: '16%',
    features: [
      { icon: Zap, text: 'Kecepatan respons standar' },
      { icon: Cpu, text: 'Akses model Cylen Basic' },
      { icon: MessageSquare, text: 'Batas 50 pesan / hari' },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    title: 'Untuk Kebutuhan Harian',
    image: '/file_0000000083d072079e189d9810fa9a89.png',
    monthly: 'Rp 119.000',
    yearly: 'Rp 1.190.000',
    save: '16%',
    features: [
      { icon: Zap, text: 'Kecepatan respons 2x lebih cepat' },
      { icon: Sparkles, text: 'Akses model Cylen Spark' },
      { icon: MessageSquare, text: 'Batas 200 pesan / hari' },
      { icon: LayoutGrid, text: 'Akses Canvas Dasar' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    title: 'Kekuatan Penuh AI',
    image: '/file_0000000088c07207a8f155a946885f08.png',
    monthly: 'Rp 249.000',
    yearly: 'Rp 2.490.000',
    save: '16%',
    features: [
      { icon: Gauge, text: 'Kecepatan respons maksimal' },
      { icon: Brain, text: 'Akses model Cylen Think (Reasoning)' },
      { icon: InfinityIcon, text: 'Pesan tanpa batas (Unlimited)' },
      { icon: ImageIcon, text: 'Akses Image & Video Generation' },
      { icon: ShieldCheck, text: 'Prioritas server saat jam sibuk' },
    ],
  },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [activeTier, setActiveTier] = useState('pro');
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = TIERS.find((t) => t.id === activeTier)!;

  const handleUpgrade = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlan.id,
          isYearly: isYearly,
        }),
      });

      const data = await res.json();

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert('Gagal memuat pembayaran');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan sistem.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-[#08090c] text-white flex flex-col font-sans overflow-hidden"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* FOTO TIER = BACKGROUND SELURUH MODAL, bukan cuma di kartu */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentPlan.id}
              src={currentPlan.image}
              alt={`Cylen ${currentPlan.name}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>

          {/* Overlay gelap gradasi supaya teks tetap kebaca di atas foto */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black pointer-events-none" />

          {/* HEADER */}
          <div className="relative p-5 z-20 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              <X size={26} strokeWidth={2.5} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-6 pb-40 relative z-10"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* TITLE AREA — langsung di atas foto, bukan di dalam kotak */}
            <div className="text-center mt-1 mb-5">
              <h1 className="text-[30px] font-bold tracking-tight mb-1.5 drop-shadow-lg">
                Cylen <span className="font-light text-white/70">{currentPlan.name}</span>
              </h1>
              <p className="text-[14px] text-white/70 font-medium drop-shadow-md">
                {currentPlan.title}
              </p>
            </div>

            {/* PILL TOGGLE — kecil, kaca tipis */}
            <div className="flex bg-white/10 p-[3px] rounded-full mx-auto w-full max-w-[220px] mb-10 backdrop-blur-md relative z-20">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setActiveTier(tier.id)}
                  className={cn(
                    'flex-1 py-1 rounded-full text-[11.5px] font-semibold transition-all whitespace-nowrap active:scale-95',
                    activeTier === tier.id
                      ? 'bg-white/25 text-white shadow-sm'
                      : 'text-white/60 hover:text-white/85',
                  )}
                >
                  {tier.name}
                </button>
              ))}
            </div>

            {/* KOTAK KACA — cuma blur transparan, TIDAK ada foto di dalamnya. Foto tetap keliatan blur di baliknya */}
            <div className="max-w-sm mx-auto relative z-10 mb-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPlan.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-[28px] overflow-hidden p-6 backdrop-blur-2xl bg-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
                >
                  <div className="flex flex-col gap-4">
                    {currentPlan.features.map((feature, i) => {
                      const Icon = feature.icon;
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.25 }}
                          key={feature.text}
                          className="flex items-start gap-3"
                        >
                          <div className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white/15 backdrop-blur-sm">
                            <Icon size={15} strokeWidth={2} className="text-white" />
                          </div>
                          <span className="text-[14px] font-medium text-white/95 leading-snug pt-1.5 drop-shadow-sm">
                            {feature.text}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* BOTTOM PRICING FOOTER — solid gelap biar harga selalu kebaca, nutup foto di bagian bawah */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#08090c] via-[#08090c] to-transparent pt-10 pb-8 px-6 z-20 flex-shrink-0">
            <div className="max-w-sm mx-auto flex gap-3 mb-6">
              {/* Monthly Box */}
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  'flex-1 p-4 rounded-[20px] transition-all text-left active:scale-95 backdrop-blur-md',
                  !isYearly ? 'bg-white/10' : 'bg-white/5',
                )}
              >
                <div className="text-[13px] text-white/60 font-medium mb-1">Monthly</div>
                <div className="text-[16px] font-bold">
                  {currentPlan.monthly}
                  <span className="text-[11px] text-white/40 font-normal">/mo</span>
                </div>
              </button>

              {/* Yearly Box */}
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  'flex-1 p-4 rounded-[20px] transition-all text-left relative overflow-hidden active:scale-95 backdrop-blur-md',
                  isYearly ? 'bg-white/10' : 'bg-white/5',
                )}
              >
                <div className="absolute top-0 right-0 bg-[#f97316] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-wider">
                  SAVE {currentPlan.save}
                </div>
                <div className="text-[13px] text-[#f97316] font-medium mb-1">Yearly</div>
                <div className="text-[16px] font-bold">
                  {currentPlan.yearly}
                  <span className="text-[11px] text-white/40 font-normal">/yr</span>
                </div>
              </button>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="w-full max-w-sm mx-auto flex justify-center py-4 bg-white text-black rounded-full font-bold text-[16px] active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-50"
            >
              {isProcessing ? 'Memproses...' : `Upgrade to ${currentPlan.name}`}
            </button>

            <div className="text-center mt-5 text-[11px] text-white/40 font-medium space-x-2">
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
