import assert from 'node:assert/strict';

export async function verifyNavigationFallback(browser, base, output) {
  const results = [];
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      reducedMotion,
    });
    try {
      await context.addInitScript(() => {
        localStorage.setItem('analytics-consent', 'denied');
        delete HTMLElement.prototype.showPopover;
        delete HTMLElement.prototype.hidePopover;
      });
      await context.route('https://dev.to/api/articles?**', (route) =>
        route.fulfill({ json: [] })
      );
      let replacedSelectors = 0;
      await context.route('**/*.css', async (route) => {
        const response = await route.fetch();
        const css = await response.text();
        replacedSelectors += (css.match(/:popover-open/g) || []).length;
        // An unknown pseudo-class reproduces older engines' selector parsing.
        await route.fulfill({
          response,
          body: css.replaceAll(':popover-open', ':unsupported-popover'),
        });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      assert.ok(replacedSelectors > 0, 'the built Popover CSS was exercised');
      assert.equal(
        await page.locator('#nav-toggle').getAttribute('popovertarget'),
        null
      );
      const panel = page.locator('#nav-panel');
      const toggle = page.locator('#nav-toggle');
      const firstLink = panel.locator('a').first();
      const assertClosed = async () => {
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await page.waitForFunction(
          () =>
            getComputedStyle(document.getElementById('nav-panel')).display ===
            'none'
        );
        assert.equal(await panel.isVisible(), false);
      };
      const open = async () => {
        await toggle.click();
        await page.waitForFunction(() => {
          const node = document.getElementById('nav-panel');
          return (
            node.classList.contains('is-open') &&
            getComputedStyle(node).opacity === '1'
          );
        });
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await panel.isVisible(), true);
        assert.equal(
          await firstLink.evaluate((node) => node === document.activeElement),
          true
        );
      };
      await open();
      await page.screenshot({
        path: `${output}/mobile-menu-fallback-${reducedMotion}.png`,
      });
      await page.keyboard.press('Escape');
      await assertClosed();
      assert.equal(
        await toggle.evaluate((node) => node === document.activeElement),
        true
      );
      await open();
      await toggle.click();
      await assertClosed();
      await open();
      assert.equal(
        await page.evaluate(() =>
          Boolean(
            document
              .elementFromPoint(5, 500)
              ?.closest('#nav-panel, #nav-toggle, a, button')
          )
        ),
        false
      );
      await page.mouse.click(5, 500);
      await assertClosed();
      await open();
      await panel.locator('a[href="#experience"]').click();
      await assertClosed();
      assert.equal(new URL(page.url()).hash, '#experience');
      assert.deepEqual(errors, []);
      results.push(
        `non-Popover selector and API fallback, keyboard and dismissal, motion ${reducedMotion}`
      );
    } finally {
      await context.close();
    }
  }
  return results;
}
