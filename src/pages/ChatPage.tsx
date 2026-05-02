import React, { useRef, useEffect, useState } from 'react';
import { Pin, Search } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  webCount: number;
  postCount: number;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (index: number) => void;
  pinnedMessages: Message[];
  onSaveItem?: (item: any) => void;
  onRetry?: (index?: number) => void;
  desktopWelcomeMode?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  isCanvasActive?: boolean;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  onUpgradeClick?: () => void;
}

function useFakeCounter(active: boolean, realTarget: number, maxFake: number = 30) {
  const [display, setDisplay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const displayRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      displayRef.current = 0;
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      const current = displayRef.current;
      const target  = Math.max(realTarget, 0);
      let next: number;
      if (current < target) {
        next = Math.min(current + Math.ceil(Math.random() * 3), target);
      } else if (current < maxFake) {
        next = current + 1;
      } else {
        next = current;
      }
      displayRef.current = next;
      setDisplay(next);
    }, 120);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, realTarget, maxFake]);

  return display;
}

const NormalLoading = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 15, color: 'var(--mu)', fontWeight: 600, letterSpacing: '0.02em' }}>
      {text ? `Menganalisis: ${text}...` : 'Berpikir...'}
    </span>
  </div>
);

const WebSearchLoading = ({ active, webCount, postCount }: { active: boolean; webCount: number; postCount: number }) => {
  const fakeWeb  = useFakeCounter(active, webCount, 25);
  const fakePost = useFakeCounter(active, postCount, 18);
  const [showRow2, setShowRow2] = useState(false);

  useEffect(() => {
    if (!active) { setShowRow2(false); return; }
    const t = setTimeout(() => setShowRow2(true), 400);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, width: '100%', padding: '2px 0' }}>
      <style>{`
        @keyframes pulseIcon { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ animation: 'pulseIcon 1.4s ease-in-out infinite', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <Search size={22} strokeWidth={2.2} color="var(--mu)" />
        </div>
        <span style={{ fontSize: 16, color: 'var(--mu)', fontWeight: 600 }}>Searching the web</span>
        <span style={{ fontSize: 16, color: 'var(--mu)', fontWeight: 700, opacity: 0.75, minWidth: 24 }}>{fakeWeb} results</span>
      </div>
      {showRow2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'slideDown 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
          <div style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/IMG_20260425_143520.png" alt="T" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.75 }} />
          </div>
          <span style={{ fontSize: 16, color: 'var(--mu)', fontWeight: 600 }}>Reading posts</span>
          <span style={{ fontSize: 16, color: 'var(--mu)', fontWeight: 700, opacity: 0.75, minWidth: 24 }}>{fakePost} results</span>
        </div>
      )}
    </div>
  );
};

const ConnectionErrorCard = ({ type, onRetry }: { type?: string; onRetry?: () => void }) => {
  const isOffline = type === 'offline';
  const isLimit   = type === 'limit';
  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {isLimit
          ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 00-3.42 0z"/></svg>
        }
        <span className={`font-bold text-[15px] ${isLimit ? 'text-red-500' : 'text-[var(--text)]'}`}>
          {isLimit ? 'Limit Harian Habis' : 'Connection Issue'}
        </span>
      </div>
      <p className="text-sm text-[var(--mu)] leading-relaxed">
        {isLimit
          ? 'Kuota gratis harian API Gemini Cylen sudah habis dipakai. Silakan gunakan lagi besok atau ganti API Key Anda.'
          : isOffline
            ? 'No internet connection. Please check your network and try again.'
            : 'Connection failed. Check network connection and try again.'
        }
      </p>
      {!isLimit && onRetry && (
        <button onClick={() => onRetry()} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">
          Retry
        </button>
      )}
    </div>
  );
};

const EmptyState = () => <div className="flex flex-col items-center justify-center flex-1" />;

export const ChatPage: React.FC<ChatPageProps> = ({
  messages, isSending, isSearching,
  webCount, postCount,
  inputText, setInputText, onSend, attachedImage, setAttachedImage,
  onTogglePin, pinnedMessages, onSaveItem, onRetry,
  desktopWelcomeMode = false, mode = 'auto', onModeChange,
  isCanvasActive = false, onOpenCanvas, onCloseCanvas, onUpgradeClick
}) => {
  const chatEndRef         = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll]             = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      
      setShowScrollButton(distanceToBottom >= 200);
      
      if (distanceToBottom > 150) {
        setAutoScroll(false);
      } else {
        setAutoScroll(true);
      }
    }
  };

  useEffect(() => {
    if (autoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  useEffect(() => {
    if (isSending) {
      setAutoScroll(true);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isSending]);

  const scrollToBottom = () => {
    setAutoScroll(true); 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggest  = (text: string) => onSend(undefined, undefined, text);
  const isEmptyChat    = messages.length <= 1 && messages[0]?.role === 'assistant';

  const lastUserMsg    = [...messages].reverse().find(m => m.role === 'user');
  const summarizedText = lastUserMsg
    ? (lastUserMsg.content.length > 25 ? lastUserMsg.content.slice(0, 25) + '...' : lastUserMsg.content)
    : '';

  const lastUserIndex = messages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);

  if (desktopWelcomeMode) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pointer-events-auto">
        <ChatInput
          inputText={inputText} setInputText={setInputText}
          onSend={(imgs, pdfs) => onSend(imgs, pdfs)}
          isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
          compact mode={mode} onModeChange={onModeChange}
          isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas}
          onUpgradeClick={onUpgradeClick}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg)]">

      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 relative z-30 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--bd)] border-opacity-40">
          <div className="max-w-3xl mx-auto">
            <div
              onClick={() => {
                const lastPinned  = pinnedMessages[pinnedMessages.length - 1];
                const targetIndex = messages.indexOf(lastPinned);
                if (targetIndex !== -1)
                  document.getElementById(`message-${targetIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        className="flex-1 overflow-y-auto p-4 md:px-8 pt-6 flex flex-col relative z-10 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {isEmptyChat && !isSending ? <EmptyState /> : (
          <div className="max-w-3xl mx-auto flex flex-col gap-10 w-full pb-[160px]">
            {messages.map((msg, i) => {
              const isConnectionError = (msg as any).isConnectionError;
              const showLoadingHere = isSending && i === lastUserIndex;

              return (
                <React.Fragment key={i}>
                  <div id={`message-${i}`} className="w-full">
                    {isConnectionError ? (
                      <ConnectionErrorCard type={(msg as any).connectionErrorType} onRetry={onRetry} />
                    ) : (
                      <ChatBubble
                        msg={msg} 
                        msgIndex={i}
                        isLast={i === messages.length - 1}
                        suggestions={msg.suggestions}
                        onSuggest={handleSuggest}
                        onResend={(content) => { setInputText(content); setTimeout(() => onSend(), 0); }}
                        onEdit={(content) => setInputText(content)}
                        onTogglePin={onTogglePin}
                        onSaveItem={onSaveItem}
                        onRegenerate={onRetry}
                      />
                    )}
                  </div>

                  {showLoadingHere && (
                    <div className="w-full flex flex-col items-start -mt-4 mb-2">
                      {isSearching ? (
                        <WebSearchLoading active={isSearching} webCount={webCount} postCount={postCount} />
                      ) : (
                        <NormalLoading text={summarizedText} />
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {isSending && lastUserIndex === -1 && (
              <div className="w-full flex flex-col items-start mb-2">
                {isSearching ? (
                  <WebSearchLoading active={isSearching} webCount={webCount} postCount={postCount} />
                ) : (
                  <NormalLoading text={summarizedText} />
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      <div className={`absolute bottom-36 right-6 md:right-10 z-[60] transition-all duration-400 ease-out ${
        showScrollButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-75 pointer-events-none'
      }`}>
        <button
          onClick={scrollToBottom}
          className="w-12 h-12 flex items-center justify-center bg-[var(--ac)] text-[var(--at)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all border border-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 w-full z-[100] pointer-events-none">
        <ChatInput
          inputText={inputText} setInputText={setInputText}
          onSend={(imgs, pdfs) => onSend(imgs, pdfs)}
          isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
          mode={mode} onModeChange={onModeChange}
          isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas}
          onUpgradeClick={onUpgradeClick}
        />
      </div>
    </div>
  );
};
