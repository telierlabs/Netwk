import React, { useState } from 'react';
import { Play, Copy, Github, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react';

interface Card {
  id: number;
  type: 'code' | 'idea';
  title: string;
  x: number;
  y: number;
  content: string;
}

export const CylenCanvas = () => {
  const [scale, setScale] = useState(1);
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
  
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Hitung offset klik user relatif terhadap kartu
    setDragOffset({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
    setDraggingId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingId === null) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    
    // Hitung posisi X dan Y baru berdasarkan gerakan mouse
    const newX = (e.clientX - containerRect.left) / scale - dragOffset.x;
    const newY = (e.clientY - containerRect.top) / scale - dragOffset.y;

    setCards(prev => prev.map(c => c.id === draggingId ? { ...c, x: newX, y: newY } : c));
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden font-sans"
      style={{ backgroundColor: 'var(--bg)' }} // 🔥 LATAR NGIKUTIN TEMA APLIKASI (Bukan Hitam Paksa)
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Grid Titik-Titik */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(var(--text) 1px, transparent 0)', backgroundSize: '30px 30px' }} 
      />

      {/* Area Workspace yang bisa di-Scale/Zoom */}
      <div 
        className="absolute inset-0 origin-top-left transition-transform duration-75 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Garis Penghubung antar kartu (Otomatis ngikutin kordinat) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
           {cards.length >= 2 && (
             <path 
               d={`M ${cards[0].x + 150} ${cards[0].y + 100} Q ${(cards[0].x + cards[1].x)/2} ${(cards[0].y + cards[1].y)/2 - 50} ${cards[1].x} ${cards[1].y + 50}`} 
               stroke="var(--text)" strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="5,5" 
             />
           )}
        </svg>

        {/* Render Kartu-Kartu Item (Tetap Matte Black Biar Kontras) */}
        {cards.map(card => (
          <div 
            key={card.id}
            onMouseDown={(e) => handleMouseDown(e, card.id)}
            className={`absolute bg-[#0a0a0a] border border-[#222] rounded-2xl p-4 shadow-xl z-10 
                       ${draggingId === card.id ? 'cursor-grabbing scale-[1.02] shadow-2xl opacity-90' : 'cursor-grab hover:border-[#444]'} 
                       transition-all duration-150`}
            style={{ left: card.x, top: card.y, width: card.type === 'code' ? 320 : 260 }}
          >
            {card.type === 'code' ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[12px] font-bold text-white/50 tracking-widest uppercase">{card.title}</span>
                  <div className="flex gap-2">
                     <button className="p-1.5 hover:bg-white/10 rounded-lg text-white/60"><Copy size={14}/></button>
                     <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-green-400"><Play size={14} fill="currentColor"/></button>
                  </div>
                </div>
                <pre className="text-[11px] text-green-400/90 bg-black/60 p-3 rounded-xl overflow-hidden leading-relaxed border border-white/5 pointer-events-none">
                  {card.content}
                </pre>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-white/40 italic">
                  <Github size={12}/> Connected to telierlabs/vynix
                </div>
              </>
            ) : (
              <>
                <span className="text-[12px] font-bold text-[#9d7fea] tracking-widest uppercase mb-2 block text-center pointer-events-none">{card.title}</span>
                <p className="text-sm text-white/90 leading-relaxed text-center pointer-events-none">{card.content}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar Zoom & Pan di pojok kanan atas */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-[var(--sf)] border border-[var(--bd)] p-2 rounded-2xl z-50 shadow-lg backdrop-blur-md">
         <button className="p-2 hover:bg-[var(--bd)] text-[var(--text)] rounded-lg"><MousePointer2 size={18}/></button>
         <div className="w-full h-[1px] bg-[var(--bd)] opacity-50"></div>
         <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 hover:bg-[var(--bd)] text-[var(--text)] rounded-lg"><ZoomIn size={18}/></button>
         <button onClick={() => setScale(s => Math.max(s - 0.1, 0.4))} className="p-2 hover:bg-[var(--bd)] text-[var(--text)] rounded-lg"><ZoomOut size={18}/></button>
         <div className="text-[10px] font-bold text-center text-[var(--text)] mt-1">{Math.round(scale * 100)}%</div>
      </div>

    </div>
  );
};
