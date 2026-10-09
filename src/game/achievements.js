/* Quests reward exploring the page. Each one says what to do, shows its
   progress, and can take the visitor to the place where it is unlocked.
   Progress lives only in this browser's localStorage; the page works the
   same when storage is blocked. */

const STORE_KEY = 'achievements';
const PROGRESS_KEY = 'quest-progress';

export const ACHIEVEMENTS = [
  {
    id: 'start',
    title: 'Press start',
    hint: 'Select Press start on the title screen.',
    target: '[data-start]',
  },
  {
    id: 'character',
    title: 'Character select',
    hint: 'Open the player profile.',
    target: '#profile',
  },
  {
    id: 'tech-trees',
    title: 'Tech tree master',
    hint: 'Inspect all six tech trees in the player profile.',
    target: '#techtree [role="tablist"]',
    goal: 6,
  },
  {
    id: 'loadout',
    title: 'Full loadout',
    hint: 'Look through the eight abilities.',
    target: '#expertise',
  },
  {
    id: 'campaign',
    title: 'Campaign log',
    hint: 'Read both career chapters.',
    target: '#experience',
  },
  {
    id: 'first-contact',
    title: 'First contact',
    hint: 'Scan any planet on the galaxy map.',
    target: '#galaxy-planets',
  },
  {
    id: 'cartographer',
    title: 'Cartographer',
    hint: 'Scan all 11 sectors to log 60 projects.',
    target: '#galaxy-planets',
    goal: 11,
  },
  {
    id: 'explorer',
    title: 'Explorer',
    hint: 'Reach the multiplayer stage at the end of the page.',
    target: '#contact',
  },
  {
    id: 'shift-change',
    title: 'Shift change',
    hint: 'Switch between day and night with the theme button.',
    target: '#theme-toggle',
  },
  {
    id: 'recruiter',
    title: 'Dossier secured',
    hint: 'Download the CV save file.',
    target: '.savefile__btn',
  },
  {
    id: 'boss',
    title: 'Final boss',
    hint: 'Launch the final sequence from the player profile.',
    target: '#boss-launch',
  },
  {
    id: 'old-school',
    title: 'Old school',
    hint: 'A cheat code from 1986 still works here.',
    secret: 'Up, up, down, down, left, right, left, right, B, A.',
  },
];

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked; progress lasts for this page view */
  }
}

