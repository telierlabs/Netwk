import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { useT, translate } from '../lib/i18n';
import type { Lang } from '../lib/i18n';
// Daftar bahasa + logika ganti bahasa ada di lib/languages.ts (dipisah dari ProfilePage)
import { LANGUAGES, changeLanguage } from '../lib/languages';

// Satu blok terpotong-potong (sama seperti menu di sidebar & halaman profil)
const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';

export const LanguagePage = ({ onBack, showToast }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const { updateProfile } = useProfile();
  const { t, lang } = useT();
  const [busy, setBusy] = useState(false);

  const handleSelect = async (code: Lang, name: string) => {
    if (busy || code === lang) return;
    setBusy(true);
    const res = await changeLanguage({ code, currentLang: lang, updateProfile });
    setBusy(false);
    if (!res.changed) return;
    showToast?.(res.ok ? translate(code, 'toastLangChanged', { name }) : t('toastLangSaveFailed'));
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-in fade-in duration-200">
      <header
        className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--text)]/10 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{t('language')}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-2 pb-10">
          <div className="px-6 mt-2 mb-2 text-[15px] font-medium text-[var(--mu)]">{t('chooseLanguage')}</div>
          <div className="mx-3 flex flex-col gap-[2px]">
            {LANGUAGES.map((l, i) => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code, l.name)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 text-left text-[var(--text)] bg-[var(--text)]/5 transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--text)]/10",
                    blockRadius(i, LANGUAGES.length)
                  )}
                >
                  <span className="text-[24px] w-6 text-center flex-shrink-0">{l.flag}</span>
                  <span className="flex-1 min-w-0 text-[17px] font-semibold truncate">{l.name}</span>
                  {active && <Check size={22} strokeWidth={2.5} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
