import React from 'react';

// ─────────────────────────────────────────────
// IKON HALAMAN PROFIL (bentuk mengikuti ikon Grok) + gambar logo Cylen ber-warna tema
// ─────────────────────────────────────────────
type P = { size?: number };
const svgProps = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

// Tampilan: lingkaran setengah terisi
export const IconAppearance = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg>
);

// Getaran
export const IconHaptics = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M2.5 9v6" /><path d="M21.5 9v6" /><path d="M10.5 18h3" />
  </svg>
);

// Suara: gelombang audio
export const IconVoice = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <path d="M3 10v4" /><path d="M7.5 6.5v11" /><path d="M12 3v18" /><path d="M16.5 7.5v9" /><path d="M21 10v4" />
  </svg>
);

// Mode Anak: bintang membulat dengan wajah
export const IconKids = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.2 6.9 18.9l1-5.7-4.1-4 5.7-.8z" />
    <path d="M10 12h.01" /><path d="M14 12h.01" />
  </svg>
);

// Kustomisasi: dua slider
export const IconCustomize = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <circle cx="6.5" cy="7" r="2.5" /><path d="M11.5 7H21" />
    <path d="M3 17h9.5" /><circle cx="17.5" cy="17" r="2.5" />
  </svg>
);

// Kecerdasan Personal: kotak-kotak (mirip "Connectors")
export const IconBlocks = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" />
    <path d="M17.25 2.5l4.25 4.25-4.25 4.25-4.25-4.25z" />
  </svg>
);

// Kebijakan Privasi: gembok
export const IconPrivacy = ({ size = 22 }: P) => (
  <svg {...svgProps(size)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 15.5h.01" />
  </svg>
);

// Laporkan Masalah: pelampung
export const IconReport = ({ size = 22 }: P) => (
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
