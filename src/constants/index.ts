import { ThemeConfig, FontConfig } from '../types';

export const THEMES: ThemeConfig[] = [
  { id: 't-light', name: 'Light', bg: '#ffffff', accent: '#0a0a0a' },
  { id: 't-dark', name: 'Dark', bg: '#000000', accent: '#ffffff' },
  { id: 't-cream', name: 'Cream', bg: '#f8f4ed', accent: '#2a1f0e' },
  { id: 't-slate', name: 'Slate', bg: '#f0f2f5', accent: '#1a2132' },
  { id: 't-aurora-light', name: 'Aurora White', bg: '#f4f7fb', accent: '#3b82f6' },
  { id: 't-aurora-dark', name: 'Aurora Black', bg: '#0b0f19', accent: '#60a5fa' },
  { id: 't-aurora-blue', name: 'Aurora Blue', bg: '#0f172a', accent: '#38bdf8' },
  { id: 't-aurora-green', name: 'Aurora Green', bg: '#064e3b', accent: '#34d399' },
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
