import React, { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { Header } from '../features/landing/Header';
import { HeroAuth } from '../features/landing/HeroAuth';
import { DemoCards } from '../features/landing/DemoCards';
import { Metrics } from '../features/landing/Metrics';
import { LatestNews } from '../features/landing/LatestNews';
// 👇 Tambahin import Footer ini
import { Footer } from '../features/landing/Footer'; 

export const LoginPage: React.FC<{ onLoginSuccess?: () => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      setErrorMsg(error?.message || 'Login gagal.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', width: '100%', color: '#fff', fontFamily: 'Sora, sans-serif' }}>
      <Header />
      <main style={{ width: '100%' }}>
        <HeroAuth onLogin={handleLogin} isLoading={isLoading} errorMsg={errorMsg} />
        <DemoCards />
        <Metrics />
        <LatestNews />
        
        {/* 👇 Panggil komponennya di sini, hapus tag <footer statis> sebelumnya */}
        <Footer />
        
      </main>
      
      <style>{`
        .spinner { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
