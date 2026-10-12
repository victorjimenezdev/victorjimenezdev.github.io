import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4338';
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname),
  'analytics acceptance runs only on loopback'
);
const browser = await chromium.launch();
const results = [];
try {
  for (const initialConsent of [null, 'denied']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const gaRequests = [];
    const pageErrors = [];
    await context.route('**/*', async (route) => {
      const host = new URL(route.request().url()).hostname;
      if (
        /(^|\.)(google-analytics\.com|googletagmanager\.com|analytics\.google\.com)$/.test(
          host
        )
      ) {
        gaRequests.push(route.request().url());
        await route.abort();
      } else if (
        route.request().url().startsWith('https://dev.to/api/articles')
      ) {
        await route.fulfill({ json: [] });
      } else await route.continue();
    });
    await context.addInitScript((consent) => {
      if (consent) localStorage.setItem('analytics-consent', consent);
      window.testClicks = [];
      document.addEventListener('portfolio:analytics', ({ detail }) =>
        window.testClicks.push(detail)
      );
      document.addEventListener(
        'click',
        (event) => {
          if (event.target.closest('a')) event.preventDefault();
        },
        true
      );
    }, initialConsent);
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    const values = () => page.evaluate(() => window.testClicks);
    const cv = page.locator('a[download]');
    assert.equal(
      await cv.count(),
      4,
      'all four current CV controls are exercised'
    );
    await cv.first().click();
    assert.deepEqual(
      await values(),
      [],
      'unknown/denied consent is not recorded'
    );
    if (initialConsent) await page.locator('#consent-reopen').click();
    await page.locator('#consent-accept').click();
    for (let index = 0; index < 4; index += 1) {
      if (index === 3) await page.locator('#boss-launch').click();
      await cv.nth(index).click();
    }
    await page.keyboard.press('Escape');
    assert.deepEqual(
      await values(),
      ['hero', 'profile', 'experience', 'boss'].map((placement) => ({
        name: 'cv_download_click',
        parameters: { placement },
      }))
    );
    await page.evaluate(() => {
      window.testClicks = [];
    });

    for (const link of await page
      .locator('#profile a[href*="github.com/victorjimenezdev/project"]')
      .all())
      await link.click();
    for (const link of await page.locator('#work-grid a').all())
      await link.click();
    await page.locator('#work-grid a').first().click();
    await page.locator('#work-grid a').first().click();
    const projects = await values();
    assert.equal(projects.length, 6);
    assert.deepEqual(
      projects.map((p) => p.parameters.placement),
      [
        'profile',
        'profile',
        'project_card',
        'project_card',
        'project_card',
        'project_card',
      ]
    );
    assert.ok(
      projects.every(
        (p) => p.name === 'project_click' && p.parameters.link_type === 'source'
      )
    );
    await page.evaluate(() => {
      window.testClicks = [];
    });
    await page.locator('.planet').first().locator('.planet__orb').click();
    await page.locator('.planet').first().locator('.planet__orb').click();
    assert.deepEqual(
      await values(),
      Array.from({ length: 2 }, () => ({
        name: 'project_click',
        parameters: {
          placement: 'galaxy',
          project_slug: 'media',
          link_type: 'details',
        },
      }))
    );
    await page.evaluate(() => {
      window.testClicks = [];
    });
    for (const link of await page.locator('[data-track="click_contact"]').all())
      await link.locator('svg').click();
    assert.deepEqual(
      (await values()).map(({ name, parameters }) => [
        name,
        parameters.event_label,
        parameters.placement,
      ]),
      [
        ['click_contact', 'email', 'contact'],
        ['click_contact', 'linkedin', 'contact'],
        ['click_contact', 'github', 'contact'],
      ]
    );
    await page.evaluate(() => {
      window.testClicks = [];
    });
    for (const link of await page
      .locator('[data-track="click_agent_cta"]')
      .all())
      await link.click();
    assert.deepEqual(
      (await values()).map(({ name, parameters }) => [
        name,
        parameters.event_label,
        parameters.link_type,
      ]),
      [
        ['click_agent_cta', 'github', 'source'],
        ['click_agent_cta', 'blog', 'reference'],
      ]
    );
    await page.evaluate(() => {
      window.testClicks = [];
    });
    await page.locator('#consent-reopen').click();
    await page.locator('#consent-decline').click();
    await cv.first().click();
    assert.deepEqual(await values(), [], 'revocation stops subsequent clicks');
    await page.locator('#consent-reopen').click();
    await page.locator('#consent-accept').click();
    await cv.first().click();
    assert.equal(
      (await values()).length,
      1,
      'regrant does not replay earlier clicks'
    );
    await page.evaluate(() => {
      window.testClicks = [];
      for (const [id, href, slug] of [
        [
          'test-demo',
          'https://example.com/demo?email=private@example.com',
          'project-context-connector',
        ],
        ['test-private', 'https://example.com/demo', 'private@example.com'],
        ['test-job', 'https://jobs.example.com/listing', null],
      ]) {
        const link = document.createElement('a');
        link.id = id;
        link.href = href;
        link.textContent = id;
        if (slug) {
          link.dataset.track = 'project_click';
          link.dataset.trackProject = slug;
          link.dataset.trackType = 'demo';
        }
        document.getElementById('work-grid').appendChild(link);
      }
    });
    await page.locator('#test-demo').click();
    await page.locator('#test-private').click();
    await page.locator('#test-job').click();
    assert.deepEqual(
      await values(),
      [
        {
          name: 'project_click',
          parameters: {
            placement: 'project_card',
            project_slug: 'project-context-connector',
            link_type: 'demo',
          },
        },
      ],
      'future demo markers work; private slugs and untracked job links emit nothing'
    );
    assert.equal(
      await page.locator('script[src*="googletagmanager"]').count(),
      0
    );
    assert.deepEqual(
      gaRequests,
      [],
      'no requests reached or attempted production analytics'
    );
    assert.deepEqual(pageErrors, []);
    results.push({
      initialConsent,
      CVPlacements: ['hero', 'profile', 'experience', 'boss'],
      sourceClicks: 6,
      nestedDetailClicks: 2,
      contactChannels: 3,
      featuredLinks: 2,
      futureDemoFixture: 'passed',
      privateSlugAndJobLinkIgnored: 'passed',
      revokedConsent: 'passed',
      regrantWithoutReplay: 'passed',
      productionAnalyticsRequests: 0,
      pageErrors,
    });
    await context.close();
  }
  mkdirSync('evidence/analytics', { recursive: true });
  writeFileSync(
    'evidence/analytics/browser-verification.json',
    JSON.stringify(
      { url: base, at: new Date().toISOString(), results },
      null,
      2
    )
  );
  process.stdout.write(
    JSON.stringify(
      { passed: true, scenarios: results.length, results },
      null,
      2
    ) + '\n'
  );
} finally {
  await browser.close();
}
