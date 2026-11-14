// ─────────────────────────────────────────────
// GROUP RUN STORE — src/lib/groupRunStore.ts
// Status semua AI yang dipanggil dalam SATU pesan grup (antri / bekerja / selesai).
// Ditulis oleh useGroupChat, dibaca GroupChatPage untuk menampilkan loading serentak.
// ─────────────────────────────────────────────
import { useSyncExternalStore } from 'react';

export type RunStatus = 'queued' | 'working' | 'done' | 'error';
export interface RunItem { name: string; status: RunStatus; note: string; }
export interface GroupRun { groupId: string; items: RunItem[]; }

let state: GroupRun | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const groupRun = {
  get: () => state,
  start(groupId: string, names: string[]) {
    state = { groupId, items: names.map(name => ({ name, status: 'queued', note: '' })) };
    emit();
  },
  setStatus(groupId: string, name: string, status: RunStatus) {
    if (!state || state.groupId !== groupId) return;
    state = { ...state, items: state.items.map(i => (i.name === name ? { ...i, status } : i)) };
    emit();
  },
  setNote(groupId: string, name: string, note: string) {
    if (!state || state.groupId !== groupId) return;
    state = { ...state, items: state.items.map(i => (i.name === name ? { ...i, note } : i)) };
    emit();
  },
  clear(groupId: string) { if (state && state.groupId === groupId) { state = null; emit(); } },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Status run untuk grup yang sedang dibuka. Hanya ada kalau ≥2 AI dipanggil sekaligus. */
export function useGroupRun(groupId: string): GroupRun | null {
  const s = useSyncExternalStore(groupRun.subscribe, groupRun.get, groupRun.get);
  return s && s.groupId === groupId && s.items.length > 1 ? s : null;
}
