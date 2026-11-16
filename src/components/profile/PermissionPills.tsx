import React from 'react';
import { Bell, MapPin, Mic, Camera, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermKey } from '../../hooks/usePermissions';

const TEXT: Record<string, Record<string, string>> = {
  id: {
    title: 'Izin', notifications: 'Notifikasi', location: 'Lokasi', microphone: 'Mikrofon', camera: 'Kamera',
    allow: 'Izinkan', blocked: 'Diblokir', unsupported: 'Tak didukung',
    hint: 'Izin yang diblokir diubah lewat pengaturan situs di browser (ketuk ikon gembok di kolom alamat).',
    toastBlocked: 'Izin diblokir. Ubah lewat pengaturan situs di browser.',
    toastDenied: 'Izin tidak diberikan',
  },
  en: {
    title: 'Permissions', notifications: 'Notifications', location: 'Location', microphone: 'Microphone', camera: 'Camera',
    allow: 'Allow', blocked: 'Blocked', unsupported: 'Unsupported',
    hint: 'Blocked permissions can be changed in your browser’s site settings (tap the lock icon in the address bar).',
    toastBlocked: 'Permission is blocked. Change it in your browser’s site settings.',
    toastDenied: 'Permission was not granted',
  },
};

const ICONS: Record<PermKey, React.ReactNode> = {
  notifications: <Bell size={20} />,
  location: <MapPin size={20} />,
  microphone: <Mic size={20} />,
  camera: <Camera size={20} />,
};
const ORDER: PermKey[] = ['notifications', 'location', 'microphone', 'camera'];

// ─────────────────────────────────────────────
// PIL IZIN: status notifikasi / lokasi / mikrofon / kamera.
// Ketuk pil yang belum aktif → browser menampilkan kotak izin (permission prompt).
// ─────────────────────────────────────────────
export const PermissionPills = ({ lang, showToast }: { lang: string; showToast?: (msg: string) => void }) => {
  const tx = TEXT[lang] || TEXT.id;
  const { states, request } = usePermissions();
  const anyDenied = ORDER.some((k) => states[k] === 'denied');

  const handle = async (k: PermKey) => {
    const st = states[k];
    if (st === 'granted' || st === 'unsupported') return;
    if (st === 'denied') { showToast?.(tx.toastBlocked); return; }
    const next = await request(k);
    if (next === 'denied') showToast?.(tx.toastDenied);
  };

  return (
    <div className="mt-2">
      <div className="px-6 mt-5 mb-2 text-[16px] font-medium text-[var(--mu)]">{tx.title}</div>
      <div className="mx-3 grid grid-cols-2 gap-2">
        {ORDER.map((k) => {
          const st = states[k];
          return (
            <button
              key={k}
              onClick={() => handle(k)}
              disabled={st === 'unsupported'}
              className={cn(
                'flex items-center gap-2.5 h-[54px] rounded-full bg-[var(--text)]/5 pl-4 pr-3.5 text-left text-[var(--text)] transition-[transform,background-color] active:scale-[0.97] active:bg-[var(--text)]/10',
                st === 'unsupported' && 'opacity-50'
              )}
            >
              <span className="flex-shrink-0 opacity-90">{ICONS[k]}</span>
              <span className="flex-1 min-w-0 text-[15px] font-medium truncate">{tx[k]}</span>
              {st === 'granted' && (
                <span className="w-5 h-5 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center flex-shrink-0">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
              {st === 'prompt' && <span className="text-[12px] font-semibold text-blue-500 flex-shrink-0">{tx.allow}</span>}
              {st === 'denied' && <span className="text-[12px] font-semibold text-red-500 flex-shrink-0">{tx.blocked}</span>}
              {st === 'unsupported' && <span className="text-[11px] text-[var(--mu)] flex-shrink-0">{tx.unsupported}</span>}
            </button>
          );
        })}
      </div>
      {anyDenied && <p className="px-6 mt-2 text-[13px] leading-relaxed text-[var(--mu)]">{tx.hint}</p>}
    </div>
  );
};
