import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, Volume2, Mic, Settings, X } from 'lucide-react';

interface LiveVoiceModeProps {
  onClose: () => void;
}

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'speaking'>('listening');
  const [isClosing, setIsClosing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Handle close: fade-out dulu 200ms, baru unmount
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setTimeout(() => {
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => (prev === 'listening' ? 'speaking' : 'listening'));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 350;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const particleCount = 4000;
    const particles: { baseX: number; baseY: number; baseZ: number; r: number }[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = ((2 * Math.PI) / goldenRatio) * i;
      particles.push({
        baseX: Math.cos(theta) * radius,
        baseY: y,
        baseZ: Math.sin(theta) * radius,
        r: Math.random() * 1.2 + 0.8,
      });
    }

    let time = 0;
    const animState = { scale: 1, amplitude: 0.08, speed: 0.015, glowIntensity: 0.1 };

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const isSpeaking = statusRef.current === 'speaking';
      const target = isSpeaking
        ? { scale: 1.15, amplitude: 0.18, speed: 0.04, glowIntensity: 0.25 }
        : { scale: 1.0, amplitude: 0.06, speed: 0.015, glowIntensity: 0.08 };

      const lf = 0.05;
      animState.scale += (target.scale - animState.scale) * lf;
      animState.amplitude += (target.amplitude - animState.amplitude) * lf;
      animState.speed += (target.speed - animState.speed) * lf;
      animState.glowIntensity += (target.glowIntensity - animState.glowIntensity) * lf;

      time += animState.speed;

      const cx = size / 2;
      const cy = size / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * animState.scale);
      gradient.addColorStop(0, `rgba(255,255,255,${animState.glowIntensity})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        const noise =
          Math.sin(p.baseX * 4 + time) *
          Math.cos(p.baseY * 4 - time) *
          Math.sin(p.baseZ * 4 + time);
        const rFactor = 110 * animState.scale * (1 + noise * animState.amplitude);

        const rotX = time * 0.2;
        const rotY = time * 0.3;

        const y1 = p.baseY * Math.cos(rotX) - p.baseZ * Math.sin(rotX);
        const z1 = p.baseY * Math.sin(rotX) + p.baseZ * Math.cos(rotX);
        const x2 = p.baseX * Math.cos(rotY) + z1 * Math.sin(rotY);
        const z2 = -p.baseX * Math.sin(rotY) + z1 * Math.cos(rotY);

        const px = cx + x2 * rFactor;
        const py = cy + y1 * rFactor;

        let depthAlpha = (z2 + 1.5) / 2.5;
        depthAlpha = Math.max(0.15, Math.min(1, depthAlpha));
        const finalAlpha = depthAlpha * (isSpeaking ? 0.95 : 0.65);

        ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
        ctx.fillRect(px, py, p.r, p.r);
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none"
      style={{
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease',
        pointerEvents: isClosing ? 'none' : 'auto',
      }}
    >
      {/* Sphere */}
      <div className="flex-1 flex items-center justify-center">
        <canvas ref={canvasRef} style={{ width: '350px', height: '350px' }} />
      </div>

      {/* Bottom UI */}
      <div className="pb-8 px-6 relative z-10 bg-gradient-to-t from-black via-black to-transparent">
        {/* Status text */}
        <div className="flex flex-col items-center justify-center gap-1 mb-8">
          <div
            className={`text-white font-bold text-xl transition-all duration-500 ${
              status === 'speaking' ? 'opacity-100 scale-105' : 'opacity-80 scale-100'
            }`}
          >
            Cylen Voice
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                status === 'speaking'
                  ? 'bg-white shadow-[0_0_8px_white] animate-ping'
                  : 'bg-white/50'
              }`}
            />
            <span className="text-white/60 text-sm font-medium tracking-wide">
              {status === 'speaking' ? 'Speaking...' : 'Listening...'}
            </span>
          </div>
        </div>

        {/* 4 tombol kontrol */}
        <div className="flex items-center justify-between bg-white/5 rounded-3xl p-2 mb-4 border border-white/10 backdrop-blur-md">
          {[Camera, Volume2, Mic, Settings].map((Icon, i) => (
            <button
              key={i}
              className="flex-1 py-3 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              <Icon size={20} />
            </button>
          ))}
        </div>

        {/* Input + Stop */}
        <div className="flex items-center gap-3 bg-white/5 rounded-full p-2 border border-white/10 backdrop-blur-md">
          <div className="flex-1 flex items-center gap-2 px-3 text-white/40">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M1 5.5L10 1L19 5.5L10 10L1 5.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M1 10L10 14.5L19 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              <path d="M1 14.5L10 19L19 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
            </svg>
            <span className="text-sm">Ask anything</span>
          </div>

          {/* TOMBOL STOP — pakai handleClose */}
          <button
            onClick={handleClose}
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
