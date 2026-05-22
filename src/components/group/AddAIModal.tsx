import React from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GroupParticipant } from '../../types';

// ─── AI BRAND LOGOS (100% OFFICIAL & PIXEL-PERFECT) ────────────────────────────

const ChatGPTLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
    <path d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.505-3.36 10.079 10.079 0 00-9.612 6.977 9.967 9.967 0 00-6.664 4.834 10.08 10.08 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.36 10.079 10.079 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.814zm-22.023 22.979a7.474 7.474 0 01-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 00.655-1.134V19.054l3.366 1.944a.12.12 0 01.066.092v9.299a7.505 7.505 0 01-7.49 7.496zM6.392 31.006a7.471 7.471 0 01-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 001.308 0l9.724-5.614v3.888a.12.12 0 01-.048.103L16.69 34.54a7.505 7.505 0 01-10.297-3.534zm-2.095-17.386A7.469 7.469 0 018.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 00.654 1.132l9.723 5.614-3.366 1.944a.12.12 0 01-.114.012L7.044 23.86a7.504 7.504 0 01-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 01.114-.012l8.048 4.648a7.498 7.498 0 01-1.158 13.528v-9.476a1.293 1.293 0 00-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 00-1.308 0l-9.723 5.614v-3.888a.12.12 0 01.048-.103l8.048-4.645a7.497 7.497 0 0111.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 01-.065-.092v-9.299a7.497 7.497 0 0112.293-5.756 6.94 6.94 0 00-.236.134l-7.965 4.6a1.294 1.294 0 00-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z" fill="currentColor" />
  </svg>
);

const GeminiLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <defs>
      <linearGradient id="geminiGrad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EA4335" />
        <stop offset="35%" stopColor="#4285F4" />
        <stop offset="70%" stopColor="#34A853" />
        <stop offset="100%" stopColor="#FBBC05" />
      </linearGradient>
    </defs>
    <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="url(#geminiGrad)" />
  </svg>
);

const ClaudeLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path fill="currentColor" d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.184.032-.178-.291-.321-1.125-1.15-.99-1.077-.946-1.094-.223-.298.174-.166.276-.145.41.173 1.25.617 1.458.649 1.026.402.138.032.085-.053.036-.153-1.048-3.32-.42-1.464-.234-.877L4.72.63l.254-.153.38.02.263.313.684 1.034.906 1.465.748 1.293.102.158.125.02.126-.11L8.914 1.95 9.423.465l.081-.366.307-.099.36.141.08.384-.254 1.343-.45 1.55-.579 1.702-.057.142.065.117h.186l1.391-.655 1.577-.82 1.355-.785.344-.226.315.024.238.258-.08.414-.647 1.157-1.039 1.405-1.091 1.228-.105.138.016.141v.226l1.358.17 1.666.16 1.638.114.397.016.177.291-.064.364-.384.182-1.572-.255-1.597-.331-1.176-.287-.13-.024-.092.113-.025.138.837 3.235.393 1.396.222.844.02.21-.21.238-.38-.04-.266-.312-.663-1.034-.86-1.465-.724-1.284-.105-.158-.125-.016-.126.114-.606 1.716-.505 1.474-.085.367-.315.093-.355-.138-.077-.384.246-1.332.441-1.53.566-1.688.053-.146-.073-.117h-.185l-1.392.659-1.58.826-1.36.791-.351.222-.315-.024-.23-.263.085-.418.66-1.168 1.05-1.417 1.103-1.24.11-.141-.017-.142z"/>
  </svg>
);

const DeepSeekLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
    <path fill="currentColor" d="M678.3 846.6c-48.4 18.5-103.9 29.5-166.3 29.5-177 0-316.5-98.3-375.4-241.1 63.8 62.1 154.5 102.3 255.4 102.3 75.9 0 146.4-23.7 205-64.4-40.4 19.3-85.3 30.3-132.8 30.3-118.8 0-221.7-68-271.7-167.3 22.8 28 53.6 51 88.6 66.8 34.6-67.6 104.9-114 185.8-114 47.9 0 92 15.6 127.7 41.9C579 469.7 544 430.8 497.6 405c68-22.6 144.1-13.6 204.3 27 28.5 19.2 52.8 44.4 71.4 73.9 14.2-31.5 19.2-66.9 13.8-102-14.7-94.4-87.3-172.3-182.8-192.5-35-7.4-71.1-6.1-104.6 2.5 59.8-37.4 133.5-56.1 210.4-50 119.8 9.5 224.2 78.4 278.3 182.2l20.4-18.4 34.5 29.8-38.3 47c32.8 55.4 51.5 120.3 51.5 189.1 0 120.3-54.8 227.6-140.7 298.5l14.7 40.5-44.5 25.1-37.7-61z"/>
    <path fill="currentColor" d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm372.7 751.5l37.7 61 44.5-25.1-14.7-40.5C808 676 862.8 568.7 862.8 448.4c0-68.8-18.7-133.7-51.5-189.1l38.3-47-34.5-29.8-20.4 18.4C740.6 97.1 636.2 28.2 516.4 18.7c-76.9-6.1-150.6 12.6-210.4 50 33.5-8.6 69.6-9.9 104.6-2.5 95.5 20.2 168.1 98.1 182.8 192.5 5.4 35.1.4 70.5-13.8 102-18.6-29.5-42.9-54.7-71.4-73.9-60.2-40.6-136.3-49.6-204.3-27 46.4 25.8 81.4 64.7 97 125.6-35.7-26.3-79.8-41.9-127.7-41.9-80.9 0-151.2 46.4-185.8 114-35-15.8-65.8-38.8-88.6-66.8 50 99.3 152.9 167.3 271.7 167.3 47.5 0 92.4-11 132.8-30.3-58.6 40.7-129.1 64.4-205 64.4-100.9 0-191.6-40.2-255.4-102.3 58.9 142.8 198.4 241.1 375.4 241.1 62.4 0 117.9-11 166.3-29.5l34.8 56.6 44.5-25.1-14.7-40.5c86.4-69.4 141.4-175.7 141.4-295 0-66.2-17.1-128.5-47-182.5z"/>
    <circle fill="currentColor" cx="682.6" cy="384" r="34.1"/>
  </svg>
);

const MetaLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fill="currentColor" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973.14.604.375 1.171.72 1.627.735.934 1.909 1.481 3.708 1.481 1.49 0 2.592-.568 3.536-1.535.56-.578 1.04-1.26 1.526-1.984l.907-1.403.543-.84.091.138.773 1.17c.92 1.39 1.84 2.675 3.2 3.41 1.04.56 2.21.84 3.52.84 2.296 0 4.005-.94 5.022-2.576.664-1.045.996-2.34.996-3.84 0-1.943-.415-4.083-1.497-5.857C22.055 5.03 20.527 4 18.588 4c-1.345 0-2.437.547-3.252 1.364-.574.578-1.017 1.29-1.437 2.015l-.467.816-.434-.826C12.127 5.605 11.02 4.03 8.79 4.03c-.642 0-1.302.13-1.875.4zm6.951 11.474l-.008-.014-.077.12c-.494.761-.996 1.547-1.5 2.144-.5.59-1.064 1.152-1.81 1.52-.745.367-1.61.553-2.694.553-1.255 0-2.124-.406-2.73-1.15-.3-.376-.524-.844-.647-1.39-.124-.546-.19-1.145-.19-1.78 0-2.268.575-4.624 1.59-6.16.844-1.313 1.957-2.12 3.15-2.12 1.59 0 2.487 1.278 3.265 2.652.43.757.833 1.6 1.227 2.42l.348.73.077-.16zm5.773 1.014c-.652 1.023-1.75 1.56-3.17 1.56-1.02 0-1.886-.22-2.616-.631-1.075-.603-1.847-1.62-2.645-2.883l-.097-.148.07-.105.502-.772c.443-.681.884-1.37 1.33-1.947.574-.737 1.123-1.414 1.672-1.755.55-.34 1.106-.493 1.78-.493.977 0 1.9.477 2.647 1.382.742.9 1.22 2.144 1.466 3.455.122.66.183 1.31.183 1.917 0 .742-.1 1.44-.12 1.4z" />
  </svg>
);

const GrokLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path fill="currentColor" d="M14.28 2.62a10.05 10.05 0 0 0-4.07-.62C4.57 2 0 6.57 0 12.2c0 2.21.71 4.25 1.9 5.92l10.4-10.4c.3-.3.79-.3 1.09 0 .3.3.3.79 0 1.09L3 19.16a10.15 10.15 0 0 0 7.21 3.04c5.64 0 10.21-4.57 10.21-10.2 0-2.22-.72-4.26-1.9-5.93L8.1 16.48a.77.77 0 0 1-1.09-1.09l10.41-10.4c-.87-.93-1.94-1.68-3.14-2.17z"/>
  </svg>
);

const PerplexityLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path fill="currentColor" fillRule="evenodd" d="M8 .188a.5.5 0 0 1 .503.5V4.03l3.022-2.92.059-.048a.51.51 0 0 1 .49-.054.5.5 0 0 1 .306.46v3.247h1.117l.1.01a.5.5 0 0 1 .403.49v5.558a.5.5 0 0 1-.503.5H12.38v3.31a.5.5 0 0 1-.986.117l-.004-.042V11.968l-3.045 2.946-.06.049a.5.5 0 0 1-.486.054.5.5 0 0 1-.303-.456v-3.233H6.38l-.1-.01a.5.5 0 0 1-.404-.49V5.267a.5.5 0 0 1 .504-.5h1.12V1.442a.5.5 0 0 1 .488-.5h.013Zm-.497 5.58v4.698h4.374V5.768H7.503Zm.993 4.694v3.136l2.186-2.115v-1.02h-2.186Zm0-4.694H10.68V2.637L8.496 4.748v1.02Zm-1.996.002H4.316v1.02l2.184 2.112v-3.132Zm0 4.69H4.316l2.184 2.114V9.458H6.5Z"/>
  </svg>
);

// ─── AI CONFIG ─────────────────────────────────────────────────────────────────

export const AI_CONFIG = [
  { name: 'ChatGPT',    model: 'GPT-4o',           Logo: ChatGPTLogo,    bgColor: '#10a37f15', iconColor: '#10a37f' },
  { name: 'Gemini',     model: 'Gemini 2.5 Flash', Logo: GeminiLogo,     bgColor: '#4285f415', iconColor: '#4285f4' }, 
  { name: 'Claude',     model: 'Claude Sonnet 4',  Logo: ClaudeLogo,     bgColor: '#d9775715', iconColor: '#d97757' },
  { name: 'DeepSeek',   model: 'DeepSeek V3',      Logo: DeepSeekLogo,   bgColor: '#4d6ef515', iconColor: '#4d6ef5' },
  { name: 'Meta AI',    model: 'Llama 3',          Logo: MetaLogo,       bgColor: '#0866ff15', iconColor: '#0866ff' },
  { name: 'Grok',       model: 'Grok-2',           Logo: GrokLogo,       bgColor: '#ffffff15', iconColor: '#ffffff' },
  { name: 'Perplexity', model: 'Sonar Pro',        Logo: PerplexityLogo, bgColor: '#20b8cd15', iconColor: '#20b8cd' }, 
];

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface AddAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroupParticipants: GroupParticipant[];
  onAddParticipant: (p: GroupParticipant) => void;
  onRemoveParticipant: (id: string) => void;
  showToast: (msg: string) => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export const AddAIModal: React.FC<AddAIModalProps> = ({
  isOpen,
  onClose,
  activeGroupParticipants,
  onAddParticipant,
  onRemoveParticipant,
  showToast,
}) => {
  const handleAdd = (ai: typeof AI_CONFIG[number]) => {
    onAddParticipant({
      id: `ai-${ai.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: ai.name,
      isAI: true,
      model: ai.model,
      avatar: ai.name[0],
    });
    showToast(`${ai.name} bergabung ke grup!`);
  };

  const handleRemove = (ai: typeof AI_CONFIG[number]) => {
    const id = `ai-${ai.name.toLowerCase().replace(/\s+/g, '-')}`;
    onRemoveParticipant(id);
    showToast(`${ai.name} dikeluarkan dari grup`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
          />

          {/* Wrapper Flexbox untuk center modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-4">
            
            {/* Modal Box */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto bg-[var(--bg)] border border-[var(--bd)] flex flex-col overflow-hidden shadow-2xl w-full max-w-[380px] max-h-[440px] rounded-[24px]"
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

              {/* Scrollable list */}
              <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2" style={{ scrollbarWidth: 'none' }}>
                {AI_CONFIG.map((ai) => {
                  const isAdded = activeGroupParticipants.some((p) => p.name === ai.name);

                  return (
                    <div
                      key={ai.name}
                      className={cn(
                        "flex items-center gap-3.5 p-3 rounded-[16px] border transition-all",
                        isAdded ? "bg-[var(--sf)] border-[var(--bd)]" : "bg-transparent border-transparent hover:bg-[var(--sf)]/50"
                      )}
                    >
                      {/* Icon AI */}
                      <div
                        className="w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0"
                        style={{ background: ai.bgColor, color: ai.iconColor }}
                      >
                        <ai.Logo size={24} />
                      </div>

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

                      {/* Tombol Aksi */}
                      {isAdded ? (
                        <button
                          onClick={() => handleRemove(ai)}
                          title="Keluarkan dari grup"
                          className="w-9 h-9 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 hover:bg-red-500/20 active:scale-95 transition-all [-webkit-tap-highlight-color:transparent]"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAdd(ai)}
                          title="Tambah ke grup"
                          className="w-9 h-9 rounded-full bg-[var(--text)]/5 text-[var(--text)] flex items-center justify-center shrink-0 hover:bg-[var(--text)]/10 active:scale-95 transition-all [-webkit-tap-highlight-color:transparent]"
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
