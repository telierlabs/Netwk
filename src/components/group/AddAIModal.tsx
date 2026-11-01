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
  onAddParticipant: (p: GroupParticipant) => boolean | void | Promise<boolean | void>;
  onRemoveParticipant?: (id: string) => boolean | void | Promise<boolean | void>;
  canManage?: boolean;            // true = boleh tambah & keluarkan AI
  canRemove?: boolean;            // (lama) dipakai kalau canManage tidak diisi
  managedBy?: 'admin' | 'members'; // aturan yang berlaku di Collaboration ini
  showToast: (msg: string) => void;
}

const aiId = (name: string) => `ai-${name.toLowerCase().replace(/\s+/g, '-')}`;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const AddAIModal: React.FC<AddAIModalProps> = ({
  isOpen,
  onClose,
  activeGroupParticipants,
  onAddParticipant,
  canManage,
  canRemove,
  managedBy = 'admin',
  showToast,
}) => {
  const allowed = canManage ?? canRemove ?? true;

  const handleAdd = async (ai: typeof AI_CONFIG[number]) => {
    if (!allowed) {
      showToast('Hanya admin yang bisa menambahkan AI');
      return;
    }
    const ok = await onAddParticipant({
      id: aiId(ai.name),
      name: ai.name,
      isAI: true,
      model: ai.model,
      avatar: ai.name[0],
    });
    if (ok === false) {
      showToast('Gagal menambahkan AI, coba lagi');
      return;
    }
    showToast(`${ai.name} bergabung ke Collaboration!`);
  };

  // Keluarkan AI lewat event ke useGroupChat (nggak tergantung props dari halaman induk)
  const handleRemove = (ai: typeof AI_CONFIG[number]) => {
    if (!allowed) {
      showToast('Hanya admin yang bisa mengeluarkan AI');
      return;
    }

    let settled = false;
    const done = (res: { success: boolean; message?: string }) => {
      if (settled) return;
      settled = true;
      showToast(res.success ? `${ai.name} dikeluarkan dari Collaboration` : (res.message || 'Gagal mengeluarkan AI, coba lagi'));
    };

    window.dispatchEvent(new CustomEvent('group-ai-remove', {
      detail: { participantId: aiId(ai.name), name: ai.name, done },
    }));

    // Kalau nggak ada respon sama sekali, anggap gagal
    setTimeout(() => done({ success: false }), 6000);
  };

  // Anggota yang tidak boleh kelola cuma melihat AI yang aktif
  const isAdded = (name: string) => activeGroupParticipants.some((p) => p.name === name);
  const list = allowed ? AI_CONFIG : AI_CONFIG.filter(ai => isAdded(ai.name));

  const subtitle = !allowed
    ? 'AI yang aktif di Collaboration ini'
    : managedBy === 'members'
      ? 'Semua anggota dapat menambah dan mengeluarkan AI'
      : 'Pilih asisten AI untuk Collaboration ini';

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
                <div className="min-w-0 pr-3">
                  <div className="text-[18px] font-bold text-[var(--text)] tracking-tight">
                    {allowed ? 'Kelola AI' : 'AI Aktif'}
                  </div>
                  <div className="text-[13px] text-[var(--mu)] mt-1 font-medium">
                    {subtitle}
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
                {list.length === 0 && (
                  <div className="py-10 text-center text-[13px] font-medium text-[var(--text)]/40">
                    Belum ada AI aktif.
                  </div>
                )}

                {list.map((ai) => {
                  const added = isAdded(ai.name);

                  return (
                    <div
                      key={ai.name}
                      className={cn(
                        "flex items-center gap-3.5 px-4 py-3 rounded-[16px] border",
                        added ? "bg-[var(--sf)] border-[var(--bd)]" : "bg-transparent border-transparent"
                      )}
                    >
                      {/* Teks */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold text-[var(--text)] leading-tight">
                            {ai.name}
                          </span>
                          {added && (
                            <span className="bg-[var(--text)]/10 px-2 py-0.5 rounded-full text-[11px] font-medium text-[var(--text)]">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[13px] text-[var(--mu)] mt-1">
                          {ai.model}
                        </div>
                      </div>

                      {/* Tombol aksi: cuma muncul kalau boleh kelola */}
                      {!allowed ? null : added ? (
                        <button
                          onClick={() => handleRemove(ai)}
                          title="Keluarkan dari Collaboration"
                          className="w-9 h-9 rounded-full bg-[var(--text)]/10 text-[var(--text)] flex items-center justify-center shrink-0 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAdd(ai)}
                          title="Tambah ke Collaboration"
                          className="w-9 h-9 rounded-full bg-[var(--text)]/5 text-[var(--text)] flex items-center justify-center shrink-0 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Catatan untuk anggota yang tidak boleh kelola */}
              {!allowed && (
                <div className="shrink-0 px-6 py-4 border-t border-[var(--bd)] text-[12.5px] leading-relaxed text-[var(--text)]/55 font-medium">
                  Hanya admin yang bisa menambah atau mengeluarkan AI.
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
