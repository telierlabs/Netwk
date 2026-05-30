import React from 'react';

const NEWS_DATA = [
  { title: 'Cylen Build 0.1 on API', date: 'May 30, 2026', img: 'http://googleusercontent.com/image_collection/image_retrieval/3647296383367788055' },
  { title: 'Use Cylen in Kilo Code', date: 'May 28, 2026', img: 'http://googleusercontent.com/image_collection/image_retrieval/17533084790424370236' },
  { title: 'Latest Cylen Build Beta', date: 'May 25, 2026', img: 'http://googleusercontent.com/image_collection/image_retrieval/1704741273253977525' },
  { title: 'API Security Update', date: 'May 20, 2026', img: 'http://googleusercontent.com/image_collection/image_retrieval/11072964135465606653' },
  { title: 'Cylen Voice Think Fast 1.0', date: 'May 15, 2026', img: 'http://googleusercontent.com/image_collection/image_retrieval/14045755253458707955' },
];

export const LatestNews: React.FC = () => {
  return (
    <section style={{ width: '100%', padding: '80px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: '#fff' }}>Latest news</h2>
        <a href="#" style={{ fontSize: '14px', color: '#888', textDecoration: 'none' }}>All posts &rarr;</a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {NEWS_DATA.map((news, i) => (
          <div key={i} style={{ width: '100%', cursor: 'pointer' }}>
            <div style={{ 
              width: '100%', height: '200px', borderRadius: '24px', overflow: 'hidden', 
              background: `url(${news.img}) center/cover`, border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '16px'
            }}></div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>{news.date}</div>
            <div style={{ fontSize: '18px', color: '#fff', fontWeight: 500 }}>{news.title}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
