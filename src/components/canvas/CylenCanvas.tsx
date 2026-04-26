import React, { useRef, useEffect } from 'react';
import { Play, Copy, Github } from 'lucide-react';

export const CylenCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  
  // Ref untuk masing-masing kartu biar cepat tanpa re-render React
  const c1Ref = useRef<HTMLDivElement>(null);
  const c2Ref = useRef<HTMLDivElement>(null);

  // The Brain: Nyimpen koordinat di Memory (bukan State) biar 60FPS!
  const state = useRef({
    panX: 0, panY: 0, scale: 1,
    c1X: 40, c1Y: 40,
    c2X: 380, c2Y: 150,
    mode: 'none', // 'pan', 'drag_c1', 'drag_c2', 'pinch'
    startX: 0, startY: 0,
    initPanX: 0, initPanY: 0,
    initCardX: 0, initCardY: 0,
    initScale: 1, initDist: 0
  });

  // Fungsi Render Kilat (Nembak GPU Langsung)
  const updateDOM = () => {
    const s = state.current;
    if (workspaceRef.current) workspaceRef.current.style.transform = `translate3d(${s.panX}px, ${s.panY}px, 0) scale(${s.scale})`;
    if (gridRef.current) {
      gridRef.current.style.backgroundPosition = `${s.panX}px ${s.panY}px`;
      gridRef.current.style.backgroundSize = `${30 * s.scale}px ${30 * s.scale}px`;
    }
    if (c1Ref.current) c1Ref.current.style.transform = `translate3d(${s.c1X}px, ${s.c1Y}px, 0)`;
    if (c2Ref.current) c2Ref.current.style.transform = `translate3d(${s.c2X}px, ${s.c2Y}px, 0)`;
    if (pathRef.current) {
      pathRef.current.setAttribute('d', `M ${s.c1X + 160} ${s.c1Y + 100} Q ${(s.c1X + s.c2X)/2} ${(s.c1Y + s.c2Y)/2 - 50} ${s.c2X} ${s.c2Y + 50}`);
    }
  };

  useEffect(() => {
    updateDOM(); // Render awal
    const container = containerRef.current;
    if (!container) return;

    // EVENT ZOOM: Pake 2 Jari (Pinch) di HP
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        state.current.mode = 'pinch';
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        state.current.initDist = Math.sqrt(dx * dx + dy * dy);
        state.current.initScale = state.current.scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (state.current.mode === 'pinch' && e.touches.length === 2) {
        e.preventDefault(); // Biar layar asli browser ga ikut ke-zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = state.current.initScale * (dist / state.current.initDist);
        state.current.scale = Math.min(Math.max(0.3, newScale), 3); // Limit zoom
        updateDOM();
      }
    };

    // EVENT ZOOM: Pake Scroll Mouse di Laptop
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      state.current.scale = Math.min(Math.max(0.3, state.current.scale + delta), 3);
      updateDOM();
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // FUNGSI DRAG SAT-SET (MOUSE & SENTUH 1 JARI)
  const onPointerDown = (e: React.PointerEvent, target: 'pan' | 'c1' | 'c2') => {
    if (state.current.mode === 'pinch') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); // Kunci jari biar ga lepas
    
    const s = state.current;
    s.mode = target;
    s.startX = e.clientX;
    s.startY = e.clientY;
    
    if (target === 'pan') {
      s.initPanX = s.panX; s.initPanY = s.panY;
    } else if (target === 'c1') {
      s.initCardX = s.c1X; s.initCardY = s.c1Y;
    } else if (target === 'c2') {
      s.initCardX = s.c2X; s.initCardY = s.c2Y;
    }
    
    if (target !== 'pan') {
      (e.currentTarget as HTMLElement).style.zIndex = '50';
      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
      (e.currentTarget as HTMLElement).style.opacity = '0.9';
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = state.current;
    if (s.mode === 'none' || s.mode === 'pinch') return;

    if (s.mode === 'pan') {
      s.panX = s.initPanX + (e.clientX - s.startX);
      s.panY = s.initPanY + (e.clientY - s.startY);
    } else {
      // Pembagi scale biar kecepatan jari = kecepatan geser kartu
      const dx = (e.clientX - s.startX) / s.scale;
      const dy = (e.clientY - s.startY) / s.scale;
      if (s.mode === 'c1') { s.c1X = s.initCardX + dx; s.c1Y = s.initCardY + dy; }
      if (s.mode === 'c2') { s.c2X = s.initCardX + dx; s.c2Y = s.initCardY + dy; }
    }
    updateDOM(); // Eksekusi 60fps
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    state.current.mode = 'none';
    if (e.currentTarget.style) {
      e.currentTarget.style.cursor = 'grab';
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.zIndex = '10';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden font-sans touch-none select-none" // touch-none matiin scroll bawaan HP
      style={{ backgroundColor: 'var(--bg)', cursor: 'grab' }}
      onPointerDown={(e) => onPointerDown(e, 'pan')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Background Grid Titik-Titik */}
      <div 
        ref={gridRef}
        className="absolute inset-0 opacity-[0.15] pointer-events-none origin-top-left"
        style={{ backgroundImage: 'radial-gradient(var(--text) 1.5px, transparent 0)' }} 
      />

      {/* Area Workspace */}
      <div ref={workspaceRef} className="absolute inset-0 origin-top-left pointer-events-none">
        
        {/* Garis Penghubung antar kartu */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
           <path ref={pathRef} stroke="var(--text)" strokeWidth="1.5" fill="none" opacity="0.25" strokeDasharray="5,5" />
        </svg>

        {/* KARTU 1: KODE */}
        <div 
          ref={c1Ref}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'c1'); }}
          onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
          onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
          className="absolute bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-2xl p-4 shadow-xl z-10 pointer-events-auto origin-top-left cursor-grab w-[320px]"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-[12px] font-bold text-white/50 tracking-widest uppercase">Header.tsx</span>
            <div className="flex gap-2">
               {/* stopPropagation biar pas diklik tombol, ga ikutan keseret */}
               <button onPointerDown={e => e.stopPropagation()} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60"><Copy size={14}/></button>
               <button onPointerDown={e => e.stopPropagation()} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-green-400"><Play size={14} fill="currentColor"/></button>
            </div>
          </div>
          <pre className="text-[11px] text-green-400/90 bg-black/60 p-3 rounded-xl overflow-hidden leading-relaxed border border-white/5">
            {`export const Header = () => {\n  return (\n    <header className="p-4 bg-black">\n      <Logo />\n    </header>\n  )\n}`}
          </pre>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40 italic">
            <Github size={12}/> Connected to telierlabs/vynix
          </div>
        </div>

        {/* KARTU 2: IDE */}
        <div 
          ref={c2Ref}
          onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'c2'); }}
          onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
          onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
          className="absolute bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-2xl p-4 shadow-xl z-10 pointer-events-auto origin-top-left cursor-grab w-[280px]"
        >
          <span className="text-[12px] font-bold text-[#9d7fea] tracking-widest uppercase mb-2 block text-center">Visi Telierlabs</span>
          <p className="text-sm text-white/90 leading-relaxed text-center">
            Membangun ekosistem monolitik Cylen, Vynix, dan TelierNews.
          </p>
        </div>

      </div>
    </div>
  );
};
