import { chromium } from 'playwright-core';

// Usage: npm run build && PORT=3999 node server.js  (then)  node scripts/e2e-auth.mjs
import fs from 'fs';
const BASE = process.env.BASE_URL || 'http://localhost:3999';
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

const results = [];
const check = (name, ok, extra = '') => { results.push([ok ? 'PASS' : 'FAIL', name, extra]); };
const text = async () => (await page.innerText('body')).replace(/\s+/g, ' ');

async function register(prefix) {
  await page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'register'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Engr. Juan Dela Cruz"]', `${prefix} Owner`);
  await page.fill('input[placeholder="juan@company.ph"]', `${prefix.toLowerCase()}@test.ph`);
  await page.fill('input[type="password"]', 'weak');
  await page.click('button:has-text("Continue to Step 2")');
  const t1 = await text();
  check(`${prefix}: weak password rejected`, /at least 8 characters/.test(t1));
  await page.fill('input[type="password"]', 'Strong1234');
  await page.click('button:has-text("Continue to Step 2")');
  await page.fill('input[placeholder^="e.g. Apex"]', `${prefix} Builders Corp`);
  await page.fill('input[placeholder="008-991-234-000"]', '111-222-333-000');
  await page.fill('input[placeholder="SEC-CS2019-94120"]', 'SEC-123');
  await page.click('button:has-text("Continue to Step 3")');
  await page.fill('input[placeholder="Engr. Ferdinand R. Valenzuela"]', `${prefix} Owner`);
  await page.click('button:has-text("Continue to Step 4")');
  try { await page.click('button:has-text("Complete Onboarding")', { timeout: 4000 }); } catch (e) { console.log('STUCK TEXT:', (await text()).slice(0, 1500)); throw e; }
  await page.waitForTimeout(1500);
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

await register('Alpha');
let t = await text();
check('Alpha registered and app shell shown', t.includes('Alpha Builders Corp') && /Dashboard/i.test(t));

const dump = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
check('no plaintext password stored', !dump.includes('Strong1234') && !dump.includes('"password"'));
check('password hash stored', dump.includes('passwordHash'));

// Reload keeps session (same tab)
await page.reload({ waitUntil: 'networkidle' });
t = await text();
check('session survives reload', t.includes('Alpha Builders Corp'));

// Logout
await page.click('button:has-text("Alpha Owner")');
await page.click('button:has-text("Log Out Session")');
await page.waitForTimeout(500);
t = await text();
check('logged out: app not visible', !t.includes('Bidding Modules'));

// Login attempts
await page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'login'));
await page.reload({ waitUntil: 'networkidle' });
t = await text();
check('login page does not list companies', !t.includes('Alpha Builders Corp') && !t.includes('111-222-333-000'));
check('login page has no purge/reset-default links', !/Purge All Systems|BiDOCS#2026/.test(t));
await page.fill('input[type="email"]', 'alpha@test.ph');
await page.fill('input[type="password"]', 'WrongPass1');
await page.click('button[type="submit"]');
await page.waitForTimeout(800);
t = await text();
check('wrong password rejected', /Invalid email or password/.test(t));
await page.fill('input[type="password"]', 'Strong1234');
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);
t = await text();
check('correct password signs in', t.includes('Alpha Builders Corp'));

// Lockout: 5 bad attempts
await page.click('button:has-text("Alpha Owner")');
await page.click('button:has-text("Log Out Session")');
await page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'login'));
await page.reload({ waitUntil: 'networkidle' });
for (let i = 0; i < 5; i++) {
  await page.fill('input[type="email"]', 'alpha@test.ph');
  await page.fill('input[type="password"]', 'Bad' + i + 'xxxxx');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
}
await page.fill('input[type="password"]', 'Strong1234');
await page.click('button[type="submit"]');
await page.waitForTimeout(800);
t = await text();
check('lockout after 5 failures blocks even correct password', /Too many failed attempts/.test(t));

// Second company isolation
await page.evaluate(() => { localStorage.removeItem('bidocs_login_attempts'); sessionStorage.clear(); });
await register('Beta');
t = await text();
check('Beta registered', t.includes('Beta Builders Corp'));
check('Beta sees no Alpha data', !t.includes('Alpha'));
const keys = await page.evaluate(() => Object.keys(localStorage));
check('no legacy global project keys', !keys.some((k) => ['bidocs_opportunities', 'bidocs_active_project', 'bidocs_active_vault_project', 'bidocs_current_user'].includes(k)));

// Cannot reach app by faking auth mode alone
await page.click('button:has-text("Beta Owner")');
await page.click('button:has-text("Log Out Session")');
await page.evaluate(() => sessionStorage.setItem('bidocs_auth_mode', 'app'));
await page.reload({ waitUntil: 'networkidle' });
t = await text();
check('forged auth_mode=app does not grant access', !t.includes('Bidding Modules'));

// Forged session for nonexistent user
await page.evaluate(() => sessionStorage.setItem('bidocs_session', JSON.stringify({ userId: 'user-fake', expiresAt: Date.now() + 1e7 })));
await page.reload({ waitUntil: 'networkidle' });
t = await text();
check('forged session for unknown user rejected', !t.includes('Bidding Modules'));

console.log(results.map((r) => r.join(' | ')).join('\n'));
const pageErrors = errors.filter((e) => !/favicon|fonts\.g/.test(e));
console.log('ERRORS:', pageErrors.slice(0, 10));
await browser.close();
if (results.some((r) => r[0] === 'FAIL') || pageErrors.length) process.exit(1);
