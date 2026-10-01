import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import axe from 'axe-core';
import { verifyNavigationFallback } from './navigation.browser.js';

const base = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4337';
const engineName = process.env.PORTFOLIO_BROWSER || 'chromium';
const engines = { chromium, firefox, webkit };
assert.ok(engines[engineName], 'a supported browser engine must be selected');
const output = resolve(
  process.env.PORTFOLIO_EVIDENCE_DIR || `evidence/projects-${engineName}`
);
mkdirSync(output, { recursive: true });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const widths = [320, 375, 430, 600, 768, 1024, 1440, 2560];
const htmlResponse = await fetch(base, { cache: 'no-store' });
assert.equal(htmlResponse.status, 200, 'the tested site must serve its HTML');
const testedBuild = sha(Buffer.from(await htmlResponse.arrayBuffer()));
const results = {
  url: base,
  build: testedBuild,
  localBuild: sha(readFileSync('dist/index.html')),
  started: new Date().toISOString(),
  responsive: [],
  interactions: [],
  engines: [],
  primaryEngine: engineName,
};
const browser = await engines[engineName].launch();

async function prepare(context) {
  await context.addInitScript(() =>
    localStorage.setItem('analytics-consent', 'denied')
  );
  await context.route('https://dev.to/api/articles?**', (route) =>
    route.fulfill({ json: [] })
  );
}

