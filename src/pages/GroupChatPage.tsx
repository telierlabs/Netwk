import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, Plus, Mail, Share2, Bot, Zap, X, UserPlus, MessageSquare, Sparkles, ChevronRight,
  ArrowLeft, Camera, ChevronDown, ChevronUp, Check, Save
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
  onBack?: () => void; 
  onNavigateProfile?: () => void; 
}

export const GroupChatPage: React.FC<GroupChatPageProps> = ({
  activeGroup, isSending, onSendMessage, onAddParticipant, showToast, onBack, onNavigateProfile
}) => {
  const [inputText, setInputText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  
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

  const inviteOptions = [
    { name: 'Email', icon: <Mail size={18} /> },
    { name: 'Salin Link', icon: <Share2 size={18} /> },
    { name: 'WhatsApp', icon: <MessageSquare size={18} /> },
  ];

  const aiModels = [
    { name: 'ChatGPT', model: 'GPT-4o', icon: 'G' },
    { name: 'Gemini', model: 'Gemini 2.5 Flash', icon: '✦' },
    { name: 'Claude', model: 'Claude 3.5 Sonnet', icon: 'C' },
    { name: 'DeepSeek', model: 'DeepSeek V3', icon: 'D' },
    { name: 'Meta AI', model: 'Llama 3', icon: 'M' },
    { name: 'Grok', model: 'Grok-2', icon: 'G' },
  ];

  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  const handleSaveApiKey = (aiName: string) => {
    showToast(`API Key untuk ${aiName} tersimpan!`);
    setExpandedAI(null);
  };

  const handleAddCustomAI = () => {
    if (!customName.trim()) return;
    onAddParticipant({ 
      id: `ai-custom-${Date.now()}`, 
      name: customName, 
      isAI: true, 
      model: 'Custom API', 
      avatar: customName[0].toUpperCase() 
    });
    showToast(`Custom AI ${customName} berhasil ditambahkan!`);
    setCustomName('');
    setCustomKey('');
    setShowAIModal(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative outline-none">
      
      {/* ✅ FIX: GAK ADA HEADER GANDA/BACK BUTTON. Murni kontrol grup (Kamera & + AI) */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--bd)]/30 outline-none">
        <div className="flex flex-col cursor-pointer outline-none [-webkit-tap-highlight-color:transparent]" onClick={() => setShowInviteModal(true)}>
          <h2 className="text-[16px] font-bold text-[var(--text)] leading-tight tracking-tight">{activeGroup.title}</h2>
          <p className="text-[12px] text-[var(--text)]/60 font-medium leading-tight mt-0.5">
            {userCount} Anggota, {activeGroup.participants.length - userCount} AI Aktif
          </p>
        </div>

        <div className="flex items-center gap-1.5 outline-none">
          <button className="p-2 text-[var(--text)]/80 hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-full transition-all active:scale-95 outline-none [-webkit-tap-highlight-color:transparent]">
            <Camera size={22} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setShowAIModal(true)} 
            className="flex items-center justify-center px-4 py-2 ml-0.5 bg-[var(--text)] text-[var(--bg)] rounded-full text-[14px] font-black shadow-md hover:scale-105 active:scale-95 transition-all outline-none [-webkit-tap-highlight-color:transparent]"
          >
            + AI
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 outline-none">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 outline-none">
          {activeGroup.messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col outline-none", msg.role === 'user' ? "items-end" : "items-start")}>
              {msg.role === 'system' ? (
                <div className="w-full flex justify-center my-4 outline-none">
                  <div className="px-4 py-1.5 bg-[var(--sf)] rounded-full text-[10px] text-[var(--mu)] border border-[var(--bd)] italic outline-none">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <ChatBubble msg={msg} msgIndex={i} />
              )}
            </div>
          ))}
          {isSending && (
            <div className="flex flex-col items-start gap-2 outline-none">
              <div className="flex items-center gap-2 px-1 outline-none">
                <div className="w-2 h-2 rounded-full bg-[var(--ac)] animate-pulse" />
                <span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest animate-pulse">AI sedang berdiskusi...</span>
              </div>
              <div className="w-full max-w-md h-20 bg-[var(--sf)] rounded-2xl border border-[var(--bd)] animate-pulse outline-none" />
            </div>
          )}
          <div ref={chatEndRef} className="outline-none" />
        </div>
      </main>

      <ChatInput inputText={inputText} setInputText={setInputText} onSend={handleSend} isSending={isSending} attachedImage={null} setAttachedImage={() => {}} />

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 outline-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm transform-gpu outline-none" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="relative w-full max-w-md bg-[var(--bg)]/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-[var(--bd)]/50 overflow-hidden transform-gpu outline-none">
              <div className="p-6 border-b border-[var(--bd)]/50 flex items-center justify-between outline-none">
                <h3 className="text-[18px] font-bold tracking-tight outline-none">Info Grup & Undangan</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors active:scale-95 outline-none [-webkit-tap-highlight-color:transparent]"><X size={20} /></button>
              </div>
              <div className="p-6 flex flex-col gap-6 outline-none">
                <div className="p-5 bg-[var(--sf)]/50 rounded-[20px] border border-[var(--bd)] text-center flex flex-col items-center justify-center outline-none">
                  <p className="text-[12px] font-bold text-[var(--mu)] mb-1 uppercase tracking-wider outline-none">Kapasitas Member</p>
                  <div className="text-3xl font-black text-[var(--text)] outline-none">{userCount}<span className="text-[var(--mu)]">/10</span></div>
                </div>
                <div className="grid grid-cols-3 gap-4 outline-none">
                  {inviteOptions.map((opt) => (
                    <button key={opt.name} onClick={() => { showToast(`${opt.name} disalin!`); setShowInviteModal(false); }} className="flex flex-col items-center gap-2 group outline-none [-webkit-tap-highlight-color:transparent]">
                      <div className="w-14 h-14 rounded-[18px] bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center text-[var(--text)] shadow-sm group-hover:scale-105 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all outline-none">
                        {opt.icon}
                      </div>
                      <span className="text-[11px] font-bold text-[var(--mu)] group-hover:text-[var(--text)] transition-colors outline-none">{opt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAIModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 outline-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setShowAIModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md transform-gpu outline-none" />
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }} transition={{ type: "tween", ease: "easeOut", duration: 0.2 }} className="relative w-full max-w-md bg-[var(--bg)]/95 backdrop-blur-3xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-[var(--text)]/10 overflow-hidden flex flex-col max-h-[85vh] transform-gpu outline-none">
              
              <div className="p-5 border-b border-[var(--bd)]/50 flex items-center justify-between bg-[var(--bg)]/50 sticky top-0 z-10 outline-none">
                <div className="flex items-center gap-3 outline-none">
                  <div className="w-10 h-10 bg-[var(--text)] text-[var(--bg)] rounded-2xl flex items-center justify-center shadow-md outline-none"><Bot size={22} strokeWidth={2.5} /></div>
                  <div className="outline-none">
                    <h3 className="text-[17px] font-black tracking-tight outline-none">Tambah AI ke Grup</h3>
                    <p className="text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest outline-none">Pilih Model AI</p>
                  </div>
                </div>
                <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors active:scale-90 outline-none [-webkit-tap-highlight-color:transparent]"><X size={22} strokeWidth={2.5} /></button>
              </div>

              <div className="p-4 flex flex-col gap-3 overflow-y-auto outline-none" style={{ scrollbarWidth: 'none' }}>
                
                {aiModels.map((ai) => {
                  const isAdded = activeGroup.participants.some(p => p.name === ai.name);
                  const isExpanded = expandedAI === ai.name;

                  return (
                    <div key={ai.name} className={cn("flex flex-col rounded-[20px] border transition-all overflow-hidden bg-[var(--bg)] shadow-sm outline-none", isAdded ? "border-[var(--bd)] opacity-60" : isExpanded ? "border-[var(--text)]/30 ring-1 ring-[var(--text)]/10" : "border-[var(--bd)] hover:border-[var(--text)]/30")}>
                      
                      <div className="flex items-center gap-3 p-3 outline-none">
                        <div className="w-12 h-12 rounded-[14px] bg-[var(--text)] flex items-center justify-center text-[var(--bg)] text-xl font-black shrink-0 outline-none">
                          {ai.icon}
                        </div>
                        <div className="flex-1 min-w-0 outline-none">
                          <div className="text-[15px] font-bold text-[var(--text)] truncate outline-none">{ai.name}</div>
                          <div className="text-[11px] text-[var(--text)]/50 font-mono truncate mt-0.5 outline-none">{ai.model}</div>
                        </div>
                        
                        <div className="flex items-center gap-1 outline-none">
                          {!isAdded && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setExpandedAI(isExpanded ? null : ai.name); }}
                              className="p-2 text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-[var(--sf)] rounded-full transition-all active:scale-90 outline-none [-webkit-tap-highlight-color:transparent]"
                            >
                              {isExpanded ? <ChevronUp size={18} strokeWidth={2.5} /> : <ChevronDown size={18} strokeWidth={2.5} />}
                            </button>
                          )}
                          
                          {isAdded ? (
                            <div className="px-3 py-1.5 bg-[var(--text)]/10 text-[var(--text)] rounded-full text-[10px] font-black uppercase tracking-widest outline-none">Aktif</div>
                          ) : (
                            <button 
                              onClick={() => { onAddParticipant({ id: `ai-${ai.name.toLowerCase()}`, name: ai.name, isAI: true, model: ai.model, avatar: ai.icon }); showToast(`${ai.name} bergabung!`); setShowAIModal(false); }}
                              className="w-8 h-8 rounded-full bg-[var(--sf)] hover:bg-[var(--text)] text-[var(--text)] hover:text-[var(--bg)] flex items-center justify-center transition-all active:scale-90 border border-[var(--bd)] outline-none [-webkit-tap-highlight-color:transparent]"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && !isAdded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[var(--sf)]/30 border-t border-[var(--bd)]/50 outline-none">
                            <div className="p-3 flex items-center gap-2 outline-none">
                              <input 
                                type="password" 
                                placeholder={`Enter ${ai.name} API Key...`}
                                value={apiKeys[ai.name] || ''}
                                onChange={(e) => setApiKeys({...apiKeys, [ai.name]: e.target.value})}
                                className="flex-1 bg-[var(--bg)] border border-[var(--bd)] rounded-[12px] px-3 py-2 text-[13px] outline-none focus:border-[var(--text)]/50 transition-colors placeholder:text-[var(--text)]/30 [-webkit-tap-highlight-color:transparent]"
                              />
                              <button 
                                onClick={() => handleSaveApiKey(ai.name)}
                                className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] text-[12px] font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 shadow-sm outline-none [-webkit-tap-highlight-color:transparent]"
                              >
                                <Save size={14} /> Simpan
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <div className="mt-2 pt-4 border-t border-[var(--bd)]/50 outline-none">
                  <div className="flex items-center justify-between mb-3 px-1 outline-none">
                    <span className="text-[11px] font-black text-[var(--text)]/50 uppercase tracking-widest outline-none">Pasang Custom AI</span>
                    <Sparkles size={14} className="text-[var(--text)]/50 outline-none" />
                  </div>
                  
                  <div className="flex flex-col gap-2 p-3 bg-[var(--sf)]/50 rounded-[20px] border border-[var(--bd)] outline-none">
                    <input 
                      type="text" 
                      placeholder="Nama AI (ex: TelierBot)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)] rounded-[12px] px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-[var(--text)]/50 transition-colors [-webkit-tap-highlight-color:transparent]"
                    />
                    <input 
                      type="password" 
                      placeholder="Custom API Key URL/Token..."
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--bd)] rounded-[12px] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--text)]/50 transition-colors [-webkit-tap-highlight-color:transparent]"
                    />
                    <button 
                      onClick={handleAddCustomAI}
                      disabled={!customName.trim()}
                      className="w-full mt-1 py-2.5 bg-[var(--text)] text-[var(--bg)] text-[13px] font-bold rounded-[12px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-md outline-none [-webkit-tap-highlight-color:transparent]"
                    >
                      <Plus size={16} strokeWidth={2.5} /> Pasang & Simpan
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
