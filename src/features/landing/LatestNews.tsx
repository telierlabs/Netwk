import React from 'react';

// Data berita tunggal lengkap dengan isi konten (Press Release)
const NEWS_DATA = [
  { 
    title: 'Introducing Cylen Beta: Your All-in-One AI Collaboration Workspace', 
    date: 'Cirebon, Indonesia — May 31, 2026', 
    img: '/Cylen_20260531_155254_0000.png',
    content: (
      <div style={{ color: '#aaa', fontSize: '15px', lineHeight: '1.6', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p>We’re excited to launch <strong>Cylen Beta</strong> — a unified AI workspace designed to solve real problems that creators, developers, and teams face every day.</p>
        
        <div>
          <strong style={{ color: '#fff' }}>The Problem</strong>
          <p style={{ marginTop: '4px' }}>Switching between ChatGPT, Claude, Gemini, and other AI tools is exhausting. Multiple subscriptions, too many tabs, and no easy way to collaborate with others.</p>
        </div>

        <div>
          <strong style={{ color: '#fff' }}>Our Solution</strong>
          <p style={{ marginTop: '4px' }}>Cylen brings the best AI models into one clean workspace. Chat, reason, build, and collaborate together with your team or friends in shared AI Groups.</p>
        </div>

        <div>
          <strong style={{ color: '#fff' }}>Key Feature: AI Groups</strong>
          <p style={{ marginTop: '4px' }}>Create a group, invite your friends or teammates, and use multiple AI models in the same conversation thread. One place for everything.</p>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '8px' }}>
          <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
            Built by the team behind Telier News under founder Muhamad Rivaldy.
          </p>
        </div>
      </div>
    )
  }
];

export const LatestNews: React.FC = () => {
  return (
    <section id="news-section" style={{ width: '100%', padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#fff' }}>Latest updates</h2>
        {/* Tombol All posts disembunyikan sementara karena beritanya dibaca langsung di sini */}
        {/* <a href="#" style={{ fontSize: '14px', color: '#888', textDecoration: 'none' }}>All posts &rarr;</a> */}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {NEWS_DATA.map((news, i) => (
          <div key={i} style={{ 
            width: '100%', 
            background: '#0a0a0a', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)', 
            padding: '24px',
            textAlign: 'left' 
          }}>
            <div style={{ 
              width: '100%', height: '300px', borderRadius: '16px', overflow: 'hidden', 
              background: `url(${news.img}) center/cover`, border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '24px'
            }}></div>
            <div style={{ fontSize: '13px', color: '#4CAF50', marginBottom: '12px', fontWeight: 500 }}>{news.date}</div>
            <div style={{ fontSize: '24px', color: '#fff', fontWeight: 600, lineHeight: '1.3' }}>{news.title}</div>
            
            {/* 👇 Render isi berita di sini */}
            {news.content}

          </div>
        ))}
      </div>
    </section>
  );
};
