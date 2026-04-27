import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Cpu, Image as ImageIcon, Rocket, ShieldCheck, Infinity } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIERS = [
  { id: 'lite', name: 'Lite', title: 'Akses AI Dasar', icon: <Zap size={18}/>,
    monthly: 'Rp 49.000', yearly: 'Rp 490.000', save: '16%',
    features: ['Kecepatan respons standar', 'Akses model Cylen Basic', 'Batas 50 pesan / hari'] },
  { id: 'plus', name: 'Plus', title: 'Untuk Kebutuhan Harian', icon: <Cpu size={18}/>,
    monthly: 'Rp 119.000', yearly: 'Rp 1.190.000', save: '16%',
    features: ['Kecepatan respons 2x lebih cepat', 'Akses model Cylen Spark', 'Batas 200 pesan / hari', 'Akses Canvas Dasar'] },
  { id: 'pro', name: 'Pro', title: 'Kekuatan Penuh AI', icon: <Rocket size={18}/>,
    monthly: 'Rp 249.000', yearly: 'Rp 2.490.000', save: '16%',
    features: ['Kecepatan respons maksimal', 'Akses model Cylen Think (Reasoning)', 'Pesan tanpa batas (Unlimited)', 'Akses Image & Video Generation', 'Prioritas server saat jam sibuk'] },
  { id: 'ultra', name: 'Ultra', title: 'Akses Level CEO', icon: <Infinity size={18}/>,
    monthly: 'Rp 499.000', yearly: 'Rp 4.990.000', save: '16%',
    features: ['Semua fitur Pro', 'Akses Multi-Agent otomatis', 'Konteks memori super panjang (1M Token)', 'Keamanan Enkripsi Tingkat Tinggi', 'Akses API Pribadi'] }
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [activeTier, setActiveTier] = useState('pro');
  const [isYearly, setIsYearly] = useState(false);

  const currentPlan = TIERS.find(t => t.id === activeTier)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          // 🔥 ANIMASI BARU: Halus, dari tengah, tanpa ngedorong dari bawah layar
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} 
          className="fixed inset-0 z-[9999] bg-[#0a0a0a] text-white flex flex-col font-sans overflow-hidden"
          style={{ willChange: 'transform, opacity' }} // 🚀 Hardware Acceleration
        >
          {/* 🔥 OPTIMASI PERFORMA: Pake radial-gradient murni, ga pake blur (bikin HP ga ngelag) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0a0a] to-[#0a0a0a] pointer-events-none" />

          {/* HEADER */}
          <div className="relative p-5 z-10">
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10">
              <X size={26} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-40 relative z-10" style={{scrollbarWidth:'none'}}>
            {/* TITLE AREA */}
            <div className="text-center mt-2 mb-8">
              <h1 className="text-[32px] font-bold tracking-tight mb-2">
                Cylen <span className="font-light text-white/60">{currentPlan.name}</span>
              </h1>
              <p className="text-[15px] text-white/60 font-medium">{currentPlan.title}</p>
            </div>

            {/* 4 TIERS TOGGLE */}
            <div className="flex bg-white/5 p-1.5 rounded-full mx-auto w-full max-w-sm mb-10 overflow-x-auto border border-white/10 relative z-20">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setActiveTier(tier.id)}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-full text-[13px] font-bold transition-all whitespace-nowrap active:scale-95",
                    activeTier === tier.id ? "bg-[#1a1a1a] text-white shadow-lg border border-white/10" : "text-white/50 hover:text-white"
                  )}
                >
                  {tier.name}
                </button>
              ))}
            </div>

            {/* FEATURES LIST */}
            <div className="max-w-sm mx-auto flex flex-col gap-6 relative z-10">
              {currentPlan.features.map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  key={i} className="flex items-start gap-4"
                >
                  <div className="mt-0.5 text-white/80">{currentPlan.icon}</div>
                  <span className="text-[15px] font-medium text-white/90 leading-snug">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* BOTTOM PRICING FOOTER */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-12 pb-8 px-6 z-20">
            <div className="max-w-sm mx-auto flex gap-3 mb-6">
              {/* Monthly Box */}
              <button 
                onClick={() => setIsYearly(false)}
                className={cn("flex-1 p-4 rounded-[20px] border transition-all text-left active:scale-95", !isYearly ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent")}
              >
                <div className="text-[13px] text-white/60 font-medium mb-1">Monthly</div>
                <div className="text-[16px] font-bold">{currentPlan.monthly}<span className="text-[11px] text-white/40 font-normal">/mo</span></div>
              </button>

              {/* Yearly Box */}
              <button 
                onClick={() => setIsYearly(true)}
                className={cn("flex-1 p-4 rounded-[20px] border transition-all text-left relative overflow-hidden active:scale-95", isYearly ? "bg-white/10 border-white/20" : "bg-white/5 border-transparent")}
              >
                <div className="absolute top-0 right-0 bg-[#f97316] text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg tracking-wider">SAVE {currentPlan.save}</div>
                <div className="text-[13px] text-[#f97316] font-medium mb-1">Yearly</div>
                <div className="text-[16px] font-bold">{currentPlan.yearly}<span className="text-[11px] text-white/40 font-normal">/yr</span></div>
              </button>
            </div>

            <button className="w-full max-w-sm mx-auto block py-4 bg-white text-black rounded-full font-bold text-[16px] active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Upgrade to {currentPlan.name}
            </button>
            
            <div className="text-center mt-5 text-[11px] text-white/40 font-medium space-x-2">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
