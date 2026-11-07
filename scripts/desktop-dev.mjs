// Runs the Vite dev server and opens it in the Electron shell. Usage: npm run desktop:dev
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronBin = require('electron'); // path to the electron executable
const URL_ = 'http://localhost:3001';

const vite = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], { stdio: 'inherit', shell: process.platform === 'win32' });

const waitForServer = (tries = 60) =>
  new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(URL_, (res) => { res.resume(); resolve(); }).on('error', () => {
        if (n <= 0) reject(new Error(`Vite did not start at ${URL_}`));
        else setTimeout(() => attempt(n - 1), 500);
      });
    };
    attempt(tries);
  });

const shutdown = (code = 0) => { vite.kill(); process.exit(code); };

try {
  await waitForServer();
  // VS Code terminals set ELECTRON_RUN_AS_NODE, which makes Electron act like plain Node.
  const env = { ...process.env, BIDOCS_DEV_URL: URL_ };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = spawn(electronBin, ['.'], { stdio: 'inherit', env });
  app.on('exit', (code) => shutdown(code ?? 0));
} catch (e) {
  console.error(e.message);
  shutdown(1);
}
process.on('SIGINT', () => shutdown(0));
