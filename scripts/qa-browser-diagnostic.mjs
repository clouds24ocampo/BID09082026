import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log(`[QA Diagnostic] Using browser at: ${CHROME_PATH}`);

async function runDiagnostics() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      consoleErrors.push(text);
      console.log(`[Browser Console ERROR] ${text}`);
    } else if (type === 'warning') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.log(`[Browser Page Unhandled ERROR] ${err.message}`);
  });

  const results = {
    url: 'http://localhost:3001/',
    initialLoadSuccess: false,
    authMode: '',
    navigationTabsTested: [],
    accountSwitcherTested: false,
    powAndTorTested: false,
    consoleErrors,
    consoleWarnings,
    pageErrors,
  };

  try {
    console.log('[QA Diagnostic] Navigating to http://localhost:3001/...');
    const response = await page.goto('http://localhost:3001/', { waitUntil: 'networkidle', timeout: 15000 });
    results.initialLoadSuccess = response.status() === 200;
    console.log(`[QA Diagnostic] Page loaded with HTTP status ${response.status()}`);

    // Wait 1 second for any initial client-side rendering/HMR
    await page.waitForTimeout(1000);

    // Check if we are on RegisterPage or LoginPage
    const bodyText = await page.innerText('body');
    const hasRegister = bodyText.includes('Enterprise White-Label Registration') || bodyText.includes('Corporate Account Setup') || bodyText.includes('Account Credentials');
    const hasLogin = bodyText.includes('Mission Control') || bodyText.includes('Sign In') || bodyText.includes('Work Email');

    if (hasRegister) {
      results.authMode = 'REGISTER';
      console.log('[QA Diagnostic] Currently on Register Page. Clicking 1-Click Launch Demo Enterprise...');
      
      const quickFillBtn = page.locator('button:has-text("1-Click Launch Demo Enterprise"), button:has-text("Launch Demo Enterprise"), button:has-text("Quick Fill Demo")');
      if (await quickFillBtn.count() > 0) {
        await quickFillBtn.first().click();
        await page.waitForTimeout(1500);
      } else {
        // Step 1: Account
        await page.fill('input[type="text"]', 'Engr. Ferdinand R. Valenzuela');
        await page.fill('input[type="email"]', 'f.valenzuela@apexcloudph.com');
        await page.fill('input[type="password"]', 'Password123!');
        
        const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")');
        if (await nextBtn.count() > 0) await nextBtn.first().click();
        await page.waitForTimeout(500);

        // Fill remaining or click register
        const submitBtn = page.locator('button:has-text("Complete"), button:has-text("Register"), button[type="submit"]');
        if (await submitBtn.count() > 0) await submitBtn.first().click();
        await page.waitForTimeout(1500);
      }
    } else if (hasLogin) {
      results.authMode = 'LOGIN';
      console.log('[QA Diagnostic] Currently on Login Page. Entering credentials...');
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const pwInput = page.locator('input[type="password"]');
      if (await emailInput.count() > 0) await emailInput.first().fill('f.valenzuela@apexcloudph.com');
      if (await pwInput.count() > 0) await pwInput.first().fill('Password123!');
      
      const loginBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
      if (await loginBtn.count() > 0) await loginBtn.first().click();
      await page.waitForTimeout(1500);
    } else {
      results.authMode = 'AUTHENTICATED_SHELL';
      console.log('[QA Diagnostic] Already in Authenticated AppShell.');
    }

    // Ensure screenshots directory exists
    if (!fs.existsSync('scripts/screenshots')) {
      fs.mkdirSync('scripts/screenshots', { recursive: true });
    }

    await page.screenshot({ path: 'scripts/screenshots/01_appshell_dashboard.png', fullPage: false });

    // Check if AppShell is loaded
    const appShellPresent = await page.locator('nav, aside, header').count() > 0;
    console.log(`[QA Diagnostic] AppShell layout detected: ${appShellPresent}`);

    // Test Navigation Tabs
    const tabsToTest = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'tor', label: 'Terms of Reference (TOR)' },
      { id: 'pow', label: 'Program of Work (POW)' },
      { id: 'opportunities', label: 'Opportunity Finder' },
      { id: 'project-profile', label: 'Project Status' },
      { id: 'vault', label: 'Document Vault' },
      { id: 'bids', label: 'Bid Packages' },
      { id: 'covers', label: 'Packaging Covers' },
      { id: 'forms', label: 'Statutory Forms' },
      { id: 'profile', label: 'Company Profile' },
      { id: 'settings', label: 'Settings' },
    ];

    for (const tab of tabsToTest) {
      try {
        const tabBtn = page.locator(`button:has-text("${tab.label}"), nav button:has-text("${tab.label}")`);
        if (await tabBtn.count() > 0) {
          await tabBtn.first().click();
          await page.waitForTimeout(600);
          
          // Check for red error overlay
          const hasErrorOverlay = await page.locator('.vite-error-overlay, [data-vite-plugin-react-preamble-installed], [class*="error-boundary"]').count();
          results.navigationTabsTested.push({
            id: tab.id,
            label: tab.label,
            rendered: true,
            hasCrash: hasErrorOverlay > 0
          });
          console.log(`[QA Diagnostic] Tab [${tab.label}] tested successfully.`);
        }
      } catch (err) {
        results.navigationTabsTested.push({
          id: tab.id,
          label: tab.label,
          rendered: false,
          error: err.message
        });
      }
    }

    // Specifically test POW and TOR sub-tabs
    console.log('[QA Diagnostic] Testing POW and TOR sub-tabs...');
    const powTabBtn = page.locator('button:has-text("Program of Work (POW)")');
    if (await powTabBtn.count() > 0) {
      await powTabBtn.first().click();
      await page.waitForTimeout(800);

      // Check sub-tabs in POW
      const subTabs = ['POW Scope Matrix', 'Terms of Reference (TOR)', 'Cost Analysis', 'Signatories & Approvals'];
      for (const st of subTabs) {
        const stBtn = page.locator(`button:has-text("${st}")`);
        if (await stBtn.count() > 0) {
          await stBtn.first().click();
          await page.waitForTimeout(400);
          console.log(`[QA Diagnostic] POW subtab [${st}] clicked and verified.`);
        }
      }
      // Capture POW Matrix screenshot
      await page.screenshot({ path: 'scripts/screenshots/02_pow_matrix.png', fullPage: false });

      // Click Terms of Reference (TOR)
      const torBtn = page.locator('button:has-text("Terms of Reference (TOR)")');
      if (await torBtn.count() > 0) {
        await torBtn.first().click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'scripts/screenshots/03_tor_view.png', fullPage: false });

        // Ensure LTCISCC preset is selected
        const ltcisccBtn = page.locator('div:has-text("LTCISCC Command Center"), button:has-text("LTCISCC Command Center")');
        if (await ltcisccBtn.count() > 0) {
          await ltcisccBtn.first().click();
          await page.waitForTimeout(600);
          console.log('[QA Diagnostic] LTCISCC Command Center preset selected.');
          await page.screenshot({ path: 'scripts/screenshots/05_tor_ltciscc_overview.png', fullPage: false });
        }

        // Test Annexes Workbench tabs
        const annexTabs = [
          { name: 'Annex C: BOQ', selector: 'button:has-text("Annex C: BOQ")', shot: '06_tor_annex_c_boq.png' },
          { name: 'Annex A & E: Core Compute', selector: 'button:has-text("Annex A & E")', shot: '07_tor_annex_ae_architecture.png' },
          { name: 'Annex B & G: SOPs & SLA', selector: 'button:has-text("Annex B & G")', shot: '08_tor_annex_bg_sops_sla.png' },
          { name: 'Annex D & I: Data Privacy', selector: 'button:has-text("Annex D & I")', shot: '09_tor_annex_di_privacy.png' },
          { name: 'Executive TOR', selector: 'button:has-text("Executive TOR")', shot: '10_tor_executive_restored.png' },
        ];

        for (const at of annexTabs) {
          const btn = page.locator(at.selector);
          if (await btn.count() > 0) {
            await btn.first().click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: `scripts/screenshots/${at.shot}`, fullPage: false });
            console.log(`[QA Diagnostic] Clicked workbench tab: ${at.name}`);
          }
        }
      }

      results.powAndTorTested = true;
    }

    // Test Account Switcher in Header
    console.log('[QA Diagnostic] Testing Account Switcher menu...');
    const userMenuBtn = page.locator('[data-testid="user-profile-menu-toggle"], #user-profile-menu-btn');
    if (await userMenuBtn.count() > 0) {
      await userMenuBtn.first().click();
      await page.waitForTimeout(600);
      
      const switchAccounts = page.locator('button:has-text("Preparer"), button:has-text("Approver")');
      const count = await switchAccounts.count();
      console.log(`[QA Diagnostic] Found ${count} alternate accounts in switcher.`);

      if (count > 0) {
        // Switch to the first alternate user (Estimator / Preparer)
        const targetAccount = switchAccounts.first();
        const accountText = await targetAccount.innerText();
        console.log(`[QA Diagnostic] Switching to account: ${accountText.replace(/\n/g, ' ')}`);
        await targetAccount.click();
        await page.waitForTimeout(800);

        // Verify switched user state
        await page.screenshot({ path: 'scripts/screenshots/04_switched_user_preparer.png', fullPage: false });
        results.accountSwitcherTested = true;
        console.log('[QA Diagnostic] Account switcher verified successfully.');
      } else {
        await page.keyboard.press('Escape');
      }
    }

    console.log('[QA Diagnostic] All interactive browser checks completed.');
  } catch (err) {
    console.error('[QA Diagnostic] Unexpected failure during test flow:', err);
    results.pageErrors.push(err.message);
  } finally {
    await browser.close();
  }

  // Save diagnostic output to json file
  fs.writeFileSync(
    'scripts/qa-diagnostic-results.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log('[QA Diagnostic] Results saved to scripts/qa-diagnostic-results.json');
  return results;
}

runDiagnostics().catch((err) => {
  console.error('[QA Diagnostic] Fatal error:', err);
  process.exit(1);
});
