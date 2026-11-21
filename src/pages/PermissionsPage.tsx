import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Bell, MapPin, Mic, Camera } from 'lucide-react';
import { useT } from '../lib/i18n';
import { auth } from '../lib/firebase';
import { enablePush, disablePush, ensurePush } from '../lib/pushNotifications';

interface Props {
  onBack: () => void;
  showToast: (msg: string) => void;
}

type Key = 'notifications' | 'geolocation' | 'microphone' | 'camera';
type Status = 'granted' | 'denied' | 'prompt';

const TEXT: Record<string, Record<string, string>> = {
  id: {
    title: 'Notifikasi & Izin', allow: 'Izinkan', blocked: 'Diblokir',
    blockedHint: 'Izin diblokir. Buka pengaturan situs di browser untuk mengaktifkan.',
    failed: 'Izin tidak diberikan',
    revokeHint: 'Dimatikan di Cylen. Untuk mencabut izin sepenuhnya, atur lewat pengaturan situs di browser.',
    notifications: 'Notifikasi', notificationsDesc: 'Kabar tugas & pengingat',
    geolocation: 'Lokasi', geolocationDesc: 'Hasil yang relevan di sekitarmu',
    microphone: 'Mikrofon', microphoneDesc: 'Input suara',
    camera: 'Kamera', cameraDesc: 'Ambil foto untuk dikirim ke chat',
  },
  en: {
    title: 'Notifications & Permissions', allow: 'Allow', blocked: 'Blocked',
    blockedHint: 'Permission is blocked. Enable it in your browser’s site settings.',
    failed: 'Permission not granted',
    revokeHint: 'Turned off in Cylen. To fully revoke, use your browser’s site settings.',
    notifications: 'Notifications', notificationsDesc: 'Task updates & reminders',
    geolocation: 'Location', geolocationDesc: 'Relevant results near you',
    microphone: 'Microphone', microphoneDesc: 'Voice input',
    camera: 'Camera', cameraDesc: 'Take photos to send in chat',
  },
};

const OFF_KEY = 'cylen_perm_off';
const loadOff = (): Record<Key, boolean> => {
  try { return { notifications: false, geolocation: false, microphone: false, camera: false, ...JSON.parse(localStorage.getItem(OFF_KEY) || '{}') }; }
  catch { return { notifications: false, geolocation: false, microphone: false, camera: false }; }
};
// Dipakai fitur lain: false kalau user mematikan izin ini lewat tombol di halaman izin
export const isPermissionEnabled = (key: Key): boolean => !loadOff()[key];

const ITEMS: { key: Key; icon: React.ReactNode }[] = [
  { key: 'notifications', icon: <Bell size={24} /> },
  { key: 'geolocation', icon: <MapPin size={24} /> },
  { key: 'microphone', icon: <Mic size={24} /> },
  { key: 'camera', icon: <Camera size={24} /> },
];

const getStatus = async (key: Key): Promise<Status> => {
  try {
    if (key === 'notifications' && 'Notification' in window) {
      const p = Notification.permission;
      return p === 'default' ? 'prompt' : p;
    }
    const res = await navigator.permissions.query({ name: key as PermissionName });
    return res.state as Status;
  } catch {
    return 'prompt';
  }
};

const requestPermission = async (key: Key): Promise<void> => {
  if (key === 'notifications') {
    await Notification.requestPermission();
  } else if (key === 'geolocation') {
    await new Promise<void>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(() => resolve(), reject, { timeout: 10000 })
    );
  } else {
    const stream = await navigator.mediaDevices.getUserMedia(
      key === 'microphone' ? { audio: true } : { video: true }
    );
    stream.getTracks().forEach((t) => t.stop());
  }
};

export const PermissionsPage: React.FC<Props> = ({ onBack, showToast }) => {
  const { lang } = useT();
  const tx = TEXT[lang] || TEXT.id;
  const [status, setStatus] = useState<Record<Key, Status>>({
    notifications: 'prompt', geolocation: 'prompt', microphone: 'prompt', camera: 'prompt',
  });

  const [off, setOff] = useState<Record<Key, boolean>>(loadOff);
  const saveOff = (next: Record<Key, boolean>) => {
    setOff(next);
    try { localStorage.setItem(OFF_KEY, JSON.stringify(next)); } catch {}
  };

  const refresh = useCallback(async () => {
    const entries = await Promise.all(ITEMS.map(async (i) => [i.key, await getStatus(i.key)] as const));
    setStatus(Object.fromEntries(entries) as Record<Key, Status>);
  }, []);

  // Izin notifikasi sudah ada tapi token push belum terdaftar di perangkat ini? Daftarkan diam-diam.
  useEffect(() => {
    if (status.notifications === 'granted' && !off.notifications) ensurePush(auth?.currentUser?.uid).catch(() => {});
  }, [status.notifications, off.notifications]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const handleToggle = async (key: Key) => {
    const granted = status[key] === 'granted';
    if (granted && !off[key]) {            // ON → OFF
      saveOff({ ...off, [key]: true });
      if (key === 'notifications') disablePush().catch(() => {}); // hapus token push di perangkat ini
      showToast(tx.revokeHint);
      return;
    }
    if (granted && off[key]) {             // OFF → ON (izin browser masih ada)
      saveOff({ ...off, [key]: false });
      if (key === 'notifications') {
        const r = await enablePush();      // daftarkan token push lagi
        if (r.status !== 'on') showToast(r.message || tx.failed);
      }
      return;
    }
    if (status[key] === 'denied') { showToast(tx.blockedHint); return; }
    if (key === 'notifications') {         // pertama kali: minta izin + daftarkan token push sekaligus
      const r = await enablePush();
      if (r.status === 'on') saveOff({ ...off, [key]: false });
      else showToast(r.message || tx.failed);
      refresh();
      return;
    }
    try { await requestPermission(key); saveOff({ ...off, [key]: false }); } catch { showToast(tx.failed); }
    refresh();
  };

  const radius = (i: number, n: number) =>
    i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
    : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
    : 'rounded-[6px]';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)] relative z-50">
      <header
        className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button onClick={onBack} aria-label="Back" className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{tx.title}</h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-2 pb-10">
          <div className="mx-3 flex flex-col gap-[2px]">
            {ITEMS.map((it, i) => {
              const s = status[it.key];
              const isOn = s === 'granted' && !off[it.key];
              return (
                <div key={it.key} className={`flex items-center gap-4 bg-[var(--sf)] px-5 py-4 text-[var(--text)] ${radius(i, ITEMS.length)}`}>
                  <div className="w-6 flex justify-center flex-shrink-0 opacity-90">{it.icon}</div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[18px] font-medium leading-tight truncate">{tx[it.key]}</span>
                    <span className="text-[15px] text-[var(--mu)] mt-0.5 truncate">{tx[it.key + 'Desc']}</span>
                  </div>
                  {/* Saklar: nyala = warna aksen, mati = abu (--mu) supaya tetap terlihat di baris terang */}
                  <button
                    role="switch"
                    aria-checked={isOn}
                    onClick={() => handleToggle(it.key)}
                    className={`relative flex-shrink-0 w-[52px] h-8 rounded-full transition-colors duration-200 ${isOn ? 'bg-[var(--ac)]' : 'bg-[var(--mu)]'} ${s === 'denied' ? 'opacity-50' : ''}`}
                  >
                    <span className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-all duration-200 ${isOn ? 'translate-x-5 bg-[var(--at)]' : 'translate-x-0 bg-[var(--sf)]'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
