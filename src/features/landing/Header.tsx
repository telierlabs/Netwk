import React, { useState } from 'react';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header style={{ 
        position: 'fixed', top: 0, left: 0, width: '100%', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '12px 24px', zIndex: 100, 
        background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)' 
      }}>
        <div style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.5px', color: '#fff' }}>
          Cylen
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button style={{ padding: '8px 18px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Coba gratis
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
        position: 'fixed', top: isMenuOpen ? '0' : '-100%', left: 0, width: '100%', 
        background: '#000', padding: '80px 24px 40px', zIndex: 90, 
        borderBottom: '1px solid #222', transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        <a href="#" style={{ color: '#fff', textDecoration: 'none', fontSize: '24px', fontWeight: 500 }}>Beranda</a>
        <a href="#" style={{ color: '#888', textDecoration: 'none', fontSize: '24px', fontWeight: 500 }}>Dokumentasi</a>
        <a href="#" style={{ color: '#888', textDecoration: 'none', fontSize: '24px', fontWeight: 500 }}>Pembaruan</a>
      </div>
    </>
  );
};
