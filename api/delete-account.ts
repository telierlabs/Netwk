// api/delete-account.ts
// Hapus akun user: data Firestore dulu, akun Firebase Auth paling akhir.
// Dipanggil dari App.tsx (handleDeleteAccount) dengan ID token user yang baru saja login ulang.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Query } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
}
const db = getFirestore();

const RECENT_LOGIN_SEC = 300; // login harus baru (maks 5 menit)

// Hapus semua dokumen hasil sebuah query
async function delQuery(q: Query) {
  const snap = await q.get();
  if (snap.empty) return;
  const bw = db.bulkWriter();
  snap.docs.forEach((d) => bw.delete(d.ref));
  await bw.close();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'no-token' });

  let uid = '';
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    if (Date.now() / 1000 - decoded.auth_time > RECENT_LOGIN_SEC) {
      return res.status(403).json({ error: 'recent-login' });
    }
  } catch {
    return res.status(401).json({ error: 'bad-token' });
  }

  try {
    // 1) Jadwal/automasi dulu, supaya cron run-tasks tidak menulis chat baru ke akun ini
    await delQuery(db.collection('tasks').where('uid', '==', uid));

    // 2) Grup yang dia buat: hapus total (dokumen + lampiran files, info undangan, status mengetik)
    const owned = await db.collection('groups').where('createdBy', '==', uid).get();
    for (const g of owned.docs) {
      await db.recursiveDelete(g.ref);
      await db.recursiveDelete(db.doc(`groupTyping/${g.id}`));
      await db.doc(`groupInvites/${g.id}`).delete().catch(() => {});
    }

    // 3) Grup orang lain yang dia ikuti: cukup keluarkan dia
    const joined = await db.collection('groups').where('memberIds', 'array-contains', uid).get();
    for (const g of joined.docs) {
      const participants = ((g.get('participants') || []) as any[]).filter((p) => p?.id !== uid);
      await g.ref.update({ memberIds: FieldValue.arrayRemove(uid), participants });
      await db.doc(`groupTyping/${g.id}/users/${uid}`).delete().catch(() => {});
    }

    // 4) Sisanya
    await delQuery(db.collection('ai_feedback').where('uid', '==', uid));
    // chats (+ subkoleksi files), memory, library, projects, profile, usage, fcmTokens
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await db.doc(`publicProfiles/${uid}`).delete().catch(() => {});

    // 5) Terakhir: akun login-nya
    await getAuth().deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('delete-account gagal untuk', uid, e);
    return res.status(500).json({ error: 'failed' });
  }
}
