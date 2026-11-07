import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { app, auth, db } from './firebase';

export type PushStatus = 'unsupported' | 'off' | 'on' | 'denied';

const SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const flagKey = (uid?: string | null) => `cylen_push_${uid || 'anon'}`;

export function getPushStatus(uid?: string | null): PushStatus {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    if (Notification.permission === 'granted' && localStorage.getItem(flagKey(uid)) === '1') return 'on';
  } catch {}
  return 'off';
}

async function waitForActive(reg: ServiceWorkerRegistration) {
  if (reg.active) return;
  const sw = reg.installing || reg.waiting;
  if (!sw) return;
  await new Promise<void>((resolve) => {
    sw.addEventListener('statechange', () => { if (sw.state === 'activated') resolve(); });
    setTimeout(resolve, 8000);
  });
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

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { status: perm === 'denied' ? 'denied' : 'off', message: 'Notification permission was not granted.' };
    }

    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    });
    const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, { scope: SW_SCOPE });
    await waitForActive(reg);

    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
    if (!token) return { status: 'off', message: 'Could not get a notification token.' };

    await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
      token,
      createdAt: Date.now(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
    try { localStorage.setItem(flagKey(uid), '1'); } catch {}
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
    try { localStorage.removeItem(flagKey(uid)); } catch {}
  }
  }
