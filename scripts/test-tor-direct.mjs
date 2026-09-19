import { chromium } from 'playwright-core';
import fs from 'fs';

async function testTorDirect() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

  console.log('Navigating to http://localhost:3001/...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle', timeout: 15000 });

  // If on register page, click 1-Click Launch Demo Enterprise
  const demoBtn = page.locator('button:has-text("1-Click Launch Demo Enterprise")');
  if (await demoBtn.count() > 0) {
    console.log('Clicking demo enterprise button...');
    await demoBtn.first().click();
    await page.waitForTimeout(1000);
  }

  // Find all buttons with "Terms of Reference"
  const allTorBtns = page.locator('button:has-text("Terms of Reference")');
  const count = await allTorBtns.count();
  console.log(`Found ${count} buttons with Terms of Reference`);
  for (let i = 0; i < count; i++) {
    const text = await allTorBtns.nth(i).innerText();
    console.log(`Button ${i}: ${text.replace(/\n/g, ' ')}`);
  }

  // Click the sidebar button for Terms of Reference (TOR)
  const sidebarTor = page.locator('aside button:has-text("Terms of Reference (TOR)")');
  if (await sidebarTor.count() > 0) {
    console.log('Clicking aside button: Terms of Reference (TOR)...');
    await sidebarTor.first().click();
    await page.waitForTimeout(1500);
  } else {
    console.log('aside button not found, clicking first tor button...');
    await allTorBtns.first().click();
    await page.waitForTimeout(1500);
  }

  // Check what is visible now
  const pageTitle = await page.locator('h1, h2, h3').allInnerTexts();
  console.log('Headings found on page:', pageTitle);

  // Take screenshot
  await page.screenshot({ path: 'scripts/screenshots/test_direct_tor.png', fullPage: false });
  console.log('Saved scripts/screenshots/test_direct_tor.png');

  // Check for preset buttons
  const presetLtc = page.locator('text=LTCISCC Command Center');
  console.log(`LTCISCC text count: ${await presetLtc.count()}`);

  // Check for Annex tabs
  const annexC = page.locator('text=Annex C: BOQ');
  console.log(`Annex C tab count: ${await annexC.count()}`);

  if (await annexC.count() > 0) {
    console.log('Clicking Annex C tab...');
    await annexC.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/screenshots/06_tor_annex_c_boq.png', fullPage: false });
    console.log('Saved 06_tor_annex_c_boq.png');
  }

  // Test Annex A & E
  const annexAE = page.locator('text=Annex A & E');
  if (await annexAE.count() > 0) {
    console.log('Clicking Annex A & E tab...');
    await annexAE.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/screenshots/07_tor_annex_ae_architecture.png', fullPage: false });
    console.log('Saved 07_tor_annex_ae_architecture.png');
  }

  // Test Annex B & G
  const annexBG = page.locator('text=Annex B & G');
  if (await annexBG.count() > 0) {
    console.log('Clicking Annex B & G tab...');
    await annexBG.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/screenshots/08_tor_annex_bg_sops_sla.png', fullPage: false });
    console.log('Saved 08_tor_annex_bg_sops_sla.png');
  }

  // Test Annex D & I
  const annexDI = page.locator('text=Annex D & I');
  if (await annexDI.count() > 0) {
    console.log('Clicking Annex D & I tab...');
    await annexDI.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/screenshots/09_tor_annex_di_privacy.png', fullPage: false });
    console.log('Saved 09_tor_annex_di_privacy.png');
  }

  // Test Executive TOR
  const execTab = page.locator('text=Executive TOR');
  if (await execTab.count() > 0) {
    console.log('Clicking Executive TOR tab...');
    await execTab.first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scripts/screenshots/10_tor_executive_restored.png', fullPage: false });
    console.log('Saved 10_tor_executive_restored.png');
  }

  await browser.close();
  console.log('Direct TOR test completed successfully.');
}

testTorDirect().catch(console.error);
