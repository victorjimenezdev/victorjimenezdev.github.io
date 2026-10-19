import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clickPayload,
  CONSENT_KEY,
  createAnalytics,
  GA_ID,
  safePageLocation,
  safeReferrer,
} from '../src/analytics.js';

function harness({
  consent,
  origin = 'https://victorjimenezdev.github.io',
  storageFails = false,
  tagThrows = false,
} = {}) {
  const calls = [];
  const scripts = [];
  const listeners = new Map();
  const events = [];
  const stored = new Map(consent ? [[CONSENT_KEY, consent]] : []);
  const win = {
    location: new URL(origin),
    localStorage: {
      getItem(key) {
        if (storageFails) throw new Error('blocked');
        return stored.get(key);
      },
      setItem(key, value) {
        if (storageFails) throw new Error('blocked');
        stored.set(key, value);
      },
    },
    CustomEvent: class {
      constructor(type, { detail }) {
        this.type = type;
        this.detail = detail;
      }
    },
    gtag(...args) {
      if (tagThrows) throw new Error('tag unavailable');
      calls.push(args);
    },
  };
  const doc = {
    referrer: 'https://example.com/private/person?email=private@example.com',
    head: { appendChild: (script) => scripts.push(script) },
    createElement: () => ({}),
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) || []), listener]);
    },
    dispatchEvent(event) {
      events.push(event.detail);
    },
  };
  const analytics = createAnalytics({ win, doc });
  const link = {
    tagName: 'A',
    dataset: { track: 'click_contact', trackLabel: 'email' },
    matches: () => false,
    getAttribute: () => 'mailto:private@example.com?subject=Private',
    closest: (selector) => (selector === '#contact' ? {} : null),
  };
  const click = () => ({ target: { closest: () => link } });
  const dispatch = (event = click()) => {
    for (const fn of listeners.get('click') || []) fn(event);
  };
  return {
    analytics,
    win,
    doc,
    calls,
    scripts,
    events,
    listeners,
    link,
    dispatch,
    click,
  };
}

test('click payloads contain only known placements, channels, slugs and action types', () => {
  assert.deepEqual(
    clickPayload({
      event: 'cv_download_click',
      placement: 'hero',
      email: 'private@example.com',
    }),
    { name: 'cv_download_click', parameters: { placement: 'hero' } }
  );
  for (const channel of ['email', 'github', 'linkedin']) {
    assert.deepEqual(
      clickPayload({ event: 'click_contact', placement: 'contact', channel }),
      {
        name: 'click_contact',
        parameters: {
          placement: 'contact',
          event_category: 'engagement',
          event_label: channel,
        },
      }
    );
  }
  for (const linkType of ['details', 'source', 'demo', 'reference']) {
    assert.deepEqual(
      clickPayload({
        event: 'project_click',
        placement: 'project_card',
        projectSlug: 'project-context-connector',
        linkType,
      }),
      {
        name: 'project_click',
        parameters: {
          placement: 'project_card',
          project_slug: 'project-context-connector',
          link_type: linkType,
        },
      }
    );
  }
  for (const invalid of [
    { event: 'click', placement: 'hero' },
    { event: 'file_download', placement: 'hero' },
    { event: 'cv_download_click', placement: 'private@example.com' },
    { event: 'click_contact', placement: 'contact', channel: '+573000000000' },
    {
      event: 'project_click',
      placement: 'project_card',
      projectSlug: 'private-customer',
      linkType: 'source',
    },
    {
      event: 'project_click',
      placement: 'project_card',
      projectSlug: 'media',
      linkType: 'https://example.com/private',
    },
  ])
    assert.equal(clickPayload(invalid), null);
});

test('unknown and denied consent emit nothing, including when gtag already exists', () => {
  for (const consent of [undefined, 'denied', 'invalid']) {
    const h = harness({ consent });
    h.analytics.start();
    h.analytics.load();
    h.dispatch();
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.scripts, []);
  }
});

test('revocation stops calls, regrant counts only new clicks, and storage failure preserves the decision', () => {
  const h = harness({ storageFails: true });
  h.analytics.start();
  h.dispatch();
  h.analytics.setConsent('granted');
  h.dispatch();
  h.analytics.setConsent('denied');
  h.dispatch();
  h.analytics.setConsent('granted');
  h.dispatch();
  assert.equal(h.calls.length, 2);
  assert.equal(h.analytics.consent, 'granted');
});

