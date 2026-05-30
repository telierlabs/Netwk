import React, { useEffect } from 'react';
import { Footer } from './Footer';

export const BuildDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div style={{ background: '#000', minHeight: '100dvh', width: '100%', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px' }}>&larr; Back</button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>Try Cylen Beta</button>
      </header>
      <main style={{ flex: 1, padding: '80px 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'inline-block', background: 'rgba(243, 156, 18, 0.1)', color: '#f39c12', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, marginBottom: '24px', border: '1px solid rgba(243, 156, 18, 0.3)' }}>ROADMAP Q4 2026</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 600, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '32px' }}>Cylen Build: Sandbox</h1>
        <div style={{ fontSize: '18px', color: '#aaa', lineHeight: 1.6, marginBottom: '40px' }}>
          We are not just generating code; we are building a secure sandbox. The vision for Cylen Build is an integrated environment where AI writes, executes, tests, and debugs code directly in your workspace.
        </div>
        <div style={{ background: '#111', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Cloud Infrastructure Need</h3>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.6 }}>To achieve secure code execution (sandboxing) for thousands of users, we require significant cloud infrastructure to scale isolated Docker environments.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};
