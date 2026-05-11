import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Video, Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant } from '../types';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { ZoomOverlay } from '../components/chat/ZoomOverlay';

import { AddAIModal } from '../components/group/AddAIModal';
import { InviteModal } from '../components/group/InviteModal';

interface GroupChatPageProps {
  activeGroup: GroupSession;
  isSending: boolean;
  onSendMessage: (text: string) => void;
  onAddParticipant: (p: GroupParticipant) => void;
  showToast: (msg: string) => void;
  onBack?: () => void;
  onNavigateProfile?: () => void;
}

export const GroupChatPage: React.FC<GroupChatPageProps> = ({
  activeGroup, isSending, onSendMessage, onAddParticipant, showToast, onBack, onNavigateProfile
}) => {
  const [inputText, setInputText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup.messages, isSending]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const participantsLabel = activeGroup.participants.map(p => p.name).join(', ');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">

      {/* ─── HEADER (MIMIC WHATSAPP STYLE) ─── */}
      <div className="px-2 py-2 flex items-center justify-between border-b border-[var(--bd)]/20 bg-[var(--bg)] z-10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 -mr-1 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95 shrink-0">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          
          {/* AREA PROFIL BISA DIKLIK -> BUKA HALAMAN PROFIL */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0 py-1" onClick={onNavigateProfile}>
            {/* AVATAR BUNDER */}
            <div className="w-10 h-10 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] font-bold shrink-0">
              {activeGroup.title[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-[var(--text)] leading-tight truncate">{activeGroup.title}</h2>
              <p className="text-[12px] text-[var(--text)]/50 leading-tight mt-0.5 truncate">
                {participantsLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* ICON TAMBAH TEMAN DIBALIKIN */}
          <button onClick={() => setShowInviteModal(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--sf)] transition-colors">
            <UserPlus size={20} strokeWidth={2} />
          </button>
          <button onClick={() => setShowZoom(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--sf)] transition-colors">
            <Video size={20} strokeWidth={2} />
          </button>
          <button onClick={() => setShowAIModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[12px] font-semibold ml-1 active:scale-95 transition-transform">
            <Plus size={14} strokeWidth={2.5} />
            AI
          </button>
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5 pb-4">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <span className="px-4 py-1.5 bg-[var(--sf)] rounded-full text-[11px] text-[var(--text)]/40 border border-[var(--bd)]/30 italic shadow-sm">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <ChatBubble msg={msg} msgIndex={i} />
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-[var(--text)]/25" animate={{ opacity: [0.25, 0.8, 0.25], y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }} />
                ))}
              </div>
              <span className="text-[12px] text-[var(--text)]/40">AI sedang berdiskusi...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        isSending={isSending}
        attachedImage={null}
        setAttachedImage={() => {}}
      />

      {/* ════════ EKSTERNAL MODALS ════════ */}
      <ZoomOverlay isOpen={showZoom} onClose={() => setShowZoom(false)} groupName={activeGroup.title} participants={activeGroup.participants} />
      
      <AddAIModal 
        isOpen={showAIModal} 
        onClose={() => setShowAIModal(false)} 
        activeGroupParticipants={activeGroup.participants} 
        onAddParticipant={onAddParticipant} 
        showToast={showToast} 
      />

      <InviteModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
        showToast={showToast} 
      />
    </div>
  );
};
