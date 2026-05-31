import React from 'react';

// 👇 Tambahin interface biar bisa nerima fungsi klik
interface DemoCardsProps {
  onNavigate: (page: 'chat' | 'build' | 'imagine' | 'voice') => void;
}

export const DemoCards: React.FC<DemoCardsProps> = ({ onNavigate }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Card 1: Chat (Dengan Animasi) */}
      <div onClick={() => onNavigate('chat')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '170px' }}>
          
          <div className="anim-chat-user" style={{ background: '#252525', padding: '12px 18px', borderRadius: '18px 18px 0 18px', alignSelf: 'flex-end', fontSize: '14px', color: '#ddd' }}>
            How do black holes form?
          </div>
          
          <div className="anim-chat-ai" style={{ background: 'transparent', padding: '12px 18px', borderRadius: '18px 18px 18px 0', alignSelf: 'flex-start', fontSize: '14px', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', maxWidth: '90%' }}>
            Black holes form when massive stars exhaust their nuclear fuel and collapse under their own gravity.
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Chat</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 2: Build (Dengan Animasi Terminal) */}
      <div onClick={() => onNavigate('build')} style={{ background: '#0a0a0a', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', fontFamily: 'monospace', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '24px', minHeight: '170px' }}>
           <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#333' }}></div>
              <span style={{ fontSize: '12px', color: '#444', marginLeft: '12px' }}>projects/main</span>
            </div>
          <div style={{ fontSize: '13px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="anim-build-1" style={{ display: 'flex' }}><span style={{ marginRight: '8px' }}>&gt;</span> Migrate auth session to JWT.</div>
            <div className="anim-build-2" style={{ color: '#888' }}>&#10242; Thinking...</div>
            <div className="anim-build-3" style={{ color: '#4CAF50' }}>[done] Audit auth middleware.</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500, fontFamily: 'Sora' }}>Build</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer', fontFamily: 'Sora' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 3: Imagine (1 Gambar Full) */}
      <div onClick={() => onNavigate('imagine')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '0' }}>
          {/* 👇 Ganti grid 4 gambar jadi 1 gambar ini */}
          <img 
            src="/file_00000000d40c72089c313a8c169e6783.png" 
            style={{ width: '100%', height: '240px', objectFit: 'cover' }} 
            alt="AI generated visual" 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Imagine</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Card 4: Voice (Silver/Abu-abu gelap) */}
      <div onClick={() => onNavigate('voice')} style={{ background: '#131313', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left', overflow: 'hidden', cursor: 'pointer' }}>
        <div style={{ padding: '40px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', minHeight: '160px' }}>
           {[1,2,3,4,5,6,7,6,5,4,3,2,1].map((h, i) => (
             <div key={i} style={{ 
               width: '4px', height: `${h * 6}px`, 
               /* 👇 Warna diubah jadi silver/dark grey */
               background: 'linear-gradient(to top, #555555, #d4d4d4)', 
               borderRadius: '10px', 
               animation: `wave 1s ease-in-out infinite ${i * 0.1}s` 
             }}></div>
           ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>Voice</span>
          <span style={{ fontSize: '14px', color: '#fff', cursor: 'pointer' }}>Explore &rarr;</span>
        </div>
      </div>

      {/* Kumpulan Animasi CSS */}
      <style>{`
        @keyframes wave { 
          0%, 100% { transform: scaleY(1); } 
          50% { transform: scaleY(1.5); } 
        }

        /* Animasi Chat */
        .anim-chat-user {
          animation: chatSeqUser 6s infinite;
        }
        .anim-chat-ai {
          animation: chatSeqAi 6s infinite;
        }

        @keyframes chatSeqUser {
          0%, 5% { opacity: 0; transform: translateY(10px); }
          10%, 90% { opacity: 1; transform: translateY(0); }
          95%, 100% { opacity: 0; transform: translateY(-5px); }
        }

        @keyframes chatSeqAi {
          0%, 35% { opacity: 0; transform: translateY(10px); }
          40%, 90% { opacity: 1; transform: translateY(0); }
          95%, 100% { opacity: 0; transform: translateY(-5px); }
        }

        /* Animasi Build/Terminal */
        .anim-build-1 { animation: build1 6s infinite; }
        .anim-build-2 { animation: build2 6s infinite; }
        .anim-build-3 { animation: build3 6s infinite; }

        @keyframes build1 {
          0%, 5% { opacity: 0; }
          10%, 90% { opacity: 0.7; }
          95%, 100% { opacity: 0; }
        }
        @keyframes build2 {
          0%, 25% { opacity: 0; }
          30%, 90% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
        @keyframes build3 {
          0%, 55% { opacity: 0; }
          60%, 90% { opacity: 1; }
          95%, 100% { opacity: 0; }
        }
      `}</style>

    </div>
  );
};
