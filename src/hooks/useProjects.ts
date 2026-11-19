import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────
// PROJECT = wadah chat buatan user: punya nama + instruksi (opsional).
// Disimpan di Firestore: users/{uid}/projects/{projectId}.
// Chat masuk ke project lewat field `projectId` di dokumen chat (diatur useChat.setChatProject).
// Instruksi project otomatis disisipkan ke setiap pesan di chat yang ada di dalam project itu.
// ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  // Realtime: project baru / hasil edit muncul langsung (Firestore menampilkan tulisan lokal seketika,
  // tanpa menunggu server), dan ikut tersinkron ke semua perangkat.
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;
    const unsubAuth = auth?.onAuthStateChanged((user: any) => {
      unsubSnap?.(); unsubSnap = null;
      if (!user) { setProjects([]); return; }
      const q = query(collection(db, 'users', user.uid, 'projects'), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setProjects(snap.docs.map((d) => {
          const x: any = d.data();
          return {
            id: d.id,
            name: String(x.name || ''),
            instructions: String(x.instructions || ''),
            createdAt: Number(x.createdAt || 0),
          } as Project;
        }));
      }, (err) => console.error('Listener project gagal:', err));
    });
    return () => { unsubSnap?.(); unsubAuth?.(); };
  }, []);

  const createProject = useCallback(async (name: string, instructions: string): Promise<string | null> => {
    const user = auth?.currentUser;
    const n = name.trim();
    if (!user || !n) return null;
    const id = Date.now().toString();
    try {
      await setDoc(doc(db, 'users', user.uid, 'projects', id), {
        id,
        name: n,
        instructions: instructions.trim(),
        createdAt: Date.now(),
      });
      return id;
    } catch (e) {
      console.error('Gagal membuat project:', e);
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, patch: { name: string; instructions: string }) => {
    const user = auth?.currentUser;
    const n = patch.name.trim();
    if (!user || !n) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'projects', id),
        { name: n, instructions: patch.instructions.trim() },
        { merge: true },
      );
    } catch (e) {
      console.error('Gagal menyimpan project:', e);
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    const user = auth?.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'projects', id));
    } catch (e) {
      console.error('Gagal menghapus project:', e);
    }
  }, []);

  return { projects, createProject, updateProject, deleteProject };
}
