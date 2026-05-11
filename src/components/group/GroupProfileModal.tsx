import React from 'react';
import { X, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession } from '../../types';

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: GroupSession;
}

export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({ isOpen, onClose, activeGroup }) => {
  if (!isOpen) return null;

  const aiCount = activeGroup.participants.filter(p => p.isAI).length;
  const userCount = activeGroup.participants.filter(p => !p.isAI).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 m-auto z-[201] w-[90%] max-w-[380px] h-fit max-h-[75vh] bg-[var(--bg)] rounded-[24px] shadow-2xl border border-[var(--bd)]/20 flex flex-col overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-[var(--bd)]/15 bg-[var(--bg)]">
          <div>
            <h3 className="text-[17px] font-bold text-[var(--text)]">{activeGroup.title}</h3>
            <p className="text-[12px] text-[var(--text)]/50 mt-0.5">{activeGroup.participants.length} Anggota (Maks 10)</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)]/60 transition-colors">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4 bg-[var(--sf)]/20" style={{ scrollbarWidth: 'none' }}>
          
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg)] border border-[var(--bd)]/20 rounded-[16px] shadow-sm">
            <span className="text-[13px] text-[var(--text)]/60 font-medium">Kapasitas Member</span>
            <span className="text-[13px] font-bold text-[var(--text)]">{userCount} / 10 User</span>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text)]/40 ml-1">Daftar Anggota</h4>
            <div className="bg-[var(--bg)] border border-[var(--bd)]/20 rounded-[16px] overflow-hidden shadow-sm flex flex-col">
              {activeGroup.participants.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 ${i !== activeGroup.participants.length - 1 ? 'border-b border-[var(--bd)]/10' : ''}`}>
                  <div 
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm"
                    style={p.isAI ? { backgroundColor: 'var(--sf)', color: 'var(--text)' } : { backgroundColor: 'var(--text)', color: 'var(--bg)' }}
                  >
                    {p.isAI ? <Bot size={20} className="opacity-80" /> : <User size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-[var(--text)] truncate">{p.name}</p>
                      {!p.isAI && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--ac)] text-[var(--at)]">Admin</span>}
                    </div>
                    <p className="text-[12px] text-[var(--text)]/40 mt-0.5 truncate font-medium">{p.isAI ? p.model : 'Pembuat Grup'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
