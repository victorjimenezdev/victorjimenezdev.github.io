import { agentBlogArticles, agentBlogIndex } from './data/writing.js';

export { agentBlogIndex };

/* dev.to proxies cover images through media*.dev.to. When the upstream asset
   404s, the proxy still answers 200 - with its own "image no longer exists"
   artwork - so neither an error handler nor a URL test can catch it. Reading
   the original URL back out of the proxy path and requesting that directly
   means a missing image fails honestly, and the error handler can substitute a
   local placeholder. */
const DEVTO_PROXY = /^https?:\/\/media\d*\.dev\.to\/[^/]+\/image\/[^/]*\/(.+)$/;

export const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e8e6ef'/%3E%3Cpath d='M330 250l50-55 45 50 40-42 55 62z' fill='%23b9b4c9'/%3E%3Ccircle cx='325' cy='185' r='22' fill='%23b9b4c9'/%3E%3C/svg%3E";

const FEED_LIMIT = 3;
const UNAVAILABLE = 'The writing feed is unavailable.';
const EMPTY_FEED = 'No articles published yet.';

/* dev.to descriptions leak the MDX preamble of the source article, so lines
   like `import Tabs from '@theme/Tabs';` render as body copy. */
export function cleanExcerpt(text) {
  return String(text || '')
    .replace(/import\s+[^;]+?from\s+['"][^'"]+['"];?/g, '')
    .replace(/^\s*<[^>]+>\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function safeHttpsUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return '';
    if (url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function safeImageUrl(value) {
  const https = safeHttpsUrl(value);
  if (https) return https;
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:') return '';
    if (url.username || url.password) return '';
    return url.href;
  } catch {
    return '';
  }
}

function feedCover(article) {
  const candidate = article.cover_image || article.social_image || '';
  if (!candidate) return '';

  const proxied = String(candidate).match(DEVTO_PROXY);
  if (!proxied) return safeImageUrl(candidate);

  try {
    const original = decodeURIComponent(proxied[1]);
    return safeImageUrl(original) || safeHttpsUrl(candidate);
  } catch {
    return safeHttpsUrl(candidate);
  }
}

export function reactionLabel(count) {
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    return null;
  }
  return `${count} reactions`;
}

function publishedFields(value) {
  const raw = String(value ?? '').trim();
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (day) {
    const date = new Date(
      Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12)
    );
    return {
      dateTime: `${day[1]}-${day[2]}-${day[3]}`,
      label: new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date),
    };
  }

  const published = new Date(raw);
  if (Number.isNaN(published.getTime())) return { dateTime: '', label: '' };
  return {
    dateTime: published.toISOString(),
    label: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(published),
  };
}

function entryTime(entry) {
  const raw = entry?.date || entry?.publishedAt || '';
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw).trim());
  if (day) {
    return Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12);
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function seriesRank(entry) {
  return typeof entry?.series === 'number' && Number.isFinite(entry.series)
    ? entry.series
    : Number.POSITIVE_INFINITY;
}

export function sortOwnedEntries(entries) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aTime = entryTime(a.entry);
      const bTime = entryTime(b.entry);
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);
      if (aValid && bValid && aTime !== bTime) return bTime - aTime;
      if (aValid !== bValid) return aValid ? -1 : 1;
      const rank = seriesRank(a.entry) - seriesRank(b.entry);
      if (rank !== 0) return rank;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function toCard(entry, { feed = false } = {}) {
  const href = safeHttpsUrl(entry?.url);
  const title = String(entry?.title || '').trim();
  if (!href || !title) return null;

  const published = publishedFields(
    feed ? entry.published_at : entry.date || entry.published_at
  );
  return {
    title,
    excerpt: cleanExcerpt(feed ? entry.description : entry.excerpt),
    href,
    cover: feed
      ? feedCover(entry)
      : safeHttpsUrl(entry.cover || entry.cover_image || ''),
    dateTime: published.dateTime,
    label: published.label,
    reactions: feed ? reactionLabel(entry.public_reactions_count) : null,
  };
}

async function resolveFeed(fetchFeed) {
  if (typeof fetchFeed !== 'function') {
    return { source: 'devto', cards: [], notice: UNAVAILABLE };
  }

  try {
    const articles = await fetchFeed();
    if (!Array.isArray(articles) || articles.length === 0) {
      return { source: 'devto', cards: [], notice: EMPTY_FEED };
    }

    const cards = articles
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, FEED_LIMIT)
      .map((entry) => toCard(entry, { feed: true }))
      .filter(Boolean);

    if (cards.length === 0) {
      return { source: 'devto', cards: [], notice: UNAVAILABLE };
    }
    return { source: 'devto', cards, notice: null };
  } catch {
    return { source: 'devto', cards: [], notice: UNAVAILABLE };
  }
}

export async function resolveWriting({
  owned = agentBlogArticles,
  fetchFeed,
} = {}) {
  if (Array.isArray(owned) && owned.length > 0) {
    const cards = sortOwnedEntries(owned)
      .map((entry) => toCard(entry))
      .filter(Boolean);
    if (cards.length === 0) {
      return { source: 'owned', cards: [], notice: UNAVAILABLE };
    }
    return { source: 'owned', cards, notice: null };
  }

  return resolveFeed(fetchFeed);
}
