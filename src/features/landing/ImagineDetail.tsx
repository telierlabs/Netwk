import React, { useState, useEffect } from 'react';
import { Footer } from './Footer';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, marginTop: '2px', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const QaRow: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', cursor: 'pointer' }}
      >
        <span style={{ fontSize: '15px', color: '#fff', fontWeight: 500 }}>{question}</span>
        <svg 
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      {isOpen && (
        <div style={{ paddingBottom: '24px', fontSize: '14px', color: '#aaa', lineHeight: 1.6 }}>
          {answer}
        </div>
      )}
    </div>
  );
};

export const ImagineDetail: React.FC<{ onBack: () => void, onLogin: () => void }> = ({ onBack, onLogin }) => {
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
          <div style={{ fontSize: '13px', color: '#3498db', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(52, 152, 219, 0.1)', width: 'fit-content', margin: '0 auto 24px', padding: '6px 12px', borderRadius: '100px', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Cylen Imagine <span style={{ fontWeight: 'bold' }}>Research Stage</span>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 500, letterSpacing: '-1px', lineHeight: 1.1, marginBottom: '24px' }}>
            From prompt to<br />pixel-perfect reality.
          </h1>
          <p style={{ fontSize: '18px', color: '#888', lineHeight: 1.5, marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
            State-of-the-art image understanding, generation, and editing — unified in one workspace.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
            <button onClick={onLogin} style={{ padding: '12px 24px', borderRadius: '100px', background: '#fff', color: '#000', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              Try Playground
            </button>
            <button style={{ padding: '12px 24px', borderRadius: '100px', background: 'transparent', color: '#fff', fontSize: '15px', fontWeight: 500, border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Documentation
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '12px', color: '#666' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect></svg> Up to 2K resolution</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg> Video up to 15s</span>
          </div>
        </div>

        {/* SECTION 1: VISION UNDERSTANDING (BETA - LIVE) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Vision Understanding <span style={{ fontSize: '12px', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle', border: '1px solid rgba(76,175,80,0.2)' }}>BETA</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Upload a photo, screenshot, or diagram. Cylen can instantly analyze the content, extract text, and explain complex visuals.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Live OCR and text extraction from images</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Ask follow-up questions about specific image details</div>
          </div>
          
          <div style={{ background: '#111', borderRadius: '20px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
             {/* 👇 Gambar dimasukkan di sini menggantikan tulisan diagram */}
             <div style={{ width: '100%', height: '200px', background: 'url(/IMG_20260531_224032.jpg) center/cover no-repeat', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.1)' }}></div>
             <div style={{ fontSize: '14px', color: '#ccc', padding: '0 8px' }}>
               Based on the uploaded image, this appears to be a stylized illustration or visual asset...
             </div>
          </div>
        </div>

        {/* SECTION 2: TEXT & IMAGE TO VIDEO (COMING SOON) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Text & image to video <span style={{ fontSize: '12px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle', border: '1px solid rgba(243, 156, 18, 0.3)' }}>COMING SOON</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Product demos, visual effects, and creative content. Turn a prompt or photo into a cinematic video with smooth pans, zooms, and reveals.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Text-to-video and image-to-video in one API</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Up to 15-second clips with motion control</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> High-fidelity output across photoreal and stylized scenes</div>
          </div>

          <div style={{ background: '#111', borderRadius: '20px', height: '240px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(45deg, #1a1a1a, #0a0a0a)' }}></div>
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, backdropFilter: 'blur(4px)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: '#ccc', zIndex: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
              + Cinematic fly-through of a cyberpunk city at dusk...
            </div>
          </div>
        </div>

        {/* SECTION 3: CREATIVE RESTYLE & EDITS (COMING SOON) */}
        <div style={{ marginBottom: '100px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            <h2 style={{ fontSize: '28px', fontWeight: 500 }}>Creative restyle & edits <span style={{ fontSize: '12px', background: 'rgba(243, 156, 18, 0.2)', color: '#f39c12', padding: '4px 8px', borderRadius: '100px', marginLeft: '8px', verticalAlign: 'middle', border: '1px solid rgba(243, 156, 18, 0.3)' }}>COMING SOON</span></h2>
          </div>
          <p style={{ fontSize: '16px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
            Seamlessly switch between styles to reinvent the experience in seconds. Edit colors and objects with accuracy for complete control over your visual showcase.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Apply cinematic, anime, retro, and watercolor styles</div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#ddd' }}><CheckIcon /> Target specific attributes without disturbing the rest</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ 
              background: 'url(/file_00000000d76c7208876cf9ae113b8adc.png) center/cover no-repeat', 
              borderRadius: '16px', 
              height: '200px', 
              border: '1px solid rgba(255,255,255,0.05)', 
              position: 'relative', 
              overflow: 'hidden' 
            }}>
               <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>ORIGINAL</div>
            </div>
            
            <div style={{ 
              background: 'url(/fca6ee1cb40032bd8dd8ff954d9cbe1d.jpg) center/cover no-repeat', 
              borderRadius: '16px', 
              height: '200px', 
              border: '1px solid rgba(255,255,255,0.05)', 
              position: 'relative', 
              overflow: 'hidden' 
            }}>
               <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>ANIME STYLE</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
            <span style={{ fontSize: '12px', background: '#fff', color: '#000', padding: '6px 16px', borderRadius: '100px', fontWeight: 500 }}>Anime</span>
            <span style={{ fontSize: '12px', background: '#111', color: '#888', padding: '6px 16px', borderRadius: '100px', border: '1px solid #333' }}>Cyberpunk</span>
            <span style={{ fontSize: '12px', background: '#111', color: '#888', padding: '6px 16px', borderRadius: '100px', border: '1px solid #333' }}>Watercolor</span>
            <span style={{ fontSize: '12px', background: '#111', color: '#888', padding: '6px 16px', borderRadius: '100px', border: '1px solid #333' }}>Origami</span>
          </div>
        </div>

        {/* CLOUD FUNDING MISSION */}
        <div style={{ padding: '60px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '100px', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 400, lineHeight: 1.5, color: '#fff', maxWidth: '600px', margin: '0 auto 24px' }}>
            "To deploy state-of-the-art Image and Video generation without latency, Cylen requires substantial GPU compute. Cloud credits will directly fund this frontier capability."
          </p>
          <div style={{ fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 17 22 12"></polyline></svg>
             {/* 👇 Diubah jadi TelierNews sesuai request */}
             TelierNews Infrastructure Mission
          </div>
        </div>

        {/* --- COMMON QUESTIONS (Q&A) SECTION --- */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 500, marginBottom: '16px' }}>Common questions</h2>
          <p style={{ fontSize: '16px', color: '#888', marginBottom: '40px' }}>
            About visual reasoning, generation, and roadmap capabilities. For a deeper dive, read the docs.
          </p>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <QaRow 
              question="What image understanding capabilities does Cylen support?" 
              answer="Currently in Beta, Cylen supports vision understanding. You can upload photos, screenshots, or diagrams, and our integrated reasoning models can extract text (OCR) and answer complex questions about the visual context." 
            />
            <QaRow 
              question="When will text-to-image and text-to-video be available?" 
              answer="These features are currently in our Research Stage. We are seeking cloud infrastructure partnerships to secure the necessary GPU compute clusters to deploy these heavy generation capabilities reliably to our users." 
            />
            <QaRow 
              question="Can I edit existing images and videos with text prompts?" 
              answer="This is part of our future roadmap. Once our core image generation infrastructure is live, we plan to support precision edits and creative restyling using natural language prompts." 
            />
            <QaRow 
              question="What aspect ratios and resolutions will be supported?" 
              answer="Our goal for the final release is to support up to 2K resolution for images and standard aspect ratios (16:9, 9:16, 1:1) to accommodate both professional web and mobile social media formats." 
            />
            <QaRow 
              question="How will pricing work for heavy GPU tasks like video generation?" 
              answer="During the current MVP phase, basic text and vision features are free. Heavy compute features like video generation will be part of a Pro tier once our cloud scaling and infrastructure are fully deployed." 
            />
            <QaRow 
              question="Is content moderation applied to generated outputs?" 
              answer="Yes, safety is a priority. All integrated APIs and future in-house models are bound by strict safety filters to prevent the generation of harmful, illegal, or explicit content." 
            />
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
};
