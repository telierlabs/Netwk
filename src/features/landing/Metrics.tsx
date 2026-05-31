import React from 'react';

export const Metrics: React.FC = () => {
  return (
    <section style={{ width: '100%', padding: '80px 24px', borderBottom: '1px solid rgba(255,255,255,0.02)', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
      
      {/* 👇 Style CSS ditanem di sini buat bikin efek jalan (shimmer) dan denyut (pulse) */}
      <style>{`
        @keyframes shimmer-silver {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-silver {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .silver-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, #111111 0%, #050505 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 24px;
          transition: border 0.3s ease, transform 0.3s ease;
        }
        .silver-card:hover {
          border: 1px solid rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }
        .shimmer-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: shimmer-silver 2.5s infinite linear;
        }
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          animation: pulse-silver 2s infinite;
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 500, color: '#fff', letterSpacing: '-0.5px' }}>Infrastructure Roadmap</h2>
        <p style={{ color: '#888', fontSize: '15px', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0', lineHeight: 1.6 }}>
          Our core MVP is live. We are seeking cloud infrastructure partnerships to scale our compute-heavy features for developers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', textAlign: 'left' }}>
        
        {/* Phase 1: MVP (Solid Silver) */}
        <div className="silver-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#888' }}></div>
            <div style={{ fontSize: '11px', color: '#888', fontWeight: 700, letterSpacing: '1px' }}>STAGE 1: LIVE</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Foundation</div>
          <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.6 }}>
            Secure authentication, database architecture, basic text reasoning, and real-time chat sync across devices.
          </p>
        </div>

        {/* Phase 2: Cloud Credits Target (ANIMATED SILVER) */}
        <div className="silver-card" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
          {/* 👇 Elemen ini yang bikin efek perak kilau jalan */}
          <div className="shimmer-line"></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            {/* 👇 Dot ini yang bakal denyut */}
            <div className="dot-pulse"></div>
            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700, letterSpacing: '1px' }}>STAGE 2: SCALING</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#fff', marginBottom: '12px' }}>Compute & RAG</div>
          <p style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
            Deploying heavy server clusters for deep PDF document parsing, vector search, and secure code sandboxing.
          </p>
        </div>

        {/* Phase 3: Future (Dimmed/Muted Silver) */}
        <div className="silver-card" style={{ opacity: 0.6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#444' }}></div>
            <div style={{ fontSize: '11px', color: '#555', fontWeight: 700, letterSpacing: '1px' }}>STAGE 3: FUTURE</div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 500, color: '#ddd', marginBottom: '12px' }}>Multi-Modal Edge</div>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>
            Scaling edge inference for sub-second live voice conversations and high-fidelity video generation capabilities.
          </p>
        </div>

      </div>
    </section>
  );
};
