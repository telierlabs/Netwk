import React, { useState, useEffect, useRef } from 'react';
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
import { PageKey, PAGE_TO_PATH, cleanPath, getPageFromPath, HOME_SEO, PAGE_SEO } from '../lib/landingRoutes';

// Update tag <head> yang sudah ada (atau bikin kalau belum ada)
const upsertHead = (selector: string, tag: 'meta' | 'link', attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

// loggedIn = true kalau halaman ini dibuka user yang SUDAH login (misal lewat link di Profil).
// Tombol "kembali" dan "login" lalu membawa dia ke app, bukan ke landing page.
export const LoginPage: React.FC<{ onLoginSuccess?: () => void; loggedIn?: boolean }> = ({ onLoginSuccess, loggedIn = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [activePage, setActivePage] = useState<PageKey>(getPageFromPath);

  // Sync activePage -> address bar (semua halaman punya URL sendiri)
  useEffect(() => {
    const targetPath = PAGE_TO_PATH[activePage] || '/';
    if (cleanPath(window.location.pathname) !== targetPath) {
      window.history.pushState({ activePage }, '', targetPath);
    }
  }, [activePage]);

  // Title, description, dan canonical per halaman (buat Google & share link)
  useEffect(() => {
    const seo = activePage === 'home' ? HOME_SEO : PAGE_SEO[activePage];
    document.title = seo.title;
    upsertHead('meta[name="description"]', 'meta', { name: 'description', content: seo.description });
    upsertHead('link[rel="canonical"]', 'link', { rel: 'canonical', href: window.location.origin + (PAGE_TO_PATH[activePage] || '/') });
  }, [activePage]);

  // Dengerin tombol back/forward browser
  useEffect(() => {
    const onPopState = () => setActivePage(getPageFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Kalau user BARU saja login saat sedang di halaman lain (mis. /chat atau /pricing),
  // arahkan ke app. Tanpa ini dia tetap nyangkut di halaman landing setelah login.
  const startedLoggedIn = useRef(loggedIn);
  useEffect(() => {
    if (loggedIn && !startedLoggedIn.current && activePage !== 'home') {
      window.location.assign('/');
    }
  }, [loggedIn, activePage]);

  const handleLogin = async () => {
    if (loggedIn) { window.location.assign('/'); return; }
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

  const goHome = () => { if (loggedIn) window.location.assign('/'); else setActivePage('home'); };
  const go = (p: string) => setActivePage(p as PageKey);

  if (activePage === 'chat') return <ChatDetail onBack={goHome} onLogin={handleLogin} onViewDocs={() => go('docs')} />;
  if (activePage === 'build') return <BuildDetail onBack={goHome} onLogin={handleLogin} onViewDocs={() => go('docs')} />;
  if (activePage === 'imagine') return <ImagineDetail onBack={goHome} onLogin={handleLogin} onViewDocs={() => go('docs')} />;
  if (activePage === 'voice') return <VoiceDetail onBack={goHome} onLogin={handleLogin} onDocs={() => go('docs')} />;
  if (activePage === 'docs') return <DocsDetail onBack={goHome} onLogin={handleLogin} />;
  if (activePage === 'pricing') return <PricingDetail onBack={goHome} onLogin={handleLogin} />;
  if (activePage === 'about') return <LegalDetail type="about" onBack={goHome} onNavigate={go} />;
  if (activePage === 'privacy') return <LegalDetail type="privacy" onBack={goHome} onNavigate={go} />;
  if (activePage === 'terms') return <LegalDetail type="terms" onBack={goHome} onNavigate={go} />;
  if (activePage === 'contact') return <LegalDetail type="contact" onBack={goHome} onNavigate={go} />; 
  if (activePage === 'news-detail') return <NewsDetail onBack={goHome} />; 

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
        onNavigate={go} 
      />

      <main style={{ width: '100%' }}>
        <HeroAuth 
          onLogin={handleLogin} 
          onViewDocs={() => go('docs')} 
          isLoading={isLoading} 
          errorMsg={errorMsg} 
        />
        <DemoCards onNavigate={go} />
        <Metrics />
        <VisionStats />
        <LatestNews onNavigate={go} />
        <Footer onNavigate={go} />
      </main>
      
      <style>{`
        html, body, #root { overflow: auto !important; height: auto !important; }
        .spinner { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
