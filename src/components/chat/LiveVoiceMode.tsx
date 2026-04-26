import React, { useEffect, useState } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [isListening, setIsListening] = useState(true);

  // Simulasi efek AI lagi dengerin vs mikir/ngomong (DEMO VISUAL)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsListening(prev => !prev);
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#050505] overflow-hidden font-sans">
      <style>{`
        /* Animasi Bola Denyut (Breath Effect) */
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse-dot {
          0% { transform: scale(0.95); box-shadow: 0 0 30px rgba(157, 127, 234, 0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(157, 127, 234, 0.5), 0 0 100px rgba(157, 127, 234, 0.1); }
          100% { transform: scale(0.95); box-shadow: 0 0 30px rgba(157, 127, 234, 0.2); }
        }
        
        /* Animasi AI Mikir (Fluid Motion) */
        @keyframes wave {
          0% { transform: rotate(0deg); border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%; }
          100% { transform: rotate(360deg); border-radius: 60% 40% 40% 60% / 60% 60% 40% 40%; }
        }

        .orb-container {
          position: relative;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 1.5px solid var(--ac, #9d7fea);
          animation: pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .orb-core {
          position: absolute;
          width: 100px;
          height: 100px;
          background: #000;
          border-radius: 50%;
          z-index: 10;
          animation: pulse-dot 4s ease-in-out infinite;
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-speaking {
          position: absolute;
          width: 110px;
          height: 110px;
          background: linear-gradient(135deg, #9d7fea 0%, #4a2b91 100%);
          animation: wave 5s linear infinite;
          opacity: 0.6;
          z-index: 5;
          filter: blur(8px);
        }
      `}</style>

      {/* Bagian Tengah: Animasi Bola Energi */}
      <div className="flex-1 flex items-center justify-center">
        <div className="orb-container">
          {isListening && <div className="orb-ring" style={{ animationDelay: '0s' }}></div>}
          {isListening && <div className="orb-ring" style={{ animationDelay: '1.5s' }}></div>}
          
          {!isListening && <div className="orb-speaking"></div>}
          
          <div className="orb-core">
             {/* Logo Cylen (Opsional, dihapus juga gpp kalau mau polos hitam) */}
             <div className="text-white/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
             </div>
          </div>
        </div>
      </div>

      {/* Bagian Bawah: Kontrol ala Grok */}
      <div className="pb-8 px-6">
        
        {/* Teks Status */}
        <div className="flex items-center justify-center gap-2 mb-8">
           <div className="w-1.5 h-4 bg-white/50 rounded-full animate-pulse"></div>
           <span className="text-white/70 text-sm font-medium">Go ahead</span>
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
             className="px-5 py-2.5 rounded-full bg-white text-black font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
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
