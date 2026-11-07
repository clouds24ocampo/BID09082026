// Runs the Vite dev server and opens it in the Electron shell. Usage: npm run desktop:dev
// Vite is started through its API so the app opens on whichever port Vite actually got.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const electronBin = createRequire(import.meta.url)('electron');

const server = await createServer();
await server.listen();
const url = server.resolvedUrls?.local?.[0] ?? `http://localhost:${server.config.server.port}/`;
server.printUrls();

// VS Code terminals set ELECTRON_RUN_AS_NODE, which makes Electron act like plain Node.
const env = { ...process.env, BIDOCS_DEV_URL: url.replace(/\/$/, '') };
delete env.ELECTRON_RUN_AS_NODE;

const app = spawn(electronBin, ['.'], { stdio: 'inherit', env });
const shutdown = async (code = 0) => { await server.close(); process.exit(code); };
app.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => { app.kill(); shutdown(0); });
