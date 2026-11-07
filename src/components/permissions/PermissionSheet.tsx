// ─────────────────────────────────────────────
// PERMISSION — src/components/permissions/PermissionSheet.tsx
//
// Tidak ada popup custom, dan TIDAK ada lagi pengecekan / permintaan izin di muka.
//
// Dulu: requestPermission() membuka mikrofon / kamera sendiri dulu, lalu fiturnya membuka
// lagi. Dua kali buka berturut-turut itu bisa gagal di HP (perangkat belum lepas), dan
// popup yang ditutup bisa dihitung Chrome sebagai penolakan → izin jadi terblokir.
//
// Sekarang: requestPermission() selalu true. Fiturnya sendiri (SpeechRecognition,
// getUserMedia, geolocation) yang memicu popup bawaan browser — persis seperti
// sebelum ada sistem izin custom.
//
// requestPermission / showPermissionSheet / PermissionSheetHost tetap diexport (isinya kosong)
// supaya App.tsx, ChatInput.tsx, dan LiveVoiceMode.tsx tidak error.
// ─────────────────────────────────────────────
import React from 'react';

export type PermissionKind = 'location' | 'camera' | 'microphone';
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

const PERM_NAME: Record<PermissionKind, string> = { location: 'geolocation', camera: 'camera', microphone: 'microphone' };

/** Baca status izin (hanya membaca, tidak memunculkan popup & tidak membuka perangkat). */
export const getPermissionState = async (kind: PermissionKind): Promise<PermissionState> => {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: PERM_NAME[kind] as PermissionName });
    return r.state as 'granted' | 'denied' | 'prompt';
  } catch {
    return 'unknown';
  }
};

/** Selalu true: biarkan fiturnya sendiri yang meminta izin ke browser. */
export async function requestPermission(_kind: PermissionKind): Promise<boolean> {
  return true;
}

// ── Kosong, hanya supaya import lama tidak error ──
export const showPermissionSheet = (_kind: PermissionKind, _mode: 'blocked' | 'missing'): void => {};
export const PermissionSheetHost: React.FC = () => null;
