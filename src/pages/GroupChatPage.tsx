import React, { useState, useRef, useEffect } from 'react';
import {
  Users, UserPlus, Video, X, Plus, Mail, Share2, MessageSquare,
  Sparkles, Save, ChevronDown, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession, GroupParticipant } from '../types';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { ZoomOverlay } from '../components/chat/ZoomOverlay';

// ─── AI BRAND LOGOS ────────────────────────────────────────
const ChatGPTLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.505-3.36 10.079 10.079 0 00-9.612 6.977 9.967 9.967 0 00-6.664 4.834 10.08 10.08 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.36 10.079 10.079 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.814zm-22.023 22.979a7.474 7.474 0 01-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 00.655-1.134V19.054l3.366 1.944a.12.12 0 01.066.092v9.299a7.505 7.505 0 01-7.49 7.496zM6.392 31.006a7.471 7.471 0 01-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 001.308 0l9.724-5.614v3.888a.12.12 0 01-.048.103L16.69 34.54a7.505 7.505 0 01-10.297-3.534zm-2.095-17.386A7.469 7.469 0 018.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 00.654 1.132l9.723 5.614-3.366 1.944a.12.12 0 01-.114.012L7.044 23.86a7.504 7.504 0 01-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 01.114-.012l8.048 4.648a7.498 7.498 0 01-1.158 13.528v-9.476a1.293 1.293 0 00-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 00-1.308 0l-9.723 5.614v-3.888a.12.12 0 01.048-.103l8.048-4.645a7.497 7.497 0 0111.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 01-.065-.092v-9.299a7.497 7.497 0 0112.293-5.756 6.94 6.94 0 00-.236.134l-7.965 4.6a1.294 1.294 0 00-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z" fill="currentColor"/>
  </svg>
);

const GeminiLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="currentColor"/>
  </svg>
);

const ClaudeLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-1.227-.072-.424-.048C2.045 12.613 2 12.268 2 12c0-.268.045-.612.722-.612l.424-.049 1.227-.072 2.34-.097 2.697-.073.79-.048h.23l.08-.128-.08-.23-4.72-2.647-.906-.561-.424-.292-.35-.292-.277-.316-.12-.34c0-.39.266-.71.519-.877l.37-.195.4-.073.444.097.35.195.35.268 3.262 3.044.693.634.146.17.169-.024.097-.146V9.33l.072-1.756.121-2.647.073-1.66.048-.804.049-.39C7.844 2.36 8.127 2 8.89 2c.688 0 .97.36 1.068.974l.048.389.048.804.073 1.66.121 2.648.073 1.755v.34l.097.147.169.024.146-.17.693-.634 3.261-3.044.35-.268.35-.195.445-.097.4.073.37.195c.253.167.518.486.518.877l-.12.34-.276.316-.35.292-.424.292-.907.56-4.72 2.648-.08.23.08.127h.23l.79.049 2.698.073 2.34.097 1.226.072.424.048c.677 0 .722.344.722.612 0 .268-.045.612-.722.612l-.424.049-1.227.072-2.339.097-2.698.073-.79.048h-.23l-.08.128.08.23 4.72 2.647.906.561.424.292.35.292.277.316.12.34c0 .39-.265.71-.518.877l-.37.195-.4.073-.445-.097-.35-.195-.35-.268-3.261-3.044-.693-.634-.146-.17-.17.024-.096.146v.341l-.073 1.755-.121 2.648-.073 1.659-.048.804-.048.39c-.097.613-.38.974-1.068.974-.762 0-1.046-.36-1.116-.974l-.048-.389-.049-.804-.072-1.66-.121-2.647-.073-1.755v-.341l-.097-.146-.169-.024-.146.17-.693.634-3.261 3.044-.35.268-.35.195-.445.097-.4-.073-.37-.195c-.252-.167-.518-.486-.518-.877l.12-.34.277-.316.35-.292.424-.292.906-.56z" fill="currentColor"/>
  </svg>
);

const DeepSeekLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.463 9.137c-.162-.07-.33-.126-.502-.168a7.663 7.663 0 00-.173-1.485C21.203 4.716 18.896 3 16.326 3c-1.67 0-3.074.515-4.173 1.53a5.648 5.648 0 00-.78.9 5.644 5.644 0 00-.78-.9C9.494 3.515 8.09 3 6.42 3 3.85 3 1.543 4.716.958 7.484a7.663 7.663 0 00-.173 1.485 5.64 5.64 0 00-.502.168C.107 9.276 0 9.508 0 9.75c0 .243.107.475.283.629.172.153.404.23.64.21a5.63 5.63 0 001.2 2.22C3.18 14.032 5.09 15 6.935 15c1.156 0 2.27-.314 3.227-.909l.558-.353.558.353A6.18 6.18 0 0014.506 15h.002c1.845 0 3.753-.968 4.812-2.191a5.63 5.63 0 001.2-2.22c.236.02.468-.057.64-.21.176-.154.283-.386.283-.629 0-.242-.107-.474-.28-.613zM9.626 9.408l-.443.277-.443-.277C7.895 8.777 7.04 7.9 7.04 6.887c0-1.196.96-2.167 2.143-2.167 1.183 0 2.143.97 2.143 2.167 0 1.013-.855 1.89-1.7 2.521zm5.197.277l-.443-.277C13.534 8.777 12.68 7.9 12.68 6.887c0-1.196.96-2.167 2.143-2.167 1.183 0 2.143.97 2.143 2.167 0 1.013-.855 1.89-1.7 2.521l-.443.277zm.28 5.315c-1.516 0-2.75-1.268-2.75-2.823 0-1.556 1.234-2.824 2.75-2.824s2.75 1.268 2.75 2.824-1.234 2.823-2.75 2.823z" fill="currentColor"/>
  </svg>
);

const MetaLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973.14.604.375 1.171.72 1.627.735.934 1.909 1.481 3.708 1.481 1.49 0 2.592-.568 3.536-1.535.56-.578 1.04-1.26 1.526-1.984l.907-1.403.543-.84.091.138.773 1.17c.92 1.39 1.84 2.675 3.2 3.41 1.04.56 2.21.84 3.52.84 2.296 0 4.005-.94 5.022-2.576.664-1.045.996-2.34.996-3.84 0-1.943-.415-4.083-1.497-5.857C22.055 5.03 20.527 4 18.588 4c-1.345 0-2.437.547-3.252 1.364-.574.578-1.017 1.29-1.437 2.015l-.467.816-.434-.826C12.127 5.605 11.02 4.03 8.79 4.03c-.642 0-1.302.13-1.875.4zm6.951 11.474l-.008-.014-.077.12c-.494.761-.996 1.547-1.5 2.144-.5.59-1.064 1.152-1.81 1.52-.745.367-1.61.553-2.694.553-1.255 0-2.124-.406-2.73-1.15-.3-.376-.524-.844-.647-1.39-.124-.546-.19-1.145-.19-1.78 0-2.268.575-4.624 1.59-6.16.844-1.313 1.957-2.12 3.15-2.12 1.59 0 2.487 1.278 3.265 2.652.43.757.833 1.6 1.227 2.42l.348.73.077-.16zm5.773 1.014c-.652 1.023-1.75 1.56-3.17 1.56-1.02 0-1.886-.22-2.616-.631-1.075-.603-1.847-1.62-2.645-2.883l-.097-.148.07-.105.502-.772c.443-.681.884-1.37 1.33-1.947.574-.737 1.123-1.414 1.672-1.755.55-.34 1.106-.493 1.78-.493.977 0 1.9.477 2.647 1.382.742.9 1.22 2.144 1.466 3.455.122.66.183 1.31.183 1.917 0 .742-.1 1.44-.12 1.42z" fill="currentColor"/>
  </svg>
);

const GrokLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
  </svg>
);

