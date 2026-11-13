// ─────────────────────────────────────────────
// DOC NOTE STORE — src/lib/docNoteStore.ts
// Kalimat singkat di samping helix saat AI mulai membuat dokumen (chat pribadi & grup).
// Ditulis oleh useChat / useGroupChat, dibaca ChatPage / GroupChatPage — tanpa ubah App.tsx.
// ─────────────────────────────────────────────
import { useSyncExternalStore } from 'react';

let state: { scope: string; text: string } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const docNote = {
  get: () => state,
  start(scope: string) { state = { scope, text: '' }; emit(); },
  set(scope: string, text: string) { if (state && state.scope === scope) { state = { scope, text }; emit(); } },
  clear(scope: string) { if (state && state.scope === scope) { state = null; emit(); } },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Status pembuatan dokumen (null = bukan permintaan dokumen). text kosong = belum ada kalimat. */
export function useDocNote(scope?: string | null): { text: string } | null {
  const s = useSyncExternalStore(docNote.subscribe, docNote.get, docNote.get);
  if (!s) return null;
  if (scope && s.scope !== scope) return null;
  return { text: s.text };
}
