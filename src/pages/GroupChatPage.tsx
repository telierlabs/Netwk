import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Video, Plus, ArrowLeft, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant, Message } from '../types';
import { GroupChatBubble } from '../components/chat/GroupChatBubble';
import { GroupChatInput } from '../components/chat/GroupChatInput';
import { ZoomOverlay } from '../components/chat/ZoomOverlay';
import { AddAIModal } from '../components/group/AddAIModal';
import { InviteModal } from '../components/group/InviteModal';

interface GroupChatPageProps {
  activeGroup: GroupSession;
  isSending: boolean;
  onSendMessage: (text: string, images?: string[]) => void;
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
  
  // ─── STATE BALAS PESAN (SWIPE TO REPLY) ───
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Modal Full Foto dari luar
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(localStorage.getItem(`cylen_group_avatar_${activeGroup.id}`));

  useEffect(() => {
    const handleGroupAvatarChange = () => {
      setGroupAvatar(localStorage.getItem(`cylen_group_avatar_${activeGroup.id}`));
    };
    window.addEventListener('group-avatar-changed', handleGroupAvatarChange);
    return () => window.removeEventListener('group-avatar-changed', handleGroupAvatarChange);
  }, [activeGroup.id]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup.messages, isSending]);

  const handleSend = (images?: string[], pdfs?: { data: string; name: string }[]) => {
    if (!inputText.trim() && (!images || images.length === 0)) return;
    
    // Kalau ada pesan yang di-reply, tempel tag khusus biar AI tahu
    let finalInputText = inputText;
    if (replyingTo) {
      finalInputText = `[Membalas pesan: "${replyingTo.content}"]\n\n${inputText}`;
    }

    onSendMessage(finalInputText, images);
    setInputText('');
    setReplyingTo(null); // Tutup kotak reply otomatis
  };

  const participantsLabel = activeGroup.participants.map(p => p.name).join(', ');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">

      {/* ─── HEADER ─── */}
      <div className="px-2 py-2 flex items-center justify-between border-b border-[var(--text)]/10 bg-[var(--bg)] z-10 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 -mr-1 rounded-full hover:bg-[var(--text)]/5 text-[var(--text)] transition-colors active:scale-95 shrink-0 [-webkit-tap-highlight-color:transparent]">
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0 py-1">
            <div 
              onClick={() => setShowFullAvatar(true)}
              className="w-10 h-10 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] font-bold shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            >
              {groupAvatar ? (
                <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
              ) : (
                activeGroup.title[0]
              )}
            </div>
            
            <div className="flex-1 min-w-0 cursor-pointer hover:opacity-80" onClick={onNavigateProfile}>
              <h2 className="text-[16px] font-semibold text-[var(--text)] leading-tight truncate">{activeGroup.title}</h2>
              <p className="text-[12px] text-[var(--text)]/50 leading-tight mt-0.5 truncate">
                {participantsLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={() => setShowInviteModal(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/5 transition-colors [-webkit-tap-highlight-color:transparent]">
            <UserPlus size={20} strokeWidth={2} />
          </button>
          <button onClick={() => setShowZoom(true)} className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--text)]/5 transition-colors [-webkit-tap-highlight-color:transparent]">
            <Video size={20} strokeWidth={2} />
          </button>
          <button onClick={() => setShowAIModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[12px] font-semibold ml-1 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]">
            <Plus size={14} strokeWidth={2.5} />
            AI
          </button>
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-5 pb-4">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <span className="px-4 py-1.5 bg-[var(--text)]/5 rounded-full text-[11px] text-[var(--text)]/50 border border-[var(--text)]/10 italic shadow-sm">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <GroupChatBubble 
                  msg={msg} 
                  msgIndex={i} 
                  // ── INI KABEL SWIPE NYA BRO, JANGAN ILANG LAGI WKWK ──
                  onSwipeToReply={(m) => setReplyingTo(m)} 
                />
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

      {/* ─── CHAT INPUT ─── */}
      <GroupChatInput
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        isSending={isSending}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      <ZoomOverlay isOpen={showZoom} onClose={() => setShowZoom(false)} groupName={activeGroup.title} participants={activeGroup.participants} />
      <AddAIModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} activeGroupParticipants={activeGroup.participants} onAddParticipant={onAddParticipant} showToast={showToast} />
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} showToast={showToast} />

      {/* ================= MODAL LIHAT PROFIL DARI LUAR ================= */}
      <AnimatePresence>
        {showFullAvatar && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
          >
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setShowFullAvatar(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <X size={24} strokeWidth={2.5} />
              </button>
              <button onClick={() => { setShowFullAvatar(false); if(onNavigateProfile) onNavigateProfile(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                <Edit2 size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {groupAvatar ? (
                <img src={groupAvatar} alt="Group Avatar Full" className="w-full h-auto max-h-full object-contain" />
              ) : (
                <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[#222] rounded-full flex items-center justify-center text-white text-8xl font-bold">
                  {activeGroup.title[0]}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
