import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ width: '100%', padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#000', color: '#888', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        {/* Top/Brand Section */}
        <div>
          <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.7 }}>Sebuah bagian dari</div>
          {/* 👇 Teks Teliernews diganti Logo */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src="/IMG_20260220_144200.png" 
              alt="Teliernews" 
              style={{ height: '30px', width: 'auto', objectFit: 'contain' }} 
            />
          </div>
          {/* 👇 Copyright diubah jadi Teliernews */}
          <div style={{ fontSize: '12px', marginTop: '16px', opacity: 0.6 }}>
            &copy; 2026 Teliernews.
          </div>
        </div>

        {/* Links Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '32px' }}>
          
          {/* Kolom 1: Produk */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Produk</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Cylen Chat</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Cylen Build</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Dokumentasi API</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Status Sistem</a>
            </div>
          </div>

          {/* Kolom 2: Ekosistem / Pengembang */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Ekosistem</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="https://teliernews.com" target="_blank" rel="noreferrer" style={{ color: '#888', textDecoration: 'none' }}>Portal Teliernews</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Vynix</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Github Repository</a>
            </div>
          </div>

          {/* Kolom 3: Legal & Kontak */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>Perusahaan</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Tentang Kami</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Kontak</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Ketentuan Layanan</a>
              <a href="#" style={{ color: '#888', textDecoration: 'none' }}>Kebijakan Privasi</a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
