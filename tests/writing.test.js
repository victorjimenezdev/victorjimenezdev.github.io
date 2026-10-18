import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { agentBlogArticles, agentBlogIndex } from '../src/data/writing.js';
import { resolveWriting, safeHttpsUrl } from '../src/writing.js';

const OWNED_URLS = [
  'https://victorstack-ai.github.io/agent-blog/how-i-combine-harness-loop-graph-engineering',
  'https://victorstack-ai.github.io/agent-blog/harness-engineering',
  'https://victorstack-ai.github.io/agent-blog/loop-engineering',
  'https://victorstack-ai.github.io/agent-blog/graph-engineering',
];

test('four owned articles are available without a feed request', async () => {
  let requested = false;
  const result = await resolveWriting({
    fetchFeed: async () => {
      requested = true;
      throw new Error('feed down');
    },
  });

  assert.equal(requested, false);
  assert.equal(result.source, 'owned');
  assert.equal(result.notice, null);
  assert.equal(result.cards.length, 4);
  assert.deepEqual(
    result.cards.map((card) => card.href),
    OWNED_URLS
  );
  assert.deepEqual(
    result.cards.map((card) => card.title),
    [
      'How I combine harness engineering, the loop and the graph',
      'Harness engineering: check context and proof before the model',
      'Loop engineering: observe, act, check, and know when to stop',
      'Graph engineering: draw the workflow before the agent improvises one',
    ]
  );

  for (const [index, card] of result.cards.entries()) {
    assert.equal(card.reactions, null);
    assert.equal(card.dateTime, '2026-10-18');
    assert.equal(card.label, 'Oct 18, 2026');
    assert.equal(card.excerpt.length > 0, true);
    assert.equal(
      card.cover,
      agentBlogArticles.find((entry) => entry.url === card.href).cover
    );
    assert.equal(card.href, OWNED_URLS[index]);
    assert.equal(safeHttpsUrl(card.href), card.href);
  }
});

test('empty owned data falls back to the three newest feed articles', async () => {
  const result = await resolveWriting({
    owned: [],
    fetchFeed: async () => [
      {
        title: 'Older',
        url: 'https://dev.to/victorstackai/older',
        description: 'Old note',
        published_at: '2020-01-01T00:00:00.000Z',
        public_reactions_count: 1,
        cover_image: 'https://dev.to/older.jpg',
      },
      {
        title: 'Newest',
        url: 'https://dev.to/victorstackai/newest',
        description: "import Tabs from '@theme/Tabs'; Fresh note",
        published_at: '2024-06-01T00:00:00.000Z',
        public_reactions_count: 4,
        cover_image:
          'https://media2.dev.to/dynamic/image/width=800/https%3A%2F%2Fcdn.example%2Fcover.jpg',
      },
      {
        title: 'Middle',
        url: 'https://dev.to/victorstackai/middle',
        description: 'Middle note',
        published_at: '2022-03-01T00:00:00.000Z',
        public_reactions_count: 2,
        cover_image: 'https://dev.to/middle.jpg',
      },
      {
        title: 'Fourth',
        url: 'https://dev.to/victorstackai/fourth',
        description: 'Fourth note',
        published_at: '2021-03-01T00:00:00.000Z',
        public_reactions_count: 9,
        cover_image: 'https://dev.to/fourth.jpg',
      },
    ],
  });

  assert.equal(result.source, 'devto');
  assert.equal(result.notice, null);
  assert.deepEqual(
    result.cards.map((card) => card.title),
    ['Newest', 'Middle', 'Fourth']
  );
  assert.equal(result.cards[0].reactions, '4 reactions');
  assert.equal(result.cards[0].excerpt, 'Fresh note');
  assert.equal(result.cards[0].cover, 'https://cdn.example/cover.jpg');
  assert.equal(result.cards[2].reactions, '9 reactions');
});

test('unsafe links are dropped and missing reactions stay omitted', async () => {
  let requested = false;
  const result = await resolveWriting({
    owned: [
      {
        title: 'Bad link',
        excerpt: '<img src=x onerror=alert(1)>',
        url: 'javascript:alert(1)',
        date: '2026-10-18',
        cover: 'javascript:alert(2)',
        series: 1,
        public_reactions_count: 99,
      },
      {
        title: 'Safe link',
        excerpt: 'The runtime around the model.',
        url: 'https://victorstack-ai.github.io/agent-blog/harness-engineering',
        date: '2026-10-18',
        cover:
          'https://victorstack-ai.github.io/agent-blog/img/harness-engineering.jpg',
        series: 2,
        public_reactions_count: 12,
      },
    ],
    fetchFeed: async () => {
      requested = true;
      return [];
    },
  });

  assert.equal(requested, false);
  assert.equal(result.cards.length, 1);
  assert.equal(
    result.cards[0].href,
    'https://victorstack-ai.github.io/agent-blog/harness-engineering'
  );
  assert.equal(result.cards[0].reactions, null);
  assert.equal(result.cards[0].excerpt.includes('<'), false);
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('http://victorstack-ai.github.io/agent-blog/'), '');
});

test('feed failure is reported only when owned data is empty', async () => {
  const failed = await resolveWriting({
    owned: [],
    fetchFeed: async () => {
      throw new Error('Feed responded 503');
    },
  });
  assert.equal(failed.notice, 'The writing feed is unavailable.');
  assert.deepEqual(failed.cards, []);

  const empty = await resolveWriting({
    owned: [],
    fetchFeed: async () => [],
  });
  assert.equal(empty.notice, 'No articles published yet.');

  const unsafeFeed = await resolveWriting({
    owned: null,
    fetchFeed: async () => [
      {
        title: 'Script',
        url: 'javascript:alert(1)',
        description: 'nope',
        published_at: '2024-01-01T00:00:00.000Z',
        public_reactions_count: 3,
      },
    ],
  });
  assert.equal(unsafeFeed.notice, 'The writing feed is unavailable.');

  const missingCount = await resolveWriting({
    owned: [],
    fetchFeed: async () => [
      {
        title: 'No count',
        url: 'https://dev.to/victorstackai/no-count',
        description: 'Plain',
        published_at: '2024-01-02T00:00:00.000Z',
      },
    ],
  });
  assert.equal(missingCount.cards[0].reactions, null);

  const ownedStillShows = await resolveWriting({
    owned: agentBlogArticles,
    fetchFeed: async () => {
      throw new Error('Feed responded 503');
    },
  });
  assert.equal(ownedStillShows.cards.length, 4);
  assert.equal(ownedStillShows.notice, null);
});

test('All articles points at the agent blog index', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(agentBlogIndex, 'https://victorstack-ai.github.io/agent-blog/');
  assert.match(
    html,
    /id="writing"[\s\S]*href="https:\/\/victorstack-ai\.github\.io\/agent-blog\/"/
  );
});