test('repeated setup and duplicate handling of one activation do not multiply events; distinct clicks count', () => {
  const h = harness({ consent: 'granted' });
  h.analytics.start();
  h.analytics.start();
  const same = createAnalytics({ win: h.win, doc: h.doc });
  same.start();
  assert.equal(same, h.analytics);
  assert.equal(h.listeners.get('click').length, 1);
  const event = h.click();
  h.dispatch(event);
  h.dispatch(event);
  h.dispatch();
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[0], [
    'event',
    'click_contact',
    {
      placement: 'contact',
      event_category: 'engagement',
      event_label: 'email',
    },
  ]);
  assert.ok(!JSON.stringify(h.calls).includes('private@example.com'));
});

test('all local testing uses DOM events, and nonproduction remote previews collect nothing', () => {
  for (const origin of [
    'http://localhost:4337',
    'http://127.0.0.1:4337',
    'http://[::1]:4337',
  ]) {
    const h = harness({ origin, consent: 'granted' });
    h.analytics.start();
    h.analytics.load();
    h.dispatch();
    assert.equal(h.events.length, 1);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.scripts, []);
  }
  const h = harness({
    origin: 'https://preview.example.com',
    consent: 'granted',
  });
  h.analytics.start();
  h.analytics.load();
  h.dispatch();
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.scripts, []);
});

test('production loads one tag only after consent and provides sanitized page metadata', () => {
  const h = harness();
  delete h.win.gtag;
  h.analytics.load();
  assert.equal(h.scripts.length, 0);
  h.analytics.setConsent('granted');
  h.analytics.load();
  h.analytics.load();
  assert.equal(h.scripts.length, 1);
  assert.equal(
    h.scripts[0].src,
    `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  );
  assert.deepEqual(Array.from(h.win.dataLayer[1]), [
    'config',
    GA_ID,
    {
      anonymize_ip: true,
      page_location: 'https://victorjimenezdev.github.io/',
      page_referrer: 'https://example.com',
    },
  ]);
});

test('page metadata strips private queries, fragments, referrer paths and credentials while retaining approved generic tags', () => {
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?email=private@example.com#private'
    ),
    'https://victorjimenezdev.github.io/'
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=private@example.com&utm_medium=application&utm_campaign=remote_jobs_2026_10'
    ),
    'https://victorjimenezdev.github.io/'
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=linkedin&utm_medium=application&utm_campaign=remote_jobs_2026_10&utm_content=portfolio&email=private@example.com#private'
    ),
    'https://victorjimenezdev.github.io/?utm_source=linkedin&utm_medium=application&utm_campaign=remote_jobs_2026_10&utm_content=portfolio'
  );
  const digitalProfit =
    'https://victorjimenezdev.github.io/?utm_source=example_employer&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=linkedin_drupal_publicJob42';
  assert.equal(
    safePageLocation(`${digitalProfit}&email=private@example.com#private`),
    digitalProfit
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=private@example.com&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=linkedin_1'
    ),
    'https://victorjimenezdev.github.io/'
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=acme&utm_medium=job_application&utm_campaign=remote_jobs&utm_content=person%40example.com'
    ),
    'https://victorjimenezdev.github.io/?utm_source=acme&utm_medium=job_application&utm_campaign=remote_jobs'
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=agent-blog&utm_medium=referral&utm_campaign=cross-site&utm_content=navbar&fbclid=x'
    ),
    'https://victorjimenezdev.github.io/?utm_source=agent-blog&utm_medium=referral&utm_campaign=cross-site&utm_content=navbar'
  );
  assert.equal(
    safePageLocation(
      'https://victorjimenezdev.github.io/?utm_source=newsletter&utm_medium=referral&utm_campaign=cross-site'
    ),
    'https://victorjimenezdev.github.io/?utm_source=newsletter&utm_medium=referral&utm_campaign=cross-site'
  );
  for (const unsupported of [
    'utm_source=newsletter&utm_medium=cpc&utm_campaign=cross-site',
    'utm_source=acme&utm_medium=job_application&utm_campaign=other_jobs',
    'utm_source=Newsletter&utm_medium=email&utm_campaign=cross-site',
  ]) {
    assert.equal(
      safePageLocation(`https://victorjimenezdev.github.io/?${unsupported}`),
      'https://victorjimenezdev.github.io/'
    );
  }
  assert.equal(
    safeReferrer(
      'https://person:password@example.com/private?email=private@example.com#secret'
    ),
    'https://example.com'
  );
  assert.equal(safeReferrer('mailto:private@example.com'), '');
  assert.equal(safeReferrer(''), '');
});

test('malformed targets and tag failures cannot break normal click handling', () => {
  const h = harness({ consent: 'granted', tagThrows: true });
  h.analytics.start();
  assert.doesNotThrow(() => h.dispatch());
  h.link.getAttribute = () => 'http://[';
  assert.doesNotThrow(() => h.dispatch());
  assert.deepEqual(h.calls, []);
});
