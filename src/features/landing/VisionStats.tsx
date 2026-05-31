import React from 'react';

export const VisionStats: React.FC = () => {
  return (
    <section style={{ 
      width: '100%', 
      backgroundColor: '#000', 
      padding: '120px 24px', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Sora', sans-serif",
      overflow: 'hidden'
    }}>
      
      {/* CSS untuk Grid Tipis & Animasi Kilau Jalan */}
      <style>{`
        .grok-grid {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          /* Grid kotak-kotak super tipis */
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 100px 100px;
          background-position: center top;
          z-index: 1;
          pointer-events: none;
        }
        
        /* Animasi Angka Berkilau Jalan */
        @keyframes text-shimmer {
          to { background-position: 200% center; }
        }

        .stat-number {
          font-size: clamp(56px, 10vw, 72px);
          font-weight: 400;
          line-height: 1;
          margin-bottom: 20px;
          letter-spacing: -1px;
          
          /* Efek kilau silver yang bergerak */
          background: linear-gradient(90deg, #444 0%, #fff 50%, #444 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: text-shimmer 4s linear infinite;
        }

        .stat-label {
          font-size: 15px;
          color: #777;
          font-weight: 400;
          letter-spacing: 0.5px;
        }

        .stat-container {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Garis horizontal dengan cahaya yang jalan */
        .stat-divider {
          width: 100%;
          max-width: 400px;
          height: 1px;
          background: rgba(255,255,255,0.05); /* Garis dasar redup */
          margin: 60px 0;
          position: relative;
          z-index: 2;
          overflow: hidden;
        }

        @keyframes line-scan {
          0% { left: -150px; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }

        .stat-divider::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150px;
          width: 150px;
          height: 100%;
          /* Cahaya putih yang nyapu dari kiri ke kanan */
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          animation: line-scan 3s ease-in-out infinite;
        }
      `}</style>

      {/* Background Layer */}
      <div className="grok-grid"></div>

      {/* Metric 1 */}
      <div className="stat-container">
        <div className="stat-number">6+</div>
        <div className="stat-label">model AI terdepan terintegrasi</div>
      </div>

      <div className="stat-divider"></div>

      {/* Metric 2 */}
      <div className="stat-container">
        <div className="stat-number">0</div>
        <div className="stat-label">kebutuhan berpindah tab</div>
      </div>

      <div className="stat-divider"></div>

      {/* Metric 3 */}
      <div className="stat-container">
        <div className="stat-number">1</div>
        <div className="stat-label">misi untuk masa depan bekerja bersama AI</div>
      </div>

    </section>
  );
};
