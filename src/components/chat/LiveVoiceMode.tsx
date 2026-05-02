import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, Volume2, Mic, Settings, X, Code, Map as MapIcon, Box } from 'lucide-react';
import { chatWithGeminiStream } from '../../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface LiveVoiceModeProps {
  onClose: () => void;
}

type StageType = 'hologram' | 'map' | 'code';

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking'>('listening');
  const [uiText, setUiText] = useState('Mendengarkan...');
  const [isClosing, setIsClosing] = useState(false);
  
  const [activeStage, setActiveStage] = useState<StageType>('hologram');
  const [stageData, setStageData] = useState<string>('sphere'); 
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(status);
  const isClosingRef = useRef(false);
  const animationFrameRef = useRef<number>();

  // State untuk 3D Rotate dengan jari
  const rotationRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const startListening = useCallback(() => {
    if (isClosingRef.current || synthRef.current.speaking) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setUiText('Browser tidak mendukung fitur suara.'); return; }

    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;

    rec.onstart = () => {
      setStatus('listening');
      setUiText('Mendengarkan...');
    };

    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setUiText(`"${transcript}"`);
      if (e.results[0].isFinal) {
        rec.stop();
        handleAIResponse(transcript);
      }
    };

    rec.onerror = (e: any) => { if (e.error !== 'aborted' && statusRef.current === 'listening' && !isClosingRef.current) setTimeout(startListening, 1000); };
    rec.onend = () => { if (statusRef.current === 'listening' && !isClosingRef.current) setTimeout(startListening, 300); };

    recognitionRef.current = rec;
    rec.start();
  }, []);

  const handleAIResponse = async (userText: string) => {
    setStatus('processing');
    setUiText('Menganalisis simulasi...');

    try {
      // 🔥 AI SUTRADARA: DIPAKSA MILIH 1 DARI 12 BENTUK MASTER HOLOGRAM 🔥
      const directorPrompt = `User berkata: "${userText}".\n
      Sebagai Cylen AI, tentukan panggung visual yang tepat.
      Pilihan panggung:
      1. [SIMULASI: MAP | Alamat] (Jika tanya lokasi/jalan)
      2. [SIMULASI: CODE | Bahasa] (Jika minta koding/script)
      3. [SIMULASI: HOLOGRAM | tipe] -> WAJIB pilih SATU tipe terdekat dari daftar ini:
         - fetus (bayi, janin, reproduksi)
         - dna (genetika, biologi, sel)
         - brain (otak, pikiran, saraf, ai)
         - heart (jantung, organ dalam, cinta)
         - atom (kimia, molekul, partikel)
         - virus (kuman, penyakit, bakteri)
         - galaxy (tata surya, bintang, planet)
         - rocket (roket, peluncuran, luar angkasa)
         - car (mobil, mesin, otomotif)
         - cube (komputer, server, blockchain)
         - torus (cincin, portal)
         - sphere (bumi, bola, default)
      
      Aturan: Wajib sertakan SATU tag simulasi di awal jawaban, lalu berikan penjelasan lisan (maks 2 kalimat).`;

      const stream = await chatWithGeminiStream([{ role: 'user', content: directorPrompt }], false);
      let fullResponse = '';
      for await (const chunk of stream) fullResponse += (chunk as GenerateContentResponse).text || '';

      let textToSpeak = fullResponse;
      const simMatch = fullResponse.match(/\[SIMULASI:\s*(.*?)\s*\|\s*(.*?)\]/i);
      
      if (simMatch) {
        const type = simMatch[1].trim().toLowerCase();
        const data = simMatch[2].trim().toLowerCase();
        
        if (type === 'map') { setActiveStage('map'); setStageData(data); } 
        else if (type === 'code') { setActiveStage('code'); setStageData(data); } 
        else { setActiveStage('hologram'); setStageData(data); }
        textToSpeak = fullResponse.replace(/\[SIMULASI:.*?\]/i, '').trim();
      } else {
        setActiveStage('hologram'); setStageData('sphere');
      }

      speakText(textToSpeak.replace(/[*_#]/g, ''));
    } catch (error) {
      setUiText('Koneksi terputus.');
      speakText('Maaf, saya kehilangan koneksi internet.');
    }
  };

  const speakText = (text: string) => {
    if (isClosingRef.current) return;
    setStatus('speaking');
    setUiText(text.length > 80 ? text.slice(0, 80) + '...' : text); 

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; utterance.pitch = 1.1; utterance.rate = 1.05;
    utterance.onend = () => { if (!isClosingRef.current) startListening(); };
    utterance.onerror = () => { if (!isClosingRef.current) startListening(); };
    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  };

  useEffect(() => {
    startListening();
    return () => {
      isClosingRef.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [startListening]);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    setIsClosing(true); isClosingRef.current = true;
    if (recognitionRef.current) recognitionRef.current.stop();
    if (synthRef.current) synthRef.current.cancel();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // ─── FUNGSI ROTASI PAKE JARI / MOUSE ───
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseRef.current.x;
    const deltaY = e.clientY - lastMouseRef.current.y;
    rotationRef.current.x += deltaY * 0.01;
    rotationRef.current.y += deltaX * 0.01;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerUp = () => { isDraggingRef.current = false; };

  // ─── 🔥 VISUALISASI HOLOGRAM PARTIKEL MASTER 🔥 ───
  useEffect(() => {
    if (activeStage !== 'hologram') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 350;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const particleCount = 4000;
    const particles: { x: number; y: number; z: number; tx: number; ty: number; tz: number; r: number; id: number }[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({ x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2, z: (Math.random()-0.5)*2, tx: 0, ty: 0, tz: 0, r: Math.random() * 1.2 + 0.5, id: i });
    }

    let time = 0;
    let currentShape = '';
    const animState = { scale: 1, amplitude: 0.08, speed: 0.015, glowIntensity: 0.1 };

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // 🔥 RUMUS MATEMATIKA MASTER 12 BENTUK 🔥
      if (currentShape !== stageData) {
        currentShape = stageData;
        const goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (let i = 0; i < particleCount; i++) {
          const p = particles[i];
          const u = Math.random() * Math.PI * 2;
          const v = Math.acos(Math.random() * 2 - 1);
          const t = (i / particleCount) * Math.PI * 2;

          if (currentShape === 'dna') {
            const spiral = (i / particleCount) * Math.PI * 10; 
            const strand = i % 2 === 0 ? 1 : -1; 
            p.tx = Math.cos(spiral) * 0.3 * strand; 
            p.ty = (i / particleCount) * 2 - 1; 
            p.tz = Math.sin(spiral) * 0.3 * strand;
          } else if (currentShape === 'heart') {
            p.tx = 0.04 * (16 * Math.pow(Math.sin(u), 3));
            p.ty = -0.04 * (13 * Math.cos(u) - 5 * Math.cos(2*u) - 2 * Math.cos(3*u) - Math.cos(4*u));
            p.tz = 0.2 * Math.sin(v);
          } else if (currentShape === 'brain') {
            p.tx = 0.6 * Math.sin(v) * Math.cos(u) * (1 + 0.15*Math.sin(u*8)*Math.sin(v*8));
            p.ty = 0.5 * Math.cos(v);
            p.tz = 0.7 * Math.sin(v) * Math.sin(u);
          } else if (currentShape === 'atom') {
            if (i < 500) { p.tx = 0.15*Math.sin(v)*Math.cos(u); p.ty = 0.15*Math.cos(v); p.tz = 0.15*Math.sin(v)*Math.sin(u); }
            else if (i < 1500) { p.tx = 0.8*Math.cos(t); p.ty = 0.8*Math.sin(t); p.tz = 0.05*(Math.random()-0.5); }
            else if (i < 2500) { p.tx = 0.8*Math.cos(t); p.ty = 0.05*(Math.random()-0.5); p.tz = 0.8*Math.sin(t); }
            else { p.tx = 0.05*(Math.random()-0.5); p.ty = 0.8*Math.cos(t); p.tz = 0.8*Math.sin(t); }
          } else if (currentShape === 'virus') {
            const spike = Math.pow(Math.sin(u*6)*Math.sin(v*6), 4) * 0.4;
            const r = 0.5 + spike;
            p.tx = r * Math.sin(v) * Math.cos(u); p.ty = r * Math.cos(v); p.tz = r * Math.sin(v) * Math.sin(u);
          } else if (currentShape === 'galaxy') {
            const r = 0.05 * (i % 20); const angle = r * 5 + (Math.random()*0.5);
            p.tx = r * Math.cos(angle); p.ty = 0.1 * (Math.random()-0.5); p.tz = r * Math.sin(angle);
          } else if (currentShape === 'rocket') {
            if (i < 2000) { p.tx = 0.2*Math.cos(u); p.ty = (i/2000)*1.2-0.6; p.tz = 0.2*Math.sin(u); }
            else if (i < 3000) { const coneR = 0.2 * (1 - ((i-2000)/1000)); p.tx = coneR*Math.cos(u); p.ty = 0.6 + ((i-2000)/1000)*0.4; p.tz = coneR*Math.sin(u); }
            else { p.tx = 0.4*Math.cos(u); p.ty = -0.6 - (Math.random()*0.3); p.tz = 0.4*Math.sin(u); } // Api
          } else if (currentShape === 'car') {
            if (i < 2000) { p.tx = (Math.random()-0.5)*1.2; p.ty = (Math.random()-0.5)*0.3; p.tz = (Math.random()-0.5)*0.6; } // Body
            else if (i < 3000) { p.tx = (Math.random()-0.5)*0.6; p.ty = 0.15 + Math.random()*0.3; p.tz = (Math.random()-0.5)*0.5; } // Cabin
            else { p.tx = (i%2===0?-0.4:0.4); p.ty = -0.15; p.tz = (i%4<2?-0.3:0.3); } // 4 Roda
          } else if (currentShape === 'fetus') {
             if (i < 800) { p.tx = 0.25*Math.sin(v)*Math.cos(u); p.ty = 0.25*Math.sin(v)*Math.sin(u)-0.3; p.tz = 0.25*Math.cos(v); }
             else if (i < 2500) { p.tx = 0.3*Math.sin(v)*Math.cos(u); p.ty = 0.4*Math.sin(v)*Math.sin(u)+0.15; p.tz = 0.25*Math.cos(v); }
             else { p.tx = 0.8*Math.sin(v)*Math.cos(u); p.ty = 0.8*Math.sin(v)*Math.sin(u); p.tz = 0.8*Math.cos(v); }
          } else { // Sphere default
            const y = 1 - (i / (particleCount - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const theta = ((2 * Math.PI) / goldenRatio) * i;
            p.tx = Math.cos(theta) * r; p.ty = y; p.tz = Math.sin(theta) * r;
          }
        }
      }

      const currentStatus = statusRef.current;
      const targetAnim = currentStatus === 'speaking' ? { scale: 1.1, amplitude: 0.15, speed: 0.03, glowIntensity: 0.25 } 
                       : currentStatus === 'processing' ? { scale: 0.95, amplitude: 0.04, speed: 0.06, glowIntensity: 0.15 } 
                       : { scale: 1.0, amplitude: 0.05, speed: 0.01, glowIntensity: 0.08 };

      const lf = 0.05;
      animState.scale += (targetAnim.scale - animState.scale) * lf;
      animState.amplitude += (targetAnim.amplitude - animState.amplitude) * lf;
      animState.speed += (targetAnim.speed - animState.speed) * lf;
      animState.glowIntensity += (targetAnim.glowIntensity - animState.glowIntensity) * lf;

      time += animState.speed;
      const cx = size / 2, cy = size / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150 * animState.scale);
      
      // Pewarnaan dinamis
      let glowColor = `rgba(255,255,255,${animState.glowIntensity})`;
      if (currentShape === 'dna' || currentShape === 'virus') glowColor = `rgba(74,222,128,${animState.glowIntensity})`;
      else if (currentShape === 'heart' || currentShape === 'rocket') glowColor = `rgba(244,63,94,${animState.glowIntensity})`;
      else if (currentShape === 'fetus' || currentShape === 'brain' || currentShape === 'galaxy') glowColor = `rgba(167,139,250,${animState.glowIntensity})`;
      else if (currentShape === 'atom') glowColor = `rgba(56,189,248,${animState.glowIntensity})`;

      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        
        p.x += (p.tx - p.x) * 0.05; p.y += (p.ty - p.y) * 0.05; p.z += (p.tz - p.z) * 0.05;

        const noise = Math.sin(p.x * 4 + time) * Math.cos(p.y * 4 - time) * Math.sin(p.z * 4 + time);
        const rFactor = 110 * animState.scale * (1 + noise * animState.amplitude);

        // 🔥 LOGIKA ROTASI DARI JARI USER (INTERAKTIF) 🔥
        const rotX = time * 0.1 + rotationRef.current.x; 
        const rotY = time * 0.2 + rotationRef.current.y;
        
        const y1 = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
        const z1 = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
        const x2 = p.x * Math.cos(rotY) + z1 * Math.sin(rotY);
        const z2 = -p.x * Math.sin(rotY) + z1 * Math.cos(rotY);

        const px = cx + x2 * rFactor;
        const py = cy + y1 * rFactor;

        let depthAlpha = Math.max(0.1, Math.min(1, (z2 + 1.5) / 2.5));
        const finalAlpha = depthAlpha * (currentStatus === 'speaking' ? 0.95 : 0.6);

        let pColor = `rgba(255,255,255,${finalAlpha})`;
        if (currentShape === 'dna' || currentShape === 'virus') pColor = `rgba(74,222,128,${finalAlpha})`;
        else if (currentShape === 'heart' || (currentShape === 'rocket' && i > 3000)) pColor = `rgba(244,63,94,${finalAlpha})`;
        else if (currentShape === 'atom') pColor = i < 500 ? `rgba(244,63,94,${finalAlpha})` : `rgba(56,189,248,${finalAlpha})`;
        else if (currentShape === 'fetus') pColor = i >= 2500 ? `rgba(125,211,252,${finalAlpha * 0.3})` : `rgba(167,139,250,${finalAlpha})`;
        else if (currentShape === 'brain' || currentShape === 'galaxy') pColor = `rgba(167,139,250,${finalAlpha})`;

        ctx.fillStyle = pColor;
        ctx.fillRect(px, py, p.r, p.r);
      }

      ctx.globalCompositeOperation = 'source-over';
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [activeStage, stageData]); 

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none pointer-events-auto" style={{ opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease' }}>
      
      {/* ─── PANGGUNG DINAMIS ─── */}
      <div className="flex-1 flex items-center justify-center relative">
        
        {/* Hologram Partikel (Bisa di-swipe/rotasi) */}
        {activeStage === 'hologram' && (
          <canvas 
            ref={canvasRef} 
            style={{ width: '100%', maxWidth: '400px', height: '400px', touchAction: 'none', cursor: 'grab' }} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}

        {activeStage === 'map' && (
          <div className="w-full h-full p-4 flex flex-col animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-2 mb-3 text-sky-400">
              <MapIcon size={20} />
              <span className="font-bold tracking-widest uppercase text-sm">Menampilkan Lokasi: {stageData}</span>
            </div>
            <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(56,189,248,0.2)] pointer-events-auto">
               <iframe 
                  width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} 
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=108.53,-6.74,108.57,-6.70&layer=mapnik&marker=-6.72,108.55`} 
                  style={{ filter: 'invert(90%) hue-rotate(180deg) contrast(150%)' }} 
                />
            </div>
          </div>
        )}

        {activeStage === 'code' && (
           <div className="w-full h-[60%] px-6 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="flex items-center gap-2 mb-3 text-green-400">
                <Code size={20} />
                <span className="font-bold tracking-widest uppercase text-sm">Terminal Sandbox</span>
              </div>
              <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-[#222] p-5 shadow-[0_0_30px_rgba(74,222,128,0.1)] flex flex-col">
                 <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"/>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                    <div className="w-3 h-3 rounded-full bg-green-500"/>
                    <span className="ml-2 text-xs text-white/50 font-mono">cylen-sandbox ~ {stageData}</span>
                 </div>
                 <div className="flex-1 overflow-auto text-green-400/80 font-mono text-xs leading-relaxed">
                   {`> Inisialisasi environment...\n> Menjalankan kompilasi ${stageData}...\n> Merender hasil eksekusi...\n\n[Sistem] Kode telah diverifikasi. Tinjau kembali di layar Chat.`}
                 </div>
              </div>
           </div>
        )}
      </div>

      <div className="pb-8 px-6 relative z-10 bg-gradient-to-t from-black via-black to-transparent">
        <div className="flex flex-col items-center justify-center gap-1 mb-8">
          <div className="text-white/90 font-medium text-lg tracking-wide text-center px-4 max-w-[80%] break-words">
            {uiText}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${status === 'speaking' ? 'bg-green-400 shadow-[0_0_10px_#4ade80] animate-pulse' : status === 'processing' ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8] animate-bounce' : 'bg-white/70 shadow-[0_0_8px_white] animate-pulse'}`} />
            <span className="text-white/50 text-[12px] font-bold tracking-widest uppercase">
              {status === 'speaking' ? 'Cylen Berbicara' : status === 'processing' ? 'Memproses Data' : 'Mendengarkan'}
            </span>
          </div>
        </div>

        {/* Indikator Panggung Aktif */}
        <div className="flex items-center justify-center gap-4 mb-4">
           <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeStage === 'hologram' ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-white/30'}`}><Box size={16}/></div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeStage === 'map' ? 'bg-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'bg-white/5 text-white/30'}`}><MapIcon size={16}/></div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeStage === 'code' ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'bg-white/5 text-white/30'}`}><Code size={16}/></div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-full p-2 border border-white/10 backdrop-blur-md pointer-events-auto">
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm font-medium tracking-wide">Mode Suara Langsung</div>
          <button onClick={handleClose} className="px-6 py-2.5 rounded-full bg-white text-black font-extrabold flex items-center gap-2 hover:bg-gray-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <X size={18} strokeWidth={3} /><span>Tutup</span>
          </button>
        </div>
      </div>
    </div>
  );
};
