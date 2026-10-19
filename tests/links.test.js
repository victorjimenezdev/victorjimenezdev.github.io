import assert from 'node:assert/strict';
import test from 'node:test';
import { safePageLocation } from '../src/analytics.js';
import {
  BLOG_URL,
  PORTFOLIO_URL,
  applicationUrl,
  blogReferralUrl,
  campaignUrl,
} from '../src/links.js';

test('application links use public slugs and survive the sanitizer', () => {
  const url = applicationUrl({
    employer: 'example-employer',
    platform: 'linkedin',
    jobId: 'senior-drupal-developer',
  });
  assert.equal(
    url,
    'https://victorjimenezdev.github.io/?utm_source=example-employer&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=linkedin_senior-drupal-developer'
  );
  assert.equal(safePageLocation(`${url}&email=private@example.com#x`), url);
});

test('link builders refuse values that are not public lowercase slugs', () => {
  for (const employer of ['Digital Profit', 'person@example.com', 'a_b', '']) {
    assert.throws(() =>
      applicationUrl({ employer, platform: 'linkedin', jobId: '123' })
    );
  }
  assert.throws(() =>
    campaignUrl(BLOG_URL, {
      source: 'portfolio',
      medium: 'referral',
      campaign: 'cross-site',
      content: 'x'.repeat(101),
    })
  );
});

test('blog referral keeps the readable path and existing query', () => {
  assert.equal(
    blogReferralUrl(`${BLOG_URL}harness-engineering?ref=1#proof`, 'writing'),
    `${BLOG_URL}harness-engineering?ref=1&utm_source=portfolio&utm_medium=referral&utm_campaign=cross-site&utm_content=writing#proof`
  );
});

const PRIVATE = '&email=private@example.com&fbclid=x#private';

test('every supported share channel survives the sanitizer without private data', () => {
  for (const tags of [
    {
      source: 'newsletter',
      medium: 'email',
      campaign: 'monthly-digest',
      content: 'portfolio-link',
    },
    {
      source: 'email',
      medium: 'email',
      campaign: 'cross-site',
      content: 'signature',
    },
    {
      source: 'mastodon',
      medium: 'social',
      campaign: 'agent-blog',
      content: 'harness-engineering',
    },
    {
      source: 'linkedin',
      medium: 'social',
      campaign: 'profile',
      content: 'featured',
    },
    {
      source: 'whatsapp',
      medium: 'messaging',
      campaign: 'cross-site',
      content: 'direct-share',
    },
    {
      source: 'dev-to',
      medium: 'referral',
      campaign: 'cross-site',
      content: 'author-bio',
    },
  ]) {
    const url = campaignUrl(PORTFOLIO_URL, tags);
    assert.equal(safePageLocation(`${url}${PRIVATE}`), url, tags.source);
  }
});

test('submitted mixed-case job IDs and the legacy format still round-trip', () => {
  const application = campaignUrl(PORTFOLIO_URL, {
    source: 'example_employer',
    medium: 'job_application',
    campaign: 'remote_jobs',
    content: 'linkedin_drupal_publicjob42',
  });
  assert.equal(safePageLocation(`${application}${PRIVATE}`), application);
  const submitted = `${PORTFOLIO_URL}?utm_source=example_employer&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=linkedin_drupal_publicJob42`;
  assert.equal(safePageLocation(`${submitted}${PRIVATE}`), submitted);
  const legacy = `${PORTFOLIO_URL}?utm_source=get_on_board&utm_medium=application&utm_campaign=remote_jobs_2026_09&utm_content=cv`;
  assert.equal(safePageLocation(`${legacy}${PRIVATE}`), legacy);
});

test('campaignUrl refuses unsupported mediums and application campaigns clearly', () => {
  for (const tags of [
    {
      source: 'newsletter',
      medium: 'cpc',
      campaign: 'cross-site',
      content: 'x',
    },
    {
      source: 'acme',
      medium: 'application',
      campaign: 'remote_jobs_2026_10',
      content: 'cv',
    },
    {
      source: 'acme',
      medium: 'job_application',
      campaign: 'other_jobs',
      content: 'x',
    },
  ]) {
    assert.throws(
      () => campaignUrl(PORTFOLIO_URL, tags),
      /utm_medium must be one of/
    );
  }
  assert.throws(
    () =>
      campaignUrl(PORTFOLIO_URL, {
        source: 'newsletter',
        medium: 'email',
        campaign: 'digest',
        content: 'person@example.com',
      }),
    /utm_content must be a public lowercase slug/
  );
});
