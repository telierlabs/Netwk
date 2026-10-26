import { db, auth } from './firebase';
import { doc, setDoc, increment } from 'firebase/firestore';

const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Dipanggil dari useChat.ts setiap user kirim pesan.
 *
 * Disimpan di dokumen TERPISAH per hari: users/{uid}/usage/{YYYY-MM-DD}
 * - Pakai increment() atomik -> gak ada race condition / hitungan ketimpa.
 * - Gak bergantung ke dokumen profile (dulu gagal kalau dokumen belum ada,
 *   atau ketimpa waktu profile disimpan ulang).
 * - Gak ada batas 90 hari, semua riwayat tersimpan.
 * - Sekalian catat jam kirim buat statistik "jam paling aktif".
 */
export async function trackMessageSent() {
  const user = auth.currentUser;
  if (!user) return;

  const now = new Date();
  const key = dateKey(now);

  try {
    await setDoc(
      doc(db, 'users', user.uid, 'usage', key),
      {
        date: key,
        count: increment(1),
        hours: { [String(now.getHours())]: increment(1) },
        updatedAt: now.getTime(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('Gagal track usage ke Firestore', e);
  }
}
