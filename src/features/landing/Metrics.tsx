import React from 'react';

export const Metrics: React.FC = () => {
  return (
    <section style={{ width: '100%', padding: '80px 24px', borderBottom: '1px solid #111', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#fff', letterSpacing: '-0.5px' }}>Infrastructure Roadmap</h2>
        <p style={{ color: '#888', fontSize: '15px', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0', lineHeight: 1.6 }}>
          Our core MVP is live. We are seeking cloud infrastructure partnerships to scale our compute-heavy features for developers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', textAlign: 'left' }}>
        
        {/* Phase 1: MVP */}
        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4CAF50' }}></div>
            <div style={{ fontSize: '11px', color: '#4CAF50', fontWeight: 700, letterSpacing: '1px' }}>STAGE 1: LIVE</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Foundation</div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
            Secure authentication, database architecture, basic text reasoning, and real-time chat sync across devices.
          </p>
        </div>

        {/* Phase 2: Cloud Credits Target */}
        <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid rgba(243, 156, 18, 0.3)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: '#f39c12', borderRadius: '16px 16px 0 0' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f39c12', boxShadow: '0 0 8px #f39c12' }}></div>
            <div style={{ fontSize: '11px', color: '#f39c12', fontWeight: 700, letterSpacing: '1px' }}>STAGE 2: SCALING</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Compute & RAG</div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
            Deploying heavy server clusters for deep PDF document parsing, vector search, and secure code sandboxing.
          </p>
        </div>

        {/* Phase 3: Future */}
        <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#555' }}></div>
            <div style={{ fontSize: '11px', color: '#555', fontWeight: 700, letterSpacing: '1px' }}>STAGE 3: FUTURE</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Multi-Modal Edge</div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
            Scaling edge inference for sub-second live voice conversations and high-fidelity video generation capabilities.
          </p>
        </div>

      </div>
    </section>
  );
};
