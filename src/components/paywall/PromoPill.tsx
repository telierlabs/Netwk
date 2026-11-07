import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Kartu pil promo Cylen (desktop, pojok kanan bawah).
// Bintang berkedip + meteor digambar di <canvas> di belakang teks.
// Warnanya sengaja tetap gelap & monokrom di semua tema, jadi tidak pakai variabel tema App.

const DISMISS_KEY = 'cylen_promo_pill_dismissed';

interface PromoPillProps {
  onClick: () => void; // dipanggil saat pil / tombol diklik → buka halaman langganan
}

type Star = { x: number; y: number; r: number; a: number; sp: number; ph: number; big: boolean };
type Meteor = { x: number; y: number; vx: number; vy: number; len: number; sp: number; age: number };

export const PromoPill: React.FC<PromoPillProps> = ({ onClick }) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (dismissed) return;
    const host = hostRef.current;
    const cv = canvasRef.current;
    if (!host || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0;
    let stars: Star[] = [];
    let meteors: Meteor[] = [];
    let raf = 0;
    let last = 0;
    let nextSpawn = 0.8;

    const seed = () => {
      const n = Math.round((w * h) / 1200);
      stars = [];
      for (let i = 0; i < n; i++) {
        const big = i < 4;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? 0.9 + Math.random() * 0.5 : 0.35 + Math.random() * 0.8,
          a: big ? 0.9 : 0.35 + Math.random() * 0.55,
          sp: 0.8 + Math.random() * 2.2,
          ph: Math.random() * 6.283,
          big,
        });
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      for (const s of stars) {
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        const al = s.a * tw;
        ctx.globalAlpha = al;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
        if (s.big) {
          const L = s.r * 5 * tw + 2;
          ctx.globalAlpha = al * 0.7;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
          ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L);
          ctx.stroke();
        }
      }
      for (const m of meteors) {
        const fadeIn = Math.min(1, m.age / 0.3);
        const fadeOut = Math.max(0, Math.min(1, (h + 6 - m.y) / (h * 0.3)));
        const alpha = fadeIn * fadeOut;
        if (alpha <= 0) continue;
        const tx = m.x - m.vx * m.len;
        const ty = m.y - m.vy * m.len;
        const g = ctx.createLinearGradient(tx, ty, m.x, m.y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.7, 'rgba(220,222,226,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(m.x, m.y); ctx.stroke();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(m.x, m.y, 1.3, 0, 6.283); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    };

    const spawn = () => {
      const a = ((14 + Math.random() * 14) * Math.PI) / 180;
      const dir = Math.random() < 0.5 ? 1 : -1;
      meteors.push({
        x: dir === -1 ? w * (0.5 + Math.random() * 0.6) : w * (-0.1 + Math.random() * 0.5),
        y: -8 + Math.random() * h * 0.35,
        vx: Math.cos(a) * dir,
        vy: Math.sin(a),
        len: 60 + Math.random() * 60,
        sp: 280 + Math.random() * 180,
        age: 0,
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      const dt = Math.min(0.05, t - last || 0.016);
      last = t;
      if (!w || document.hidden) return;
      nextSpawn -= dt;
      if (nextSpawn <= 0 && meteors.length < 3) {
        spawn();
        nextSpawn = 0.8 + Math.random() * 1.4;
      }
      meteors = meteors.filter((m) => {
        m.x += m.vx * m.sp * dt;
        m.y += m.vy * m.sp * dt;
        m.age += dt;
        return !(m.y > h + 20 || m.x < -m.len - 20 || m.x > w + m.len + 20);
      });
      draw(t);
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduce) draw(0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [dismissed]);

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* abaikan */ }
    setDismissed(true);
  };

  return (
    <>
      <style>{`
        @keyframes cpill-in { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .cpill {
          position: fixed; right: 24px; bottom: 24px; z-index: 90;
          width: 400px; max-width: calc(100vw - 48px); min-height: 92px; box-sizing: border-box;
          border-radius: 28px; overflow: hidden; isolation: isolate; cursor: pointer; color: #f6f6f7;
          background:
            radial-gradient(70% 140% at 62% 0%, rgba(255,255,255,.09), transparent 65%),
            radial-gradient(50% 120% at 0% 100%, rgba(255,244,235,.06), transparent 70%),
            #09090a;
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: 0 18px 40px -18px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.08);
          animation: cpill-in .7s cubic-bezier(.2,.9,.2,1) 1.2s backwards;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .cpill:hover { transform: translateY(-2px); box-shadow: 0 22px 46px -16px rgba(0,0,0,.7), 0 0 0 1px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.1); }
        .cpill-sky { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; display: block; }
        .cpill::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(90deg, rgba(9,9,10,.55), rgba(9,9,10,0) 70%); }
        .cpill-inner { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 20px 16px 26px; min-height: 92px; box-sizing: border-box; }
        .cpill-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .cpill-title { margin: 0; font-weight: 600; font-size: 19px; line-height: 1.15; letter-spacing: -.01em; }
        .cpill-sub { margin: 0; font-size: 13.5px; line-height: 1.35; color: #9a9ca2; }
        .cpill-cta {
          flex: none; border: 0; cursor: pointer; border-radius: 999px; padding: 12px 22px;
          font: inherit; font-weight: 600; font-size: 14.5px; color: #08080a; background: #f6f6f7;
          box-shadow: 0 0 0 1px rgba(255,255,255,.4), 0 8px 24px -8px rgba(255,255,255,.3);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .cpill-cta:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,.6), 0 10px 30px -6px rgba(255,255,255,.5); }
        .cpill-x {
          position: absolute; z-index: 3; top: 7px; right: 11px; width: 18px; height: 18px;
          display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%;
          background: transparent; color: #9a9ca2; cursor: pointer; transition: color .2s, background .2s;
        }
        .cpill-x:hover { color: #f6f6f7; background: rgba(255,255,255,.12); }
        .cpill-cta:focus-visible, .cpill-x:focus-visible { outline: 2px solid #f6f6f7; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .cpill { animation: none; } }
      `}</style>

      <div ref={hostRef} className="cpill" onClick={onClick} role="complementary" aria-label="Penawaran Cylen Pro">
        <canvas ref={canvasRef} className="cpill-sky" aria-hidden="true" />
        <button type="button" className="cpill-x" onClick={handleDismiss} aria-label="Tutup">
          <X size={10} strokeWidth={2.4} />
        </button>
        <div className="cpill-inner">
          <div className="cpill-copy">
            <h2 className="cpill-title">Coba Cylen Pro</h2>
            <p className="cpill-sub">Buka kemampuan yang lebih luas</p>
          </div>
          <button type="button" className="cpill-cta" onClick={(e) => { e.stopPropagation(); onClick(); }}>
            Lihat paket
          </button>
        </div>
      </div>
    </>
  );
};
