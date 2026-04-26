import React, { useState } from 'react';
import { Play, Copy, Github } from 'lucide-react';

interface Card {
  id: number;
  type: 'code' | 'idea';
  title: string;
  x: number;
  y: number;
  content: string;
}

export const CylenCanvas = () => {
  const [cards, setCards] = useState<Card[]>([
    { 
      id: 1, type: 'code', title: 'Header.tsx', x: 40, y: 40, 
      content: 'export const Header = () => {\n  return (\n    <header className="p-4 bg-black">\n      <Logo />\n    </header>\n  )\n}' 
    },
    { 
      id: 2, type: 'idea', title: 'Visi Telierlabs', x: 380, y: 150, 
      content: 'Membangun ekosistem monolitik Cylen, Vynix, dan TelierNews.' 
    }
  ]);

  // 🔥 STATE BUAT ZOOM & PANNING (FIGMA STYLE)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  const [dragMode, setDragMode] = useState<'none' | 'pan' | 'card'>('none');
  const [draggingCardId, setDraggingCardId] = useState<number | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // HANDLER PAS DIKLIK/DISENTUH
  const handlePointerDown = (e: React.PointerEvent, type: 'bg' | 'card', id?: number) => {
    if (type === 'bg') {
      setDragMode('pan');
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (type === 'card' && id) {
      setDragMode('card');
      setDraggingCardId(id);
      const card = cards.find(c => c.id === id);
      if (card) {
        setStartPos({ 
          x: e.clientX - (card.x * scale), 
          y: e.clientY - (card.y * scale) 
        });
      }
    }
  };

  // HANDLER PAS DIGESER (MOUSE / TOUCH)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'pan') {
      setPan({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    } else if (dragMode === 'card' && draggingCardId) {
      setCards(prev => prev.map(c => 
        c.id === draggingCardId 
          ? { ...c, x: (e.clientX - startPos.x) / scale, y: (e.clientY - startPos.y) / scale } 
          : c
      ));
    }
  };

  // HANDLER PAS DILEPAS
  const handlePointerUp = () => {
    setDragMode('none');
    setDraggingCardId(null);
  };

  // HANDLER ZOOM (SCROLL MOUSE / PINCH TOUCHPAD)
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.min(Math.max(0.3, s + delta), 3)); // Zoom limit dari 30% sampe 300%
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--bg)', cursor: dragMode === 'pan' ? 'grabbing' : 'grab' }}
      onPointerDown={(e) => handlePointerDown(e, 'bg')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Background Grid Titik-Titik yang ikut bergerak & zoom */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none origin-top-left"
        style={{ 
          backgroundImage: 'radial-gradient(var(--text) 1px, transparent 0)', 
          backgroundSize: `${30 * scale}px ${30 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }} 
      />

      {/* Area Workspace yang menampung kartu */}
      <div 
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` 
        }}
      >
        
        {/* Garis Penghubung antar kartu */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
           {cards.length >= 2 && (
             <path 
               d={`M ${cards[0].x + 150} ${cards[0].y + 100} Q ${(cards[0].x + cards[1].x)/2} ${(cards[0].y + cards[1].y)/2 - 50} ${cards[1].x} ${cards[1].y + 50}`} 
               stroke="var(--text)" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="5,5" 
             />
           )}
        </svg>

        {/* Render Kartu-Kartu */}
        {cards.map(card => (
          <div 
            key={card.id}
            className={`absolute bg-[#0a0a0a] border border-[#222] rounded-2xl p-4 shadow-xl z-10 pointer-events-auto
                       ${dragMode === 'card' && draggingCardId === card.id ? 'shadow-2xl opacity-95' : 'hover:border-[#444]'} 
                       transition-colors duration-150`}
            style={{ left: card.x, top: card.y, width: card.type === 'code' ? 320 : 260 }}
          >
            {card.type === 'code' ? (
              <>
                {/* 🔥 AREA DRAG CUMA DI SINI (HEADER KARTU) */}
                <div 
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'card', card.id); }}
                  className="flex justify-between items-center mb-3 cursor-grab active:cursor-grabbing pb-1"
                >
                  <span className="text-[12px] font-bold text-white/50 tracking-widest uppercase pointer-events-none">{card.title}</span>
                  <div className="flex gap-2 pointer-events-auto">
                     <button className="p-1.5 hover:bg-white/10 rounded-lg text-white/60"><Copy size={14}/></button>
                     <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-green-400"><Play size={14} fill="currentColor"/></button>
                  </div>
                </div>

                {/* 🔥 ISI KODE BEBAS DI-BLOK DAN DISALIN */}
                <pre 
                  className="text-[11px] text-green-400/90 bg-black/60 p-3 rounded-xl overflow-auto leading-relaxed border border-white/5 cursor-text"
                  onPointerDown={(e) => e.stopPropagation()} // Biar pas ngeblok teks kartunya gak kegeser
                >
                  {card.content}
                </pre>
                
                <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40 italic pointer-events-none">
                  <Github size={12}/> Connected to telierlabs/vynix
                </div>
              </>
            ) : (
              <>
                {/* 🔥 AREA DRAG KARTU IDE */}
                <div 
                  onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'card', card.id); }}
                  className="cursor-grab active:cursor-grabbing pb-2"
                >
                  <span className="text-[12px] font-bold text-[#9d7fea] tracking-widest uppercase block text-center pointer-events-none">{card.title}</span>
                </div>

                {/* 🔥 TEKS IDE BEBAS DI-BLOK */}
                <p 
                  className="text-sm text-white/90 leading-relaxed text-center cursor-text"
                  onPointerDown={(e) => e.stopPropagation()} // Biar pas ngeblok teks kartunya gak kegeser
                >
                  {card.content}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
