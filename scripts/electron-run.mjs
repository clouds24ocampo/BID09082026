// Launches the built desktop app. Usage: npm run desktop:start (after `npm run build`).
// ELECTRON_RUN_AS_NODE is set by VS Code terminals and makes Electron behave like plain Node; strip it.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const electronBin = createRequire(import.meta.url)('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('exit', (code) => process.exit(code ?? 0));
