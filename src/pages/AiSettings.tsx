import React from 'react';
import { ArrowLeft, Zap, ShieldCheck } from 'lucide-react';

export const AiSettings = ({ onBack, tempApiKey, setTempApiKey, tempPrompt, setTempPrompt }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - Ngikutin style profil lo */}
      <div className="flex items-center px-4 py-5 border-b border-gray-100">
        <button onClick={onBack} className="p-1">
          <ArrowLeft size={24} />
        </button>
        <h2 className="flex-1 text-center font-bold text-[17px] pr-8">Kendalikan Cylen</h2>
      </div>

      <div className="p-5 flex flex-col gap-8">
        
        {/* Kolom 1: Instruksi Respon */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-gray-400" />
            <span className="font-bold text-[14px] text-gray-800 uppercase tracking-tight">Instruksi Respon</span>
          </div>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            Tuliskan bagaimana Cylen harus bersikap. Kamu bisa mengatur gaya bicara, panjang jawaban, atau peran spesifik Cylen di sini.
          </p>
          <textarea
            value={tempPrompt}
            onChange={(e) => setTempPrompt(e.target.value)}
            placeholder="Contoh: Selalu jawab dengan singkat, gunakan bahasa gaul, dan panggil aku 'Boss'..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-black transition-all min-h-[150px] resize-none"
          />
        </div>

        {/* Kolom 2: API Key */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-gray-400" />
            <span className="font-bold text-[14px] text-gray-800 uppercase tracking-tight">API Key Pribadi</span>
          </div>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            Gunakan kunci akses kamu sendiri untuk melewati batas kuota harian Telierlabs.
          </p>
          <input
            type="password"
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-[14px] outline-none focus:border-black transition-all"
          />
        </div>

        {/* Note buat riset */}
        <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            Data di atas hanya aktif selama aplikasi dibuka (Live State). <br/>
            Me-refresh halaman akan mengembalikan Cylen ke mode standar.
          </p>
        </div>
      </div>
    </div>
  );
};
