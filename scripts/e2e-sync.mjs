// End-to-end test of offline-first online sync: two separate browser profiles ("devices"), the real app,
// the real supabase-js client, and a mock Supabase server.   Usage: node scripts/e2e-sync.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { startMockSupabase } from './mock-supabase.mjs';

const APP_PORT = Number(process.env.E2E_PORT) || 3996;
const BASE = `http://localhost:${APP_PORT}`;
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EMAIL = 'owner@sync-test.ph';
const PASSWORD = 'Strong1234';
const PDF = 'data:application/pdf;base64,JVBERi0xLjQK';

const results = [];
const check = (name, ok, extra = '') => results.push([ok ? 'PASS' : 'FAIL', name, extra]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, timeout = 20000, step = 250) {
  const end = Date.now() + timeout;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* retry */ }
    if (Date.now() > end) return false;
    await sleep(step);
  }
}

const mock = await startMockSupabase(54321);
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(APP_PORT), '--strictPort'], { stdio: 'ignore' });
const cleanup = async (code) => { vite.kill(); await mock.close(); await browser?.close(); process.exit(code); };
let browser;

try {
  if (!(await until(() => fetch(BASE).then((r) => r.ok), 60000))) throw new Error('dev server did not start');
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const cfg = JSON.stringify({ url: mock.url, anonKey: 'mock-anon-key-for-tests-000000' });
  const errors = [];

  async function device(name) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name} PAGEERROR ${e.message}`));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate((c) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('bidocs_sync_config', c); }, cfg);
    return { ctx, page };
  }
  const text = async (page) => (await page.innerText('body')).replace(/\s+/g, ' ');
  const lsGet = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);
  const lsSet = (page, key, val) => page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, val]);
  const queueLen = (page, tenantId) => page.evaluate((t) => { const s = JSON.parse(localStorage.getItem(`bidocs_sync_state_${t}`) || '{}'); return Object.keys(s.queue || {}).length; }, tenantId);
  const poke = (page) => page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });

  // ---------------- Device A: register, create data offline-style, then connect ----------------
  const A = await device('A');
  await A.page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'register'));
  await A.page.reload({ waitUntil: 'networkidle' });
  await A.page.fill('input[placeholder="Engr. Juan Dela Cruz"]', 'Sync Owner');
  await A.page.fill('input[placeholder="juan@company.ph"]', EMAIL);
  await A.page.fill('input[type="password"]', PASSWORD);
  await A.page.click('button:has-text("Continue to Step 2")');
  await A.page.fill('input[placeholder^="e.g. Apex"]', 'Sync Builders Corp');
  await A.page.fill('input[placeholder="008-991-234-000"]', '111-222-333-000');
  await A.page.fill('input[placeholder="SEC-CS2019-94120"]', 'SEC-123');
  await A.page.click('button:has-text("Continue to Step 3")');
  await A.page.fill('input[placeholder="Engr. Ferdinand R. Valenzuela"]', 'Sync Owner');
  await A.page.click('button:has-text("Continue to Step 4")');
  await A.page.click('button:has-text("Complete Onboarding")');
  await A.page.waitForSelector('text=Bidding Modules', { timeout: 20000 });

  const tenantId = await A.page.evaluate(() => JSON.parse(localStorage.getItem('bidocs_tenants'))[0].id);
  const boqKey = `bidocs_boq_${tenantId}_REF-1`;
  const notesKey = `bidocs_notes_${tenantId}_shared`;
  await lsSet(A.page, boqKey, JSON.stringify({ rows: [1, 2, 3] }));
  await A.page.evaluate(async ([t, pdf]) => {
    const m = await import('/src/utils/vaultIndexedDB.ts');
    await m.upsertVaultItem({ id: 'vault-1', tenantId: t, name: 'Mayors Permit', category: 'ELIGIBILITY_CLASS_A', updatedAt: new Date().toISOString() });
    await m.savePdfData('vault-1', pdf);
  }, [tenantId, PDF]);

  // Offline use before ever connecting: data is simply stored locally.
  check('A: works and stores data before any online account exists', (await lsGet(A.page, boqKey)) !== null);
  check('A: no network traffic to the backend before connecting', mock.rows().length === 0 && mock.stats.pushes === 0);

  await A.page.reload({ waitUntil: 'networkidle' }); // pick up the sync config
  await A.page.click('#user-profile-menu-btn');
  await A.page.click('button:has-text("Tenant & Branding Settings")');
  const panel = A.page.locator('section[aria-labelledby="sync-title"]');
  await panel.locator('input[type="email"]').fill(EMAIL);
  await panel.locator('input[type="password"]').fill(PASSWORD);
  await panel.locator('button:has-text("Create online account")').click();

  const uploaded = await until(() => mock.rows().length >= 4 && mock.files().length >= 1, 30000);
  const keys = mock.rows().map((r) => r.key);
  check('A: connecting uploads existing company, settings data, vault item and PDF', !!uploaded,
    JSON.stringify({ keys, files: mock.files().length }));
  check('A: company profile record uploaded', keys.includes(`tenant:${tenantId}`));
  check('A: settings data uploaded', keys.includes(`ls:${boqKey}`));
  check('A: vault item + PDF uploaded', keys.includes('vi:vault-1') && keys.includes('blob:vault-1'));
  check('A: credentials never leave the device', !keys.some((k) => /bidocs_users|bidocs_tenants|login_attempts|password|session/.test(k))
    && !JSON.stringify(mock.rows()).includes('passwordHash'));
  check('A: panel shows synced state', !!(await until(async () => (await text(A.page)).includes('All changes synced'), 15000)));

  // ---------------- Device B: new device restores the company from the online account ----------------
  const B = await device('B');
  await B.page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'login'));
  await B.page.reload({ waitUntil: 'networkidle' });
  await B.page.click('button:has-text("Restore from your online account")');
  await B.page.fill('input[aria-label="Online account email"]', EMAIL);
  await B.page.fill('input[aria-label="Online account password"]', PASSWORD);
  await B.page.click('button:has-text("Restore company")');
  const inApp = await B.page.waitForSelector('text=Bidding Modules', { timeout: 30000 }).then(() => true).catch(() => false);
  check('B: restore signs in and opens the company workspace', inApp, inApp ? '' : (await text(B.page)).slice(0, 300));
  check('B: company profile restored', (await text(B.page)).includes('Sync Builders Corp'));
  check('B: settings data arrives', !!(await until(async () => (await lsGet(B.page, boqKey)) === JSON.stringify({ rows: [1, 2, 3] }), 30000)));
  const vault = await until(() => B.page.evaluate(async ([t]) => {
    const m = await import('/src/utils/vaultIndexedDB.ts');
    const items = await m.loadVaultItems(t);
    const pdf = await m.loadPdfData('vault-1');
    return items.some((i) => i.id === 'vault-1') && pdf ? pdf : null;
  }, [tenantId]), 30000);
  check('B: vault item and PDF arrive intact', vault === PDF);
  check('B: local password hash is not the online password in plain text', !(await B.page.evaluate(() => JSON.stringify({ ...localStorage }))).includes(PASSWORD));

  // ---------------- Offline edits on A, then back online ----------------
  await A.ctx.setOffline(true);
  await lsSet(A.page, boqKey, JSON.stringify({ rows: [1, 2, 3, 4] }));
  await sleep(3500); // debounce window; the sync attempt must fail quietly
  check('A offline: edit is queued, not lost', (await queueLen(A.page, tenantId)) > 0);
  check('A offline: UI reports offline', (await text(A.page)).includes('Offline') || (await text(A.page)).includes('waiting'));
  check('A offline: local data is intact', (await lsGet(A.page, boqKey)) === JSON.stringify({ rows: [1, 2, 3, 4] }));
  await A.ctx.setOffline(false);
  await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
  const pushed = await until(() => mock.rows().find((r) => r.key === `ls:${boqKey}`)?.payload?.v === JSON.stringify({ rows: [1, 2, 3, 4] }), 30000);
  check('A online again: queued edit merges to the online account', !!pushed);
  check('A online again: queue drains', !!(await until(async () => (await queueLen(A.page, tenantId)) === 0, 15000)));
  await poke(B.page);
  check('B receives A\'s offline edit', !!(await until(async () => (await lsGet(B.page, boqKey)) === JSON.stringify({ rows: [1, 2, 3, 4] }), 30000)));

  // ---------------- Conflict: B edits offline first, A edits later; the later edit wins ----------------
  await B.ctx.setOffline(true);
  await lsSet(B.page, notesKey, 'B wrote this first (offline)');
  await sleep(1500);
  await lsSet(A.page, notesKey, 'A wrote this later (online)');
  await until(() => mock.rows().find((r) => r.key === `ls:${notesKey}`)?.payload?.v === 'A wrote this later (online)', 30000);
  await B.ctx.setOffline(false);
  await B.page.evaluate(() => window.dispatchEvent(new Event('online')));
  const resolved = await until(async () => (await lsGet(B.page, notesKey)) === 'A wrote this later (online)', 30000);
  check('Conflict: the most recent edit wins on both devices', !!resolved && mock.rows().find((r) => r.key === `ls:${notesKey}`).payload.v === 'A wrote this later (online)');

  // ---------------- Deletion propagates ----------------
  await A.page.evaluate((k) => localStorage.removeItem(k), notesKey);
  await until(() => mock.rows().find((r) => r.key === `ls:${notesKey}`)?.deleted === true, 30000);
  await poke(B.page);
  check('Deletion propagates to the other device', !!(await until(async () => (await lsGet(B.page, notesKey)) === null, 30000)));

  // ---------------- Hygiene ----------------
  check('A and B: no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('e2e run completed', false, e.stack || String(e));
}

for (const [s, n, x] of results) console.log(`${s} | ${n}${x ? ' | ' + x : ''}`);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} checks passed`);
await cleanup(failed ? 1 : 0);
