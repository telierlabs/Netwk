import React from 'react';

export const Footer: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {
  
  const handleNav = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <footer style={{ width: '100%', padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a', color: '#888', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* Top/Brand Section */}
        <div>
          <div style={{ fontSize: '12px', marginBottom: '12px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>A part of</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/IMG_20260220_144200.png" 
              alt="Teliernews" 
              style={{ 
                height: '35px', 
                width: 'auto', 
                objectFit: 'contain',
                // 👇 Filter ini bikin logo gelap lu jadi putih terang benderang
                filter: 'brightness(0) invert(1)' 
              }} 
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '16px', opacity: 0.5 }}>
            &copy; 2026 Teliernews. All rights reserved.
          </div>
        </div>

        {/* Links Section - 4 Columns ala Grok */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '40px' }}>
          
          {/* Kolom 1: Products */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Products</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <a href="#" onClick={(e) => handleNav(e, 'chat')} style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}>Cylen Chat</a>
              <a href="#" onClick={(e) => handleNav(e, 'build')} style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}>Cylen Build</a>
              <a href="#" onClick={(e) => handleNav(e, 'imagine')} style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}>Cylen Imagine</a>
              <a href="#" onClick={(e) => handleNav(e, 'voice')} style={{ color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}>Cylen Voice</a>
            </div>
          </div>

          {/* Kolom 2: Ecosystem & Social */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Ecosystem</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <a href="https://teliernews.com" target="_blank" rel="noreferrer" style={{ color: '#888', textDecoration: 'none' }}>Teliernews Portal</a>
              <a href="https://www.instagram.com/cylenai?igsh=NjBuNHFvY2E4bTM1" target="_blank" rel="noreferrer" style={{ color: '#888', textDecoration: 'none' }}>Instagram</a>
              <a href="#" style={{ color: '#555', textDecoration: 'none', cursor: 'not-allowed' }}>GitHub (Soon)</a>
            </div>
          </div>

          {/* Kolom 3: Company */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <a href="#" onClick={(e) => handleNav(e, 'about')} style={{ color: '#888', textDecoration: 'none' }}>About Us</a>
              <a href="#" onClick={(e) => handleNav(e, 'news-detail')} style={{ color: '#888', textDecoration: 'none' }}>Latest News</a>
              <a href="#" onClick={(e) => handleNav(e, 'contact')} style={{ color: '#888', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>

          {/* Kolom 4: Legal */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <a href="#" onClick={(e) => handleNav(e, 'pricing')} style={{ color: '#888', textDecoration: 'none' }}>Pricing</a>
              <a href="#" onClick={(e) => handleNav(e, 'terms')} style={{ color: '#888', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" onClick={(e) => handleNav(e, 'privacy')} style={{ color: '#888', textDecoration: 'none' }}>Privacy Policy</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
