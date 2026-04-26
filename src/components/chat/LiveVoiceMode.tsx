import React, { useEffect, useState } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');

  // Simulasi AI dengerin vs ngomong
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev === 'listening' ? 'speaking' : 'listening');
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#050505] overflow-hidden font-sans">
      <style>{`
        /* Core Glow Effect */
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }

        /* Plasma Morphing - Bentuk bergelombang liar */
        @keyframes plasma-morph1 {
          0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg) scale(1); }
          50% { border-radius: 30% 70% 70% 40% / 50% 60% 30% 60%; transform: rotate(180deg) scale(1.05); }
          100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(360deg) scale(1); }
        }

        @keyframes plasma-morph2 {
          0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(0deg) scale(1); }
          50% { border-radius: 70% 30% 50% 50% / 30% 40% 50% 60%; transform: rotate(-180deg) scale(1.1); }
          100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: rotate(-360deg) scale(1); }
        }

        /* Getaran Cepat pas AI ngomong (Speaker Mode) */
        @keyframes jitter {
          0% { transform: translate(1px, 1px) rotate(0deg) scale(1.1); }
          10% { transform: translate(-1px, -2px) rotate(-1deg) scale(1.15); }
          20% { transform: translate(-3px, 0px) rotate(1deg) scale(1.1); }
          30% { transform: translate(3px, 2px) rotate(0deg) scale(1.15); }
          40% { transform: translate(1px, -1px) rotate(1deg) scale(1.1); }
          50% { transform: translate(-1px, 2px) rotate(-1deg) scale(1.15); }
          60% { transform: translate(-3px, 1px) rotate(0deg) scale(1.1); }
          70% { transform: translate(3px, 1px) rotate(-1deg) scale(1.15); }
          80% { transform: translate(-1px, -1px) rotate(1deg) scale(1.1); }
          90% { transform: translate(1px, 2px) rotate(0deg) scale(1.15); }
          100% { transform: translate(1px, -2px) rotate(-1deg) scale(1.1); }
        }

        .orb-container {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Latar cahaya pudar */
        .orb-glow {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          filter: blur(40px);
          transition: all 0.4s ease-out;
        }

        /* Lapisan 1: Abu-abu gelap */
        .orb-plasma-1 {
          position: absolute;
          width: 80%;
          height: 80%;
          background: rgba(150, 150, 150, 0.4);
          mix-blend-screen: screen;
          transition: all 0.5s ease-out;
        }

        /* Lapisan 2: Putih cerah */
        .orb-plasma-2 {
          position: absolute;
          width: 70%;
          height: 70%;
          background: rgba(255, 255, 255, 0.7);
          mix-blend-screen: screen;
          transition: all 0.5s ease-out;
        }

        /* Inti Bola */
        .orb-core {
          position: absolute;
          width: 45%;
          height: 45%;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255,255,255,0.8), inset 0 0 20px rgba(100,100,100,0.5);
          transition: all 0.3s ease-out;
        }

        /* -- MODIFIER: LISTENING (Santai) -- */
        .mode-listen .orb-glow { width: 140px; height: 140px; }
        .mode-listen .orb-plasma-1 { animation: plasma-morph2 10s infinite linear reverse; }
        .mode-listen .orb-plasma-2 { animation: plasma-morph1 8s infinite linear; }
        .mode-listen .orb-core { animation: pulse-glow 3s infinite ease-in-out; }

        /* -- MODIFIER: SPEAKING (Chaotic/Liar) -- */
        .mode-speak .orb-glow { width: 220px; height: 220px; opacity: 0.8; }
        .mode-speak .orb-plasma-1 { animation: plasma-morph2 2s infinite linear reverse; transform: scale(1.2); opacity: 0.8; }
        .mode-speak .orb-plasma-2 { animation: plasma-morph1 1.5s infinite linear; transform: scale(1.1); opacity: 0.9; }
        .mode-speak .orb-core { animation: pulse-glow 0.4s infinite ease-in-out; transform: scale(1.1); box-shadow: 0 0 60px rgba(255,255,255,1); }
        .mode-speak .orb-container { animation: jitter 0.2s infinite linear; } /* Ini yang bikin bola geter kesetrum */
      `}</style>

      {/* Bagian Tengah: Animasi Bola Energi */}
      <div className="flex-1 flex items-center justify-center">
        {/* Container Utama, ngikutin class "mode-listen" atau "mode-speak" */}
        <div className={`orb-container ${status === 'listening' ? 'mode-listen' : 'mode-speak'}`}>
          <div className="orb-glow"></div>
          <div className="orb-plasma-1"></div>
          <div className="orb-plasma-2"></div>
          <div className="orb-core"></div>
        </div>
      </div>

      {/* Bagian Bawah: Kontrol ala Grok / Apple Intelligence */}
      <div className="pb-8 px-6">
        
        {/* Teks Status yang dinamis */}
        <div className="flex flex-col items-center justify-center gap-1 mb-8">
           <div className={`text-white font-bold text-xl transition-all duration-500 ${status === 'speaking' ? 'opacity-100 scale-105' : 'opacity-80 scale-100'}`}>
              Cylen Voice
           </div>
           <div className="flex items-center gap-2 mt-1">
             <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-white shadow-[0_0_8px_white] animate-ping' : 'bg-white/50'}`}></div>
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
           
           {/* TOMBOL STOP */}
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
