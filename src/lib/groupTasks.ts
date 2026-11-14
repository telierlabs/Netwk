// ─────────────────────────────────────────────
// GROUP TASKS — src/lib/groupTasks.ts
// Memecah SATU pesan berisi banyak @mention jadi tugas per AI, berurutan.
//   "@grok cari X @chatgpt bikin materinya @gemini bikin ppt"
//   → [{grok:"cari X"}, {chatgpt:"bikin materinya"}, {gemini:"bikin ppt"}]
// Teks sebelum mention pertama = konteks bersama. Mention beruntun berbagi tugas berikutnya.
// ─────────────────────────────────────────────

export interface GroupTask<P> {
  ai: P;
  task: string;
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export function splitTasks<P extends { id: string; name: string }>(inputText: string, aiParticipants: P[]): GroupTask<P>[] {
  const re = /@([a-zA-Z0-9_]+)/g;
  const marks: { name: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(inputText)) !== null) marks.push({ name: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length });
  if (marks.length === 0) return [];

  const find = (n: string) => aiParticipants.find(a => a.name.toLowerCase() === n);
  const shared = clean(inputText.slice(0, marks[0].start));
  const whole = clean(inputText.replace(/@[a-zA-Z0-9_]+/g, ''));

  const raw: { ai: P; seg: string }[] = [];
  marks.forEach((mk, i) => {
    const ai = find(mk.name);
    if (!ai) return;
    const seg = clean(inputText.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : undefined));
    raw.push({ ai, seg });
  });

  // mention beruntun tanpa teks → pakai tugas dari mention berikutnya yang punya teks
  for (let i = raw.length - 1; i >= 0; i--) {
    if (!raw[i].seg) raw[i].seg = i + 1 < raw.length ? raw[i + 1].seg : '';
  }

  const out: GroupTask<P>[] = [];
  for (const r of raw) {
    const task = clean([shared, r.seg].filter(Boolean).join(' ')) || whole;
    const ex = out.find(o => o.ai.id === r.ai.id);
    if (ex) { if (task && !ex.task.includes(task)) ex.task = clean(`${ex.task}. ${task}`); }
    else out.push({ ai: r.ai, task });
  }
  return out;
       }
