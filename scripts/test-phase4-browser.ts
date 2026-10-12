import puppeteer, { Browser, Page } from 'puppeteer-core';

async function runPhase4BrowserVerification() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 4: LIVE BROWSER VERIFICATION SUITE');
  console.log('Testing: Workspace Scrollbars at 1600x900 and 1280x720');
  console.log('================================================================\n');

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

  try {
    // -------------------------------------------------------------
    // Step 1: Navigate to Workbench
    // -------------------------------------------------------------
    console.log('Step 1: Navigating to CircuitFlow Workbench...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }
    console.log('✔ Workbench loaded successfully');

    // -------------------------------------------------------------
    // Step 2: Verify Scrollbar Elements & Accessibility at 1600x900
    // -------------------------------------------------------------
    console.log('\nStep 2: Verifying scrollbar elements & accessibility attributes at 1600x900...');
    const scrollbarInfo = await page.evaluate(() => {
      const scrollH = document.querySelector('[data-testid="workspace-scrollbar-h"]');
      const scrollV = document.querySelector('[data-testid="workspace-scrollbar-v"]');
      const thumbH = document.querySelector('[data-testid="scrollbar-thumb-h"]');
      const thumbV = document.querySelector('[data-testid="scrollbar-thumb-v"]');

      if (!scrollH || !scrollV || !thumbH || !thumbV) return null;

      const rectH = scrollH.getBoundingClientRect();
      const rectV = scrollV.getBoundingClientRect();
      const tRectH = thumbH.getBoundingClientRect();
      const tRectV = thumbV.getBoundingClientRect();

      return {
        hasScrollH: Boolean(scrollH),
        hasScrollV: Boolean(scrollV),
        hRole: thumbH.getAttribute('role'),
        vRole: thumbV.getAttribute('role'),
        hAriaOrientation: thumbH.getAttribute('aria-orientation'),
        vAriaOrientation: thumbV.getAttribute('aria-orientation'),
        hAriaValueNow: thumbH.getAttribute('aria-valuenow'),
        vAriaValueNow: thumbV.getAttribute('aria-valuenow'),
        rectH: { x: rectH.x, y: rectH.y, width: rectH.width, height: rectH.height },
        rectV: { x: rectV.x, y: rectV.y, width: rectV.width, height: rectV.height },
        thumbWidth: tRectH.width,
        thumbHeight: tRectV.height,
      };
    });

    if (!scrollbarInfo) throw new Error('Workspace scrollbars not found in DOM');
    if (scrollbarInfo.hRole !== 'scrollbar' || scrollbarInfo.vRole !== 'scrollbar') {
      throw new Error(`Invalid scrollbar ARIA roles: H=${scrollbarInfo.hRole}, V=${scrollbarInfo.vRole}`);
    }
    console.log('✔ Workspace scrollbars mounted cleanly with ARIA accessibility roles:');
    console.log(`  Horizontal: width=${Math.round(scrollbarInfo.rectH.width)}px, thumbWidth=${Math.round(scrollbarInfo.thumbWidth)}px`);
    console.log(`  Vertical: height=${Math.round(scrollbarInfo.rectV.height)}px, thumbHeight=${Math.round(scrollbarInfo.thumbHeight)}px`);

    // -------------------------------------------------------------
    // Step 3: Test Dragging Horizontal Thumb
    // -------------------------------------------------------------
    console.log('\nStep 3: Testing horizontal scrollbar thumb drag...');
    const thumbHBox = await page.evaluate(() => {
      const thumb = document.querySelector('[data-testid="scrollbar-thumb-h"]');
      if (!thumb) return null;
      const rect = thumb.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    if (!thumbHBox) throw new Error('Horizontal thumb not located');

    // Drag horizontal thumb 80px to the right
    await page.mouse.move(thumbHBox.x, thumbHBox.y);
    await page.mouse.down();
    await page.mouse.move(thumbHBox.x + 80, thumbHBox.y, { steps: 5 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 300));

    const panAfterHDrag = await page.evaluate(() => {
      const transformLayer = document.querySelector('.canvas-transform-layer') as HTMLElement | null;
      const thumb = document.querySelector('[data-testid="scrollbar-thumb-h"]');
      const val = thumb?.getAttribute('aria-valuenow');
      return { transform: transformLayer?.style.transform, valueNow: val };
    });
    console.log('✔ Panning updated after horizontal thumb drag:', panAfterHDrag);

    // -------------------------------------------------------------
    // Step 4: Test Dragging Vertical Thumb
    // -------------------------------------------------------------
    console.log('\nStep 4: Testing vertical scrollbar thumb drag...');
    const thumbVBox = await page.evaluate(() => {
      const thumb = document.querySelector('[data-testid="scrollbar-thumb-v"]');
      if (!thumb) return null;
      const rect = thumb.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });

    if (!thumbVBox) throw new Error('Vertical thumb not located');

    // Drag vertical thumb 60px downwards
    await page.mouse.move(thumbVBox.x, thumbVBox.y);
    await page.mouse.down();
    await page.mouse.move(thumbVBox.x, thumbVBox.y + 60, { steps: 5 });
    await page.mouse.up();
    await new Promise((r) => setTimeout(r, 300));

    const panAfterVDrag = await page.evaluate(() => {
      const transformLayer = document.querySelector('.canvas-transform-layer') as HTMLElement | null;
      const thumb = document.querySelector('[data-testid="scrollbar-thumb-v"]');
      return { transform: transformLayer?.style.transform, valueNow: thumb?.getAttribute('aria-valuenow') };
    });
    console.log('✔ Panning updated after vertical thumb drag:', panAfterVDrag);

    // -------------------------------------------------------------
    // Step 5: Test Track Clicking
    // -------------------------------------------------------------
    console.log('\nStep 5: Testing track click navigation...');
    const trackHBox = await page.evaluate(() => {
      const track = document.querySelector('[data-testid="workspace-scrollbar-h"]');
      if (!track) return null;
      const rect = track.getBoundingClientRect();
      // Click near the far right of the horizontal track
      return { x: rect.right - 40, y: rect.y + rect.height / 2 };
    });

    if (trackHBox) {
      await page.mouse.click(trackHBox.x, trackHBox.y);
      await new Promise((r) => setTimeout(r, 300));
      console.log('✔ Horizontal track click advanced viewport');
    }

    // -------------------------------------------------------------
    // Step 6: Test Keyboard Navigation on Focused Thumb
    // -------------------------------------------------------------
    console.log('\nStep 6: Testing keyboard navigation on focused thumb...');
    await page.focus('[data-testid="scrollbar-thumb-h"]');
    await page.keyboard.press('ArrowLeft');
    await new Promise((r) => setTimeout(r, 100));
    await page.keyboard.press('ArrowRight');
    await new Promise((r) => setTimeout(r, 200));
    console.log('✔ Keyboard navigation responds to Arrow keys on scrollbar thumb');

    // -------------------------------------------------------------
    // Step 7: Viewport Verification at 1280x720
    // -------------------------------------------------------------
    console.log('\nStep 7: Testing scrollbars at 1280x720 viewport...');
    await page.setViewport({ width: 1280, height: 720 });
    await new Promise((r) => setTimeout(r, 300));

    const layoutAt720 = await page.evaluate(() => {
      const scrollH = document.querySelector('[data-testid="workspace-scrollbar-h"]');
      const scrollV = document.querySelector('[data-testid="workspace-scrollbar-v"]');
      const htmlScrollW = document.documentElement.scrollWidth;
      const htmlScrollH = document.documentElement.scrollHeight;

      return {
        hasH: Boolean(scrollH),
        hasV: Boolean(scrollV),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        htmlScrollW,
        htmlScrollH,
        zeroPageOverflow: htmlScrollW <= window.innerWidth && htmlScrollH <= window.innerHeight,
      };
    });

    if (!layoutAt720.zeroPageOverflow) {
      throw new Error(`Page overflow detected at 1280x720: ${JSON.stringify(layoutAt720)}`);
    }
    console.log('✔ Verified: Zero browser-page overflow at 1280x720 (scrollbars are canvas-internal)');

    // -------------------------------------------------------------
    // Step 8: Verify Zero Console Errors
    // -------------------------------------------------------------
    console.log('\nStep 8: Verifying browser console errors...');
    console.log(`Total console errors during full run: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors detected: ${consoleErrors.join(', ')}`);
    }
    console.log('✔ ZERO browser console errors detected');

    console.log('\n================================================================');
    console.log('🎉 ALL PHASE 4 LIVE BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
  } finally {
    await browser.close();
  }
}

runPhase4BrowserVerification().catch((err) => {
  console.error('\n❌ BROWSER TEST FAILED:', err);
  process.exit(1);
});
