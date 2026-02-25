import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Share2, 
  Bot, 
  Zap, 
  X, 
  UserPlus, 
  MessageSquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant } from '../types';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';

interface GroupChatPageProps {
  activeGroup: GroupSession;
  isSending: boolean;
  onSendMessage: (text: string) => void;
  onAddParticipant: (p: GroupParticipant) => void;
  showToast: (msg: string) => void;
}

export const GroupChatPage: React.FC<GroupChatPageProps> = ({
  activeGroup,
  isSending,
  onSendMessage,
  onAddParticipant,
  showToast
}) => {
  const [inputText, setInputText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup.messages, isSending]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const inviteOptions = [
    { name: 'Email', icon: <Mail size={18} />, color: 'bg-blue-500' },
    { name: 'Salin Link', icon: <Share2 size={18} />, color: 'bg-emerald-500' },
    { name: 'WhatsApp', icon: <MessageSquare size={18} />, color: 'bg-green-500' },
  ];

  const aiModels = [
    { name: 'ChatGPT', model: 'GPT-4o', icon: 'G', color: 'bg-emerald-600' },
    { name: 'Gemini', model: 'Gemini 2.5 Flash', icon: '✦', color: 'bg-blue-600' },
    { name: 'Claude', model: 'Claude 3.5 Sonnet', icon: 'C', color: 'bg-orange-600' },
    { name: 'DeepSeek', model: 'DeepSeek V3', icon: 'D', color: 'bg-indigo-600' },
    { name: 'Grok', model: 'Grok-2', icon: 'G', color: 'bg-zinc-900' },
  ];

  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Group Header Info */}
      <div className="px-6 py-3 border-b border-[var(--bd)] flex items-center justify-between bg-[var(--bg)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-3 overflow-hidden">
            {activeGroup.participants.slice(0, 4).map((p, i) => (
              <div 
                key={p.id} 
                className={cn(
                  "inline-block h-8 w-8 rounded-full ring-2 ring-[var(--bg)] flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                  p.isAI ? "bg-[var(--ac)]" : "bg-gradient-to-br from-indigo-500 to-purple-500"
                )}
              >
                {p.avatar || p.name[0]}
              </div>
            ))}
            {activeGroup.participants.length > 4 && (
              <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-[var(--bg)] bg-[var(--sf)] text-[10px] font-bold text-[var(--mu)]">
                +{activeGroup.participants.length - 4}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">{activeGroup.title}</h2>
            <p className="text-[10px] text-[var(--mu)] font-medium uppercase tracking-wider">
              {userCount}/10 Anggota · {activeGroup.participants.length - userCount} AI Aktif
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--sf)] hover:bg-[var(--bd)] border border-[var(--bd)] rounded-full text-[11px] font-bold transition-all"
          >
            <UserPlus size={14} />
            <span>Undang</span>
          </button>
          <button 
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--ac)] text-[var(--at)] rounded-full text-[11px] font-bold shadow-lg hover:scale-105 transition-all"
          >
            <Plus size={14} />
            <span>Tambah AI</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-4">
                  <div className="px-4 py-1.5 bg-[var(--sf)] rounded-full text-[10px] font-medium text-[var(--mu)] border border-[var(--bd)] italic">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <ChatBubble msg={msg} />
              )}
            </div>
          ))}
          
          {isSending && (
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-[var(--ac)] animate-pulse" />
                <span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest animate-pulse">
                  AI sedang berdiskusi...
                </span>
              </div>
              <div className="w-full max-w-md h-20 bg-[var(--sf)] rounded-2xl border border-[var(--bd)] animate-pulse" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input */}
      <ChatInput 
        inputText={inputText}
        setInputText={setInputText}
        onSend={handleSend}
        isSending={isSending}
        attachedImage={null}
        setAttachedImage={() => {}}
      />

      {/* Modals */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--bd)]"
            >
              <div className="p-6 border-b border-[var(--bd)] flex items-center justify-between">
                <h3 className="text-lg font-bold">Undang Teman</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="p-4 bg-[var(--sf)] rounded-2xl border border-dashed border-[var(--bd)] text-center">
                  <p className="text-xs text-[var(--mu)] mb-2">Batas anggota grup: 10 orang</p>
                  <div className="text-2xl font-bold text-[var(--text)]">{userCount}/10</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {inviteOptions.map((opt) => (
                    <button 
                      key={opt.name}
                      onClick={() => { showToast(`${opt.name} disalin!`); setShowInviteModal(false); }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", opt.color)}>
                        {opt.icon}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mu)]">{opt.name}</span>
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Masukkan email teman..." 
                    className="w-full pl-4 pr-12 py-3 bg-[var(--sf)] border border-[var(--bd)] rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[var(--ac)]/20"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--ac)] text-[var(--at)] rounded-xl">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAIModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAIModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--bd)]"
            >
              <div className="p-6 border-b border-[var(--bd)] flex items-center justify-between bg-gradient-to-r from-[var(--ac)]/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--ac)] text-[var(--at)] rounded-xl flex items-center justify-center">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Tambah AI ke Grup</h3>
                    <p className="text-[10px] text-[var(--mu)] font-bold uppercase tracking-widest">Pilih Model AI</p>
                  </div>
                </div>
                <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {aiModels.map((ai) => {
                  const isAdded = activeGroup.participants.some(p => p.name === ai.name);
                  return (
                    <button 
                      key={ai.name}
                      disabled={isAdded}
                      onClick={() => {
                        onAddParticipant({
                          id: `ai-${ai.name.toLowerCase()}`,
                          name: ai.name,
                          isAI: true,
                          model: ai.model,
                          avatar: ai.icon
                        });
                        showToast(`${ai.name} bergabung ke grup!`);
                        setShowAIModal(false);
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                        isAdded 
                          ? "bg-[var(--sf)] border-[var(--bd)] opacity-50 cursor-not-allowed" 
                          : "bg-[var(--cd)] border-[var(--bd)] hover:border-[var(--ac)] hover:shadow-md"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-inner", ai.color)}>
                        {ai.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-[var(--text)]">{ai.name}</div>
                        <div className="text-[10px] text-[var(--mu)] font-mono">{ai.model}</div>
                      </div>
                      {isAdded ? (
                        <div className="px-2 py-1 bg-[var(--bd)] rounded text-[9px] font-bold uppercase">Aktif</div>
                      ) : (
                        <Plus size={18} className="text-[var(--mu)] group-hover:text-[var(--ac)] transition-colors" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-6 bg-[var(--sf)]/50 border-t border-[var(--bd)]">
                <p className="text-[10px] text-[var(--mu)] text-center leading-relaxed">
                  Setiap AI yang ditambahkan akan merespon setiap pesan user secara bergantian untuk menciptakan diskusi yang komprehensif.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
