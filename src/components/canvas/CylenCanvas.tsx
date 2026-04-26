import React, { useState } from 'react';
import { Play, Copy, Github, Maximize2, MousePointer2 } from 'lucide-react';

export const CylenCanvas = () => {
  return (
    <div className="fixed inset-0 bg-[#050505] overflow-hidden flex flex-col font-sans">
      
      {/* 1. INFINITE GRID AREA (TEMPAT KARTU) */}
      <div className="flex-1 relative w-full h-full overflow-hidden" 
           style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 0)', backgroundSize: '30px 30px' }}>
        
        {/* KARTU KODE (CONTOH MODULAR) */}
        <div className="absolute top-20 left-20 w-[320px] bg-[#111] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[12px] font-bold text-white/40 tracking-widest uppercase">Header.tsx</span>
            <div className="flex gap-2">
               <button className="p-1.5 hover:bg-white/5 rounded-lg text-white/60"><Copy size={14}/></button>
               <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[#9d7fea]"><Play size={14} fill="currentColor"/></button>
            </div>
          </div>
          <pre className="text-[11px] text-green-400/80 bg-black/40 p-3 rounded-xl overflow-hidden leading-relaxed">
            {`export const Header = () => {
  return (
    <header className="p-4 bg-black">
      <Logo />
    </header>
  )
}`}
          </pre>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-white/30 italic">
            <Github size={12}/> Connected to telierlabs/vynix-ui
          </div>
        </div>

        {/* KARTU IDE BISNIS (BUKAN KODING) */}
        <div className="absolute top-[280px] left-[400px] w-[280px] bg-[#111] border border-[#9d7fea]/30 rounded-2xl p-4 shadow-2xl">
          <span className="text-[12px] font-bold text-[#9d7fea] tracking-widest uppercase mb-2 block text-center">Visi Telierlabs</span>
          <p className="text-sm text-white/80 leading-relaxed text-center">
            Membangun ekosistem monolitik yang menghubungkan AI, Berita, dan Hiburan dalam satu ID.
          </p>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#9d7fea] to-transparent my-3"></div>
          <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/60 text-[11px] font-bold rounded-xl transition-all">
             Expand Strategy
          </button>
        </div>

        {/* GARIS PENGHUBUNG (SVG) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
           <path d="M 340 100 Q 450 150 400 300" stroke="#9d7fea" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="5,5" />
        </svg>

      </div>

      {/* 2. FLOATING CHAT CONTROL (DI BAWAH) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
        <div className="bg-[#111]/80 backdrop-blur-2xl border border-white/10 rounded-[28px] p-2 flex items-center gap-3 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
           {/* Tombol Canvas Mode Indicator */}
           <div className="ml-2 p-2 bg-[#9d7fea] rounded-full text-black">
              <Maximize2 size={18} strokeWidth={3}/>
           </div>
           
           <input 
             className="flex-1 bg-transparent border-none outline-none text-white text-sm" 
             placeholder="Suruh Cylen ubah kartu di atas..."
           />

           <button className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm">
              Update
           </button>
        </div>
      </div>

      {/* ZOOM & PAN TOOLBAR */}
      <div className="absolute top-24 right-6 flex flex-col gap-2 bg-[#111] border border-white/10 p-2 rounded-2xl">
         <button className="p-2 hover:bg-white/5 text-white/60"><MousePointer2 size={20}/></button>
         <div className="w-full h-[1px] bg-white/5"></div>
         <button className="p-2 hover:bg-white/5 text-white/60 text-sm font-bold">100%</button>
      </div>

    </div>
  );
};
