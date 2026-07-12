import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import AppMobile from './AppMobile';
import AppDesktop from './AppDesktop';
import AppNative from './AppNative';
import './index.css';

function isMobileDevice(): boolean {
  const touchScreen = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  const mobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const score = [touchScreen, smallScreen, mobileUA].filter(Boolean).length;
  return score >= 2;
}

const App = Capacitor.isNativePlatform()
  ? AppNative
  : (isMobileDevice() ? AppMobile : AppDesktop);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
