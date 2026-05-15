import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GroupParticipant } from '../../types';

// ─── AI BRAND LOGOS ────────────────────────────────────────────────────────────

const ChatGPTLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
    <path d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.505-3.36 10.079 10.079 0 00-9.612 6.977 9.967 9.967 0 00-6.664 4.834 10.08 10.08 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.36 10.079 10.079 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.814zm-22.023 22.979a7.474 7.474 0 01-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 00.655-1.134V19.054l3.366 1.944a.12.12 0 01.066.092v9.299a7.505 7.505 0 01-7.49 7.496zM6.392 31.006a7.471 7.471 0 01-.894-5.023c.06.036.162.099.237.141l7.964 4.6a1.297 1.297 0 001.308 0l9.724-5.614v3.888a.12.12 0 01-.048.103L16.69 34.54a7.505 7.505 0 01-10.297-3.534zm-2.095-17.386A7.469 7.469 0 018.2 10.333c0 .068-.004.19-.004.274v9.201a1.294 1.294 0 00.654 1.132l9.723 5.614-3.366 1.944a.12.12 0 01-.114.012L7.044 23.86a7.504 7.504 0 01-2.747-10.24zm27.658 6.437l-9.724-5.615 3.367-1.943a.121.121 0 01.114-.012l8.048 4.648a7.498 7.498 0 01-1.158 13.528v-9.476a1.293 1.293 0 00-.647-1.13zm3.35-5.043c-.059-.037-.162-.099-.236-.141l-7.965-4.6a1.298 1.298 0 00-1.308 0l-9.723 5.614v-3.888a.12.12 0 01.048-.103l8.048-4.645a7.497 7.497 0 0111.135 7.763zm-21.063 6.929l-3.367-1.944a.12.12 0 01-.065-.092v-9.299a7.497 7.497 0 0112.293-5.756 6.94 6.94 0 00-.236.134l-7.965 4.6a1.294 1.294 0 00-.654 1.132l-.006 11.225zm1.829-3.943l4.33-2.501 4.332 2.5v4.999l-4.331 2.5-4.331-2.5V18z" fill="currentColor" />
  </svg>
);

const GeminiLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" fill="currentColor" />
  </svg>
);

const ClaudeLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-1.227-.072-.424-.048C2.045 12.613 2 12.268 2 12c0-.268.045-.612.722-.612l.424-.049 1.227-.072 2.34-.097 2.697-.073.79-.048h.23l.08-.128-.08-.23-4.72-2.647-.906-.561-.424-.292-.35-.292-.277-.316-.12-.34c0-.39.266-.71.519-.877l.37-.195.4-.073.444.097.35.195.35.268 3.262 3.044.693.634.146.17.169-.024.097-.146V9.33l.072-1.756.121-2.647.073-1.66.048-.804.049-.39C7.844 2.36 8.127 2 8.89 2c.688 0 .97.36 1.068.974l.048.389.048.804.073 1.66.121 2.648.073 1.755v.34l.097.147.169.024.146-.17.693-.634 3.261-3.044.35-.268.35-.195.445-.097.4.073.37.195c.253.167.518.486.518.877l-.12.34-.276.316-.35.292-.424.292-.907.56-4.72 2.648-.08.23.08.127h.23l.79.049 2.698.073 2.34.097 1.226.072.424.048c.677 0 .722.344.722.612 0 .268-.045.612-.722.612l-.424.049-1.227.072-2.339.097-2.698.073-.79.048h-.23l-.08.128.08.23 4.72 2.647.906.561.424.292.35.292.277.316.12.34c0 .39-.265.71-.518.877l-.37.195-.4.073-.445-.097-.35-.195-.35-.268-3.261-3.044-.693-.634-.146-.17-.17.024-.096.146v.341l-.073 1.755-.121 2.648-.073 1.659-.048.804-.048.39c-.097.613-.38.974-1.068.974-.762 0-1.046-.36-1.116-.974l-.048-.389-.049-.804-.072-1.66-.121-2.647-.073-1.755v-.341l-.097-.146-.169-.024-.146.17-.693.634-3.261 3.044-.35.268-.35.195-.445.097-.4-.073-.37-.195c-.252-.167-.518-.486-.518-.877l.12-.34.277-.316.35-.292.424-.292.906-.56z" fill="currentColor" />
  </svg>
);

