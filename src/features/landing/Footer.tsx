import React from 'react';

// 👇 Tambahin prop onNavigate
export const Footer: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {
  
  const handleNav = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <footer style={{ width: '100%', padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#000', color: '#888', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* Top/Brand Section */}
        <div>
          <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.7 }}>A part of</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/IMG_20260220_144200.png" 
              alt="Teliernews" 
              style={{ 
                height: '30px', 
                width: 'auto', 
                objectFit: 'contain',
                filter: 'brightness(2)' 
              }} 
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '16px', opacity: 0.6 }}>
            &copy; 2026 Teliernews.
          </div>
        </div>

        {/* Links Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '32px' }}>
          
          {/* Kolom 1: Produk */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="#" onClick={(e) => handleNav(e, 'chat')} style={{ color: '#888', textDecoration: 'none' }}>Cylen Chat</a>
              <a href="#" onClick={(e) => handleNav(e, 'build')} style={{ color: '#888', textDecoration: 'none' }}>Cylen Build</a>
              <a href="#" onClick={(e) => handleNav(e, 'docs')} style={{ color: '#888', textDecoration: 'none' }}>API Documentation</a>
              <a href="#" onClick={(e) => handleNav(e, 'pricing')} style={{ color: '#888', textDecoration: 'none' }}>Pricing</a>
            </div>
          </div>

          {/* Kolom 2: Ekosistem */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Ecosystem</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="https://teliernews.com" target="_blank" rel="noreferrer" style={{ color: '#888', textDecoration: 'none' }}>Teliernews Portal</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none', cursor: 'not-allowed' }}>Vynix</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none', cursor: 'not-allowed' }}>GitHub Repository</a>
            </div>
          </div>

          {/* Kolom 3: Legal & Kontak */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="#" onClick={(e) => handleNav(e, 'about')} style={{ color: '#888', textDecoration: 'none' }}>About Us</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none', cursor: 'not-allowed' }}>Contact</a>
              <a href="#" onClick={(e) => handleNav(e, 'terms')} style={{ color: '#888', textDecoration: 'none' }}>Terms of Service</a>
              <a href="#" onClick={(e) => handleNav(e, 'privacy')} style={{ color: '#888', textDecoration: 'none' }}>Privacy Policy</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
