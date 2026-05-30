import React from 'react';

// Cuma 1 berita aja biar gak overclaim
const NEWS_DATA = [
  { 
    title: 'Introducing Cylen Beta: The Collaborative Workspace', 
    date: 'May 2026', 
    img: 'http://googleusercontent.com/image_collection/image_retrieval/3647296383367788055' 
  }
];

export const LatestNews: React.FC = () => {
  return (
    // 👇 ID "news-section" ditambahin di sini
    <section id="news-section" style={{ width: '100%', padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#fff' }}>Latest updates</h2>
        <a href="#" style={{ fontSize: '14px', color: '#888', textDecoration: 'none' }}>All posts &rarr;</a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {NEWS_DATA.map((news, i) => (
          <div key={i} style={{ width: '100%', cursor: 'pointer' }}>
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
