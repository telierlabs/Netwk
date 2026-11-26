import { db, auth } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Dokumen & foto besar disimpan di Firestore juga (tanpa Firebase Storage / billing), dipecah per potongan.
//   • grup          : groups/{groupId}/files/{fid}_{n}                 → rujukan {name, fid, n, gid}
//   • chat pribadi  : users/{uid}/chats/{chatId}/files/{fid}_{n}       → dokumen: {name, fid, n, cid}
//                                                                         foto/video: string "cyfile:{chatId}:{fid}:{n}"
const CHUNK = 700_000; // karakter base64 per potongan (< 1 MB batas dokumen)
const MEDIA_INLINE_MAX = 100_000; // foto/video di bawah ukuran ini (karakter) tetap disimpan di dalam pesan

export type GroupFileRef = { name: string; fid: string; n: number; gid: string };
export type ChatFileRef = { name: string; fid: string; n: number; cid: string };

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  log: 'text/plain',
  xml: 'application/xml',
};

/** Tipe MIME dari ekstensi nama file (dipakai pratinjau & unduh). */
export const mimeFromName = (name: string): string =>
  MIME[(String(name || '').split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

// ─────────────────────────────────────────────
// GRUP
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// CHAT PRIBADI: simpan per potongan
// ─────────────────────────────────────────────
async function writeChatChunks(uid: string, chatId: string, name: string, dataUrl: string): Promise<{ fid: string; n: number }> {
  const fid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const n = Math.ceil(dataUrl.length / CHUNK);
  for (let i = 0; i < n; i++) {
    await setDoc(doc(db, 'users', uid, 'chats', chatId, 'files', `${fid}_${i}`), {
      fid, i, n, name, data: dataUrl.slice(i * CHUNK, (i + 1) * CHUNK),
    });
  }
  return { fid, n };
}

async function saveChatFile(uid: string, chatId: string, name: string, base64: string): Promise<ChatFileRef> {
  const dataUrl = `data:${mimeFromName(name)};base64,${base64.includes(',') ? base64.split(',')[1] : base64}`;
  const { fid, n } = await writeChatChunks(uid, chatId, name, dataUrl);
  return { name, fid, n, cid: chatId };
}

async function saveChatMedia(uid: string, chatId: string, dataUrl: string): Promise<string> {
  const { fid, n } = await writeChatChunks(uid, chatId, 'media', dataUrl);
  return `cyfile:${chatId}:${fid}:${n}`;
}

// Cache supaya isi yang sama tidak diunggah ulang setiap chat disimpan (kunci = isi)
const chatFileCache = new Map<string, Promise<ChatFileRef>>();
const chatMediaCache = new Map<string, Promise<string>>();
const mediaKey = (cid: string, d: string) => `${cid}|m|${d.length}|${d.slice(0, 48)}|${d.slice(-48)}`;

const bigData = (x: any) => typeof x === 'string' && x.startsWith('data:') && x.length > MEDIA_INLINE_MAX;

/** true kalau string ini rujukan foto/video chat pribadi ("cyfile:...") */
export const isChatMediaRef = (x: any): boolean => typeof x === 'string' && x.startsWith('cyfile:');

/**
 * Dipanggil sebelum chat pribadi disimpan:
 *   • dokumen terlampir (base64) → diunggah per potongan, diganti rujukan {name, fid, n, cid}
 *   • foto / video besar (data URL) → diunggah per potongan, diganti string "cyfile:..."
 * Kalau unggahan gagal, isinya dibiarkan apa adanya dan nanti dibuang oleh slimSessionForFirestore (chat tetap tersimpan).
 * Mengembalikan SALINAN sesi; data di layar (memori) tidak diubah.
 */
export async function offloadChatFiles(uid: string, session: any): Promise<any> {
  const needs = (m: any) =>
    (Array.isArray(m?.pdfs) && m.pdfs.some((p: any) => p && p.data && !p.fid)) ||
    (Array.isArray(m?.images) && m.images.some(bigData)) ||
    bigData(m?.image);
  if (!(session?.messages || []).some(needs)) return session;

  const s = JSON.parse(JSON.stringify(session));

  const offMedia = async (d: string): Promise<string> => {
    const key = mediaKey(s.id, d);
    let job = chatMediaCache.get(key);
    if (!job) {
      job = saveChatMedia(uid, s.id, d);
      chatMediaCache.set(key, job);
      job.catch(() => chatMediaCache.delete(key));
    }
    try { return await job; } catch (e) { console.error('[Cylen] gagal menyimpan foto chat per potongan', e); return d; }
  };

  for (const m of s.messages || []) {
    if (Array.isArray(m.pdfs)) {
      for (let i = 0; i < m.pdfs.length; i++) {
        const p = m.pdfs[i];
        if (!p || !p.data || p.fid) continue;
        const data = String(p.data);
        const key = `${s.id}|${p.name}|${data.length}|${data.slice(0, 48)}|${data.slice(-48)}`;
        let job = chatFileCache.get(key);
        if (!job) {
          job = saveChatFile(uid, s.id, p.name || 'Dokumen', data);
          chatFileCache.set(key, job);
          job.catch(() => chatFileCache.delete(key));
        }
        try { m.pdfs[i] = await job; } catch (e) { console.error('[Cylen] gagal menyimpan dokumen chat per potongan', e); }
      }
    }
    if (Array.isArray(m.images)) {
      for (let i = 0; i < m.images.length; i++) if (bigData(m.images[i])) m.images[i] = await offMedia(m.images[i]);
    }
    if (bigData(m.image)) m.image = await offMedia(m.image);
  }
  return s;
}

// ─────────────────────────────────────────────
// CHAT PRIBADI: muat kembali foto / video dari rujukan "cyfile:..."
// ─────────────────────────────────────────────
/** Daftar rujukan foto/video unik di sekumpulan pesan. */
export function chatMediaRefsIn(messages: any[]): string[] {
  const out = new Set<string>();
  for (const m of messages || []) {
    if (Array.isArray(m?.images)) m.images.forEach((x: any) => { if (isChatMediaRef(x)) out.add(x); });
    if (isChatMediaRef(m?.image)) out.add(m.image);
  }
  return Array.from(out);
}

/** Unduh potongan lalu gabungkan jadi data URL. Hasil: rujukan → data URL (yang gagal dimuat dilewati). */
export async function loadChatMediaMap(refs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uid = auth.currentUser?.uid;
  if (!uid) return map;
  await Promise.all(refs.map(async ref => {
    try {
      const [, cid, fid, nStr] = ref.split(':');
      const n = parseInt(nStr, 10);
      if (!cid || !fid || !n) return;
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => getDoc(doc(db, 'users', uid, 'chats', cid, 'files', `${fid}_${i}`))));
      const dataUrl = parts.map(p => (p.data() as any)?.data || '').join('');
      if (!dataUrl) return;
      map.set(ref, dataUrl);
      // supaya penyimpanan chat berikutnya tidak mengunggah ulang foto yang baru dimuat ini
      chatMediaCache.set(mediaKey(cid, dataUrl), Promise.resolve(ref));
    } catch (e) {
      console.error('[Cylen] gagal memuat foto chat', e);
    }
  }));
  return map;
}

// ─────────────────────────────────────────────
// BACA DOKUMEN (dipakai pratinjau): otomatis tahu grup atau chat pribadi dari isi rujukan
// ─────────────────────────────────────────────
export async function loadGroupFileBlob(f: GroupFileRef | ChatFileRef): Promise<Blob> {
  const anyF: any = f;
  const col = (i: number) => anyF.cid
    ? doc(db, 'users', auth.currentUser?.uid || '', 'chats', anyF.cid, 'files', `${f.fid}_${i}`)
    : doc(db, 'groups', anyF.gid, 'files', `${f.fid}_${i}`);
  const parts = await Promise.all(Array.from({ length: f.n }, (_, i) => getDoc(col(i))));
  const dataUrl = parts.map(p => (p.data() as any)?.data || '').join('');
  if (!dataUrl) throw new Error('empty');
  const raw = await (await fetch(dataUrl)).blob();
  const type = mimeFromName(f.name);
  return new Blob([raw], { type: type !== 'application/octet-stream' ? type : raw.type });
}

// Simpan/unduh file ke perangkat
export async function openGroupFile(f: GroupFileRef | ChatFileRef): Promise<void> {
  const blob = await loadGroupFileBlob(f);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = f.name || 'file'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
