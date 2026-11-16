import { buildPersonalityPrompt } from './personalityPrompt';
import { withKidsPrompt } from './kidsMode';

// ─────────────────────────────────────────────
// JEMBATAN PROMPT → geminiService.ts
// geminiService membaca localStorage 'cylen_temp_prompt'. Isinya = instruksi kepribadian
// (+ instruksi Mode Anak kalau aktif). Dipanggil otomatis dari useProfile tiap profil berubah,
// jadi berlaku juga di perangkat lain setelah profil termuat dari Firestore.
// ─────────────────────────────────────────────
const KEY = 'cylen_temp_prompt';
let last: string | null = null;

export function syncPromptBridge(profile: { personality?: any; kidsMode?: boolean }) {
  try {
    const base = profile.personality ? buildPersonalityPrompt(profile.personality) : '';
    const full = withKidsPrompt(base, !!profile.kidsMode);
    if (full === last) return;
    last = full;
    if (full.trim()) localStorage.setItem(KEY, full);
    else localStorage.removeItem(KEY);
  } catch { /* localStorage tidak tersedia, abaikan */ }
}
