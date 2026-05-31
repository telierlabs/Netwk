import React, { useEffect } from 'react';

export const NewsDetail: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ 
      background: '#000', minHeight: '100dvh', width: '100vw', color: '#fff', 
      fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column',
      overflowY: 'auto', overflowX: 'hidden' 
    }}>
      {/* Header Back Button */}
      <header style={{ padding: '24px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back to Home
        </button>
      </header>

      <main style={{ flex: 1, padding: '20px 24px 100px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <div style={{ fontSize: '13px', color: '#4CAF50', marginBottom: '16px', fontWeight: 500 }}>
          Cirebon, Indonesia — May 31, 2026
        </div>
        
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 600, lineHeight: 1.2, marginBottom: '32px' }}>
          Introducing Cylen Beta: Your All-in-One AI Collaboration Workspace
        </h1>

        <img src="/Cylen_20260531_155254_0000.png" alt="Cylen Beta" style={{ width: '100%', borderRadius: '24px', marginBottom: '40px', border: '1px solid rgba(255,255,255,0.1)' }} />

        <div style={{ color: '#ccc', fontSize: '16px', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <p>We’re excited to launch <strong style={{ color: '#fff' }}>Cylen Beta</strong> — a unified AI workspace designed to solve real problems that creators, developers, and teams face every day.</p>

          <div>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>The Problem</h3>
            <p>Switching between ChatGPT, Claude, Gemini, and other AI tools is exhausting. Multiple subscriptions, too many tabs, and no easy way to collaborate with others.</p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Our Solution</h3>
            <p>Cylen brings the best AI models into one clean workspace. Chat, reason, build, and collaborate together with your team or friends in shared AI Groups.</p>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Key Feature: AI Groups</h3>
            <p>Create a group, invite your friends or teammates, and use multiple AI models in the same conversation thread. One place for everything.</p>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', marginTop: '16px' }}>
            <p style={{ fontSize: '14px', color: '#888', fontStyle: 'italic' }}>
              Built by the team behind Telier News under founder Muhamad Rivaldy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
