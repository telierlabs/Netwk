import React, { useState, useEffect } from 'react';

interface HeroAuthProps {
  onLogin: () => void;
  onViewDocs: () => void;
  isLoading: boolean;
  errorMsg: string | null;
}

export const HeroAuth: React.FC<HeroAuthProps> = ({ onLogin, onViewDocs, isLoading, errorMsg }) => {
  
  // 👇 State untuk animasi kata yang berubah-ubah
  const words = ['imagine', 'build', 'code', 'reason', 'create'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [text, setText] = useState('imagine');
  
  // Kecepatan ngetik
  const typingSpeed = 100;
  const deletingSpeed = 60;
  const delayBetweenWords = 2000;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleTyping = () => {
      const currentFullWord = words[currentWordIndex];
      
      if (!isDeleting) {
        // Lagi ngetik maju
        setText(currentFullWord.substring(0, text.length + 1));
        
        if (text === currentFullWord) {
          // Kalau udah beres ngetik 1 kata, tunggu bentar terus mulai hapus
          timer = setTimeout(() => setIsDeleting(true), delayBetweenWords);
          return;
        }
      } else {
        // Lagi ngehapus mundur
        setText(currentFullWord.substring(0, text.length - 1));
        
        if (text === '') {
          // Kalau udah habis kehapus, ganti ke kata berikutnya
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
          return;
        }
      }
      
      // Atur kecepatan ngetik vs ngehapus
      timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    };

    timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, currentWordIndex, words]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '140px', paddingBottom: '60px', textAlign: 'center', width: '100%', paddingLeft: '20px', paddingRight: '20px' }}>
      
      <style>{`
        /* Animasi Kursor Kedip */
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animated-cursor {
          display: inline-block;
          width: 3px;
          height: 1em;
          background-color: #fff;
          margin-left: 2px;
          vertical-align: middle;
          animation: cursorBlink 1s infinite;
        }

        /* Garis Kilau (Underline) ala Grok */
        .grok-underline {
          position: relative;
          display: inline-block;
        }
        .grok-underline::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px; /* Jarak garis dari teks */
          width: 100%;
          height: 3px; /* Ketebalan garis */
          background: linear-gradient(90deg, #444, #fff, #444);
          background-size: 200% auto;
          border-radius: 2px;
          animation: shimmerLine 3s linear infinite;
        }
        @keyframes shimmerLine {
          to { background-position: 200% center; }
        }
      `}</style>

      {/* Badge Beta Minimalis */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '5px 14px', fontSize: '13px', fontWeight: 400, color: '#888', marginBottom: '32px' }}>
        Cylen Workspace Beta <span style={{ color: '#666' }}>&gt;</span>
      </div>

      {/* Headline dengan Animasi Teks & Garis Kilau */}
      <h1 style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 500, letterSpacing: '-0.8px', lineHeight: 1.1, marginBottom: '24px', color: '#fff', maxWidth: '700px' }}>
        Frontier AI models for everything you{' '}
        <span className="grok-underline">
          {text}
        </span>
        <span className="animated-cursor"></span>
      </h1>

      {/* Sub-headline */}
      <p style={{ fontSize: '18px', color: '#888', marginBottom: '44px', lineHeight: 1.6, maxWidth: '550px', fontWeight: 400 }}>
        Reasoning, code, search, and collaboration.<br />
        Powered by industry-leading AI APIs in one unified workspace.
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '14px', flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: errorMsg ? '16px' : '0' }}>
        
        <button onClick={onLogin} disabled={isLoading} style={{ padding: '12px 28px', borderRadius: '100px', background: '#fff', color: '#000', border: 'none', fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isLoading ? <div className="spinner" style={{ width: 18, height: 18, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%' }} /> : 'Try Cylen Beta'}
        </button>
        
        <button onClick={onViewDocs} style={{ padding: '12px 28px', borderRadius: '100px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '15px', fontWeight: 500, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          View Documentation
        </button>
        
      </div>

      {errorMsg && <p style={{ fontSize: '13px', color: '#e53e3e', marginTop: '24px' }}>{errorMsg}</p>}
    </div>
  );
};
