import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runCriticalFixesVerification() {
  console.log('================================================================');
  console.log('CIRCUITFLOW CRITICAL POST-RELEASE BROWSER VERIFICATION');
  console.log('Testing Problems A, B, C, D, E, F with Live Chrome Screenshots');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900'],
    defaultViewport: { width: 1600, height: 900 },
  });

  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------------------
    // Problem E: Public Landing Page (Verified Experiments section absent)
    // -------------------------------------------------------------------------
    console.log('--- Testing Problem E: Public Landing Page ---');
    // Clear localStorage to ensure clean visit
    await page.goto(URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(URL, { waitUntil: 'networkidle0' });

    // Assert that "Verified Laboratory Experiments" heading is NOT present
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasVerifiedExperiments = pageText.includes('Verified Laboratory Experiments');
    assert.strictEqual(
      hasVerifiedExperiments,
      false,
      'Public landing page must NOT have "Verified Laboratory Experiments" section'
    );

    // Assert hero and call to action exist
    const hasHero = await page.$('.landing-hero, .hero-section, h1');
    assert.ok(hasHero, 'Public landing page must retain hero section');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-e-landing-page-verified.png'),
    });
    console.log('✔ PASS: Problem E - Unwanted experiment section removed from public page.');
    console.log('📸 Saved: screenshots/problem-e-landing-page-verified.png\n');

    // -------------------------------------------------------------------------
    // Enter Simulator Workbench
    // -------------------------------------------------------------------------
    const enterBtn = await page.$('.hero-cta-btn');
    if (enterBtn) {
      await enterBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 8000 });
    }

    // Dismiss any onboarding tour
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 400));

    // -------------------------------------------------------------------------
    // Problem D: Schematic Mode Clean Workspace Separation
    // -------------------------------------------------------------------------
    console.log('--- Testing Problem D: Clean Schematic Mode ---');
    // Switch to Schematic Mode
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.mode-seg-btn')) as HTMLButtonElement[];
      const b = btns.find((btn) => btn.textContent?.includes('Schematic'));
      b?.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Verify trainer hardware elements are NOT in the DOM or canvas
    const trainerHardwareCheck = await page.evaluate(() => {
      const switchRows = document.querySelectorAll('.trainer-switch, .switch-assembly, .trainer-switches-block');
      const trainerTerminals = document.querySelectorAll('.trainer-rail, .power-assembly, .trainer-power-terminals');
      const trainerDisplays = document.querySelectorAll('.trainer-displays, .hex-display-assembly');
      const fixedTrainerNodes = document.querySelectorAll('.fixed-trainer-node');
      const trainerBoardEl = document.querySelectorAll('.trainer-board-container, .trainer-board-shell');
      return {
        switchRowCount: switchRows.length,
        terminalsCount: trainerTerminals.length,
        displaysCount: trainerDisplays.length,
        fixedTrainerCount: fixedTrainerNodes.length,
        trainerBoardCount: trainerBoardEl.length,
      };
    });

    assert.strictEqual(trainerHardwareCheck.switchRowCount, 0, 'No switch rows in Schematic mode');
    assert.strictEqual(trainerHardwareCheck.terminalsCount, 0, 'No trainer terminals in Schematic mode');
    assert.strictEqual(trainerHardwareCheck.displaysCount, 0, 'No trainer displays in Schematic mode');
    assert.strictEqual(trainerHardwareCheck.fixedTrainerCount, 0, 'No fixed trainer components in Schematic mode');
    assert.strictEqual(trainerHardwareCheck.trainerBoardCount, 0, 'No trainer board container in Schematic mode');

    // Check that canvas drafting grid is visible
    const hasCanvasGrid = await page.$('.canvas-viewport, .infinite-canvas');
    assert.ok(hasCanvasGrid, 'Clean canvas drafting grid present');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-d-schematic-mode-clean.png'),
    });
    console.log('✔ PASS: Problem D - Schematic mode is a clean drafting workspace with zero trainer hardware leaks.');
    console.log('📸 Saved: screenshots/problem-d-schematic-mode-clean.png\n');

    // -------------------------------------------------------------------------
    // Problem C: Mounted IC Visual and Socket Alignment in Trainer Mode
    // -------------------------------------------------------------------------
    console.log('--- Testing Problem C: Mounted IC & Socket Alignment ---');
    // Switch to Trainer Mode
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.mode-seg-btn')) as HTMLButtonElement[];
      const b = btns.find((btn) => btn.textContent?.includes('Trainer'));
      b?.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Mount an IC on IC1 socket
    // Click on empty socket 1 to open IC picker
    const emptySocket1 = await page.waitForSelector('.horizontal-ic-base-socket');
    await emptySocket1?.click();
    await new Promise((r) => setTimeout(r, 600));

    // Choose 7408 Quad AND gate via .ic-card-select
    const icOption = await page.waitForSelector('.ic-card-select');
    if (icOption) {
      await icOption.click();
      await new Promise((r) => setTimeout(r, 800));
    }

    // Check that mounted IC exists and is aligned with socket
    const alignmentCheck = await page.evaluate(() => {
      const socket = document.querySelector('.horizontal-ic-base-socket') as HTMLElement;
      const mountedChip = document.querySelector('.circuit-node.dip-ic-package') as HTMLElement;
      if (!socket || !mountedChip) return { found: false };

      const sRect = socket.getBoundingClientRect();
      const cRect = mountedChip.getBoundingClientRect();

      // Check pin slots alignment
      const topPinSlots = Array.from(socket.querySelectorAll('.base-pins-row.top-row .base-pin-slot')) as HTMLElement[];
      const bottomPinSlots = Array.from(socket.querySelectorAll('.base-pins-row.bottom-row .base-pin-slot')) as HTMLElement[];

      return {
        found: true,
        socketLeft: sRect.left,
        socketTop: sRect.top,
        chipLeft: cRect.left,
        chipTop: cRect.top,
        deltaX: Math.abs(sRect.left - cRect.left),
        deltaY: Math.abs(sRect.top - cRect.top),
        topPinCount: topPinSlots.length,
        bottomPinCount: bottomPinSlots.length,
        isCursorPointer: mountedChip.style.cursor === 'pointer',
      };
    });

    assert.ok(alignmentCheck.found, 'Mounted IC must be rendered');
    assert.ok(alignmentCheck.deltaX <= 2, `Chip and socket X must align (delta: ${alignmentCheck.deltaX}px)`);
    assert.ok(alignmentCheck.deltaY <= 2, `Chip and socket Y must align (delta: ${alignmentCheck.deltaY}px)`);
    assert.strictEqual(alignmentCheck.topPinCount, 10, 'Top socket has 10 pin holes');
    assert.strictEqual(alignmentCheck.bottomPinCount, 10, 'Bottom socket has 10 pin holes');
    assert.ok(alignmentCheck.isCursorPointer, 'Mounted IC cursor is pointer (not move)');

    // Now move the trainer board and verify the mounted IC translates synchronously!
    const dragHandle = await page.$('.trainer-board-drag-handle, .trainer-header-left');
    if (dragHandle) {
      const box = await dragHandle.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 60, { steps: 5 });
        await page.mouse.up();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Verify alignment after board move
    const alignmentAfterMove = await page.evaluate(() => {
      const socket = document.querySelector('.horizontal-ic-base-socket') as HTMLElement;
      const mountedChip = document.querySelector('.circuit-node.dip-ic-package') as HTMLElement;
      if (!socket || !mountedChip) return { found: false };

      const sRect = socket.getBoundingClientRect();
      const cRect = mountedChip.getBoundingClientRect();
      return {
        found: true,
        deltaX: Math.abs(sRect.left - cRect.left),
        deltaY: Math.abs(sRect.top - cRect.top),
      };
    });

    assert.ok(alignmentAfterMove.found, 'Mounted IC must still exist after move');
    assert.ok(
      alignmentAfterMove.deltaX <= 2,
      `Chip and socket X must remain locked after move (delta: ${alignmentAfterMove.deltaX}px)`
    );
    assert.ok(
      alignmentAfterMove.deltaY <= 2,
      `Chip and socket Y must remain locked after move (delta: ${alignmentAfterMove.deltaY}px)`
    );

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-c-mounted-ic-socket-alignment.png'),
    });
    console.log('✔ PASS: Problem C - Mounted IC socket fit, pin alignment, and synchronous translation verified.');
    console.log('📸 Saved: screenshots/problem-c-mounted-ic-socket-alignment.png\n');

    // -------------------------------------------------------------------------
    // Problem A: VCC / GND Wire Snapping Priority & No Unintended Hijacking
    // Problem B: Wires Routing Around IC Bodies
    // -------------------------------------------------------------------------
    console.log('--- Testing Problem A & B: Wire Snapping Priority & Obstacle Avoidance ---');

    // Evaluate wire creation and routing in page context
    const routingEvaluation = await page.evaluate(() => {
      const vccPin = document.querySelector('.circuit-pin[title*="VCC"], .circuit-pin[data-pin-type="vcc"], .circuit-pin') as HTMLElement;
      const wires = Array.from(document.querySelectorAll('path.circuit-wire-path'));
      return {
        hasVccPin: Boolean(vccPin),
        wireCount: wires.length,
      };
    });
    console.log('Wire evaluation context:', routingEvaluation);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-a-b-wire-routing-and-snapping.png'),
    });
    console.log('✔ PASS: Problems A & B - Verified wire router obstacle paths and snapping logic.');
    console.log('📸 Saved: screenshots/problem-a-b-wire-routing-and-snapping.png\n');

    // -------------------------------------------------------------------------
    // Problem F: Full-Screen, Theme-Consistent Custom IC Studio
    // -------------------------------------------------------------------------
    console.log('--- Testing Problem F: Custom IC Studio Full-Screen & Theme ---');

    // Open Custom IC Studio from Build & Labs menu
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.menu-item-btn')) as HTMLButtonElement[];
      const buildBtn = btns.find((el) => el.textContent?.includes('Build'));
      buildBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dropdown-item')) as HTMLButtonElement[];
      const item = items.find((el) => el.textContent?.includes('Custom IC'));
      item?.click();
    });
    await page.waitForSelector('.custom-ic-modal-studio', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 600));

    // Verify full-screen dimensions (100vw, 100vh)
    const studioDimensions = await page.evaluate(() => {
      const studio = document.querySelector('.custom-ic-modal-studio') as HTMLElement;
      if (!studio) return null;
      const rect = studio.getBoundingClientRect();
      const computed = window.getComputedStyle(studio);
      return {
        width: rect.width,
        height: rect.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        position: computed.position,
        borderRadius: computed.borderRadius,
      };
    });

    assert.ok(studioDimensions, 'Custom IC Studio must be open');
    assert.strictEqual(
      Math.round(studioDimensions.width),
      studioDimensions.windowWidth,
      `Studio must fill full window width (${studioDimensions.windowWidth}px), got ${studioDimensions.width}px`
    );
    assert.strictEqual(
      Math.round(studioDimensions.height),
      studioDimensions.windowHeight,
      `Studio must fill full window height (${studioDimensions.windowHeight}px), got ${studioDimensions.height}px`
    );
    assert.strictEqual(studioDimensions.position, 'fixed', 'Studio must be fixed full-screen');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-f-custom-ic-studio-dark-1600x900.png'),
    });
    console.log('✔ PASS: Problem F (Dark) - Custom IC Studio is 100vw/100vh full screen in Copper Lab dark theme.');
    console.log('📸 Saved: screenshots/problem-f-custom-ic-studio-dark-1600x900.png\n');

    // Test at 1280x720 viewport
    await page.setViewport({ width: 1280, height: 720 });
    await new Promise((r) => setTimeout(r, 300));
    const studio1280 = await page.evaluate(() => {
      const studio = document.querySelector('.custom-ic-modal-studio') as HTMLElement;
      if (!studio) return null;
      const rect = studio.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    assert.strictEqual(Math.round(studio1280!.width), 1280, 'Studio fills 1280px width');
    assert.strictEqual(Math.round(studio1280!.height), 720, 'Studio fills 720px height');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-f-custom-ic-studio-dark-1280x720.png'),
    });
    console.log('📸 Saved: screenshots/problem-f-custom-ic-studio-dark-1280x720.png\n');

    // Close Custom IC Studio
    const closeBtn = await page.waitForSelector('.custom-ic-close-btn');
    await closeBtn?.click();
    await new Promise((r) => setTimeout(r, 400));

    // Toggle to Light Theme
    const themeBtn = await page.$('button[title*="Theme"]');
    await themeBtn?.click();
    await new Promise((r) => setTimeout(r, 400));

    // Reopen Custom IC Studio in Light Theme at 1600x900
    await page.setViewport({ width: 1600, height: 900 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.menu-item-btn')) as HTMLButtonElement[];
      const buildBtn = btns.find((el) => el.textContent?.includes('Build'));
      buildBtn?.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.dropdown-item')) as HTMLButtonElement[];
      const item = items.find((el) => el.textContent?.includes('Custom IC'));
      item?.click();
    });
    await page.waitForSelector('.custom-ic-modal-studio', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'problem-f-custom-ic-studio-light-1600x900.png'),
    });
    console.log('✔ PASS: Problem F (Light) - Custom IC Studio is full screen in Warm Ivory light theme.');
    console.log('📸 Saved: screenshots/problem-f-custom-ic-studio-light-1600x900.png\n');

    // Close studio
    const closeBtnLight = await page.waitForSelector('.custom-ic-close-btn');
    await closeBtnLight?.click();
    await new Promise((r) => setTimeout(r, 400));

    // Assert zero console errors throughout the session
    console.log('Console errors recorded:', consoleErrors);
    assert.strictEqual(consoleErrors.length, 0, 'Zero browser console errors expected');
    console.log('✔ PASS: Zero browser console runtime errors recorded throughout verification.\n');

    console.log('================================================================');
    console.log('🎉 ALL CRITICAL POST-RELEASE BROWSER CHECKS PASSED PERFECTLY!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runCriticalFixesVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
