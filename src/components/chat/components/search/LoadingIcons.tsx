// ─────────────────────────────────────────────
// LOADING ICONS — src/components/chat/components/search/LoadingIcons.tsx
// Ikon utama baris loading:
//   • pencarian  → 3 titik abstrak (gerak asli SearchingIndicator, dibesarkan sedikit)
//   • kode       → ">_" tanpa latar, berkilau (tanpa kursor berkedip)
//   • gambar     → bingkai foto + garis pindai
//   • dokumen    → lembar + garis pindai
// Warna 100% dari variabel tema.
// ─────────────────────────────────────────────
import React, { memo, useId } from 'react';
import type { LoadingVariant } from '../../../../services/narratorService';

export const LOADING_CSS = `
@keyframes cy-ob-x1 { from { transform: translateX(-8px); } to { transform: translateX(8px); } }
@keyframes cy-ob-y1 { from { transform: translateY(6px); } to { transform: translateY(-7px); } }
@keyframes cy-ob-sc { from { scale: .6; } to { scale: 1.15; } }
@keyframes cy-fl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes cy-fl-out { to { opacity: 0; transform: translateY(-6px); } }
@keyframes cy-fl-shim { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.cy-ob-orb { position: relative; width: 28px; height: 28px; flex-shrink: 0; }
.cy-ob-arm { position: absolute; left: 50%; top: 50%; width: 0; height: 0; animation: cy-ob-y1 var(--ty) ease-in-out infinite alternate; animation-delay: var(--dl); }
.cy-ob-dot { position: absolute; border-radius: 50%; background: var(--text); width: var(--s); height: var(--s); left: calc(var(--s) / -2); top: calc(var(--s) / -2);
  animation: cy-ob-x1 var(--tx) ease-in-out infinite alternate, cy-ob-sc var(--tz) ease-in-out infinite alternate; animation-delay: var(--dl); }
.cy-ob-arm:nth-child(1) { --ty: .62s; --tx: .47s; --tz: .55s; --s: 6px; --dl: 0s; }
.cy-ob-arm:nth-child(2) { --ty: .43s; --tx: .71s; --tz: .4s; --s: 5px; --dl: -.2s; }
.cy-ob-arm:nth-child(3) { --ty: .8s; --tx: .39s; --tz: .66s; --s: 4.5px; --dl: -.4s; }
.cy-ob-arm:nth-child(2) .cy-ob-dot { opacity: .65; }
.cy-ob-arm:nth-child(3) .cy-ob-dot { opacity: .4; }
.cy-fl-shim { background: linear-gradient(90deg, var(--mu) 0%, var(--mu) 35%, var(--text) 50%, var(--mu) 65%, var(--mu) 100%); background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent; animation: cy-fl-shim 2.2s linear infinite; }
@media (prefers-reduced-motion: reduce) { .cy-ob-arm, .cy-ob-dot, .cy-fl-shim { animation-duration: 2s; } }
`;

export const SearchOrb = memo(() => (
  <div className="cy-ob-orb" aria-hidden="true">
    <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
    <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
    <span className="cy-ob-arm"><i className="cy-ob-dot" /></span>
  </div>
));
SearchOrb.displayName = 'SearchOrb';

const useSafeId = () => useId().replace(/[^a-zA-Z0-9]/g, '');

/** ">_" tanpa latar, kilau lewat gradien yang bergeser (tidak ada kursor berkedip). */
export const CodeIcon = memo(({ still = false, size = 30 }: { still?: boolean; size?: number }) => {
  const id = 'cg' + useSafeId();
  if (still) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <polyline points="4.5 7 10.5 12 4.5 17" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="13" y1="18" x2="20" y2="18" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--text)', stopOpacity: 0.42 }} />
          <stop offset="0.38" style={{ stopColor: 'var(--text)', stopOpacity: 0.42 }} />
          <stop offset="0.5" style={{ stopColor: 'var(--text)', stopOpacity: 1 }} />
          <stop offset="0.62" style={{ stopColor: 'var(--text)', stopOpacity: 0.42 }} />
          <stop offset="1" style={{ stopColor: 'var(--text)', stopOpacity: 0.42 }} />
          <animateTransform attributeName="gradientTransform" type="translate" from="-24 0" to="24 0" dur="1.5s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
      <polyline points="4.5 7 10.5 12 4.5 17" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="18" x2="20" y2="18" stroke={`url(#${id})`} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});
CodeIcon.displayName = 'CodeIcon';

export const ImageScanIcon = memo(({ still = false, size = 28 }: { still?: boolean; size?: number }) => {
  const id = 'ic' + useSafeId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs><clipPath id={id}><rect x="3" y="4" width="18" height="16" rx="3" /></clipPath></defs>
      <rect x="3" y="4" width="18" height="16" rx="3" opacity=".75" />
      <circle cx="9" cy="10" r="1.6" opacity=".75" />
      <path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4" opacity=".75" />
      {!still && <g clipPath={`url(#${id})`}>
        <g>
          <line x1="2" y1="5" x2="22" y2="5" strokeWidth="2" />
          <rect x="2" y="-4" width="20" height="9" fill="var(--text)" stroke="none" opacity=".08" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 14;0 0" keyTimes="0;.5;1" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" />
        </g>
      </g>}
    </svg>
  );
});
ImageScanIcon.displayName = 'ImageScanIcon';

export const DocScanIcon = memo(({ still = false, size = 28 }: { still?: boolean; size?: number }) => {
  const id = 'dc' + useSafeId();
  const page = 'M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs><clipPath id={id}><path d={page} /></clipPath></defs>
      <path d={page} opacity=".75" />
      <path d="M14 3v5h5" opacity=".75" />
      <path d="M8.5 12.5h7M8.5 15.5h7M8.5 18h4" opacity=".55" />
      {!still && <g clipPath={`url(#${id})`}>
        <g>
          <line x1="4" y1="5" x2="20" y2="5" strokeWidth="2" />
          <rect x="4" y="-4" width="16" height="9" fill="var(--text)" stroke="none" opacity=".08" />
          <animateTransform attributeName="transform" type="translate" values="0 0;0 15;0 0" keyTimes="0;.5;1" dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" />
        </g>
      </g>}
    </svg>
  );
});
DocScanIcon.displayName = 'DocScanIcon';

export const LeadIcon = memo(({ variant, still = false, size }: { variant?: LoadingVariant | null; still?: boolean; size?: number }) => {
  if (variant === 'code') return <CodeIcon still={still} size={size} />;
  if (variant === 'image') return <ImageScanIcon still={still} size={size} />;
  if (variant === 'doc') return <DocScanIcon still={still} size={size} />;
  return <SearchOrb />;
});
LeadIcon.displayName = 'LeadIcon';
