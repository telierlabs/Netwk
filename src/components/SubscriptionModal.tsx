import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
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
    glow: 'from-sky-400/30 via-cyan-300/10 to-transparent',
    ring: 'ring-sky-400/30',
    accent: 'text-sky-300',
    monthly: 'Rp 49.000',
    yearly: 'Rp 490.000',
    save: '16%',
    features: ['Kecepatan respons standar', 'Akses model Cylen Basic', 'Batas 50 pesan / hari'],
  },
  {
    id: 'plus',
    name: 'Plus',
    title: 'Untuk Kebutuhan Harian',
    image: '/file_0000000083d072079e189d9810fa9a89.png',
    glow: 'from-violet-400/30 via-fuchsia-300/10 to-transparent',
    ring: 'ring-violet-400/30',
    accent: 'text-violet-300',
    monthly: 'Rp 119.000',
    yearly: 'Rp 1.190.000',
    save: '16%',
    features: [
      'Kecepatan respons 2x lebih cepat',
      'Akses model Cylen Spark',
      'Batas 200 pesan / hari',
      'Akses Canvas Dasar',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    title: 'Kekuatan Penuh AI',
    image: '/file_0000000088c07207a8f155a946885f08.png',
    glow: 'from-orange-400/30 via-amber-300/10 to-transparent',
    ring: 'ring-orange-400/30',
    accent: 'text-orange-300',
    monthly: 'Rp 249.000',
    yearly: 'Rp 2.490.000',
    save: '16%',
    features: [
      'Kecepatan respons maksimal',
      'Akses model Cylen Think (Reasoning)',
      'Pesan tanpa batas (Unlimited)',
      'Akses Image & Video Generation',
      'Prioritas server saat jam sibuk',
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
          {/* Ambient background glow, shifts hue with active tier */}
          <div
            className={cn(
              'absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] pointer-events-none transition-all duration-700',
              currentPlan.glow,
            )}
          />
          <div className="absolute inset-0 bg-[#08090c]/60 pointer-events-none" />

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
            {/* TITLE AREA */}
            <div className="text-center mt-1 mb-6">
              <h1 className="text-[30px] font-bold tracking-tight mb-1.5">
                Cylen <span className="font-light text-white/60">{currentPlan.name}</span>
              </h1>
              <p className="text-[14px] text-white/50 font-medium">{currentPlan.title}</p>
            </div>

            {/* SMALL PILL TOGGLE — 3 tiers only */}
            <div className="flex bg-white/[0.04] p-1 rounded-full mx-auto w-full max-w-[280px] mb-8 border border-white/10 relative z-20 backdrop-blur-md">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setActiveTier(tier.id)}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-[12.5px] font-semibold transition-all whitespace-nowrap active:scale-95',
                    activeTier === tier.id
                      ? 'bg-white/10 text-white shadow-sm border border-white/10'
                      : 'text-white/45 hover:text-white/70',
                  )}
                >
                  {tier.name}
                </button>
              ))}
            </div>

            {/* GLASS CARD */}
            <div className="max-w-sm mx-auto relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPlan.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'relative rounded-[28px] p-6 overflow-hidden',
                    'bg-white/[0.06] backdrop-blur-2xl',
                    'border border-white/[0.12]',
                    'shadow-[0_8px_40px_rgba(0,0,0,0.5)]',
                    'ring-1',
                    currentPlan.ring,
                  )}
                >
                  {/* inner sheen */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
                  <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/10 blur-3xl" />

                  <div className="relative flex items-center gap-4 mb-6">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0',
                        'border border-white/15 bg-white/5 shadow-inner',
                      )}
                    >
                      <img
                        src={currentPlan.image}
                        alt={`Cylen ${currentPlan.name}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className={cn('text-[15px] font-bold', currentPlan.accent)}>
                        Cylen {currentPlan.name}
                      </div>
                      <div className="text-[12.5px] text-white/50">{currentPlan.title}</div>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-4">
                    {currentPlan.features.map((feature, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.25 }}
                        key={feature}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={cn(
                            'mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                            'bg-white/10 border border-white/15',
                          )}
                        >
                          <Check size={12} strokeWidth={3} className={currentPlan.accent} />
                        </div>
                        <span className="text-[14px] font-medium text-white/85 leading-snug">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* BOTTOM PRICING FOOTER */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#08090c] via-[#08090c] to-transparent pt-12 pb-8 px-6 z-20 flex-shrink-0">
            <div className="max-w-sm mx-auto flex gap-3 mb-6">
              {/* Monthly Box */}
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  'flex-1 p-4 rounded-[20px] border transition-all text-left active:scale-95 backdrop-blur-md',
                  !isYearly ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5',
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
                  'flex-1 p-4 rounded-[20px] border transition-all text-left relative overflow-hidden active:scale-95 backdrop-blur-md',
                  isYearly ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5',
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
