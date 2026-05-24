import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { MemoryItem } from '../types';

export function useMemory() {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Sinkronisasi Real-time dengan Firestore
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const memoryRef = collection(db, 'users', user.uid, 'memory');
        // Urutkan dari yang terbaru
        const q = query(memoryRef, orderBy('rawDate', 'desc'));
        
        const unsubSnap = onSnapshot(q, (snapshot) => {
          const items: MemoryItem[] = [];
          snapshot.forEach((doc) => {
            // Kita pake doc.id bawaan Firestore sebagai ID
            items.push({ id: doc.id, ...doc.data() } as MemoryItem);
          });
          setMemoryItems(items);
          setLoading(false);
        });

        return () => unsubSnap();
      } else {
        setMemoryItems([]);
        setLoading(false);
      }
    });

    return unsubAuth;
  }, []);

  // 2. Fungsi Tambah Memori Manual (opsional, karena biasanya AI yg nambahin via autoSaveMemory di useChat)
  const addMemory = async (text: string) => {
    if (!auth.currentUser) return;
    const now = new Date();
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const timestamp = `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'memory'), {
        text,
        timestamp,
        rawDate: now.getTime()
      });
    } catch (e) {
      console.error("Gagal tambah memori:", e);
    }
  };

  // 3. Fungsi Hapus 1 Memori
  const deleteMemory = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'memory', id));
    } catch (e) {
      console.error("Gagal hapus memori:", e);
    }
  };

  // 4. Fungsi Hapus SEMUA Memori
  const clearMemory = async () => {
    if (!auth.currentUser) return;
    try {
      const memoryRef = collection(db, 'users', auth.currentUser.uid, 'memory');
      const snapshot = await getDocs(memoryRef);
      
      // Pake batch biar nghapusnya sekaligus (lebih hemat kuota baca/tulis Firebase)
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (e) {
      console.error("Gagal hapus semua memori:", e);
    }
  };

  return { memoryItems, addMemory, deleteMemory, clearMemory, loading };
}
