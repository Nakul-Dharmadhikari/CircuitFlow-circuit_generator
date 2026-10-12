import puppeteer, { Browser, Page } from 'puppeteer-core';

async function testPhase5DeleteFlow() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 5: DELETE TOOLBAR FLOW SAFETY VERIFICATION');
  console.log('Testing: Delete Tool Activation, Ordinary Comp Confirmation,');
  console.log('         Cancel Retention, Confirm Removal, Undo Restoration,');
  console.log('         Socket-Safe Eject Flow, Right-Click Safety');
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
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // Navigate to workbench
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }
    console.log('✔ Workbench loaded');

    // -------------------------------------------------------------
    // Setup: Place an ordinary AND gate on the canvas
    // -------------------------------------------------------------
    console.log('\n--- Setup: Placing an ordinary component on canvas ---');
    const compLibBtn = await page.$('button[title*="Components & IC Library"]');
    if (!compLibBtn) throw new Error('Components & IC Library button not found');
    await compLibBtn.click();
    await page.waitForSelector('.component-toolbox', { timeout: 2000 });

    // Select AND gate card
    const andCard = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('.component-card'));
      return cards.find((c) => (c.textContent || '').includes('AND Gate') || (c.textContent || '').includes('AND-2'));
    });
    if (!andCard) throw new Error('Could not find AND Gate card in component library');
    // @ts-ignore
    await andCard.click();
    await new Promise((r) => setTimeout(r, 200));

    // Click canvas at (600, 250) to place component
    await page.mouse.click(600, 250);
    await new Promise((r) => setTimeout(r, 300));

    // Close library
    await compLibBtn.click();
    await new Promise((r) => setTimeout(r, 200));

    // Verify ordinary component exists
    const ordinaryCompCountBefore = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)'));
      return nodes.length;
    });
    console.log(`✔ Ordinary components on canvas: ${ordinaryCompCountBefore}`);
    if (ordinaryCompCountBefore === 0) throw new Error('Ordinary component was not placed on canvas');

    // -------------------------------------------------------------
    // Step 1: Activate the Delete tool
    // -------------------------------------------------------------
    console.log('\nStep 1: Activating the Delete tool from Vertical Toolbar...');
    const deleteBtn = await page.$('.v-tool-btn.danger');
    if (!deleteBtn) throw new Error('Delete tool button (.v-tool-btn.danger) not found');
    await deleteBtn.click();
    await new Promise((r) => setTimeout(r, 200));

    const isDeleteActive = await page.evaluate(() => {
      const btn = document.querySelector('.v-tool-btn.danger');
      return btn?.classList.contains('active');
    });
    console.log(`  Delete tool active: ${isDeleteActive}`);
    if (!isDeleteActive) throw new Error('Delete tool did not enter active state');
    console.log('✔ Step 1 PASS: Delete tool successfully activated');

    // -------------------------------------------------------------
    // Step 2 & 3: Click an ordinary component & verify not removed immediately
    // -------------------------------------------------------------
    console.log('\nStep 2 & 3: Clicking ordinary component in Delete mode...');
    const compRect = await page.evaluate(() => {
      const node = document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)');
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!compRect) throw new Error('Could not find ordinary component rect');

    await page.mouse.click(compRect.x, compRect.y);
    await new Promise((r) => setTimeout(r, 300));

    const compStillExists = await page.evaluate(() => {
      const node = document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)');
      return Boolean(node);
    });
    console.log(`  Component still exists immediately after click: ${compStillExists}`);
    if (!compStillExists) throw new Error('CRITICAL SAFETY FAILURE: Component was deleted immediately without confirmation!');
    console.log('✔ Step 2 & 3 PASS: Component NOT removed immediately');

    // -------------------------------------------------------------
    // Step 4: Verify proper confirmation appears
    // -------------------------------------------------------------
    console.log('\nStep 4: Verifying proper confirmation dialog appears...');
    const confirmInfo = await page.evaluate(() => {
      const card = document.querySelector('.compact-contextual-confirm-card');
      if (!card) return null;
      const title = card.querySelector('.confirm-card-title')?.textContent?.trim() || '';
      const cancelBtn = Boolean(card.querySelector('.confirm-btn.cancel'));
      const confirmBtn = Boolean(card.querySelector('.confirm-btn.confirm'));
      return { title, cancelBtn, confirmBtn };
    });
    console.log('  Confirmation card info:', confirmInfo);
    if (!confirmInfo || !confirmInfo.title.includes('Remove') || !confirmInfo.cancelBtn || !confirmInfo.confirmBtn) {
      throw new Error(`Confirmation card missing or improper! ${JSON.stringify(confirmInfo)}`);
    }
    console.log(`✔ Step 4 PASS: Proper confirmation card visible: "${confirmInfo.title}"`);

    // -------------------------------------------------------------
    // Step 5: Cancel and verify component and connections remain intact
    // -------------------------------------------------------------
    console.log('\nStep 5: Cancelling confirmation and verifying component remains intact...');
    const cancelBtn = await page.$('.compact-contextual-confirm-card .confirm-btn.cancel');
    if (!cancelBtn) throw new Error('Cancel button not found on confirmation card');
    await cancelBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const cardClosed = await page.evaluate(() => {
      return !document.querySelector('.compact-contextual-confirm-card');
    });
    const compIntactAfterCancel = await page.evaluate(() => {
      return Boolean(document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)'));
    });
    console.log(`  Confirmation closed: ${cardClosed}, Component still intact: ${compIntactAfterCancel}`);
    if (!cardClosed || !compIntactAfterCancel) {
      throw new Error('Cancel failed to keep component intact or card did not close');
    }
    console.log('✔ Step 5 PASS: Cancel preserves component intact');

    // -------------------------------------------------------------
    // Step 6: Repeat and confirm removal
    // -------------------------------------------------------------
    console.log('\nStep 6: Repeating click in Delete mode and confirming removal...');
    // Re-verify delete mode is still active, or reactivate
    const deleteActiveStep6 = await page.evaluate(() => {
      return document.querySelector('.v-tool-btn.danger')?.classList.contains('active');
    });
    if (!deleteActiveStep6) {
      await (await page.$('.v-tool-btn.danger'))?.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    await page.mouse.click(compRect.x, compRect.y);
    await new Promise((r) => setTimeout(r, 300));

    const confirmBtn = await page.$('.compact-contextual-confirm-card .confirm-btn.confirm');
    if (!confirmBtn) throw new Error('Confirm button not found on confirmation card');
    await confirmBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    const compRemovedAfterConfirm = await page.evaluate(() => {
      const node = document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)');
      return !node;
    });
    console.log(`  Component removed after confirm: ${compRemovedAfterConfirm}`);
    if (!compRemovedAfterConfirm) throw new Error('Component was not removed after clicking Confirm');
    console.log('✔ Step 6 PASS: Component successfully removed upon confirmation');

    // -------------------------------------------------------------
    // Step 7: Verify Undo restores the component
    // -------------------------------------------------------------
    console.log('\nStep 7: Verifying Undo restores the component...');
    const undoBtn = await page.$('button[title*="Undo Action"]');
    if (undoBtn) {
      await undoBtn.click();
    } else {
      await page.keyboard.down('Control');
      await page.keyboard.press('z');
      await page.keyboard.up('Control');
    }
    await new Promise((r) => setTimeout(r, 400));

    const compRestoredAfterUndo = await page.evaluate(() => {
      const node = document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)');
      return Boolean(node);
    });
    console.log(`  Component restored after Undo: ${compRestoredAfterUndo}`);
    if (!compRestoredAfterUndo) throw new Error('Undo did not restore the removed component!');
    console.log('✔ Step 7 PASS: Undo restored the removed component intact');

    // -------------------------------------------------------------
    // Step 8: Repeat with a mounted IC and verify socket-safe Eject flow
    // -------------------------------------------------------------
    console.log('\nStep 8: Testing Delete tool on mounted IC for socket-safe Eject flow...');
    // Mount 7408 IC into socket 1 if not mounted
    const isSocketOccupied = await page.evaluate(() => {
      return Boolean(document.querySelector('.horizontal-ic-base-socket .base-occupied-tag'));
    });

    if (!isSocketOccupied) {
      console.log('  Mounting 7408 onto IC1 socket...');
      const mountBtn = await page.$('.base-mount-action-btn');
      if (mountBtn) {
        await mountBtn.click();
        await page.waitForSelector('.ic-picker-modal', { timeout: 3000 });
        const card7408 = await page.evaluateHandle(() => {
          const cards = Array.from(document.querySelectorAll('.ic-card-select'));
          return cards.find((c) => (c.textContent || '').includes('7408'));
        });
        if (card7408) {
          // @ts-ignore
          await card7408.click();
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    // Verify socket is now occupied
    const socketOccupied = await page.evaluate(() => {
      return Boolean(document.querySelector('.horizontal-ic-base-socket .base-occupied-tag'));
    });
    console.log(`  Socket 1 occupied: ${socketOccupied}`);
    if (!socketOccupied) throw new Error('Could not set up mounted IC on socket 1');

    // Ensure delete tool is active
    const deleteActiveStep8 = await page.evaluate(() => {
      return document.querySelector('.v-tool-btn.danger')?.classList.contains('active');
    });
    if (!deleteActiveStep8) {
      await (await page.$('.v-tool-btn.danger'))?.click();
      await new Promise((r) => setTimeout(r, 200));
    }

    // Click the mounted IC on socket
    const socketTagRect = await page.evaluate(() => {
      const tag = document.querySelector('.base-occupied-tag') || document.querySelector('.dip-ic-package');
      if (!tag) return null;
      const r = tag.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!socketTagRect) throw new Error('Could not find mounted IC rect');

    await page.mouse.click(socketTagRect.x, socketTagRect.y);
    await new Promise((r) => setTimeout(r, 300));

    // Verify Eject confirmation appears
    const ejectConfirmInfo = await page.evaluate(() => {
      const card = document.querySelector('.compact-contextual-confirm-card');
      if (!card) return null;
      const title = card.querySelector('.confirm-card-title')?.textContent?.trim() || '';
      const isEjectBtn = Boolean(card.querySelector('.confirm-btn.confirm-eject') || card.querySelector('.confirm-btn.confirm')?.textContent?.includes('Eject'));
      return { title, isEjectBtn };
    });
    console.log('  Mounted IC confirmation card:', ejectConfirmInfo);
    if (!ejectConfirmInfo || !ejectConfirmInfo.title.includes('Eject') || !ejectConfirmInfo.isEjectBtn) {
      throw new Error(`Mounted IC did not use socket-safe Eject flow! ${JSON.stringify(ejectConfirmInfo)}`);
    }
    console.log(`✔ Step 8a: Socket-safe Eject confirmation card verified: "${ejectConfirmInfo.title}"`);

    // Cancel eject
    const cancelEjectBtn = await page.$('.compact-contextual-confirm-card .confirm-btn.cancel');
    await cancelEjectBtn?.click();
    await new Promise((r) => setTimeout(r, 300));

    const icStillMountedAfterCancel = await page.evaluate(() => {
      return Boolean(document.querySelector('.horizontal-ic-base-socket .base-occupied-tag'));
    });
    if (!icStillMountedAfterCancel) throw new Error('Cancel failed to preserve mounted IC!');
    console.log('✔ Step 8b: Cancel preserves mounted IC intact');

    // Repeat and Confirm Eject
    await page.mouse.click(socketTagRect.x, socketTagRect.y);
    await new Promise((r) => setTimeout(r, 300));

    const confirmEjectBtn = await page.$('.compact-contextual-confirm-card .confirm-btn.confirm');
    await confirmEjectBtn?.click();
    await new Promise((r) => setTimeout(r, 400));

    const icEjected = await page.evaluate(() => {
      return !document.querySelector('.horizontal-ic-base-socket .base-occupied-tag');
    });
    console.log(`  IC safely ejected: ${icEjected}`);
    if (!icEjected) throw new Error('IC was not ejected after confirming Eject');
    console.log('✔ Step 8c: IC safely ejected upon confirmation');

    // Undo restores mounted IC
    const undoBtnStep8 = await page.$('button[title*="Undo Action"]');
    if (undoBtnStep8) {
      await undoBtnStep8.click();
    } else {
      await page.keyboard.down('Control');
      await page.keyboard.press('z');
      await page.keyboard.up('Control');
    }
    await new Promise((r) => setTimeout(r, 400));

    const icRestored = await page.evaluate(() => {
      return Boolean(document.querySelector('.horizontal-ic-base-socket .base-occupied-tag'));
    });
    console.log(`  Mounted IC restored after Undo: ${icRestored}`);
    if (!icRestored) throw new Error('Undo failed to restore mounted IC back to socket');
    console.log('✔ Step 8d: Undo restored mounted IC back to socket');

    // -------------------------------------------------------------
    // Step 9: Right-click safety check (right-click alone NEVER deletes)
    // -------------------------------------------------------------
    console.log('\nStep 9: Verifying right-click safety (right-click alone NEVER deletes)...');
    // Deactivate delete mode
    await page.keyboard.press('v'); // select tool
    await new Promise((r) => setTimeout(r, 200));

    // Right-click the component
    const compBeforeRightClick = await page.evaluate(() => {
      const node = document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)');
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    if (compBeforeRightClick) {
      await page.mouse.click(compBeforeRightClick.x, compBeforeRightClick.y, { button: 'right' });
      await new Promise((r) => setTimeout(r, 300));

      const contextMenuOpen = await page.evaluate(() => {
        return Boolean(document.querySelector('.component-context-menu'));
      });
      const compStillExistsAfterRightClick = await page.evaluate(() => {
        return Boolean(document.querySelector('.circuit-node:not(.fixed-trainer-node):not(.dip-ic-package)'));
      });

      console.log(`  Context menu opened: ${contextMenuOpen}, Component still exists: ${compStillExistsAfterRightClick}`);
      if (!contextMenuOpen || !compStillExistsAfterRightClick) {
        throw new Error('Right click failed to open context menu or accidentally deleted component');
      }

      // Close context menu with Escape
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log('✔ Step 9 PASS: Right-click alone NEVER deletes anything; opens context menu');

    // Check console errors
    console.log('\nChecking console errors...');
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
      throw new Error(`Console errors found: ${consoleErrors.join(', ')}`);
    }
    console.log('✔ ZERO browser console errors');

    console.log('\n================================================================');
    console.log('🎉 ALL DELETE TOOLBAR FLOW SAFETY CHECKS PASSED PERFECTLY!');
    console.log('================================================================\n');
  } finally {
    await browser.close();
  }
}

testPhase5DeleteFlow().catch((err) => {
  console.error('\n❌ Delete flow test failed:', err);
  process.exit(1);
});
