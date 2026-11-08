// src/lib/pushNotifications.ts
// Mengaktifkan / mematikan notifikasi push (Firebase Cloud Messaging) di browser ini.
// Token HP/browser disimpan di Firestore: users/{uid}/fcmTokens/{token}
// (sudah tercakup rules "users/{userId}/{document=**}", jadi nggak perlu ubah rules).
import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { app, auth, db } from './firebase';

export type PushStatus = 'unsupported' | 'off' | 'on' | 'denied';

// Scope khusus supaya service worker notifikasi TIDAK menimpa service worker PWA lo (vite-plugin-pwa)
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const flagKey = (uid?: string | null) => `cylen_push_${uid || 'anon'}`;

export function getPushStatus(uid?: string | null): PushStatus {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    if (Notification.permission === 'granted' && localStorage.getItem(flagKey(uid)) === '1') return 'on';
  } catch { /* abaikan */ }
  return 'off';
}

async function waitForActive(reg: ServiceWorkerRegistration) {
  if (reg.active) return;
  const sw = reg.installing || reg.waiting;
  if (!sw) return;
  await new Promise<void>((resolve) => {
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve(); });
    setTimeout(resolve, 8000); // jaring pengaman
  });
}

// Saat web Cylen sedang TERBUKA di layar, Firebase tidak menampilkan notifikasi sendiri.
// Fungsi ini menampilkannya secara manual. Aman dipanggil berkali-kali (cuma jalan sekali).
let foregroundStarted = false;
export async function startForegroundPush(): Promise<void> {
  if (foregroundStarted) return;
  try {
    if (!app || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!(await isSupported())) return;
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (!reg) return;
    foregroundStarted = true;
    onMessage(getMessaging(app), (payload) => {
      const n = payload.notification;
      if (!n) return;
      reg
        .showNotification(n.title || 'Cylen', {
          body: n.body || '',
          icon: 'https://www.cylenai.com/IMG_20260129_193319_637.webp',
          badge: 'https://www.cylenai.com/notif-badge.png',
        })
        .catch(() => {});
    });
  } catch (e) {
    console.warn('startForegroundPush gagal:', e);
  }
}

export async function enablePush(): Promise<{ status: PushStatus; message?: string }> {
  const uid = auth?.currentUser?.uid;
  if (!uid || !app) return { status: 'off', message: 'Please sign in first.' };

  try {
    if (!(await isSupported())) {
      return { status: 'unsupported', message: 'This browser does not support push notifications.' };
    }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return { status: 'off', message: 'Push is not configured yet (VAPID key missing).' };

    // Config Firebase dikirim lewat URL, karena service worker nggak bisa baca variabel VITE
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    });

    // ⚡ Lebih cepat: service worker didaftarkan SELAGI popup izin tampil (jalan paralel)
    const permissionPromise = Notification.requestPermission();
    const registerPromise = navigator.serviceWorker
      .register(`/firebase-messaging-sw.js?${params.toString()}`, { scope: SW_SCOPE })
      .then(async (reg) => { await waitForActive(reg); return reg; });
    registerPromise.catch(() => {}); // cegah error "unhandled" kalau izin ditolak

    const perm = await permissionPromise;
    if (perm !== 'granted') {
      return { status: perm === 'denied' ? 'denied' : 'off', message: 'Notification permission was not granted.' };
    }

    const reg = await registerPromise;
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { status: 'off', message: 'Could not get a notification token.' };

    try { localStorage.setItem(flagKey(uid), '1'); } catch { /* abaikan */ }

    // ⚡ Simpan token di belakang layar (nggak ditunggu) + 1x coba ulang kalau gagal
    const saveToken = () =>
      setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
        token,
        createdAt: Date.now(),
        userAgent: navigator.userAgent.slice(0, 200),
      });
    saveToken().catch(() => setTimeout(() => saveToken().catch((e) => console.error('Simpan token gagal:', e)), 2000));

    startForegroundPush();
    return { status: 'on' };
  } catch (e) {
    console.error('enablePush gagal:', e);
    return { status: 'off', message: 'Could not turn on notifications. Try again.' };
  }
}

export async function disablePush(): Promise<void> {
  const uid = auth?.currentUser?.uid;
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (app && reg && vapidKey) {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg }).catch(() => null);
      if (token && uid) await deleteDoc(doc(db, 'users', uid, 'fcmTokens', token)).catch(() => {});
      await deleteToken(messaging).catch(() => {});
    }
  } catch (e) {
    console.error('disablePush gagal:', e);
  } finally {
    try { localStorage.removeItem(flagKey(uid)); } catch { /* abaikan */ }
  }
}
