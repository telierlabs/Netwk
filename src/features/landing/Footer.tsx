import React from 'react';
import { PAGE_TO_PATH } from '../../lib/landingRoutes';

export const Footer: React.FC<{ onNavigate?: (page: any) => void }> = ({ onNavigate }) => {

  // Semua link punya href asli (bisa dibuka langsung & dibaca Google).
  // Kalau halaman induk kasih onNavigate, klik dialihkan ke state (tanpa reload).
  // Kalau nggak (mis. Footer di halaman Build/Chat), browser langsung pindah ke URL-nya.
  const hrefFor = (page: string) => (PAGE_TO_PATH as Record<string, string | undefined>)[page] ?? '#';

  const handleNav = (e: React.MouseEvent, page: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(page);
      return;
    }
    if (hrefFor(page) === '#') e.preventDefault();
  };

  const linkStyle: React.CSSProperties = { color: '#888', textDecoration: 'none', transition: 'color 0.2s' };
  const navLink = (page: string, label: string) => (
    <a href={hrefFor(page)} onClick={(e) => handleNav(e, page)} style={linkStyle}>{label}</a>
  );

  return (
    <footer style={{ width: '100%', padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0a0a0a', color: '#888', fontFamily: "'Sora', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>

        {/* Top/Brand Section */}
        <div>
          <div style={{ fontSize: '12px', marginBottom: '12px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '1px' }}>A part of</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/IMG_20260220_144200.png"
              alt="TelierNews"
              style={{ height: '35px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div style={{ fontSize: '12px', marginTop: '16px', opacity: 0.5 }}>
            &copy; 2026 TelierNews. All rights reserved.
          </div>
        </div>

        {/* Links Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '40px' }}>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Products</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {navLink('chat', 'Cylen Chat')}
              {navLink('build', 'Cylen Build')}
              {navLink('imagine', 'Cylen Imagine')}
              {navLink('voice', 'Cylen Voice')}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Ecosystem</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <a href="https://teliernews.com" target="_blank" rel="noreferrer" style={linkStyle}>TelierNews Portal</a>
              <a href="https://www.instagram.com/cylenai?igsh=NjBuNHFvY2E4bTM1" target="_blank" rel="noreferrer" style={linkStyle}>Instagram</a>
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {navLink('about', 'About Us')}
              {navLink('news-detail', 'Latest News')}
              {navLink('contact', 'Contact')}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              {navLink('pricing', 'Pricing')}
              {navLink('terms', 'Terms of Service')}
              {navLink('privacy', 'Privacy Policy')}
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
