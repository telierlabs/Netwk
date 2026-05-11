import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, UserPlus, Video, X, Plus, Mail, Share2, MessageSquare, 
  Bot, Sparkles, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant } from '../types';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { ZoomOverlay } from '../components/chat/ZoomOverlay';

// ─── REAL AI LOGOS AS SVG ───────────────────────────────────────────
const AILogos: Record<string, React.FC<{ size?: number }>> = {
  ChatGPT: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.505-3.360 10.079 10.079 0 00-9.612 6.977 9.967 9.967 0 00-6.664 4.834 10.08 10.08 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.360 10.079 10.079 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.814zM22.498 37.886a7.474 7.474 0 01-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 00.655-1.134V19.054l3.366 1.944a.12.12 0 01.066.092v9.299a7.505 7.505 0 01-7.49 7.496zM6.392 31.006a7.471 7.471 0 01-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 001.308 0l9.724-5.614v3.888a.12.12 0 01-.048.103L16.69 34.54a7.505 7.505 0 01-10.297-3.534zM4.297 13.62A7.469 7.469 0 018.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 00.654 1.132l9.723 5.614-3.366 1.944a.12.12 0 01-.114.012L7.044 23.86a7.504 7.504 0 01-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 01.114-.012l8.048 4.648a7.498 7.498 0 01-1.158 13.528v-9.476a1.293 1.293 0 00-.647-1.130zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 00-1.308 0l-9.723 5.614v-3.888a.12.12 0 01.048-.103l8.048-4.645a7.497 7.497 0 0111.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 01-.065-.092v-9.299a7.497 7.497 0 0112.293-5.756 6.94 6.94 0 00-.236.134l-7.965 4.6a1.294 1.294 0 00-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.500v4.999l-4.331 2.5-4.331-2.5V18z" fill="currentColor"/>
    </svg>
  ),
  Gemini: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="currentColor"/>
    </svg>
  ),
  Claude: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.5 5.5c.276 0 .5.224.5.5v8c0 .276-.224.5-.5.5s-.5-.224-.5-.5V8c0-.276.224-.5.5-.5zm3 1c.276 0 .5.224.5.5v6c0 .276-.224.5-.5.5s-.5-.224-.5-.5V9c0-.276.224-.5.5-.5zm-6 0c.276 0 .5.224.5.5v6c0 .276-.224.5-.5.5s-.5-.224-.5-.5V9c0-.276.224-.5.5-.5z" fill="currentColor"/>
    </svg>
  ),
  DeepSeek: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
      <path d="M12 6V4M12 20v-2M18 12h2M4 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'Meta AI': ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 10.5c0-1.5.75-2.75 1.75-3.5.875-.65 1.875-.65 2.75 0L12 7.75l1-.75c.875-.65 1.875-.65 2.75 0C16.75 7.75 17.5 9 17.5 10.5v3c0 1.5-.75 2.75-1.75 3.5-.875.65-1.875.65-2.75 0L12 16.25l-1 .75c-.875.65-1.875.65-2.75 0C7.25 16.25 6.5 15 6.5 13.5v-3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M12 7.75v8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Grok: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 8v8M8.5 10l3.5 2 3.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

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
  const [expandedAI, setExpandedAI] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [customName, setCustomName] = useState('');
  const [customKey, setCustomKey] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeGroup.messages, isSending]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const aiModels = [
    { name: 'ChatGPT', model: 'GPT-4o', color: '#10a37f' },
    { name: 'Gemini', model: 'Gemini 2.5 Flash', color: '#4285f4' },
    { name: 'Claude', model: 'Claude 3.5 Sonnet', color: '#cc785c' },
    { name: 'DeepSeek', model: 'DeepSeek V3', color: '#4d6ef5' },
    { name: 'Meta AI', model: 'Llama 3', color: '#0866ff' },
    { name: 'Grok', model: 'Grok-2', color: '#1d1d1d' },
  ];

  const userCount = activeGroup.participants.filter(p => !p.isAI).length;
  const aiCount = activeGroup.participants.filter(p => p.isAI).length;

  // Spring animation presets
  const modalSpring = {
    type: "spring" as const,
    stiffness: 500,
    damping: 40,
    mass: 0.8,
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 20 },
    visible: { 
      opacity: 1, scale: 1, y: 0,
      transition: modalSpring,
    },
    exit: { 
      opacity: 0, scale: 0.96, y: 10,
      transition: { duration: 0.15, ease: "easeIn" }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.04, ...modalSpring },
    }),
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">
      
      {/* ─── HEADER ─── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--bd)]/20 bg-[var(--bg)]">
        <div className="flex items-center gap-3">
          <div
            onClick={onNavigateProfile}
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center cursor-pointer shrink-0 ring-1 ring-[var(--bd)]/30"
          >
            <img src="/Cylen.jpg" alt="Profile" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div className="cursor-pointer" onClick={() => setShowInviteModal(true)}>
            <h2 className="text-[15px] font-semibold text-[var(--text)] leading-tight">{activeGroup.title}</h2>
            <p className="text-[11px] text-[var(--text)]/40 leading-tight mt-0.5">
              {userCount} member · {aiCount} AI aktif
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowInviteModal(true)} className="p-2 text-[var(--text)]/50 hover:text-[var(--text)] rounded-xl hover:bg-[var(--sf)] transition-all">
            <UserPlus size={18} strokeWidth={2} />
          </button>
          <button onClick={() => setShowZoom(true)} className="p-2 text-[var(--text)]/50 hover:text-[var(--text)] rounded-xl hover:bg-[var(--sf)] transition-all">
            <Video size={18} strokeWidth={2} />
          </button>
          <motion.button
            onClick={() => setShowAIModal(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[12px] font-semibold ml-1 shadow-sm"
          >
            <Plus size={13} strokeWidth={2.5} />
            AI
          </motion.button>
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <span className="px-4 py-1 text-[10px] text-[var(--text)]/30 font-medium tracking-wide">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <ChatBubble msg={msg} msgIndex={i} />
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--text)]/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-[var(--text)]/40">AI sedang membalas...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </main>

      <ChatInput inputText={inputText} setInputText={setInputText} onSend={handleSend} isSending={isSending} attachedImage={null} setAttachedImage={() => {}} />

      <ZoomOverlay isOpen={showZoom} onClose={() => setShowZoom(false)} groupName={activeGroup.title} participants={activeGroup.participants} />

      {/* ─── MODALS ─── */}
      <AnimatePresence>

        {/* INVITE MODAL */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <motion.div
              variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-sm bg-[var(--bg)] rounded-3xl shadow-2xl border border-[var(--bd)]/20 overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Info Grup</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-full hover:bg-[var(--sf)] text-[var(--text)]/50 transition-colors">
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="px-5 pb-5 flex flex-col gap-4">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--sf)] rounded-2xl">
                  <span className="text-[12px] text-[var(--text)]/50 font-medium">Kapasitas Member</span>
                  <span className="text-[13px] font-semibold text-[var(--text)]">{userCount} / 10</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Email', icon: <Mail size={16} /> },
                    { name: 'Salin Link', icon: <Share2 size={16} /> },
                    { name: 'WhatsApp', icon: <MessageSquare size={16} /> },
                  ].map((opt) => (
                    <button key={opt.name} onClick={() => { showToast(`${opt.name} disalin!`); setShowInviteModal(false); }}
                      className="flex flex-col items-center gap-2 group">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)]/60 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all">
                        {opt.icon}
                      </div>
                      <span className="text-[10px] font-medium text-[var(--text)]/50">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* ADD AI MODAL */}
        {showAIModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6">
            <motion.div
              variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
              transition={{ duration: 0.2 }}
              onClick={() => setShowAIModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
            />

            <motion.div
              variants={modalVariants} initial="hidden" animate="visible" exit="exit"
              className="relative w-full max-w-[380px] bg-[var(--bg)] rounded-[28px] shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-[var(--bd)]/15 overflow-hidden flex flex-col"
              style={{ maxHeight: 'min(88vh, 680px)' }}
            >
              {/* Modal Header */}
              <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-[var(--bd)]/10">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">Tambah AI</h3>
                  <p className="text-[11px] text-[var(--text)]/40 mt-0.5">Pilih model untuk bergabung ke grup</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAIModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--sf)] text-[var(--text)]/50 transition-colors"
                >
                  <X size={16} strokeWidth={2} />
                </motion.button>
              </div>

              {/* AI List */}
              <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-1.5" style={{ scrollbarWidth: 'none' }}>
                {aiModels.map((ai, idx) => {
                  const isAdded = activeGroup.participants.some(p => p.name === ai.name);
                  const isExpanded = expandedAI === ai.name;
                  const Logo = AILogos[ai.name];

                  return (
                    <motion.div
                      key={ai.name}
                      custom={idx}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "rounded-2xl border overflow-hidden transition-colors",
                        isAdded
                          ? "border-[var(--bd)]/20 opacity-50"
                          : isExpanded
                          ? "border-[var(--text)]/15 bg-[var(--sf)]/40"
                          : "border-[var(--bd)]/20 hover:border-[var(--bd)]/40"
                      )}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {/* Logo */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${ai.color}15`, color: ai.color }}
                        >
                          {Logo && <Logo size={20} />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[var(--text)]">{ai.name}</div>
                          <div className="text-[11px] text-[var(--text)]/40 truncate">{ai.model}</div>
                        </div>

                        {/* Action */}
                        {isAdded ? (
                          <div className="px-2.5 py-1 rounded-full bg-[var(--sf)] text-[10px] font-semibold text-[var(--text)]/50 uppercase tracking-wide">
                            Aktif
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setExpandedAI(isExpanded ? null : ai.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/40 transition-colors"
                            >
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} strokeWidth={2} />
                              </motion.div>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                onAddParticipant({ id: `ai-${ai.name.toLowerCase()}`, name: ai.name, isAI: true, model: ai.model, avatar: ai.name[0] });
                                showToast(`${ai.name} bergabung ke grup!`);
                                setShowAIModal(false);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg)] shadow-sm"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                            </motion.button>
                          </div>
                        )}
                      </div>

                      {/* API Key Drawer */}
                      <AnimatePresence>
                        {isExpanded && !isAdded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, transition: { height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15, delay: 0.05 } } }}
                            exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.18, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.1 } } }}
                            className="overflow-hidden border-t border-[var(--bd)]/10"
                          >
                            <div className="px-3 py-2.5 flex gap-2 bg-[var(--sf)]/30">
                              <input
                                type="password"
                                placeholder={`${ai.name} API Key`}
                                value={apiKeys[ai.name] || ''}
                                onChange={(e) => setApiKeys({ ...apiKeys, [ai.name]: e.target.value })}
                                className="flex-1 bg-[var(--bg)] border border-[var(--bd)]/30 text-[var(--text)] rounded-xl px-3 py-2 text-[12px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/30 transition-colors"
                              />
                              <button
                                onClick={() => { showToast(`API Key ${ai.name} tersimpan!`); setExpandedAI(null); }}
                                className="px-3 py-2 bg-[var(--text)] text-[var(--bg)] text-[11px] font-semibold rounded-xl flex items-center gap-1"
                              >
                                <Save size={12} />
                                Simpan
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Custom AI */}
                <div className="mt-3 pt-4 border-t border-[var(--bd)]/10">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <Sparkles size={12} className="text-[var(--text)]/30" />
                    <span className="text-[10px] font-semibold text-[var(--text)]/30 uppercase tracking-widest">Custom AI</span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 bg-[var(--sf)]/30 rounded-2xl border border-[var(--bd)]/10">
                    <input
                      type="text"
                      placeholder="Nama AI..."
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)]/20 text-[var(--text)] rounded-xl px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/30 transition-colors"
                    />
                    <input
                      type="password"
                      placeholder="API Key / Token..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)]/20 text-[var(--text)] rounded-xl px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/30 transition-colors"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (!customName.trim()) return;
                        onAddParticipant({ id: `ai-custom-${Date.now()}`, name: customName, isAI: true, model: 'Custom API', avatar: customName[0].toUpperCase() });
                        showToast(`${customName} ditambahkan!`);
                        setCustomName(''); setCustomKey(''); setShowAIModal(false);
                      }}
                      disabled={!customName.trim()}
                      className="w-full py-2.5 bg-[var(--text)] text-[var(--bg)] text-[12px] font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-25 transition-opacity"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Pasang & Simpan
                    </motion.button>
                  </div>
                </div>

                {/* bottom padding */}
                <div className="h-2" />
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};
