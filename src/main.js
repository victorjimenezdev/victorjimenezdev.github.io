import './style.css';
import { createAnalytics } from './analytics.js';
import {
  workProjects,
  personalProjects,
  professionalProjectCount,
} from './data/projects.js';
import {
  FALLBACK_IMAGE,
  agentBlogIndexLink,
  resolveWriting,
} from './writing.js';
import { startSky } from './game/sky.js';
import { createAudio } from './game/audio.js';
import { createAchievements, goToTarget } from './game/achievements.js';
import { setupBoss } from './game/boss.js';
import {
  createParticles,
  scramble,
  setupMagnetic,
  setupSpotlight,
  setupStageTags,
} from './game/fx.js';
import { setupSaveFile, setupTechTree } from './game/profile.js';
import { HUES, setupGalaxy } from './game/galaxy.js';
import {
  createToaster,
  setupKonami,
  setupObjective,
  setupPopover,
  setupStageTracker,
  setupTilt,
  setupXpBar,
} from './game/hud.js';

const analytics = createAnalytics({ win: window, doc: document });
/* Versioned so choices made under the previous palette do not carry over;
   index.html drops the legacy key before first paint. */
const THEME_KEY = 'theme-v2';
const FEED_URL =
  'https://dev.to/api/articles?username=victorstackai&per_page=12';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------- theme -- */

/* Light (cream paper) unless the visitor explicitly chose dark; the OS
   colour scheme does not change the default. */
function resolvedTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
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
    meta.setAttribute('content', theme === 'dark' ? '#1b304b' : '#f6f2e7');
  }
}

