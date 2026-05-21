// ─────────────────────────────────────────────
// CONSTANTS — src/components/chat/constants/index.ts
// ─────────────────────────────────────────────

export const COLLAPSE_THRESHOLD = 120;

export const LANG_LABELS: Record<string, string> = {
  html: 'HTML', css: 'CSS', javascript: 'JavaScript', js: 'JavaScript',
  typescript: 'TypeScript', ts: 'TypeScript', tsx: 'TSX', jsx: 'JSX',
  python: 'Python', nodejs: 'Node.js', nextjs: 'Next.js',
  json: 'JSON', bash: 'Bash', shell: 'Shell', sh: 'Shell',
  sql: 'SQL', yaml: 'YAML', yml: 'YAML', xml: 'XML',
  java: 'Java', kotlin: 'Kotlin', swift: 'Swift', go: 'Go',
  rust: 'Rust', cpp: 'C++', c: 'C', csharp: 'C#', php: 'PHP',
  ruby: 'Ruby', dart: 'Dart', tailwind: 'Tailwind', text: 'TEXT',
};

export const ACTIVITY_MAP = {
  pdf:   { text: 'Menyusun PDF…' },
  docs:  { text: 'Membuat Word…' },
  excel: { text: 'Menyusun Excel…' },
  ppt:   { text: 'Mendesain slide…' },
  image: { text: 'Melukis gambar…' },
  ebook: { text: 'Merancang Ebook…' },
} as const;

// Shared lightbox button style
export const lbBtnSt: React.CSSProperties = {
  width: 40, height: 40,
  background: 'rgba(255,255,255,0.09)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '50%', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
