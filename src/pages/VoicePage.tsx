import React, { useState, memo } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { useT } from '../lib/i18n';
import { VOICES, DEFAULT_VOICE } from '../lib/voices';
import type { VoiceInfo } from '../lib/voices';
import { blockRadius } from '../lib/blockRadius';

const TEXT: Record<string, { title: string; back: string; failed: string }> = {
  id: { title: 'Pustaka Suara', back: 'Kembali', failed: 'Gagal menyimpan suara' },
  en: { title: 'Voice Library', back: 'Back', failed: 'Failed to save voice' },
};

// Bola suara (gaya Grok) — murni CSS, animasinya cuma transform/opacity (ringan di HP)
const ORB_CSS = `
.cy-orb{position:relative;width:250px;height:250px;margin:0 auto;border-radius:9999px;overflow:hidden;
  background:radial-gradient(circle at 38% 28%,#2d2a45 0%,#13101f 42%,#06050b 78%,#000 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14),inset 0 0 44px rgba(130,110,255,.3),inset -16px -20px 54px rgba(255,90,140,.2),0 0 70px rgba(120,100,255,.14);
  animation:cy-orb-breathe 6s ease-in-out infinite;will-change:transform}
.cy-orb.pop{animation:cy-orb-pop .55s cubic-bezier(.2,.8,.2,1),cy-orb-breathe 6s ease-in-out .55s infinite}
.cy-orb-stars{position:absolute;inset:0;opacity:.9;
  background-image:radial-gradient(1.5px 1.5px at 18% 34%,#fff,transparent),radial-gradient(1px 1px at 72% 22%,#fff,transparent),radial-gradient(1.2px 1.2px at 55% 48%,#d4ccff,transparent),radial-gradient(1px 1px at 30% 66%,#fff,transparent),radial-gradient(1.5px 1.5px at 80% 70%,#ffd0e2,transparent),radial-gradient(1px 1px at 44% 82%,#fff,transparent),radial-gradient(1px 1px at 63% 12%,#fff,transparent),radial-gradient(1.2px 1.2px at 12% 58%,#cfeaff,transparent),radial-gradient(1px 1px at 88% 40%,#fff,transparent)}
.cy-orb-streak{position:absolute;left:18%;right:18%;top:-8%;height:62%;border-radius:9999px;filter:blur(10px);
  background:linear-gradient(180deg,rgba(210,195,255,.95),rgba(150,130,255,.45) 55%,transparent);
  animation:cy-orb-drift 7s ease-in-out infinite;will-change:transform}
.cy-orb-streak.b{left:46%;right:12%;top:-4%;height:52%;opacity:.7;background:linear-gradient(180deg,rgba(255,170,210,.9),rgba(255,120,170,.35) 55%,transparent);animation-delay:-3s}
.cy-orb-gloss{position:absolute;inset:0;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.22),transparent 38%)}
@keyframes cy-orb-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
@keyframes cy-orb-pop{0%{transform:scale(1)}40%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes cy-orb-drift{0%,100%{transform:translate3d(-6px,0,0) scaleY(1)}50%{transform:translate3d(8px,8px,0) scaleY(1.08)}}
@media (prefers-reduced-motion:reduce){.cy-orb,.cy-orb-streak{animation:none!important}}
`;

const Orb = ({ pulse }: { pulse: number }) => (
  // key = pulse → animasi "pop" diputar ulang tiap suara dipilih
  <div key={pulse} className={cn('cy-orb', pulse > 0 && 'pop')} aria-hidden="true">
    <div className="cy-orb-stars" />
    <div className="cy-orb-streak" />
    <div className="cy-orb-streak b" />
    <div className="cy-orb-gloss" />
  </div>
);

// Warna baris = permukaan (--sf), saat ditekan = --ib (sama seperti halaman Pengaturan)
const VoiceRow = memo(({ v, desc, active, radius, onPick }: {
  v: VoiceInfo; desc: string; active: boolean; radius: string; onPick: (id: string) => void;
}) => (
  <button
    onClick={() => onPick(v.id)}
    className={cn(
      'w-full flex items-center gap-4 px-5 py-4 text-left text-[var(--text)] bg-[var(--sf)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--ib)]',
      radius
    )}
  >
    <div className="flex-1 min-w-0">
      <div className="text-[18px] font-semibold leading-tight">{v.id}</div>
      <div className="text-[16px] text-[var(--mu)] mt-0.5">{desc}</div>
    </div>
    {active && <Check size={24} strokeWidth={2.5} className="flex-shrink-0" />}
  </button>
));

export const VoicePage = ({ onBack, showToast }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const { profile, updateProfile } = useProfile();
  const { lang } = useT();
  const tx = TEXT[lang] || TEXT.id;
  const selected: string = profile.voice || DEFAULT_VOICE;
  const [pulse, setPulse] = useState(0);

  const handlePick = async (id: string) => {
    setPulse((p) => p + 1);
    if (id === selected) return;
    const ok = await updateProfile({ voice: id });
    if (!ok) showToast?.(tx.failed);
  };

  return (
    // Halaman ini sekarang dipasang di dalam lapisan halaman App.tsx (naik dari bawah / turun saat ditutup).
    // Dulu root-nya `absolute inset-0 z-50 ... animate-in fade-in` sendiri; sekarang cukup mengisi lapisan,
    // jadi geraknya sama persis dengan halaman lain (tanpa fade tambahan di atas gerak naik).
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)]">
      <style>{ORB_CSS}</style>
      <header className="flex items-center gap-4 px-4 pb-3 flex-shrink-0" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}>
        <button
          onClick={onBack}
          aria-label={tx.back}
          className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{tx.title}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-4 pb-12">
          <Orb pulse={pulse} />
          <div className="mx-3 mt-8 flex flex-col gap-[2px]">
            {VOICES.map((v, i) => (
              <VoiceRow
                key={v.id}
                v={v}
                desc={lang === 'en' ? `${v.en}.` : v.idn}
                active={v.id === selected}
                radius={blockRadius(i, VOICES.length)}
                onPick={handlePick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
