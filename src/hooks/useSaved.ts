import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { SavedItem, SavedItemType } from '../types';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatSavedTimestamp(date = new Date()): string {
  const d = DAYS[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const mon = MONTHS[date.getMonth()];
  const yr = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${day} ${mon} ${yr}, ${h}:${m}`;
}

export function useSaved() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Sync ke Firestore
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, 'users', user.uid, 'library'), orderBy('rawDate', 'desc'));
        const unsubSnap = onSnapshot(q, (snapshot) => {
          const items: SavedItem[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as SavedItem);
          });
          setSavedItems(items);
          setLoading(false);
        });
        return () => unsubSnap();
      } else {
        setSavedItems([]);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  // 2. Fungsi Simpan dengan AI Auto-Detector
  const saveItem = async (content: string, chatId?: string) => {
    if (!auth.currentUser) return;

    let type: SavedItemType = 'teks';
    let language = '';
    let title = content.split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9 ]/g, '') || 'Catatan';
    let preview = content.slice(0, 60).replace(/[*#]/g, '') + '...';
    
    // ── FIX FATAL: DI FIREBASE GAK BOLEH PAKE UNDEFINED, HARUS NULL ATAU STRING KOSONG ──
    let image: string | null = null; 

    // Deteksi Otomatis
    if (content.includes('```')) {
      type = 'kode';
      const match = content.match(/```(\w+)?\n/);
      if (match && match[1]) language = match[1];
      else language = 'code';
      title = 'Snippet Kode';
    } else if (content.includes('![') || content.includes('[GENERATE_IMAGE')) {
      type = 'gambar';
      title = 'Gambar AI';
    } else if (content.includes('[GENERATE_PDF') || content.includes('[GENERATE_DOCS') || content.includes('[GENERATE_EXCEL')) {
      type = 'dokumen';
      title = 'Dokumen Generate';
    }

    const now = new Date();
    
    // ── BIKIN PAYLOAD BERSIH TANPA FIELD UNDEFINED ──
    const payload: any = {
      title,
      preview,
      type,
      language,
      chatId: chatId || '',
      content,
      timestamp: formatSavedTimestamp(now),
      rawDate: now.getTime(),
    };

    // HANYA MASUKIN IMAGE KALAU BUKAN NULL
    if (image) {
      payload.image = image;
    }

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'library'), payload);
    } catch (e) {
      console.error("Gagal menyimpan ke Perpustakaan:", e);
    }
  };

  const deleteItem = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'library', id));
    } catch (e) {
      console.error("Gagal menghapus item:", e);
    }
  };

  return { savedItems, saveItem, deleteItem, loading };
}
