import React, { useState, useEffect } from 'react';
import { ArrowLeft, Github, Check, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface IntegrationPageProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const IntegrationPage = ({ onBack, showToast }: { onBack: () => void, showToast: (msg: string) => void }) => {
  const [active, setActive] = useState(false);
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load token jika sebelumnya pernah disimpan di localStorage (sementara sebelum ke database)
  useEffect(() => {
    const savedToken = localStorage.getItem('netwk_github_token');
    const githubStatus = localStorage.getItem('netwk_github_status');
    if (savedToken) {
      setToken(savedToken);
    }
    if (githubStatus === 'active') {
      setActive(true);
      setIsSaved(true);
    }
  }, []);

  const handleToggle = () => {
    if (active) {
      // Jika dinonaktifkan, matikan status tapi simpan token di input
      setActive(false);
      localStorage.setItem('netwk_github_status', 'inactive');
      showToast('Cylen Rival diputus dari GitHub');
    } else {
      // Jika diaktifkan, validasi apakah token sudah diisi
      if (!token.trim()) {
        showToast('Masukkan GitHub Access Token terlebih dahulu');
        return;
      }
      setActive(true);
      setIsSaved(true);
      localStorage.setItem('netwk_github_token', token);
      localStorage.setItem('netwk_github_status', 'active');
      showToast('Cylen Rival terhubung ke GitHub');
    }
  };

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showToast('Token tidak boleh kosong');
      return;
    }
    setIsSaved(true);
    localStorage.setItem('netwk_github_token', token);
    showToast('Token GitHub berhasil disimpan');
  };

  const handleReset = () => {
    setIsSaved(false);
    setActive(false);
    setToken('');
    localStorage.removeItem('netwk_github_token');
    localStorage.removeItem('netwk_github_status');
    showToast('Kredensial GitHub dihapus');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      {/* Header */}
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">Personal Intelligence</h1>
      </header>

      <div className="p-6 pt-6 flex flex-col gap-6">
        <p className="text-sm text-[var(--mu)] -mt-4 mb-2 px-2 font-medium">Sambungkan Cylen dengan ekosistem aplikasi eksternal.</p>

        {/* GitHub Card Integration */}
        <div className="bg-[var(--sf)] p-5 rounded-[24px] border border-[var(--bd)]/30 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)]">
                <Github size={22} />
              </div>
              <div>
                <div className="font-bold text-[16px] text-[var(--text)]">GitHub API Engine</div>
                <div className="text-[12px] text-[var(--mu)] font-medium mt-0.5">Automasi repositori & push kode</div>
              </div>
            </div>
            
            {/* Toggle Switch Matte Black & White Style */}
            <button 
              onClick={handleToggle} 
              className={cn(
                "w-14 h-8 rounded-full transition-all relative border border-transparent", 
                active ? "bg-[var(--text)] border-[var(--text)]" : "bg-[var(--bg)] border-[var(--bd)]/40"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full absolute top-1 transition-all", 
                active ? "left-7 bg-[var(--bg)]" : "left-1 bg-[var(--mu)]"
              )} />
            </button>
          </div>

          <hr className="border-[var(--bd)]/10 -mx-5" />

          {/* Form Input Token */}
          {!isSaved ? (
            <form onSubmit={handleSaveToken} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[var(--text)] uppercase tracking-wider px-1">Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                  className="w-full bg-[var(--bg)] border border-[var(--bd)]/30 rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--mu)]/50 focus:outline-none focus:border-[var(--text)] transition-colors font-mono"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-[var(--text)] text-[var(--bg)] font-bold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Simpan & Otorisasi
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs bg-[var(--bg)] border border-[var(--bd)]/20 px-4 py-3 rounded-xl">
                {active ? (
                  <>
                    <Check size={16} className="text-[var(--text)]" />
                    <span className="text-[var(--text)] font-medium">Cylen Rival aktif dan siap memproduksi barang digital.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-[var(--mu)]" />
                    <span className="text-[var(--mu)] font-medium">Token tersimpan. Aktifkan sakelar di atas untuk mengizinkan agen.</span>
                  </>
                )}
              </div>
              <button 
                onClick={handleReset} 
                className="w-full bg-transparent border border-[var(--bd)]/30 text-[var(--text)] font-bold text-sm py-2.5 rounded-xl hover:bg-[var(--bd)]/10 transition-colors"
              >
                Putuskan Akses Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
