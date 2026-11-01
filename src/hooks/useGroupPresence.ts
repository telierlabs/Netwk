import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PresenceEntry {
  uid: string;
  name: string;
  typing: boolean;
  ai: string | null; // nama AI yang lagi menjawab (kalau user ini yang manggil AI)
}

// Status realtime: siapa yang lagi ngetik / AI mana yang lagi menjawab.
// Disimpan di groupTyping/{groupId}/users/{uid}. Data basi otomatis diabaikan:
// kalau sebuah status nggak diperbarui lebih dari 6 detik, dianggap sudah berhenti.
export function useGroupPresence(groupId: string, myId: string | undefined, myName: string) {
  const [others, setOthers] = useState<PresenceEntry[]>([]);

  const seenRef = useRef<Map<string, { at: number; seen: number; entry: PresenceEntry }>>(new Map());
  const lastKeyRef = useRef('');
  const stateRef = useRef<{ typing: boolean; ai: string | null }>({ typing: false, ai: null });
  const nameRef = useRef(myName);
  nameRef.current = myName;
  const lastWriteRef = useRef(0);

  const compute = useCallback(() => {
    const now = Date.now();
    const list: PresenceEntry[] = [];
    seenRef.current.forEach(v => {
      if (now - v.seen < 6000 && (v.entry.typing || v.entry.ai)) list.push(v.entry);
    });
    const key = list.map(e => `${e.uid}:${e.typing ? 1 : 0}:${e.ai || ''}:${e.name}`).sort().join('|');
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      setOthers(list);
    }
  }, []);

  // ── Baca status anggota lain ──
  useEffect(() => {
    seenRef.current = new Map();
    lastKeyRef.current = '';
    setOthers([]);
    if (!db || !groupId || !myId) return;

    const unsub = onSnapshot(
      collection(db, 'groupTyping', groupId, 'users'),
      (snap) => {
        const next = new Map<string, { at: number; seen: number; entry: PresenceEntry }>();
        snap.forEach(d => {
          if (d.id === myId) return;
          const data = d.data() as any;
          const prev = seenRef.current.get(d.id);
          const seen = prev && prev.at === data.at ? prev.seen : Date.now();
          next.set(d.id, {
            at: data.at,
            seen,
            entry: { uid: d.id, name: data.name || '', typing: !!data.typing, ai: data.ai || null },
          });
        });
        seenRef.current = next;
        compute();
      },
      () => { /* rules belum dipublish / offline: abaikan saja */ }
    );
    const tick = setInterval(compute, 1000);
    return () => { unsub(); clearInterval(tick); };
  }, [groupId, myId, compute]);

  // ── Tulis status sendiri ──
  const write = useCallback(() => {
    if (!db || !groupId || !myId) return;
    const { typing, ai } = stateRef.current;
    const ref = doc(db, 'groupTyping', groupId, 'users', myId);
    if (!typing && !ai) {
      lastWriteRef.current = 0;
      deleteDoc(ref).catch(() => {});
      return;
    }
    lastWriteRef.current = Date.now();
    setDoc(ref, { name: nameRef.current, typing, ai, at: Date.now() }).catch(() => {});
  }, [groupId, myId]);

  const setTyping = useCallback((v: boolean) => {
    const changed = stateRef.current.typing !== v;
    stateRef.current.typing = v;
    // Nulis ke cloud dibatasi: cuma kalau status berubah, atau sudah >2,5 detik sejak tulis terakhir
    if (changed || (v && Date.now() - lastWriteRef.current > 2500)) write();
  }, [write]);

  const setAi = useCallback((name: string | null) => {
    if (stateRef.current.ai === name) return;
    stateRef.current.ai = name;
    write();
  }, [write]);

  // Detak jantung: selama masih ngetik / AI masih menjawab, status terus diperbarui
  useEffect(() => {
    const beat = setInterval(() => {
      if (stateRef.current.typing || stateRef.current.ai) write();
    }, 2500);
    return () => clearInterval(beat);
  }, [write]);

  // Keluar dari halaman / pindah Collaboration: hapus status
  useEffect(() => {
    return () => {
      stateRef.current = { typing: false, ai: null };
      if (db && groupId && myId) {
        deleteDoc(doc(db, 'groupTyping', groupId, 'users', myId)).catch(() => {});
      }
    };
  }, [groupId, myId]);

  return { others, setTyping, setAi };
    }