// ─── DEEPSEEK WHALE LOGO (accurate official whale mark) ───────────────────────
const DeepSeekLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {/* Body */}
    <ellipse cx="50" cy="55" rx="32" ry="22" fill="currentColor" />
    {/* Head bump */}
    <ellipse cx="68" cy="44" rx="16" ry="13" fill="currentColor" />
    {/* Tail left fluke */}
    <path d="M18 60 Q8 72 14 78 Q20 68 26 65Z" fill="currentColor" />
    {/* Tail right fluke */}
    <path d="M18 60 Q10 50 16 46 Q22 56 26 65Z" fill="currentColor" />
    {/* Fin */}
    <path d="M38 40 Q42 28 52 32 Q46 38 44 44Z" fill="currentColor" />
    {/* Eye white */}
    <circle cx="72" cy="41" r="4" fill="white" />
    {/* Eye pupil */}
    <circle cx="73" cy="41" r="2" fill="#1a1a4e" />
    {/* Smile */}
    <path d="M62 50 Q67 54 74 51" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Blowhole spray */}
    <path d="M60 32 Q62 24 64 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M64 30 Q68 22 72 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const MetaLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973.14.604.375 1.171.72 1.627.735.934 1.909 1.481 3.708 1.481 1.49 0 2.592-.568 3.536-1.535.56-.578 1.04-1.26 1.526-1.984l.907-1.403.543-.84.091.138.773 1.17c.92 1.39 1.84 2.675 3.2 3.41 1.04.56 2.21.84 3.52.84 2.296 0 4.005-.94 5.022-2.576.664-1.045.996-2.34.996-3.84 0-1.943-.415-4.083-1.497-5.857C22.055 5.03 20.527 4 18.588 4c-1.345 0-2.437.547-3.252 1.364-.574.578-1.017 1.29-1.437 2.015l-.467.816-.434-.826C12.127 5.605 11.02 4.03 8.79 4.03c-.642 0-1.302.13-1.875.4zm6.951 11.474l-.008-.014-.077.12c-.494.761-.996 1.547-1.5 2.144-.5.59-1.064 1.152-1.81 1.52-.745.367-1.61.553-2.694.553-1.255 0-2.124-.406-2.73-1.15-.3-.376-.524-.844-.647-1.39-.124-.546-.19-1.145-.19-1.78 0-2.268.575-4.624 1.59-6.16.844-1.313 1.957-2.12 3.15-2.12 1.59 0 2.487 1.278 3.265 2.652.43.757.833 1.6 1.227 2.42l.348.73.077-.16zm5.773 1.014c-.652 1.023-1.75 1.56-3.17 1.56-1.02 0-1.886-.22-2.616-.631-1.075-.603-1.847-1.62-2.645-2.883l-.097-.148.07-.105.502-.772c.443-.681.884-1.37 1.33-1.947.574-.737 1.123-1.414 1.672-1.755.55-.34 1.106-.493 1.78-.493.977 0 1.9.477 2.647 1.382.742.9 1.22 2.144 1.466 3.455.122.66.183 1.31.183 1.917 0 .742-.1 1.44-.12 1.42z" fill="currentColor" />
  </svg>
);

const GrokLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
  </svg>
);

const PerplexityLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L4 7v10l8 5 8-5V7L12 2zm0 2.5l5.5 3.44v.06H13V5.94l-1-.62V8h-4.5V7.94L12 4.5zM6.5 9.5H8V17h1.5V9.5H13V17h1.5V9.5h1.5l.5.31V16.5L12 19.5l-5.5-3V9.81l.5-.31z" fill="currentColor" />
  </svg>
);

// ─── AI CONFIG ─────────────────────────────────────────────────────────────────

export const AI_CONFIG = [
  { name: 'ChatGPT',    model: 'GPT-4o',           Logo: ChatGPTLogo,    bgColor: '#e8faf4', iconColor: '#10a37f' },
  { name: 'Gemini',     model: 'Gemini 2.5 Flash', Logo: GeminiLogo,     bgColor: '#eaedff', iconColor: '#4285f4' },
  { name: 'Claude',     model: 'Claude Sonnet 4',  Logo: ClaudeLogo,     bgColor: '#fdf0ea', iconColor: '#cc785c' },
  { name: 'DeepSeek',   model: 'DeepSeek V3',      Logo: DeepSeekLogo,   bgColor: '#eaedff', iconColor: '#4d6ef5' },
  { name: 'Meta AI',    model: 'Llama 3',          Logo: MetaLogo,       bgColor: '#eaf0ff', iconColor: '#0866ff' },
  { name: 'Grok',       model: 'Grok-2',           Logo: GrokLogo,       bgColor: '#f0f0f0', iconColor: '#111111' },
  { name: 'Perplexity', model: 'Sonar Pro',        Logo: PerplexityLogo, bgColor: '#e8f9fb', iconColor: '#20b8cd' },
];

// ─── TYPES ─────────────────────────────────────────────────────────────────────

interface AddAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroupParticipants: GroupParticipant[];
  onAddParticipant: (p: GroupParticipant) => void;
  onRemoveParticipant: (id: string) => void; // ← NEW: untuk keluarkan AI
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
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/50"
          />

          {/* Modal — lebih kecil, sharp corners */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[201] bg-white"
            style={{
              bottom: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '82%',
              maxWidth: '320px',
              maxHeight: '62vh',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1.5px solid rgba(0,0,0,0.08)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 14px 10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                borderBottom: '1.5px solid rgba(0,0,0,0.07)',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>
                  Kelola AI
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  Tambah atau keluarkan AI dari grup
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#555',
                  flexShrink: 0,
                }}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable list */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {AI_CONFIG.map((ai) => {
                const isAdded = activeGroupParticipants.some((p) => p.name === ai.name);

                return (
                  <div
                    key={ai.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 8px',
                      borderRadius: 10,
                      background: isAdded ? 'rgba(0,0,0,0.025)' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* Icon — sharp square */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8, // sharp, bukan smooth
                        background: ai.bgColor,
                        color: ai.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `1.5px solid ${ai.iconColor}22`,
                      }}
                    >
                      <ai.Logo size={18} />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.3 }}>
                        {ai.name}
                        {isAdded && (
                          <span style={{
                            marginLeft: 6,
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#22c55e',
                            background: '#dcfce7',
                            borderRadius: 4,
                            padding: '1px 5px',
                            letterSpacing: 0.3,
                          }}>
                            AKTIF
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 1 }}>
                        {ai.model}
                      </div>
                    </div>

                    {/* Action button: + tambah atau − keluarkan */}
                    {isAdded ? (
                      // Tombol KELUARKAN (minus, merah)
                      <button
                        onClick={() => handleRemove(ai)}
                        title="Keluarkan dari grup"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1.5px solid #fca5a5',
                          background: '#fef2f2',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.12s, transform 0.1s',
                        }}
                        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>
                    ) : (
                      // Tombol TAMBAH (plus, hijau)
                      <button
                        onClick={() => handleAdd(ai)}
                        title="Tambah ke grup"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1.5px solid #86efac',
                          background: '#f0fdf4',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.12s, transform 0.1s',
                        }}
                        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
