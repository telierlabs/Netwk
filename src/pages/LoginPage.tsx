import React, { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { Header } from '../features/landing/Header';
import { HeroAuth } from '../features/landing/HeroAuth';
import { DemoCards } from '../features/landing/DemoCards';
import { Metrics } from '../features/landing/Metrics';
import { LatestNews } from '../features/landing/LatestNews';
import { Footer } from '../features/landing/Footer'; 

// 👇 Import 4 halaman detail yang baru dibuat
import { ChatDetail } from '../features/landing/ChatDetail';
import { BuildDetail } from '../features/landing/BuildDetail';
import { ImagineDetail } from '../features/landing/ImagineDetail';
import { VoiceDetail } from '../features/landing/VoiceDetail';

export const LoginPage: React.FC<{ onLoginSuccess?: () => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 👇 State buat nyimpen lagi buka halaman apa
  const [activePage, setActivePage] = useState<'home' | 'chat' | 'build' | 'imagine' | 'voice'>('home');

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

  // 👇 Routing sederhana, nampilin komponen yang sesuai
  if (activePage === 'chat') return <ChatDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;
  if (activePage === 'build') return <BuildDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;
  if (activePage === 'imagine') return <ImagineDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;
  if (activePage === 'voice') return <VoiceDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;

  // Kalau activePage === 'home', tampilin Landing Page utama
  return (
    <div style={{ 
      background: '#000', 
      height: '100dvh', 
      width: '100vw', 
      color: '#fff', 
      fontFamily: 'Sora, sans-serif',
      overflowY: 'auto', 
      overflowX: 'hidden' 
    }}>
      <Header onLogin={handleLogin} />
      <main style={{ width: '100%' }}>
        <HeroAuth onLogin={handleLogin} isLoading={isLoading} errorMsg={errorMsg} />
        
        {/* 👇 Lempar fungsi ganti halaman ke DemoCards */}
        <DemoCards onNavigate={(page) => setActivePage(page)} />
        
        <Metrics />
        <LatestNews />
        <Footer />
      </main>
      
      <style>{`
        html, body, #root { overflow: auto !important; height: auto !important; }
        .spinner { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
