import React, { useEffect, useState } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');

  // Simulasi ganti status (Hapus kalo udah ada API suara asli)
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev === 'listening' ? 'speaking' : 'listening');
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none">
      
      <style>{`
        /* ⚠️ 3D SCENE SETUP ⚠️ */
        .orb-scene {
          perspective: 1000px; /* Bikin efek 3D dalem */
          width: 300px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-sphere {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* ⚠️ ULTRA THIN LINES (Rings) ⚠️ */
        .orb-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          /* Garis super tipis elegan */
          border: 1px solid rgba(255, 255, 255, 0.25);
          /* Bentuknya agak peyang biar pas diputer jadi gelombang acak */
          border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%;
          transition: all 0.5s ease;
        }

        /* 1. ANIMASI IDLE (Mendengarkan) - Putaran Pelan 3D */
        @keyframes spin-idle {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(360deg) rotateY(180deg) rotateZ(360deg); }
        }
        @keyframes morph-idle {
          0% { border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%; }
          50% { border-radius: 60% 40% 40% 60% / 40% 60% 60% 40%; }
          100% { border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%; }
        }

        /* 2. ANIMASI SPEAKING (Ngomong) - Muter Liar & Membesar */
        @keyframes spin-speak {
          0% { transform: scale(1.15) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          50% { transform: scale(1.3) rotateX(180deg) rotateY(-180deg) rotateZ(180deg); }
          100% { transform: scale(1.15) rotateX(360deg) rotateY(-360deg) rotateZ(360deg); }
        }
        @keyframes morph-speak {
          0% { border-radius: 30% 70% 70% 30% / 40% 40% 60% 60%; }
          50% { border-radius: 70% 30% 30% 70% / 60% 60% 40% 40%; }
          100% { border-radius: 30% 70% 70% 30% / 40% 40% 60% 60%; }
        }

        /* -- PENERAPAN STATUS LISTENING -- */
        .status-listening .orb-sphere {
          animation: spin-idle 25s infinite linear;
        }
        .status-listening .orb-ring {
          animation: morph-idle 8s infinite ease-in-out;
        }

        /* -- PENERAPAN STATUS SPEAKING -- */
        .status-speaking .orb-sphere {
          animation: spin-speak 6s infinite ease-in-out;
          filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.15));
        }
        .status-speaking .orb-ring {
          border: 1px solid rgba(255, 255, 255, 0.6); /* Garis jadi terang */
          animation: morph-speak 1.5s infinite ease-in-out;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* ⚠️ BAGIAN TENGAH: 3D WIREFRAME ORB ⚠️ */}
      <div className={`flex-1 flex items-center justify-center ${status === 'speaking' ? 'status-speaking' : 'status-listening'}`}>
        <div className="orb-scene">
          <div className="orb-sphere">
            {/* Generate 15 Cincin (Rings) numpuk di berbagai sudut 3D */}
            {[...Array(15)].map((_, i) => (
              <div 
                key={i} 
                className="orb-ring"
                style={{
                  // Rotasi dasar tiap cincin biar nyebar jadi bentuk bola
                  transform: `rotateZ(${i * 24}deg) rotateY(${i * 12}deg)`,
                  // Bikin gerakannya gak barengan persis (organik)
                  animationDelay: `${i * -0.5}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* BAGIAN BAWAH: UI CONTROL */}
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

        {/* Jejeran 4 Tombol Kontrol */}
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
