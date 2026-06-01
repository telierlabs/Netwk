import React, { useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export const VoiceDetail: React.FC<{ onBack: () => void, onLogin: () => void, onDocs: () => void }> = ({ onBack, onLogin, onDocs }) => {
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
        @keyframes pulseMic {
          0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); transform: scale(0.95); }
          70% { box-shadow: 0 0 0 15px rgba(76, 175, 80, 0); transform: scale(1); }
          100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); transform: scale(0.95); }
        }
        .mic-active {
          animation: pulseMic 2s infinite ease-in-out;
        }

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
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid #4CAF50;
          animation: dictationTyping 5s steps(40, end) infinite, blinkCaret .75s step-end infinite;
          vertical-align: bottom;
        }

        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
      `}</style>

      {/* Header */}
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back
        </button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>
          Try for free
        </button>
      </header>

      <main style={{ flex: 1, padding: '60px 24px 100px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        
        {/* HERO SECTION */}
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
            <button onClick={onDocs} style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read Docs
            </button>
          </div>
        </div>

        {/* SECTION 1: SPEECH TO TEXT (LIVE - BETA) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Speech to Text <span style={{ fontSize: '12px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle', border: '1px solid rgba(76,175,80,0.2)' }}>BETA</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Built right into your browser. Tap the microphone and speak your complex prompts naturally instead of typing them out.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Standard Web Speech API integration</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Speeds up workflow for long-form questions</div>
          </div>
          
          <div style={{ background: '#111', borderRadius: '20px', padding: '40px 24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div className="mic-active" style={{ width: '64px', height: '64px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(76, 175, 80, 0.4)' }}>
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path></svg>
            </div>
            <div style={{ fontSize: '14px', color: '#4CAF50', marginBottom: '8px', fontWeight: 500, letterSpacing: '1px' }}>LISTENING...</div>
            <div style={{ fontSize: '15px', color: '#fff', minHeight: '30px' }}>
              <span className="dictation-text">"Explain how vector databases work..."</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: LIVE VOICE (COMING SOON) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Live Voice AI <span style={{ fontSize: '12px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle', border: '1px solid rgba(243, 156, 18, 0.3)' }}>COMING SOON</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            We are working on integrating native speech-to-speech models (like Gemini) to enable fluid, low-latency voice conversations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Natural back-and-forth communication</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Interrupt and steer the AI mid-sentence</div>
          </div>

          <div style={{ background: '#111', borderRadius: '20px', padding: '60px 24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
             {[1, 2, 3, 2.5, 1.5, 2, 3.5, 2, 1, 2].map((h, i) => (
               <div key={i} style={{ 
                 width: '5px', 
                 height: `${h * 12}px`, 
                 background: 'linear-gradient(to top, #f39c12, #f1c40f)', 
                 borderRadius: '4px',
                 transformOrigin: 'center',
                 animation: `waveBar 1.2s ease-in-out infinite ${i * 0.1}s` 
               }}></div>
             ))}
             <span style={{ fontSize: '13px', color: '#aaa', marginLeft: '16px', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '100px' }}>Simulating voice inference...</span>
          </div>
        </div>

        {/* CLOUD FUNDING MISSION */}
        <div style={{ padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '100px', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 400, lineHeight: 1.6, color: '#fff', maxWidth: '600px', margin: '0 auto 24px' }}>
            "Real-time voice inference requires deploying heavy models to edge servers. Cloud credits are essential to build this low-latency infrastructure for our users."
          </p>
          <div style={{ fontSize: '13px', color: '#f39c12', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>
             TelierNews Infrastructure Goal
          </div>
        </div>

        {/* ROADMAP LIST */}
        <div style={{ marginBottom: '120px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>The voice roadmap</h2>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '48px' }}>Current integrations and future capabilities we are building toward.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Browser Dictation <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Tap to speak. Fast translation from your microphone to text prompts.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Live Native Audio <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Integration with Gemini's native audio API for seamless real-time chat.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Low-Latency Edge <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Expanding our server infrastructure to ensure responses feel humanly fast.</div>
              </div>
            </div>

          </div>
        </div>

        {/* GET STARTED SECTION */}
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>Get started</h2>
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginBottom: '48px' }}>
            Free to try on the web. Secure authentication via Google.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>01</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Open Cylen</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Go to cylen.teliernews.com on your web browser.</div>
            </div>
            
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>02</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Sign in</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Use your Google account to log in securely with one click.</div>
            </div>

            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>03</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Start chatting</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Tap the microphone icon to try our basic dictation feature today.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '48px' }}>
            <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen Beta &rarr;
            </button>
            <button onClick={onDocs} style={{ padding: '14px 32px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Documentation
            </button>
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
};
