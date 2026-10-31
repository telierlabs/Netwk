// ─────────────────────────────────────────────
// SOURCE AVATAR — src/components/chat/components/search/SourceAvatar.tsx
// Favicon domain (bulat). Kalau gagal dimuat / bukan domain → huruf awal.
// Warna seluruhnya dari variabel tema (--sf, --bd, --text, --bg).
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { looksLikeDomain } from './sourceUtils';

interface SourceAvatarProps {
  domain: string;
  size?: number;
  /** Dipakai untuk avatar bertumpuk: cincin pemisah antar avatar. */
  ringColor?: string;
}

export const SourceAvatar = memo(({ domain, size = 18, ringColor }: SourceAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const canFetch = looksLikeDomain(domain);
  const letter = (domain.replace(/^www\./i, '')[0] || '?').toUpperCase();

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'var(--sf)',
    border: ringColor ? `2px solid ${ringColor}` : '1px solid var(--bd)',
    fontSize: Math.max(9, Math.round(size * 0.5)),
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1,
  };

  if (!canFetch || failed) return <span style={style}>{letter}</span>;

  return (
    <span style={style}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </span>
  );
});
