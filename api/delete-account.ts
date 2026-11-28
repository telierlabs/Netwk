// api/delete-account.ts
// Satu fungsi, beberapa mode (supaya jumlah fungsi Vercel tidak bertambah):
//  - "account" (bawaan): hapus akun + semua datanya. Butuh login baru (maks 5 menit).
//  - "history": hapus SEMUA riwayat: obrolan (+ lampirannya), Perpustakaan, Project, jadwal Automations, Collaboration.
//    Memori, profil, dan akunnya tetap ada.
//  - "chat":  hapus SATU obrolan beserta foto/dokumen lampirannya (subkoleksi files). Body: { chatId }
//  - "group": hapus SATU Collaboration beserta lampiran filesnya. Hanya pembuatnya. Body: { groupId }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { Query } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
}
const db = getFirestore();

const RECENT_LOGIN_SEC = 300; // login harus baru (maks 5 menit), hanya untuk mode "account"
const SAFE_ID = /^[\w-]{1,200}$/; // id dokumen: huruf, angka, _ dan - saja (cegah path aneh)

type Mode = 'account' | 'history' | 'chat' | 'group';

// Hapus semua dokumen hasil sebuah query
async function delQuery(q: Query) {
  const snap = await q.get();
  if (snap.empty) return;
  const bw = db.bulkWriter();
  snap.docs.forEach((d) => bw.delete(d.ref));
  await bw.close();
}

// Hapus satu Collaboration: dokumen + lampiran files, status mengetik, info undangan
async function deleteGroupFully(groupId: string) {
  await db.recursiveDelete(db.doc(`groups/${groupId}`));
  await db.recursiveDelete(db.doc(`groupTyping/${groupId}`));
  await db.doc(`groupInvites/${groupId}`).delete().catch(() => {});
}

// Jadwal Automations + semua Collaboration:
// yang dia buat dihapus total, yang dia ikuti dia keluar.
async function wipeTasksAndGroups(uid: string) {
  await delQuery(db.collection('tasks').where('uid', '==', uid));

  const owned = await db.collection('groups').where('createdBy', '==', uid).get();
  for (const g of owned.docs) await deleteGroupFully(g.id);

  const joined = await db.collection('groups').where('memberIds', 'array-contains', uid).get();
  for (const g of joined.docs) {
    const participants = ((g.get('participants') || []) as any[]).filter((p) => p?.id !== uid);
    await g.ref.update({ memberIds: FieldValue.arrayRemove(uid), participants });
    await db.doc(`groupTyping/${g.id}/users/${uid}`).delete().catch(() => {});
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const mode: Mode = ['history', 'chat', 'group'].includes(body?.mode) ? body.mode : 'account';

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'no-token' });

  let uid = '';
  try {
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
    if (mode === 'account' && Date.now() / 1000 - decoded.auth_time > RECENT_LOGIN_SEC) {
      return res.status(403).json({ error: 'recent-login' });
    }
  } catch {
    return res.status(401).json({ error: 'bad-token' });
  }

  try {
    // ── SATU obrolan: dokumen + semua potongan lampirannya ──
    if (mode === 'chat') {
      const chatId = String(body?.chatId || '');
      if (!SAFE_ID.test(chatId)) return res.status(400).json({ error: 'bad-chat-id' });
      await db.recursiveDelete(db.doc(`users/${uid}/chats/${chatId}`));
      return res.status(200).json({ ok: true });
    }

    // ── SATU Collaboration: hanya pembuatnya ──
    if (mode === 'group') {
      const groupId = String(body?.groupId || '');
      if (!SAFE_ID.test(groupId)) return res.status(400).json({ error: 'bad-group-id' });
      const g = await db.doc(`groups/${groupId}`).get();
      if (!g.exists) return res.status(200).json({ ok: true }); // sudah tidak ada
      if (g.get('createdBy') !== uid) return res.status(403).json({ error: 'not-admin' });
      await deleteGroupFully(groupId);
      return res.status(200).json({ ok: true });
    }

    // Jadwal dulu, supaya cron run-tasks tidak menulis chat baru ke akun ini selagi dibersihkan
    await wipeTasksAndGroups(uid);

    if (mode === 'history') {
      // chats ikut menghapus subkoleksi files (foto / dokumen lampiran) di dalamnya
      await db.recursiveDelete(db.collection(`users/${uid}/chats`));
      await db.recursiveDelete(db.collection(`users/${uid}/library`));
      await db.recursiveDelete(db.collection(`users/${uid}/projects`));
      return res.status(200).json({ ok: true });
    }

    // mode "account": sisanya + akun login paling akhir
    await delQuery(db.collection('ai_feedback').where('uid', '==', uid));
    // chats (+ files), memory, library, projects, profile, usage, fcmTokens
    await db.recursiveDelete(db.doc(`users/${uid}`));
    await db.doc(`publicProfiles/${uid}`).delete().catch(() => {});
    await getAuth().deleteUser(uid);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`delete-account (${mode}) gagal untuk`, uid, e);
    return res.status(500).json({ error: 'failed' });
  }
}
