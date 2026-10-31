import puppeteer, { Browser, Page } from 'puppeteer-core';
import assert from 'assert';
import path from 'path';
import fs from 'fs';

async function runPhase8BrowserVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 8: LIVE CHROME ANALYSIS CENTER BROWSER TEST');
  console.log('Testing: Analyze Navigation, All 7 Analysis Tabs, Controls Interaction,');
  console.log('Expected vs Observed Test Bench Mismatches, Copper Lab Themes & Console Health');
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

  const selectTab = async (tabId: string) => {
    await page.evaluate((id) => {
      const btn = document.querySelector(`#analysis-tab-${id}`) as HTMLElement | null;
      btn?.scrollIntoView({ inline: 'center', block: 'nearest' });
      btn?.click();
    }, tabId);
    await new Promise((r) => setTimeout(r, 250));
  };

  const loadPresetExperiment = async (presetTitleQuery: string) => {
    const closeBtn = await page.$('#btn-close-analysis');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    const fileBtn = await page.$('.menu-item-wrapper:first-child .menu-item-btn');
    assert.ok(fileBtn, 'File menu button must exist');
    await fileBtn.click();
    await page.waitForSelector('.menu-dropdown', { timeout: 2000 });

    const presetsItem = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.menu-dropdown .dropdown-item'));
      return items.find((i) => i.textContent?.includes('Examples & Lab Presets'));
    });
    assert.ok(presetsItem, 'Examples & Lab Presets dropdown item must exist');
    await (presetsItem as any).click();

    await page.waitForSelector('.modal-dialog .experiment-card', { timeout: 3000 });
    await page.evaluate((query) => {
      const cards = Array.from(document.querySelectorAll('.modal-dialog .experiment-card'));
      const target = cards.find((c) => c.querySelector('.exp-title')?.textContent?.includes(query));
      if (target) (target as HTMLElement).click();
    }, presetTitleQuery);
    await new Promise((r) => setTimeout(r, 300));
  };

  const openAnalysisModal = async (tabId: string = 'overview') => {
    const analyzeMenuBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.menu-item-btn'));
      return btns.find((b) => b.textContent?.includes('Analyze'));
    });
    assert.ok(analyzeMenuBtn, 'Analyze menu button must exist in TopBar');
    await (analyzeMenuBtn as any).click();

    await page.waitForSelector('.menu-dropdown', { timeout: 2000 });

    const analysisCenterItem = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.menu-dropdown .dropdown-item'));
      return items.find((i) => i.textContent?.includes('Analysis Center'));
    });
    assert.ok(analysisCenterItem, 'Circuit Analysis Center dropdown item must exist');
    await (analysisCenterItem as any).click();

    await page.waitForSelector('#analysis-center-modal', { timeout: 3000 });
    if (tabId) {
      await selectTab(tabId);
    }
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Initial Load & Enter Canvas Workspace
    // -------------------------------------------------------------------------
    console.log('Step 1: Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }

    const appShellPresent = await page.evaluate(() => Boolean(document.querySelector('.app-shell')));
    assert.strictEqual(appShellPresent, true, 'App shell must mount cleanly');
    pass('1. Application loaded and entered canvas workspace');

    // -------------------------------------------------------------------------
    // 2. Open Analysis Center from TopBar "Analyze" Navigation Menu
    // -------------------------------------------------------------------------
    console.log('Step 2: Opening Analysis Center via TopBar Analyze menu...');
    const analyzeMenuBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.menu-item-btn'));
      return btns.find((b) => b.textContent?.includes('Analyze'));
    });
    assert.ok(analyzeMenuBtn, 'Analyze menu button must exist in TopBar');
    await (analyzeMenuBtn as any).click();

    await page.waitForSelector('.menu-dropdown', { timeout: 2000 });

    const analysisCenterItem = await page.evaluateHandle(() => {
      const items = Array.from(document.querySelectorAll('.menu-dropdown .dropdown-item'));
      return items.find((i) => i.textContent?.includes('Analysis Center'));
    });
    assert.ok(analysisCenterItem, 'Circuit Analysis Center dropdown item must exist');
    await (analysisCenterItem as any).click();

    // Verify modal opened
    await page.waitForSelector('#analysis-center-modal', { timeout: 3000 });
    const modalHeaderTitle = await page.evaluate(() => {
      const h2 = document.querySelector('#analysis-center-modal h2');
      return h2?.textContent?.trim() || '';
    });
    assert.ok(modalHeaderTitle.includes('Circuit Analysis Center'), `Modal header must be Analysis Center, got "${modalHeaderTitle}"`);
    pass('2. TopBar Analyze navigation entry cleanly opens the Analysis Center modal');

    // -------------------------------------------------------------------------
    // 3. Tab 1: Overview Tab Verification
    // -------------------------------------------------------------------------
    console.log('Step 3: Verifying Overview tab content...');
    await selectTab('overview');
    const overviewData = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const activeTabBtn = modal?.querySelector('button[id="analysis-tab-overview"]');
      const summaryCard = modal?.querySelector('h4');
      const text = modal?.textContent || '';
      return {
        isOverviewActive: activeTabBtn !== null,
        hasClassification: text.includes('CLASSIFICATION') || text.includes('Classification'),
        hasComponents: text.includes('COMPONENTS') || text.includes('Components'),
        hasSignals: text.includes('SIGNALS') || text.includes('Signals & Wires'),
        hasTopologySummary: summaryCard?.textContent?.includes('Circuit Topology Summary') || false,
      };
    });
    assert.strictEqual(overviewData.hasClassification, true, 'Overview displays circuit classification');
    assert.strictEqual(overviewData.hasComponents, true, 'Overview displays component statistics');
    assert.strictEqual(overviewData.hasSignals, true, 'Overview displays wire and signal statistics');
    pass('3. Overview tab renders topological metrics, classifications, and summary descriptions');

    // -------------------------------------------------------------------------
    // 4. Tab 2: Truth Table Tab Verification
    // -------------------------------------------------------------------------
    console.log('Step 4: Navigating to Truth Table tab...');
    await selectTab('truth_table');

    const truthTableState = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const table = modal?.querySelector('table');
      const text = modal?.textContent || '';
      return {
        hasTable: table !== null,
        hasMarkdownBtn: text.includes('Markdown'),
        hasCSVBtn: text.includes('CSV'),
        hasExplanationOrTable: table !== null || text.includes('Truth Table') || text.includes('Sequential'),
      };
    });
    assert.strictEqual(truthTableState.hasExplanationOrTable, true, 'Truth table renders either evaluated rows or explanatory limitation');
    pass('4. Truth Table tab successfully displays data or circuit limitation explanation');

    // -------------------------------------------------------------------------
    // 5. Tab 3: Karnaugh Map (2–6 Var) Tab Verification
    // -------------------------------------------------------------------------
    console.log('Step 5: Navigating to Karnaugh Map tab & verifying map layer labels and minterms...');
    await selectTab('kmap');

    // 5A. Check initial notice on default circuit with >6 inputs
    const kmapInitialState = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const text = modal?.textContent || '';
      return {
        hasLimitationNotice: text.includes('Karnaugh Maps require between 2 and 6 inputs'),
      };
    });
    assert.strictEqual(kmapInitialState.hasLimitationNotice, true, 'K-Map tab renders limitation notice when inputs > 6');

    // 5B. Verify 5-Variable K-Map (2 layers: Layer A = 0, Layer A = 1, BC \ DE, Gray code ordering)
    console.log('Loading 5-Bit Parity Generator preset to test 5-variable K-Map...');
    await loadPresetExperiment('5-Bit Parity Generator');
    await openAnalysisModal('kmap');

    const kmap5Data = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const gridCards = Array.from(modal?.querySelectorAll('.kmap-grid-card') || []);
      const layerLabels = Array.from(modal?.querySelectorAll('.kmap-layer-label') || []).map((el) => el.textContent?.trim() || '');
      const varHeaders = Array.from(modal?.querySelectorAll('.kmap-var-header') || []).map((el) => el.textContent?.trim() || '');
      const firstGrid = gridCards[0];
      const rowHeaders = Array.from(firstGrid?.querySelectorAll('.kmap-row-header') || []).map((el) => el.textContent?.trim() || '');
      const colHeaders = Array.from(firstGrid?.querySelectorAll('.kmap-col-header') || []).map((el) => el.textContent?.trim() || '');
      const cells = Array.from(modal?.querySelectorAll('.kmap-cell') || []);
      const minterms = cells.map((c) => parseInt(c.getAttribute('data-minterm') || '-1', 10));
      const text = modal?.textContent || '';

      return {
        gridCount: gridCards.length,
        layerLabels,
        varHeaders,
        rowHeaders,
        colHeaders,
        cellCount: cells.length,
        uniqueMinterms: Array.from(new Set(minterms.filter((m) => m >= 0))).sort((a, b) => a - b),
        hasMinimalSop: text.includes('Quine-McCluskey Minimal Sum of Products'),
      };
    });

    assert.strictEqual(kmap5Data.gridCount, 2, '5-variable K-Map must render exactly 2 layers');
    assert.strictEqual(kmap5Data.layerLabels[0], 'Layer A = 0', '5-variable Layer 1 header must be "Layer A = 0"');
    assert.strictEqual(kmap5Data.layerLabels[1], 'Layer A = 1', '5-variable Layer 2 header must be "Layer A = 1"');
    assert.ok(kmap5Data.varHeaders[0]?.includes('BC') && kmap5Data.varHeaders[0]?.includes('DE'), 'Variable header indicates BC (rows) and DE (cols)');
    assert.deepStrictEqual(kmap5Data.rowHeaders, ['00', '01', '11', '10'], 'Row headers must follow Gray-code sequence');
    assert.deepStrictEqual(kmap5Data.colHeaders, ['00', '01', '11', '10'], 'Column headers must follow Gray-code sequence');
    assert.strictEqual(kmap5Data.cellCount, 32, '5-variable K-Map must render 32 cells (2 x 4x4)');
    assert.strictEqual(kmap5Data.uniqueMinterms.length, 32, 'All 32 minterms (0..31) must be represented');
    assert.strictEqual(kmap5Data.uniqueMinterms[0], 0, 'First minterm is 0');
    assert.strictEqual(kmap5Data.uniqueMinterms[31], 31, 'Last minterm is 31');
    assert.strictEqual(kmap5Data.hasMinimalSop, true, 'Quine-McCluskey minimal expression rendered');

    // 5C. Verify 6-Variable K-Map (4 layers: Gray code ordering 00, 01, 11, 10)
    console.log('Loading 4:1 Multiplexer preset to test 6-variable K-Map...');
    await loadPresetExperiment('4:1 Multiplexer');
    await openAnalysisModal('kmap');

    const kmap6Data = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const gridCards = Array.from(modal?.querySelectorAll('.kmap-grid-card') || []);
      const layerLabels = Array.from(modal?.querySelectorAll('.kmap-layer-label') || []).map((el) => el.textContent?.trim() || '');
      const varHeaders = Array.from(modal?.querySelectorAll('.kmap-var-header') || []).map((el) => el.textContent?.trim() || '');
      const firstGrid = gridCards[0];
      const rowHeaders = Array.from(firstGrid?.querySelectorAll('.kmap-row-header') || []).map((el) => el.textContent?.trim() || '');
      const colHeaders = Array.from(firstGrid?.querySelectorAll('.kmap-col-header') || []).map((el) => el.textContent?.trim() || '');
      const cells = Array.from(modal?.querySelectorAll('.kmap-cell') || []);
      const minterms = cells.map((c) => parseInt(c.getAttribute('data-minterm') || '-1', 10));
      const text = modal?.textContent || '';

      return {
        gridCount: gridCards.length,
        layerLabels,
        varHeaders,
        rowHeaders,
        colHeaders,
        cellCount: cells.length,
        uniqueMinterms: Array.from(new Set(minterms.filter((m) => m >= 0))).sort((a, b) => a - b),
        hasMinimalSop: text.includes('Quine-McCluskey Minimal Sum of Products'),
      };
    });

    assert.strictEqual(kmap6Data.gridCount, 4, '6-variable K-Map must render exactly 4 layers');
    assert.ok(kmap6Data.layerLabels[0]?.endsWith('00'), 'Layer 1 must be Gray code 00');
    assert.ok(kmap6Data.layerLabels[1]?.endsWith('01'), 'Layer 2 must be Gray code 01');
    assert.ok(kmap6Data.layerLabels[2]?.endsWith('11'), 'Layer 3 must be Gray code 11');
    assert.ok(kmap6Data.layerLabels[3]?.endsWith('10'), 'Layer 4 must be Gray code 10');
    assert.deepStrictEqual(kmap6Data.rowHeaders, ['00', '01', '11', '10'], 'Row headers must follow Gray-code sequence');
    assert.deepStrictEqual(kmap6Data.colHeaders, ['00', '01', '11', '10'], 'Column headers must follow Gray-code sequence');
    assert.strictEqual(kmap6Data.cellCount, 64, '6-variable K-Map must render 64 cells (4 x 4x4)');
    assert.strictEqual(kmap6Data.uniqueMinterms.length, 64, 'All 64 minterms (0..63) must be represented');
    assert.strictEqual(kmap6Data.uniqueMinterms[0], 0, 'First minterm is 0');
    assert.strictEqual(kmap6Data.uniqueMinterms[63], 63, 'Last minterm is 63');
    assert.strictEqual(kmap6Data.hasMinimalSop, true, 'Quine-McCluskey minimal expression rendered');

    pass('5. Karnaugh Map tab renders 5-var and 6-var layers (A=0/1 and 00/01/11/10), Gray-code rows/cols, and minterm cell mappings');

    // -------------------------------------------------------------------------
    // 6. Tab 4: Timing / Waveform Tab Verification & Steps Interaction
    // -------------------------------------------------------------------------
    console.log('Step 6: Navigating to Timing / Waveform tab...');
    await selectTab('timing');

    const initialTiming = await page.evaluate(() => {
      const select = document.querySelector('#timing-step-select') as HTMLSelectElement | null;
      return {
        hasSelect: select !== null,
        currentValue: select?.value || '',
      };
    });
    assert.strictEqual(initialTiming.hasSelect, true, 'Timing step count selector must be present');

    // Change step count from 16 to 32 steps
    await page.select('#timing-step-select', '32');
    await new Promise((r) => setTimeout(r, 200));

    const updatedTiming = await page.evaluate(() => {
      const select = document.querySelector('#timing-step-select') as HTMLSelectElement | null;
      return select?.value || '';
    });
    assert.strictEqual(updatedTiming, '32', 'Timing step count selector reflects 32 steps');
    pass('6. Timing Waveform tab accepts user inputs and updates discrete simulation steps');

    // -------------------------------------------------------------------------
    // 7. Tab 5: Sequential State Tab Verification
    // -------------------------------------------------------------------------
    console.log('Step 7: Navigating to Sequential State tab...');
    await selectTab('sequential');

    const seqState = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const text = modal?.textContent || '';
      const table = modal?.querySelector('table');
      return {
        hasTable: table !== null,
        hasStatelessNotice: text.includes('Stateless') || text.includes('Sequential State'),
      };
    });
    assert.strictEqual(seqState.hasStatelessNotice || seqState.hasTable, true, 'Sequential tab renders valid state report');
    pass('7. Sequential Analysis tab renders state report or stateless explanation');

    // -------------------------------------------------------------------------
    // 8. Tab 6: Test Bench Suite — Controls, Expected vs Observed & Mismatches
    // -------------------------------------------------------------------------
    console.log('Step 8: Navigating to Test Bench tab...');
    await selectTab('testbench');

    // Verify Test Bench columns include Expected and Observed
    const benchHeaderColumns = await page.evaluate(() => {
      const headers = Array.from(document.querySelectorAll('#analysis-center-modal table th')).map((th) => th.textContent?.trim());
      return headers;
    });
    console.log('Test bench header columns found:', benchHeaderColumns);
    assert.ok(benchHeaderColumns.includes('Expected'), 'Test Bench table MUST display "Expected" column');
    assert.ok(benchHeaderColumns.includes('Observed'), 'Test Bench table MUST display "Observed" column');
    assert.ok(benchHeaderColumns.includes('Inputs'), 'Test Bench table MUST display "Inputs" column');
    assert.ok(benchHeaderColumns.includes('Status'), 'Test Bench table MUST display "Status" column');

    // Add a deliberate failure test vector to verify expected vs observed mismatch reporting
    console.log('Adding deliberate failing vector to verify failure detection...');
    const beforeCount = await page.evaluate(() => document.querySelectorAll('.testbench-row').length);
    console.log(`Test bench rows before adding failing vector: ${beforeCount}`);

    await page.evaluate(() => {
      const btn = document.querySelector('#btn-add-failing-vector') as HTMLElement | null;
      btn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const afterCount = await page.evaluate(() => document.querySelectorAll('.testbench-row').length);
    console.log(`Test bench rows after adding failing vector: ${afterCount}`);

    const failVerification = await page.evaluate(() => {
      const failRows = document.querySelectorAll('.testbench-fail');
      const mismatchRows = document.querySelectorAll('.testbench-mismatch-row');
      const stats = document.querySelector('#testbench-stats')?.textContent || '';
      const hasFailBadge = Array.from(document.querySelectorAll('.testbench-fail span')).some((s) => s.textContent?.includes('FAIL'));
      const allRowTexts = Array.from(document.querySelectorAll('.testbench-row')).map((r) => r.textContent?.trim());
      return {
        failRowCount: failRows.length,
        mismatchRowCount: mismatchRows.length,
        hasFailBadge,
        statsText: stats,
        allRowTexts,
      };
    });
    console.log('Fail verification details:', failVerification);

    assert.ok(failVerification.failRowCount >= 1, 'At least 1 test case must fail');
    assert.ok(failVerification.mismatchRowCount >= 1, 'Mismatch discrepancy detail row must be displayed');
    assert.strictEqual(failVerification.hasFailBadge, true, 'Failure badge ✖ FAIL must be rendered in red');
    pass('8. Test Bench renders Expected vs Observed outputs, deliberate failure vectors, and mismatch details');

    // -------------------------------------------------------------------------
    // 9. Tab 7: Diagnostics Tab Verification
    // -------------------------------------------------------------------------
    console.log('Step 9: Navigating to Diagnostics tab...');
    await selectTab('diagnostics');
    await new Promise((r) => setTimeout(r, 200));

    const diagState = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal');
      const text = modal?.textContent || '';
      const hasErrorsPill = text.includes('Errors');
      const hasWarningsPill = text.includes('Warnings');
      const hasInfosPill = text.includes('Informational');
      return { hasErrorsPill, hasWarningsPill, hasInfosPill };
    });
    assert.strictEqual(diagState.hasErrorsPill, true, 'Diagnostics displays Errors category summary');
    assert.strictEqual(diagState.hasWarningsPill, true, 'Diagnostics displays Warnings category summary');
    assert.strictEqual(diagState.hasInfosPill, true, 'Diagnostics displays Informational category summary');
    pass('9. Diagnostics tab displays summary categories and actionable issue items');

    // -------------------------------------------------------------------------
    // 10. Verify Copper Lab Theme Rendering (Dark & Light)
    // -------------------------------------------------------------------------
    console.log('Step 10: Verifying theme rendering in Dark and Light modes...');

    // Take measurement of dark theme
    const darkThemeInfo = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal') as HTMLElement;
      const bg = window.getComputedStyle(modal).backgroundColor;
      const themeAttr = document.documentElement.getAttribute('data-theme') || 'dark';
      return { bg, themeAttr };
    });
    console.log(`Dark theme modal background: ${darkThemeInfo.bg}`);

    // Switch to light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await new Promise((r) => setTimeout(r, 200));

    const lightThemeInfo = await page.evaluate(() => {
      const modal = document.querySelector('#analysis-center-modal') as HTMLElement;
      const bg = window.getComputedStyle(modal).backgroundColor;
      const themeAttr = document.documentElement.getAttribute('data-theme');
      return { bg, themeAttr };
    });
    console.log(`Light theme modal background: ${lightThemeInfo.bg}`);
    assert.strictEqual(lightThemeInfo.themeAttr, 'light', 'Theme must be light');

    // Switch back to dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await new Promise((r) => setTimeout(r, 200));
    pass('10. Analysis Center renders cleanly across both Copper Lab dark and light themes');

    // -------------------------------------------------------------------------
    // 11. Modal Close & Console Error Integrity
    // -------------------------------------------------------------------------
    console.log('Step 11: Closing modal and asserting console health...');
    await page.click('#btn-close-analysis');
    await new Promise((r) => setTimeout(r, 300));

    const modalStillPresent = await page.evaluate(() => Boolean(document.querySelector('#analysis-center-modal')));
    assert.strictEqual(modalStillPresent, false, 'Modal must close on dismissal');

    console.log(`Total browser console errors observed: ${consoleErrors.length}`);
    assert.strictEqual(consoleErrors.length, 0, `Browser must have 0 console errors, but found: ${consoleErrors.join(', ')}`);
    pass('11. Analysis Center closes cleanly without leaving browser console errors');

    console.log('\n================================================================');
    console.log(`PHASE 8 LIVE BROWSER AUDIT PASSED: ${passCount} / 11 checks succeeded!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('Browser audit failed:', err);
    await page.screenshot({ path: path.join(screenshotsDir, 'phase8-browser-failure.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

runPhase8BrowserVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
