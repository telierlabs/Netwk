import React from 'react';

interface HeroAuthProps {
  onLogin: () => void;
  isLoading: boolean;
  errorMsg: string | null;
}

export const HeroAuth: React.FC<HeroAuthProps> = ({ onLogin, isLoading, errorMsg }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', textAlign: 'center' }}>
      
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--sf, #1a1a1a)', border: '1px solid var(--mu, #333)', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: '#f39c12', marginBottom: '24px' }}>
        <span style={{ background: '#f39c12', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>BARU</span>
        Cylen Build Beta <span style={{ color: '#666' }}>&rarr;</span>
      </div>

      <h1 style={{ fontSize: 'clamp(36px, 8vw, 56px)', fontWeight: 700, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '20px' }}>
        Model AI terdepan untuk segala imajinasi Anda.
      </h1>

      <p style={{ fontSize: '16px', color: 'var(--mu, #888)', marginBottom: '40px', lineHeight: 1.5, maxWidth: '500px' }}>
        Penalaran, kode, dan analisis ringkas. Dibangun dengan kecepatan tinggi dan akurasi presisi.
      </p>

      <div style={{ display: 'flex', gap: '16px', flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: errorMsg ? '16px' : '64px' }}>
        <button onClick={onLogin} disabled={isLoading} style={{ flex: 1, maxWidth: '200px', padding: '14px 24px', borderRadius: '100px', background: 'var(--text, #fff)', color: 'var(--bg, #000)', border: 'none', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isLoading ? <div className="spinner" style={{ width: 18, height: 18, border: '2px solid var(--bg, #000)', borderTopColor: 'transparent', borderRadius: '50%' }} /> : 'Coba Cylen Beta'}
        </button>
        
        <button onClick={onLogin} disabled={isLoading} style={{ flex: 1, maxWidth: '200px', padding: '14px 24px', borderRadius: '100px', background: 'transparent', color: 'var(--text, #fff)', border: '1px solid var(--mu, #333)', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          Login Google
        </button>
      </div>

      {errorMsg && <p style={{ fontSize: '13px', color: '#e53e3e', marginBottom: '24px' }}>{errorMsg}</p>}
    </div>
  );
};
