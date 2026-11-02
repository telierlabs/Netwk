// src/features/landing/landingTheme.tsx
import React, { useCallback, useEffect, useState } from 'react';
import './landing-theme.css';

const KEY = 'cylen_landing_theme';
type Pref = 'system' | 'light' | 'dark';

const sysQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

const readPref = (): Pref => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};

const applyAttr = (pref: Pref) => {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-landing');
  else root.setAttribute('data-landing', pref);
};

// Jalan sekali saat file di-import -> pilihan tersimpan langsung kepasang sebelum render (anti kedip)
if (typeof window !== 'undefined') applyAttr(readPref());

const setMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.removeAttribute('media');
  el.content = content;
};

export function useLandingTheme() {
  const [pref, setPref] = useState<Pref>(readPref);
  const [sysDark, setSysDark] = useState(() => sysQuery().matches);

  // Ikut perubahan mode HP secara live (selama user belum milih manual)
  useEffect(() => {
    const m = sysQuery();
    const h = () => setSysDark(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);

  const resolved: 'light' | 'dark' = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;

  useEffect(() => {
    applyAttr(pref);
    const bg = resolved === 'dark' ? '#000000' : '#ffffff';
    setMeta('theme-color', bg);
    setMeta('color-scheme', resolved);
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.style.backgroundColor = bg;
  }, [pref, resolved]);

  const toggle = useCallback(() => {
    const next: 'light' | 'dark' = resolved === 'dark' ? 'light' : 'dark';
    // Kalau pilihan sama dengan mode HP -> balik ke "otomatis"
    const nextPref: Pref = next === (sysDark ? 'dark' : 'light') ? 'system' : next;
    try {
      if (nextPref === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, nextPref);
    } catch {}
    setPref(nextPref);
  }, [resolved, sysDark]);

  return { resolved, toggle };
}

export const LandingThemeToggle: React.FC = () => {
  const { resolved, toggle } = useLandingTheme();
  const isDark = resolved === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 1000,
        background: 'var(--l-s1)',
        color: 'var(--l-fg)',
        border: '1px solid rgb(var(--l-fgrgb) / 0.18)',
        boxShadow: '0 4px 20px rgb(0 0 0 / 0.25)',
        backdropFilter: 'blur(8px)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {isDark ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
};
