import React, { useRef, useEffect } from 'react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[]) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
}

/* ── Neural Pulse — loading biasa (tanpa teks) ── */
const NeuralPulse = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
    <style>{`
      @keyframes neuralWave {
        0%, 100% { opacity: 0.15; transform: scaleY(0.4); }
        50%       { opacity: 0.7;  transform: scaleY(1); }
      }
    `}</style>
    {[6,10,18,24,28,20,12,8,14,22,16,6].map((h, i) => (
      <div key={i} style={{
        width: 3,
        height: h,
        borderRadius: 99,
        background: 'var(--text)',
        animation: `neuralWave 1.2s ease-in-out infinite`,
        animationDelay: `${i * 0.1}s`,
        opacity: 0.15,
      }} />
    ))}
  </div>
);

/* ── icon helpers ── */
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

/* ── Web Search loading ── */
const WebSearchLoading = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
    <style>{`
      @keyframes wsAppear {
        from { opacity: 0; transform: translateX(-6px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes wsSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes wsShimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }
    `}</style>

    {([
      { icon: <SearchIcon />, delay: '0s',    w: '70%' },
      { icon: <GlobeIcon />,  delay: '0.5s',  w: '55%' },
      { icon: <FileIcon />,   delay: '1s',    w: '75%' },
    ] as const).map((row, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        opacity: 0,
        animation: `wsAppear 0.4s ease forwards`,
        animationDelay: row.delay,
      }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: 8,
          background: 'var(--sf)',
          border: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {row.icon}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{
            height: 8, borderRadius: 99,
            background: 'var(--bd)',
            width: row.w,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: '40%', height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--mu), transparent)',
              opacity: 0.2,
              animation: `wsShimmer 1.6s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }} />
          </div>
          <div style={{
            height: 6, borderRadius: 99,
            background: 'var(--bd)',
            width: `${parseInt(row.w) - 20}%`,
            opacity: 0.5,
          }} />
        </div>
      </div>
    ))}

    {/* spinner + label */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
      <div style={{
        width: 10, height: 10,
        border: '1.5px solid var(--bd)',
        borderTopColor: 'var(--mu)',
        borderRadius: '50%',
        animation: 'wsSpin 0.8s linear infinite',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10,
        fontFamily: 'monospace',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--mu)',
      }}>
        Membaca sumber···
      </span>
    </div>
  </div>
);

export const ChatPage: React.FC<ChatPageProps> = ({
  messages,
  isSending,
  isSearching,
  inputText,
  setInputText,
  onSend,
  attachedImage,
  setAttachedImage
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSuggest = (text: string) => {
    setInputText(text);
    setTimeout(() => onSend(), 0);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              msg={msg}
              suggestions={msg.suggestions}
              onSuggest={handleSuggest}
              onResend={(content) => {
                setInputText(content);
                setTimeout(() => onSend(), 0);
              }}
              onEdit={(content) => setInputText(content)}
            />
          ))}

          {/* ── Loading state ── */}
          {isSending && (
            <div className="flex flex-col items-start w-full">
              {/* moon icon */}
              <div className="flex items-center gap-2.5 mb-3">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>

              {/* animasi: search vs biasa */}
              {isSearching ? <WebSearchLoading /> : <NeuralPulse />}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={(imgs) => onSend(imgs)}
        isSending={isSending}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
      />
    </div>
  );
};
