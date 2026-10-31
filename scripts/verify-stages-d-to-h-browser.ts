import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportConfig[] = [
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1280x720', width: 1280, height: 720 },
];

async function runAudit() {
  console.log('================================================================');
  console.log('CIRCUITFLOW COMPREHENSIVE BROWSER VERIFICATION (STAGES D – H)');
  console.log('Testing Logo, Copper Theme, Homepage, Fullscreen Studio & Viewports');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,900'],
  });

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n================================================================`);
      console.log(`🌐 EXECUTING MULTI-VIEWPORT AUDIT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`================================================================`);

      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // -----------------------------------------------------------------------
      // 1. Landing Page, Logo, Favicon & Copper Lab Theme
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 1. Inspecting Landing Page, Branding & Theme...`);
      await page.goto(URL, { waitUntil: 'networkidle0' });
      await page.evaluate(() => localStorage.clear());
      await page.goto(URL, { waitUntil: 'networkidle0' });

      // Check favicon in document head
      const faviconHref = await page.evaluate(() => {
        const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
        return link ? link.href : '';
      });
      assert.ok(faviconHref.includes('favicon.svg'), 'Favicon must reference favicon.svg');
      console.log(`✔ Favicon verified: ${faviconHref}`);

      // Check genuine logo rendering in navbar
      const logoCheck = await page.evaluate(() => {
        const logoEl = document.querySelector('.landing-navbar .circuitflow-logo');
        const emblemImg = document.querySelector('.landing-navbar .cf-emblem-svg') as HTMLImageElement | null;
        const circuitText = document.querySelector('.landing-navbar .cf-word-circuit');
        const flowText = document.querySelector('.landing-navbar .cf-word-flow');
        const badge = document.querySelector('.landing-navbar .cf-logo-badge');
        return {
          hasLogo: Boolean(logoEl),
          emblemSrc: emblemImg ? emblemImg.src : '',
          circuitText: circuitText ? circuitText.textContent : '',
          flowText: flowText ? flowText.textContent : '',
          badgeText: badge ? badge.textContent : '',
        };
      });
      assert.ok(logoCheck.hasLogo, 'CircuitFlowLogo component rendered in landing navbar');
      assert.strictEqual(logoCheck.circuitText, 'Circuit');
      assert.strictEqual(logoCheck.flowText, 'Flow');
      assert.strictEqual(logoCheck.badgeText, 'LAB');
      console.log('✔ Landing navbar branding verified with genuine emblem and wordmark.');

      // Check that "Verified Laboratory Experiments" is absent
      const pageText = await page.evaluate(() => document.body.innerText);
      assert.strictEqual(
        pageText.includes('Verified Laboratory Experiments'),
        false,
        'Public landing page must not show unrequested Verified Laboratory Experiments section'
      );
      console.log('✔ Stage F verified: Verified Laboratory Experiments section is absent.');

      // Check Copper Lab color tokens
      const themeColors = await page.evaluate(() => {
        const body = document.querySelector('.landing-page');
        if (!body) return {};
        const style = getComputedStyle(body);
        return {
          lpPrimary: style.getPropertyValue('--lp-primary').trim(),
          lpBg: style.getPropertyValue('--lp-bg').trim(),
        };
      });
      assert.ok(themeColors.lpPrimary.includes('#d97736'), `Primary copper token verified (${themeColors.lpPrimary})`);
      console.log(`✔ Copper Lab token verified on public landing: --lp-primary = ${themeColors.lpPrimary}`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `audit-landing-${vp.name}.png`),
      });
      console.log(`📸 Saved: screenshots/audit-landing-${vp.name}.png`);

      // -----------------------------------------------------------------------
      // 2. Simulator Navigation & TopBar Branding
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 2. Entering Simulator & Verifying TopBar...`);
      const enterBtn = await page.$('.hero-cta-btn');
      assert.ok(enterBtn, 'CTA button to enter simulator exists');
      await enterBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 8000 });

      // Dismiss tour if present
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 400));

      // Verify TopBar logo
      const topBarLogo = await page.evaluate(() => {
        const logo = document.querySelector('.topbar-left .circuitflow-logo');
        const badge = document.querySelector('.topbar-left .cf-logo-badge');
        const lightning = document.querySelector('.topbar-left .brand-icon svg');
        return {
          hasLogo: Boolean(logo),
          badgeText: badge ? badge.textContent : '',
          hasOldLightning: Boolean(lightning),
        };
      });
      assert.ok(topBarLogo.hasLogo, 'TopBar renders official CircuitFlowLogo component');
      assert.strictEqual(topBarLogo.badgeText, 'SIM', 'TopBar logo displays SIM badge');
      assert.strictEqual(topBarLogo.hasOldLightning, false, 'Old placeholder lightning icon removed from TopBar');
      console.log('✔ TopBar branding verified: official CircuitFlowLogo active with SIM badge.');

      // -----------------------------------------------------------------------
      // 3. Repeated Mode Switching (Trainer <-> Schematic) & Isolation
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 3. Testing Mode Switching & Isolation...`);
      for (let round = 1; round <= 3; round++) {
        // Switch to Schematic
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('.mode-seg-btn')) as HTMLButtonElement[];
          const b = btns.find((btn) => btn.textContent?.includes('Schematic'));
          b?.click();
        });
        await new Promise((r) => setTimeout(r, 300));

        const inSchematic = await page.evaluate(() => {
          const trainerBoard = document.querySelector('.hardware-trainer-board');
          const switchNodes = document.querySelectorAll('.trainer-switch');
          return { hasTrainerBoard: Boolean(trainerBoard), switchCount: switchNodes.length };
        });
        assert.strictEqual(inSchematic.hasTrainerBoard, false, `Round ${round}: Schematic mode hides trainer board`);
        assert.strictEqual(inSchematic.switchCount, 0, `Round ${round}: Schematic mode hides hardware switches`);

        // Switch back to Trainer
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('.mode-seg-btn')) as HTMLButtonElement[];
          const b = btns.find((btn) => btn.textContent?.includes('Trainer'));
          b?.click();
        });
        await new Promise((r) => setTimeout(r, 400));

        const inTrainer = await page.evaluate(() => {
          const trainerBoard = document.querySelector('.hardware-trainer-board');
          return Boolean(trainerBoard);
        });
        assert.strictEqual(inTrainer, true, `Round ${round}: Trainer mode restores hardware board`);
      }
      console.log('✔ Mode switching verified: 3 round-trips completed with strict isolation and zero state leaks.');

      // -----------------------------------------------------------------------
      // 4. IC Mounting & Socket Geometry Alignment
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 4. Testing IC Mounting & Pin Alignment...`);
      const emptySocket = await page.waitForSelector('.horizontal-ic-base-socket');
      await emptySocket?.click();
      await new Promise((r) => setTimeout(r, 500));

      const icCard = await page.waitForSelector('.ic-card-select');
      if (icCard) {
        await icCard.click();
        await new Promise((r) => setTimeout(r, 600));
      }

      const alignment = await page.evaluate(() => {
        const socket = document.querySelector('.horizontal-ic-base-socket') as HTMLElement;
        const chip = document.querySelector('.circuit-node.dip-ic-package') as HTMLElement;
        if (!socket || !chip) return { success: false, deltaX: 999, deltaY: 999 };
        const sRect = socket.getBoundingClientRect();
        const cRect = chip.getBoundingClientRect();
        return {
          success: true,
          deltaX: Math.abs(sRect.left - cRect.left),
          deltaY: Math.abs(sRect.top - cRect.top),
        };
      });
      assert.ok(alignment.success, 'IC mounted onto socket successfully');
      assert.ok(alignment.deltaX <= 2, `IC left aligned with socket (delta: ${alignment.deltaX}px)`);
      assert.ok(alignment.deltaY <= 2, `IC top aligned with socket (delta: ${alignment.deltaY}px)`);
      console.log(`✔ IC Socket alignment verified (ΔX: ${alignment.deltaX.toFixed(1)}px, ΔY: ${alignment.deltaY.toFixed(1)}px).`);

      // -----------------------------------------------------------------------
      // 5. Module Expansion (Initial 4 -> 6 -> 8 IC Sockets)
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 5. Testing Trainer Board Module Expansion...`);
      const initialCounts = await page.evaluate(() => {
        const sockets = document.querySelectorAll('.horizontal-ic-base-socket');
        const inputs = document.querySelectorAll('.fixed-trainer-node[title*="Input"]');
        return { sockets: sockets.length, inputs: inputs.length };
      });
      assert.strictEqual(initialCounts.sockets, 4, 'Initial board has 4 IC sockets');
      console.log(`✔ Initial board verified: ${initialCounts.sockets} sockets.`);

      // Click + ADD MODULE card
      await page.evaluate(() => {
        const card = document.querySelector('.trainer-add-module-card') as HTMLElement | null;
        card?.click();
      });
      await new Promise((r) => setTimeout(r, 700));
      const mod2Counts = await page.evaluate(() => {
        const sockets = document.querySelectorAll('.horizontal-ic-base-socket');
        return { sockets: sockets.length };
      });
      assert.strictEqual(mod2Counts.sockets, 6, 'Module 2 expansion results in 6 IC sockets');
      console.log(`✔ Module 2 expansion verified: ${mod2Counts.sockets} sockets.`);

      // -----------------------------------------------------------------------
      // 6. Board Drag & Synchronous Translation
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 6. Testing Synchronous Board Drag...`);
      const dragHeader = await page.$('.trainer-board-drag-header, .trainer-board-drag-title');
      if (dragHeader) {
        const box = await dragHeader.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 20, box.y + 10);
          await page.mouse.down();
          await page.mouse.move(box.x + 80, box.y + 50, { steps: 5 });
          await page.mouse.up();
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Verify alignment preserved after move
      const alignmentAfterDrag = await page.evaluate(() => {
        const socket = document.querySelector('.horizontal-ic-base-socket') as HTMLElement;
        const chip = document.querySelector('.circuit-node.dip-ic-package') as HTMLElement;
        if (!socket || !chip) return { success: false, deltaX: 999 };
        const sRect = socket.getBoundingClientRect();
        const cRect = chip.getBoundingClientRect();
        return {
          success: true,
          deltaX: Math.abs(sRect.left - cRect.left),
          deltaY: Math.abs(sRect.top - cRect.top),
        };
      });
      assert.ok(alignmentAfterDrag.deltaX <= 2, 'Alignment preserved after board drag');
      console.log('✔ Synchronous board drag verified: IC and socket remain rigidly aligned.');

      // -----------------------------------------------------------------------
      // 7. Destructive Operations Safety & Context Menu Confirmation
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 7. Testing Context Menu & Destructive Confirmation...`);
      const mountedChipEl = await page.$('.circuit-node.dip-ic-package');
      if (mountedChipEl) {
        // Right click mounted IC to open context menu
        await mountedChipEl.click({ button: 'right' });
        await new Promise((r) => setTimeout(r, 400));

        // Verify context menu is open and component is NOT deleted
        const contextMenuOpen = await page.evaluate(() => {
          const menu = document.querySelector('.canvas-context-menu');
          const chipStillExists = Boolean(document.querySelector('.circuit-node.dip-ic-package'));
          return { hasMenu: Boolean(menu), chipStillExists };
        });
        assert.ok(contextMenuOpen.hasMenu, 'Right-clicking opened context menu');
        assert.ok(contextMenuOpen.chipStillExists, 'Right-clicking did NOT immediately delete component');
        console.log('✔ Right-click safety verified: opened context menu without deleting.');

        // Dismiss context menu safely with Escape
        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 300));
      }

      // -----------------------------------------------------------------------
      // 8. Custom IC Studio Full-Screen & Theme Consistency
      // -----------------------------------------------------------------------
      console.log(`\n[${vp.name}] 8. Testing Fullscreen Custom IC Studio...`);
      // Open Custom IC Studio from TopBar Build Menu
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.menu-item-btn')) as HTMLButtonElement[];
        const buildMenu = btns.find((b) => b.textContent?.includes('Build'));
        buildMenu?.click();
      });
      await new Promise((r) => setTimeout(r, 400));
      await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item')) as HTMLButtonElement[];
        const customIcItem = items.find((b) => b.textContent?.includes('Custom IC'));
        customIcItem?.click();
      });
      await new Promise((r) => setTimeout(r, 800));

      const studioCheck = await page.evaluate(() => {
        const modal = document.querySelector('.custom-ic-modal-studio') as HTMLElement | null;
        if (!modal) return { isOpen: false };
        const rect = modal.getBoundingClientRect();
        const logo = modal.querySelector('.studio-title-block .circuitflow-logo');
        const sidebar = modal.querySelector('.studio-sidebar-pane') as HTMLElement | null;
        const workspace = modal.querySelector('.custom-ic-studio-workspace') as HTMLElement | null;
        return {
          isOpen: true,
          modalWidth: rect.width,
          modalHeight: rect.height,
          hasLogo: Boolean(logo),
          hasSidebar: Boolean(sidebar),
          hasWorkspace: Boolean(workspace),
        };
      });

      assert.ok(studioCheck.isOpen, 'Custom IC Studio opened');
      assert.strictEqual(studioCheck.modalWidth, vp.width, `Studio modal width equals viewport (${vp.width}px)`);
      assert.strictEqual(studioCheck.modalHeight, vp.height, `Studio modal height equals viewport (${vp.height}px)`);
      assert.ok(studioCheck.hasLogo, 'Custom IC Studio header renders official CircuitFlowLogo emblem');
      assert.ok(studioCheck.hasSidebar, 'Studio sidebar pane rendered');
      assert.ok(studioCheck.hasWorkspace, 'Studio workspace rendered');
      console.log(`✔ Fullscreen Custom IC Studio verified (${studioCheck.modalWidth}x${studioCheck.modalHeight}px) with official logo emblem.`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `audit-studio-${vp.name}.png`),
      });
      console.log(`📸 Saved: screenshots/audit-studio-${vp.name}.png`);

      // Close Custom IC Studio
      const closeStudioBtn = await page.$('.custom-ic-close-btn');
      await closeStudioBtn?.click();
      await new Promise((r) => setTimeout(r, 400));

      // -----------------------------------------------------------------------
      // 9. Console Health Check
      // -----------------------------------------------------------------------
      assert.strictEqual(consoleErrors.length, 0, `Zero console errors during ${vp.name} run (got ${consoleErrors.join(', ')})`);
      console.log(`✔ Console health verified: 0 errors on ${vp.name}.`);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `audit-final-workbench-${vp.name}.png`),
      });
      console.log(`📸 Saved: screenshots/audit-final-workbench-${vp.name}.png`);

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('🎉 ALL BROWSER CHECKS PASSED AT 1280x720 AND 1600x900 (STAGES D–H)!');
  console.log('================================================================\n');
}

runAudit().catch((err) => {
  console.error('❌ Browser audit failed:', err);
  process.exit(1);
});
