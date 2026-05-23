import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithGoogle } from '../services/authService';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      console.error(error);
      setErrorMsg('Gagal menginisialisasi gerbang login. Periksa koneksi Anda.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans">
      
      {/* Background Glow Effect Minimalis */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--text)] opacity-[0.02] rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 flex w-full max-w-md flex-col items-center px-6 text-center"
      >
        {/* Teks Futuristik */}
        <div className="mb-12 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-4 h-16 w-16 rounded-2xl bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center shadow-2xl"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text)]">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>
          
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">
            CYLEN <span className="opacity-40">CORE</span>
          </h1>
          <p className="text-[13px] font-bold tracking-[0.2em] uppercase text-[var(--mu)]">
            Telierlabs Neural Network
          </p>
        </div>

        {/* Tombol Login (Elegan & Ukuran Lega) */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="group relative flex w-full items-center justify-center gap-4 rounded-2xl bg-[var(--ac)] px-6 py-4 text-[16px] font-bold text-[var(--at)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
        >
          {isLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--at)] border-t-transparent" />
          ) : (
            <>
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Lanjutkan dengan Google
            </>
          )}
        </button>

        {errorMsg && (
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
            className="mt-6 text-[13px] font-medium text-red-500"
          >
            {errorMsg}
          </motion.p>
        )}

        <div className="mt-12 text-center text-[11px] font-medium uppercase tracking-widest text-[var(--mu)] opacity-60">
          Secured Gateway // V1.0
        </div>
      </motion.div>
    </div>
  );
};
