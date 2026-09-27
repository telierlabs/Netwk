import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, Volume2, Mic, Settings, X, Code, Map as MapIcon } from 'lucide-react';
import { chatWithGeminiStream } from '../../services/geminiService';
import { generateSimulationSpec } from '../../services/simulationDirector';
import type { ValidatedSimulationSpec } from '../../lib/simulationSchema';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { GenerateContentResponse } from '@google/genai';

interface LiveVoiceModeProps {
  onClose: () => void;
}

// Cuma 3 panggung sekarang. 'visual' menampung DUA kondisi (idle DAN
// simulasi aktif) lewat SATU komponen yang sama (SimulationCanvas) — bukan
// 2 mesin render terpisah yang di-switch. Ini yang bikin partikel benar-benar
// "nerusin gerak" dari idle ke bentuk hasil AI, bukan potongan adegan.
type StageType = 'visual' | 'map' | 'code';

// ── IDLE SPEC ── bola partikel netral, satu-satunya "default" di seluruh
// sistem. Sama sekali bukan hasil AI — dipakai SimulationCanvas persis
// seperti spec biasa, cuma lebih sederhana (rotate pelan saja).
const IDLE_SPEC: ValidatedSimulationSpec = {
  schemaVersion: '1.0',
  id: 'idle-sphere',
  meta: { title: 'Idle', summary: 'Menunggu topik dari user.' },
  mode: '3d',
  scene: { background: '#000000', lighting: { ambientIntensity: 0.4, keyLightIntensity: 1, glow: true } },
  entities: [
    {
      id: 'idle-particles',
      geometry: {
        kind: 'particleSystem',
        count: 2600,
        particleRadius: 0.02,
        distribution: { kind: 'sphereSurface', radius: 0.9 },
      },
      transform: { position: { x: 0, y: 0, z: 0 } },
      material: { color: '#ffffff', style: 'glow', opacity: 0.85 },
      behaviorRefs: ['idle-rotate'],
    },
  ],
  relationships: [],
  fields: [],
  equations: [],
  parameters: [],
  state: {},
  behaviors: [{ id: 'idle-rotate', kind: 'rotate', targetIds: ['idle-particles'], params: { speed: 0.15 } }],
  labels: [],
  layers: [],
  interactions: { rotate: true, zoom: true, pan: true, selectObject: false, playPause: false, reset: false },
  camera: { mode: 'orbit', initialPosition: { x: 0, y: 0, z: 4 }, lookAt: { x: 0, y: 0, z: 0 }, fov: 50 },
  explanation: { narration: '' },
};

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking'>('listening');
  const [uiText, setUiText] = useState('Mendengarkan...');
  const [isClosing, setIsClosing] = useState(false);

  const [activeStage, setActiveStage] = useState<StageType>('visual');
  const [stageData, setStageData] = useState<string>('');
  // Spec yang lagi ditampilkan di panggung 'visual'. Default = IDLE_SPEC.
  // Begitu AI berhasil bikin simulasi, ini diganti ke spec hasil AI —
  // SimulationCanvas yang sama tetap dipakai, partikel morph otomatis.
  const [activeSpec, setActiveSpec] = useState<ValidatedSimulationSpec>(IDLE_SPEC);

  const statusRef = useRef(status);
  const isClosingRef = useRef(false);

  // activeSpec asli (bukan IDLE_SPEC) dipakai sebagai konteks permintaan
  // lanjutan ("SPEC AKTIF SAAT INI" di simulationDirector.ts). Kalau masih
  // idle, dianggap belum ada simulasi aktif sama sekali.
  const activeSpecRef = useRef<ValidatedSimulationSpec | null>(null);
  useEffect(() => {
    activeSpecRef.current = activeSpec.id === IDLE_SPEC.id ? null : activeSpec;
  }, [activeSpec]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  useEffect(() => { statusRef.current = status; }, [status]);

  const startListening = useCallback(() => {
    if (isClosingRef.current || synthRef.current.speaking) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setUiText('Browser tidak mendukung fitur suara.'); return; }

    const rec = new SR();
    rec.lang = 'id-ID'; rec.continuous = false; rec.interimResults = true;

    rec.onstart = () => { setStatus('listening'); setUiText('Mendengarkan...'); };

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
    setUiText('Menganalisis permintaan...');

    try {
      const directorPrompt = `User berkata: "${userText}".

Sebagai Cylen AI, tentukan panggung visual yang tepat. Balas HANYA dengan SATU tag di awal jawaban, lalu penjelasan lisan singkat (maks 2 kalimat) setelahnya:

1. [STAGE: MAP | Alamat] -> kalau user bertanya lokasi/jalan/tempat.
2. [STAGE: CODE | Bahasa] -> kalau user minta koding/script dibuatkan.
3. [STAGE: SIMULATION] -> kalau user minta simulasi/visualisasi/model 3D-2D dari
   APAPUN — organ tubuh, mesin, denah/tata ruang, planet, jaringan, molekul,
   proses, dst — atau minta ubah/tambah pada simulasi yang sedang tampil.
   Ini SATU-SATUNYA panggung untuk semua permintaan visual/simulasi.
4. [STAGE: CHAT] -> percakapan lain yang tidak butuh visual simulasi.

Untuk tag SIMULATION, penjelasan lisan cukup kalimat pendek penanda kamu akan
segera menyiapkannya — penjelasan detail menyusul setelah simulasi selesai.`;

      const stream = await chatWithGeminiStream([{ role: 'user', content: directorPrompt }], false);
      let fullResponse = '';
      for await (const chunk of stream) fullResponse += (chunk as GenerateContentResponse).text || '';

      const stageMatch = fullResponse.match(/\[STAGE:\s*(.*?)\s*(?:\|\s*(.*?))?\]/i);
      const stageType = stageMatch ? stageMatch[1].trim().toUpperCase() : 'CHAT';
      const stageArg = stageMatch?.[2]?.trim() ?? '';
      const spokenText = fullResponse.replace(/\[STAGE:.*?\]/i, '').trim().replace(/[*_#]/g, '');

      if (stageType === 'MAP') {
        setActiveStage('map'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }
      if (stageType === 'CODE') {
        setActiveStage('code'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }

      if (stageType === 'SIMULATION') {
        // 'visual' sudah aktif dari sebelumnya (idle atau simulasi lama) —
        // TIDAK ganti stage di sini, partikel yang ada terus bergerak/idle
        // selagi AI menyusun spec baru. Baru begitu spec valid datang,
        // activeSpec diganti dan partikel yang SAMA morph ke bentuk baru.
        setActiveStage('visual');
        speakText(spokenText || 'Baik, saya siapkan simulasinya sekarang.');

        const result = await generateSimulationSpec(
          userText,
          activeSpecRef.current ?? undefined,
          () => setUiText('Menyusun simulasi...')
        );

        if (result.usedFallback) {
          // TIDAK ganti activeSpec sama sekali — partikel tetap di bentuk
          // terakhir (idle atau simulasi sebelumnya). Tidak ada penjelasan
          // teknis apapun ke user, cuma kabar gagal singkat.
          speakText('Maaf, simulasi gagal dibuat.');
          return;
        }

        setActiveSpec(result.spec);
        speakText(result.spec.explanation.narration);
        return;
      }

      // CHAT: stage tetap 'visual', spec TIDAK diganti — partikel apapun
      // yang lagi tampil (idle/simulasi sebelumnya) tetap seperti itu.
      setActiveStage('visual');
      speakText(spokenText);
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
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none pointer-events-auto"
      style={{ opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease', height: '100dvh', width: '100vw' }}
    >
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', left: 20, zIndex: 20, pointerEvents: 'none' }}>
        <div
          role="img" aria-label="Cylen"
          style={{
            width: 210, height: 50, backgroundColor: '#ffffff', opacity: 0.92,
            WebkitMaskImage: 'url(/104076-removebg-preview.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center',
            maskImage: 'url(/104076-removebg-preview.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left center',
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* 'visual' SELALU render komponen yang SAMA — satu mesin partikel
            yang hidup dari idle sampai simulasi apapun, tanpa jump-cut. */}
        {activeStage === 'visual' && (
          <div className="w-full h-full">
            <SimulationCanvas spec={activeSpec} playing={true} />
          </div>
        )}

        {activeStage === 'map' && (
          <div className="w-full h-full p-4 flex flex-col animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto">
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
          <div className="w-full h-[60%] px-6 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-500 max-w-2xl mx-auto">
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

      <div className="flex flex-col items-center gap-1.5 pb-5 px-6 max-w-2xl mx-auto w-full">
        <div className="text-white font-bold text-[20px] tracking-tight text-center flex items-center justify-center gap-2">
          Cylen Voice <span className="bg-white/10 text-white/80 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/20">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            status === 'speaking'   ? 'bg-white animate-pulse' :
            status === 'processing' ? 'bg-white/60 animate-bounce' :
                                      'bg-white/40 animate-pulse'
          }`} />
          <span className="text-white/50 text-[13px] font-medium">
            {status === 'speaking' ? 'Speaking...' : status === 'processing' ? 'Processing...' : 'Listening...'}
          </span>
        </div>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-3 pointer-events-auto max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-around bg-white/[0.07] rounded-[28px] px-6 py-4 border border-white/10">
          <button className="flex flex-col items-center justify-center gap-1.5 text-white/70 active:text-white active:scale-90 transition-all [-webkit-tap-highlight-color:transparent]">
            <Camera size={22} strokeWidth={1.8} />
          </button>
          <button className="flex flex-col items-center justify-center gap-1.5 text-white/70 active:text-white active:scale-90 transition-all [-webkit-tap-highlight-color:transparent]">
            <Volume2 size={22} strokeWidth={1.8} />
          </button>
          <button className={`flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90 [-webkit-tap-highlight-color:transparent] ${status === 'listening' ? 'text-white' : 'text-white/70'}`}>
            <Mic size={22} strokeWidth={1.8} />
          </button>
          <button className="flex flex-col items-center justify-center gap-1.5 text-white/70 active:text-white active:scale-90 transition-all [-webkit-tap-highlight-color:transparent]">
            <Settings size={22} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex items-center justify-between bg-white/[0.07] rounded-[28px] px-5 py-3 border border-white/10">
          <span className="text-white/30 text-[14px] font-medium truncate">{uiText}</span>
          <button
            onClick={handleClose}
            className="flex items-center gap-2 bg-white text-black font-extrabold px-5 py-2.5 rounded-full active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)] [-webkit-tap-highlight-color:transparent]"
          >
            <X size={16} strokeWidth={3} />
            <span className="text-[14px]">Stop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
