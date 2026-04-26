import React, { useEffect, useState } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  // Status Simulator: 'listening' | 'speaking'
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');

  // 🔥 SIMULATOR STATUS (DEMO): Ganti-ganti status otomatis (Hapus kalo udah ada API suara asli)
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev === 'listening' ? 'speaking' : 'listening');
    }, 4000); // Tiap 4 detik ganti mode
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#050505] overflow-hidden font-sans touch-none select-none">
      
      {/* ⚠️ SVG FILTER MAGIC (INI KUNCINYA CAIRAN ACAK!) ⚠️ */}
      <svg style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0 }}>
        <filter id="liquid">
          {/*feTurbulence: Bikin kebisingan acak biar element penyok-penyok */}
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="1">
            {/*feTurbulence Animation: Bikin penyokannya gerak meleleh */}
            <animate attributeName="baseFrequency" dur="10s" values="0.04;0.06;0.04" repeatCount="indefinite" />
          </feTurbulence>
          {/*feDisplacementMap: Terapin kebisingan tadi ke element asli biar penyoknya keliatan nyata */}
          <feDisplacementMap in="SourceGraphic" scale="25" />
        </filter>
      </svg>

      <style>{`
        /* ⚠️ KUMPULAN ANIMASI GPU ACCELERATED (60FPS) ⚠️ */

        /* Core Breath (Denyut Inti) */
        @keyframes pulse-core {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        /* Jitter Vibration (Getaran Mikrokosmis pas Ngomong) */
        @keyframes vibrate {
          0% { transform: translate(1px, 1px) scale(1.1); }
          10% { transform: translate(-2px, -1px) scale(1.12); }
          20% { transform: translate(-3px, 0px) scale(1.1); }
          30% { transform: translate(3px, 1px) scale(1.12); }
          40% { transform: translate(1px, -2px) scale(1.1); }
          50% { transform: translate(-1px, 2px) scale(1.12); }
          60% { transform: translate(-3px, 1px) scale(1.1); }
          70% { transform: translate(3px, 1px) scale(1.12); }
          80% { transform: translate(-1px, -1px) scale(1.1); }
          90% { transform: translate(1px, 2px) scale(1.12); }
          100% { transform: translate(1px, -1px) scale(1.1); }
        }

        /* ⚠️ STYLE ELEMENT ORB CAIRAN ⚠️ */
        .orb-container {
          position: relative;
          width: 250px;
          height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease-out;
        }

        /* Latar cahaya glow pudar (static) */
        .orb-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          filter: blur(50px);
        }

        /* Bola Cairan Utama (SVG FILTER DIAPPLY DI SINI!) */
        .orb-plasma {
          position: absolute;
          width: 130px;
          height: 130px;
          background: #ffffff; /* Base color is white */
          border-radius: 50%;
          filter: url(#liquid) blur(2px); /* TERAPIN EFEK CAIRAN ACAK & BLUR DI SINI */
          box-shadow: 0 0 20px rgba(255,255,255,0.7), inset 0 0 15px rgba(0,0,0,0.1);
          animation: pulse-core 4s infinite ease-in-out; /* Nafas pelan */
          transition: all 0.2s ease-out; /* Transisi halus mode status */
        }

        /* ⚠️ STATUS MODIFIER: SPEAKING (Chaotic Jitter Mode) ⚠️ */
        .status-speaking .orb-container {
          animation: vibrate 0.1s infinite linear; /* GETER KESETRUM PAS CYLEN NGOMONG */
        }
        .status-speaking .orb-plasma {
          animation: vibrate 0.1s infinite linear; /* PLASMA KESETRUM */
          box-shadow: 0 0 40px rgba(255,255,255,0.9);
        }
      `}</style>

      {/* Bagian Tengah: Animasi Bola Energi (Dynamic status class) */}
      <div className={`flex-1 flex items-center justify-center ${status === 'speaking' ? 'status-speaking' : 'status-listening'}`}>
        <div className="orb-container">
          <div className="orb-glow"></div>
          <div className="orb-plasma"></div>
        </div>
      </div>

      {/* Bagian Bawah: Kontrol ala Grok / Advanced Voice */}
      <div className="pb-8 px-6">
        
        {/* Teks Status */}
        <div className="flex flex-col items-center justify-center gap-1 mb-8">
           <div className={`text-white font-bold text-xl transition-all duration-500 ${status === 'speaking' ? 'opacity-100 scale-105' : 'opacity-80 scale-100'}`}>
              Cylen Voice
           </div>
           <div className="flex items-center gap-2 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-white animate-ping' : 'bg-white/50'}`}></div>
             <span className="text-white/60 text-sm font-medium tracking-wide">
               {status === 'speaking' ? 'Speaking...' : 'Listening...'}
             </span>
           </div>
        </div>

        {/* Jejeran 4 Tombol Kontrol (Kamera, Audio, Mic, Settings) */}
        <div className="flex items-center justify-between bg-white/5 rounded-3xl p-2 mb-4 border border-white/10">
          <button className="flex-1 py-3 flex items-center justify-center text-white/70 hover:text-white transition-colors">
             <Camera size={20} />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-white/70 hover:text-white transition-colors">
             <Volume2 size={20} />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-white/70 hover:text-white transition-colors">
             <Mic size={20} />
          </button>
          <button className="flex-1 py-3 flex items-center justify-center text-white/70 hover:text-white transition-colors">
             <Settings size={20} />
          </button>
        </div>

        {/* Baris Paling Bawah: Input Teks Semu & Tombol Stop */}
        <div className="flex items-center gap-3 bg-white/5 rounded-full p-2 border border-white/10">
           <div className="flex-1 flex items-center gap-2 px-3 text-white/40">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/><path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/></svg>
              <span className="text-sm">Ask anything</span>
           </div>
           
           {/* 🔥 TOMBOL STOP BUAT TUTUP LIVE VOICE */}
           <button 
             onClick={onClose}
             className="px-5 py-2.5 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
           >
             <span className="flex gap-0.5">
               <div className="w-1 h-1 bg-black rounded-full"></div>
               <div className="w-1 h-1 bg-black rounded-full"></div>
               <div className="w-1 h-1 bg-black rounded-full"></div>
               <div className="w-1 h-1 bg-black rounded-full"></div>
               <div className="w-1 h-1 bg-black rounded-full"></div>
             </span>
             <span>Stop</span>
           </button>
        </div>

      </div>
    </div>
  );
};
