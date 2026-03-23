import React, { useRef, useEffect } from 'react';
import { Search, Zap } from 'lucide-react';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  isSending: boolean;
  isSearching: boolean;
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  attachedImage: string | null;
  setAttachedImage: (img: string | null) => void;
}

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}

          {isSending && (
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 bg-[var(--ac)] rounded-full flex items-center justify-center text-[var(--at)]">
                  <Zap size={14} />
                </div>
              </div>
              {isSearching && (
                <div className="flex items-center gap-2 mb-3 text-xs text-[var(--mu)] font-medium">
                  <Search size={14} className="animate-spin" />
                  Mencari di web...
                </div>
              )}
              <div className="w-full p-4 rounded-2xl border border-[var(--bd)] bg-[var(--bg)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--mu)]/5 to-transparent animate-[shimmer_1.8s_infinite]" />
                <div className="flex flex-col gap-2.5">
                  <div className="h-2 w-[90%] bg-[var(--bd)] rounded-full animate-pulse" />
                  <div className="h-2 w-[75%] bg-[var(--bd)] rounded-full animate-pulse delay-75" />
                  <div className="h-2 w-[85%] bg-[var(--bd)] rounded-full animate-pulse delay-150" />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[9px] font-mono text-[var(--mu)] tracking-[0.14em] uppercase">
                    {isSearching ? 'SEARCHING ···' : 'GENERATING ···'}
                  </span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-[var(--ac)] animate-bounce" />
                    <div className="w-1 h-1 rounded-full bg-[var(--ac)] animate-bounce delay-100" />
                    <div className="w-1 h-1 rounded-full bg-[var(--ac)] animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <ChatInput 
        inputText={inputText}
        setInputText={setInputText}
        onSend={onSend}
        isSending={isSending}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
      />
    </div>
  );
};
