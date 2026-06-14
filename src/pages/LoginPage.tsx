import React, { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { Header } from '../features/landing/Header';
import { HeroAuth } from '../features/landing/HeroAuth';
import { DemoCards } from '../features/landing/DemoCards';
import { Metrics } from '../features/landing/Metrics';
import { VisionStats } from '../features/landing/VisionStats'; 
import { LatestNews } from '../features/landing/LatestNews';
import { Footer } from '../features/landing/Footer'; 

import { ChatDetail } from '../features/landing/ChatDetail';
import { BuildDetail } from '../features/landing/BuildDetail';
import { ImagineDetail } from '../features/landing/ImagineDetail';
import { VoiceDetail } from '../features/landing/VoiceDetail';
import { DocsDetail } from '../features/landing/DocsDetail';
import { PricingDetail } from '../features/landing/PricingDetail';
import { LegalDetail } from '../features/landing/LegalDetail'; 
import { NewsDetail } from '../features/landing/NewsDetail'; 

export const LoginPage: React.FC<{ onLoginSuccess?: () => void }> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [activePage, setActivePage] = useState<'home' | 'chat' | 'build' | 'imagine' | 'voice' | 'docs' | 'pricing' | 'about' | 'privacy' | 'terms' | 'news-detail' | 'contact'>('home');

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      if (onLoginSuccess) onLoginSuccess();
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(error?.message || 'Login gagal.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (activePage === 'chat') return <ChatDetail onBack={() => setActivePage('home')} onLogin={handleLogin} onViewDocs={() => setActivePage('docs')} />;
  if (activePage === 'build') return <BuildDetail onBack={() => setActivePage('home')} onLogin={handleLogin} onViewDocs={() => setActivePage('docs')} />;
  if (activePage === 'imagine') return <ImagineDetail onBack={() => setActivePage('home')} onLogin={handleLogin} onViewDocs={() => setActivePage('docs')} />;
  if (activePage === 'voice') return <VoiceDetail onBack={() => setActivePage('home')} onLogin={handleLogin} onViewDocs={() => setActivePage('docs')} />;
  if (activePage === 'docs') return <DocsDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;
  if (activePage === 'pricing') return <PricingDetail onBack={() => setActivePage('home')} onLogin={handleLogin} />;
  if (activePage === 'about') return <LegalDetail type="about" onBack={() => setActivePage('home')} onNavigate={(p) => setActivePage(p as any)} />;
  if (activePage === 'privacy') return <LegalDetail type="privacy" onBack={() => setActivePage('home')} onNavigate={(p) => setActivePage(p as any)} />;
  if (activePage === 'terms') return <LegalDetail type="terms" onBack={() => setActivePage('home')} onNavigate={(p) => setActivePage(p as any)} />;
  if (activePage === 'contact') return <LegalDetail type="contact" onBack={() => setActivePage('home')} onNavigate={(p) => setActivePage(p as any)} />; 
  if (activePage === 'news-detail') return <NewsDetail onBack={() => setActivePage('home')} />; 

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
      <Header 
        onLogin={handleLogin} 
        onNavigate={(page) => setActivePage(page as any)} 
      />

      <main style={{ width: '100%' }}>
        <HeroAuth 
          onLogin={handleLogin} 
          onViewDocs={() => setActivePage('docs')} 
          isLoading={isLoading} 
          errorMsg={errorMsg} 
        />
        <DemoCards onNavigate={(page) => setActivePage(page as any)} />
        <Metrics />
        <VisionStats />
        <LatestNews onNavigate={(page) => setActivePage(page as any)} />
        <Footer onNavigate={(page) => setActivePage(page as any)} />
      </main>
      
      <style>{`
        html, body, #root { overflow: auto !important; height: auto !important; }
        .spinner { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
