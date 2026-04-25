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

/* ── Normal Chat Loading (Spinner Kepotong / Dual Ring - Baris Tunggal dengan Ikon Bot) ── */
const NormalLoading = ({ text }: { text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
    <style>{`
      @keyframes spinDual {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    {/* Spinner 2 arah (kepotong transparan di kiri-kanan) - dual ring */}
    <div style={{
      width: 16, height: 16,
      border: '2.5px solid var(--text)',
      borderColor: 'var(--text) transparent var(--text) transparent',
      borderRadius: '50%',
      animation: 'spinDual 0.8s linear infinite'
    }} />
    <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500 }}>
      {text ? `Memproses: "${text.length > 35 ? text.slice(0, 35) + '...' : text}"` : 'Berpikir...'}
    </span>
  </div>
);

/* ── Web Search Loading (TelierNews Node - Dua Baris Bersih Sesuai Instruksi) ── */
const WebSearchLoading = ({ query }: { query: string }) => {
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
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Bagian Atas: Loading Status dengan Ikon Bot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Logo Sabit Cylen */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        <span style={{ fontSize: 13, color: 'var(--mu)', fontWeight: 500, fontFamily: 'monospace' }}>
          Mencari...
        </span>
      </div>

      {/* Bagian Bawah: Detail Query dengan Logo TelierNews Beranimasi Shimmer (Clean, Tanpa bubble/titik/teks 'MENCARI:') */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingLeft: 30 }}>
        {/* Logo TelierNews: Animasi Breathing / Pulse, TIDAK MUTER, Ditingkatkan ukurannya */}
        <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0, animation: 'pulseGrok 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
          <img
            src="/IMG_20260425_143520.png"
            alt="TelierNews"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Teks Shimmering ala loading data - HANYA Query User */}
        <span style={{
          fontSize: 11, color: 'var(--mu)', fontFamily: 'monospace',
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

const ConnectionErrorCard = ({ type, onRetry }: { type?: string; onRetry?: () => void }) => {
  const isOffline = type === 'offline';
  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--cd)] p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text)" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <span className="font-bold text-[var(--text)] text-[15px]">Connection Issue</span>
      </div>
      <p className="text-sm text-[var(--mu)] leading-relaxed">
        {isOffline
          ? 'No internet connection. Please check your network and try again.'
          : 'Connection failed. Check network connection and try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ac)] text-[var(--at)] rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-95 transition-all"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Retry
        </button>
      )}
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center flex-1" />
);

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

  const handleSuggest = (text: string) => {
    onSend(undefined, undefined, text);
  };

  const isEmptyChat = messages.length <= 1 && messages[0]?.role === 'assistant';

  // Ambil pertanyaan terakhir user buat dipake di loading chat biasa
  const lastUserText = messages.filter(m => m.role === 'user').pop()?.content || '';

  if (desktopWelcomeMode) {
    return (
      <div style={{ width: '100%' }}>
        <ChatInput
          inputText={inputText}
          setInputText={setInputText}
          onSend={(imgs, pdfs) => onSend(imgs, pdfs)}
          isSending={isSending}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          compact
          mode={mode}
          onModeChange={onModeChange}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

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
            {messages.map((msg, i) => {
              if ((msg as any).isConnectionError) {
                return (
                  <div key={i} className="w-full">
                    <ConnectionErrorCard
                      type={(msg as any).connectionErrorType}
                      onRetry={onRetry}
                    />
                  </div>
                );
              }
              return (
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
              );
            })}

            {isSending && (
              <div className="flex flex-col items-start w-full">
                {/* Logika Pisah Loading - SEKARANG BENAR-BENAR BERSIH */}
                {isSearching ? (
                  {/* Web Search Loading - Dua Baris Bersih Sesuai Instruksi */}
                  <WebSearchLoading query={searchQuery} />
                ) : (
                  {/* Normal Loading - Baris Tunggal dengan Ikon Bot Bulan Sabit */}
                  <div className="flex items-start gap-3 w-full">
                    {/* Logo Sabit Cylen untuk Konsistensi Baris Tunggal */}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 flex-shrink-0">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                    <NormalLoading text={lastUserText} />
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
        mode={mode}
        onModeChange={onModeChange}
      />
    </div>
  );
};
