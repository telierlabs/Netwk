import React, { useEffect, useState, useRef } from 'react';
import { Camera, Volume2, Mic, Settings } from 'lucide-react';

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

  // 🔥 CORE ENGINE: HTML5 CANVAS (DENSE PARTICLE PLASMA SPHERE WITH LERP) 🔥
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

    // Pre-generate partikel pada unit sphere (Fibonacci Sphere untuk distribusi rata)
    const particleCount = 2500; // Jumlah banyak buat tekstur padat
    const particles = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
      let y = 1 - (i / (particleCount - 1)) * 2; // y goes from 1 to -1
      let radius = Math.sqrt(1 - y * y); // radius at y
      let theta = (2 * Math.PI / goldenRatio) * i; // golden angle increment

      particles.push({
        baseX: Math.cos(theta) * radius,
        baseY: y,
        baseZ: Math.sin(theta) * radius,
        r: Math.random() * 0.5 + 0.2 // Ukuran ultra thin pixel (random 0.2px - 0.7px)
      });
    }

    let time = 0;
    
    // State Animasi yang halus (Lerping)
    const animState = {
      scale: 1,
      amplitude: 0.1, // Bergelombang dikit (cairan mulus)
      speed: 0.015,
      glowIntensity: 0.05
    };
    
    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = statusRef.current === 'speaking';
      
      // Target state berdasarkan status (Listening vs Speaking)
      const targetState = isSpeaking ? {
        scale: 1.15, // Gede dikit pas ngomong (ngga kaget)
        amplitude: 0.25, // Bergelombang liar (geter elegan)
        speed: 0.04,
        glowIntensity: 0.15
      } : {
        scale: 1.0,
        amplitude: 0.08,
        speed: 0.015,
        glowIntensity: 0.05
      };
      
      // 🔥 LERP (TRANSISI HALUS - TIDAK KAGET): Pelan-pelan pindah ke target state 🔥
      const lerpFactor = isSpeaking ? 0.08 : 0.04; // Pelan pas balik, cepet dikit pas ngomong
      animState.scale += (targetState.scale - animState.scale) * lerpFactor;
      animState.amplitude += (targetState.amplitude - animState.amplitude) * lerpFactor;
      animState.speed += (targetState.speed - animState.speed) * lerpFactor;
      animState.glowIntensity += (targetState.glowIntensity - animState.glowIntensity) * lerpFactor;

      time += animState.speed;

      const cx = size / 2;
      const cy = size / 2;
      
      // Glow di background (halus)
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * animState.scale);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${animState.glowIntensity})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Gambar Partikel Plasma Cair (Defined shape with wavy texture)
      // mix-blend-screen biar glow partikel numpuk cerah
      ctx.globalCompositeOperation = 'screen'; 

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        
        // Basic 3D Sphere Point
        let x = p.baseX;
        let y = p.baseY;
        let z = p.baseZ;

        // 🔥 RUMUS CAIRAN ACAK MULUS (Berdasarkan CylenCanvas FEB - Tidak Meleleh/Ga berulang) 🔥
        // Noise turbulensi buat penyok-penyok acak di permukaan
        let waveX = Math.sin(x * 5 + time) * 0.5 + 0.5;
        let waveY = Math.cos(y * 5 + time * 1.3) * 0.5 + 0.5;
        let waveZ = Math.sin(z * 5 + time * 1.7) * 0.5 + 0.5;
        
        // Displacement factor (seberapa jauh penyoknya mengalir)
        let turbulence = waveX * waveY * waveZ * animState.amplitude;
        
        // Terapin distorsi cair (defined shape but wavy sides)
        let rFactor = 100 * animState.scale + turbulence * 40; 

        // Rotasi Idle (Muter halus ga berarah)
        const rotXTime = time * 0.15;
        const rotYTime = time * 0.25;
        
        // 3D Rotation Math (Pelan-pelan acak)
        let newY = y * Math.cos(rotXTime) - z * Math.sin(rotXTime);
        let newZ = y * Math.sin(rotXTime) + z * Math.cos(rotXTime);
        let newX = x * Math.cos(rotYTime) + newZ * Math.sin(rotYTime);
        z = -x * Math.sin(rotYTime) + newZ * Math.cos(rotYTime);
        x = newX;
        y = newY;

        // Proyeksi 3D ke 2D Layar ( defined but with fluid turbulence factor)
        // Agak dimiringin dikit biar feel 3D kerasa
        let px = cx + (x * rFactor);
        let py = cy + (y * rFactor * 0.8 + z * rFactor * 0.3); // Elliptical projection for depth

        // Atur Opacity berdasarkan depth (z-index) - z paling gede paling depan
        // Depan terang, belakang redup
        let opacity = (z + 1.2) / 2.4; // Map z from -1:1 to 0:1 roughly
        if (opacity < 0.1) opacity = 0.1; // Jangan pudar total di belakang
        if (opacity > 1) opacity = 1;

        // 🔥 GAMBAR TITIK PARTIKEL ULTRATHIN (Banyak, Defined, Mulus Meleleh) 🔥
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * (isSpeaking ? 1 : 0.7)})`;
        ctx.beginPath();
        // ctx.arc(px, py, p.r, 0, Math.PI * 2); // Terlalu berat buat ribuan titik
        // ctx.fill();
        ctx.fillRect(px, py, p.r, p.r); // Lebih cepet di-render pixel murni

      }

      // Kembaliin mode blend normal
      ctx.globalCompositeOperation = 'source-over';

      // 🔥 HAPUS TITIK BULAT DI TENGAH 🔥
      // ctx.beginPath(); // ... (deleted)

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none">
      
      {/* ⚠️ BAGIAN TENGAH: HTML5 CANVAS (Mulus, Jelas, Meleleh Organik, Tidak Kaget) ⚠️ */}
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
