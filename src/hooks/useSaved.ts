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

// Label yang tampil di badge kartu dokumen
const DOC_LABELS: Record<string, string> = {
  PDF: 'PDF',
  DOCS: 'WORD',
  DOCX: 'WORD',
  EXCEL: 'EXCEL',
  XLSX: 'EXCEL',
  PPT: 'PPT',
  PPTX: 'PPT',
  EBOOK: 'EBOOK',
};

// Tag hasil generate dari useChat: [PDF_FILE: "nama.pdf"](data:...)
// Pakai [A-Z]+ supaya tipe file baru nanti otomatis ikut kebaca.
const FILE_TAG_REGEX = /\[([A-Z]+)_FILE:\s*"([^"]*)"\]\([^)]*\)/;
// Tag mentah sebelum diproses: [GENERATE_PDF: Judul.pdf]
const GENERATE_TAG_REGEX = /\[GENERATE_(PDF|DOCS|EXCEL|PPT|EBOOK):\s*([^\]]*)\]/;

const cleanText = (s: string) => s.replace(/[*#`]/g, '').replace(/\s+/g, ' ').trim();
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + '...' : s);

interface SavedMeta {
  type: SavedItemType;
  language: string;
  title: string;
  preview: string;
}

// Urutan penting: DOKUMEN dulu, baru kode, gambar, teks.
export function classifySavedContent(content: string): SavedMeta {
  // 1. DOKUMEN (PDF, Word, Excel, PPT, Ebook, apa pun)
  const fileTag = content.match(FILE_TAG_REGEX);
  const genTag = fileTag ? null : content.match(GENERATE_TAG_REGEX);

  if (fileTag || genTag) {
    const kind = (fileTag ? fileTag[1] : genTag![1]).toUpperCase();
    const label = DOC_LABELS[kind] || kind;
    const rawName = (fileTag ? fileTag[2] : genTag![2]).trim();
    const rest = cleanText(content.replace(fileTag ? fileTag[0] : genTag![0], ''));

    return {
      type: 'dokumen',
      language: label,
      title: rawName || `Dokumen ${label}`,
      preview: rest ? short(rest, 80) : `File ${label}`,
    };
  }

  // 2. KODE
  const codeBlockMatch = content.match(/```(\w+)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return {
      type: 'kode',
      language: codeBlockMatch[1] || 'code',
      title: 'Snippet Kode',
      preview: short(cleanText(content), 60),
    };
  }

  // 3. GAMBAR
  if (content.includes('![') || content.includes('[GENERATE_IMAGE')) {
    return {
      type: 'gambar',
      language: '',
      title: 'Gambar AI',
      preview: short(cleanText(content), 60),
    };
  }

  // 4. TEKS
  return {
    type: 'teks',
    language: '',
    title: content.split(' ').slice(0, 5).join(' ').replace(/[^a-zA-Z0-9 ]/g, '') || 'Catatan',
    preview: short(cleanText(content), 60),
  };
}

export function useSaved() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }

      if (user) {
        const q = query(collection(db, 'users', user.uid, 'library'), orderBy('rawDate', 'desc'));
        unsubSnap = onSnapshot(q, (snapshot) => {
          const items: SavedItem[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            const item = { id: d.id, ...data } as SavedItem;

            // Item lama yang salah kategori otomatis dibenerin saat dibaca:
            // kalau isinya ternyata dokumen, paksa jadi 'dokumen'.
            if (typeof data.content === 'string') {
              const meta = classifySavedContent(data.content);
              if (meta.type === 'dokumen') Object.assign(item, meta);
            }

            items.push(item);
          });
          setSavedItems(items);
          setLoading(false);
        });
      } else {
        setSavedItems([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubSnap) unsubSnap();
      unsubAuth();
    };
  }, []);

  const saveItem = async (content: string, chatId?: string) => {
    if (!auth.currentUser) return;

    const { type, language, title, preview } = classifySavedContent(content);

    const now = new Date();
    const payload: any = {
      title, preview, type, language,
      chatId: chatId || '',
      content,
      timestamp: formatSavedTimestamp(now),
      rawDate: now.getTime(),
    };

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'library'), payload);
    } catch (e) {
      console.error("Gagal menyimpan ke Perpustakaan:", e);
    }
  };

  const deleteItem = async (id: string) => {
    if (!auth.currentUser) return;
    // Optimistic: hapus dari local state dulu biar ga glitch
    setSavedItems(prev => prev.filter(item => item.id !== id));
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'library', id));
    } catch (e) {
      console.error("Gagal menghapus item:", e);
    }
  };

  return { savedItems, saveItem, deleteItem, loading };
}
