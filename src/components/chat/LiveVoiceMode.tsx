import React, { useEffect, useState, useRef } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);

  // Update ref biar loop animasi selalu dapet status terbaru tanpa harus restart
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Simulasi ganti status otomatis (Hapus kalo udah ada API suara)
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev === 'listening' ? 'speaking' : 'listening');
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  // 🔥 CORE ENGINE: HTML5 CANVAS 3D FLUID SPHERE 🔥
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Bikin resolusi tajam buat layar HP (Retina Display)
    const size = 350;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = statusRef.current === 'speaking';
      
      // Transisi halus antar mode (Santai -> Liar)
      const targetSpeed = isSpeaking ? 0.04 : 0.015;
      const targetAmplitude = isSpeaking ? 25 : 8;
      const targetScale = isSpeaking ? 1.25 : 1;
      
      // Kecepatan putaran & gelombang
      time += targetSpeed;

      // Glow di tengah bola
      const cx = size / 2;
      const cy = size / 2;
      
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
      gradient.addColorStop(0, isSpeaking ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Gambar Garis 3D (Wireframe)
      ctx.lineWidth = 0.5; // Garis Ultra Thin
      ctx.strokeStyle = isSpeaking ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)';

      // Looping bikin struktur bola
      for (let i = 0; i < Math.PI * 2; i += 0.3) {
        ctx.beginPath();
        for (let j = 0; j < Math.PI * 2; j += 0.05) {
          
          // Basic 3D Sphere Math
          let x = Math.sin(j) * Math.cos(i);
          let y = Math.sin(j) * Math.sin(i);
          let z = Math.cos(j);

          // Rumus Distorsi Cairan Acak (Fluid Wave)
          let wave = Math.sin(x * 3 + time) * Math.cos(y * 3 + time) * Math.sin(z * 3 + time);
          
          // Radius jari-jari bola
          let r = 80 + (wave * targetAmplitude);
          r *= targetScale; // Perbesar kalau lagi ngomong

          // Rotasi bola biar kelihatan muter
          const rotTime = time * 0.2;
          const rotatedX = x * Math.cos(rotTime) - z * Math.sin(rotTime);
          const rotatedZ = x * Math.sin(rotTime) + z * Math.cos(rotTime);

          // Proyeksi 3D ke 2D Layar
          let px = cx + (rotatedX * r);
          let py = cy + (y * r * 0.6 + rotatedZ * r * 0.3); // Agak dimiringin

          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Cahaya Inti (Core)
      ctx.beginPath();
      ctx.arc(cx, cy, 30 * targetScale, 0, Math.PI * 2);
      ctx.fillStyle = isSpeaking ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
      ctx.shadowBlur = isSpeaking ? 40 : 20;
      ctx.shadowColor = 'white';

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none">
      
      {/* ⚠️ BAGIAN TENGAH: HTML5 CANVAS (Mulus, Ringan, Fluid) ⚠️ */}
      <div className="flex-1 flex items-center justify-center">
        <canvas 
          ref={canvasRef} 
          style={{ width: '350px', height: '350px' }}
          className="transition-opacity duration-500"
        />
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
