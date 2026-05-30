import React, { useEffect } from 'react';
import { Footer } from './Footer';

export const ChatDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div style={{ background: '#000', minHeight: '100dvh', width: '100%', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px' }}>&larr; Back</button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>Try Cylen Beta</button>
      </header>
      <main style={{ flex: 1, padding: '80px 24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'inline-block', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, marginBottom: '24px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>LIVE IN BETA</div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 600, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '32px' }}>AI Chat & Reasoning</h1>
        <div style={{ fontSize: '18px', color: '#aaa', lineHeight: 1.6, marginBottom: '40px' }}>
          Our core foundation is live. Cylen currently provides high-speed, secure, and collaborative access to frontier LLMs. We focus on deep reasoning and seamless chat history retrieval without the bloat.
        </div>
        <div style={{ background: '#111', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Cloud Infrastructure Need</h3>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.6 }}>We are expanding our RAG (Retrieval-Augmented Generation) capabilities to allow users to chat with massive datasets and PDFs in real-time. This requires heavy, scalable compute clusters.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};
