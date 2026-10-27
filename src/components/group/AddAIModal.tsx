import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GroupParticipant } from '../../types';

// ─── DAFTAR AI (cuma nama + model, tanpa logo) ─────────────────────────────────

export const AI_CONFIG = [
  { name: 'ChatGPT',    model: 'GPT-4o' },
  { name: 'Gemini',     model: 'Gemini 2.5 Flash' },
  { name: 'Claude',     model: 'Claude Sonnet 4' },
  { name: 'DeepSeek',   model: 'DeepSeek V3' },
  { name: 'Meta AI',    model: 'Llama 3' },
  { name: 'Grok',       model: 'Grok-2' },
  { name: 'Perplexity', model: 'Sonar Pro' },
];

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface AddAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroupParticipants: GroupParticipant[];
  onAddParticipant: (p: GroupParticipant) => void;
  onRemoveParticipant?: (id: string) => boolean | void | Promise<boolean | void>;
  canRemove?: boolean; // true = admin grup
  showToast: (msg: string) => void;
}

const aiId = (name: string) => `ai-${name.toLowerCase().replace(/\s+/g, '-')}`;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const AddAIModal: React.FC<AddAIModalProps> = ({
  isOpen,
  onClose,
  activeGroupParticipants,
  onAddParticipant,
  onRemoveParticipant,
  canRemove = true,
  showToast,
}) => {
  const handleAdd = (ai: typeof AI_CONFIG[number]) => {
    onAddParticipant({
      id: aiId(ai.name),
      name: ai.name,
      isAI: true,
      model: ai.model,
      avatar: ai.name[0],
    });
    showToast(`${ai.name} bergabung ke grup!`);
  };

  const handleRemove = async (ai: typeof AI_CONFIG[number]) => {
    if (!canRemove) {
      showToast('Hanya admin grup yang bisa mengeluarkan AI');
      return;
    }
    if (!onRemoveParticipant) {
      showToast('Fitur keluarkan AI belum tersambung');
      return;
    }
    const ok = await onRemoveParticipant(aiId(ai.name));
    showToast(ok === false ? 'Gagal mengeluarkan AI' : `${ai.name} dikeluarkan dari grup`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop: polos tanpa blur (backdrop-blur di atas chat yang panjang bikin lag di HP) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/70"
          />

          {/* Wrapper buat center modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-4">
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ willChange: 'transform, opacity' }}
              className="pointer-events-auto bg-[var(--bg)] border border-[var(--bd)] flex flex-col overflow-hidden shadow-2xl w-full max-w-[380px] max-h-[440px] rounded-[24px] transform-gpu"
            >
              {/* Header */}
              <div className="p-6 pb-4 flex items-center justify-between shrink-0 border-b border-[var(--bd)]">
                <div>
                  <div className="text-[18px] font-bold text-[var(--text)] tracking-tight">
                    Kelola AI
                  </div>
                  <div className="text-[13px] text-[var(--mu)] mt-1 font-medium">
                    Pilih asisten AI untuk grup ini
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--text)]/5 flex items-center justify-center text-[var(--mu)] hover:bg-[var(--text)]/10 hover:text-[var(--text)] transition-colors shrink-0 [-webkit-tap-highlight-color:transparent]"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Daftar AI */}
              <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
                {AI_CONFIG.map((ai) => {
                  const isAdded = activeGroupParticipants.some((p) => p.name === ai.name);

                  return (
                    <div
                      key={ai.name}
                      className={cn(
                        "flex items-center gap-3.5 px-4 py-3 rounded-[16px] border",
                        isAdded ? "bg-[var(--sf)] border-[var(--bd)]" : "bg-transparent border-transparent"
                      )}
                    >
                      {/* Teks */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[var(--text)] leading-tight">
                            {ai.name}
                          </span>
                          {isAdded && (
                            <span className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              <span className="text-[11px] font-medium text-[var(--text)] opacity-80">Aktif</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-[var(--mu)] mt-1">
                          {ai.model}
                        </div>
                      </div>

                      {/* Tombol aksi (tombol minus cuma muncul buat admin) */}
                      {isAdded && !canRemove ? null : isAdded ? (
                        <button
                          onClick={() => handleRemove(ai)}
                          title="Keluarkan dari grup"
                          className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAdd(ai)}
                          title="Tambah ke grup"
                          className="w-9 h-9 rounded-full bg-[var(--text)]/5 text-[var(--text)] flex items-center justify-center shrink-0 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
