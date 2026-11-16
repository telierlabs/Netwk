import React from 'react';

// ─────────────────────────────────────────────
// IKON HALAMAN PROFIL (bentuk mengikuti ikon Grok, ukuran bawaan 24) + gambar logo Cylen ber-warna tema
// ─────────────────────────────────────────────
type P = { size?: number };
const svgProps = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

// Tampilan: cincin dengan setengah lingkaran terisi di dalamnya
export const IconAppearance = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5a4.5 4.5 0 0 0 0 9z" fill="currentColor" />
  </svg>
);

// Getaran: ponsel dengan tanda getar di kiri-kanan
export const IconHaptics = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="7.5" y="3" width="9" height="18" rx="2.5" />
    <path d="M4.2 9v6" /><path d="M1.8 10.5v3" />
    <path d="M19.8 9v6" /><path d="M22.2 10.5v3" />
  </svg>
);

// Penggunaan: tiga batang
export const IconUsage = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <path d="M5 20v-8" /><path d="M12 20V4" /><path d="M19 20v-5" />
  </svg>
);

// Suara: gelombang audio
export const IconVoice = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <path d="M3 10v4" /><path d="M7.5 6v12" /><path d="M12 3v18" /><path d="M16.5 7v10" /><path d="M21 10v4" />
  </svg>
);

// Mode Anak: bintang membulat dengan wajah (mata + senyum)
export const IconKids = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.15L12 16.9l-5.5 2.9 1.05-6.15L3.1 9.3l6.15-.9z" />
    <circle cx="9.9" cy="11.6" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="14.1" cy="11.6" r="1.05" fill="currentColor" stroke="none" />
    <path d="M10.4 14.3c1 .75 2.2.75 3.2 0" />
  </svg>
);

// Kustomisasi: dua slider
export const IconCustomize = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <circle cx="6.5" cy="7" r="2.6" /><path d="M11.6 7h9.9" />
    <path d="M2.5 17h9.9" /><circle cx="17.5" cy="17" r="2.6" />
  </svg>
);

// Connectors: kotak-kotak + satu kotak miring (seperti ikon Connectors di Grok)
export const IconBlocks = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    <path d="M17.25 2.4l4.35 4.35-4.35 4.35-4.35-4.35z" />
  </svg>
);

// Kebijakan Privasi: gembok
export const IconPrivacy = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 15.5h.01" />
  </svg>
);

// Laporkan Masalah: pelampung
export const IconReport = ({ size = 24 }: P) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <path d="M4.93 4.93l4.24 4.24" /><path d="M14.83 14.83l4.24 4.24" />
    <path d="M14.83 9.17l4.24-4.24" /><path d="M4.93 19.07l4.24-4.24" />
  </svg>
);

// Logo / tulisan Cylen (file di folder public). Diwarnai lewat CSS mask → otomatis ngikut tema.
export const MaskImg: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => (
  <div
    role="img"
    aria-label="Cylen"
    style={{
      width,
      height,
      flexShrink: 0,
      backgroundColor: 'var(--text)',
      WebkitMaskImage: `url(${src})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url(${src})`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);