const AI_CONFIG = [
  { name: 'ChatGPT',  model: 'GPT-4o',            Logo: ChatGPTLogo,  bgColor: '#f0faf7', iconColor: '#10a37f' },
  { name: 'Gemini',   model: 'Gemini 2.5 Flash',  Logo: GeminiLogo,   bgColor: '#eef2ff', iconColor: '#4285f4' },
  { name: 'Claude',   model: 'Claude 3.5 Sonnet', Logo: ClaudeLogo,   bgColor: '#fdf4f0', iconColor: '#cc785c' },
  { name: 'DeepSeek', model: 'DeepSeek V3',        Logo: DeepSeekLogo, bgColor: '#eef0ff', iconColor: '#4d6ef5' },
  { name: 'Meta AI',  model: 'Llama 3',            Logo: MetaLogo,     bgColor: '#eef4ff', iconColor: '#0866ff' },
  { name: 'Grok',     model: 'Grok-2',             Logo: GrokLogo,     bgColor: '#f5f5f5', iconColor: '#111111' },
];

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

  const aiCount = activeGroup.participants.filter(p => p.isAI).length;
  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative">

      {/* ─── HEADER ─── */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-[var(--bd)]/20 bg-[var(--bg)]">
        <div className="flex items-center gap-1">
          <button
            onClick={onBack}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="cursor-pointer" onClick={() => setShowInviteModal(true)}>
            <h2 className="text-[16px] font-semibold text-[var(--text)] leading-tight">{activeGroup.title}</h2>
            <p className="text-[12px] text-[var(--text)]/50 leading-tight mt-0.5">
              {userCount} anggota · {aiCount} AI aktif
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInviteModal(true)}
            className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--sf)] transition-colors"
          >
            <UserPlus size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => setShowZoom(true)}
            className="p-2 text-[var(--text)]/60 hover:text-[var(--text)] rounded-full hover:bg-[var(--sf)] transition-colors"
          >
            <Video size={20} strokeWidth={2} />
          </button>
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-full text-[13px] font-semibold ml-1 active:scale-95 transition-transform"
          >
            <Plus size={14} strokeWidth={2.5} />
            AI
          </button>
        </div>
      </div>

      {/* ─── MESSAGES ─── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-2">
                  <span className="px-4 py-1.5 bg-[var(--sf)] rounded-full text-[11px] text-[var(--text)]/40 border border-[var(--bd)]/30 italic">
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
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[var(--text)]/25"
                    animate={{ opacity: [0.25, 0.8, 0.25], y: [0, -2, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                  />
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

      <ZoomOverlay
        isOpen={showZoom}
        onClose={() => setShowZoom(false)}
        groupName={activeGroup.title}
        participants={activeGroup.participants}
      />

      {/* ════════ MODALS ════════ */}
      <AnimatePresence>

        {/* INFO GRUP */}
        {showInviteModal && (
          <>
            <motion.div
              key="invite-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setShowInviteModal(false)}
              className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="invite-sheet"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
              className="fixed bottom-0 left-0 right-0 z-[201] mx-auto w-full max-w-sm bg-[var(--bg)] rounded-t-[24px] shadow-2xl border border-[var(--bd)]/20 overflow-hidden"
            >
              <div className="w-10 h-1 bg-[var(--bd)]/25 rounded-full mx-auto mt-3 mb-1" />
              <div className="px-5 pt-2 pb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[var(--text)]">Info Grup</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-1.5 rounded-full hover:bg-[var(--sf)] text-[var(--text)]/50 transition-colors">
                  <X size={17} strokeWidth={2} />
                </button>
              </div>
              <div className="px-5 pb-7 flex flex-col gap-3">
                <div className="flex items-center justify-between px-4 py-3 bg-[var(--sf)] rounded-2xl">
                  <span className="text-[13px] text-[var(--text)]/60">Kapasitas Member</span>
                  <span className="text-[13px] font-semibold text-[var(--text)]">{userCount} / 10</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Email', icon: <Mail size={17} strokeWidth={1.5} /> },
                    { name: 'Salin Link', icon: <Share2 size={17} strokeWidth={1.5} /> },
                    { name: 'WhatsApp', icon: <MessageSquare size={17} strokeWidth={1.5} /> },
                  ].map((opt) => (
                    <button key={opt.name}
                      onClick={() => { showToast(`${opt.name} disalin!`); setShowInviteModal(false); }}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className="w-13 h-13 w-[52px] h-[52px] rounded-2xl bg-[var(--sf)] flex items-center justify-center text-[var(--text)]/60 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95">
                        {opt.icon}
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text)]/50">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* TAMBAH AI — compact, smooth scroll */}
        {showAIModal && (
          <>
            <motion.div
              key="ai-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setShowAIModal(false); setExpandedAI(null); }}
              className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm"
            />
            <motion.div
              key="ai-sheet"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 35 }}
              transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
              className="fixed bottom-0 left-0 right-0 z-[201] mx-auto w-full max-w-sm bg-[var(--bg)] rounded-t-[24px] shadow-2xl border border-[var(--bd)]/20 flex flex-col"
              style={{ maxHeight: '78vh' }}
            >
              {/* drag pill */}
              <div className="w-9 h-1 bg-[var(--bd)]/25 rounded-full mx-auto mt-3 mb-0 shrink-0" />

              {/* Header — compact */}
              <div className="px-4 pt-2 pb-2.5 flex items-center justify-between border-b border-[var(--bd)]/12 shrink-0">
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">Tambah AI ke Grup</h3>
                  <p className="text-[11px] text-[var(--text)]/40 mt-0.5">Pilih model AI</p>
                </div>
                <button
                  onClick={() => { setShowAIModal(false); setExpandedAI(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/50 transition-colors active:scale-90"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              {/* Scrollable list — will-change for GPU smooth */}
              <div
                className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-1.5"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}
              >
                {AI_CONFIG.map((ai) => {
                  const isAdded = activeGroup.participants.some(p => p.name === ai.name);
                  const isExpanded = expandedAI === ai.name;

                  return (
                    <div
                      key={ai.name}
                      className={cn(
                        "rounded-xl border overflow-hidden transition-colors duration-100",
                        isAdded
                          ? "border-[var(--bd)]/12 opacity-45"
                          : isExpanded
                          ? "border-[var(--bd)]/30 bg-[var(--sf)]/30"
                          : "border-[var(--bd)]/18 hover:border-[var(--bd)]/30"
                      )}
                    >
                      {/* Row — compact height */}
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        {/* Brand logo — smaller */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: ai.bgColor, color: ai.iconColor }}
                        >
                          <ai.Logo size={18} />
                        </div>

                        {/* Name + model */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[var(--text)] leading-tight">{ai.name}</div>
                          <div className="text-[11px] text-[var(--text)]/40 mt-0.5 leading-tight">{ai.model}</div>
                        </div>

                        {/* Actions */}
                        {isAdded ? (
                          <div className="px-2.5 py-0.5 rounded-full bg-[var(--sf)] border border-[var(--bd)]/18 text-[10px] font-semibold text-[var(--text)]/40 uppercase tracking-wide">
                            Aktif
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedAI(isExpanded ? null : ai.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/40 transition-colors"
                            >
                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.18, ease: 'easeInOut' }}
                                style={{ display: 'flex' }}
                              >
                                <ChevronDown size={14} strokeWidth={2} />
                              </motion.span>
                            </button>
                            <button
                              onClick={() => {
                                onAddParticipant({
                                  id: `ai-${ai.name.toLowerCase().replace(' ', '-')}`,
                                  name: ai.name, isAI: true,
                                  model: ai.model, avatar: ai.name[0],
                                });
                                showToast(`${ai.name} bergabung ke grup!`);
                                setShowAIModal(false);
                                setExpandedAI(null);
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg)] active:scale-90 transition-transform shadow-sm"
                            >
                              <Plus size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* API Key drawer — smooth height */}
                      <AnimatePresence initial={false}>
                        {isExpanded && !isAdded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 py-2.5 border-t border-[var(--bd)]/12 bg-[var(--sf)]/20 flex gap-2">
                              <input
                                type="password"
                                placeholder={`${ai.name} API Key...`}
                                value={apiKeys[ai.name] || ''}
                                onChange={(e) => setApiKeys({ ...apiKeys, [ai.name]: e.target.value })}
                                className="flex-1 bg-[var(--bg)] border border-[var(--bd)]/22 text-[var(--text)] rounded-xl px-3 py-2 text-[12px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/28 transition-colors"
                              />
                              <button
                                onClick={() => { showToast(`API Key ${ai.name} tersimpan!`); setExpandedAI(null); }}
                                className="px-3 py-2 bg-[var(--text)] text-[var(--bg)] text-[11px] font-semibold rounded-xl flex items-center gap-1 active:scale-95 transition-transform"
                              >
                                <Save size={11} />
                                Simpan
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* Custom AI — compact */}
                <div className="mt-1.5 pt-3 border-t border-[var(--bd)]/12">
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <Sparkles size={11} className="text-[var(--text)]/35" />
                    <span className="text-[10px] font-semibold text-[var(--text)]/35 uppercase tracking-widest">Custom AI</span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 bg-[var(--sf)]/40 rounded-xl border border-[var(--bd)]/12">
                    <input
                      type="text"
                      placeholder="Nama AI (contoh: TelierBot)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)]/22 text-[var(--text)] rounded-xl px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/28 transition-colors"
                    />
                    <input
                      type="password"
                      placeholder="API Key / Token..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)]/22 text-[var(--text)] rounded-xl px-3 py-2.5 text-[12px] outline-none placeholder:text-[var(--text)]/25 focus:border-[var(--text)]/28 transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (!customName.trim()) return;
                        onAddParticipant({
                          id: `ai-custom-${Date.now()}`,
                          name: customName, isAI: true,
                          model: 'Custom API', avatar: customName[0].toUpperCase(),
                        });
                        showToast(`${customName} ditambahkan!`);
                        setCustomName(''); setCustomKey(''); setShowAIModal(false);
                      }}
                      disabled={!customName.trim()}
                      className="w-full py-2.5 bg-[var(--text)] text-[var(--bg)] text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-25 active:scale-[0.98] transition-transform"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      Pasang & Simpan
                    </button>
                  </div>
                </div>

                <div className="h-3" />
              </div>
            </motion.div>
          </>
        )}

      </AnimatePresence>
    </div>
  );
};
