import React from 'react';
import { X, Mail, Share2, MessageSquare, ShieldAlert, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession } from '../../types';
import { AI_CONFIG } from './AddAIModal'; // Import buat ambil warnanya

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: GroupSession;
  showToast: (msg: string) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose, activeGroup, showToast }) => {
  if (!isOpen) return null;

  const aiCount = activeGroup.participants.filter(p => p.isAI).length;
  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.8 }}
        className="fixed bottom-0 left-0 right-0 z-[201] mx-auto w-full max-w-sm bg-[var(--bg)] rounded-t-[24px] shadow-2xl border border-[var(--bd)]/20 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="w-10 h-1 bg-[var(--bd)]/25 rounded-full mx-auto mt-3 mb-1 shrink-0" />
        
        <div className="px-5 pt-2 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--bd)]/10">
          <div>
            <h3 className="text-[17px] font-bold text-[var(--text)]">{activeGroup.title}</h3>
            <p className="text-[12px] text-[var(--text)]/50 mt-0.5">{activeGroup.participants.length} Anggota (Maks 10)</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)]/50 transition-colors bg-[var(--sf)]/50">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-7 flex flex-col gap-5 pt-4" style={{ scrollbarWidth: 'none' }}>
          
          {/* DAFTAR MEMBER & AI */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--text)]/40 ml-1">Anggota Grup</h4>
            <div className="bg-[var(--sf)]/30 border border-[var(--bd)]/15 rounded-2xl overflow-hidden flex flex-col">
              {activeGroup.participants.map((p, i) => {
                const aiData = AI_CONFIG.find(ai => ai.name === p.name);
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${i !== activeGroup.participants.length - 1 ? 'border-b border-[var(--bd)]/10' : ''}`}>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={p.isAI ? { backgroundColor: aiData?.bgColor || '#eef2ff', color: aiData?.iconColor || '#4285f4' } : { backgroundColor: 'var(--text)', color: 'var(--bg)' }}
                    >
                      {p.isAI ? (aiData ? <ai.Logo size={20} /> : <Bot size={20} />) : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[var(--text)] truncate">{p.name}</p>
                        {!p.isAI && <span className="px-1.5 py-0.5 rounded md text-[9px] font-black uppercase tracking-wider bg-[var(--ac)] text-[var(--at)]">Admin</span>}
                      </div>
                      <p className="text-[11.5px] text-[var(--text)]/40 mt-0.5 truncate">{p.isAI ? p.model : 'Pembuat Grup'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UNDANG TEMAN */}
          <div className="flex flex-col gap-3">
            <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--text)]/40 ml-1">Undang Teman</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Email', icon: <Mail size={18} strokeWidth={1.5} /> },
                { name: 'Salin Link', icon: <Share2 size={18} strokeWidth={1.5} /> },
                { name: 'WhatsApp', icon: <MessageSquare size={18} strokeWidth={1.5} /> },
              ].map((opt) => (
                <button key={opt.name}
                  onClick={() => { showToast(`${opt.name} disalin!`); onClose(); }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-[52px] h-[52px] rounded-2xl bg-[var(--sf)] border border-[var(--bd)]/15 flex items-center justify-center text-[var(--text)]/70 group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95 shadow-sm">
                    {opt.icon}
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text)]/60">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
