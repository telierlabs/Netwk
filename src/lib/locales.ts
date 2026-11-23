// Gabungan semua file terjemahan. Tiap file baru (locales6.ts, dst) cukup di-import & di-spread di sini.
import { L1 } from './locales1';
import { L2 } from './locales2';
import { L3 } from './locales3';
import { L4 } from './locales4';
import { L5 } from './locales5';
import { P1 } from './localesP1';
import { P2 } from './localesP2';
import { P3 } from './localesP3';
import { P4 } from './localesP4';
import { P5 } from './localesP5';
import { P6A } from './localesP6a';
import { P6B } from './localesP6b';
import { P7A } from './localesP7a';
import { P7B } from './localesP7b';
import { P8A } from './localesP8a';
import { P8B } from './localesP8b';
import { P9 } from './localesP9';

type Bundle = Record<string, Record<string, any>>;

// Gabung per bahasa: bagian dari tiap file digabung jadi satu (tidak saling timpa).
const merge = (...parts: Bundle[]): Bundle => {
  const out: Bundle = {};
  for (const p of parts) for (const lang of Object.keys(p)) out[lang] = { ...(out[lang] || {}), ...p[lang] };
  return out;
};

export const LOCALES: Bundle = merge(L1, L2, L3, L4, L5, P1, P2, P3, P4, P5, P6A, P6B, P7A, P7B, P8A, P8B, P9);
