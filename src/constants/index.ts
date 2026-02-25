import { ThemeConfig, FontConfig } from '../types';

export const THEMES: ThemeConfig[] = [
  { id: 't-light', name: 'Light', bg: '#fff', accent: '#0a0a0a' },
  { id: 't-dark', name: 'Dark', bg: '#0d0d0d', accent: '#fff' },
  { id: 't-cream', name: 'Cream', bg: '#f8f4ed', accent: '#2a1f0e' },
  { id: 't-dusk', name: 'Dusk', bg: '#12101f', accent: '#9d7fea' },
  { id: 't-forest', name: 'Forest', bg: '#f0f4ee', accent: '#162216' },
  { id: 't-slate', name: 'Slate', bg: '#f0f2f5', accent: '#1a2132' },
];

export const FONTS: FontConfig[] = [
  { id: 'Modern', name: 'Modern', family: 'Inter, sans-serif', sub: 'Inter · Bersih & kontemporer' },
  { id: 'Friendly', name: 'Friendly', family: 'DM Sans, sans-serif', sub: 'DM Sans · Bulat & ramah' },
  { id: 'Techy', name: 'Techy', family: 'Space Grotesk, sans-serif', sub: 'Space Grotesk · Geometris & bold' },
  { id: 'Minimal', name: 'Minimal', family: 'Outfit, sans-serif', sub: 'Outfit · Tipis & minimalis' },
  { id: 'Bold', name: 'Bold', family: 'Syne, sans-serif', sub: 'Syne · Ekspresif & artistik' },
  { id: 'Elegant', name: 'Elegant', family: 'Playfair Display, serif', sub: 'Playfair Display · Editorial & mewah' },
  { id: 'Serif', name: 'Serif', family: 'Merriweather, serif', sub: 'Merriweather · Nyaman dibaca lama' },
  { id: 'Literary', name: 'Literary', family: 'Crimson Pro, serif', sub: 'Crimson Pro · Sastra & hangat' },
  { id: 'Editorial', name: 'Editorial', family: 'DM Serif Display, serif', sub: 'DM Serif Display · Magazine style' },
  { id: 'Mono', name: 'Mono', family: 'JetBrains Mono, monospace', sub: 'JetBrains Mono · Presisi & teknikal' },
];
