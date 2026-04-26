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
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none">
      
      {/* ⚠️ SVG FILTER MAGIC (CAIRAN MULUS GERAK BEBAS - SEPERTI CYLENCANVAS) ⚠️ */}
      <svg style={{ visibility: 'hidden', position: 'absolute', width: 0, height: 0 }}>
        <filter id="liquid_smooth">
          {/*feTurbulence: Bikin kebisingan acak biar fluid meleleh */}
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="2">
            {/*feTurbulence Animation: Bikin penyokannya gerak meleleh halus tanpa batas acak */}
            <animate attributeName="baseFrequency" dur="15s" values="0.03;0.05;0.03" repeatCount="indefinite" />
          </feTurbulence>
          {/*feDisplacementMap: Terapin kebisingan tadi ke element asli biar penyoknya keliatan nyata */}
          <feDisplacementMap in="SourceGraphic" scale="15" />
        </filter>
      </svg>

      <style>{`
        /* ⚠️ KUMPULAN ANIMASI GPU ACCELERATED (60FPS) ⚠️ */

        /* Core Breath (Denyut Inti) */
        @keyframes pulse-core {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }

        /* Fluid Morphing (Mulus & Acak - Basis FEB) */
        @keyframes fluid-morph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: rotate(0deg); }
          50% { border-radius: 30% 70% 70% 40% / 50% 60% 30% 60%; transform: rotate(180deg); }
        }

        /* Flow Path (Jalur Aliran Partikel/Garis Banyak Mengalir Liar) */
        @keyframes particle-flow {
          0% { transform: translate(var(--startX), var(--startY)) rotate(var(--startRotate)) scale(1); }
          50% { transform: translate(var(--midX), var(--midY)) rotate(var(--midRotate)) scale(1.1); }
          100% { transform: translate(var(--endX), var(--endY)) rotate(var(--endRotate)) scale(1); }
        }

        /* Jitter Vibration (Getaran Mikrokosmis pas Ngomong - Elegan Geter) */
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

        /* ⚠️ STYLE ORB CAIRAN BASIS + PARTIKEL FLOW ⚠️ */
        .orb-scene {
          width: 300px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-container {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.2s ease-out;
        }

        /* Latar cahaya glow pudar */
        .orb-glow {
          position: absolute;
          width: 180px;
          height: 180px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          filter: blur(50px);
        }

        /* Bola Cairan Basis FEB (Mulus Gerak Tanpa Batas Acak - Seperti CylenCanvas) */
        .orb-fluid-base {
          position: absolute;
          width: 140px;
          height: 140px;
          background: #ffffff;
          border-radius: 50%;
          filter: url(#liquid_smooth) blur(2px); /* TERAPIN EFEK CAIRAN ACAK & BLUR DI SINI */
          box-shadow: 0 0 20px rgba(255,255,255,0.7), inset 0 0 15px rgba(0,0,0,0.1);
          animation: pulse-core 4s infinite ease-in-out;
          transition: all 0.2s ease-out;
        }

        /* Inti Bola */
        .orb-core {
          position: absolute;
          width: 40px;
          height: 40px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255,255,255,0.8);
          animation: pulse-core 4s infinite ease-in-out;
        }

        /* ⚠️ Partikel Flow (Garis Ultra-Thin / Titik Banyak Mengalir Bebas) ⚠️ */
        .particle-wrapper {
          position: absolute;
          width: 100%;
          height: 100%;
          mix-blend-screen: screen;
        }

        .orb-particle {
          position: absolute;
          /* Garis ultra-thin setipis helai rambut */
          width: var(--pWidth);
          height: var(--pHeight);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.6);
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease-out;
        }

        /* -- MODIFIER: LISTENING (Santai, Flow Mulus Muter Pelan) -- */
        .status-listening .orb-container {
          animation: none;
        }
        .status-listening .orb-fluid-base {
          animation: pulse-core 4s infinite ease-in-out, fluid-morph 10s infinite linear;
        }
        .status-listening .orb-particle {
          animation: particle-flow var(--durListen) var(--delayListen) infinite linear;
        }

        /* -- MODIFIER: SPEAKING (Chaotic Jitter Mode - Liar, Geter, Garis Muter) -- */
        .status-speaking .orb-container {
          animation: vibrate 0.1s infinite linear; /* GETER KESETRUM PAS CYLEN NGOMONG */
        }
        .status-speaking .orb-fluid-base {
          animation: vibrate 0.1s infinite linear;
          box-shadow: 0 0 40px rgba(255,255,255,0.9);
          transform: scale(1.1);
        }
        .status-speaking .orb-core {
          animation: vibrate 0.1s infinite linear;
          transform: scale(1.1);
          box-shadow: 0 0 50px rgba(255,255,255,1);
        }
        .status-speaking .orb-particle {
          animation: particle-flow var(--durSpeak) var(--delaySpeak) infinite linear; /* Garis/titik banyak muter liar */
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
          transform: scale(1.1);
        }
      `}</style>

      {/* Bagian Tengah: Animasi Bola Energi Cair + Banyak Garis Flow Acak (Mulus Gerak Bebas) */}
      <div className={`flex-1 flex items-center justify-center ${status === 'speaking' ? 'status-speaking' : 'status-listening'}`}>
        <div className="orb-scene">
          <div className="orb-container">
            <div className="orb-glow"></div>
            <div className="orb-fluid-base"></div>
            <div className="orb-core"></div>
            
            {/* 🔥 Wadah Partikel Flow (Garis/Titik Banyak Mengalir Bebas) 🔥 */}
            <div className="particle-wrapper">
              {[...Array(50)].map((_, i) => {
                // Generate path aliran partikel/garis acak dalam pusaran wadah FEB
                // Ini JALUR ALIRAN partikel, bukan cincin 3D diputar utuh
                const angle = i * 7.2;
                const radiusX = 65;
                const radiusY = 70;
                
                // Listening Flow: Santai, sedikit acak
                const dListen = 6 + Math.random() * 4;
                const delListen = i * -0.15;
                
                // Speaking Flow: Liar, cepat, acak
                const dSpeak = 1.5 + Math.random() * 1;
                const delSpeak = i * -0.05;
                
                // Jalur Aliran Acak (var CSS)
                const sX = radiusX * Math.cos(angle * Math.PI / 180);
                const sY = radiusY * Math.sin(angle * Math.PI / 180);
                const mX = (radiusX + 10) * Math.cos((angle + 120) * Math.PI / 180);
                const mY = (radiusY + 15) * Math.sin((angle + 120) * Math.PI / 180);
                const eX = radiusX * Math.cos((angle + 240) * Math.PI / 180);
                const eY = radiusY * Math.sin((angle + 240) * Math.PI / 180);

                const sR = angle;
                const mR = angle + 180;
                const eR = angle + 360;

                // Ukuran Garis Banyak/Titik Banyak (Ultra Thin)
                const pW = i % 2 === 0 ? "0.5px" : "1.5px"; // Garis ultra thin campur tipis
                const pH = i % 3 === 0 ? "15px" : "8px"; // Variasi panjang garis

                return (
                  <div 
                    key={i} 
                    className="orb-particle"
                    style={{
                      // var CSS buat jalur aliran acak partikel
                      '--durListen': `${dListen}s`,
                      '--delayListen': `${delListen}s`,
                      '--durSpeak': `${dSpeak}s`,
                      '--delaySpeak': `${delSpeak}s`,
                      '--startX': `${sX}px`,
                      '--startY': `${sY}px`,
                      '--midX': `${mX}px`,
                      '--midY': `${mY}px`,
                      '--endX': `${eX}px`,
                      '--endY': `${eY}px`,
                      '--startRotate': `${sR}deg`,
                      '--midRotate': `${mR}deg`,
                      '--endRotate': `${eR}deg`,
                      '--pWidth': pW,
                      '--pHeight': pH
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Kontrol ala Grok / Apple Intelligence */}
      <div className="pb-8 px-6 relative z-10 bg-gradient-to-t from-black via-black to-transparent">
        
        {/* Teks Status */}
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
        <div className="flex items-center justify-between bg-white/5 rounded-3xl p-2 mb-4 border border-white/10 backdrop-blur-md">
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
        <div className="flex items-center gap-3 bg-white/5 rounded-full p-2 border border-white/10 backdrop-blur-md">
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
