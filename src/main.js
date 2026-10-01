import './style.css';
import {
  workProjects,
  personalProjects,
  professionalProjectCount,
} from './data/projects.js';

const GA_ID = 'G-B0GQS2GS37';
const CONSENT_KEY = 'analytics-consent';
const THEME_KEY = 'theme';
const FEED_URL =
  'https://dev.to/api/articles?username=victorstackai&per_page=12';

/* dev.to proxies cover images through media*.dev.to. When the upstream asset
   404s, the proxy still answers 200 - with its own "image no longer exists"
   artwork - so neither an error handler nor a URL test can catch it. Reading
   the original URL back out of the proxy path and requesting that directly
   means a missing image fails honestly, and the error handler can substitute a
   local placeholder. */
const DEVTO_PROXY = /^https?:\/\/media\d*\.dev\.to\/[^/]+\/image\/[^/]*\/(.+)$/;

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e8e6ef'/%3E%3Cpath d='M330 250l50-55 45 50 40-42 55 62z' fill='%23b9b4c9'/%3E%3Ccircle cx='325' cy='185' r='22' fill='%23b9b4c9'/%3E%3C/svg%3E";

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------- theme -- */

function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function resolvedTheme() {
  return (
    document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light')
  );
}

function syncThemeControl(button) {
  const theme = resolvedTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);

  button.querySelectorAll('[data-theme-icon]').forEach((icon) => {
    icon.hidden = icon.dataset.themeIcon !== theme;
  });

  const meta = document.getElementById('theme-color-meta');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#161418' : '#fcfbfd');
  }
}

function setupTheme() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  syncThemeControl(button);

  /* Only meaningful while no explicit choice is stored; once the visitor
     chooses, data-theme pins the value in both directions. */
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (!readStoredTheme()) syncThemeControl(button);
    });

  button.addEventListener('click', () => {
    const next = resolvedTheme() === 'dark' ? 'light' : 'dark';

    const apply = () => {
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* storage blocked; the choice still applies for this page view */
      }
      syncThemeControl(button);
    };

    if (document.startViewTransition && !prefersReducedMotion()) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  });
}

/* ----------------------------------------------------------------- nav -- */

function setupNav() {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('nav-panel');
  if (!toggle || !panel) return;

  const supportsPopover =
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'showPopover');

  panel.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    if (supportsPopover && panel.matches(':popover-open')) panel.hidePopover();
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });

  if (supportsPopover) {
    /* The popover attribute already wires Esc, light dismiss, and focus
       return; only the explicit ARIA state needs syncing. */
    panel.addEventListener('toggle', (event) => {
      toggle.setAttribute('aria-expanded', String(event.newState === 'open'));
    });
    return;
  }

  toggle.removeAttribute('popovertarget');
  toggle.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('a')?.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) {
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
}

/* ------------------------------------------------------------- marquee -- */

function setupMarquee() {
  const button = document.getElementById('marquee-toggle');
  const marquee = button?.closest('.marquee');
  const track = document.getElementById('marquee-track');
  if (!button || !marquee || !track) return;

  /* The loop translates by -50%, so the track must hold exactly two copies.
     aria-hidden goes on each copied item: setting it on a wrapper that is then
     discarded would leave every technology announced twice. */
  [...track.children].forEach((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a, button').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
    track.appendChild(copy);
  });

  button.addEventListener('click', () => {
    const paused = marquee.dataset.paused === 'true';
    marquee.dataset.paused = String(!paused);
    button.setAttribute('aria-pressed', String(!paused));
  });
}

/* ---------------------------------------------------------------- work -- */

function buildWorkCard(project, template) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = node.querySelector('.work-card__title');
  const desc = node.querySelector('.work-card__desc');
  const tags = node.querySelector('.tags');
  const personal = project.type === 'personal';

  if (personal) {
    const link = document.createElement('a');
    link.textContent = project.title;
    link.href = project.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    title.appendChild(link);
  } else {
    title.textContent = project.title;
  }
  node.querySelector('.work-card__kind').textContent = personal
    ? 'Personal project'
    : 'Team contribution';
  node.querySelector('.work-card__kicker').textContent = personal
    ? 'Open source'
    : 'Web engineering';
  node.querySelector('.work-card__platform').textContent = personal
    ? project.tags[0]
    : `${project.projectCount} projects`;
  node.dataset.projectCount = personal ? '1' : String(project.projectCount);
  desc.textContent = project.description;

  project.tags.slice(0, 3).forEach((tag) => {
    const li = document.createElement('li');
    li.className = 'tag';
    li.textContent = tag;
    tags.appendChild(li);
  });

  node.dataset.projectType = project.type;
  return node;
}

function setupWork() {
  const grid = document.getElementById('work-grid');
  const template = document.getElementById('work-card-template');
  const status = document.getElementById('work-status');
  if (!grid || !template) return;

  const cards = [...workProjects, ...personalProjects].map((project) =>
    buildWorkCard(project, template)
  );
  cards.forEach((card) => grid.appendChild(card));

  const applyFilter = (value) => {
    let shown = 0;
    cards.forEach((card) => {
      const match = value === 'all' || card.dataset.projectType === value;
      /* Toggling hidden keeps the DOM stable, so focus and assistive-tech
         position survive a filter change. */
      card.hidden = !match;
      if (match) shown += 1;
    });

    if (status) {
      const professionalSummary = `${professionalProjectCount} professional project contributions across ${workProjects.length} sectors, delivered with project teams`;
      const personalSummary = `${personalProjects.length} public personal projects`;
      const summary =
        value === 'professional'
          ? professionalSummary
          : value === 'personal'
            ? personalSummary
            : `${professionalSummary}; ${personalSummary}`;
      status.textContent = `Showing ${shown} of ${cards.length} portfolio entries. ${summary}.`;
    }
  };

  document
    .getElementById('work-filters')
    ?.addEventListener('change', (event) => {
      const input = event.target.closest('.filter-input');
      if (input) applyFilter(input.value);
    });

  applyFilter('all');
  document.getElementById('work-controls').hidden = false;
}

