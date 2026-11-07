// ─────────────────────────────────────────────
// GROUP SEARCH STORE — src/lib/groupSearchStore.ts
// Status pencarian AI di chat grup (langkah, kata kunci, sumber) untuk kartu loading.
// Ditulis oleh useGroupChat, dibaca GroupChatPage — tanpa perlu mengubah App.tsx.
// ─────────────────────────────────────────────
import { useSyncExternalStore } from 'react';

export type GroupSearchStage = 'understand' | 'search' | 'read' | 'write';

export interface GroupSearchState {
  groupId: string;
  ai: string;                       // nama AI yang sedang mencari (buat label)
  prompt: string;                   // pertanyaan user tanpa @mention
  stage: GroupSearchStage;
  queries: string[];
  sources: { title: string; url: string }[];
}

const ORDER: GroupSearchStage[] = ['understand', 'search', 'read', 'write'];
let state: GroupSearchState | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const groupSearch = {
  get: () => state,
  set(next: GroupSearchState | null) { state = next; emit(); },
  patch(p: Partial<GroupSearchState>) { if (state) { state = { ...state, ...p }; emit(); } },
  bump(stage: GroupSearchStage) {
    if (state && ORDER.indexOf(stage) > ORDER.indexOf(state.stage)) { state = { ...state, stage }; emit(); }
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

/** Status pencarian untuk grup yang sedang dibuka (null kalau bukan grup ini). */
export function useGroupSearch(groupId: string): GroupSearchState | null {
  const s = useSyncExternalStore(groupSearch.subscribe, groupSearch.get, groupSearch.get);
  return s && s.groupId === groupId ? s : null;
}
