import React, { useRef, useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { CylenCanvas } from '../components/canvas/CylenCanvas'; 
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
  isCanvasActive?: boolean; 
  onOpenCanvas?: () => void; 
  onCloseCanvas?: () => void; 
  onUpgradeClick?: () => void;
}

const NormalLoading = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <style>{`@keyframes spinDual { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    <div style={{ width: 20, height: 20, border: '3px solid var(--text)', borderColor: 'var(--text) transparent var(--text) transparent', borderRadius: '50%', animation: 'spinDual 0.8s linear infinite' }} />
    <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500 }}>{text ? `Memproses: "${text.length > 35 ? text.slice(0, 35) + '...' : text}"` : 'Berpikir...'}</span>
  </div>
);

const WebSearchLoading = ({ query, sourceCount }: { query: string, sourceCount: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', marginTop: 8 }}>
    <style>{`@keyframes pulseGrok { 0%, 100% { opacity: 0.5; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } } @keyframes shimmerText { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }`}</style>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, display: 'flex', justifyContent: 'center', flexShrink: 0 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
      <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500, fontFamily: 'monospace' }}>{sourceCount > 0 ? `Mengumpulkan dari ${sourceCount} sumber...` : 'Mencari...'}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, animation: 'pulseGrok 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}><img src="/IMG_20260425_143520.png" alt="TelierNews" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></div>
      <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'linear-gradient(90deg, var(--mu) 0%, var(--text) 50%, var(--mu) 100%)', backgroundSize: '200% auto', color: 'transparent', WebkitBackgroundClip: 'text', animation: 'shimmerText 2s linear infinite' }}>"{query || 'Data Aktual'}"</span>
    </div>
  </div>
);

const ConnectionErrorCard = ({ type, onRetry }: { type?: string; onRetry?: () => void }) => {
  const isOffline = type === 'offline';
  const isLimit = type === 'limit';
  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isLimit ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg> : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>}
        <span className={`font-bold text-[15px] ${isLimit ? 'text-red-500' : 'text-[var(--text)]'}`}>{isLimit ? "Limit Harian Habis" : "Connection Issue"}</span>
      </div>
      <p className="text-sm text-[var(--mu)] leading-relaxed">{isLimit ? 'Kuota gratis harian API Gemini Cylen sudah habis dipakai. Silakan gunakan lagi besok atau ganti API Key Anda.' : isOffline ? 'No internet connection. Please check your network and try again.' : 'Connection failed. Check network connection and try again.'}</p>
      {!isLimit && onRetry && <button onClick={onRetry} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">Retry</button>}
    </div>
  );
};

const EmptyState = () => <div className="flex flex-col items-center justify-center flex-1" />;

export const ChatPage: React.FC<ChatPageProps> = ({
  messages, isSending, isSearching, searchQuery,
  inputText, setInputText, onSend, attachedImage, setAttachedImage,
  onTogglePin, pinnedMessages, onSaveItem, onRetry,
  desktopWelcomeMode = false, mode = 'auto', onModeChange,
  isCanvasActive = false, onOpenCanvas, onCloseCanvas, onUpgradeClick
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null); 
  const [showScrollButton, setShowScrollButton] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isBottom);
    }
  };

  useEffect(() => {
    checkScroll();
    if (isSending) {
       chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggest = (text: string) => onSend(undefined, undefined, text);
  const isEmptyChat = messages.length <= 1 && messages[0]?.role === 'assistant';
  const lastUserText = messages.filter(m => m.role === 'user').pop()?.content || '';
  const currentSourceCount = messages[messages.length - 1]?.sources?.length || 0;

  if (desktopWelcomeMode) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4">
        <ChatInput inputText={inputText} setInputText={setInputText} onSend={(imgs, pdfs) => onSend(imgs, pdfs)} isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage} compact mode={mode} onModeChange={onModeChange} isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas} onUpgradeClick={onUpgradeClick} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg)]">
      
      {isCanvasActive && (
        <div className="w-full h-[50vh] md:h-[60vh] flex-shrink-0 relative z-20 border-b border-[var(--bd)] shadow-sm bg-[var(--bg)] transition-all duration-500 overflow-hidden">
          <CylenCanvas />
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 relative z-30 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--bd)] border-opacity-40">
          <div className="max-w-3xl mx-auto">
            <div onClick={() => { 
                const lastPinned = pinnedMessages[pinnedMessages.length - 1]; 
                const targetIndex = messages.indexOf(lastPinned); 
                if (targetIndex !== -1) { 
                  document.getElementById(`message-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
                } 
              }} 
              className="flex items-center gap-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-[var(--bd)] transition-all active:scale-[0.98]"
            >
              <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Pin size={14} className="text-[var(--at)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--mu)] mb-0.5">Pesan Disematkan</p>
                <p className="text-[13px] text-[var(--text)] truncate font-medium">
                  {pinnedMessages[pinnedMessages.length - 1].content.slice(0, 85)}
                </p>
              </div>
              {pinnedMessages.length > 1 && (
                <div className="px-2 py-1 bg-[var(--bd)] rounded-lg text-[10px] font-black text-[var(--mu)]">
                  +{pinnedMessages.length - 1}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main 
        ref={scrollContainerRef}
        onScroll={checkScroll} 
        className="flex-1 overflow-y-auto p-4 md:px-8 md:py-10 flex flex-col relative z-10 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {isEmptyChat && !isSending ? <EmptyState /> : (
          <div className="max-w-3xl mx-auto flex flex-col gap-10 w-full pb-10">
            {messages.map((msg, i) => {
              if ((msg as any).isConnectionError) return <div key={i} className="w-full"><ConnectionErrorCard type={(msg as any).connectionErrorType} onRetry={onRetry} /></div>;
              return (
                <div id={`message-${i}`} key={i}>
                  <ChatBubble 
                    msg={msg} 
                    msgIndex={i} 
                    suggestions={msg.suggestions} 
                    onSuggest={handleSuggest} 
                    onResend={(content) => { setInputText(content); setTimeout(() => onSend(), 0); }} 
                    onEdit={(content) => setInputText(content)} 
                    onTogglePin={onTogglePin} 
                    onSaveItem={onSaveItem} 
                  />
                </div>
              );
            })}

            {isSending && (
              <div className="flex flex-col items-start w-full px-2">
                {isSearching ? <WebSearchLoading query={searchQuery} sourceCount={currentSourceCount} /> : (
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-10 h-10 bg-[var(--sf)] rounded-2xl flex items-center justify-center flex-shrink-0 border border-[var(--bd)]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

      <div 
        className={`absolute bottom-36 right-6 md:right-10 z-[60] transition-all duration-400 ease-out ${showScrollButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-75 pointer-events-none'}`}
      >
        <button 
          onClick={scrollToBottom}
          className="w-12 h-12 flex items-center justify-center bg-[var(--ac)] text-[var(--at)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all border border-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      
      {/* 🔥 TAMBAH flex-shrink-0 DI SINI BIAR INPUT GAK KETUTUP/KEGENCET */}
      <div className="relative z-50 flex-shrink-0 bg-[var(--bg)] border-t border-[var(--bd)] border-opacity-30">
        <ChatInput 
          inputText={inputText} 
          setInputText={setInputText} 
          onSend={(imgs, pdfs) => onSend(imgs, pdfs)} 
          isSending={isSending} 
          attachedImage={attachedImage} 
          setAttachedImage={setAttachedImage} 
          mode={mode} 
          onModeChange={onModeChange} 
          isCanvasActive={isCanvasActive} 
          onOpenCanvas={onOpenCanvas} 
          onCloseCanvas={onCloseCanvas} 
          onUpgradeClick={onUpgradeClick} 
        />
      </div>
    </div>
  );
};