/* ------------------------------------------------------------- writing -- */

/* dev.to descriptions leak the MDX preamble of the source article, so lines
   like `import Tabs from '@theme/Tabs';` render as body copy. */
function cleanExcerpt(text) {
  return String(text || '')
    .replace(/import\s+[^;]+?from\s+['"][^'"]+['"];?/g, '')
    .replace(/^\s*<[^>]+>\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function coverImageFor(article) {
  const candidate = article.cover_image || article.social_image || '';
  if (!candidate) return FALLBACK_IMAGE;

  const proxied = candidate.match(DEVTO_PROXY);
  if (!proxied) return candidate;

  try {
    const original = decodeURIComponent(proxied[1]);
    return /^https?:\/\//.test(original) ? original : candidate;
  } catch {
    return candidate;
  }
}

async function loadWriting() {
  const grid = document.getElementById('writing-grid');
  const template = document.getElementById('post-card-template');
  if (!grid || !template) return;

  try {
    const response = await fetch(FEED_URL);
    if (!response.ok) throw new Error(`Feed responded ${response.status}`);

    const articles = await response.json();
    if (!Array.isArray(articles) || articles.length === 0) {
      grid.replaceChildren(renderNotice('No articles published yet.'));
      return;
    }

    const fragment = document.createDocumentFragment();
    articles
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 3)
      .forEach((article) => {
        const node = template.content.firstElementChild.cloneNode(true);
        const img = node.querySelector('img');
        const link = node.querySelector('.work-card__title a');

        img.src = coverImageFor(article);
        img.alt = '';
        /* Now that the real upstream URL is requested, a missing cover fires a
           genuine error and swaps in the local placeholder. */
        img.addEventListener(
          'error',
          () => {
            if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
          },
          { once: true }
        );
        link.textContent = article.title;
        link.href = article.url;
        node.querySelector('.work-card__desc').textContent = cleanExcerpt(
          article.description
        );
        node.querySelector('[data-reactions]').textContent =
          `${article.public_reactions_count} reactions`;

        const time = node.querySelector('[data-published]');
        const published = new Date(article.published_at);
        time.dateTime = published.toISOString();
        time.textContent = published.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        fragment.appendChild(node);
      });

    grid.replaceChildren(fragment);
  } catch (error) {
    console.error('Writing feed unavailable', error);
    grid.replaceChildren(renderNotice('The writing feed is unavailable.'));
  }
}

function renderNotice(message) {
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = message;
  return p;
}

/* ------------------------------------------------------------- consent -- */

function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked; the choice applies to this page view only */
  }

  /* Declining after accepting has to stop collection in the same page view.
     The gtag script cannot be unloaded, so the opt-out flag it checks on every
     call is what actually silences it. */
  window[`ga-disable-${GA_ID}`] = value !== 'granted';
}

/* Nothing analytics-related exists until this runs: no script tag in the
   document head, no cookie, no network request. */
function loadAnalytics() {
  window[`ga-disable-${GA_ID}`] = false;
  if (window.gtag) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
}

function setupConsent() {
  const banner = document.getElementById('consent');
  const accept = document.getElementById('consent-accept');
  const decline = document.getElementById('consent-decline');
  const reopen = document.getElementById('consent-reopen');
  if (!banner || !accept || !decline) return;

  const decided = readConsent();
  if (decided === 'granted') loadAnalytics();
  if (!decided) banner.dataset.visible = 'true';
  if (reopen) reopen.hidden = !decided;

  const settle = (value) => {
    writeConsent(value);
    banner.dataset.visible = 'false';
    if (reopen) {
      reopen.hidden = false;
      reopen.focus();
    }
    if (value === 'granted') loadAnalytics();
  };

  accept.addEventListener('click', () => settle('granted'));
  decline.addEventListener('click', () => settle('denied'));

  reopen?.addEventListener('click', () => {
    banner.dataset.visible = 'true';
    accept.focus();
  });
}

/* ------------------------------------------------------------ chrome -- */

function setupBackToTop() {
  const button = document.getElementById('to-top');
  if (!button) return;

  const update = () => {
    button.dataset.visible = String(window.scrollY > 600);
  };

  window.addEventListener('scroll', update, { passive: true });
  update();

  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  });
}

function setupYear() {
  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = `© ${new Date().getFullYear()}`;
  });
}

function setupTelemetry() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-track]');
    if (!target || typeof window.gtag !== 'function') return;

    window.gtag('event', target.dataset.track, {
      event_category: target.dataset.trackCategory || 'engagement',
      event_label: target.dataset.trackLabel || '',
    });
  });
}

/* ----------------------------------------------------------------- init -- */

setupTheme();
setupNav();
setupMarquee();
setupWork();
setupConsent();
setupBackToTop();
setupYear();
setupTelemetry();
loadWriting();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) => {
        console.warn('Offline support unavailable', error);
      });
  });
}
