// Simpan sebagai: api/agent.ts
// Satu fungsi, tiga mode (supaya jumlah fungsi Vercel tidak bertambah):
//  - "connect": bikin link login OAuth (GitHub / Gmail / Drive) untuk user yang sedang login
//  - "status" : app mana saja yang sudah tersambung
//  - "tool"   : jalankan SATU aksi pakai akun milik user itu. Aksi berisiko wajib confirmed: true
//
// Env di Vercel: COMPOSIO_API_KEY, COMPOSIO_AUTH_GITHUB, COMPOSIO_AUTH_GMAIL,
// COMPOSIO_AUTH_GOOGLEDRIVE, APP_URL, FIREBASE_SERVICE_ACCOUNT (sudah ada)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Composio } from '@composio/core';

if (!getApps().length) {
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')) });
}
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

const AUTH_CONFIGS: Record<string, string | undefined> = {
  github: process.env.COMPOSIO_AUTH_GITHUB,
  gmail: process.env.COMPOSIO_AUTH_GMAIL,
  googledrive: process.env.COMPOSIO_AUTH_GOOGLEDRIVE,
};

// Daftar aksi yang boleh dijalankan. risky = wajib persetujuan user (confirmed: true).
// Cek nama (slug) persisnya di dashboard Composio > Toolkits, lalu tambah di sini kalau mau aksi lain.
const TOOLS: Record<string, { risky: boolean }> = {
  GMAIL_FETCH_EMAILS: { risky: false },
  GMAIL_CREATE_EMAIL_DRAFT: { risky: false },
  GMAIL_SEND_EMAIL: { risky: true },
  GITHUB_CREATE_ISSUE: { risky: true },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });

  let body: any = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'no-token' });

  let uid = '';
  try {
    uid = (await getAuth().verifyIdToken(token)).uid;
  } catch {
    return res.status(401).json({ error: 'bad-token' });
  }

  const mode = String(body?.mode || '');
  try {
    // ── Link login OAuth ──
    if (mode === 'connect') {
      const toolkit = String(body?.toolkit || '');
      const authConfigId = AUTH_CONFIGS[toolkit];
      if (!authConfigId) return res.status(400).json({ error: 'toolkit-unknown' });
      const conn: any = await composio.connectedAccounts.link(uid, authConfigId, {
        callbackUrl: `${process.env.APP_URL || ''}/?connected=${toolkit}`,
      });
      return res.status(200).json({ redirectUrl: conn.redirectUrl });
    }

    // ── App yang sudah tersambung ──
    if (mode === 'status') {
      const list: any = await composio.connectedAccounts.list({ userIds: [uid], statuses: ['ACTIVE'] });
      const items: any[] = list?.items ?? (Array.isArray(list) ? list : []);
      const connected: Record<string, boolean> = {};
      items.forEach((a) => {
        const slug = String(a?.toolkit?.slug || '').toLowerCase();
        if (slug) connected[slug] = true;
      });
      return res.status(200).json({ connected });
    }

    // ── Jalankan satu aksi ──
    if (mode === 'tool') {
      const tool = String(body?.tool || '');
      const def = TOOLS[tool];
      if (!def) return res.status(400).json({ error: 'tool-unknown' });
      if (def.risky && body?.confirmed !== true) return res.status(403).json({ error: 'needs-confirmation' });
      const args = body?.args && typeof body.args === 'object' ? body.args : {};
      const result: any = await composio.tools.execute(tool, { userId: uid, arguments: args });
      return res.status(200).json({ ok: true, result: JSON.stringify(result).slice(0, 8000) });
    }

    return res.status(400).json({ error: 'bad-mode' });
  } catch (e: any) {
    console.error(`agent (${mode}) gagal untuk`, uid, e);
    return res.status(500).json({ error: String(e?.message || 'failed').slice(0, 200) });
  }
}
