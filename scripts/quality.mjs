import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const scanRoots = [path.join(root, 'frontend', 'src'), path.join(root, 'scripts')];
const files = [];

async function collect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') await collect(fullPath);
    if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) files.push(fullPath);
  }
}

for (const folder of scanRoots) await collect(folder);
let failed = false;
if (mode === 'typecheck') {
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) { failed = true; process.stderr.write(result.stderr || result.stdout); }
  }
  if (!failed) console.log(`JavaScript syntax check passed for ${files.length} files. (This repository is JavaScript; it has no TypeScript type checker.)`);
} else if (mode === 'lint') {
  for (const file of files.filter(file => file.includes(`${path.sep}frontend${path.sep}src${path.sep}`))) {
    const source = await readFile(file, 'utf8');
    if (/\bdebugger\s*;|\bconsole\.log\s*\(/.test(source)) { failed = true; console.error(`Disallowed debug statement: ${path.relative(root, file)}`); }
  }
  if (!failed) console.log('Lint checks passed: no debugger or console.log in frontend source.');
} else {
  console.error('Usage: node scripts/quality.mjs typecheck|lint');
  process.exitCode = 2;
}
if (failed) process.exitCode = 1;
