import React, { useState } from 'react';
import { ArrowLeft, Github } from 'lucide-react';

export const IntegrationPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => {
  // State sementara buat ngetes perubahan tombol Connect -> Connected
  const [githubConnected, setGithubConnected] = useState(false);

  const handleConnectGithub = () => {
    if (githubConnected) {
      setGithubConnected(false);
      showToast("GitHub terputus.");
    } else {
      setGithubConnected(true);
      showToast("Membuka autentikasi GitHub...");
      // Nanti logika OAuth atau masukin PAT GitHub taruh di sini bos
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/40 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors active:scale-95">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personal Intelligence</h1>
      </header>
      
      <div className="p-4 pt-6 flex flex-col gap-4">
        <p className="text-[13px] text-[var(--mu)] -mt-2 mb-2 px-1 font-medium leading-relaxed">
          Sambungkan Cylen dengan ekosistem lain untuk memberikan akses baca, tulis, dan analisis ke data pribadi Anda.
        </p>
        
        {/* LIST INTEGRASI */}
        <div className="flex flex-col gap-3">
          
          {/* GITHUB CARD */}
          <div className="flex items-center justify-between p-4 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl shadow-sm hover:border-[var(--text)]/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 flex items-center justify-center bg-[var(--bg)] border border-[var(--bd)] rounded-full text-[var(--text)] group-hover:scale-105 transition-transform">
                <Github size={22} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[16px] text-[var(--text)] tracking-tight">GitHub</span>
                <span className="text-[11px] font-medium text-[var(--mu)] mt-0.5">Kode & Repositori</span>
              </div>
            </div>
            
            <button
              onClick={handleConnectGithub}
              className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all active:scale-95 ${
                githubConnected 
                ? 'bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)]' 
                : 'text-[var(--text)] bg-[var(--text)]/5 hover:bg-[var(--text)]/10'
              }`}
            >
              {githubConnected ? 'Connected' : 'Connect'}
            </button>
          </div>

          {/* CONTOH LAIN: Bisa lo tambahin Notion, Google Drive, dll di bawah sini dengan format yang sama */}
          
        </div>
      </div>
    </div>
  );
};
