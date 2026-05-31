import React, { useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export const ChatDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, []);

  return (
    <div style={{ 
      background: '#000', 
      minHeight: '100dvh',
      height: '100dvh', 
      width: '100vw', 
      color: '#fff', 
      fontFamily: "'Sora', sans-serif", 
      display: 'flex', 
      flexDirection: 'column',
      overflowY: 'auto', 
      overflowX: 'hidden' 
    }}>
      
      {/* 👇 Kumpulan Animasi CSS untuk ngidupin kartu-kartu di bawah */}
      <style>{`
        /* Animasi indikator "Thinking..." */
        @keyframes pulseDot {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        .anim-thinking-dot {
          animation: pulseDot 1.5s ease-in-out infinite;
        }

        /* Animasi Typewriter loop buat teks jawaban AI */
        @keyframes typeWriterLoop {
          0% { clip-path: inset(0 100% 0 0); }
          40% { clip-path: inset(0 0 0 0); }
          80% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        .anim-typewriter {
          display: inline-block;
          animation: typeWriterLoop 8s steps(60, end) infinite;
        }

        /* Animasi Search Crawling (Loading bar) */
        @keyframes scanWeb {
          0% { width: 0%; opacity: 1;}
          50% { width: 100%; opacity: 1;}
          51% { opacity: 0; width: 0%; }
          100% { opacity: 0; width: 0%; }
        }
        .anim-search-bar {
          position: relative;
          overflow: hidden;
        }
        .anim-search-bar::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          height: 2px;
          background: #4CAF50;
          animation: scanWeb 4s linear infinite;
        }

        /* Fade in untuk hasil search secara berurutan */
        @keyframes fadeSequence {
          0%, 50% { opacity: 0; transform: translateY(5px); }
          60%, 100% { opacity: 1; transform: translateY(0); }
        }
        .anim-search-result-1 { animation: fadeSequence 4s infinite 0s; }
        .anim-search-result-2 { animation: fadeSequence 4s infinite 0.5s; }
      `}</style>

      {/* Header */}
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          &larr; Back
        </button>
        <button onClick={onLogin} style={{ background: '#fff', color: '#000', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, border: 'none' }}>
          Try for free
        </button>
      </header>

      <main style={{ flex: 1, padding: '60px 24px 100px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        
        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '100px' }}>
          <div style={{ fontSize: '13px', color: '#888', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <img 
              src="/82374-removebg-preview.png" 
              alt="Cylen Logo" 
              style={{ height: '18px', width: 'auto', objectFit: 'contain' }} 
            />
            Cylen | Available on Web
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            The collaborative<br />AI workspace.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            Chat, search, analyze, and collaborate — all in one place. Answers powered by multiple frontier models.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen Beta &rarr;
            </button>
            <button style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              View Documentation
            </button>
          </div>
        </div>

        {/* --- KARTU 1: CHAT (Diaktifkan) --- */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Chat</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            A unified assistant for everyday work — writing, research, and quick recaps.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Standard chat with multi-model reasoning</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Retains history across sessions securely</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Fast inference with clean, minimal UI</div>
          </div>
          
          <div style={{ background: '#111', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: '#222', padding: '12px 16px', borderRadius: '12px 12px 0 12px', width: 'fit-content', marginLeft: 'auto', fontSize: '14px', color: '#fff', marginBottom: '16px' }}>Explain quantum computing in simple terms.</div>
            
            {/* 👇 Animasi Thinking Dot diaktifkan */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
               <div className="anim-thinking-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fff' }}></div>
               <span style={{ fontSize: '12px', color: '#888' }}>Thinking...</span>
            </div>
            
            {/* 👇 Animasi Typewriter diaktifkan */}
            <div style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.5, marginBottom: '24px', minHeight: '60px' }}>
              <span className="anim-typewriter">Imagine a coin. Normally it's either heads or tails. A quantum computer uses coins that can be spinning in the air—being both heads and tails at the same time...</span>
            </div>

            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
              <span style={{ color: '#555', fontSize: '14px', paddingLeft: '8px' }}>Ask follow up...</span>
              <div style={{ width: '28px', height: '28px', background: '#333', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        {/* --- KARTU 2: SEARCH (Diaktifkan) --- */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Search</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Search information and synthesize data natively without switching tabs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Standard web search capabilities</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Live context gathering for accurate answers</div>
          </div>

          <div style={{ background: '#111', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: '#222', padding: '12px 16px', borderRadius: '12px 12px 0 12px', width: 'fit-content', marginLeft: 'auto', fontSize: '14px', color: '#fff', marginBottom: '24px' }}>What is the market reaction to today's tech news?</div>
            
            {/* 👇 Animasi Search bar & Sequence Text diaktifkan */}
            <div className="anim-search-result-1">
              <div className="anim-search-bar" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '12px', width: 'fit-content', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  Searched web
                </div>
                <span style={{ marginLeft: '12px' }}>5 results</span>
              </div>
              <div style={{ fontSize: '14px', color: '#ccc', marginLeft: '22px', marginBottom: '16px' }}>Stock market reaction May 2026 indicates a strong pivot towards...</div>
            </div>

            <div className="anim-search-result-2">
              <div className="anim-search-bar" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '12px', width: 'fit-content', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  Synthesizing data
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#ccc', marginLeft: '22px', marginBottom: '24px' }}>Latest updates in frontier AI technology have boosted enterprise confidence globally.</div>
            </div>
            
            <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333' }}>
              <span style={{ color: '#555', fontSize: '14px', paddingLeft: '8px' }}>Search...</span>
              <div style={{ width: '28px', height: '28px', background: '#333', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
          </div>
        </div>

        {/* --- KARTU 3: AI GROUPS --- */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>AI Groups</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Create shared workspaces and collaborate with friends and AI together.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Invite users to a shared context room</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Multi-user prompting in one clean thread</div>
          </div>

          <div style={{ background: '#111', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#444', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>Me</div>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#555', border: '2px solid #111', marginLeft: '-12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>U2</div>
              </div>
              <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>Project Workspace</span>
            </div>
            <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '12px', fontSize: '13px', color: '#888', textAlign: 'center', border: '1px dashed #333' }}>
              + Invite more friends to collaborate
            </div>
          </div>
        </div>

        {/* --- KARTU 4: IMAGINE (Ganti pake gambar lu) --- */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Imagine <span style={{ fontSize: '12px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle' }}>RESEARCH STAGE</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Generate images and visual assets from text prompts. (Coming in future updates).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Text-to-image integration in one thread</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> High-fidelity visual reasoning</div>
          </div>

          {/* 👇 Gambar dimasukin ke sini dengan background cover */}
          <div style={{ 
            background: `url(/file_00000000b39071fa92fcf38d36bbf925.png) center/cover no-repeat`, 
            borderRadius: '20px', 
            height: '250px', 
            border: '1px solid rgba(255,255,255,0.05)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'flex-end', 
            padding: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Overlay gelap dikit di bawah biar teks input tetep kebaca jelas */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
            
            <div style={{ position: 'relative', zIndex: 2, background: 'rgba(26,26,26,0.8)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: '#ccc', fontSize: '14px', paddingLeft: '8px' }}>+ A high-fashion portrait reimagined...</span>
              <div style={{ width: '28px', height: '28px', background: '#333', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </div>
            </div>
          </div>
        </div>

        {/* --- AND MUCH MORE SECTION (EXPANDED LIST) --- */}
        <div style={{ marginBottom: '120px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>And much more</h2>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '48px' }}>Everything you need in one assistant — from everyday tasks to deep research.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            
            {/* 1. Deep Reasoning (Thinking/Spark) */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Deep reasoning <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Step-by-step thinking processes you can follow and verify.</div>
              </div>
            </div>

            {/* 2. Web Search */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Standard Web Search <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Answers grounded in live sources across the web.</div>
              </div>
            </div>

            {/* 3. AI Groups */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  AI Groups & Collaboration <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Parallel problem solving in shared workspaces with friends.</div>
              </div>
            </div>

            {/* 4. Code Generation */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Code generation <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Write, debug, and explain code logic in any language.</div>
              </div>
            </div>

            {/* 5. File & PDF Analysis */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  File & PDF analysis <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Upload documents and get instant summaries and insights.</div>
              </div>
            </div>

            {/* 6. Tasks / Pengaturan */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Tasks & Management <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Organize your workflow and preferences directly in settings.</div>
              </div>
            </div>

            {/* 7. Memory */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Memory across chats <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Remembers your preferences and past conversations context.</div>
              </div>
            </div>

            {/* 8. Share Conversations */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Shareable conversations <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Share any thread with a secure public link.</div>
              </div>
            </div>

            {/* 9. Voice Dictation (Standard) */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Voice dictation <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Standard microphone input to translate speech to text.</div>
              </div>
            </div>

            {/* ======================= COMING SOON ======================= */}

            {/* 10. Live Teliernews Integration */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px' }}>
                <img 
                  src="/85406-removebg-preview.png" 
                  alt="Teliernews Icon" 
                  style={{ width: '24px', height: 'auto', filter: 'brightness(2)' }} 
                />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Live Teliernews integration <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Breaking news, tech trends, and live updates via Teliernews portal.</div>
              </div>
            </div>

            {/* 11. Realtime Search */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Realtime deep search <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Sub-second indexing and autonomous web crawling.</div>
              </div>
            </div>

            {/* 12. Image Generation */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Image generation <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Create high-fidelity images from text directly in chat.</div>
              </div>
            </div>

            {/* 13. Video Generation */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Video generation <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Text-to-video capabilities up to 15 seconds at HD resolution.</div>
              </div>
            </div>

            {/* 14. Live Voice */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Live Voice conversations <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Natural back-and-forth speech with sub-second latency.</div>
              </div>
            </div>

            {/* 15. Vision Understanding */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Vision understanding <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Analyze live camera feeds, screenshots, and complex diagrams.</div>
              </div>
            </div>

            {/* 16. Library */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Centralized Library <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Save, organize, and manage all your documents and generated outputs.</div>
              </div>
            </div>

            {/* 17. Ghost Mode */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><path d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10S17.523 2 12 2 2 6.477 2 12z"></path><path d="M12 2v20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Ghost Mode <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Private, incognito sessions that are never saved to history.</div>
              </div>
            </div>

          </div>
        </div>

        {/* --- GET STARTED SECTION --- */}
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>Get started</h2>
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginBottom: '48px' }}>
            Free to try on the web. Secure authentication via Google.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>01</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Open Cylen</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Go to cylen.teliernews.com on your web browser.</div>
            </div>
            
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>02</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Sign in</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Use your Google account to log in securely with one click.</div>
            </div>

            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>03</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Start chatting</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Ask anything — switch modes for search, reasoning, or files.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '48px' }}>
            <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen Beta &rarr;
            </button>
            <button style={{ padding: '14px 32px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Documentation
            </button>
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
};
