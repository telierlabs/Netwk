import React, { useEffect } from 'react';
import { Footer } from './Footer';

export const PricingDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ background: '#000', minHeight: '100dvh', height: '100dvh', width: '100vw', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      
      {/* Header */}
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back to Home
        </button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>
          Try Cylen Beta
        </button>
      </header>

      <main style={{ flex: 1, padding: '80px 24px 100px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 48px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Pricing
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.6 }}>
            Start for free. Scale when our infrastructure is ready.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '80px' }}>
          
          {/* TIER: FREE (BETA) */}
          <div style={{ background: '#111', padding: '40px 32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#fff', marginBottom: '16px' }}>Beta Workspace</div>
            <div style={{ fontSize: '48px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>$0<span style={{ fontSize: '16px', color: '#666', fontWeight: 400 }}>/month</span></div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px', minHeight: '40px' }}>
              Get to know Cylen and its capabilities for free during our MVP scaling phase.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Standard multi-model chat
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Basic web search
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Collaborative AI Groups
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Save session history
              </div>
            </div>

            <button onClick={onLogin} style={{ marginTop: 'auto', padding: '16px', borderRadius: '100px', background: '#333', color: '#fff', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Get Started
            </button>
          </div>

          {/* TIER: PRO (COMING SOON) */}
          <div style={{ background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)', padding: '40px 32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3498db, #9b59b6)' }}></div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: '#fff', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              Cylen Pro <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', height: 'fit-content' }}>COMING SOON</span>
            </div>
            <div style={{ fontSize: '48px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>TBA</div>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px', minHeight: '40px' }}>
              Unleash the full power of Cylen with high compute features once our cloud infrastructure is deployed.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Unlimited model switching
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Image & video generation
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Heavy PDF analysis (RAG)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Secure code execution sandbox
              </div>
            </div>

            <button style={{ marginTop: 'auto', padding: '16px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'not-allowed', opacity: 0.5 }}>
              Pending Infrastructure
            </button>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
};
