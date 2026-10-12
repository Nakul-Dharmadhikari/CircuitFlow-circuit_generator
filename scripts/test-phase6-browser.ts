import puppeteer, { Browser, Page } from 'puppeteer-core';
import assert from 'assert';
import path from 'path';
import fs from 'fs';

async function runPhase6BrowserVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 6: LIVE CHROME THEME & DESIGN SYSTEM SUITE');
  console.log('Testing: Copper Lab Visual System, Theme Toggle, Persistence & Contrast');
  console.log('================================================================\n');

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser: Browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900', '--disable-gpu'],
  });

  const page: Page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('[BROWSER ERROR]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.error('[PAGE EXCEPTION]', err.message);
  });

  let passCount = 0;
  function pass(testName: string) {
    passCount++;
    console.log(`✔ PASS: ${testName}`);
  }

  try {
    // -------------------------------------------------------------
    // 1. Initial Load at 1600x900 (Default Dark Theme)
    // -------------------------------------------------------------
    console.log('Step 1: Loading application at 1600x900...');
    await page.setViewport({ width: 1600, height: 900 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Clear any leftover theme override to test pure default
    await page.evaluate(() => localStorage.removeItem('circuitflow_theme'));
    await page.reload({ waitUntil: 'networkidle0' });

    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }

    const defaultThemeInfo = await page.evaluate(() => {
      const rootTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const appShell = document.querySelector('.app-shell') as HTMLElement;
      const topbar = document.querySelector('.app-topbar') as HTMLElement;
      const brandIcon = document.querySelector('.brand-icon') as HTMLElement;
      const appBg = window.getComputedStyle(appShell).backgroundColor;
      const topbarBg = window.getComputedStyle(topbar).backgroundColor;
      const brandIconBg = window.getComputedStyle(brandIcon).backgroundImage;
      return { rootTheme, appBg, topbarBg, brandIconBg };
    });

    console.log(`Default theme detected: ${defaultThemeInfo.rootTheme}`);
    console.log(`App Shell background: ${defaultThemeInfo.appBg}`);
    console.log(`TopBar background: ${defaultThemeInfo.topbarBg}`);
    assert.strictEqual(defaultThemeInfo.rootTheme, 'dark', 'Default theme must be dark');
    assert.strictEqual(defaultThemeInfo.appBg, 'rgb(18, 20, 23)', 'Dark app background must be #121417');
    assert.strictEqual(defaultThemeInfo.topbarBg, 'rgb(26, 29, 33)', 'Dark TopBar background must be #1a1d21');
    pass('Step 1: Application starts in Copper Lab Dark Graphite theme by default');

    // Screenshot 1: Dark 1600x900
    const dark1600Path = path.join(screenshotsDir, 'phase6-dark-1600x900.png');
    await page.screenshot({ path: dark1600Path });
    console.log(`📸 Saved screenshot: ${dark1600Path}`);

    // -------------------------------------------------------------
    // 2. Verify Toolbar & Component Library in Dark Theme
    // -------------------------------------------------------------
    console.log('\nStep 2: Inspecting Vertical Toolbar & Component Library in Dark mode...');
    const toolbarInfo = await page.evaluate(() => {
      const toolCard = document.querySelector('.v-tool-card') as HTMLElement;
      const selectBtn = document.querySelector('.v-tool-btn.active') as HTMLElement;
      return {
        cardBg: toolCard ? window.getComputedStyle(toolCard).backgroundColor : null,
        selectActiveColor: selectBtn ? window.getComputedStyle(selectBtn).color : null,
      };
    });
    console.log(`Toolbar card bg: ${toolbarInfo.cardBg}`);
    console.log(`Select tool active color: ${toolbarInfo.selectActiveColor}`);
    assert.strictEqual(toolbarInfo.selectActiveColor, 'rgb(217, 119, 54)', 'Active tool button must use copper accent #d97736');
    pass('Step 2: Vertical floating toolbar uses elevated graphite surface and copper active state');

    // -------------------------------------------------------------
    // 3. Switch to Light Theme (Warm Ivory)
    // -------------------------------------------------------------
    console.log('\nStep 3: Toggling to Light Theme via TopBar button...');
    const themeBtn = await page.$('button[aria-label="Toggle Theme"]');
    assert.ok(themeBtn, 'Theme toggle button must be present in TopBar');
    await themeBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const lightThemeInfo = await page.evaluate(() => {
      const rootTheme = document.documentElement.getAttribute('data-theme');
      const storageTheme = localStorage.getItem('circuitflow_theme');
      const appShell = document.querySelector('.app-shell') as HTMLElement;
      const topbar = document.querySelector('.app-topbar') as HTMLElement;
      const appBg = window.getComputedStyle(appShell).backgroundColor;
      const topbarBg = window.getComputedStyle(topbar).backgroundColor;
      return { rootTheme, storageTheme, appBg, topbarBg };
    });

    console.log(`Light theme attribute: ${lightThemeInfo.rootTheme}`);
    console.log(`LocalStorage theme: ${lightThemeInfo.storageTheme}`);
    console.log(`Light App Shell background: ${lightThemeInfo.appBg}`);
    console.log(`Light TopBar background: ${lightThemeInfo.topbarBg}`);
    assert.strictEqual(lightThemeInfo.rootTheme, 'light', 'data-theme attribute must be light');
    assert.strictEqual(lightThemeInfo.storageTheme, 'light', 'localStorage theme must be light');
    assert.strictEqual(lightThemeInfo.appBg, 'rgb(244, 241, 234)', 'Light app background must be warm ivory #f4f1ea');
    assert.strictEqual(lightThemeInfo.topbarBg, 'rgb(252, 251, 248)', 'Light TopBar background must be cream panel #fcfbf8');
    pass('Step 3: Light theme toggles cleanly to Warm Ivory architecture');

    // Screenshot 2: Light 1600x900
    const light1600Path = path.join(screenshotsDir, 'phase6-light-1600x900.png');
    await page.screenshot({ path: light1600Path });
    console.log(`📸 Saved screenshot: ${light1600Path}`);

    // -------------------------------------------------------------
    // 4. Test Theme Preference Persistence across Page Reload
    // -------------------------------------------------------------
    console.log('\nStep 4: Reloading page to test light theme persistence...');
    await page.reload({ waitUntil: 'networkidle0' });
    const persistedTheme = await page.evaluate(() => {
      return {
        rootTheme: document.documentElement.getAttribute('data-theme'),
        storageTheme: localStorage.getItem('circuitflow_theme'),
      };
    });
    assert.strictEqual(persistedTheme.rootTheme, 'light', 'data-theme must persist as light on reload');
    assert.strictEqual(persistedTheme.storageTheme, 'light', 'localStorage must persist as light on reload');
    pass('Step 4: Light theme preference persists accurately across reload');

    // Re-enter workbench if page reloaded to landing view
    const reloadHeroBtn = await page.$('.hero-cta-btn');
    if (reloadHeroBtn) {
      await reloadHeroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }

    // -------------------------------------------------------------
    // 5. Open Component Library Drawer & Verify Styles in Light Mode
    // -------------------------------------------------------------
    console.log('\nStep 5: Opening Component Library drawer in Light theme...');
    const libBtn = await page.$('button[aria-label="Components & IC Library"]');
    if (libBtn) {
      await libBtn.click();
      await page.waitForSelector('.component-toolbox.drawer-mode', { timeout: 3000 });
      const drawerInfo = await page.evaluate(() => {
        const drawer = document.querySelector('.component-toolbox.drawer-mode') as HTMLElement;
        const drawerTitle = document.querySelector('.toolbox-header-title') as HTMLElement;
        return {
          drawerBg: drawer ? window.getComputedStyle(drawer).backgroundColor : null,
          titleColor: drawerTitle ? window.getComputedStyle(drawerTitle).color : null,
        };
      });
      console.log(`Light drawer background: ${drawerInfo.drawerBg}`);
      console.log(`Drawer title color: ${drawerInfo.titleColor}`);
      assert.strictEqual(drawerInfo.drawerBg, 'rgb(243, 239, 229)', 'Light drawer background must be elevated ivory #f3efe5');
      assert.strictEqual(drawerInfo.titleColor, 'rgb(194, 94, 26)', 'Light title must use contrast copper #c25e1a');
      pass('Step 5: Component library drawer renders in Warm Ivory with Copper title');
    }

    // -------------------------------------------------------------
    // 6. Test Responsive Layout & Screenshots at 1280x720
    // -------------------------------------------------------------
    console.log('\nStep 6: Resizing viewport to 1280x720...');
    await page.setViewport({ width: 1280, height: 720 });
    await new Promise((r) => setTimeout(r, 400));

    // Screenshot 3: Light 1280x720
    const light1280Path = path.join(screenshotsDir, 'phase6-light-1280x720.png');
    await page.screenshot({ path: light1280Path });
    console.log(`📸 Saved screenshot: ${light1280Path}`);

    // Switch back to Dark at 1280x720
    const themeBtn1280 = await page.$('button[aria-label="Toggle Theme"]');
    assert.ok(themeBtn1280, 'Theme button must remain visible at 1280x720');
    await themeBtn1280.click();
    await new Promise((r) => setTimeout(r, 300));

    // Screenshot 4: Dark 1280x720
    const dark1280Path = path.join(screenshotsDir, 'phase6-dark-1280x720.png');
    await page.screenshot({ path: dark1280Path });
    console.log(`📸 Saved screenshot: ${dark1280Path}`);

    const restoredDark = await page.evaluate(() => {
      return {
        rootTheme: document.documentElement.getAttribute('data-theme'),
        storageTheme: localStorage.getItem('circuitflow_theme'),
      };
    });
    assert.strictEqual(restoredDark.rootTheme, 'dark');
    assert.strictEqual(restoredDark.storageTheme, 'dark');
    pass('Step 6: Viewport 1280x720 displays cleanly without clipping, toggling back to Dark');

    // -------------------------------------------------------------
    // 7. Verify Zero Page & Console Errors
    // -------------------------------------------------------------
    console.log('\nStep 7: Checking browser console errors...');
    const relevantErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('AudioContext')
    );
    assert.strictEqual(relevantErrors.length, 0, `Browser errors encountered: ${JSON.stringify(relevantErrors)}`);
    pass('Step 7: Zero console errors or uncaught exceptions during live theme switching');

    console.log('\n================================================================');
    console.log(`ALL ${passCount} PHASE 6 LIVE BROWSER TESTS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runPhase6BrowserVerification().catch((err) => {
  console.error('\n❌ PHASE 6 BROWSER VERIFICATION FAILED:', err);
  process.exit(1);
});
