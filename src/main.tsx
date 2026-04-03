import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppMobile from './AppMobile';
import AppDesktop from './AppDesktop';
import './index.css';

// Deteksi HP vs Laptop/PC
// Kombinasi 3 cara — akurat walau Chrome "Situs Desktop" aktif di HP
function isMobileDevice(): boolean {
  const touchScreen = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // HP = minimal 2 dari 3 kondisi terpenuhi
  const score = [touchScreen, smallScreen, mobileUA].filter(Boolean).length;
  return score >= 2;
}

const App = isMobileDevice() ? AppMobile : AppDesktop;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
