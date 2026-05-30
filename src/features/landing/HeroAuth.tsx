import React from 'react';

interface HeroAuthProps {
  onLogin: () => void;
  onViewDocs: () => void; // 👇 Tambahan baru buat tombol docs
  isLoading: boolean;
  errorMsg: string | null;
}

export const HeroAuth: React.FC<HeroAuthProps> = ({ onLogin, onViewDocs, isLoading, errorMsg }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '140px', paddingBottom: '60px', textAlign: 'center', width: '100%', paddingLeft: '20px', paddingRight: '20px' }}>
      
      {/* Badge Beta Minimalis */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 400, color: '#888', marginBottom: '32px' }}>
        Cylen Workspace Beta <span style={{ color: '#666' }}>&gt;</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 500, letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: '24px', color: '#fff', maxWidth: '700px' }}>
        Frontier AI models for everything you imagine.
      </h1>

      {/* Sub-headline (JUJUR & ELEGAN) */}
      <p style={{ fontSize: '18px', color: '#888', marginBottom: '44px', lineHeight: 1.6, maxWidth: '550px', fontWeight: 400 }}>
        Reasoning, code, search, and collaboration.<br />
        Powered by industry-leading AI APIs in one unified workspace.
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '14px', flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: errorMsg ? '16px' : '0' }}>
        
        <button onClick={onLogin} disabled={isLoading} style={{ padding: '12px 28px', borderRadius: '100px', background: '#fff', color: '#000', border: 'none', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isLoading ? <div className="spinner" style={{ width: 18, height: 18, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }} /> : 'Try Cylen Beta'}
        </button>
        
        {/* 👇 Tombol dipasangin aksi onViewDocs */}
        <button onClick={onViewDocs} style={{ padding: '12px 28px', borderRadius: '100px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          View Documentation
        </button>
        
      </div>

      {errorMsg && <p style={{ fontSize: '13px', color: '#e53e3e', marginTop: '24px' }}>{errorMsg}</p>}
    </div>
  );
};
