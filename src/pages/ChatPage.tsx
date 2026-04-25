import React, { useRef, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  searchQuery: string;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (index: number) => void;
  pinnedMessages: Message[];
  onSaveItem?: (item: any) => void;
  onRetry?: () => void;
  desktopWelcomeMode?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
}

const NormalLoading = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <style>{`
      @keyframes spinDual {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <div style={{
      width: 20, height: 20,
      border: '3px solid var(--text)',
      borderColor: 'var(--text) transparent var(--text) transparent',
      borderRadius: '50%',
      animation: 'spinDual 0.8s linear infinite'
    }} />
    <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500 }}>
      {text ? `Memproses: "${text.length > 35 ? text.slice(0, 35) + '...' : text}"` : 'Berpikir...'}
    </span>
  </div>
);

const WebSearchLoading = ({ query, sourceCount }: { query: string, sourceCount: number }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', marginTop: 8 }}>
      <style>{`
        @keyframes pulseGrok {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500, fontFamily: 'monospace' }}>
          {sourceCount > 0 ? `Mengumpulkan dari ${sourceCount} sumber...` : 'Mencari...'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, animation: 'pulseGrok 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <img
            src="/IMG_20260425_143520.png"
            alt="TelierNews"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        <span style={{
          fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: 'linear-gradient(90deg, var(--mu) 0%, var(--text) 50%, var(--mu) 100%)',
          backgroundSize: '200% auto',
          color: 'transparent',
          WebkitBackgroundClip: 'text',
          animation: 'shimmerText 2s linear infinite'
        }}>
          "{query || 'Data Aktual'}"
        </span>
      </div>
    </div>
  );
};

// 👇 KARTU ERROR YANG UDAH DI-UPDATE BUAT DETEKSI LIMIT
const ConnectionErrorCard = ({ type, onRetry }: { type?: string; onRetry?: () => void }) => {
  const isOffline = type === 'offline';
  const isLimit = type === 'limit'; // Deteksi dari error geminiService

  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isLimit ? (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        ) : (
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        )}
        <span className={`font-bold text-[15px] ${isLimit ? 'text-red-500' : 'text-[var(--text)]'}`}>
          {isLimit ? "Limit Harian Habis" : "Connection Issue"}
        </span>
      </div>
      <p className="text-sm text-[var(--mu)] leading-relaxed">
        {isLimit
          ? 'Kuota gratis harian API Gemini Cylen sudah habis dipakai. Silakan gunakan lagi besok atau ganti API Key Anda.'
          : isOffline
          ? 'No internet connection. Please check your network and try again.'
          : 'Connection failed. Check network connection and try again.'}
      </p>
      {/* Tombol retry diilangin kalo emang limitnya abis */}
      {!isLimit && onRetry && (
        <button onClick={onRetry} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Retry
        </button>
      )}
    </div>
  );
};

const EmptyState = () => <div className="flex flex-col items-center justify-center flex-1" />;

export const ChatPage: React.FC<ChatPageProps> = ({
  messages, isSending, isSearching, searchQuery,
  inputText, setInputText, onSend,
  attachedImage, setAttachedImage,
  onTogglePin, pinnedMessages, onSaveItem, onRetry,
  desktopWelcomeMode = false,
  mode = 'auto',
  onModeChange,
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSuggest = (text: string) => onSend(undefined, undefined, text);

  const isEmptyChat = messages.length <= 1 && messages[0]?.role === 'assistant';
  const lastUserText = messages.filter(m => m.role === 'user').pop()?.content || '';
  const currentSourceCount = messages[messages.length - 1]?.sources?.length || 0;

  if (desktopWelcomeMode) {
    return (
      <div style={{ width: '100%' }}>
        <ChatInput inputText={inputText} setInputText={setInputText} onSend={(imgs, pdfs) => onSend(imgs, pdfs)} isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage} compact mode={mode} onModeChange={onModeChange} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {pinnedMessages.length > 0 && (
        <div className="px-4 pt-2 flex-shrink-0 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div onClick={() => { const lastPinned = pinnedMessages[pinnedMessages.length - 1]; const targetIndex = messages.indexOf(lastPinned); if (targetIndex !== -1) { document.getElementById(`message-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }} className="flex items-center gap-3 bg-[var(--sf)] border border-[var(--bd)] rounded-xl px-4 py-3 cursor-pointer hover:bg-[var(--bd)] transition-colors">
              <div className="w-7 h-7 bg-[var(--ac)] rounded-lg flex items-center justify-center flex-shrink-0"><Pin size={13} className="text-[var(--at)]" /></div>
              <div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-0.5">Pesan Disematkan</p><p className="text-[13px] text-[var(--text)] truncate">{pinnedMessages[pinnedMessages.length - 1].content.slice(0, 80)}</p></div>
              {pinnedMessages.length > 1 && <span className="text-[11px] font-bold text-[var(--mu)] flex-shrink-0">+{pinnedMessages.length - 1}</span>}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
        {isEmptyChat && !isSending ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-8 w-full">
            {messages.map((msg, i) => {
              if ((msg as any).isConnectionError) {
                return <div key={i} className="w-full"><ConnectionErrorCard type={(msg as any).connectionErrorType} onRetry={onRetry} /></div>;
              }
              return <ChatBubble key={i} msg={msg} msgIndex={i} suggestions={msg.suggestions} onSuggest={handleSuggest} onResend={(content) => { setInputText(content); setTimeout(() => onSend(), 0); }} onEdit={(content) => setInputText(content)} onTogglePin={onTogglePin} onSaveItem={onSaveItem} />;
            })}

            {isSending && (
              <div className="flex flex-col items-start w-full">
                {isSearching ? (
                  <WebSearchLoading query={searchQuery} sourceCount={currentSourceCount} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <div style={{ width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                    </div>
                    <NormalLoading text={lastUserText} />
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </main>
      <ChatInput inputText={inputText} setInputText={setInputText} onSend={(imgs, pdfs) => onSend(imgs, pdfs)} isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage} mode={mode} onModeChange={onModeChange} />
    </div>
  );
};
