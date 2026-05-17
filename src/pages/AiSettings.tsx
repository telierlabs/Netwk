import React, { useState, useEffect } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GroupParticipant } from '../../types';

interface AddAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroupParticipants: GroupParticipant[];
  onAddParticipant: (p: GroupParticipant) => void;
  showToast: (msg: string) => void;
}

const AVAILABLE_AIS = [
  { id: 'chatgpt', name: 'ChatGPT', role: 'ai', icon: '🧠', model: 'GPT-4o' },
  { id: 'gemini', name: 'Gemini', role: 'ai', icon: '✨', model: 'Gemini 2.5 Flash' },
  { id: 'claude', name: 'Claude', role: 'ai', icon: '⚡', model: 'Claude Sonnet 4' },
  { id: 'deepseek', name: 'DeepSeek', role: 'ai', icon: '🐳', model: 'DeepSeek V3' },
  { id: 'meta', name: 'Meta AI', role: 'ai', icon: '♾️', model: 'Llama 3' },
  { id: 'grok', name: 'Grok', role: 'ai', icon: '✖️', model: 'Grok-2' },
];

export const AddAIModal: React.FC<AddAIModalProps> = ({ isOpen, onClose, activeGroupParticipants, onAddParticipant, showToast }) => {
  const [search, setSearch] = useState('');

  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const filteredAIs = AVAILABLE_AIS.filter(ai => ai.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggle = (ai: any) => {
    const isAlreadyIn = activeGroupParticipants.some(p => p.id === ai.id);
    if (isAlreadyIn) {
      showToast(`${ai.name} sudah ada di grup`);
      return;
    }
    
    // Add logic
    onAddParticipant({
      id: ai.id,
      name: ai.name,
      role: 'ai',
      avatar: ai.icon,
      isTyping: false
    });
    showToast(`${ai.name} ditambahkan ke grup!`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed bottom-0 left-0 right-0 z-[410] md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:max-w-md w-full"
          >
            {/* Menggunakan var(--bg) untuk background utama modal agar ikut tema */}
            <div className="bg-[var(--bg)] w-full rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] border border-[var(--bd)]">
              
              {/* Drag Handle for Mobile */}
              <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-12 h-1.5 bg-[var(--bd)] rounded-full" />
              </div>

              {/* Header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--bd)]">
                <div className="flex flex-col">
                  <h2 className="text-[20px] font-bold text-[var(--text)] tracking-tight">Kelola AI</h2>
                  <p className="text-[13px] text-[var(--mu)] mt-0.5">Pilih asisten AI untuk grup ini</p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--sf)] text-[var(--text)] hover:bg-[var(--bd)] transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-[var(--bd)] bg-[var(--bg)]">
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu)]" />
                  <input 
                    type="text" 
                    placeholder="Cari AI..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-[var(--sf)] text-[var(--text)] placeholder:text-[var(--mu)] pl-11 pr-4 py-3 rounded-[16px] text-[15px] outline-none border border-[var(--bd)] focus:border-[var(--text)]/20 transition-colors"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
                {filteredAIs.map((ai) => {
                  const isActive = activeGroupParticipants.some(p => p.id === ai.id);
                  return (
                    <div 
                      key={ai.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-[20px] transition-all border",
                        isActive 
                          ? "bg-[var(--sf)] border-[var(--bd)] shadow-sm" 
                          : "bg-[var(--bg)] border-[var(--bd)] hover:bg-[var(--sf)]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-[16px] flex items-center justify-center text-2xl shadow-sm border",
                          isActive ? "bg-[var(--bg)] border-[var(--bd)]" : "bg-[var(--sf)] border-[var(--bd)]"
                        )}>
                          {ai.icon}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[16px] text-[var(--text)] leading-none">{ai.name}</span>
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-[var(--mu)] mt-1 font-medium">{ai.model}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleToggle(ai)}
                        disabled={isActive}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          isActive 
                            ? "bg-red-500/10 text-red-500 cursor-not-allowed opacity-50" 
                            : "bg-[var(--text)]/5 text-[var(--text)] hover:bg-[var(--text)]/10 active:scale-90"
                        )}
                      >
                        {isActive ? <span className="font-bold text-[18px] leading-none">-</span> : <Plus size={20} strokeWidth={2.5} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--bd)] bg-[var(--bg)]">
                 <div className="flex items-start gap-3 p-4 rounded-[20px] bg-[var(--sf)] border border-[var(--bd)]">
                   <div className="p-2 bg-[var(--bg)] rounded-full text-[var(--text)] shadow-sm">
                     <Sparkles size={16} />
                   </div>
                   <div className="flex-1">
                     <p className="text-[13px] text-[var(--text)] font-medium leading-relaxed">
                       Kamu bisa menambahkan beberapa AI sekaligus ke dalam grup untuk berdiskusi bersama.
                     </p>
                   </div>
                 </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
