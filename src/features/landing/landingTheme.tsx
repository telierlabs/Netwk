// src/features/landing/landingTheme.tsx
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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

  // Ikut mode HP secara live (selama user belum milih manual)
  useEffect(() => {
    const m = sysQuery();
    const h = () => setSysDark(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);

  const resolved: 'light' | 'dark' = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;

  // Pasang dasar html hitam (nanti di-invert jadi putih di mode terang); bersihkan saat landing ditutup
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prevBg = root.style.backgroundColor;
    const prevCs = root.style.colorScheme;
    root.style.backgroundColor = '#000000';
    root.style.colorScheme = 'dark';
    return () => {
      root.removeAttribute('data-landing-filter');
      root.style.backgroundColor = prevBg || 'var(--bg)';
      root.style.colorScheme = prevCs;
      const appBg = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (appBg) setMeta('theme-color', appBg);
    };
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (resolved === 'light') root.setAttribute('data-landing-filter', '1');
    else root.removeAttribute('data-landing-filter');
    setMeta('theme-color', resolved === 'light' ? '#ffffff' : '#000000');
  }, [resolved]);

  const toggle = useCallback(() => {
    const next: 'light' | 'dark' = resolved === 'dark' ? 'light' : 'dark';
    // Kalau pilihannya sama dengan mode HP -> balik ke "otomatis"
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
  // Warna di sini sengaja versi gelap; di mode terang otomatis ikut ter-invert
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
        background: '#161616',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
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
