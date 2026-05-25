import React, { useRef, useEffect, useState } from 'react';
import { Pin, Search } from 'lucide-react'; 
import { ChatBubble } from '../components/chat';
import { ChatInput, ChatMode } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  webCount: number;
  postCount: number;
  activityStatus?: 'idle' | 'image' | 'pdf' | 'docs' | 'excel' | 'ppt' | 'ebook';
  inputText: string;
  setInputText: (text: string) => void;
  onSend: (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
  onTogglePin: (index: number) => void;
  pinnedMessages: Message[];
  onSaveItem?: (text: string) => void; // ── PERBAIKAN 1: TIPE DATA DIUBAH JADI STRING ──
  onRetry?: (index?: number) => void;
  desktopWelcomeMode?: boolean;
  mode?: ChatMode;
  onModeChange?: (mode: ChatMode) => void;
  isCanvasActive?: boolean;
  onOpenCanvas?: () => void;
  onCloseCanvas?: () => void;
  onUpgradeClick?: () => void;
  isTemporary?: boolean;
}

function useFakeCounter(active: boolean, realTarget: number, maxFake: number = 30) {
  const [display, setDisplay] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const displayRef = useRef(0);
  useEffect(() => {
    if (!active) { setDisplay(0); displayRef.current = 0; if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      const current = displayRef.current;
      const target  = Math.max(realTarget, 0);
      let next: number;
      if (current < target) next = Math.min(current + Math.ceil(Math.random() * 3), target);
      else if (current < maxFake) next = current + 1;
      else next = current;
      displayRef.current = next; setDisplay(next);
    }, 120);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, realTarget, maxFake]);
  return display;
}

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
        {isLimit ? 'Kuota gratis harian API Gemini Cylen sudah habis dipakai. Silakan gunakan lagi besok atau ganti API Key Anda.'
          : isOffline ? 'No internet connection. Please check your network and try again.'
          : 'Connection failed. Check network connection and try again.'}
      </p>
      {!isLimit && onRetry && (
        <button onClick={() => onRetry()} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all">Retry</button>
      )}
    </div>
  );
};

const GhostEmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center pointer-events-none select-none" style={{ paddingBottom: '20vh' }}>
    <style>{`
      @keyframes ghost-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
      @keyframes ghost-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
    <div style={{ animation: 'ghost-float 3.5s ease-in-out infinite, ghost-in 0.4s ease-out both' }}>
      <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
        <path d="M9 10h.01"/><path d="M15 10h.01"/>
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
      </svg>
    </div>
    <div className="flex flex-col items-center gap-3 text-center mt-6" style={{ animation: 'ghost-in 0.4s 0.12s ease-out both', opacity: 0 }}>
      <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', opacity: 0.85, letterSpacing: '-0.01em' }}>Private Chat</span>
      <span style={{ fontSize: 14, color: 'var(--text)', opacity: 0.4, lineHeight: 1.5, maxWidth: 260 }}>Chat ini tidak akan muncul di riwayat dan akan dihapus sepenuhnya</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center select-none pointer-events-none relative overflow-hidden" style={{ paddingBottom: '14vh' }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600&display=swap');
      @keyframes particle-orbit-clockwise { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes particle-orbit-counter { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
      @keyframes text-fade-in-premium { 0% { opacity: 0; transform: scale(0.98); } 100% { opacity: 1; transform: scale(1); } }
    `}</style>
    <div className="relative w-[360px] h-[360px] flex items-center justify-center" style={{ animation: 'text-fade-in-premium 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      <div style={{ position: 'absolute', width: '100%', height: '100%', animation: 'particle-orbit-clockwise 26s linear infinite' }}>
        <div style={{ position: 'absolute', top: '10%', left: '22%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '45%', right: '4%', width: 5.5, height: 5.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '12%', right: '20%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '25%', left: '8%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '72%', left: '15%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '20%', right: '15%', width: 5.5, height: 5.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '4%', left: '50%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '50%', left: '2%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
      </div>
      <div style={{ position: 'absolute', width: '76%', height: '76%', animation: 'particle-orbit-counter 18s linear infinite' }}>
        <div style={{ position: 'absolute', top: '6%', right: '24%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '58%', right: '6%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '18%', left: '14%', width: 5.5, height: 5.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '28%', left: '6%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '6%', right: '32%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '80%', left: '40%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '35%', right: '10%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
      </div>
      <div style={{ position: 'absolute', width: '52%', height: '52%', animation: 'particle-orbit-clockwise 12s linear infinite' }}>
        <div style={{ position: 'absolute', top: '0%', left: '46%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '26%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '42%', left: '0%', width: 5.5, height: 5.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '34%', left: '84%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '22%', left: '15%', width: 4.5, height: 4.5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '45%', width: 5, height: 5, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
        <div style={{ position: 'absolute', top: '70%', right: '18%', width: 4, height: 4, borderRadius: '50%', background: 'var(--text)', opacity: 1 }} />
      </div>
      <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '32px', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text)', textAlign: 'center', zIndex: 10, padding: '0 24px', opacity: 1 }}>
        Mulai instruksi.
      </h1>
    </div>
  </div>
);

const CylenDynamicLoading: React.FC<{ isSearching: boolean; userPrompt: string }> = ({ isSearching, userPrompt }) => {
  const getStatusText = () => {
    const p = userPrompt.toLowerCase().trim();
    if (isSearching) return 'Mencari data...';
    
    if (p.includes('buatkan kode') || p.includes('bikin kode') || p.includes('script') || p.includes('coding') || p.includes('fungsi')) {
      return 'Menyusun kode...';
    }
    if (p.includes('analisis') || p.includes('cek kode') || p.includes('benerin') || p.includes('perbaiki') || p.includes('eror')) {
      return 'Menganalisis...';
    }
    if (p.includes('buatkan') || p.includes('tulis') || p.includes('bikin') || p.includes('jelaskan') || p.includes('artinya')) {
      return 'Memproses teks...';
    }
    return 'Berpikir...';
  };

  return (
    <div className="w-full flex items-center justify-start gap-4 py-4 pl-1 select-none pointer-events-none">
      <style>{`
        @keyframes helix-h-1 {
          0%, 100% { transform: translateX(0px) scale(1); opacity: 1; z-index: 2; }
          25% { transform: translateX(14px) scale(0.7); opacity: 0.4; }
          50% { transform: translateX(0px) scale(0.5); opacity: 0.15; z-index: 1; }
          75% { transform: translateX(-14px) scale(0.7); opacity: 0.4; }
        }
        @keyframes helix-h-2 {
          0%, 100% { transform: translateX(0px) scale(0.5); opacity: 0.15; z-index: 1; }
          25% { transform: translateX(-14px) scale(0.7); opacity: 0.4; }
          50% { transform: translateX(0px) scale(1); opacity: 1; z-index: 2; }
          75% { transform: translateX(14px) scale(0.7); opacity: 0.4; }
        }
        @keyframes neu-rot-engine { 100% { transform: rotate(360deg); } }
        @keyframes neu-scale-engine { 0% { transform: scale(0.4); opacity: 0.2; } 100% { transform: scale(1.3); opacity: 1; } }
      `}</style>

      {isSearching ? (
        <div style={{ position: 'relative', width: '20px', height: '20px', animation: 'neu-rot-engine 2.2s linear infinite', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: '7px', width: '5.5px', height: '5.5px', borderRadius: '50%', background: 'var(--text)', animation: 'neu-scale-engine 1s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '5.5px', height: '5.5px', borderRadius: '50%', background: 'var(--text)', animation: 'neu-scale-engine 1s ease-in-out infinite alternate', animationDelay: '-0.33s' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '5.5px', height: '5.5px', borderRadius: '50%', background: 'var(--text)', animation: 'neu-scale-engine 1s ease-in-out infinite alternate', animationDelay: '-0.66s' }} />
        </div>
      ) : (
        <div style={{ position: 'relative', width: '36px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ position: 'absolute', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text)', animation: 'helix-h-1 1.2s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--text)', animation: 'helix-h-2 1.2s ease-in-out infinite' }} />
        </div>
      )}

      <span style={{ fontFamily: 'monospace', fontSize: '12.5px', letterSpacing: '0.01em', color: 'var(--text)', opacity: 0.45, fontWeight: 500 }}>
        {getStatusText()}
      </span>
    </div>
  );
};

export const ChatPage: React.FC<ChatPageProps> = ({
  messages, isSending, isSearching, webCount, postCount,
  activityStatus = 'idle', 
  inputText, setInputText, onSend, attachedImage, setAttachedImage,
  onTogglePin, pinnedMessages, onSaveItem, onRetry,
  desktopWelcomeMode = false, mode = 'auto', onModeChange,
  isCanvasActive = false, onOpenCanvas, onCloseCanvas, onUpgradeClick,
  isTemporary = false,
}) => {
  const chatEndRef         = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll]             = useState(true);
  const [replyingToMsg, setReplyingToMsg]       = useState<Message | null>(null);
  
  const [lastUserPrompt, setLastUserPrompt]     = useState('');

  const lastMsg = messages[messages.length - 1];
  const lastAiMsgHasContent = lastMsg && lastMsg.role === 'assistant' && lastMsg.content && lastMsg.content.length > 0;
  
  const showLoading = isSending && !lastAiMsgHasContent && activityStatus === 'idle';

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      const hasMessages = messages.length > 0;
      setShowScrollButton(hasMessages && distanceToBottom >= 200);
      setAutoScroll(distanceToBottom <= 150);
    }
  };

  useEffect(() => {
    if (messages.length === 0) {
      setShowScrollButton(false);
      setAutoScroll(true);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (autoScroll) chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isSending, activityStatus, autoScroll]);

  const scrollToBottom = () => { setAutoScroll(true); chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleSendWrapper = (images?: string[], pdfs?: { data: string; name: string }[], directText?: string) => {
    let finalPrompt = directText || inputText;
    
    if (finalPrompt.trim() !== '') {
      setLastUserPrompt(finalPrompt);
    }

    if (replyingToMsg && finalPrompt.trim() !== '') {
      const rawText = replyingToMsg.content.replace(/\n/g, ' ');
      const snippet = rawText.length > 60 ? rawText.substring(0, 60) + '...' : rawText;
      finalPrompt = `[Membalas pesan: "${snippet.replace(/"/g, "'")}"]\n\n${finalPrompt}`;
      setReplyingToMsg(null);
    }
    if (!directText) { setInputText(''); onSend(images, pdfs, finalPrompt); }
    else onSend(images, pdfs, finalPrompt);
  };

  const handleSuggest = (text: string) => handleSendWrapper(undefined, undefined, text);

  const hasUserMessage = messages.some(m => m.role === 'user');
  const isEmptyChat    = !hasUserMessage && !isSending;
  const lastUserIndex  = messages.reduce((acc, msg, i) => msg.role === 'user' ? i : acc, -1);

  if (desktopWelcomeMode) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pointer-events-auto">
        <ChatInput
          inputText={inputText} setInputText={setInputText}
          onSend={(imgs, pdfs) => handleSendWrapper(imgs, pdfs)}
          isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
          compact mode={mode} onModeChange={onModeChange}
          isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas}
          onUpgradeClick={onUpgradeClick} replyingTo={replyingToMsg} onCancelReply={() => setReplyingToMsg(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[var(--bg)]">

      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 relative z-30 bg-[var(--bg)]/80 backdrop-blur-md border-b border-[var(--bd)] border-opacity-40">
          <div className="max-w-3xl mx-auto">
            <div onClick={() => { const idx = messages.indexOf(pinnedMessages[pinnedMessages.length-1]); if (idx !== -1) document.getElementById(`message-${idx}`)?.scrollIntoView({ behavior:'smooth', block:'center' }); }} className="flex items-center gap-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl px-4 py-2.5 cursor-pointer hover:bg-[var(--bd)] transition-all active:scale-[0.98]">
              <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"><Pin size={14} className="text-[var(--at)]" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--mu)] mb-0.5">Pesan Disematkan</p>
                <p className="text-[13px] text-[var(--text)] truncate font-medium">{pinnedMessages[pinnedMessages.length-1].content.slice(0,85)}</p>
              </div>
              {pinnedMessages.length > 1 && <div className="px-2 py-1 bg-[var(--bd)] rounded-lg text-[10px] font-black text-[var(--mu)]">+{pinnedMessages.length-1}</div>}
            </div>
          </div>
        </div>
      )}

      <main
        ref={scrollContainerRef} onScroll={checkScroll}
        className="flex-1 overflow-y-auto p-4 md:px-8 pt-6 flex flex-col relative z-10 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {isEmptyChat ? (
          isTemporary ? <GhostEmptyState /> : <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-10 w-full pb-[160px]">
            {messages.map((msg, i) => {
              const isConnectionError = (msg as any).isConnectionError;
              const isThisLastMessage = i === messages.length - 1;
              const showLoadingHere = showLoading && i === lastUserIndex;

              return (
                <React.Fragment key={i}>
                  <div id={`message-${i}`} className="w-full">
                    {isConnectionError
                      ? <ConnectionErrorCard type={(msg as any).connectionErrorType} onRetry={onRetry} />
                      : <ChatBubble
                          msg={msg}
                          msgIndex={i}
                          isLast={isThisLastMessage}
                          activityStatus={isThisLastMessage && isSending ? activityStatus : 'idle'}
                          suggestions={msg.suggestions}
                          onSuggest={handleSuggest}
                          onResend={(content) => { setInputText(content); setTimeout(() => handleSendWrapper(), 0); }}
                          onEdit={(content) => setInputText(content)}
                          onTogglePin={onTogglePin}
                          // ── PERBAIKAN 2: LANGSUNG OVERKIRIM TEKS ASLI TANPA DIBUNGKUS OBJECT ──
                          onSaveItem={onSaveItem} 
                          onRegenerate={onRetry}
                          onSwipeToReply={(m) => setReplyingToMsg(m)}
                          isStreaming={false}
                        />
                    }
                  </div>

                  {showLoadingHere && (
                    <div className="w-full flex flex-col items-start -mt-4 mb-2">
                      <CylenDynamicLoading isSearching={isSearching} userPrompt={lastUserPrompt} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {showLoading && lastUserIndex === -1 && (
              <div className="w-full flex flex-col items-start mb-2">
                <CylenDynamicLoading isSearching={isSearching} userPrompt={lastUserPrompt} />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      <div className={`absolute bottom-40 right-6 md:right-10 z-[60] transition-all duration-400 ease-out ${showScrollButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-75 pointer-events-none'}`}>
        <button onClick={scrollToBottom} className="w-12 h-12 flex items-center justify-center bg-[var(--ac)] text-[var(--at)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:scale-110 active:scale-90 transition-all border border-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 w-full z-[100] pointer-events-none">
        <ChatInput
          inputText={inputText} setInputText={setInputText}
          onSend={(imgs, pdfs) => handleSendWrapper(imgs, pdfs)}
          isSending={isSending} attachedImage={attachedImage} setAttachedImage={setAttachedImage}
          mode={mode} onModeChange={onModeChange}
          isCanvasActive={isCanvasActive} onOpenCanvas={onOpenCanvas} onCloseCanvas={onCloseCanvas}
          onUpgradeClick={onUpgradeClick} replyingTo={replyingToMsg} onCancelReply={() => setReplyingToMsg(null)}
        />
      </div>
    </div>
  );
};
