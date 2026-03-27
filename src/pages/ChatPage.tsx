import React, { useRef, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  searchQuery: string;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[]) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (index: number) => void;
  pinnedMessages: Message[];
  onSaveItem?: (item: any) => void;
}

/* ── Neural Pulse ── */
const NeuralPulse = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28 }}>
    <style>{`
      @keyframes neuralWave {
        0%,100% { opacity:0.15; transform:scaleY(0.4); }
        50% { opacity:0.7; transform:scaleY(1); }
      }
    `}</style>
    {[6,10,18,24,28,20,12,8,14,22,16,6].map((h, i) => (
      <div key={i} style={{
        width: 3, height: h, borderRadius: 99,
        background: 'var(--text)',
        animation: 'neuralWave 1.2s ease-in-out infinite',
        animationDelay: `${i * 0.1}s`,
        opacity: 0.15,
      }} />
    ))}
  </div>
);

/* ── Web Search Loading ── */
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

const WebSearchLoading = ({ query }: { query: string }) => {
  const sources = [
    { icon: <SearchIcon />, text: query || 'Mencari informasi...' },
    { icon: <GlobeIcon />, text: `${query} — referensi terpercaya` },
    { icon: <FileIcon />, text: `Hasil terkait: ${query}` },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <style>{`
        @keyframes wsAppear { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes wsSpin { to{transform:rotate(360deg)} }
        @keyframes wsShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }
      `}</style>
      {sources.map((row, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity:0, animation:'wsAppear 0.35s ease forwards', animationDelay:`${i*0.45}s` }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'var(--sf)', border:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {row.icon}
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
            <span style={{ fontSize:12, color:'var(--mu)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%', display:'block', position:'relative' }}>
              {row.text}
              <span style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'linear-gradient(90deg,transparent 0%,var(--bg) 50%,transparent 100%)', animation:'wsShimmer 2s ease-in-out infinite', animationDelay:`${i*0.3}s`, pointerEvents:'none' }} />
            </span>
            <div style={{ height:5, borderRadius:99, background:'var(--bd)', width:`${55-i*8}%`, opacity:0.5 }} />
          </div>
        </div>
      ))}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:2 }}>
        <div style={{ width:10, height:10, border:'1.5px solid var(--bd)', borderTopColor:'var(--mu)', borderRadius:'50%', animation:'wsSpin 0.8s linear infinite', flexShrink:0 }} />
        <span style={{ fontSize:10, fontFamily:'monospace', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mu)' }}>Membaca sumber···</span>
      </div>
    </div>
  );
};

/* ── Empty State — Grok style: logo + nama inline ── */
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center flex-1">
    <style>{`
      @keyframes floatLogo {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }
    `}</style>
    <div
      className="flex items-center gap-4"
      style={{ animation: 'floatLogo 3.5s ease-in-out infinite' }}
    >
      {/* Icon logo */}
      <div className="w-14 h-14 bg-[var(--ac)] rounded-2xl flex items-center justify-center shadow-md">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--at)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </div>
      {/* Nama */}
      <span
        className="text-[var(--text)] font-bold tracking-tight"
        style={{ fontSize: '2.4rem', lineHeight: 1 }}
      >
        Cylen
      </span>
    </div>
  </div>
);

export const ChatPage: React.FC<ChatPageProps> = ({
  messages, isSending, isSearching, searchQuery,
  inputText, setInputText, onSend,
  attachedImage, setAttachedImage,
  onTogglePin, pinnedMessages, onSaveItem
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSuggest = (text: string) => {
    setInputText(text);
    setTimeout(() => onSend(), 0);
  };

  const isEmptyChat = messages.length <= 1 && messages[0]?.role === 'assistant';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── PINNED MESSAGE BANNER ── */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 pt-2 flex-shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div
              onClick={() => {
                const lastPinned = pinnedMessages[pinnedMessages.length - 1];
                const targetIndex = messages.indexOf(lastPinned);
                if (targetIndex !== -1) {
                  document.getElementById(`message-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="flex items-center gap-3 bg-[var(--sf)] border border-[var(--bd)] rounded-xl px-4 py-3 cursor-pointer hover:bg-[var(--bd)] transition-colors"
            >
              <div className="w-7 h-7 bg-[var(--ac)] rounded-lg flex items-center justify-center flex-shrink-0">
                <Pin size={13} className="text-[var(--at)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-0.5">Pesan Disematkan</p>
                <p className="text-[13px] text-[var(--text)] truncate">{pinnedMessages[pinnedMessages.length - 1].content.slice(0, 80)}</p>
              </div>
              {pinnedMessages.length > 1 && (
                <span className="text-[11px] font-bold text-[var(--mu)] flex-shrink-0">+{pinnedMessages.length - 1}</span>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
        {isEmptyChat && !isSending ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-8 w-full">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                msg={msg}
                msgIndex={i}
                suggestions={msg.suggestions}
                onSuggest={handleSuggest}
                onResend={(content) => { setInputText(content); setTimeout(() => onSend(), 0); }}
                onEdit={(content) => setInputText(content)}
                onTogglePin={onTogglePin}
                onSaveItem={onSaveItem}
              />
            ))}

            {isSending && (
              <div className="flex flex-col items-start w-full">
                <div className="flex items-center gap-3">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  {!isSearching && <NeuralPulse />}
                </div>
                {isSearching && (
                  <div className="mt-3 w-full">
                    <WebSearchLoading query={searchQuery} />
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={(imgs, pdfs) => onSend(imgs, pdfs)}
        isSending={isSending}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
      />
    </div>
  );
};
