// Simpan sebagai: src/lib/agent.ts  (GANTI isi file lama)
// Sisi browser untuk fitur Agent: sambung app, cek status, jalankan aksi, dan format perintah buat AI.
import { auth } from './firebase';

export type AgentToolkit = 'github' | 'gmail' | 'googledrive';

export interface AgentToolDef {
  name: string;
  toolkit: AgentToolkit;
  risky: boolean; // true = wajib persetujuan user dulu
  desc: string;
}

// Harus sama dengan daftar TOOLS di api/agent.ts
export const AGENT_TOOLS: AgentToolDef[] = [
  { name: 'GMAIL_FETCH_EMAILS', toolkit: 'gmail', risky: false, desc: 'baca email. args: {query?, max_results?}' },
  { name: 'GMAIL_CREATE_EMAIL_DRAFT', toolkit: 'gmail', risky: false, desc: 'bikin draft email. args: {recipient_email, subject, body}' },
  { name: 'GMAIL_SEND_EMAIL', toolkit: 'gmail', risky: true, desc: 'kirim email. args: {recipient_email, subject, body}' },
  { name: 'GITHUB_CREATE_ISSUE', toolkit: 'github', risky: true, desc: 'bikin issue. args: {owner, repo, title, body}' },
];

// Penanda "user ini sudah menyambungkan minimal satu app".
// Selama penanda ini tidak ada, chat biasa TIDAK melakukan pengecekan apa pun ke server (nol beban).
const FLAG = 'cylen_agent_any';
const setFlag = (on: boolean) => {
  try { on ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch { /* abaikan */ }
};

// Habis login OAuth, app dibuka lagi dengan ?connected=xxx → tandai, lalu rapikan alamatnya.
(() => {
  try {
    const p = new URLSearchParams(window.location.search);
    if (!p.get('connected')) return;
    setFlag(true);
    p.delete('connected');
    const qs = p.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
  } catch { /* abaikan */ }
})();

async function call(body: Record<string, any>) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('not-signed-in');
  const r = await fetch('/api/agent', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || 'agent-failed');
  return data;
}

let cache: { at: number; value: Record<string, boolean> } | null = null;

// Buka halaman login app (GitHub / Gmail / Drive). Setelah selesai user dikembalikan ke app.
export async function agentConnect(toolkit: AgentToolkit): Promise<void> {
  cache = null;
  const { redirectUrl } = await call({ mode: 'connect', toolkit });
  if (redirectUrl) window.location.href = redirectUrl;
}

// App mana yang sudah tersambung, contoh: { github: true, gmail: true }
export async function agentStatus(): Promise<Record<string, boolean>> {
  const { connected } = await call({ mode: 'status' });
  const value: Record<string, boolean> = connected || {};
  cache = { at: Date.now(), value };
  setFlag(Object.values(value).some(Boolean));
  return value;
}

// Versi hemat untuk chat: kosong kalau user belum pernah menyambungkan app, dan hasilnya disimpan sementara.
export async function agentConnectedCached(maxAgeMs = 120000): Promise<Record<string, boolean>> {
  try { if (localStorage.getItem(FLAG) !== '1') return {}; } catch { return {}; }
  if (cache && Date.now() - cache.at < maxAgeMs) return cache.value;
  try {
    return await Promise.race([
      agentStatus(),
      new Promise<Record<string, boolean>>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);
  } catch {
    return cache?.value || {};
  }
}

// Jalankan satu aksi. Aksi berisiko cuma boleh dengan confirmed = true (setelah user klik Setuju).
export async function agentRunTool(tool: string, args: Record<string, any>, confirmed = false): Promise<string> {
  const { result } = await call({ mode: 'tool', tool, args, confirmed });
  return String(result ?? '');
}

export const agentIsRisky = (tool: string) => !!AGENT_TOOLS.find(t => t.name === tool)?.risky;

// Ringkasan aksi buat dialog persetujuan
export function describeAgentCall(tool: string, args: Record<string, any>): string {
  const a = args || {};
  if (tool === 'GMAIL_SEND_EMAIL') return `Kirim email ke ${a.recipient_email || '?'}\nSubjek: ${a.subject || '-'}\n\n${String(a.body || '').slice(0, 300)}`;
  if (tool === 'GITHUB_CREATE_ISSUE') return `Buat issue di ${a.owner || '?'}/${a.repo || '?'}\nJudul: ${a.title || '-'}`;
  return `Jalankan aksi ${tool}`;
}

// Instruksi buat AI: format panggilan aksi, hanya untuk app yang sudah tersambung.
export function agentSystemPrompt(connected: Record<string, boolean>): string {
  const list = AGENT_TOOLS.filter(t => connected[t.toolkit]);
  if (list.length === 0) return '';
  return `\n\n[AKSI AGENT]: Kamu bisa menjalankan aksi di akun user. Kalau user meminta aksi di app-nya, tulis HANYA satu tag ini lalu berhenti:
[AGENT_TOOL: {"tool":"NAMA","args":{...}}]
Aksi tersedia:
${list.map(t => `- ${t.name}${t.risky ? ' (butuh persetujuan user)' : ''}: ${t.desc}`).join('\n')}
Jangan menulis tag kalau user tidak meminta aksi di app-nya. Setelah menerima hasil aksi, jelaskan ke user dengan bahasa biasa.`;
}

// Cari tag [AGENT_TOOL: {...}] di jawaban AI. Balikin { tool, args, raw } atau null.
export function parseAgentCall(text: string): { tool: string; args: Record<string, any>; raw: string } | null {
  const start = text.indexOf('[AGENT_TOOL:');
  if (start === -1) return null;
  const open = text.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) return null;
  const close = text.indexOf(']', end);
  if (close === -1) return null;
  try {
    const j = JSON.parse(text.slice(open, end + 1));
    if (!j?.tool || !AGENT_TOOLS.some(t => t.name === j.tool)) return null;
    return { tool: String(j.tool), args: j.args && typeof j.args === 'object' ? j.args : {}, raw: text.slice(start, close + 1) };
  } catch {
    return null;
  }
}