async function measurements(page) {
  return page.evaluate(() => ({
    viewport: innerWidth,
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    font: document.fonts.check('16px InterVariable'),
    elements: [
      '.site-header',
      '.hero__title',
      '.hero__roles',
      '.hero__facts',
      '.bento',
      '#experience',
      '.experience-grid',
      '.experience-stack',
      '#contact',
    ].map((selector) => {
      const node = document.querySelector(selector);
      const rect = node.getBoundingClientRect();
      return {
        selector,
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    }),
    brokenImages: [...document.images]
      .filter((image) => image.complete && !image.naturalWidth)
      .map((image) => image.src),
  }));
}

try {
  for (const width of widths) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
      });
      await prepare(context);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelectorAll('img').forEach((image) => {
          image.loading = 'eager';
        });
      });
      await page.waitForFunction(() =>
        [...document.images].every((image) => image.complete)
      );
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((image) => image.decode()));
      });
      const measured = await measurements(page);
      assert.ok(
        measured.scroll <= measured.client,
        `overflow at ${width}/${theme}`
      );
      assert.ok(measured.font, 'self-hosted font must load');
      assert.deepEqual(measured.brokenImages, []);
      assert.deepEqual(errors, []);
      for (const element of measured.elements) {
        assert.ok(
          element.left >= -1 && element.right <= width + 1,
          `${element.selector} clipped at ${width}`
        );
      }
      await page.screenshot({
        path: `${output}/viewport-${width}-${theme}.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await page.locator('.hero').screenshot({
        path: `${output}/hero-${width}-${theme}.png`,
        animations: 'disabled',
      });
      await page.locator('#expertise').screenshot({
        path: `${output}/expertise-${width}-${theme}.png`,
        animations: 'disabled',
      });
      await page.evaluate(() =>
        window.scrollTo({
          top: document.querySelector('#work').offsetTop - 90,
          behavior: 'instant',
        })
      );
      await page.evaluate(
        () =>
          new Promise((done) =>
            requestAnimationFrame(() => requestAnimationFrame(done))
          )
      );
      await page.screenshot({
        path: `${output}/work-${width}-${theme}.png`,
        fullPage: false,
        animations: 'disabled',
      });
      await page.evaluate(() =>
        window.scrollTo({
          top: document.querySelector('#experience').offsetTop - 90,
          behavior: 'instant',
        })
      );
      await page.screenshot({
        path: `${output}/experience-${width}-${theme}.png`,
      });
      assert.equal(await page.locator('#theme-toggle svg:visible').count(), 1);
      if (width === 1440) {
        await page.addScriptTag({ content: axe.source });
        const audit = await page.evaluate(async () =>
          window.axe.run(document, {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
            },
          })
        );
        writeFileSync(
          `${output}/accessibility-${theme}.json`,
          JSON.stringify(audit, null, 2)
        );
        assert.deepEqual(
          audit.violations.map((item) => item.id),
          [],
          `accessibility ${theme}`
        );
      }
      results.responsive.push({
        width,
        theme,
        ...measured,
        pageErrors: errors,
      });
      await context.close();
    }
  }

  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await prepare(context);
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  // WebKit follows macOS Option-Tab for links with its default preference.
  await page.keyboard.press(
    engineName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab'
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    'skip-link'
  );
  await page.locator('#nav-toggle').click();
  await page.waitForFunction(
    () =>
      document.getElementById('nav-toggle').getAttribute('aria-expanded') ===
      'true'
  );
  assert.equal(
    await page.locator('#nav-toggle').getAttribute('aria-expanded'),
    'true'
  );
  await page.screenshot({ path: `${output}/mobile-menu.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () =>
      document.getElementById('nav-toggle').getAttribute('aria-expanded') ===
      'false'
  );
  assert.equal(
    await page.locator('#nav-toggle').getAttribute('aria-expanded'),
    'false'
  );
  await page.locator('#nav-toggle').click();
  await page.locator('#nav-panel a[href="#experience"]').click();
  assert.equal(
    await page.locator('#nav-toggle').getAttribute('aria-expanded'),
    'false'
  );
  results.interactions.push(
    'keyboard skip link, mobile menu, Escape, experience navigation'
  );

  assert.equal(
    await page.locator('#work-grid [data-project-type="professional"]').count(),
    11
  );
  assert.equal(
    await page
      .locator(
        '#work-grid [data-project-type="professional"] a, #work-grid img'
      )
      .count(),
    0
  );
  assert.equal(
    await page
      .locator(
        '#work-grid [data-project-type="personal"] a[href^="https://github.com/"]'
      )
      .count(),
    2
  );
  await page.locator('#filter-all').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#filter-professional').isChecked(), true);
  assert.equal(await page.locator('#work-grid .work-card:visible').count(), 11);
  results.interactions.push(
    'identity-free team contributions and public personal links; keyboard radio filtering'
  );

  for (const [filter, count] of [
    ['professional', 11],
    ['personal', 2],
    ['all', 13],
  ]) {
    await page.locator(`label[for="filter-${filter}"]`).click();
    assert.equal(
      await page.locator('#work-grid .work-card:visible').count(),
      count
    );
    assert.equal(
      await page.locator('#work-status').textContent(),
      `Showing ${count} of 13 portfolio entries. ${filter === 'professional' ? '60 professional project contributions across 11 sectors, delivered with project teams' : filter === 'personal' ? '2 public personal projects' : '60 professional project contributions across 11 sectors, delivered with project teams; 2 public personal projects'}.`
    );
    assert.equal(await page.locator(`#filter-${filter}`).isChecked(), true);
    const visibleProfessionalCount = await page
      .locator('#work-grid [data-project-type="professional"]:visible')
      .evaluateAll((nodes) =>
        nodes.reduce((sum, node) => sum + Number(node.dataset.projectCount), 0)
      );
    assert.equal(visibleProfessionalCount, filter === 'personal' ? 0 : 60);
  }
  await page.locator('#filter-all').focus();
  for (const [key, filter, count] of [
    ['ArrowRight', 'professional', 11],
    ['ArrowRight', 'personal', 2],
    ['ArrowLeft', 'professional', 11],
    ['ArrowLeft', 'all', 13],
  ]) {
    await page.keyboard.press(key);
    assert.equal(await page.locator(`#filter-${filter}`).isChecked(), true);
    assert.equal(
      await page.locator('#work-grid .work-card:visible').count(),
      count
    );
    assert.equal(
      await page
        .locator(`#filter-${filter}`)
        .evaluate((node) => node === document.activeElement),
      true
    );
  }
  assert.equal(
    await page
      .locator('#work-grid [data-project-type="professional"]')
      .evaluateAll((nodes) =>
        nodes.reduce((sum, n) => sum + Number(n.dataset.projectCount), 0)
      ),
    60
  );
  assert.equal(await page.locator('.hero__facts dd').first().innerText(), '60');
  assert.equal(
    await page.locator('#top h1').innerText(),
    'Senior Product Engineer'
  );
  assert.ok(
    !(await page.locator('body').innerText())
      .toLowerCase()
      .includes('rootstack')
  );
  results.interactions.push(
    'all project filters, full contribution totals and accessible status counts'
  );

  const previousTheme = await page.locator('html').getAttribute('data-theme');
  await page.locator('#theme-toggle').click();
  await page.waitForFunction((previous) => {
    const selected = document.documentElement.getAttribute('data-theme');
    return selected !== null && selected !== previous;
  }, previousTheme);
  const selectedTheme = await page.locator('html').getAttribute('data-theme');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(
    await page.locator('html').getAttribute('data-theme'),
    selectedTheme
  );
  results.interactions.push('theme selection persists after reload');
  await page.locator('#marquee-toggle').click();
  assert.equal(
    await page.locator('#marquee-toggle').getAttribute('aria-pressed'),
    'true'
  );
  assert.equal(
    await page
      .locator('#marquee-track')
      .evaluate((node) => getComputedStyle(node).animationPlayState),
    'paused'
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page
      .locator('#marquee-track')
      .evaluate((node) => getComputedStyle(node).animationName),
    'none'
  );
  results.interactions.push('animation pause and reduced-motion behavior');

  const expected = sha(readFileSync('public/Victor_Jimenez_CV.pdf'));
  for (const file of ['Victor_Jimenez_CV.pdf', 'victorjimenezcv.pdf']) {
    const response = await context.request.get(`${base}/${file}`);
    assert.equal(response.status(), 200);
    assert.ok(response.headers()['content-type'].includes('application/pdf'));
    assert.equal(sha(await response.body()), expected);
  }
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.hero__actions a[download]').click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'Victor_Jimenez_CV.pdf');
  assert.equal(await download.failure(), null);
  assert.equal(sha(readFileSync(await download.path())), expected);
  results.interactions.push(
    'both served CV URLs and clicked download have current identical bytes'
  );
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#work').scrollIntoViewIfNeeded();
  assert.ok((await measurements(page)).scroll <= 375);
  await page.screenshot({ path: `${output}/work-forced-colors.png` });
  await page.emulateMedia({ forcedColors: 'none' });
  await context.close();

  results.interactions.push(
    ...(await verifyNavigationFallback(browser, base, output))
  );

  const errorContext = await browser.newContext();
  await errorContext.route('https://dev.to/api/articles?**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' })
  );
  const errorPage = await errorContext.newPage();
  await errorPage.goto(base, { waitUntil: 'networkidle' });
  assert.equal(
    await errorPage.locator('#writing-grid').textContent(),
    'The writing feed is unavailable.'
  );
  await errorPage.locator('#consent-decline').click();
  await errorPage.reload({ waitUntil: 'networkidle' });
  assert.equal(
    await errorPage.locator('#consent').getAttribute('data-visible'),
    null
  );
  await errorPage.evaluate(() =>
    localStorage.setItem('analytics-consent', 'invalid-consent')
  );
  await errorPage.reload({ waitUntil: 'networkidle' });
  assert.equal(
    await errorPage.locator('#consent').getAttribute('data-visible'),
    'true'
  );
  assert.equal(
    await errorPage.locator('script[src*="googletagmanager.com"]').count(),
    0
  );
  results.interactions.push(
    'feed failure fallback, analytics rejection persistence and invalid consent recovery'
  );
  await errorContext.close();

  for (const width of [767, 769, 991, 992, 993]) {
    const ctx = await browser.newContext({ viewport: { width, height: 700 } });
    await prepare(ctx);
    const pg = await ctx.newPage();
    await pg.goto(base, { waitUntil: 'networkidle' });
    const measured = await measurements(pg);
    assert.ok(
      measured.scroll <= measured.client,
      `breakpoint overflow ${width}`
    );
    results.responsive.push({ width, state: 'breakpoint', ...measured });
    await ctx.close();
  }

  const noJs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 640 },
  });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base);
  assert.ok(await staticPage.locator('#experience h3').first().isVisible());
  assert.ok(await staticPage.locator('.hero__actions a[download]').isVisible());
  assert.ok(await staticPage.locator('.work-fallback').isVisible());
  assert.equal(await staticPage.locator('#work-controls').isVisible(), false);
  assert.equal(await staticPage.locator('.work-fallback a').count(), 2);
  const sectorLabels = await staticPage
    .locator('.professional-sector-counts li')
    .allTextContents();
  assert.equal(sectorLabels.length, 11);
  assert.equal(
    sectorLabels.reduce(
      (sum, text) => sum + Number(text.match(/: (\d+) projects$/)[1]),
      0
    ),
    60
  );
  assert.ok(
    (await staticPage.locator('.work-fallback').innerText()).includes(
      'as part of project teams'
    )
  );
  assert.ok(await staticPage.locator('#contact a').first().isVisible());
  assert.ok((await measurements(staticPage)).scroll <= 320);
  results.interactions.push('experience and CV available without JavaScript');
  await noJs.close();

  for (const [name, engine] of Object.entries(engines).filter(
    ([name]) => name !== engineName
  )) {
    const alternate = await engine.launch();
    try {
      const ctx = await alternate.newContext({
        viewport: { width: 375, height: 812 },
      });
      await prepare(ctx);
      const pg = await ctx.newPage();
      await pg.goto(base, { waitUntil: 'networkidle' });
      const measured = await measurements(pg);
      assert.ok(measured.scroll <= measured.client, `${name} overflow`);
      await pg.locator('#nav-toggle').click();
      await pg.waitForFunction(
        () =>
          document
            .getElementById('nav-toggle')
            .getAttribute('aria-expanded') === 'true'
      );
      assert.equal(
        await pg.locator('#nav-toggle').getAttribute('aria-expanded'),
        'true'
      );
      await pg.keyboard.press('Escape');
      await pg.locator('label[for="filter-professional"]').click();
      assert.equal(
        await pg.locator('#work-grid .work-card:visible').count(),
        11
      );
      await pg
        .locator('#experience')
        .screenshot({ path: `${output}/experience-375-${name}.png` });
      results.engines.push({ name, version: alternate.version(), ...measured });
      await ctx.close();
    } finally {
      await alternate.close();
    }
  }
  results.finished = new Date().toISOString();
  results.passed = true;
} finally {
  writeFileSync(
    `${output}/verification.json`,
    JSON.stringify(results, null, 2)
  );
  await browser.close();
}
process.stdout.write(
  `Verified ${results.responsive.length} viewport/theme cases, ${results.interactions.length} interaction groups and ${results.engines.length + 1} browser engines.\n`
);
