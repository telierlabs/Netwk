import React, { useEffect, useState, useRef } from 'react';
import { Camera, Volume2, Mic, Settings, X } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);

  // Update ref biar loop animasi selalu dapet status terbaru
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Simulasi status (Hapus kalo udah ada API suara asli)
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev === 'listening' ? 'speaking' : 'listening');
    }, 4000); 
    return () => clearInterval(interval);
  }, []);

  // 🔥 CORE ENGINE: HTML5 CANVAS (BRIGHTER, ROUNDER, WAVY SPHERE) 🔥
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolusi tajam buat layar HP (Retina)
    const size = 350;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Bikin titik lebih BANYAK biar cerah & padat
    const particleCount = 4000; 
    const particles = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
      let y = 1 - (i / (particleCount - 1)) * 2; 
      let radius = Math.sqrt(1 - y * y); 
      let theta = (2 * Math.PI / goldenRatio) * i; 

      particles.push({
        baseX: Math.cos(theta) * radius,
        baseY: y,
        baseZ: Math.sin(theta) * radius,
        // Ukuran pixel LEBIH GEDE biar kelihatan terang
        r: Math.random() * 1.2 + 0.8 
      });
    }

    let time = 0;
    
    // State Animasi yang halus (Lerping)
    const animState = {
      scale: 1,
      amplitude: 0.08, // Kedalaman gelombang
      speed: 0.015,
      glowIntensity: 0.1
    };
    
    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = statusRef.current === 'speaking';
      
      // Target state berdasarkan status
      const targetState = isSpeaking ? {
        scale: 1.15, // Membesar elegan pas ngomong
        amplitude: 0.18, // Gelombang lebih aktif (tidak lebay)
        speed: 0.04, // Muter lebih cepet
        glowIntensity: 0.25 // Glow belakang makin terang
      } : {
        scale: 1.0,
        amplitude: 0.06,
        speed: 0.015,
        glowIntensity: 0.08
      };
      
      // LERP (Transisi Mulus, Nggak Kaget)
      const lerpFactor = 0.05; 
      animState.scale += (targetState.scale - animState.scale) * lerpFactor;
      animState.amplitude += (targetState.amplitude - animState.amplitude) * lerpFactor;
      animState.speed += (targetState.speed - animState.speed) * lerpFactor;
      animState.glowIntensity += (targetState.glowIntensity - animState.glowIntensity) * lerpFactor;

      time += animState.speed;

      const cx = size / 2;
      const cy = size / 2;
      
      // Glow di background (Biar terang)
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * animState.scale);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${animState.glowIntensity})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Mode Screen biar partikel numpuk jadi putih terang
      ctx.globalCompositeOperation = 'screen'; 

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        
        let x = p.baseX;
        let y = p.baseY;
        let z = p.baseZ;

        // Rumus Gelombang Stabil (Wavy Surface)
        let noise = Math.sin(x * 4 + time) * Math.cos(y * 4 - time) * Math.sin(z * 4 + time);
        
        // Base Radius 110px. Tetap bulat, tapi ada gelombang sesuai amplitude
        let rFactor = 110 * animState.scale * (1 + noise * animState.amplitude);

        // Rotasi 3D Murni (Ngga gepeng lagi!)
        const rotX = time * 0.2;
        const rotY = time * 0.3;
        
        // Puter sumbu X
        let y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
        let z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
        // Puter sumbu Y
        let x2 = x * Math.cos(rotY) + z1 * Math.sin(rotY);
        let z2 = -x * Math.sin(rotY) + z1 * Math.cos(rotY);

        // Posisi Layar
        let px = cx + x2 * rFactor;
        let py = cy + y1 * rFactor; 

        // Warna & Opasitas (Lebih Terang!)
        // z2 rentangnya dari -1 (belakang) sampe 1 (depan)
        let depthAlpha = (z2 + 1.5) / 2.5; 
        if (depthAlpha < 0.15) depthAlpha = 0.15; // Belakang ngga gelap total
        if (depthAlpha > 1) depthAlpha = 1;
        
        // Base alpha lebih terang pas ngomong
        let finalAlpha = depthAlpha * (isSpeaking ? 0.95 : 0.65);

        ctx.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
        ctx.fillRect(px, py, p.r, p.r); // Render titik
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none">
      
      {/* ⚠️ BAGIAN TENGAH: BOLA PLASMA 3D (Terang & Bulat Bergelombang) ⚠️ */}
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
             <X size={18} strokeWidth={3} />
             <span>Stop</span>
           </button>
        </div>

      </div>
    </div>
  );
};
