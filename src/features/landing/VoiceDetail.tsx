import React, { useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

// 👇 Tambahin onViewDocs di prop
export const VoiceDetail: React.FC<{ onBack: () => void, onLogin: () => void, onViewDocs?: () => void }> = ({ onBack, onLogin, onViewDocs }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ background: '#000', minHeight: '100dvh', height: '100dvh', width: '100vw', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      
      <style>{`
        @keyframes pulseMic {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); transform: scale(0.95); }
          70% { box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); transform: scale(1); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); transform: scale(0.95); }
        }
        .mic-active { animation: pulseMic 2s infinite ease-in-out; }
        @keyframes dictationTyping {
          0% { width: 0; }
          50% { width: 100%; }
          90% { width: 100%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        @keyframes blinkCaret {
          from, to { border-color: transparent }
          50% { border-color: #4CAF50; }
        }
        .dictation-text {
          display: inline-block; overflow: hidden; white-space: nowrap; border-right: 2px solid #4CAF50;
          animation: dictationTyping 5s steps(40, end) infinite, blinkCaret .75s step-end infinite; vertical-align: bottom;
        }
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
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
          <div style={{ fontSize: '13px', color: '#9b59b6', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(155, 89, 182, 0.1)', width: 'fit-content', margin: '0 auto 24px', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(155, 89, 182, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
            Cylen Voice <span style={{ fontWeight: 'bold' }}>Integration</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Natural speech<br />integration.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            Dictate prompts seamlessly today. Real-time native AI voice conversations coming in the next evolution.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Dictation
            </button>
            {/* 👇 onClick onViewDocs dipasang */}
            <button onClick={onViewDocs} style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read Docs
            </button>
          </div>
        </div>

        {/* ... SISA KONTEN VOICE DETAIL TETAP SAMA KAYA SEBELUMNYA ... */}
        {/* GET STARTED */}
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>Get started</h2>
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginBottom: '48px' }}>
            Free to try on the web. Secure authentication via Google.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '48px' }}>
            <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen Beta &rarr;
            </button>
            {/* 👇 onClick onViewDocs dipasang lagi di sini */}
            <button onClick={onViewDocs} style={{ padding: '14px 32px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Documentation
            </button>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};
