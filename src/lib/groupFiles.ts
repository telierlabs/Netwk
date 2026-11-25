import { db, auth } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Dokumen besar grup disimpan di Firestore juga (tanpa Firebase Storage / billing), dipecah per potongan
// di groups/{groupId}/files/{fid}_{n}. Pesan cuma menyimpan {name, fid, n, gid}.
const CHUNK = 700_000; // karakter base64 per potongan (< 1 MB batas dokumen)

export type GroupFileRef = { name: string; fid: string; n: number; gid: string };

export async function saveGroupFile(gid: string, dataUrl: string, name: string): Promise<GroupFileRef> {
  const fid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const n = Math.ceil(dataUrl.length / CHUNK);
  const uid = auth.currentUser?.uid || '';
  for (let i = 0; i < n; i++) {
    await setDoc(doc(db, 'groups', gid, 'files', `${fid}_${i}`), {
      fid, i, n, name, by: uid, data: dataUrl.slice(i * CHUNK, (i + 1) * CHUNK),
    });
  }
  return { name, fid, n, gid };
}

// Ambil semua potongan lalu simpan/unduh file ke perangkat
export async function openGroupFile(f: GroupFileRef): Promise<void> {
  const parts = await Promise.all(
    Array.from({ length: f.n }, (_, i) => getDoc(doc(db, 'groups', f.gid, 'files', `${f.fid}_${i}`)))
  );
  const dataUrl = parts.map(p => (p.data() as any)?.data || '').join('');
  if (!dataUrl) throw new Error('empty');
  const blob = await (await fetch(dataUrl)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = f.name || 'file'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
