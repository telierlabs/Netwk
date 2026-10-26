import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export type PublicProfile = { name?: string; avatar?: string | null };

// Store bersama: 1 listener Firestore per uid, dipakai semua komponen
const store = new Map<string, PublicProfile | null>();
const subs = new Map<string, { count: number; unsub: () => void }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const retain = (uid: string) => {
  const existing = subs.get(uid);
  if (existing) { existing.count++; return; }
  const unsub = onSnapshot(
    doc(db, 'publicProfiles', uid),
    (snap) => {
      store.set(uid, snap.exists() ? (snap.data() as PublicProfile) : null);
      notify();
    },
    (err) => console.error('Gagal baca profil publik', uid, err)
  );
  subs.set(uid, { count: 1, unsub });
};

const release = (uid: string) => {
  const s = subs.get(uid);
  if (!s) return;
  s.count--;
  if (s.count <= 0) { s.unsub(); subs.delete(uid); }
};

/**
 * Pakai: const getProfile = usePublicProfiles(listUid);
 *        const p = getProfile(uid); // { name, avatar } atau null
 */
export function usePublicProfiles(uids: string[]) {
  const key = Array.from(new Set(uids.filter(Boolean))).sort().join(',');
  const [, force] = useState(0);

  useEffect(() => {
    const list = key ? key.split(',') : [];
    list.forEach(retain);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
      list.forEach(release);
    };
  }, [key]);

  return (uid: string): PublicProfile | null => store.get(uid) ?? null;
}
