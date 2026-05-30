import React from 'react';

// 👇 Tambahin interface biar bisa nerima fungsi klik
interface DemoCardsProps {
  onNavigate: (page: 'chat' | 'build' | 'imagine' | 'voice') => void;
}

export const DemoCards: React.FC<DemoCardsProps> = ({ onNavigate }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Card 1: Chat */}
      {/* 👇 Tambah onClick & cursor: pointer */}
      <div onClick={() => onNavigate('chat')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#252525', padding: '12px 18px', borderRadius: '18px 18px 0 18px', alignSelf: 'flex-end', fontSize: '14px', color: '#ddd' }}>
            How do black holes form?
          </div>
          <div style={{ background: 'transparent', padding: '12px 18px', borderRadius: '18px 18px 18px 0', alignSelf: 'flex-start', fontSize: '14px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '90%' }}>
            Black holes form when massive stars exhaust their nuclear fuel and collapse under their own gravity.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Chat</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 2: Build (Code) */}
      {/* 👇 Tambah onClick & cursor: pointer */}
      <div onClick={() => onNavigate('build')} style={{ background: '#0a0a0a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', fontFamily: 'monospace', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '24px' }}>
           <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <span style={{ fontSize: '12px', color: '#444', marginLeft: '12px' }}>projects/main</span>
            </div>
          <div style={{ fontSize: '13px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', opacity: 0.6 }}><span style={{ marginRight: '8px' }}>&gt;</span> Migrate auth session to JWT.</div>
            <div style={{ color: '#888' }}>&#10242; Thinking...</div>
            <div style={{ color: '#4CAF50' }}>[done] Audit auth middleware.</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500, fontFamily: 'Sora' }}>Build</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer', fontFamily: 'Sora' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 3: Imagine (Images) */}
      {/* 👇 Tambah onClick & cursor: pointer */}
      <div onClick={() => onNavigate('imagine')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '4px' }}>
          <img src="http://googleusercontent.com/image_collection/image_retrieval/13648669301175294313" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '20px 4px 4px 4px' }} alt="AI art 1" />
          <img src="http://googleusercontent.com/image_collection/image_retrieval/14622277196841038060" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px 20px 4px 4px' }} alt="AI art 2" />
          <img src="http://googleusercontent.com/image_collection/image_retrieval/14244686520643912103" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px 4px 4px 20px' }} alt="AI art 3" />
          <img src="http://googleusercontent.com/image_collection/image_retrieval/12192018587387470029" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px 4px 20px 4px' }} alt="AI art 4" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Imagine</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 4: Voice (Waveform) */}
      {/* 👇 Tambah onClick & cursor: pointer */}
      <div onClick={() => onNavigate('voice')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
           {[1,2,3,4,5,6,7,6,5,4,3,2,1].map((h, i) => (
             <div key={i} style={{ 
               width: '4px', height: `${h * 6}px`, background: 'linear-gradient(to top, #ff00ff, #00ffff)', 
               borderRadius: '10px', animation: `wave 1s ease-in-out infinite ${i * 0.1}s` 
             }}></div>
           ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Voice</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      <style>{`
        @keyframes wave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.5); } }
      `}</style>

    </div>
  );
};
