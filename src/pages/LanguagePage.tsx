import React, { useCallback, useMemo, useState, memo } from 'react';
import { ArrowLeft, Check, Search, X } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { useT, translate } from '../lib/i18n';
import {
  LANGUAGES_SORTED, getLanguage, searchLanguages, detectDeviceLanguage, changeLanguage,
} from '../lib/languages';
import type { LanguageInfo } from '../lib/languages';
import { MaskImg } from '../components/profile/ProfileIcons';

const LOGO_SRC = '/82374-removebg-preview.png';
const WORDMARK_SRC = '/104076-removebg-preview.png';

const TEXT: Record<string, Record<string, string>> = {
  id: {
    title: 'Bahasa aplikasi', placeholder: 'Cari bahasa', suggested: 'Disarankan', device: 'Bahasa perangkat',
    all: 'Semua bahasa', results: 'Hasil', empty: 'Bahasa tidak ditemukan', back: 'Kembali', clear: 'Hapus',
    note: 'Antarmuka Cylen tersedia dalam Bahasa Indonesia dan English. Bahasa lain tetap disimpan, terjemahan antarmukanya menyusul.',
  },
  en: {
    title: 'App language', placeholder: 'Search language', suggested: 'Suggested', device: 'Device language',
    all: 'All languages', results: 'Results', empty: 'No language found', back: 'Back', clear: 'Clear',
    note: 'The Cylen interface is available in Bahasa Indonesia and English. Other languages are saved and interface translations are coming.',
  },
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="px-6 pt-6 pb-1 text-[15px] font-medium text-[var(--mu)]">{children}</div>
);

// Baris di atas latar halaman: saat ditekan jadi warna permukaan (--sf)
const Row = memo(({ l, active, onPick }: { l: LanguageInfo; active: boolean; onPick: (l: LanguageInfo) => void }) => (
  <button
    onClick={() => onPick(l)}
    // baris di luar layar nggak dihitung/digambar → 50 bahasa tetap ringan
    style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 64px' }}
    className="w-full flex items-center gap-4 px-6 py-4 text-left text-[var(--text)] active:bg-[var(--sf)] transition-colors"
  >
    <div className="flex-1 min-w-0">
      <div className="text-[17px] truncate">{l.name}</div>
      {l.english !== l.name && <div className="text-[14px] text-[var(--mu)] truncate">{l.english}</div>}
    </div>
    {active && <Check size={22} strokeWidth={2.5} className="flex-shrink-0" />}
  </button>
));

export const LanguagePage = ({ onBack, showToast }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const { profile, updateProfile } = useProfile();
  const { t, lang } = useT();
  const tx = TEXT[lang] || TEXT.id;
  const current: string = profile.lang || 'id';
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const q = query.trim();
  const results = useMemo(() => (q ? searchLanguages(q) : null), [q]);

  // "Disarankan": bahasa yang dipakai sekarang + bahasa perangkat (kalau beda)
  const suggested = useMemo(() => {
    const list: { l: LanguageInfo; sub?: string }[] = [{ l: getLanguage(current) }];
    const dev = detectDeviceLanguage();
    if (dev && dev.code !== current) list.push({ l: dev, sub: tx.device });
    return list;
  }, [current, tx.device]);

  const handlePick = useCallback(async (l: LanguageInfo) => {
    if (busy || l.code === current) return;
    setBusy(true);
    const res = await changeLanguage({ code: l.code, currentLang: current, updateProfile });
    setBusy(false);
    if (!res.changed) return;
    // Bahasa yang antarmukanya belum ada → pesan toast pakai bahasa antarmuka yang sedang aktif
    showToast?.(res.ok ? translate(l.ui ? l.code : lang, 'toastLangChanged', { name: l.name }) : t('toastLangSaveFailed'));
  }, [busy, current, updateProfile, showToast, lang, t]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-in fade-in duration-200">
      <header className="flex items-center px-4 pb-1 flex-shrink-0" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}>
        <button
          onClick={onBack}
          aria-label={tx.back}
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pb-12">
          <h1 className="px-6 pt-2 text-[34px] leading-tight font-semibold tracking-tight text-[var(--text)]">{tx.title}</h1>

          {/* --- KARTU LOGO CYLEN --- */}
          <div className="mx-3 mt-5 rounded-[28px] bg-[var(--sf)] py-6 flex flex-col items-center gap-3">
            <MaskImg src={LOGO_SRC} width={56} height={56} />
            <MaskImg src={WORDMARK_SRC} width={118} height={27} />
          </div>

          {/* --- PIL PENCARIAN --- */}
          <div className="mx-3 mt-3 flex items-center gap-3 h-[52px] rounded-full bg-[var(--sf)] px-5">
            <Search size={20} className="text-[var(--mu)] flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tx.placeholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[var(--text)] placeholder:text-[var(--mu)]"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label={tx.clear} className="p-1 -mr-2 rounded-full text-[var(--mu)] active:bg-[var(--ib)]">
                <X size={18} />
              </button>
            )}
          </div>

          {!q && <p className="px-6 mt-3 text-[13px] leading-relaxed text-[var(--mu)]">{tx.note}</p>}

          {results ? (
            <>
              <Label>{tx.results}</Label>
              {results.length === 0 && <div className="px-6 py-6 text-[16px] text-[var(--mu)]">{tx.empty}</div>}
              {results.map((l) => <Row key={l.code} l={l} active={l.code === current} onPick={handlePick} />)}
            </>
          ) : (
            <>
              <Label>{tx.suggested}</Label>
              {suggested.map(({ l }) => <Row key={'s-' + l.code} l={l} active={l.code === current} onPick={handlePick} />)}
              <Label>{tx.all}</Label>
              {LANGUAGES_SORTED.map((l) => <Row key={l.code} l={l} active={l.code === current} onPick={handlePick} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
