import React, { useState } from 'react';
import SimulationCanvas from './SimulationCanvas';
import { SimulationSpec } from '../types/simulation';

// Fungsi simulasi pemanggilan Gemini API (Ganti dengan API Call asli kamu)
async function fetchGeminiSpecAPI(prompt: string): Promise<SimulationSpec | null> {
  try {
    // Panggil endpoint backend / Gemini API kamu di sini...
    // const res = await fetch('/api/gemini', { ... });
    return null; // Return null jika error / gagal
  } catch {
    return null;
  }
}

export default function LiveVoiceMode() {
  const [activeSpec, setActiveSpec] = useState<SimulationSpec | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Alur Suara Cylen Utama
  const handleVoiceInput = async (transcript: string) => {
    // 1. Respon suara cepat dan alami (non-blocking)
    playTTS("Baik, saya siapkan simulasinya.");

    // 2. Aktifkan getaran partikel halus di panggung saat AI "berpikir"
    setIsProcessing(true);

    // 3. Request ke Gemini
    const newSpec = await fetchGeminiSpecAPI(transcript);

    // 4. Hentikan getaran
    setIsProcessing(false);

    if (newSpec) {
      // BERHASIL: Partikel morphing ke bentuk target baru
      setActiveSpec(newSpec);
      playTTS(newSpec.voiceResponse);
    } else {
      // GAGAL: activeSpec TIDAK DITOUCH! Partikel tahan posisi terakhir
      playTTS("Maaf, simulasi gagal dibuat.");
    }
  };

  function playTTS(text: string) {
    // Integrasi fungsi TTS bawaan Cylen kamu di sini
    console.log("TTS Speaking:", text);
  }

  return (
    <div className="w-screen h-screen bg-black relative">
      {/* 3D Canvas Partikel Hologram Utama */}
      <SimulationCanvas spec={activeSpec} isProcessing={isProcessing} />

      {/* Kontrol UI Overlay Voice Cylen Kamu */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <button
          onClick={() => handleVoiceInput("Tampilkan struktur DNA")}
          className="px-6 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 rounded-full text-sm backdrop-blur-md transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]"
        >
          Tes Voice: "Tampilkan DNA"
        </button>
      </div>
    </div>
  );
}
