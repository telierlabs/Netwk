import React, { useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

export const BuildDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
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

      {/* 👇 ANIMASI TERMINAL & PULSE UNTUK BUILD CARDS */}
      <style>{`
        /* Animasi kursor kedip terminal */
        .terminal-blink {
          animation: blinker 1s step-start infinite;
        }
        @keyframes blinker { 50% { opacity: 0; } }

        /* Animasi ngetik buat code reasoning */
        @keyframes typeCode {
          0% { clip-path: inset(0 100% 0 0); }
          50% { clip-path: inset(0 0 0 0); }
          90% { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        .anim-type-code {
          display: inline-block;
          animation: typeCode 7s steps(40, end) infinite;
        }

        /* Animasi Agent AI bales chat tim */
        @keyframes pulseAgent {
          0%, 100% { border-left-color: rgba(76, 175, 80, 0.3); background: rgba(76, 175, 80, 0.05); }
          50% { border-left-color: rgba(76, 175, 80, 1); background: rgba(76, 175, 80, 0.15); }
        }
        .anim-agent-reply {
          animation: pulseAgent 3s ease-in-out infinite;
        }
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
        
        {/* HERO SECTION */}
        <div style={{ textAlign: 'center', marginBottom: '100px' }}>
          <div style={{ fontSize: '13px', color: '#f39c12', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(243, 156, 18, 0.1)', width: 'fit-content', margin: '0 auto 24px', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(243, 156, 18, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Cylen Build <span style={{ fontWeight: 'bold' }}>Beta</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            Bring Cylen into<br />your workflow.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            A powerful AI coding assistant designed for complex architectural planning and rapid development.
          </p>
          
          {/* Mockup API/Code Box (Pengganti Terminal curl) */}
          <div style={{ background: '#111', border: '1px solid #333', borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '500px', margin: '0 auto 40px', fontFamily: 'monospace', fontSize: '13px', color: '#ccc' }}>
            <span>$ cylen create-project --template nextjs<span className="terminal-blink">_</span></span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read Docs &rarr;
            </button>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Cylen
            </button>
          </div>
        </div>

        {/* SECTION 1: ARCHITECTURE PLAN (Diaktifin Animasinya) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Plan Architecture</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Cylen reasons through complex tasks step-by-step before writing a single line of code.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Deep reasoning logic for bug fixes and migrations</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Proposes a structured approach for your approval</div>
          </div>
          
          <div style={{ background: '#0a0a0a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', gap: '6px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
              <span style={{ fontSize: '12px', color: '#555', marginLeft: '8px' }}>project/architecture.md</span>
            </div>
            <div style={{ padding: '24px', fontSize: '13px', color: '#ccc', lineHeight: 1.6, minHeight: '180px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <span className="terminal-blink" style={{ color: '#4CAF50' }}>&gt;</span>
                <span style={{ color: '#fff' }}>Migrate auth from sessions to JWT securely.</span>
              </div>
              <div style={{ color: '#888', marginBottom: '16px' }}>&#10242; Thought for 3.4s</div>
              
              {/* 👇 Animasi ngetik dipasang di sini */}
              <div className="anim-type-code">
                <div style={{ color: '#f39c12', marginBottom: '8px' }}>Approach:</div>
                <ol style={{ paddingLeft: '20px', color: '#aaa', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Add jwtVerify helper in <span style={{ color: '#3498db' }}>src/lib/jwt.ts</span>.</li>
                  <li>Add /auth/refresh with rotating refresh tokens.</li>
                  <li>Replace session check in authMiddleware.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: AI TEAM REVIEW (Diaktifin Animasinya) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Team Code Review</h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Invite friends to your Cylen workspace and debug complex code together with the AI.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Multi-user prompting in shared code rooms</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Live context syncing across devices</div>
          </div>

          <div style={{ background: '#0a0a0a', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ fontSize: '13px', color: '#fff', marginBottom: '16px', fontFamily: 'monospace' }}>&gt; Can someone check why the API is throwing 500?</div>
             <div style={{ background: '#111', padding: '12px', borderRadius: '8px', borderLeft: '2px solid #f39c12', marginBottom: '16px' }}>
               <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Rivaldy (Team Lead)</div>
               <div style={{ fontSize: '13px', color: '#ccc' }}>Looks like the rate limiter middleware is blocking internal IPs. Cylen, fix it.</div>
             </div>
             
             {/* 👇 Efek nyala/pulse di pesan Cylen */}
             <div className="anim-agent-reply" style={{ padding: '12px', borderRadius: '8px', borderLeft: '2px solid #4CAF50' }}>
               <div style={{ fontSize: '12px', color: '#4CAF50', marginBottom: '4px' }}>Cylen Agent</div>
               <div style={{ fontSize: '13px', color: '#ccc' }}>Fixing rate limiter logic in <span style={{ fontFamily: 'monospace', color: '#3498db' }}>middleware.ts</span>. Excluding private subnets. <span className="terminal-blink">_</span></div>
             </div>
          </div>
        </div>

        {/* SECTION 3: SANDBOXED EXECUTION (COMING SOON) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Sandboxed Execution <span style={{ fontSize: '12px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle' }}>ROADMAP</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            We are building secure cloud environments so Cylen can execute, test, and deploy untrusted code directly from the chat.
          </p>
          <div style={{ background: '#111', padding: '24px', borderRadius: '16px', border: '1px dashed #333' }}>
            <h3 style={{ fontSize: '13px', color: '#f39c12', fontWeight: 600, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Why we need cloud credits</h3>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>
              {/* 👇 NAMA SUDAH MUTLAK TELIERNEWS */}
              Providing live, isolated Docker environments (sandboxing) for thousands of users requires massive compute clusters. TelierNews Cloud program funding will be dedicated entirely to scaling this secure execution infrastructure.
            </p>
          </div>
        </div>

        {/* --- EVERYTHING YOU NEED TO SHIP SECTION --- */}
        <div style={{ marginBottom: '120px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>Everything you need to ship</h2>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '48px' }}>One intelligent workspace for the entire development lifecycle.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Live: Code Generation */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Code generation <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Write, debug, and explain complex code in any programming language.</div>
              </div>
            </div>

            {/* Live: Deep Reasoning */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Deep reasoning <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Step-by-step logic and architecture planning for hard engineering problems.</div>
              </div>
            </div>

            {/* Live: Memory */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Context Memory <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Persist project architecture decisions and context across different sessions.</div>
              </div>
            </div>

            {/* Live: Web Search Docs */}
            <div style={{ display: 'flex', gap: '20px' }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px', opacity: 0.8 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Web Docs Search <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>BETA</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Look up the latest library docs, API references, and packages instantly.</div>
              </div>
            </div>

            {/* ====== COMING SOON ====== */}
            
            {/* Soon: Sandboxed Execution */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Sandboxed execution <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Run untrusted code, tests, and builds in secure, isolated Docker environments.</div>
              </div>
            </div>

            {/* Soon: CLI / Terminal */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Terminal CLI <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Bring Cylen agents directly into your local machine's terminal.</div>
              </div>
            </div>

            {/* Soon: Subagents */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Subagents <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Spawn parallel AI agents to review PRs, write tests, and refactor files simultaneously.</div>
              </div>
            </div>

            {/* Soon: Git Integration */}
            <div style={{ display: 'flex', gap: '20px', opacity: 0.6 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" style={{ marginTop: '4px' }}><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><line x1="6" y1="9" x2="6" y2="21"></line></svg>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', marginBottom: '6px' }}>
                  Git integration <span style={{ fontSize: '10px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px' }}>COMING SOON</span>
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>Stage, commit, push, and manage GitHub branches directly via AI prompts.</div>
              </div>
            </div>

          </div>
        </div>

        {/* --- GET STARTED SECTION --- */}
        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, textAlign: 'center', marginBottom: '16px' }}>Get started</h2>
          <p style={{ fontSize: '16px', color: '#888', textAlign: 'center', marginBottom: '48px' }}>
            Free to try on the web. Upgrade your workflow today.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>01</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Open Cylen</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Go to cylen.teliernews.com on your web browser.</div>
            </div>
            
            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>02</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Sign in securely</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Use your Google account to log in with one click.</div>
            </div>

            <div style={{ background: '#0a0a0a', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>03</div>
              <div style={{ fontSize: '20px', color: '#fff', fontWeight: 500, marginBottom: '8px' }}>Start building</div>
              <div style={{ fontSize: '14px', color: '#888' }}>Ask Cylen to plan architecture, write code, or review logic.</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '48px' }}>
            <button style={{ padding: '14px 32px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Read docs
            </button>
            <button onClick={onLogin} style={{ padding: '14px 32px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try now &rarr;
            </button>
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
};
