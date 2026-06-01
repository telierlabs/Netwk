import React, { useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// 👇 Tambahin onViewDocs di prop
export const BuildDetail: React.FC<{ onBack: () => void, onLogin: () => void, onViewDocs?: () => void }> = ({ onBack, onLogin, onViewDocs }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ 
      background: '#000', 
      minHeight: '100dvh',
      height: '100dvh', 
      width: '100vw', 
      color: '#fff', 
      fontFamily: "'Sora', sans-serif", 
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto', 
      overflowX: 'hidden' 
    }}>

      <style>{`
        .terminal-blink { animation: blinker 1s step-start infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
        @keyframes typeCode {
          0% { clip-path: inset(0 100% 0 0); }
          50% { clip-path: inset(0 0 0 0); }
          90% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        .anim-type-code { display: inline-block; animation: typeCode 7s steps(40, end) infinite; }
        @keyframes pulseAgent {
          0%, 100% { border-left-color: rgba(76, 175, 80, 0.3); background: rgba(76, 175, 80, 0.05); }
          50% { border-left-color: rgba(76, 175, 80, 1); background: rgba(76, 175, 80, 0.15); }
        }
        .anim-agent-reply { animation: pulseAgent 3s ease-in-out infinite; }
      `}</style>
      
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
          <div style={{ fontSize: '13px', color: '#f39c12', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(243, 156, 18, 0.1)', width: 'fit-content', margin: '0 auto 24px', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(243, 156, 18, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Cylen Build <span style={{ fontWeight: 'bold' }}>Beta</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Bring Cylen into<br />your workflow.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            A powerful AI coding assistant designed for complex architectural planning and rapid development.
          </p>
          
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '500px', margin: '0 auto 40px', fontFamily: 'monospace', fontSize: '13px', color: '#ccc' }}>
            <span>$ cylen create-project --template nextjs<span className="terminal-blink">_</span></span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {/* 👇 onClick onViewDocs dipasang */}
            <button onClick={onViewDocs} style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read Docs &rarr;
            </button>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen
            </button>
          </div>
        </div>

        {/* ... (SISA KONTEN BUILD DETAIL TETAP SAMA KAYA SEBELUMNYA) ... */}
        {/* BAGIAN BAWAH GET STARTED */}
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>Get started</h2>
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginBottom: '48px' }}>
            Free to try on the web. Upgrade your workflow today.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '48px' }}>
            {/* 👇 onClick onViewDocs dipasang lagi */}
            <button onClick={onViewDocs} style={{ padding: '14px 32px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read docs
            </button>
            <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try now &rarr;
            </button>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};
