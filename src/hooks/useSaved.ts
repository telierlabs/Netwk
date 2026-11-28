import { useState, useEffect, useRef, useCallback } from 'react';
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
  // 🔧 BARU: blok foto (```image-search) bukan kode → dibuang dulu sebelum menentukan jenis item,
  // supaya jawaban yang berisi foto tidak salah masuk tab "Kode".
  content = content.replace(/```image-search\n[\s\S]*?```/g, '').trim();

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

// ───────────── LAMPIRAN YANG DIKIRIM USER (otomatis masuk Perpustakaan) ─────────────

// Ekstensi yang dianggap file kode. Selain ini dianggap dokumen.
const CODE_EXT = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'java', 'kt', 'c', 'cpp', 'h', 'cs',
  'go', 'rs', 'php', 'rb', 'swift', 'sql', 'sh', 'xml', 'yml', 'yaml', 'vue', 'dart',
]);

// Tentukan jenis item dari nama file lampiran
export function classifyFileName(name: string): { type: SavedItemType; language: string } {
  const ext = name.includes('.') ? (name.split('.').pop() || '').toLowerCase() : '';
  if (CODE_EXT.has(ext)) return { type: 'kode', language: ext.toUpperCase() };
  const up = ext.toUpperCase();
  return { type: 'dokumen', language: DOC_LABELS[up] || up || 'FILE' };
}

// Sidik jari singkat sebuah teks (panjang + hash). Dipakai supaya kode tempelan yang sama
// (misal dikirim ulang lewat tombol "Ulangi") tidak tersimpan dobel di Perpustakaan.
export function hashText(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length.toString(36)}-${(h >>> 0).toString(36)}`;
}

// Perkecil foto jadi thumbnail JPEG supaya dokumen Firestore tetap kecil (bukan foto asli)
export function makeImageThumb(src: string, max = 420): Promise<string | undefined> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r));
        c.height = Math.max(1, Math.round(img.height * r));
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.6));
      } catch { resolve(undefined); }
    };
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

export interface UploadInput {
  type: SavedItemType;
  title: string;
  preview?: string;
  language?: string;
  image?: string;
  // Kunci anti-dobel (opsional). Kalau diisi, dipakai menggantikan aturan nama/thumbnail.
  key?: string;
}

// Batas ukuran thumbnail yang disimpan (dokumen Firestore maksimal 1 MB)
const MAX_THUMB_CHARS = 700000;

export function useSaved() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Salinan terbaru daftar item, dipakai untuk cek duplikat tanpa bikin fungsi berubah-ubah
  const itemsRef = useRef<SavedItem[]>([]);
  itemsRef.current = savedItems;

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
      source: 'manual',
      timestamp: formatSavedTimestamp(now),
      rawDate: now.getTime(),
    };

    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'library'), payload);
    } catch (e) {
      console.error("Gagal menyimpan ke Perpustakaan:", e);
    }
  };

  // Simpan lampiran yang dikirim user (foto, video, dokumen, kode) → source: 'upload'
  const saveUploads = useCallback(async (list: UploadInput[], chatId?: string | null) => {
    const user = auth.currentUser;
    if (!user || !list.length) return;
    const col = collection(db, 'users', user.uid, 'library');
    const base = Date.now();
    const cid = chatId || '';

    for (let i = 0; i < list.length; i++) {
      const u = list[i];
      const thumb = u.image && u.image.length < MAX_THUMB_CHARS ? u.image : undefined;

      // Anti-dobel (misal tombol "Ulangi" mengirim ulang lampiran yang sama di chat yang sama):
      // pakai key kalau ada; file → nama + jenis sama; foto → thumbnail sama.
      const isFile = u.type === 'dokumen' || u.type === 'kode';
      const duplicate = itemsRef.current.some(x =>
        x.source === 'upload' && x.chatId === cid && (
          u.key
            ? (x as any).key === u.key
            : isFile
              ? x.type === u.type && x.title === u.title
              : !!thumb && x.image === thumb
        )
      );
      if (duplicate) continue;

      const payload: any = {
        title: u.title,
        preview: u.preview || '',
        type: u.type,
        language: u.language || '',
        chatId: cid,
        content: '',
        source: 'upload',
        timestamp: formatSavedTimestamp(new Date(base)),
        rawDate: base - i, // urutan lampiran dalam satu pesan tetap sama
      };
      // Firestore menolak nilai undefined
      if (thumb) payload.image = thumb;
      if (u.key) payload.key = u.key;

      try {
        await addDoc(col, payload);
      } catch (e) {
        console.error("Gagal menyimpan lampiran ke Perpustakaan:", e);
      }
    }
  }, []);

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

  return { savedItems, saveItem, saveUploads, deleteItem, loading };
  }
