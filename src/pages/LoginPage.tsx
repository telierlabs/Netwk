import React, { useState } from 'react';
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
      console.error("Login error:", error);
      setErrorMsg(error?.message || 'Gagal masuk. Coba lagi.');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        // ── PAKE VARIABEL CSS BIAR OTOMATIS GANTI WARNA ──
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        fontFamily: "'Sora', sans-serif",
        color: 'var(--text)',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 480, padding: '0 28px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <h1 style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, color: 'var(--text)', marginTop: 72, marginBottom: 0, lineHeight: 1 }}>
          Cylen
        </h1>

        {/* DOME GRID */}
        <div style={{ width: '100%', marginTop: 18, overflow: 'hidden', lineHeight: 0 }}>
          <svg viewBox="0 0 480 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', display: 'block' }}>
            <defs>
              <radialGradient id="domeGrad" cx="50%" cy="100%" r="70%">
                <stop offset="0%" stopColor="var(--sf)" />
                <stop offset="100%" stopColor="var(--bg)" />
              </radialGradient>
            </defs>
            <ellipse cx="240" cy="120" rx="260" ry="110" fill="url(#domeGrad)" />
          </svg>
        </div>

        <div style={{ width: '100%', textAlign: 'center', marginTop: 28, marginBottom: 40 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.2 }}>
            Mulai perjalananmu bersama Cylen.
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 400, color: 'var(--mu)', lineHeight: 1.65 }}>
            Masuk untuk mengakses semua fitur<br />yang sudah kami siapkan untukmu.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            maxWidth: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px 20px',
            borderRadius: 100,
            background: 'var(--text)',
            border: 'none',
            color: 'var(--bg)',
            fontFamily: "'Sora', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginBottom: errorMsg ? 16 : 72,
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? (
            <div style={{ width: 18, height: 18, border: '2px solid var(--bg)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              {/* Ikon Google disesuaikan warnanya */}
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="var(--bg)" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--bg)" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="var(--bg)" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--bg)" />
              </svg>
              Lanjutkan dengan Google
            </>
          )}
        </button>

        {errorMsg && (
          <p style={{ fontSize: 12.5, color: '#e53e3e', marginBottom: 56, textAlign: 'center' }}>{errorMsg}</p>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--mu)', textAlign: 'center', lineHeight: 1.7 }}>
          Dengan melanjutkan, kamu menyetujui{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Syarat</span>{' '}
          dan{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Kebijakan Privasi</span>{' '}
          kami.
        </p>
      </div>
    </div>
  );
};
