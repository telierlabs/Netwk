import React, { useEffect } from 'react';
import { Footer } from './Footer';

export const DocsDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
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

      <main style={{ flex: 1, padding: '60px 24px 100px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }}></div>
          <span style={{ fontSize: '13px', color: '#888' }}>Available in Beta</span>
        </div>
        
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 48px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
          Cylen Technical Overview
        </h1>
        <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.6, marginBottom: '48px' }}>
          Cylen is a unified AI aggregator and collaboration workspace. We integrate industry-leading LLMs through secure APIs to provide a seamless user experience.
        </p>

        {/* MOCKUP CODE BLOCK (Biar kelihatan Technical) */}
        <div style={{ background: '#111', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', marginBottom: '60px', fontFamily: 'monospace', fontSize: '13px', color: '#ccc', overflowX: 'auto' }}>
          <div style={{ color: '#888', marginBottom: '16px' }}>// Cylen Multi-Model Routing Architecture</div>
          <div><span style={{ color: '#e74c3c' }}>import</span> {'{'} Router {'}'} <span style={{ color: '#e74c3c' }}>from</span> <span style={{ color: '#f1c40f' }}>'@cylen/core'</span>;</div>
          <br/>
          <div><span style={{ color: '#3498db' }}>const</span> response = <span style={{ color: '#e74c3c' }}>await</span> Router.dispatch({'{'}</div>
          <div style={{ paddingLeft: '24px' }}>prompt: <span style={{ color: '#f1c40f' }}>"Explain quantum physics"</span>,</div>
          <div style={{ paddingLeft: '24px' }}>model: <span style={{ color: '#f1c40f' }}>"auto"</span>, <span style={{ color: '#888' }}>// Routes to Gemini, Claude, or GPT based on task</span></div>
          <div style={{ paddingLeft: '24px' }}>context: workspace_id,</div>
          <div>{'}'});</div>
        </div>

        {/* MODELS SECTION */}
        <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>Supported Models API</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '80px' }}>
          
          <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 500, marginBottom: '4px' }}>Google Gemini Models</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Integrated for high-speed reasoning and multimodal tasks.</div>
            </div>
            <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>ACTIVE</div>
          </div>

          <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 500, marginBottom: '4px' }}>Claude, OpenAI, & Meta Llama</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Utilized for deep coding, structured outputs, and analytical processing.</div>
            </div>
            <div style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px' }}>ACTIVE</div>
          </div>

          <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 500, marginBottom: '4px' }}>DeepSeek, Qwen & Perplexity</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Real-time web search and efficient open-weight reasoning.</div>
            </div>
            <div style={{ fontSize: '11px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '4px' }}>INTEGRATING</div>
          </div>

        </div>

        {/* INFRASTRUCTURE NEEDS (Pitch) */}
        <h2 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '24px' }}>Cloud Infrastructure Goals</h2>
        <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
          To build a scalable aggregator, Cylen requires robust cloud infrastructure. Cloud credits will be directly applied to:
        </p>
        <ul style={{ color: '#ccc', fontSize: '15px', lineHeight: 1.8, paddingLeft: '20px', marginBottom: '60px' }}>
          <li><strong>Database Scaling:</strong> Storing session histories and multi-user workspace states securely.</li>
          <li><strong>Vector Storage (RAG):</strong> Processing and embedding PDFs/documents for instantaneous retrieval.</li>
          <li><strong>Edge Functions:</strong> Ensuring low-latency routing between the client and third-party APIs.</li>
        </ul>

      </main>
      <Footer />
    </div>
  );
};
