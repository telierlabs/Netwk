import { useCallback, useEffect, useState } from 'react';

// ─────────────────────────────────────────────
// STATUS & PERMINTAAN IZIN BROWSER: notifikasi, lokasi, mikrofon, kamera
// (yang muncul sebagai kotak "permission prompt" di luar tampilan app)
// ─────────────────────────────────────────────
export type PermKey = 'notifications' | 'location' | 'microphone' | 'camera';
export type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export const PERM_KEYS: PermKey[] = ['notifications', 'location', 'microphone', 'camera'];

const API_NAME: Record<PermKey, string> = {
  notifications: 'notifications',
  location: 'geolocation',
  microphone: 'microphone',
  camera: 'camera',
};

const isSupported = (k: PermKey): boolean => {
  if (typeof window === 'undefined') return false;
  if (k === 'notifications') return 'Notification' in window;
  if (k === 'location') return 'geolocation' in navigator;
  return !!navigator.mediaDevices?.getUserMedia;
};

const readState = async (k: PermKey): Promise<PermState> => {
  if (!isSupported(k)) return 'unsupported';
  if (k === 'notifications') {
    const p = Notification.permission; // 'default' | 'granted' | 'denied' — selalu ada & akurat
    return p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'prompt';
  }
  try {
    const st = await navigator.permissions.query({ name: API_NAME[k] } as any);
    return st.state as PermState;
  } catch {
    return 'prompt'; // browser nggak bisa memeriksa (mis. Safari/Firefox) → anggap belum ditanya
  }
};

const INITIAL: Record<PermKey, PermState> = { notifications: 'prompt', location: 'prompt', microphone: 'prompt', camera: 'prompt' };

export function usePermissions() {
  const [states, setStates] = useState<Record<PermKey, PermState>>(INITIAL);

  const refresh = useCallback(async () => {
    const vals = await Promise.all(PERM_KEYS.map(readState));
    const next = Object.fromEntries(PERM_KEYS.map((k, i) => [k, vals[i]])) as Record<PermKey, PermState>;
    setStates((prev) => (PERM_KEYS.every((k) => prev[k] === next[k]) ? prev : next));
  }, []);

  useEffect(() => {
    refresh();
    // Kembali dari pengaturan browser / pindah tab → periksa lagi
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);

    // Ikut berubah kalau user mengubah izin lewat pengaturan situs (kalau browser mendukung)
    const cleanups: Array<() => void> = [];
    PERM_KEYS.forEach((k) => {
      if (k === 'notifications' || !navigator.permissions?.query) return;
      navigator.permissions.query({ name: API_NAME[k] } as any).then((st) => {
        st.onchange = () => refresh();
        cleanups.push(() => { st.onchange = null; });
      }).catch(() => { /* tidak didukung */ });
    });

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
      cleanups.forEach((c) => c());
    };
  }, [refresh]);

  // Minta izin → browser menampilkan kotak izinnya. Harus dipanggil dari ketukan user.
  const request = useCallback(async (k: PermKey): Promise<PermState> => {
    try {
      if (k === 'notifications') {
        await Notification.requestPermission();
      } else if (k === 'location') {
        await new Promise<void>((resolve) =>
          navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { timeout: 10000, maximumAge: 600000 })
        );
      } else {
        const stream = await navigator.mediaDevices.getUserMedia(k === 'microphone' ? { audio: true } : { video: true });
        stream.getTracks().forEach((tr) => tr.stop()); // cuma buat minta izin, langsung dilepas
      }
    } catch { /* ditolak / perangkat tidak ada */ }
    const next = await readState(k);
    setStates((prev) => ({ ...prev, [k]: next }));
    return next;
  }, []);

  return { states, request, refresh };
}
