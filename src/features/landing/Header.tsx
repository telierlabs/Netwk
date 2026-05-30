import React, { useState } from 'react';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', zIndex: 50, position: 'relative' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-1px' }}>
          Cylen
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: 'transparent', border: '1px solid var(--mu, #333)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'var(--text, #fff)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMenuOpen ? (
              <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>
            ) : (
              <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></>
            )}
          </svg>
        </button>
      </header>

      {isMenuOpen && (
        <div style={{ position: 'absolute', top: '72px', left: 0, width: '100%', background: 'var(--bg, #111)', padding: '24px', zIndex: 40, borderBottom: '1px solid var(--mu, #333)', animation: 'slideDown 0.3s ease forwards' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '18px', fontWeight: 500 }}>
            <a href="#" style={{ color: 'var(--text, #fff)', textDecoration: 'none' }}>Beranda</a>
            <a href="#" style={{ color: 'var(--text, #fff)', textDecoration: 'none' }}>Dokumentasi</a>
          </nav>
        </div>
      )}
    </>
  );
};
