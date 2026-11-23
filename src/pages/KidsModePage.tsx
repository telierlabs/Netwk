import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { usePageText } from '../lib/i18n';
import { IconKids } from '../components/profile/ProfileIcons';

const TEXT: Record<string, { title: string; toggle: string; desc: string; points: string[]; back: string; failed: string }> = {
  id: {
    title: 'Mode Anak',
    toggle: 'Aktifkan Mode Anak',
    desc: 'Cylen akan menjawab dengan bahasa yang sederhana dan ramah anak. Berlaku di semua perangkat setelah kamu masuk.',
    points: [
      'Bahasa sederhana, hangat, dan mudah dipahami',
      'Konten dewasa, kekerasan, dan hal berbahaya ditolak dengan lembut',
      'Tidak meminta data pribadi seperti alamat atau nomor telepon',
      'Untuk hal serius, anak diarahkan bicara dengan orang dewasa tepercaya',
    ],
    back: 'Kembali',
    failed: 'Gagal menyimpan pengaturan',
  },
  en: {
    title: 'Kids Mode',
    toggle: 'Enable Kids Mode',
    desc: 'Cylen will answer in simple, kid-friendly language. Applies on all your devices once you sign in.',
    points: [
      'Simple, warm, easy-to-understand language',
      'Adult content, violence, and dangerous topics are gently declined',
      'Never asks for personal info like address or phone number',
      'For serious topics, kids are guided to talk to a trusted adult',
    ],
    back: 'Back',
    failed: 'Failed to save setting',
  },
};

// Saklar gaya Grok. Posisi mati pakai --mu supaya tetap terlihat di atas kartu terang (--sf).
const Switch = ({ on }: { on: boolean }) => (
  <div className={cn('relative w-[58px] h-[34px] rounded-full flex-shrink-0 transition-colors duration-200', on ? 'bg-blue-600' : 'bg-[var(--mu)]')}>
    <div
      className="absolute top-[5px] left-[5px] w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
      style={{ transform: on ? 'translate3d(24px,0,0)' : 'translate3d(0,0,0)' }}
    />
  </div>
);

export const KidsModePage = ({ onBack, showToast }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const { profile, updateProfile } = useProfile();
  const tx = usePageText('kids', TEXT);
  const on = !!profile.kidsMode;
  const [busy, setBusy] = useState(false);

  // updateProfile langsung memperbarui tampilan (optimistic) dan menyalakan/mematikan instruksi anak ke AI
  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await updateProfile({ kidsMode: !on });
    setBusy(false);
    if (!ok) showToast?.(tx.failed);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--bg)] animate-in fade-in duration-200">
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
        <div className="max-w-2xl mx-auto pt-2 pb-12">
          <button
            onClick={handleToggle}
            role="switch"
            aria-checked={on}
            className="mx-3 w-[calc(100%-1.5rem)] flex items-center gap-4 rounded-[28px] bg-[var(--sf)] pl-5 pr-4 py-4 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.985] active:bg-[var(--ib)]"
          >
            <div className="w-6 flex justify-center flex-shrink-0 opacity-90"><IconKids /></div>
            <span className="flex-1 text-[18px] font-semibold">{tx.toggle}</span>
            <Switch on={on} />
          </button>

          <p className="px-6 mt-5 text-[16px] leading-relaxed text-[var(--mu)]">{tx.desc}</p>

          <div className="mx-3 mt-5 rounded-[28px] bg-[var(--sf)] px-5 py-4 flex flex-col gap-3.5">
            {tx.points.map((p) => (
              <div key={p} className="flex items-start gap-3 text-[15px] leading-snug text-[var(--text)]">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--mu)] flex-shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
