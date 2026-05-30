import React from 'react';

export const DemoCards: React.FC = () => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      
      {/* Card 1: Chat Demo */}
      <div style={{ background: 'var(--sf, #111)', borderRadius: '24px', padding: '20px', border: '1px solid var(--mu, #222)', textAlign: 'left' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--mu, #222)', padding: '12px 16px', borderRadius: '16px 16px 0 16px', alignSelf: 'flex-end', fontSize: '14px', color: '#ccc', maxWidth: '80%' }}>
            Apa penyebab aurora borealis?
          </div>
          <div style={{ background: 'var(--sf, #1a1a1a)', padding: '12px 16px', borderRadius: '16px 16px 16px 0', alignSelf: 'flex-start', fontSize: '14px', color: 'var(--text, #fff)', maxWidth: '90%', border: '1px solid var(--mu, #333)' }}>
            Partikel matahari menabrak gas atmosfer di dekat kutub, memicu reaksi cahaya yang berpendar.
          </div>
        </div>
      </div>

      {/* Card 2: Code Demo */}
      <div style={{ background: '#0a0a0a', borderRadius: '24px', padding: '20px', border: '1px solid var(--mu, #222)', textAlign: 'left', fontFamily: 'monospace' }}>
        <div style={{ fontSize: '13px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex' }}><span style={{ color: '#007acc', marginRight: '8px' }}>&gt;</span> <span>Buatkan rate limiting API.</span></div>
          <div style={{ color: '#888' }}>&#10242; Berpikir...</div>
          <div style={{ color: '#27c93f' }}>[Selesai] Rute berhasil dienkripsi.</div>
        </div>
      </div>

    </div>
  );
};