/** Scrolls to a quest's target, focuses it and highlights it briefly. */
export function goToTarget(selector) {
  const target = selector && document.querySelector(selector);
  if (!target) return;
  const focusable = target.matches(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
    ? target
    : target.querySelector('a[href], button:not([disabled]), [role="tab"]') ||
      target;
  if (focusable === target && !target.matches('a, button, [tabindex]')) {
    target.setAttribute('tabindex', '-1');
  }
  target.scrollIntoView({
    behavior: reducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  });
  focusable.focus({ preventScroll: true });
  target.dataset.highlight = 'true';
  setTimeout(() => delete target.dataset.highlight, 2200);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.list
 * @param {HTMLElement} options.count
 * @param {HTMLElement} options.score
 * @param {HTMLElement} options.toggle Trophy button, for the progress ring.
 * @param {(title: string, detail: string, tone?: string) => void} options.toast
 * @param {(name: string) => void} options.sound
 * @param {(element: Element) => void} options.celebrate
 * @param {() => void} options.closeLog
 */
export function createAchievements({
  list,
  count,
  score,
  toggle,
  toast,
  sound,
  celebrate,
  closeLog,
}) {
  const known = new Set(ACHIEVEMENTS.map((a) => a.id));
  const stored = readJson(STORE_KEY, []);
  const unlocked = new Set(
    Array.isArray(stored) ? stored.filter((id) => known.has(id)) : []
  );
  const progress = readJson(PROGRESS_KEY, {});
  const revealed = new Set();
  const listeners = new Set();

  function progressOf(achievement) {
    if (!achievement.goal) return null;
    const value = unlocked.has(achievement.id)
      ? achievement.goal
      : Math.min(Number(progress[achievement.id]) || 0, achievement.goal);
    return { value, goal: achievement.goal };
  }

  function renderQuest(achievement) {
    const done = unlocked.has(achievement.id);
    const li = document.createElement('li');
    li.className = 'trophy';
    li.dataset.quest = achievement.id;
    li.dataset.unlocked = String(done);

    const title = document.createElement('p');
    title.className = 'trophy__title';
    title.textContent = achievement.title;
    const state = document.createElement('span');
    state.className = 'visually-hidden';
    state.textContent = done ? ' (unlocked)' : ' (locked)';
    title.appendChild(state);

    const hint = document.createElement('p');
    hint.className = 'trophy__hint';
    hint.textContent =
      revealed.has(achievement.id) || done
        ? achievement.secret || achievement.hint
        : achievement.hint;
    li.append(title, hint);

    const step = progressOf(achievement);
    if (step) {
      const meter = document.createElement('p');
      meter.className = 'trophy__progress';
      meter.style.setProperty('--progress', String(step.value / step.goal));
      meter.textContent = `${step.value} of ${step.goal}`;
      li.appendChild(meter);
    }

    if (!done && (achievement.target || achievement.secret)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'trophy__go';
      if (achievement.secret) {
        if (revealed.has(achievement.id)) return li;
        button.dataset.reveal = achievement.id;
        button.textContent = 'Reveal code';
      } else {
        button.dataset.go = achievement.id;
        button.textContent = 'Go there';
      }
      button.setAttribute(
        'aria-label',
        `${button.textContent}: ${achievement.title}`
      );
      li.appendChild(button);
    }
    return li;
  }

  function render() {
    const total = ACHIEVEMENTS.length;
    count.textContent = String(unlocked.size);
    score.textContent = `${unlocked.size} of ${total} unlocked`;
    toggle.style.setProperty('--quest-progress', String(unlocked.size / total));
    list.replaceChildren(...ACHIEVEMENTS.map(renderQuest));
    listeners.forEach((listener) => listener());
  }

  list.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) {
      const quest = ACHIEVEMENTS.find((a) => a.id === go.dataset.go);
      closeLog();
      goToTarget(quest?.target);
      return;
    }
    const reveal = event.target.closest('[data-reveal]');
    if (reveal) {
      const id = reveal.dataset.reveal;
      revealed.add(id);
      render();
      /* The reveal button is gone after rendering, so focus moves to the
         code it revealed instead of falling back to the page. */
      const hint = list.querySelector(`[data-quest="${id}"] .trophy__hint`);
      hint?.setAttribute('tabindex', '-1');
      hint?.focus();
    }
  });

  render();

  const api = {
    has: (id) => unlocked.has(id),

    /** The first quest still locked, keeping the secret one for last. */
    next() {
      return (
        ACHIEVEMENTS.find((a) => !unlocked.has(a.id) && !a.secret) ||
        ACHIEVEMENTS.find((a) => !unlocked.has(a.id)) ||
        null
      );
    },

    progressOf: (id) => progressOf(ACHIEVEMENTS.find((a) => a.id === id)),

    onChange(listener) {
      listeners.add(listener);
    },

    progress(id, value) {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement?.goal || unlocked.has(id)) return;
      if ((Number(progress[id]) || 0) >= value) return;
      progress[id] = value;
      writeJson(PROGRESS_KEY, progress);
      if (value >= achievement.goal) api.unlock(id);
      else render();
    },

    unlock(id) {
      const achievement = ACHIEVEMENTS.find((a) => a.id === id);
      if (!achievement || unlocked.has(id)) return;
      unlocked.add(id);
      writeJson(STORE_KEY, [...unlocked]);
      render();
      sound('unlock');
      celebrate(toggle);
      toast(
        `Achievement unlocked: ${achievement.title}`,
        `${unlocked.size} of ${ACHIEVEMENTS.length}`,
        'trophy'
      );
    },
  };
  return api;
}
