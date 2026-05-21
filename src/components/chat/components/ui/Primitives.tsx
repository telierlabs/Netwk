// ─────────────────────────────────────────────
// UI PRIMITIVES — src/components/chat/components/ui/Primitives.tsx
// LoadingDots · DiagramLoading · DiagramError
// ─────────────────────────────────────────────
import React from 'react';

// ── Loading Dots ──────────────────────────────
export const LoadingDots = () => (
  <>
    <style>{`
      @keyframes ldB { 0%,80%,100%{transform:scale(0.65);opacity:0.3} 40%{transform:scale(1);opacity:1} }
    `}</style>
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--text, #141414)', display: 'inline-block',
          animation: `ldB 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </span>
  </>
);

// ── Diagram Loading Spinner ───────────────────
export const DiagramLoading = () => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '36px 20px', gap: 14,
    background: 'var(--sf, #f7f5f1)',
    borderRadius: 16,
    minHeight: 120,
  }}>
    <style>{`
      @keyframes spinRing { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    `}</style>
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '2.5px solid var(--bd, #e0ddd7)',
      borderTopColor: 'var(--text, #141414)',
      animation: 'spinRing 0.75s linear infinite',
      flexShrink: 0,
    }} />
    <span style={{
      fontSize: 13, fontWeight: 500,
      color: 'var(--mu, #909090)',
      letterSpacing: '0.01em',
    }}>Membuat diagram...</span>
  </div>
);

// ── Diagram Error ─────────────────────────────
export const DiagramError = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 20px',
    background: 'var(--sf, #f7f5f1)',
    borderRadius: 16,
    color: 'var(--mu, #909090)',
    fontSize: 13,
  }}>
    Gagal membuat diagram
  </div>
);
