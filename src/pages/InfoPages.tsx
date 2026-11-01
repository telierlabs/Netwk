import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../lib/i18n';

interface InfoPageProps {
  onBack: () => void;
}

type Section = { heading?: string; body: string };

// ─────────────────────────────────────────────
// ISI TEKS — GANTI DENGAN TEKS ASLI DARI cylenai.com
// Tiap objek = 1 paragraf (heading opsional)
// ─────────────────────────────────────────────
const PRIVACY: Record<string, { title: string; updated: string; sections: Section[] }> = {
  id: {
    title: 'Kebijakan Privasi',
    updated: 'Terakhir diperbarui: ISI_TANGGAL',
    sections: [
      { heading: 'Data yang kami kumpulkan', body: 'ISI_TEKS_DARI_WEBSITE' },
      { heading: 'Cara kami menggunakan data', body: 'ISI_TEKS_DARI_WEBSITE' },
      { heading: 'Penyimpanan & keamanan', body: 'ISI_TEKS_DARI_WEBSITE' },
      { heading: 'Hak kamu', body: 'ISI_TEKS_DARI_WEBSITE' },
      { heading: 'Kontak', body: 'ISI_TEKS_DARI_WEBSITE' },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: FILL_DATE',
    sections: [
      { heading: 'Data we collect', body: 'FILL_TEXT_FROM_WEBSITE' },
      { heading: 'How we use data', body: 'FILL_TEXT_FROM_WEBSITE' },
      { heading: 'Storage & security', body: 'FILL_TEXT_FROM_WEBSITE' },
      { heading: 'Your rights', body: 'FILL_TEXT_FROM_WEBSITE' },
      { heading: 'Contact', body: 'FILL_TEXT_FROM_WEBSITE' },
    ],
  },
};

const ABOUT: Record<string, { title: string; sections: Section[]; version: string }> = {
  id: {
    title: 'Tentang Cylen',
    version: 'Versi',
    sections: [
      { body: 'ISI_TEKS_DARI_WEBSITE' },
      { heading: 'Misi kami', body: 'ISI_TEKS_DARI_WEBSITE' },
    ],
  },
  en: {
    title: 'About Cylen',
    version: 'Version',
    sections: [
      { body: 'FILL_TEXT_FROM_WEBSITE' },
      { heading: 'Our mission', body: 'FILL_TEXT_FROM_WEBSITE' },
    ],
  },
};

// ─────────────────────────────────────────────
// KERANGKA HALAMAN (dipakai bareng)
// ─────────────────────────────────────────────
const PageShell: React.FC<{ title: string; onBack: () => void; children: React.ReactNode }> = ({ title, onBack, children }) => (
  <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)] relative z-50" style={{ minHeight: 0 }}>
    <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b border-[var(--bd)]">
      <button onClick={onBack} className="p-2 -ml-2 rounded-full text-[var(--text)] active:scale-95 transition-transform">
        <ArrowLeft size={22} />
      </button>
      <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">{title}</h1>
    </div>
    <div className="flex-1 overflow-y-auto" style={{ minHeight: 0, scrollbarWidth: 'none' }}>
      <div className="max-w-2xl mx-auto px-6 py-6 pb-16">{children}</div>
    </div>
  </main>
);

const Block: React.FC<{ s: Section }> = ({ s }) => (
  <section className="mb-6">
    {s.heading && <h2 className="text-[16px] font-bold text-[var(--text)] mb-2">{s.heading}</h2>}
    <p className="text-[15px] leading-relaxed text-[var(--text)] opacity-80 whitespace-pre-line">{s.body}</p>
  </section>
);

// ─────────────────────────────────────────────
// HALAMAN
// ─────────────────────────────────────────────
export const PrivacyPage: React.FC<InfoPageProps> = ({ onBack }) => {
  const { lang } = useT();
  const c = PRIVACY[lang] || PRIVACY.id;
  return (
    <PageShell title={c.title} onBack={onBack}>
      <p className="text-[13px] text-[var(--mu)] mb-6">{c.updated}</p>
      {c.sections.map((s, i) => <Block key={i} s={s} />)}
    </PageShell>
  );
};

export const AboutPage: React.FC<InfoPageProps> = ({ onBack }) => {
  const { lang } = useT();
  const c = ABOUT[lang] || ABOUT.id;
  return (
    <PageShell title={c.title} onBack={onBack}>
      {c.sections.map((s, i) => <Block key={i} s={s} />)}
      <p className="text-[13px] text-[var(--mu)] mt-8">{c.version}: Cylen v1</p>
    </PageShell>
  );
};
