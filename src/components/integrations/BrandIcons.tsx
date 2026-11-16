import React, { useId } from 'react';

// Logo brand sebagai SVG inline (nggak butuh file/CDN, tajam di semua layar).
// Kalau nanti mau pakai file resmi dari brand asset masing-masing, tinggal ganti isi komponennya jadi
// <img src="/icons/gmail.svg" width={size} height={size} /> — pemakaiannya di IntegrationPage tidak berubah.

export interface BrandIconProps {
  size?: number;
  className?: string;
}

export const GmailIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 256 193" width={size} height={size} className={className} aria-hidden="true">
    <path fill="#4285F4" d="M58.182 192.05V93.14L27.507 65.077 0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455h40.727Z" />
    <path fill="#34A853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837-27.026 25.798v98.91Z" />
    <path fill="#EA4335" d="m58.182 93.14-4.174-38.647 4.174-36.989L128 69.868l69.818-52.364 4.669 34.992-4.669 40.644L128 145.504z" />
    <path fill="#FBBC04" d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945l-16.292 12.218Z" />
    <path fill="#C5221F" d="m0 49.504 26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23v23.273Z" />
  </svg>
);

export const GoogleCalendarIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
    <path fill="#fff" d="M152.637 47.363H47.363v105.274h105.274z" />
    <path fill="#EA4335" d="M152.637 200 200 152.637h-47.363z" />
    <path fill="#188038" d="M0 152.637v31.58C0 193.03 6.97 200 15.783 200h31.58v-47.363z" />
    <path fill="#1967D2" d="M200 47.363V15.783C200 6.97 193.03 0 184.217 0h-31.58v47.363z" />
    <path fill="#FBBC04" d="M200 47.363h-47.363v105.274H200z" />
    <path fill="#34A853" d="M152.637 152.637H47.363V200h105.274z" />
    <path fill="#4285F4" d="M152.637 0H15.783C6.97 0 0 6.97 0 15.783v136.854h47.363V47.363h105.274z" />
    <text x="100" y="123" fontSize="64" fontWeight="700" textAnchor="middle" fill="#4285F4" fontFamily="Roboto, 'Google Sans', Arial, sans-serif">31</text>
  </svg>
);

export const GoogleDriveIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} className={className} aria-hidden="true">
    <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" />
    <path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" />
    <path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" />
    <path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" />
    <path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
    <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" />
  </svg>
);

export const CanvaIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => {
  // id unik per instance, titik dua dari useId dibuang biar aman dipakai di url(#...)
  const gid = 'canva' + useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0.05" y1="0.2" x2="0.95" y2="0.85">
          <stop offset="0" stopColor="#00C4CC" />
          <stop offset="0.45" stopColor="#3F7BF2" />
          <stop offset="1" stopColor="#7D2AE8" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill={`url(#${gid})`} />
      <path
        transform="translate(24 24) skewX(-10) translate(-24 -24)"
        d="M32 19.6C30.4 16.4 27.4 14.4 23.8 14.4c-5.6 0-9.8 4.6-9.8 10.2 0 5.7 4.1 10 9.6 10 3.8 0 7-2.1 8.8-5.4"
        stroke="#fff" strokeWidth="4.2" strokeLinecap="round" fill="none"
      />
    </svg>
  );
};

// GitHub: pakai currentColor → otomatis putih di Dark, hitam di Light (ngikut var(--text) dari parent)
export const GitHubIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

// Notion: tile putih + N hitam (sama seperti logo aslinya, kelihatan jelas di dark maupun light)
export const NotionIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 30 30" width={size} height={size} className={className} aria-hidden="true">
    <rect width="30" height="30" rx="6" fill="#fff" />
    <g transform="translate(4 4) scale(.9167)">
      <path fill="#000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </g>
  </svg>
);

export const YouTubeIcon: React.FC<BrandIconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
    <path fill="#fff" d="M9.545 15.568V8.432L15.818 12z" />
  </svg>
);
