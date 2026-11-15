import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import type { Lang } from '../../lib/i18n';
import { LANGUAGES } from '../../lib/languages';

// ─────────────────────────────────────────────
// POPUP PILIH BAHASA (dipisah dari ProfilePage)
// Kalau nanti kamu bikin halaman bahasa khusus, file ini tinggal dilepas dari ProfilePage.
// ─────────────────────────────────────────────
export const LanguageSheet = memo(({ open, current, onSelect, onClose, title, cancelLabel }: {
  open: boolean;
  current: Lang;
  onSelect: (code: Lang, name: string) => void;
  onClose: () => void;
  title: string;
  cancelLabel: string;
}) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="lang-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[200]"
          />
          <motion.div
            key="lang-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform' }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[32px] z-[201] p-6 border-t border-[var(--bd)] max-w-2xl mx-auto"
          >
            <div className="w-12 h-1.5 bg-[var(--bd)] rounded-full mx-auto mb-6" />
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-[var(--sf)] flex items-center justify-center text-[var(--text)] border border-[var(--bd)]"><Globe size={20} /></div>
              <h3 className="text-[20px] font-bold text-[var(--text)] tracking-tight">{title}</h3>
            </div>
            <div className="flex flex-col gap-2 pb-4">
              {LANGUAGES.map((l) => {
                const active = current === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => onSelect(l.code, l.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-5 py-4 rounded-2xl active:scale-[0.98] transition-transform",
                      active ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--sf)] text-[var(--text)] border border-[var(--bd)]"
                    )}
                  >
                    <div className="flex items-center gap-4"><span className="text-[22px]">{l.flag}</span><span className="font-bold text-[16px]">{l.name}</span></div>
                    {active && <Check size={20} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <button onClick={onClose} className="w-full mt-2 py-4 text-[var(--text)]/60 font-bold rounded-2xl text-[16px] active:bg-[var(--sf)]">{cancelLabel}</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});
