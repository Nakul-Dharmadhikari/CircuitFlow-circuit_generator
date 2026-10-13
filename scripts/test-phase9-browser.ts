import puppeteer, { Browser, Page } from 'puppeteer-core';
import assert from 'assert';
import path from 'path';
import fs from 'fs';

async function runPhase9BrowserVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 9: STUDENT EXPERIENCE & GUIDED LABS BROWSER TEST');
  console.log('Testing: First-Use Onboarding Tour, Empty State HUD, Pre-Built Labs Hub,');
  console.log('Guided Lab Assistant, Checkpoint Tasks, Analysis Deep Links & Themes');
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
  await page.setViewport({ width: 1600, height: 900 });

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
    // -------------------------------------------------------------------------
    // Step 1: Navigate to app and enter simulator
    // -------------------------------------------------------------------------
    console.log('Step 1: Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Enter workbench from landing page
    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }
    pass('Successfully entered Simulator Workbench');

    // -------------------------------------------------------------------------
    // Step 2: Test Interactive Onboarding Tour (First-Use & Re-Openable)
    // -------------------------------------------------------------------------
    console.log('\nStep 2: Testing Onboarding Tour walkthrough...');
    // Verify first-use auto-presentation if not yet completed
    let tourCard = await page.$('.onboarding-tour-card');
    if (!tourCard) {
      const tourBtn = await page.$('.tour-quick-btn');
      assert.ok(tourBtn, 'TopBar Tour quick button must exist');
      await tourBtn.click();
      await page.waitForSelector('.onboarding-tour-card', { timeout: 3000 });
      await new Promise((r) => setTimeout(r, 250));
    }

    const tourTitle = await page.$eval('.onboarding-tour-title', (el) => el.textContent?.trim());
    assert.ok(tourTitle?.includes('CircuitFlow'), `Expected Welcome title, got: ${tourTitle}`);
    pass('Onboarding Tour displayed initial Welcome step');

    // Step forward using Next button
    await page.waitForSelector('.onboarding-next-btn', { timeout: 2000 });
    await page.click('.onboarding-next-btn');
    await new Promise((r) => setTimeout(r, 300));

    const step2Title = await page.$eval('.onboarding-tour-title', (el) => el.textContent?.trim());
    assert.ok(step2Title?.includes('Component Library'), `Expected Component Library step, got: ${step2Title}`);
    pass('Navigated to Step 2: Component Library & IC Studio');

    // Step backward using Back button
    await page.waitForSelector('.onboarding-prev-btn', { timeout: 2000 });
    await page.click('.onboarding-prev-btn');
    await new Promise((r) => setTimeout(r, 300));

    const backStepTitle = await page.$eval('.onboarding-tour-title', (el) => el.textContent?.trim());
    assert.ok(backStepTitle?.includes('CircuitFlow'), 'Back button successfully returned to Welcome step');
    pass('Back navigation verified cleanly');

    // Dismiss tour using Skip button
    const skipBtn = await page.$('.onboarding-btn.secondary');
    assert.ok(skipBtn, 'Skip Walkthrough button must exist');
    await skipBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const tourClosed = await page.evaluate(() => !document.querySelector('.onboarding-tour-card'));
    assert.ok(tourClosed, 'Tour card must close on Skip');

    // Verify localStorage completion persistence
    const isCompletedInStorage = await page.evaluate(() => localStorage.getItem('circuitflow_onboarding_completed'));
    assert.strictEqual(isCompletedInStorage, 'true', 'Onboarding completed flag must be saved in localStorage');
    pass('Onboarding completion persisted to localStorage');

    // Test re-opening the tour via the TopBar Tour button
    const reOpenTourBtn = await page.$('.tour-quick-btn');
    assert.ok(reOpenTourBtn, 'Tour button must exist for re-opening');
    await reOpenTourBtn.click();
    await page.waitForSelector('.onboarding-tour-card', { timeout: 3000 });
    pass('Successfully re-opened Onboarding Tour via TopBar Tour button');

    // Dismiss re-opened tour with Escape key
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));
    const dismissedViaEsc = await page.evaluate(() => !document.querySelector('.onboarding-tour-card'));
    assert.ok(dismissedViaEsc, 'Tour successfully dismissed with Escape hotkey');
    pass('Keyboard Escape dismissed tour smoothly');

    // -------------------------------------------------------------------------
    // Step 3: Test Schematic Canvas Empty State HUD
    // -------------------------------------------------------------------------
    console.log('\nStep 3: Testing Canvas Empty State HUD...');
    // Switch to Schematic view
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.nav-tab-btn, .view-mode-btn, button'));
      const t = tabs.find((el) => el.textContent?.trim().includes('Schematic'));
      if (t) (t as HTMLElement).click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.waitForSelector('.canvas-empty-state-overlay', { timeout: 4000 });
    const emptyStatePresent = await page.$('.canvas-empty-state-overlay');
    assert.ok(emptyStatePresent, 'Canvas Empty State overlay must be rendered when schematic is empty');

    const emptyTitle = await page.$eval('.empty-state-title', (el) => el.textContent?.trim());
    assert.ok(emptyTitle?.includes('Ready'), `Empty state title expected, got: ${emptyTitle}`);

    const actionCardsCount = await page.$$eval('.empty-action-card', (cards) => cards.length);
    assert.ok(actionCardsCount >= 3, `Expected at least 3 quick-action cards, got ${actionCardsCount}`);
    pass('Canvas Empty State HUD renders with functional quick action cards');

    // -------------------------------------------------------------------------
    // Step 4: Test Pre-Built Labs & Courseware Hub Modal
    // -------------------------------------------------------------------------
    console.log('\nStep 4: Testing Pre-Built Labs Hub modal...');
    // Click Pre-Built Labs quick action card from the Empty State HUD
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.empty-action-card'));
      const c = cards.find((el) => el.textContent?.includes('Pre-Built Labs'));
      if (c) (c as HTMLElement).click();
    });

    await page.waitForSelector('.lab-curriculum-modal', { timeout: 3000 });
    pass('Pre-Built Labs Curriculum Hub modal opened');

    // Check category pills
    const categoryPills = await page.$$eval('.lab-category-pill', (pills) =>
      pills.map((p) => p.textContent?.trim() || '')
    );
    assert.ok(categoryPills.length >= 4, `Expected at least 4 category pills, got ${categoryPills.length}`);
    pass(`Category filter pills rendered (${categoryPills.length} categories)`);

    // Test Search input filtering
    const searchInput = await page.$('.lab-search-input');
    assert.ok(searchInput, 'Search input must exist in Labs Hub');
    await searchInput.type('Adder');
    await new Promise((r) => setTimeout(r, 200));

    const filteredTitles = await page.$$eval('.experiment-card-enhanced .exp-card-title', (els) =>
      els.map((e) => e.textContent?.trim())
    );
    assert.ok(
      filteredTitles.every((t) => t?.toLowerCase().includes('adder')),
      'All filtered experiments must match "Adder" search query'
    );
    pass('Keyword search accurately filters curriculum experiments');

    // Clear search
    const clearSearchBtn = await page.$('.lab-search-clear');
    if (clearSearchBtn) {
      await clearSearchBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // -------------------------------------------------------------------------
    // Step 5: Launch Guided Lab & Verify Lab Assistant
    // -------------------------------------------------------------------------
    console.log('\nStep 5: Launching Guided Lab: 1-Bit Half Adder...');
    // Find Half Adder card and click "Start Guided Lab"
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.experiment-card-enhanced'));
      const halfAdderCard = cards.find((c) => c.querySelector('.exp-card-title')?.textContent?.includes('Half Adder'));
      if (halfAdderCard) {
        const guidedBtn = halfAdderCard.querySelector('.exp-btn-guided') as HTMLElement | null;
        if (guidedBtn) guidedBtn.click();
      }
    });

    await page.waitForSelector('.guided-lab-assistant', { timeout: 3000 });
    pass('Guided Lab Assistant appeared on canvas');

    const labTitle = await page.$eval('.lab-title-text', (el) => el.textContent?.trim());
    assert.ok(labTitle?.includes('Half Adder'), `Expected Half Adder title, got: ${labTitle}`);

    // Verify learning objectives
    const objectivesCount = await page.$$eval('.lab-objectives-list li', (items) => items.length);
    assert.ok(objectivesCount >= 2, `Expected at least 2 objectives, got ${objectivesCount}`);
    pass(`Objectives listed in Assistant (${objectivesCount} items)`);

    // Verify tasks and check off first checkpoint
    const tasksCount = await page.$$eval('.lab-task-item', (items) => items.length);
    assert.ok(tasksCount >= 2, `Expected at least 2 tasks, got ${tasksCount}`);

    const firstCheckbox = await page.$('.lab-task-checkbox');
    assert.ok(firstCheckbox, 'Task checkbox must exist');
    await firstCheckbox.click();
    await new Promise((r) => setTimeout(r, 150));

    const scoreText = await page.$eval('.lab-completion-score', (el) => el.textContent?.trim());
    assert.ok(scoreText?.includes('1 /'), `Expected 1 completed task in score, got: ${scoreText}`);
    pass('Interactive task checkbox updated completion score');

    // Test Dynamic "Verify Current Circuit State" button
    const verifyBtn = await page.$('.lab-action-btn.verify-btn');
    assert.ok(verifyBtn, 'Verify Circuit button must exist');
    await verifyBtn.click();
    await page.waitForSelector('.lab-verify-result', { timeout: 3000 });

    const verifyMsg = await page.$eval('.lab-verify-result', (el) => el.textContent?.trim());
    assert.ok(verifyMsg?.includes('Half Adder Status'), `Expected Half Adder status message, got: ${verifyMsg}`);
    pass(`Dynamic verification executed: "${verifyMsg?.slice(0, 45)}..."`);

    // Test Theory Accordion
    const theoryToggle = await page.$('.lab-accordion-toggle');
    assert.ok(theoryToggle, 'Theory accordion toggle must exist');
    await theoryToggle.click();
    await page.waitForSelector('.lab-theory-content', { timeout: 1500 });
    pass('Theory accordion expanded with formula reference');

    // -------------------------------------------------------------------------
    // Step 6: Test Deep Link to Analysis Center
    // -------------------------------------------------------------------------
    console.log('\nStep 6: Testing deep-link to Analysis Center...');
    const analysisDeepLinkBtn = await page.$('.lab-footer-btn.analysis');
    assert.ok(analysisDeepLinkBtn, 'Open in Analysis Center button must exist in Assistant footer');
    await analysisDeepLinkBtn.click();

    await page.waitForSelector('#analysis-center-modal', { timeout: 3000 });
    pass('Analysis Center opened directly from Guided Lab Assistant');

    // Close Analysis Center
    const closeAnalysisBtn = await page.$('#btn-close-analysis');
    if (closeAnalysisBtn) {
      await closeAnalysisBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // -------------------------------------------------------------------------
    // Step 7: Test TopBar Active Lab Pill
    // -------------------------------------------------------------------------
    console.log('\nStep 7: Verifying TopBar Active Lab indicator...');
    const activeLabPill = await page.$('.active-lab-btn');
    assert.ok(activeLabPill, 'Active Lab pill must appear in TopBar when a lab is loaded');

    const pillText = await page.$eval('.active-lab-name-truncate', (el) => el.textContent?.trim());
    assert.ok(pillText?.includes('Half Adder'), `Active lab pill text expected Half Adder, got: ${pillText}`);
    pass('TopBar displays active guided lab indicator');

    // -------------------------------------------------------------------------
    // Step 8: Test Theme Toggling (Copper Lab Graphite & Warm Ivory)
    // -------------------------------------------------------------------------
    console.log('\nStep 8: Testing Theme switching with Phase 9 UI...');
    const themeBtn = await page.$('button[title*="Theme"]');
    if (themeBtn) {
      await themeBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const lightThemeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      assert.strictEqual(lightThemeAttr, 'light', 'Theme should switch to light');
      pass('Light theme (Warm Ivory) applied cleanly with Phase 9 components');

      // Switch back to dark theme
      await themeBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const darkThemeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      assert.strictEqual(darkThemeAttr, 'dark', 'Theme should switch back to dark');
      pass('Dark theme (Graphite Lab) restored cleanly');
    }

    // -------------------------------------------------------------------------
    // Step 9: Verify 0 Browser Console Errors
    // -------------------------------------------------------------------------
    console.log('\nStep 9: Auditing browser console health...');
    assert.strictEqual(consoleErrors.length, 0, `Expected 0 browser console errors, found: ${consoleErrors.join(', ')}`);
    pass('0 browser console errors or uncaught exceptions detected');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passCount} PHASE 9 BROWSER ACCEPTANCE TESTS PASSED!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Phase 9 browser test failure:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'phase9-failure.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

runPhase9BrowserVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
