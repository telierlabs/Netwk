import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black overflow-hidden font-sans">
      <style>{`
        /* Animasi Bola Denyut (Breath Effect) */
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse-dot {
          0% { transform: scale(0.95); box-shadow: 0 0 30px rgba(157, 127, 234, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(157, 127, 234, 0.8), 0 0 100px rgba(157, 127, 234, 0.2); }
          100% { transform: scale(0.95); box-shadow: 0 0 30px rgba(157, 127, 234, 0.4); }
        }
        
        /* Animasi AI Mikir (Fluid Motion) */
        @keyframes wave {
          0% { transform: rotate(0deg); border-radius: 40% 60% 60% 40% / 40% 40% 60% 60%; }
          100% { transform: rotate(360deg); border-radius: 60% 40% 40% 60% / 60% 60% 40% 40%; }
        }

        .orb-container {
          position: relative;
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid var(--ac, #9d7fea); /* Warna aksen lo */
          animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .orb-core {
          position: absolute;
          width: 120px;
          height: 120px;
          background: #0a0a0a; /* Super Matte Black */
          border-radius: 50%;
          z-index: 10;
          animation: pulse-dot 3s ease-in-out infinite;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Saat AI Ngomong/Mikir, bentuknya berubah cair dan glowing */
        .orb-speaking {
          position: absolute;
          width: 130px;
          height: 130px;
          background: linear-gradient(135deg, #9d7fea 0%, #4a2b91 100%);
          animation: wave 4s linear infinite;
          opacity: 0.8;
          z-index: 5;
          filter: blur(10px);
        }
      `}</style>

      {/* Tombol Tutup (Balik ke Text Chat) */}
      <button 
        onClick={onClose}
        className="absolute top-8 left-8 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all z-50 backdrop-blur-lg border border-white/10"
      >
        <X size={24} />
      </button>

      {/* Teks Status di Atas */}
      <div className="absolute top-24 text-center z-50 px-10">
        <h2 className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase mb-2">
          {isListening ? 'Mendengarkan' : 'Cylen Memproses'}
        </h2>
        <p className="text-white text-xl font-light tracking-wide">
          {isListening ? 'Hawa ujan enak buat ngobrol...' : 'Menyiapkan respons terbaik...'}
        </p>
      </div>

      {/* Visualisasi BOLA ENERGI CYLEN (God Mode) */}
      <div className="orb-container">
        {/* Ring getar pas dengerin */}
        {isListening && <div className="orb-ring" style={{ animationDelay: '0s' }}></div>}
        {isListening && <div className="orb-ring" style={{ animationDelay: '1s' }}></div>}
        
        {/* Efek cair pas mikir */}
        {!isListening && <div className="orb-speaking"></div>}
        
        {/* Inti Bola */}
        <div className="orb-core">
          <img 
            src="/82374-removebg-preview.png" 
            alt="Cylen" 
            className="w-12 h-12 opacity-80"
          />
        </div>
      </div>

      {/* Kontrol di Bawah (Mic Mute dll) */}
      <div className="absolute bottom-16 flex gap-6 z-50">
        <button className="w-16 h-16 rounded-full bg-white/5 text-white/70 flex items-center justify-center border border-white/10 hover:bg-white/10 hover:text-white transition-all backdrop-blur-md">
          {/* Ikon Mic */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
        </button>
      </div>
    </div>
  );
};
