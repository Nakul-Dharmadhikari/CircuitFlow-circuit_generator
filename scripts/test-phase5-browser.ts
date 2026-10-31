import puppeteer, { Browser, Page } from 'puppeteer-core';

async function runPhase5BrowserVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 5: LIVE BROWSER VERIFICATION SUITE');
  console.log('Testing: Navigation & UX Restructuring at 1600x900 and 1280x720');
  console.log('================================================================\n');

  const browser: Browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1600,900',
      '--disable-gpu',
    ],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });

  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // Step 1: Navigate to app
    console.log('Step 1: Navigating to CircuitFlow Workbench...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const openSimBtn = await page.$('.hero-cta-btn');
    if (openSimBtn) {
      await openSimBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }
    console.log('✔ Workbench loaded successfully');

    // Step 2: Verify the 4 Primary Activity Menus in TopBar
    console.log('\nStep 2: Testing Four Primary Activity Menus in TopBar...');
    const menuButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.menu-item-btn'));
      return btns.map((b) => b.textContent?.trim());
    });
    console.log('  Top menu buttons found:', menuButtons);

    const hasProjects = menuButtons.some((b) => b?.includes('Projects'));
    const hasBuild = menuButtons.some((b) => b?.includes('Build'));
    const hasSimulate = menuButtons.some((b) => b?.includes('Simulate'));
    const hasAnalyze = menuButtons.some((b) => b?.includes('Analyze'));

    if (!hasProjects || !hasBuild || !hasSimulate || !hasAnalyze) {
      throw new Error(`Top menu missing one of 4 primary activities! Found: ${JSON.stringify(menuButtons)}`);
    }
    console.log('✔ Verified: All four primary activities (Projects, Build, Simulate, Analyze) present');

    // Test Projects Dropdown
    const projectsBtn = await page.$('.menu-item-wrapper:first-child .menu-item-btn');
    if (projectsBtn) {
      await projectsBtn.click();
      await page.waitForSelector('.menu-dropdown', { timeout: 2000 });
      const projectItems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.menu-dropdown .dropdown-item')).map((d) => d.textContent?.trim());
      });
      console.log('  Projects dropdown items:', projectItems.slice(0, 5));
      if (!projectItems.some((t) => t?.includes('Export Circuit JSON')) || !projectItems.some((t) => t?.includes('Import Circuit JSON'))) {
        throw new Error('Projects dropdown missing Export/Import JSON!');
      }
      await projectsBtn.click(); // close
    }

    // Test Build Dropdown (contains Custom IC Packaging Builder)
    const buildBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('.menu-item-btn')).find((b) => b.textContent?.includes('Build')) as HTMLButtonElement;
    });
    if (buildBtn) {
      await (buildBtn as any).click();
      await page.waitForSelector('.menu-dropdown', { timeout: 2000 });
      const buildItems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.menu-dropdown .dropdown-item')).map((d) => d.textContent?.trim());
      });
      console.log('  Build dropdown items:', buildItems.slice(0, 5));
      if (!buildItems.some((t) => t?.includes('Custom IC'))) {
        throw new Error('Build dropdown missing Custom IC Packaging Builder!');
      }
      await (buildBtn as any).click(); // close
    }

    // Step 3: Test Left Rail Tools (VerticalToolbar)
    console.log('\nStep 3: Testing Compact Left Rail Tools...');
    const leftTools = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.vertical-floating-toolbar .v-tool-btn'));
      return btns.map((b) => b.getAttribute('title') || b.getAttribute('aria-label') || '');
    });
    console.log('  Left rail tools found:', leftTools.length, 'tools');
    const hasSelect = leftTools.some((t) => t.includes('Select'));
    const hasWire = leftTools.some((t) => t.includes('Wire'));
    const hasPan = leftTools.some((t) => t.includes('Pan'));
    const hasComponents = leftTools.some((t) => t.includes('Components'));

    if (!hasSelect || !hasWire || !hasPan || !hasComponents) {
      throw new Error(`Left tool rail missing primary tools! Found: ${JSON.stringify(leftTools)}`);
    }
    console.log('✔ Verified: Left tool rail prioritizes Select, Wire, Pan, and Components');

    // Step 4: Test Component Library Drawer, Category Pills, and Search
    console.log('\nStep 4: Testing Component Library Drawer, Categories & Search...');
    const compToggle = await page.$('button[title*="Components & IC Library"]');
    if (compToggle) {
      await compToggle.click();
      await page.waitForSelector('.component-toolbox', { timeout: 2000 });
    }

    // Check category pills
    const categoryPills = await page.evaluate(() => {
      const pills = Array.from(document.querySelectorAll('.cat-pill-btn'));
      return pills.map((p) => p.textContent?.trim());
    });
    console.log('  Category filter pills found:', categoryPills);
    if (!categoryPills.some((p) => p?.includes('Basic Gates')) || !categoryPills.some((p) => p?.includes('Sequential'))) {
      throw new Error(`Missing expected category pills: ${JSON.stringify(categoryPills)}`);
    }
    console.log('✔ Verified: Category filter pills present and functional');

    // Search for "7408"
    const searchInput = await page.$('.toolbox-search');
    if (searchInput) {
      await searchInput.type('7408');
      await new Promise((r) => setTimeout(r, 200));
      const searchResults = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.component-card .card-label'));
        return cards.map((c) => c.textContent?.trim());
      });
      console.log('  Search results for "7408":', searchResults);
      if (!searchResults.some((r) => r?.includes('7408'))) {
        throw new Error('Search for "7408" failed to find 7408 IC!');
      }
      console.log('✔ Verified: Component search for "7408" located relevant IC');
    }

    // Close library
    if (compToggle) {
      await compToggle.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // Step 5: Test Contextual Inspector
    console.log('\nStep 5: Testing Contextual Inspector...');
    const inspectorTitle = await page.evaluate(() => {
      const title = document.querySelector('.properties-panel .panel-header-title');
      return title?.textContent?.trim();
    });
    console.log('  Default Inspector view:', inspectorTitle);
    if (!inspectorTitle?.includes('CIRCUIT OVERVIEW')) {
      throw new Error(`Default inspector should show CIRCUIT OVERVIEW, got: ${inspectorTitle}`);
    }
    console.log('✔ Verified: Unselected state displays Circuit Overview');

    // Step 6: Test Responsive Viewport at 1280x720
    console.log('\nStep 6: Testing Viewport at 1280x720 (Zero Overflow)...');
    await page.setViewport({ width: 1280, height: 720 });
    await new Promise((r) => setTimeout(r, 300));

    const layout1280 = await page.evaluate(() => {
      const topbar = document.querySelector('.app-topbar') as HTMLElement | null;
      const topbarWidth = topbar?.getBoundingClientRect().width || 0;
      const scrollW = document.documentElement.scrollWidth;
      const scrollH = document.documentElement.scrollHeight;
      return {
        topbarWidth,
        scrollW,
        scrollH,
        fitsWidth: topbarWidth <= 1280,
        noPageScroll: scrollW <= 1280 && scrollH <= 720,
      };
    });
    console.log('  Layout metrics at 1280x720:', layout1280);
    if (!layout1280.fitsWidth || !layout1280.noPageScroll) {
      throw new Error(`Layout overflow at 1280x720! ${JSON.stringify(layout1280)}`);
    }
    console.log('✔ Verified: TopBar fits 1280px viewport and page has ZERO horizontal/vertical overflow');

    // Step 7: Verify Console Errors
    console.log('\nStep 7: Verifying Console Errors...');
    console.log('  Total console errors:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
      throw new Error(`Console errors detected during Phase 5 run: ${consoleErrors.join(', ')}`);
    }
    console.log('✔ ZERO browser console errors detected');

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 5 LIVE BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

runPhase5BrowserVerification().catch((err) => {
  console.error('\n❌ Phase 5 browser test failed:', err);
  process.exit(1);
});
