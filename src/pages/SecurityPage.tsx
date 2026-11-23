import React from 'react';
import { ArrowLeft, KeyRound, ShieldCheck, Smartphone, ExternalLink } from 'lucide-react';
import { auth } from '../lib/firebase';
import { usePageText } from '../lib/i18n';

const TEXT = {
  id: { title: 'Keamanan Akun', signedWith: 'Masuk dengan', info: 'Akun Cylen terhubung ke akun Google kamu, jadi kata sandi dan verifikasi 2 langkah diatur langsung di Google.', pwTitle: 'Ubah Kata Sandi', pwDesc: 'Diatur di akun Google', twoTitle: 'Verifikasi 2 Langkah', twoDesc: 'Aktifkan atau cek di akun Google', devTitle: 'Perangkat & Aktivitas Masuk', devDesc: 'Lihat perangkat yang terhubung' },
  en: { title: 'Account Security', signedWith: 'Signed in with', info: 'Your Cylen account is linked to your Google account, so your password and 2-step verification are managed directly in Google.', pwTitle: 'Change Password', pwDesc: 'Managed in your Google account', twoTitle: '2-Step Verification', twoDesc: 'Turn on or check in your Google account', devTitle: 'Devices & Sign-in Activity', devDesc: 'See connected devices' },
};

// Cylen login lewat Google, jadi password & 2FA diatur di akun Google (bukan di Cylen).
const GOOGLE_LINKS = {
  password: 'https://myaccount.google.com/signinoptions/password',
  twoStep: 'https://myaccount.google.com/signinoptions/twosv',
  devices: 'https://myaccount.google.com/device-activity',
};

const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

const LinkRow = ({ icon, title, desc, url }: { icon: React.ReactNode; title: string; desc: string; url: string }) => (
  <button
    onClick={() => openLink(url)}
    className="flex items-center gap-4 p-5 bg-[var(--sf)] border border-[var(--bd)]/30 rounded-[20px] text-left hover:opacity-80 transition-opacity active:scale-[0.98]"
  >
    <div className="text-[var(--text)] flex-shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="font-bold text-[15px] text-[var(--text)]">{title}</div>
      <div className="text-xs text-[var(--mu)] mt-1 font-medium">{desc}</div>
    </div>
    <ExternalLink size={16} className="text-[var(--mu)] opacity-60 flex-shrink-0" />
  </button>
);

export const SecurityPage = ({ onBack }: { onBack: () => void; showToast?: (msg: string) => void }) => {
  const tx = usePageText('security', TEXT);
  const user = auth?.currentUser;
  const providerId = user?.providerData?.[0]?.providerId;
  const providerName = !providerId || providerId === 'google.com' ? 'Google' : providerId;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-12">
      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)]/10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
        <h1 className="font-bold text-[18px] text-[var(--text)] tracking-tight">{tx.title}</h1>
      </header>

      <div className="p-6 pt-6 flex flex-col gap-3">
        {/* Info akun yang sedang dipakai */}
        <div className="p-5 bg-[var(--sf)] border border-[var(--bd)]/30 rounded-[20px]">
          <div className="text-[12px] font-bold text-[var(--mu)] uppercase tracking-widest opacity-70">{tx.signedWith}</div>
          <div className="font-bold text-[16px] text-[var(--text)] mt-1.5">{providerName}</div>
          <div className="text-[14px] text-[var(--mu)] mt-0.5 truncate">{user?.email || '-'}</div>
        </div>

        <p className="text-[13px] text-[var(--mu)] leading-relaxed px-2 font-medium">
          {tx.info}
        </p>

        <LinkRow icon={<KeyRound size={22} />} title={tx.pwTitle} desc={tx.pwDesc} url={GOOGLE_LINKS.password} />
        <LinkRow icon={<ShieldCheck size={22} className="text-green-500" />} title={tx.twoTitle} desc={tx.twoDesc} url={GOOGLE_LINKS.twoStep} />
        <LinkRow icon={<Smartphone size={22} />} title={tx.devTitle} desc={tx.devDesc} url={GOOGLE_LINKS.devices} />
      </div>
    </div>
  );
};
