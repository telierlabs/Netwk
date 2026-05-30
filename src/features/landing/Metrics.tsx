import React from 'react';

export const Metrics: React.FC = () => {
  return (
    <section style={{ width: '100%', padding: '80px 24px', borderBottom: '1px solid #111', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '60px', textAlign: 'center' }}>
        
        <div>
          <div style={{ fontSize: '64px', fontWeight: 500, color: '#fff', letterSpacing: '-2px' }}>0</div>
          <div style={{ fontSize: '14px', color: '#555', marginTop: '10px', letterSpacing: '1px', fontWeight: 600 }}>QUERIES PROCESSED DAILY</div>
        </div>

        <div>
          <div style={{ fontSize: '64px', fontWeight: 500, color: '#fff', letterSpacing: '-2px' }}>0</div>
          <div style={{ fontSize: '14px', color: '#555', marginTop: '10px', letterSpacing: '1px', fontWeight: 600 }}>ACTIVE USERS IN BETA</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ height: '80px', width: '1px', background: '#222', marginBottom: '20px' }}></div>
          <div style={{ fontSize: '64px', fontWeight: 500, color: '#fff', letterSpacing: '-2px' }}>1</div>
          <div style={{ fontSize: '14px', color: '#555', marginTop: '10px', letterSpacing: '1px', fontWeight: 600 }}>MISSION TO REALIZE AI</div>
        </div>

      </div>
    </section>
  );
};
