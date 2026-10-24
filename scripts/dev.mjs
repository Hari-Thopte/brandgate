import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');
const python = process.env.PYTHON || 'python';
const node = process.execPath;
const apiPort = process.env.API_PORT || '8011';
const frontendPort = process.env.FRONTEND_PORT || '5178';
const frontendEnv = { ...process.env, VITE_API_URL: process.env.VITE_API_URL || `http://127.0.0.1:${apiPort}` };
const children = [
  spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', apiPort], { cwd: backend, stdio: 'inherit', windowsHide: true }),
  spawn(node, [path.join(frontend, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', frontendPort], { cwd: frontend, env: frontendEnv, stdio: 'inherit', windowsHide: true }),
];

console.log('BrandGate local demo');
console.log(`Frontend: http://127.0.0.1:${frontendPort}`);
console.log(`API:      http://127.0.0.1:${apiPort}/health/ready`);

function stop() {
  for (const child of children) if (!child.killed) child.kill();
}
for (const child of children) child.on('exit', code => {
  if (code !== null && code !== 0) {
    process.exitCode = code;
    stop();
  }
});
process.on('SIGINT', () => { stop(); process.exit(); });
process.on('SIGTERM', () => { stop(); process.exit(); });
