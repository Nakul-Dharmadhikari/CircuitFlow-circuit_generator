import puppeteer, { Browser, Page } from 'puppeteer-core';

async function testPhase1Browser() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log('================================================================');
  console.log('PHASE 1 DEDICATED BROWSER INTERACTION TEST');
  console.log('Testing: Socket Ownership, Non-Draggable, Non-Rotatable, Eject Flow');
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
    console.log('[BROWSER]', msg.type(), msg.text());
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Navigate to editor
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    const heroBtn = await page.$('.hero-cta-btn');
    if (heroBtn) {
      await heroBtn.click();
      await page.waitForSelector('.app-shell', { timeout: 4000 });
    }

    console.log('Step 1: Editor loaded. Checking Trainer Board and IC sockets...');
    await page.waitForSelector('.hardware-trainer-board', { timeout: 4000 });
    const sockets = await page.$$('.horizontal-ic-base-socket');
    console.log(`Found ${sockets.length} IC sockets.`);
    if (sockets.length < 4) throw new Error('Expected at least 4 sockets');

    // 2. Open IC picker modal and mount 7408 into IC1 socket
    console.log('Step 2: Mounting 7408 onto IC1 socket...');
    const mountBtn = await page.$('.base-mount-action-btn');
    if (!mountBtn) throw new Error('Could not find .base-mount-action-btn on empty socket');
    await mountBtn.click();
    await page.waitForSelector('.ic-picker-modal', { timeout: 3000 });
    console.log('✔ IC Picker modal opened');

    const card7408 = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('.ic-card-select'));
      return cards.find((c) => (c.textContent || '').includes('7408'));
    });
    if (!card7408) throw new Error('Could not find 7408 card in picker modal');
    // @ts-ignore
    await card7408.click();
    await new Promise((r) => setTimeout(r, 600));

    // 3. Verify socket is occupied and has Eject and Swap buttons
    const occupiedSocket = await page.$('.horizontal-ic-base-socket.occupied');
    if (!occupiedSocket) throw new Error('Socket does not have .occupied class after mounting');
    console.log('✔ Socket marked occupied with chip');

    const ejectBtn = await page.$('.base-socket-btn.eject');
    if (!ejectBtn) throw new Error('Eject button not found on socket');
    console.log('✔ Contextual Eject button rendered on socket');

    // 4. Verify mounted IC component in canvas DOM
    const mountedComp = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.circuit-node'));
      const found = nodes.find((el) => {
        const text = el.textContent || '';
        return text.includes('7408');
      }) as HTMLElement | undefined;
      if (!found) return null;
      const rect = found.getBoundingClientRect();
      return {
        text: found.textContent,
        left: found.style.left,
        top: found.style.top,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    });
    console.log('Mounted IC DOM element found:', mountedComp);
    if (!mountedComp) throw new Error('Mounted 7408 component not rendered in canvas');

    // 5. Select mounted IC and check PropertiesPanel
    console.log('Step 3: Selecting mounted IC to verify PropertiesPanel locking...');
    const gateEl = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('.circuit-node')).find((el) =>
        (el.textContent || '').includes('7408')
      );
    });
    if (gateEl) {
      // @ts-ignore
      await gateEl.click();
      await new Promise((r) => setTimeout(r, 400));
    }

    const propPanelLock = await page.evaluate(() => {
      const panel = document.querySelector('.properties-panel');
      if (!panel) return { hasPanel: false };
      const lockIndicator = panel.querySelector('.socket-lock-indicator');
      const rotateBtn = panel.querySelector('.rotate-btn') as HTMLButtonElement | null;
      const ejectBtnInPanel = panel.querySelector('.eject-panel-btn');
      return {
        hasPanel: true,
        hasLockIndicator: Boolean(lockIndicator),
        lockText: lockIndicator ? lockIndicator.textContent : '',
        rotateDisabled: rotateBtn ? rotateBtn.disabled : true,
        hasEjectInPanel: Boolean(ejectBtnInPanel),
      };
    });
    console.log('Properties Panel inspection:', propPanelLock);
    if (!propPanelLock.hasLockIndicator || !propPanelLock.rotateDisabled) {
      throw new Error('Properties panel did not correctly lock rotation and indicate socket ownership');
    }
    console.log('✔ Properties panel shows Socket-Locked badge and disables rotation');

    // 6. Test dragging: attempt drag on mounted IC, confirm position does not change
    console.log('Step 4: Attempting to drag mounted IC...');
    const initialLeft = mountedComp.left;
    const initialTop = mountedComp.top;
    const bb = {
      x: mountedComp.x + mountedComp.width / 2,
      y: mountedComp.y + mountedComp.height / 2,
    };
    if (bb) {
      await page.mouse.move(bb.x, bb.y);
      await page.mouse.down();
      await page.mouse.move(bb.x + 120, bb.y + 120, { steps: 5 });
      await page.mouse.up();
      await new Promise((r) => setTimeout(r, 300));
    }

    const postDragComp = await page.evaluate(() => {
      const found = Array.from(document.querySelectorAll('.circuit-node')).find((el) =>
        (el.textContent || '').includes('7408')
      ) as HTMLElement | undefined;
      return found ? { left: found.style.left, top: found.style.top } : null;
    });
    console.log(`Initial position: (${initialLeft}, ${initialTop}) vs Post-drag position: (${postDragComp?.left}, ${postDragComp?.top})`);
    if (!postDragComp || initialLeft !== postDragComp.left || initialTop !== postDragComp.top) {
      throw new Error('Mounted IC moved on canvas drag! Non-draggable invariant failed.');
    }
    console.log('✔ Mounted IC is strictly non-draggable on canvas');

    // 7. Test Right-Click: should NOT delete, but open component context menu
    console.log('Step 5: Testing right-click context menu...');
    if (bb) {
      await page.mouse.click(bb.x, bb.y, { button: 'right' });
      await new Promise((r) => setTimeout(r, 400));
    }
    const contextMenu = await page.evaluate(() => {
      const menu = document.querySelector('.component-context-menu');
      if (!menu) return null;
      const header = menu.querySelector('.context-menu-header');
      const items = Array.from(menu.querySelectorAll('.context-menu-item')).map((i) => i.textContent?.trim());
      return {
        header: header ? header.textContent?.trim() : null,
        items,
      };
    });
    console.log('Context menu displayed:', contextMenu);
    if (!contextMenu || !contextMenu.items.some((i) => i?.includes('Eject IC'))) {
      throw new Error('Context menu did not render with Eject IC action');
    }
    console.log('✔ Right click opens contextual menu with Eject action and prevents direct deletion');

    // 8. Test Eject Flow: Click Eject button from contextual menu
    console.log('Step 6: Triggering Eject IC action from context menu...');
    const ejectMenuItem = await page.$('.context-menu-item.danger.eject-ic-item');
    if (!ejectMenuItem) throw new Error('Eject menu item not found in context menu');
    await ejectMenuItem.click();
    await new Promise((r) => setTimeout(r, 400));

    const confirmCard = await page.evaluate(() => {
      const card = document.querySelector('.compact-contextual-confirm-card');
      if (!card) return null;
      const title = card.querySelector('.confirm-card-title')?.textContent?.trim();
      const desc = card.querySelector('.confirm-card-message')?.textContent?.trim();
      const cancelBtn = card.querySelector('.confirm-card-btn.cancel');
      const confirmBtn = card.querySelector('.confirm-card-btn.confirm');
      return {
        title,
        desc,
        hasCancel: Boolean(cancelBtn),
        hasConfirm: Boolean(confirmBtn),
      };
    });
    console.log('Compact non-blocking confirmation card:', confirmCard);
    if (!confirmCard || !confirmCard.hasConfirm) {
      throw new Error('Compact non-blocking confirmation dialog did not appear');
    }
    console.log('✔ Compact non-blocking confirmation card rendered with explicit consequences');

    // Click confirm eject
    const confirmBtn = await page.$('.compact-contextual-confirm-card .confirm-card-btn.confirm');
    if (!confirmBtn) throw new Error('Confirm button not found');
    await confirmBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Verify IC is removed
    const postEjectHasIC = await page.evaluate(() => {
      const occupied = document.querySelector('.horizontal-ic-base-socket.occupied');
      const comp = Array.from(document.querySelectorAll('.circuit-node')).find((el) =>
        (el.textContent || '').includes('7408')
      );
      const card = document.querySelector('.compact-contextual-confirm-card');
      return {
        occupied: Boolean(occupied),
        comp: Boolean(comp),
        card: Boolean(card),
      };
    });
    console.log('Post eject verification:', postEjectHasIC);
    if (postEjectHasIC.occupied || postEjectHasIC.comp || postEjectHasIC.card) {
      throw new Error('IC was not cleanly ejected or confirmation card did not dismiss');
    }
    console.log('✔ IC successfully ejected and cleaned up');

    console.log('\n--- Checking Console Errors ---');
    console.log(`Total console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
      throw new Error('Runtime console errors detected!');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 1 BROWSER CHECKS PASSED WITH 0 ERRORS!');
    console.log('====================================================');
  } finally {
    await browser.close();
  }
}

testPhase1Browser().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
