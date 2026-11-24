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
import { P10 } from './localesP10';
import { P11A } from './localesP11a';
import { P11B } from './localesP11b';
import { P11C } from './localesP11c';

type Bundle = Record<string, Record<string, any>>;

// Gabung per bahasa: bagian dari tiap file digabung jadi satu (tidak saling timpa).
const merge = (...parts: Bundle[]): Bundle => {
  const out: Bundle = {};
  for (const p of parts) for (const lang of Object.keys(p)) {
    const cur = out[lang] || (out[lang] = {});
    // gabung sampai tingkat namespace (kunci di dalam namespace yang sama tidak saling timpa)
    for (const ns of Object.keys(p[lang])) {
      const v = p[lang][ns];
      cur[ns] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(cur[ns] || {}), ...v } : v;
    }
  }
  return out;
};

export const LOCALES: Bundle = merge(L1, L2, L3, L4, L5, P1, P2, P3, P4, P5, P6A, P6B, P7A, P7B, P8A, P8B, P9, P10, P11A, P11B, P11C);
