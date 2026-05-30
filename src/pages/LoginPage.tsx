import React, { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { Header } from '../features/landing/Header';
import { HeroAuth } from '../features/landing/HeroAuth';
import { DemoCards } from '../features/landing/DemoCards';

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
    <div style={{ 
      minHeight: '100vh', width: '100%', 
      background: 'var(--bg, #000000)', color: 'var(--text, #ffffff)', 
      fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column', 
      position: 'relative', overflowX: 'hidden' 
    }}>
      <style>{`
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .spinner { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Header />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <HeroAuth onLogin={handleLogin} isLoading={isLoading} errorMsg={errorMsg} />
        <DemoCards />
      </main>
    </div>
  );
};
