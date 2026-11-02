import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/features/landing');
const DRY = process.argv.includes('--dry');

const HEX = {
  '000': 'bg', '000000': 'bg',
  'fff': 'fg', 'ffffff': 'fg',
  '888': 'mu', '666': 'mu2', '555': 'mu2',
  '444': 's5', '333': 's4', '222': 's3', '111': 's1',
  '1a1a1a': 's2', '0a0a0a': 's0',
  'ccc': 't2', 'ddd': 't2', 'aaa': 't2', 'bbb': 't2',
};
const ATTR_CURRENT = new Set(['000','000000','fff','ffffff','888','666','555','ccc']);

function transform(src) {
  let out = src;
  out = out.replace(/\b(stroke|fill)="#([0-9a-fA-F]{3,6})"/g, (m, a, h) =>
    ATTR_CURRENT.has(h.toLowerCase()) ? `${a}="currentColor"` : m);
  out = out.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([\d.]+)\s*\)/g, 'rgb(var(--l-fgrgb) / $1)');
  out = out.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\s*\)/g, 'rgb(var(--l-bgrgb) / $1)');
  out = out.replace(/#([0-9a-fA-F]{3,6})(?![0-9a-zA-Z])/g, (m, h) => {
    const k = HEX[h.toLowerCase()];
    return k ? `var(--l-${k})` : m;
  });
  out = out.replace(/brightness\(0\) invert\(1\)/g, 'var(--l-logo-filter)');
  out = out.replace(/'brightness\(2\)'/g, "'var(--l-icon-filter)'");
  return out;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (!file.endsWith('.tsx') || file.endsWith('landingTheme.tsx')) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (before !== after) {
    changed++;
    console.log((DRY ? '[dry] ' : '✔ ') + path.relative(process.cwd(), file));
    if (!DRY) fs.writeFileSync(file, after);
  }
}
console.log(`\n${changed} file ${DRY ? 'akan diubah' : 'diubah'}.`);
