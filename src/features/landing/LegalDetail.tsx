import React, { useEffect } from 'react';
import { Footer } from './Footer';

interface LegalProps {
  type: 'about' | 'privacy' | 'terms';
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export const LegalDetail: React.FC<LegalProps> = ({ type, onBack, onNavigate }) => {
  useEffect(() => { 
    window.scrollTo(0, 0); 
  }, [type]);

  const content = {
    about: {
      title: "About Us",
      body: (
        <>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            Cylen is a unified artificial intelligence workspace developed by <strong>Telierlabs</strong>. Founded by Muhamad Rivaldy, Telierlabs operates from Cirebon, Indonesia, with a global mission to democratize access to frontier AI models.
          </p>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            We believe that developers, creators, and researchers shouldn't have to jump between multiple tabs and subscriptions to access the best AI tools. Cylen bridges this gap by aggregating deep reasoning, code generation, and visual AI APIs into one seamless, collaborative environment.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            As an emerging technology ecosystem, we are continuously expanding our cloud infrastructure to support low-latency inference and secure sandbox execution for our users.
          </p>
        </>
      )
    },
    privacy: {
      title: "Privacy Policy",
      body: (
        <>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>Last updated: May 2026</p>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            <strong>1. Information We Collect:</strong> When you use Cylen, we collect basic authentication data via Google OAuth (such as your email address and public profile name). This is strictly used for account management and securing your workspace.
          </p>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            <strong>2. How We Use Your Data:</strong> Your prompts, uploaded documents, and generated code are processed through third-party APIs (such as Google Gemini, OpenAI, etc.). We do not sell your personal data or conversation history to advertisers.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            <strong>3. Data Security:</strong> We implement industry-standard security protocols to protect your data. However, please do not share highly sensitive personal or financial information within the chat, as inputs are routed through external LLM providers.
          </p>
        </>
      )
    },
    terms: {
      title: "Terms of Service",
      body: (
        <>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>Last updated: May 2026</p>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            <strong>1. Acceptance of Terms:</strong> By accessing and using Cylen Beta, you agree to be bound by these Terms. If you do not agree, please do not use our services.
          </p>
          <p style={{ marginBottom: '16px', lineHeight: 1.6 }}>
            <strong>2. Beta Software:</strong> Cylen is currently in its Beta phase. Services, features, and API availability may change without prior notice. The service is provided "AS IS" without warranties of any kind.
          </p>
          <p style={{ lineHeight: 1.6 }}>
            <strong>3. User Responsibility:</strong> You are solely responsible for the content you generate and code you execute using Cylen. Telierlabs is not liable for any damages or code errors resulting from the use of our AI suggestions.
          </p>
        </>
      )
    }
  };

  return (
    <div style={{ background: '#000', minHeight: '100dvh', height: '100dvh', width: '100vw', color: '#fff', fontFamily: "'Sora', sans-serif", display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
      
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '100px', cursor: 'pointer', fontSize: '13px' }}>
          &larr; Back to Home
        </button>
      </header>

      <main style={{ flex: 1, padding: '80px 24px 100px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 500, letterSpacing: '-1px', marginBottom: '40px' }}>
          {content[type].title}
        </h1>
        <div style={{ fontSize: '16px', color: '#bbb' }}>
          {content[type].body}
        </div>
      </main>
      
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
