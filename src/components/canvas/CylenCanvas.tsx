import React, { useRef, useEffect, useState } from 'react';
import { Play, Copy, Github, Trash2, Edit2, Check } from 'lucide-react';

interface Card {
  id: number;
  type: 'code' | 'idea';
  title: string;
  content: string;
}

export const CylenCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  
  // 🔥 DYNAMIC REFS: Biar bisa nampung kartu sampai ratusan tanpa ngelag
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // STATE REACT: Buat nyimpen data teks dan status Edit
  const [cards, setCards] = useState<Card[]>([
    { id: 1, type: 'code', title: 'Header.tsx', content: 'export const Header = () => {\n  return (\n    <header className="p-4 bg-black">\n      <Logo />\n    </header>\n  )\n}' },
    { id: 2, type: 'idea', title: 'Visi Telierlabs', content: 'Membangun ekosistem monolitik Cylen, Vynix, dan TelierNews.' }
  ]);
  const [editingId, setEditingId] = useState<number | null>(null);

  // STATE GPU (MEMORY): Biar geser-geser tetep 60fps (Mulusss)
  const s = useRef({
    panX: 0, panY: 0, scale: 1,
    mode: 'none', // 'pan', 'card', 'pinch'
    startX: 0, startY: 0,
    initPanX: 0, initPanY: 0,
    initScale: 1, initDist: 0,
    dragId: null as number | null,
    cardPos: {
      1: { x: 40, y: 40, initX: 0, initY: 0 },
      2: { x: 380, y: 150, initX: 0, initY: 0 }
    } as Record<number, { x: number, y: number, initX: number, initY: number }>
  });

  // FUNGSI RENDER KILAT KE GPU
  const updateDOM = () => {
    const state = s.current;
    if (workspaceRef.current) workspaceRef.current.style.transform = `translate3d(${state.panX}px, ${state.panY}px, 0) scale(${state.scale})`;
    if (gridRef.current) {
      gridRef.current.style.backgroundPosition = `${state.panX}px ${state.panY}px`;
      gridRef.current.style.backgroundSize = `${30 * state.scale}px ${30 * state.scale}px`;
    }
    
    // Update posisi semua kartu yang ada
    cards.forEach(c => {
      const el = cardRefs.current[c.id];
      const pos = state.cardPos[c.id];
      if (el && pos) el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    });

    // Update garis penyambung (Contoh: nyambungin kartu 1 ke 2)
    if (pathRef.current && cards.length >= 2) {
      const p1 = state.cardPos[cards[0].id];
      const p2 = state.cardPos[cards[1].id];
      if (p1 && p2) {
        pathRef.current.setAttribute('d', `M ${p1.x + 160} ${p1.y + 100} Q ${(p1.x + p2.x)/2} ${(p1.y + p2.y)/2 - 50} ${p2.x} ${p2.y + 50}`);
      } else {
        pathRef.current.setAttribute('d', '');
      }
    }
  };

  // SINGKRONISASI KARTU BARU KE MEMORY GPU
  useEffect(() => {
    cards.forEach(c => {
      if (!s.current.cardPos[c.id]) {
        // Posisi default buat kartu baru yg ditambahin AI nanti
        s.current.cardPos[c.id] = { x: 100, y: 100, initX: 0, initY: 0 };
      }
    });
    updateDOM();
  }, [cards]);

  // EVENT LISTENER BUAT ZOOM (SCROLL & PINCH)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        s.current.mode = 'pinch';
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        s.current.initDist = Math.sqrt(dx * dx + dy * dy);
        s.current.initScale = s.current.scale;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (s.current.mode === 'pinch' && e.touches.length === 2) {
        e.preventDefault(); 
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = s.current.initScale * (dist / s.current.initDist);
        s.current.scale = Math.min(Math.max(0.3, newScale), 3); 
        updateDOM();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      s.current.scale = Math.min(Math.max(0.3, s.current.scale + delta), 3);
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

  // FUNGSI DRAG & PAN LAYAR
  const onPointerDown = (e: React.PointerEvent, target: 'pan' | 'card', id?: number) => {
    if (s.current.mode === 'pinch') return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    s.current.mode = target;
    s.current.startX = e.clientX;
    s.current.startY = e.clientY;
    
    if (target === 'pan') {
      s.current.initPanX = s.current.panX; 
      s.current.initPanY = s.current.panY;
    } else if (target === 'card' && id) {
      s.current.dragId = id;
      s.current.cardPos[id].initX = s.current.cardPos[id].x;
      s.current.cardPos[id].initY = s.current.cardPos[id].y;
      
      // Bikin kartu yang lagi dipegang ada di paling atas (z-index)
      if (cardRefs.current[id]) {
        cardRefs.current[id]!.style.zIndex = '50';
        cardRefs.current[id]!.style.opacity = '0.9';
        cardRefs.current[id]!.style.cursor = 'grabbing';
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = s.current;
    if (state.mode === 'none' || state.mode === 'pinch') return;

    if (state.mode === 'pan') {
      state.panX = state.initPanX + (e.clientX - state.startX);
      state.panY = state.initPanY + (e.clientY - state.startY);
    } else if (state.mode === 'card' && state.dragId) {
      const dx = (e.clientX - state.startX) / state.scale;
      const dy = (e.clientY - state.startY) / state.scale;
      state.cardPos[state.dragId].x = state.cardPos[state.dragId].initX + dx;
      state.cardPos[state.dragId].y = state.cardPos[state.dragId].initY + dy;
    }
    updateDOM();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Kembaliin styling normal pas kartu dilepas
    if (s.current.mode === 'card' && s.current.dragId && cardRefs.current[s.current.dragId]) {
      cardRefs.current[s.current.dragId]!.style.zIndex = '10';
      cardRefs.current[s.current.dragId]!.style.opacity = '1';
      cardRefs.current[s.current.dragId]!.style.cursor = 'grab';
    }

    s.current.mode = 'none';
    s.current.dragId = null;
  };

  // 🔥 FUNGSI EDIT KONTEN MANUAL
  const updateContent = (id: number, newContent: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, content: newContent } : c));
  };

  // 🔥 FUNGSI HAPUS KARTU
  const deleteCard = (id: number) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden font-sans touch-none select-none"
      style={{ backgroundColor: 'var(--bg)', cursor: 'grab' }}
      onPointerDown={(e) => onPointerDown(e, 'pan')}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={gridRef} className="absolute inset-0 opacity-[0.15] pointer-events-none origin-top-left" style={{ backgroundImage: 'radial-gradient(var(--text) 1.5px, transparent 0)' }} />

      <div ref={workspaceRef} className="absolute inset-0 origin-top-left pointer-events-none">
        
        {/* Garis Penghubung antar kartu */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
           <path ref={pathRef} stroke="var(--text)" strokeWidth="1.5" fill="none" opacity="0.25" strokeDasharray="5,5" />
        </svg>

        {/* LOOPING SEMUA KARTU */}
        {cards.map(card => {
          const isEditing = editingId === card.id;

          return (
            <div 
              key={card.id}
              ref={el => cardRefs.current[card.id] = el}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'card', card.id); }}
              onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
              onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
              className="absolute bg-[#0a0a0a] border border-[#222] hover:border-[#444] rounded-2xl p-4 shadow-xl z-10 pointer-events-auto origin-top-left cursor-grab flex flex-col"
              style={{ width: card.type === 'code' ? 320 : 260 }}
            >
              {/* 🔥 HEADER KARTU (AREA SERET & TOMBOL AKSI) */}
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[12px] font-bold tracking-widest uppercase pointer-events-none ${card.type === 'idea' ? 'text-[#9d7fea]' : 'text-white/50'}`}>
                  {card.title}
                </span>
                
                {/* KUMPULAN TOMBOL (Edit, Hapus, Copy, Play) */}
                <div className="flex gap-1.5 pointer-events-auto">
                   {isEditing ? (
                     // Tombol Save (Pas lagi mode edit)
                     <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditingId(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-green-400 bg-white/5"><Check size={14}/></button>
                   ) : (
                     // Tombol Edit Manual
                     <button onPointerDown={e => e.stopPropagation()} onClick={() => setEditingId(card.id)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60"><Edit2 size={14}/></button>
                   )}
                   
                   {/* Tombol Hapus Kartu */}
                   <button onPointerDown={e => e.stopPropagation()} onClick={() => deleteCard(card.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 size={14}/></button>

                   {/* Tombol Copy (Hanya buat kartu code) */}
                   {card.type === 'code' && (
                     <>
                       <button onPointerDown={e => e.stopPropagation()} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60"><Copy size={14}/></button>
                       <button onPointerDown={e => e.stopPropagation()} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-green-400"><Play size={14} fill="currentColor"/></button>
                     </>
                   )}
                </div>
              </div>

              {/* 🔥 ISI KARTU (MODE EDIT vs MODE VIEW) */}
              {isEditing ? (
                <textarea
                  autoFocus
                  onPointerDown={e => e.stopPropagation()} // Biar pas ngetik ga kegeser layarnya
                  className={`w-full bg-[#111] text-white/90 p-3 rounded-xl border border-[var(--ac)] outline-none resize-none leading-relaxed ${card.type === 'code' ? 'text-[11px] font-mono h-40' : 'text-[13px] h-28 text-center'}`}
                  value={card.content}
                  onChange={(e) => updateContent(card.id, e.target.value)}
                />
              ) : (
                card.type === 'code' ? (
                  <pre 
                    onPointerDown={e => e.stopPropagation()} // Biar teksnya bisa diblok/disalin tanpa geser kartu
                    className="text-[11px] text-green-400/90 bg-black/60 p-3 rounded-xl overflow-auto leading-relaxed border border-white/5 cursor-text flex-1"
                  >
                    {card.content}
                  </pre>
                ) : (
                  <p 
                    onPointerDown={e => e.stopPropagation()}
                    className="text-sm text-white/90 leading-relaxed text-center cursor-text flex-1"
                  >
                    {card.content}
                  </p>
                )
              )}
              
              {/* Footer Kartu (Logo Github) */}
              {card.type === 'code' && !isEditing && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40 italic pointer-events-none">
                  <Github size={12}/> Connected to telierlabs/vynix
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
};
