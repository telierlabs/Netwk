import React, { useRef, useEffect, useState } from 'react';
import { Pin, Search } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { CylenCanvas } from '../components/canvas/CylenCanvas';
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
  onRetry?: () => void;
  desktopWelcomeMode?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  isCanvasActive?: boolean;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  onUpgradeClick?: () => void;
}

// Hook animasi angka naik smooth
function useAnimatedCount(target: number, duration = 600) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const end = target;
    if (start === end) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      // ease out
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(tick);
      else prevTarget.current = end;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return display;
}

// 1. Loading Normal — rata kiri
const NormalLoading = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 600, letterSpacing: '0.02em' }}>
      {text ? `Menganalisis: ${text}...` : 'Berpikir...'}
    </span>
  </div>
);

// 2. Loading Web Search — 2 baris SELALU tampil, logo T slide in baris ke-2
const WebSearchLoading = ({ webCount, postCount }: { webCount: number; postCount: number }) => {
  const animatedWeb  = useAnimatedCount(webCount);
  const animatedPost = useAnimatedCount(postCount);

  // Baris 2 slide in dari atas setelah delay kecil
  const [showRow2, setShowRow2] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowRow2(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
      width: '100%',
      padding: '4px 0',
    }}>
      <style>{`
        @keyframes pulseIcon {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes countPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Baris 1 — Searching the web */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ animation: 'pulseIcon 1.4s ease-in-out infinite', display: 'flex' }}>
          <Search size={15} strokeWidth={2.5} color="var(--mu)" />
        </div>
        <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 600 }}>
          Searching the web
        </span>
        {animatedWeb > 0 && (
          <span
            key={animatedWeb}
            style={{
              fontSize: 12,
              color: 'var(--mu)',
              fontWeight: 700,
              opacity: 0.65,
              animation: 'countPop 0.3s ease-out',
            }}
          >
            {animatedWeb} results
          </span>
        )}
      </div>

      {/* Baris 2 — Reading posts, slide in dari atas setelah 350ms */}
      {showRow2 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideDown 0.4s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{
            width: 15,
            height: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.55,
          }}>
            <img
              src="/IMG_20260425_143520.png"
              alt="T"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 600 }}>
            Reading posts
          </span>
          {animatedPost > 0 && (
            <span
              key={animatedPost}
              style={{
                fontSize: 12,
                color: 'var(--mu)',
                fontWeight: 700,
                opacity: 0.65,
                animation: 'countPop 0.3s ease-out',
              }}
            >
              {animatedPost} results
            </span>
          )}
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
          : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
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
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all"
        >
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

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight >= 200);
    }
  };

  useEffect(() => {
    checkScroll();
    if (isSending) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSuggest = (text: string) => onSend(undefined, undefined, text);
  const isEmptyChat = messages.length <= 1 && messages[0]?.role === 'assistant';

  const lastUserMsg    = [...messages].reverse().find(m => m.role === 'user');
  const summarizedText = lastUserMsg
    ? (lastUserMsg.content.length > 25 ? lastUserMsg.content.slice(0, 25) + '...' : lastUserMsg.content)
    : '';

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

      {isCanvasActive && (
        <div className="w-full h-[50vh] md:h-[60vh] flex-shrink-0 relative z-20 border-b border-[var(--bd)] shadow-sm bg-[var(--bg)] transition-all duration-500 overflow-hidden">
          <CylenCanvas />
        </div>
      )}

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
          <div className="max-w-3xl mx-auto flex flex-col gap-10 w-full pb-[140px]">
            {messages.map((msg, i) => {
              if ((msg as any).isConnectionError) return (
                <div key={i} className="w-full">
                  <ConnectionErrorCard type={(msg as any).connectionErrorType} onRetry={onRetry} />
                </div>
              );
              return (
                <div id={`message-${i}`} key={i}>
                  <ChatBubble
                    msg={msg} msgIndex={i}
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
                {isSearching ? (
                  <WebSearchLoading webCount={webCount} postCount={postCount} />
                ) : (
                  <NormalLoading text={summarizedText} />
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      {/* Tombol Scroll */}
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

      <div className="absolute bottom-0 left-0 w-full z-50 pointer-events-none">
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
