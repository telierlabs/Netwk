import React, { useState } from 'react';

interface HeaderProps {
  onLogin?: () => void;
  onNavigate?: (page: 'home' | 'chat' | 'build' | 'imagine' | 'voice' | 'docs' | 'pricing') => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogin, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false); // Buat buka/tutup list Products

  const handleNav = (page: any) => {
    if (onNavigate) {
      onNavigate(page);
      setIsMenuOpen(false);
    }
  };

  const scrollToNews = () => {
    setIsMenuOpen(false);
    // Kalau lagi gak di home, paksa ke home dulu
    if (onNavigate) onNavigate('home');
    
    // Tunggu render bentar, baru scroll ke elemen ID 'news-section'
    setTimeout(() => {
      const newsSection = document.getElementById('news-section');
      if (newsSection) {
        newsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <>
      <header style={{ 
        position: 'fixed', top: 0, left: 0, width: '100%', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '12px 24px', zIndex: 100, 
        background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)' 
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleNav('home')}>
          <img 
            src="/82374-removebg-preview.png" 
            alt="Logo Cylen" 
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={onLogin}
            style={{ padding: '8px 18px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Try for free
          </button>
          
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ background: 'transparent', border: 'none', width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: '#fff' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Menu dropdown dari atas */}
      <div style={{ 
        position: 'fixed', top: isMenuOpen ? '0' : '-100%', left: 0, width: '100%', height: '100dvh',
        background: '#000', paddingTop: '80px', zIndex: 90, 
        transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Products Dropdown */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div 
              onClick={() => setIsProductsOpen(!isProductsOpen)} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '20px', fontWeight: 500, color: '#fff' }}>Products</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ transform: isProductsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            
            {/* Isi Products */}
            {isProductsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px', paddingLeft: '12px' }}>
                <div onClick={() => handleNav('chat')} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>Chat <span style={{ fontSize: '10px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>BETA</span></div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Reasoning, knowledge, and web search.</div>
                </div>
                <div onClick={() => handleNav('build')} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>Build <span style={{ fontSize: '10px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>BETA</span></div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Plan, edit, and review code with AI.</div>
                </div>
                <div onClick={() => handleNav('imagine')} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>Imagine <span style={{ fontSize: '10px', color: '#f39c12', background: 'rgba(243, 156, 18, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>SOON</span></div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Generate and edit images and video.</div>
                </div>
                <div onClick={() => handleNav('voice')} style={{ cursor: 'pointer' }}>
                  <div style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>Voice <span style={{ fontSize: '10px', color: '#f39c12', background: 'rgba(243, 156, 18, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>SOON</span></div>
                  <div style={{ fontSize: '13px', color: '#666' }}>Build voice agents with sub-second latency.</div>
                </div>
              </div>
            )}
          </div>

          <div onClick={() => handleNav('pricing')} style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '20px', fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
            Pricing
          </div>

          <div onClick={() => handleNav('docs')} style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '20px', fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
            Documentation
          </div>

          <div onClick={scrollToNews} style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '20px', fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
            News
          </div>

        </div>

        {/* Tombol Login Gede di Bawah Menu */}
        <div style={{ padding: '24px', textAlign: 'center', marginTop: 'auto' }}>
          <button onClick={onLogin} style={{ width: '100%', maxWidth: '400px', padding: '16px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Try for free
          </button>
        </div>
      </div>
    </>
  );
};
