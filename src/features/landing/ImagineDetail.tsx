import React, { useState, useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const QaRow: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', cursor: 'pointer' }}>
        <span style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>{question}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isOpen && <div style={{ paddingBottom: '24px', fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>{answer}</div>}
    </div>
  );
};

// 👇 Tambahin onViewDocs di prop
export const ImagineDetail: React.FC<{ onBack: () => void, onLogin: () => void, onViewDocs?: () => void }> = ({ onBack, onLogin, onViewDocs }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ background: '#000', minHeight: '100dvh', height: '100dvh', width: '100vw', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back
        </button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>
          Try for free
        </button>
      </header>

      <main style={{ flex: 1, padding: '60px 24px 100px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '100px' }}>
          <div style={{ fontSize: '13px', color: '#3498db', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(52, 152, 219, 0.1)', width: 'fit-content', margin: '0 auto 24px', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Cylen Imagine <span style={{ fontWeight: 'bold' }}>Research Stage</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            From prompt to<br />pixel-perfect reality.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            State-of-the-art image understanding, generation, and editing — unified in one workspace.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Playground
            </button>
            {/* 👇 onClick onViewDocs dipasang */}
            <button onClick={onViewDocs} style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Documentation
            </button>
          </div>
        </div>
        {/* ... SISA KONTEN IMAGINE DETAIL TETAP SAMA ... */}
      </main>
      <Footer />
    </div>
  );
};
