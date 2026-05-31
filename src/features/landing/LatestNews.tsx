import React from 'react';

// 👇 Tambahin interface buat nerima fungsi klik
interface LatestNewsProps {
  onNavigate: (page: string) => void;
}

const NEWS_DATA = [
  { 
    title: 'Introducing Cylen Beta: Your All-in-One AI Collaboration Workspace', 
    date: 'May 31, 2026', 
    img: '/Cylen_20260531_155254_0000.png' 
  }
];

export const LatestNews: React.FC<LatestNewsProps> = ({ onNavigate }) => {
  return (
    <section id="news-section" style={{ width: '100%', padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#fff' }}>Latest updates</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {NEWS_DATA.map((news, i) => (
          // 👇 Tambahin onClick di sini
          <div key={i} onClick={() => onNavigate('news-detail')} style={{ width: '100%', cursor: 'pointer' }}>
            <div style={{ 
              width: '100%', height: '300px', borderRadius: '24px', overflow: 'hidden', 
              background: `url(${news.img}) center/cover`, border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '16px'
            }}></div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>{news.date}</div>
            <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500 }}>{news.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