function setupTheme(onChange) {
  const button = document.getElementById('theme-toggle');
  if (!button) return;

  syncThemeControl(button);

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
      onChange();
    };

    if (document.startViewTransition && !prefersReducedMotion()) {
      document.documentElement.dataset.transition = 'theme';
      document.startViewTransition(apply).finished.finally(() => {
        delete document.documentElement.dataset.transition;
      });
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
    link.dataset.track = 'project_click';
    link.dataset.trackProject = project.id;
    link.dataset.trackType = 'source';
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
  node.dataset.sector = project.id;
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
  /* Mission cards share their planet's colour; open source uses it too. */
  cards.forEach((card, index) => {
    card.style.setProperty(
      '--hue',
      String(card.dataset.projectType === 'personal' ? 52 : HUES[index])
    );
  });
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

function renderPostCard(template, card) {
  const node = template.content.firstElementChild.cloneNode(true);
  const img = node.querySelector('img');
  const link = node.querySelector('.work-card__title a');

  img.src = card.cover || FALLBACK_IMAGE;
  img.alt = '';
  /* A missing cover fires a genuine error and swaps in the local placeholder. */
  img.addEventListener(
    'error',
    () => {
      if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
    },
    { once: true }
  );
  link.textContent = card.title;
  link.href = card.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  node.querySelector('.work-card__desc').textContent = card.excerpt;

  const reactions = node.querySelector('[data-reactions]');
  if (card.reactions) reactions.textContent = card.reactions;
  else reactions.remove();

  const time = node.querySelector('[data-published]');
  if (card.dateTime) time.dateTime = card.dateTime;
  time.textContent = card.label;
  return node;
}

async function loadWriting() {
  const grid = document.getElementById('writing-grid');
  const template = document.getElementById('post-card-template');
  const indexLink = document.querySelector('#writing .section-link');
  if (indexLink) indexLink.href = agentBlogIndexLink;
  if (!grid || !template) return;

  const result = await resolveWriting({
    fetchFeed: async () => {
      try {
        const response = await fetch(FEED_URL);
        if (!response.ok) throw new Error(`Feed responded ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Writing feed unavailable', error);
        throw error;
      }
    },
  });

  if (result.notice) {
    grid.replaceChildren(renderNotice(result.notice));
    return;
  }

  const fragment = document.createDocumentFragment();
  result.cards.forEach((card) => {
    fragment.appendChild(renderPostCard(template, card));
  });
  grid.replaceChildren(fragment);
}

function renderNotice(message) {
  const p = document.createElement('p');
  p.className = 'notice';
  p.textContent = message;
  return p;
}

/* ------------------------------------------------------------- consent -- */

function setupConsent() {
  const banner = document.getElementById('consent');
  const accept = document.getElementById('consent-accept');
  const decline = document.getElementById('consent-decline');
  const reopen = document.getElementById('consent-reopen');
  if (!banner || !accept || !decline) return;

  const decided = analytics.consent;
  if (decided === 'granted') analytics.load();
  if (!decided) banner.dataset.visible = 'true';
  if (reopen) reopen.hidden = !decided;

  const settle = (value) => {
    analytics.setConsent(value);
    banner.dataset.visible = 'false';
    if (reopen) {
      reopen.hidden = false;
      reopen.focus();
    }
    if (value === 'granted') analytics.load();
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

/* ---------------------------------------------------------------- game -- */

function setupGame() {
  const root = document.documentElement;
  const audio = createAudio();
  const toast = createToaster();
  const particles = createParticles(document.getElementById('fx'));
  const trophyToggle = document.getElementById('trophy-toggle');
  const trophies = document.getElementById('trophies');
  const achievements = createAchievements({
    list: document.getElementById('trophy-list'),
    count: document.getElementById('trophy-count'),
    score: document.getElementById('trophy-score'),
    toggle: trophyToggle,
    toast,
    sound: (name) => audio.play(name),
    celebrate(element) {
      particles.burstFrom(element);
      element.dataset.celebrate = 'true';
      setTimeout(() => delete element.dataset.celebrate, 700);
    },
    closeLog() {
      if (trophies.matches?.(':popover-open')) trophies.hidePopover();
      trophies.classList.remove('is-open');
      trophyToggle.setAttribute('aria-expanded', 'false');
    },
  });

  const canvas = document.getElementById('sky');
  const sky = canvas
    ? startSky({
        canvas,
        planet: document.getElementById('hero-planet'),
        isLight: () => resolvedTheme() === 'light',
        isPhosphor: () => root.dataset.mode === 'phosphor',
        reducedMotion: prefersReducedMotion,
      })
    : null;
  if (sky) root.dataset.sky = 'webgl';

  setupPopover(trophyToggle, trophies);
  trophyToggle.hidden = false;

  const sound = document.getElementById('sound-toggle');
  sound.setAttribute('aria-pressed', String(audio.enabled));
  sound.hidden = false;
  sound.addEventListener('click', () => {
    audio.setEnabled(!audio.enabled);
    sound.setAttribute('aria-pressed', String(audio.enabled));
    audio.play('select');
  });

  /* In-page jumps get a short hyperspace streak in the sky shader. */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link) sky?.warp();
    const start = event.target.closest('[data-start]');
    if (start) {
      audio.play('start');
      particles.burstFrom(start, { count: 70, power: 9 });
      achievements.unlock('start');
    }
    if (event.target.closest('[data-achievement="recruiter"]')) {
      achievements.unlock('recruiter');
    }
  });

  const stageAchievements = {
    profile: 'character',
    expertise: 'loadout',
    experience: 'campaign',
    contact: 'explorer',
  };
  setupStageTracker(
    (id) => {
      if (stageAchievements[id]) achievements.unlock(stageAchievements[id]);
    },
    (element, text) => scramble(element, text, 450)
  );
  setupXpBar();
  setupTilt();
  setupStageTags();
  setupSpotlight();
  setupMagnetic();

  setupTechTree({
    onInspect: (count) => achievements.progress('tech-trees', count),
    onSelect: () => audio.play('select'),
  });
  setupSaveFile();
  setupBoss({
    launch: document.getElementById('boss-launch'),
    sky,
    sound: (name) => audio.play(name),
    onComplete: () => achievements.unlock('boss'),
  });
  setupObjective({ quests: achievements, goTo: goToTarget });

  setupGalaxy({
    sectors: workProjects,
    total: professionalProjectCount,
    onScan(sectorId) {
      audio.play('scan');
      achievements.unlock('first-contact');
      document.querySelectorAll('#work-grid .work-card').forEach((card) => {
        card.dataset.scanned = String(
          card.dataset.scanned === 'true' || card.dataset.sector === sectorId
        );
      });
    },
    onProgress(sectorsScanned) {
      achievements.progress('cartographer', sectorsScanned);
    },
  });

  setupKonami((on) => {
    sky?.refresh();
    toast(
      on ? 'Phosphor mode on' : 'Phosphor mode off',
      on ? 'Enter the code again to switch back.' : 'Back to full colour.',
      'info'
    );
    achievements.unlock('old-school');
  });

  return {
    onThemeChange() {
      sky?.refresh();
      achievements.unlock('shift-change');
    },
  };
}

function greetDevelopers() {
  // eslint-disable-next-line no-console
  console.log(
    '%cVJ%c Player two detected. The source is plain HTML, CSS and one hand-written WebGL shader. Try the Konami code.',
    'background:#1b304b;color:#f6f2e7;font-weight:700;padding:2px 6px;border-radius:4px',
    'color:inherit'
  );
}

/* ----------------------------------------------------------------- init -- */

const game = setupGame();
setupTheme(() => game.onThemeChange());
setupNav();
setupMarquee();
setupWork();
setupConsent();
setupBackToTop();
setupYear();
analytics.start();
loadWriting();
greetDevelopers();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) => {
        console.warn('Offline support unavailable', error);
      });
  });
}
